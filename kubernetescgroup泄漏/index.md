# Kubernetes低版本中内存泄漏问题

## Kubernetes中Cgroup泄漏问题

Cgorup文档: https://www.kernel.org/doc/Documentation/cgroup-v1/memory.txt

绝大多数的kubernetes集群都有这个隐患。只不过一般情况下，泄漏得比较慢，还没有表现出来而已。

一个pod可能泄漏两个memory cgroup数量配额。即使pod百分之百发生泄漏， 那也需要一个节点销毁过三万多个pod之后，才会造成后续pod创建失败。

一旦表现出来，这个节点就彻底不可用了，必须重启才能恢复。

## 故障表现

- 该内容的故障信息已经提交给Github: https://github.com/kubernetes/kubernetes/issues/112940

我在服务器中更新Pod出现如下错误 `cannot allocate memory`

```bash
unable to ensure pod container exists: failed to create container for [kubepods burstable podd5dafc96-2bcd-40db-90fd-c75758746a7a] : mkdir /sys/fs/cgroup/memory/kubepods/burstable/podd5dafc96-2bcd-40db-90fd-c75758746a7a: cannot allocate memory
```

使用`dmesg`查看系统日志的错误内容信息

```bash
SLUB: Unable to allocate memory on node -1
```

## 服务器配置信息


- 操作系统: `CentOS Linux release 7.9.2009 (Core)`
- 系统内核: `3.10.0-1160.el7.x86_64`
- Kubernetes: `1.17.9`
- dockerVersion: `20.10.7`

## 问题原因1
Kubernetes在1.9版本开启了对kmem的支持,因此 1.9以后的所有版本都有该问题，但必须搭配3.x内核的机器才会出问题。一旦出现会导致新 pod 无法创建，已有 pod不受影响，但pod 漂移到有问题的节点就会失败，直接影响业务稳定性。因为是内存泄露，直接重启机器可以暂时解决，但还会再次出现。
cgroup的kmem account特性在3.x 内核上有内存泄露问题，如果开启了kmem account特性会导致可分配内存越来越少，直到无法创建新 pod 或节点异常。
1. kmem account 是cgroup 的一个扩展，全称CONFIG_MEMCG_KMEM，属于机器默认配置，本身没啥问题，只是该特性在 3.10 的内核上存在漏洞有内存泄露问题，4.x的内核修复了这个问题。
2. 因为 kmem account 是 cgroup 的扩展能力，因此runc、docker、k8s 层面也进行了该功能的支持，即默认都打开了kmem 属性。
3. 因为3.10 的内核已经明确提示 kmem 是实验性质，我们仍然使用该特性，所以这其实不算内核的问题，是 k8s 兼容问题。

## 问题原因2
memcg是 Linux 内核中用于管理 cgroup 内存的模块，整个生命周期应该是跟随 cgroup 的，但是在低版本内核中`(已知3.10)`，一旦给某个 memory cgroup 开启 kmem accounting 中的 memory.kmem.limit_in_bytes 就可能会导致不能彻底删除 memcg 和对应的 cssid，也就是说应用即使已经删除了 cgroup (/sys/fs/cgroup/memory 下对应的 cgroup 目录已经删除), 但在内核中没有释放 cssid，导致内核认为的 cgroup 的数量实际数量不一致，我们也无法得知内核认为的 cgroup 数量是多少。
这个问题可能会导致创建容器失败，因为创建容器为其需要创建 cgroup 来做隔离，而低版本内核有个限制：允许创建的 cgroup 最大数量写死为 65535，如果节点上经常创建和销毁大量容器导致创建很多 cgroup，删除容器但没有彻底删除 cgroup 造成泄露(真实数量我们无法得知)，到达 65535 后再创建容器就会报创建 cgroup 失败并报错 no space left on device，使用 kubernetes 最直观的感受就是 pod 创建之后无法启动成功。

