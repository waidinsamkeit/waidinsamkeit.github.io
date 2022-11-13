# dockershim究竟是什么


## 先前了解

- 参考链接：https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.20.md#dockershim-deprecation
- 参考链接：https://github.com/kubernetes/kubernetes/pull/94624

kubelet中的Docker支持现在已弃用，并将在未来的版本中删除。kubelet使用了一个名为`dockershim`的模块，该模块实现了对Docker的CRI支持，并在Kubernetes社区中发现了维护问题。我们鼓励您评估迁移到一个容器运行时的情况，该容器运行时是CRI（v1alpha1或v1兼容）的完整实现。

也就是说,在后续的Kubernetes`1.20x`版本以后会删除`dockershim`组件,但是由于目前Docker的使用用户众多,中间必然会有替换的一个过渡期,所以大家可以更多的关注一下其他的`Container Runtime`。 例如我们的`Podman`、`Containerd`、`cri-o`等其他容器运行时来运行kubernetes。

下面我们就具体来看看Kubernetes所提到的弃用`dockershim`到底是什么东西.

## CRI容器运行时接口
- 参考链接：https://github.com/kubernetes/community/blob/master/contributors/devel/sig-node/container-runtime-interface.md
- CRI：容器运行时接口 container runtime interface，CRI 中定义了容器和镜像两个接口，实现了这两个接口目前主流的是：CRI-O、Containerd。（目前 PCI 产品使用的即为 Containerd）。

CRI接口的具体用处就在于
1. 对容器操作的接口，包括容器的创建、启动和停止.即`create`、`stop`等操作。
2. 对镜像的操作，下载、删除镜像等. 即`pull`、`rmi`等操作。
3. podsandbox


## OCI开放容器标准
- OCI：开放容器标准 open container initiative，OCI 中定义了两个标准：容器运行时标准 和 容器镜像标准，实现了这一标准的主流是：runc（也即我们日常说的 Docker）、Kata-Container。

OCI的作用在于
1. `ImageSpec(容器标准包)`：
   1. 文件系统：以 layer 保存的文件系统，每个 layer 保存了和上层之间变化的部分，layer 应该保存哪些文件，怎么表示增加、修改和删除的文件等
   2. config 文件：保存了文件系统的层级信息（每个层级的 hash 值，以及历史信息），以及容器运行时需要的一些信息（比如环境变量、工作目录、命令参数、mount 列表），指定了镜像在某个特定平台和系统的配置。比较接近我们使用 `docker inspect <image_id>` 看到的内容
   3. manifest 文件：镜像的 config 文件索引，有哪些 layer，额外的 annotation 信息，manifest 文件中保存了很多和当前平台有关的信息
   4. index 文件：可选的文件，指向不同平台的 manifest 文件，这个文件能保证一个镜像可以跨平台使用，每个平台拥有不同的 manifest 文件，使用 index 作为索引
2. `runtimeSpec`:
   1. `ociVersion(string, REQUIRED)`:是该州遵守的开放容器倡议运行时规范的版本。
   2. `id`： 容器的 ID。这在此主机上的所有容器中必须是唯一的。不要求它在主机之间是唯一的。
   3. `status(string, REQUIRED)`: 是容器的运行时状态。该值可以是以下之一
      1. creating
      2. created
      3. running
      4. stopped
   4. `pid`: host上看到的容器进程
   5. `bundle`：host上容器bundle目录的绝对路径
   6. `annotation`：容器相关的标注，可选

所以在Json的序列化时,必须遵守以下格式
```json
{
    "ociVersion": "0.2.0",
    "id": "oci-container1",
    "status": "running",
    "pid": 4422,
    "bundle": "/containers/redis",
    "annotations": {
        "myKey": "myValue"
    }
}
```

## Dockershim
`Dockershim` 作用：把外部收到的请求转化成 `docker daemon` 能听懂的请求，让 Docker Daemon 执行创建、删除等容器操作。

> 具体看一下`kubelet`是怎样创建容器的
1. Kubelet 通过 CRI 接口（gRPC）调用`dockershim`,请求创建一个容器。CRI 即容器运行时接口，这一步中，Kubelet 可以视作一个简单的`CRI Client`，而 dockershim 就是接收请求的 Server。目前`dockershim`是内嵌在 Kubelet 中的，所以接收调用就是 Kubelet 进程。
2. `dockershim`收到请求后，转化成 docker daemon的请求，发到docker daemon 上请求创建一个容器。
3. Docker Daemon 早在 1.12 版本中就已经将针对容器的操作移到另一个守护进程 containerd 中，因此 Docker Daemon 仍然不能帮我们创建容器，而是要请求 containerd 创建一个容器。
4. containerd 收到请求后，并不会自己直接去操作容器，而是创建一个叫做 containerd-shim 的进程，让 `containerd-shim` 去操作容器。是因为容器进程需要一个父进程来做诸如收集状态，维持 stdin 等 fd 打开等工作。而假如这个父进程就是 containerd，那每次 containerd 挂掉或升级，整个宿主机上所有的容器都得退出了。而引入了 `containerd-shim` 就规避了这个问题（containerd 和 shim 并不是父子进程关系）。
5. 我们知道创建容器需要做一些设置 namespaces 和 cgroups，挂载 root filesystem 等等操作，而这些事该怎么做已经有了公开的规范，那就是 OCI。它的一个参考实现叫做 runC。于是，containerd-shim 在这一步需要调用 runC 这个命令行工具，来启动容器。
6. runC 启动完容器后本身会直接退出，`containerd-shim` 则会成为容器进程的父进程，负责收集容器进程的状态，上报给 containerd，并在容器中 pid 为 1 的进程退出后接管容器中的子进程进行清理，确保不会出现僵尸进程。

![image.png](https://www.ipicbed.com/images/2022/02/14/image.png)

## 参考链接
- [别慌: Kubernetes 和 Docker](https://kubernetes.io/zh/blog/2020/12/02/dont-panic-kubernetes-and-docker/#)
