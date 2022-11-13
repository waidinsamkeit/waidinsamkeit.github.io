# Kubeadm部署Kubernetes1.22.10

## 准备工作
- 兼容的 Linux 主机。Kubernetes 项目为基于 Debian 和 Red Hat 的 Linux 发行版以及那些没有包管理器的发行版提供了通用说明。
- 每台机器 2 GB 或更多 RAM（任何更少都会为您的应用程序留下很小的空间）。
- 2 个 CPU 或更多。
- 集群中所有机器之间的完整网络连接（公共或专用网络都可以）。
- 每个节点的唯一主机名、MAC 地址和 product_uuid。有关更多详细信息，请参见[此处](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/#verify-mac-address)。
- 您的机器上的某些端口是开放的。有关更多详细信息，请参见[此处](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/#check-required-ports)。
- 交换Swap分区。必须禁用Swap才能使 kubelet 正常工作。

### 我的服务器配置列表
- 没有必要按照我的环境来,个人一般机器建议以下配置.


- master: 2核4G
- work1: 2核2G
- work2: 2核2G

| IP        | 主机名称               | CPU  | 内存 | 硬盘 |
| --------- | ---------------------- | ---- | ---- | ---- |
| 10.1.6.45 | containerd-kube-master | 4    | 8    | 60   |
| 10.1.6.46 | containerd-kube-work1  | 4    | 8    | 60   |
| 10.1.6.47 | containerd-kube-work2  | 4    | 8    | 60   |

### 你所需要开放的端口
| 协议 | 方向 | 端口范围  | 目的                  | 使用者               |
| ---- | ---- | --------- | --------------------- | -------------------- |
| TCP  | 入站 | 6443      | Kubernetes API 服务器 | 全部                 |
| TCP  | 入站 | 2379-2380 | etcd 服务器客户端 API | kube-apiserver, etcd |
| TCP  | 入站 | 10250     | Kubelet API           | 自我，控制平面       |
| TCP  | 入站 | 10259     | kube-调度器           | 自己                 |
| TCP  | 入站 | 10257     | kube-控制器-管理器    | 自己                 |

虽然 etcd 端口包含在控制平面部分，但您也可以在外部或自定义端口上托管自己的 etcd 集群。

| 协议 | 方向 | 端口范围    | 目的             | 使用者         |
| ---- | ---- | ----------- | ---------------- | -------------- |
| TCP  | 入站 | 10250       | Kubelet API      | 自我，控制平面 |
| TCP  | 入站 | 30000-32767 | NodePort端口范围 | 全部           |

可以覆盖所有默认端口号。当使用自定义端口时，这些端口需要打开而不是此处提到的默认值。

一个常见的例子是 API 服务器端口，有时会切换到 443。或者，默认端口保持原样，API 服务器放在负载均衡器后面，该负载均衡器监听 443 并将请求路由到默认端口上的 API 服务器。

### 准备主机地址
- 修改每一台主机的`/etc/hosts`配置
```shell
# vim /etc/hosts
10.1.6.45 containerd-kube-master
10.1.6.46 containerd-kube-work1
10.1.6.47 containerd-kube-work2
```

### 关闭swap分区以及防火墙
如果你的系统使用的并不是Rocky而是CentOS默认是应该没有挂载SWAP分区到fastab当中的
```shell
[root@bogon ~]# swapoff -a
[root@localhost ~]# echo "vm.swappiness = 0" >> /etc/sysctl.conf
[root@bogon ~]# vim /etc/fstab
# /dev/mapper/rl-swap     none                    swap    defaults        0 0 
[root@localhost ~]# systemctl stop firewalld && systemctl disable firewalld # 关闭并且禁用防火墙
```

>  所有内容准备完成后重启三台服务器!

## 安装Containerd
本文档后续基于`Containerd`+`RockyLinux`+`Kubeadmin`

-  [containerd](https://containerd.io/) 
-  [Docker](https://www.docker.com) 
-  [CRI-O](https://cri-o.io/) 

需要注意的是,根据Kubernetes官方给出的公告。Kubernetes 1.20x版本将会废弃对`Docker的支持`

-  [参考链接](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.20.md#deprecation)

### 通过阿里云镜像源安装

- [官方镜像站](https://developer.aliyun.com/mirror/)

- 三台主机全部执行此操作

```shell
[root@containerd-kube-master ~]# yum install -y yum-utils device-mapper-persistent-data lvm2
[root@containerd-kube-master ~]# yum-config-manager --add-repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
[root@containerd-kube-master ~]# yum -y install containerd.io 
```

查看一下`containerd`的版本

```shell
[root@containerd-kube-master ~]# containerd -v
containerd containerd.io 1.6.8 9cd3357b7fd7218e4aec3eae239db1f68a5a6ec6
```

### 生成containerd的配置文件

- 三台主机全部执行此操作

> 默认情况下在`/etc/containerd/config.toml`已经有这个文件了,但是里面是一些简短的配置.

```shell
[root@containerd-kube-master containerd]# mkdir - /etc/containerd/
[root@containerd-kube-master containerd]# containerd config default | tee /etc/containerd/config.toml # 生成contained的默认配置
```

### 修改sandbox_img

- `pause`： 此镜像是kubernetes的基础容器
- 三台主机全部执行此操作

>  由于部分用户无法进入`k8s.gcr.io`资源地址,需要对此地址进行替换.

```shell
[root@containerd-kube-master containerd]# vim /etc/containerd/config.toml
sandbox_image = "k8s.gcr.io/pause:3.6"  # 找到此选项并且修改为: registry.aliyuncs.com/google_containers/pause:3.6
systemd_cgroup = true  # 改为true,一定要是小写的.
[plugins."io.containerd.grpc.v1.cri".containerd.default_runtime]
  runtime_type = "io.containerd.runtime.v1.linux"# 修改为io.containerd.runtime.v1.linux
```

### 启动containerd

- 三台主机全部执行此操作

保证`Active: active(running)`的状态即可

```shell
[root@containerd-kube-master containerd]# systemctl restart containerd
[root@containerd-kube-master containerd]# systemctl enable containerd
[root@containerd-kube-master containerd]# systemctl status containerd
● containerd.service - containerd container runtime
   Loaded: loaded (/usr/lib/systemd/system/containerd.service; disabled; vendor preset: disabled)
   Active: active (running) since Mon 2022-09-05 02:53:02 EDT; 6s ago
     Docs: https://containerd.io
  Process: 8465 ExecStartPre=/sbin/modprobe overlay (code=exited, status=0/SUCCESS)
 Main PID: 8467 (containerd)
    Tasks: 12
   Memory: 25.2M
   CGroup: /system.slice/containerd.service
           └─8467 /usr/bin/containerd

Sep 05 02:53:02 containerd-kube-master containerd[8467]: time="2022-09-05T02:53:02.159619104-04:00" level=info msg="Start subscribing containerd event"
Sep 05 02:53:02 containerd-kube-master containerd[8467]: time="2022-09-05T02:53:02.159662811-04:00" level=info msg="Start recovering state"
Sep 05 02:53:02 containerd-kube-master containerd[8467]: time="2022-09-05T02:53:02.159718042-04:00" level=info msg="Start event monitor"
Sep 05 02:53:02 containerd-kube-master containerd[8467]: time="2022-09-05T02:53:02.159737174-04:00" level=info msg="Start snapshots syncer"
Sep 05 02:53:02 containerd-kube-master containerd[8467]: time="2022-09-05T02:53:02.159750064-04:00" level=info msg="Start cni network conf syncer for default"
Sep 05 02:53:02 containerd-kube-master containerd[8467]: time="2022-09-05T02:53:02.159756351-04:00" level=info msg="Start streaming server"
Sep 05 02:53:02 containerd-kube-master containerd[8467]: time="2022-09-05T02:53:02.159868546-04:00" level=info msg=serving... address=/run/containerd/containerd.sock.ttrpc
Sep 05 02:53:02 containerd-kube-master containerd[8467]: time="2022-09-05T02:53:02.159906215-04:00" level=info msg=serving... address=/run/containerd/containerd.sock
Sep 05 02:53:02 containerd-kube-master containerd[8467]: time="2022-09-05T02:53:02.160196660-04:00" level=info msg="containerd successfully booted in 0.021144s"
Sep 05 02:53:02 containerd-kube-master systemd[1]: Started containerd container runtime.
```

### 准备配置IP转发

- 三台全部执行

```shell
cat <<EOF | tee /etc/modules-load.d/kubernetes1.22.10.conf
overlay
br_netfilter
EOF
cat <<EOF | tee /etc/sysctl.d/kubernetes1.22.10-forsys.conf
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward = 1
EOF
[root@containerd-kube-master containerd]# modprobe br_netfilter
[root@containerd-kube-master ~]# sysctl --system
```
> 配置完成后请全部重启机器!

## kubernetes安装

### 通过阿里云镜像源安装

- 三台全部安装

> 由于官网未开放同步方式, 可能会有索引gpg检查失败的情况, 这时请用 `yum install -y --nogpgcheck kubelet kubeadm kubectl` 安装

```shell
cat <<EOF > /etc/yum.repos.d/kubernetes.repo
[kubernetes]
name=Kubernetes
baseurl=https://mirrors.aliyun.com/kubernetes/yum/repos/kubernetes-el7-x86_64/
enabled=1
gpgcheck=1
repo_gpgcheck=1
gpgkey=https://mirrors.aliyun.com/kubernetes/yum/doc/yum-key.gpg https://mirrors.aliyun.com/kubernetes/yum/doc/rpm-package-key.gpg
EOF
[root@containerd-kube-work1 ~]# yum install -y kubelet-1.22.10-0 kubeadm-1.22.10-0 kubectl-1.22.10-0
```
> 可以通过yum --showduplicates list kubelet查看当前仓库中可用的版本

### 安装命令提示

> 安装后可以使用tab进行快捷提示

```shell
[root@containerd-kube-master ~]# yum -y install bash-completion
[root@containerd-kube-master ~]# source <(kubeadm completion bash) && source <(kubectl completion bash)
```

如果你想要`永久`的使其生效,请把他们加入到`.bashrc`当中

```shell
cd ~
[root@containerd-kube-master ~]# vim .bashrc
# .bashrc

# User specific aliases and functions

alias rm='rm -i'
alias cp='cp -i'
alias mv='mv -i'

# Source global definitions
if [ -f /etc/bashrc ]; then
        . /etc/bashrc
fi
source <(kubeadm completion bash)
source <(kubectl completion bash)
source <(crictl completion bash)  
```

### 启动kubelet

```shell
[root@containerd-kube-master containerd]# systemctl enable kubelet
[root@containerd-kube-master containerd]# systemctl  start kubelet
```

### 初始化集群配置信息

```shell
[root@containerd-kube-master containerd]# kubeadm config print init-defaults > init.yaml
```

```yaml
apiVersion: kubeadm.k8s.io/v1beta3
bootstrapTokens:
- groups:
  - system:bootstrappers:kubeadm:default-node-token
  token: abcdef.0123456789abcdef
  ttl: 24h0m0s
  usages:
  - signing
  - authentication
kind: InitConfiguration
localAPIEndpoint:
  advertiseAddress: 10.1.6.45 # 初始化的第一台master主机的地址
  bindPort: 6443
nodeRegistration:
  criSocket: unix:///var/run/containerd/containerd.sock
  imagePullPolicy: IfNotPresent
  name: kubernetes-master # 定义主机的唯一名称
  taints: null
---
apiServer:
  timeoutForControlPlane: 4m0s
apiVersion: kubeadm.k8s.io/v1beta3
certificatesDir: /etc/kubernetes/pki
clusterName: kubernetes
controllerManager: {}
dns: {}
etcd:
  local:
    dataDir: /var/lib/etcd
imageRepository: registry.aliyuncs.com/google_containers # 修改为阿里云地址
kind: ClusterConfiguration
kubernetesVersion: 1.22.10
networking:
  dnsDomain: cluster.local
  serviceSubnet: 10.96.0.0/12   # Pod使用的子网地址
scheduler: {}
```

```shell
[root@containerd-kube-master containerd]# kubeadm init --config=init.yaml   # 等待镜像Pull完成
[init] Using Kubernetes version: v1.22.10
[preflight] Running pre-flight checks
[preflight] Pulling images required for setting up a Kubernetes cluster
[preflight] This might take a minute or two, depending on the speed of your internet connection
[preflight] You can also perform this action in beforehand using 'kubeadm config images pull'
```

### 创建admin配置目录

```shell
[root@containerd-kube-master containerd]# mkdir -p $HOME/.kube
[root@containerd-kube-master containerd]# sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
[root@containerd-kube-master containerd]# sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

### 创建集群网络

> 因为flannel不支持网络隔离,所以不想用了!

- 不再基于`flannel`,而是基于`calico`

```shell
[root@containerd-kube-master .kube]# curl https://raw.githubusercontent.com/projectcalico/calico/v3.24.1/manifests/calico.yaml -O
# 如果上面这个地址较慢的话下面的也可以用
curl https://projectcalico.docs.tigera.io/manifests/calico.yaml -O
```

编辑`calico.yaml`

```yaml
- name: CALICO_IPV4POOL_CIDR # 修改CIDR为Kubernetes的子网地址,即初始化集群的serviceSubnet
    value: "10.96.0.0/12"
```

创建`calico`网络

```shell
[root@containerd-kube-master ~]# kubectl apply -f calico.yaml 
```

### 加入集群

> 如果初始化成功会出现`Your Kubernetes control-plane has initialized successfully!`

- 在node节点执行

```shell
[root@containerd-kube-work1 containerd]# kubeadm join 10.1.6.45:6443 --token abcdef.0123456789abcdef \
        --discovery-token-ca-cert-hash sha256:417d4385cc4f0cc572b106a6a13bf59fd865421f12a401f3660afa6ca19e500d 
```

### 验证集群

查看master节点的`Pod`是否全部启动

```shell
[root@containerd-kube-master ~]# kubectl get pods --all-namespaces
NAMESPACE     NAME                                        READY   STATUS    RESTARTS   AGE
kube-system   calico-kube-controllers-6799f5f4b4-pf8w8    1/1     Running   0          2m16s
kube-system   calico-node-lzcjk                           1/1     Running   0          54s
kube-system   calico-node-mrqkd                           1/1     Running   0          2m16s
kube-system   calico-node-r45bc                           1/1     Running   0          71s
kube-system   coredns-74586cf9b6-gkmbl                    1/1     Running   0          2m37s
kube-system   coredns-74586cf9b6-tgh6f                    1/1     Running   0          2m37s
kube-system   etcd-kubernetes-master                      1/1     Running   2          2m42s
kube-system   kube-apiserver-kubernetes-master            1/1     Running   2          2m43s
kube-system   kube-controller-manager-kubernetes-master   1/1     Running   2          2m43s
kube-system   kube-proxy-mx4bg                            1/1     Running   0          54s
kube-system   kube-proxy-ssw98                            1/1     Running   0          71s
kube-system   kube-proxy-tpgfj                            1/1     Running   0          2m38s
kube-system   kube-scheduler-kubernetes-master            1/1     Running   2          2m43s
```

从master上查看节点是否已经全部`Ready`

```shell
[root@containerd-kube-master ~]# kubectl get nodes
NAME                    STATUS   ROLES           AGE     VERSION
containerd-kube-work1   Ready    <none>          55s     v1.22.10
containerd-kube-work2   Ready    <none>          38s     v1.22.10
containerd-kube-master  Ready    control-plane   2m29s   v1.22.10
```

> 到此为止,1.24的kubernetes已经安装完毕

### 提一个小问题

> 看一下你们的`coredns`是否在同一个节点上,如果在同一个节点上,建议重新分配一下coredns保证其高可用性

```shell
[root@containerd-kube-master ~]# kubectl get pods --all-namespaces -o wide
NAMESPACE     NAME                                        READY   STATUS    RESTARTS   AGE   IP            NODE                    NOMINATED NODE   READINESS GATES
kube-system   coredns-74586cf9b6-gkmbl                    1/1     Running   0          32m   10.105.56.1   kubernetes-master       <none>           <none>
kube-system   coredns-74586cf9b6-tgh6f                    1/1     Running   0          32m   10.105.56.3   kubernetes-master       <none>           <none>
```

重新分配`coredns`

```shell
[root@containerd-kube-master ~]# kubectl --namespace kube-system rollout restart deployment coredns
```

## 问题解决

### 01 使用crictl image出现`WARN[0000] image connect using default endpoints`

- 出现该问题的原因是由于crictl不知道使用那个`sock`导致的

```shell
[root@containerd-kube-master ~]# crictl image
WARN[0000] image connect using default endpoints: [unix:///var/run/dockershim.sock unix:///run/containerd/containerd.sock unix:///run/crio/crio.sock unix:///var/run/cri-dockerd.sock]. As the default settings are now deprecated, you should set the endpoint instead.
```

### 01-解决方法

- 默认情况下`containerd`的`sock`存放于`/run/containerd/containerd.sock`

```shell
# 重新设置一下使用的runtime-endpoint
crictl config runtime-endpoint unix:///run/containerd/containerd.sock
```

默认生成的`crictl`存放在` /etc/crictl.yaml`

```shell
[root@containerd-kube-master containerd]# vim /etc/crictl.yaml
```

```yaml
runtime-endpoint: "unix:///run/containerd/containerd.sock"
image-endpoint: "unix:///run/containerd/containerd.sock" # 新版本增加了image-endpoint需要手动更改
timeout: 10
debug: false
pull-image-on-create: false
disable-pull-on-run: false
```

```shell
[root@containerd-kube-master containerd]# systemctl daemon-reload
[root@containerd-kube-master containerd]# crictl image
IMAGE               TAG                 IMAGE ID            SIZE
```



### 02 Master主集群加入token过期如何处理
- 默认情况下,该token只有24小时,如果token值过期的话需要重新生成

```shell
--discovery-token-ca-cert-hash sha256:793106d3b4305808d55c3cdb211f89a768bec86ecef64264b131dc8f2548da16
```

1. 查看当前master集群的token列表

```shell
[root@containerd-kube-master .kube]# kubeadm token list
TOKEN                     TTL         EXPIRES                USAGES                   DESCRIPTION                                                EXTRA GROUPS
abcdef.0123456789abcdef   8h          2022-09-06T10:10:05Z   authentication,signing   <none>                                                     system:bootstrappers:kubeadm:default-node-token
```

2. 重新生成一份token

```shell
[root@containerd-kube-master .kube]# kubeadm token create
```

3. 通过证书hashtokne

```shell
[root@containerd-kube-master .kube]# openssl x509 -pubkey -in /etc/kubernetes/pki/ca.crt | openssl rsa -pubin -outform der 2>/dev/null | openssl dgst -sha256 -hex | sed 's/^.* //'
```