## 解决方案
目前官方给出的解决方案如下:
1. kernel upgrade to 4.0+: **[application crash due to k8s 1.9.x open the kernel memory accounting by default #61937 (comment)](https://github.com/kubernetes/kubernetes/issues/61937#issuecomment-377585452)**
2. rebuild the kubelet with nokmem args. See **[Failed to create container, mkdir /sys/fs/cgroup/memory/kubepods/besteffort/pod98211fca-b27e-4316-b1ae-c0d27925aa84: cannot allocate memory #96701 (comment)](https://github.com/kubernetes/kubernetes/issues/96701#issuecomment-911061574)**
3. Set cgroup.memory=nokmem in grub: see **[application crash due to k8s 1.9.x open the kernel memory accounting by default #61937 (comment)](https://github.com/kubernetes/kubernetes/issues/61937#issuecomment-567042968)**

### 解决方案一
- 感谢提供的解决方案: https://cloud.tencent.com/developer/article/1739289
- https://github.com/torvalds/linux/commit/d6e0b7fa11862433773d986b5f995ffdf47ce672
- https://support.mesosphere.com/s/article/Critical-Issue-KMEM-MSPH-2018-0006

这种方式的缺点是：
- 1、要升级所有节点，节点重启的话已有 pod 肯定要漂移，如果节点规模很大，这个升级操作会很繁琐，业务部门也会有意见，要事先沟通。
- 2、这个问题归根结底是软件兼容问题，3.x 自己都说了不成熟，不建议你使用该特性，k8s、docker却 还要开启这个属性，那就不是内核的责任，因为我们是云上机器，想替换4.x 内核需要虚机团队做足够的测试和评审，因此这是个长期方案，不能立刻解决问题。
- 3、已有业务在 3.x 运行正常，不代表可以在 4.x 也运行正常，即全量升级内核之前需要做足够的测试，尤其是有些业务需求对os做过定制。

### 解决方案2

修改虚机启动的引导项 grub 中的`cgroup.memory=nokmem`，让机器启动时直接禁用 cgroup的 kmem 属性

```bash
vim /etc/default/grub
GRUB_TIMEOUT=5
GRUB_DISTRIBUTOR="$(sed 's, release .*$,,g' /etc/system-release)"
GRUB_DEFAULT=saved
GRUB_DISABLE_SUBMENU=true
GRUB_TERMINAL_OUTPUT="console"
GRUB_CMDLINE_LINUX="crashkernel=auto spectre_v2=retpoline rd.lvm.lv=centos/root rd.lvm.lv=centos/swap rhgb quiet cgroup.memory=nokmem"
GRUB_DISABLE_RECOVERY="true"
```

更改完成后你需要生成一下新的cgroup配置.

```bash
/usr/sbin/grub2-mkconfig -o /boot/grub2/grub.cfg
reboot # 重启服务器
```

### 解决方案3

如果你想在Kubernetes中禁用该属性。issue 中一般建议修改 kubelet代码并重新编译。

对于v1.13及其之前版本的kubelet，需要手动替换以下两个函数。

`vendor/github.com/opencontainers/runc/libcontainer/cgroups/fs/memory.go`

```go
func EnableKernelMemoryAccounting(path string) error {
    return nil
}
func setKernelMemory(path string, kernelMemoryLimit int64) error {
    return nil
}
```

重新编译并替换 `kubelet`

```bash
make WHAT=cmd/kubelet GOFLAGS=-v GOGCFLAGS="-N -l"
```

对于v1.14及其之后版本的kubelet,通过添加BUILDTAGS来禁止 kmem accounting.

```shell
make BUILDTAGS="nokmem" WHAT=cmd/kubelet GOFLAGS=-v GOGCFLAGS="-N -l"
```

遇到1.16 版本的BUILDTAGS=”nokmem“编译出来的 let 还是有问题，还是通过修改代码的方式使其生效

`vendor/github.com/opencontainers/runc/libcontainer/cgroups/fs/kmem.go`

```go
package fs

import (
    "errors"
)
func EnableKernelMemoryAccounting(path string) error {
    return nil
}
func setKernelMemory(path string, kernelMemoryLimit int64) error {
    return errors.New("kernel memory accounting disabled in this runc build")
}
```

编译前，可以编辑下文件 hack/lib/version.sh，将 `KUBE_GIT_TREE_STATE="dirty"` 改为 `KUBE_GIT_TREE_STATE="clean"`，确保版本号干净。

### 影响范围

k8s在1.9版本开启了对kmem的支持，因此1.9以后的所有版本都有该问题,但必须搭配 3.x内核的机器才会出问题。一旦出现会导致新pod无法创建,已有 pod不受影响，但pod 漂移到有问题的节点就会失败，直接影响业务稳定性。因为是内存泄露，直接重启机器可以暂时解决，但还会再次出现。

## 大概得原理理解

### keme是什么?

kmem是Cgroup的一个扩展，全称CONFIG_MEMCG_KMEM，属于机器默认配置。

内核内存与用户内存：

内核内存：专用于Linux内核系统服务使用，是不可swap的，因而这部分内存非常宝贵的。但现实中存在很多针对内核内存资源的攻击，如不断地fork新进程从而耗尽系统资源，即所谓的“fork bomb”。

为了防止这种攻击，社区中提议通过linux内核限制 cgroup中的kmem 容量，从而限制恶意进程的行为，即kernel memory accounting机制。

使用如下命令查看KMEM是否打开：

```bash
cat /boot/config-`uname -r`|grep CONFIG_MEMCG
CONFIG_MEMCG=y
CONFIG_MEMCG_SWAP=y
CONFIG_MEMCG_SWAP_ENABLED=y
CONFIG_MEMCG_KMEM=y
```

### cgroup与kmem机制

使用 cgroup 限制内存时，我们不但需要限制对用户内存的使用，也需要限制对内核内存的使用。kernel memory accounting 机制为 cgroup 的内存限制增加了 stack pages（例如新进程创建）、slab pages(SLAB/SLUB分配器使用的内存)、sockets memory pressure、tcp memory pressure等，以保证 kernel memory 不被滥用。

当你开启了kmem 机制，具体体现在 memory.kmem.limit_in_bytes 这个文件上：

```
/sys/fs/cgroup/memory/kubepods/pod632f736f-5ef2-11ea-ad9e-fa163e35f5d4/memory.kmem.limit_in_bytes
```

实际使用中，我们一般将 memory.kmem.limit_in_bytes 设置成大于 memory.limit_in_bytes，从而只限制应用的总内存使用。

### docker与k8s使用kmem

以上描述都是cgroup层面即机器层面，但是 runc 和 docker 发现有这个属性之后，在后来的版本中也支持了 kmem ，k8s 发现 docker支持，也在 1.9 版本开始支持。

1.9版本及之后，kubelet 才开启 kmem 属性

kubelet 的这部分代码位于：

```bash
https://github.com/kubernetes/kubernetes/blob/release-1.12/vendor/github.com/opencontainers/runc/libcontainer/cgroups/fs/memory.go#L70-L106
```

对于k8s、docker 而言，kmem 属性属于正常迭代和优化，至于3.x的内核上存在 bug 不能兼容，不是k8s 关心的问题。但 issue 中不断有人反馈，因此在 k8s 1.14 版本的 kubelet 中，增加了一个编译选项 make BUILDTAGS="nokmem"，就可以编译 kubelet 时就禁用 kmem，避免掉这个问题。而1.8 到1.14 中间的版本，只能选择更改 kubelet 的代码。
