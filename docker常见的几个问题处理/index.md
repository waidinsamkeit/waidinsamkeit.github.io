# Docker常见的几个问题处理



> 总结了一下平常Docker常见的错误处理,大概二十几个左右。

## Docker迁移存储目录

**问题起因** 由于公司最开始的服务器在`/var/lib/docker`没有挂载存储,容量只有40G,导致服务器磁盘用满。现将原有的Docker目录数据进行迁移。

> 请各位Kubernetes用户不要操作,因为容器编排不支持!"

```shell
# 启动容器发现如下报错
ERROR：cannot  create temporary directory!
```

### 方法一: 软连接方式

```shell
# 1.停止docker服务
systemctl stop docker

# 2.开始迁移目录
mv /var/lib/docker /data/

# 使用cp命令也可以
cp -arv /var/lib/docker  /data/docker

# 3.添加软链接
ln -s /data/docker /var/lib/docker

# 4.启动docker服务
systemctl start docker
```

### 方法二: 修改docker配置文件

```shell
vim /etc/docker/daemon.json
{
    "graph": [ "/data/docker/" ]  # 更改docker镜像的存储目录
}
```

## Docker存储空间不足

### 问题一: No space left on device

问题描述：`docker run `的时候系统提示`No space left on device`!

> 这个问题无非就两种情况
>
> 1. 一种是磁盘满了
> 2. 一种是磁盘inode满了

因为 `ext3` 文件系统使用 `inode table` 存储 `inode` 信息，而 `xfs` 文件系统使用 `B+ tree` 来进行存储。考虑到性能问题，默认情况下这个 `B+ tree` 只会使用前 `1TB` 空间，当这 `1TB` 空间被写满后，就会导致无法写入 `inode` 信息，报磁盘空间不足的错误。我们可以在 `mount` 时，指定 `inode64` 即可将这个 `B+ tree` 使用的空间扩展到整个文件系统。

```shell
# 查看inde信息
df -i
```

```shell
# 删除过多的小文件即可
Filesystem     Inodes IUsed  IFree IUse% Mounted on
/dev/sda3      593344 56998 536346   10% /
tmpfs          238282     1 238281    1% /dev/shm
/dev/sda1       51200    39  51161    1% /boot
/tmp/1m           128   128      0  100% /app/logs
```

> 如果不知道小文件如何查找

```shell
# 查找系统中 目录大小大于1M（目录一般大小为4K，所以目录要是大了那么文件必然很多）
find / -size +4k -type d |xargs ls -ldhi
```

> 如果是硬盘空间满了的话

```shell
# 查看磁盘使用容量
df -h   
```

```shell
# 查看到具体哪个目录满了,然后配合 du -sh命令解决即可
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda3       8.8G  8.8G     0 100% /
tmpfs           931M     0  931M   0% /dev/shm
/dev/sda1       190M   40M  141M  22% /boot
```

## 优雅地重启Docker

> 不停止重启,重启docker是一件多么美妙的事情! 

当 `Docker` 守护程序终止时，它会关闭正在运行的容器。从 `Docker-ce 1.12` 开始，可以在配置文件中添加 `live-restore` 参数，以便在守护程序变得不可用时容器保持运行。需要注意的是 `Windows` 平台暂时还是不支持该参数的配置。

```shell
vim /etc/docker/daemon.json
{
  "live-restore": true
}
```

在守护进程关闭的时候保持容器运行

```shell
# 重载docker服务
systemctl reload docker.service
[root@VM-0-9-centos ~]# docker ps -a
CONTAINER ID   IMAGE     COMMAND                  CREATED         STATUS          PORTS     NAMES
e58a220f03c3   nginx     "/docker-entrypoint.…"   5 minutes ago   Up 15 seconds   80/tcp    web
# 这个时候重启docker服务,web服务并没有停止工作
[root@VM-0-9-centos ~]# systemctl restart docker
[root@VM-0-9-centos ~]# docker ps -a
CONTAINER ID   IMAGE     COMMAND                  CREATED         STATUS              PORTS     NAMES
e58a220f03c3   nginx     "/docker-entrypoint.…"   7 minutes ago   Up About a minute   80/tcp    web
```

### live-restore的限制
> 当前的Live Restore特性可以在进行Daemon维护，或者在Daemon发生问题导致不可用的情况，减少容器的停机时间，不过其也有一定的限制。

1. Docker版本升级限制
   Live Restore仅支持Docker补丁版本升级时可用，也就是 YY.MM.x 最后一位发生变化的升级，而不支持大版本的升级。在进行大版本升级后，可能会导致Daemon无法重新连接到运行中容器的问题，这时候需要手动停止运行的容器。
2. Daemon选项变更
   也就是说Live Restore仅仅在某些Daemon级别的配置选项不发生改变的情况工作，例如Bridge的IP地址，存储驱动类型等。如果在重启Daemon时候，这些选项发生了改变，则可能会到Daemon无法重新连接运行中的容器，这时也需要手动停止这些容器。
3. 影响容器的日志输出
   如果Daemon长时间停止，会影响运行容器的日志输出。因为默认情况下，日志管道的缓冲区大小为64k，当缓冲写满之后，必须启动Daemon来刷新缓冲区。
4. 不支持Docker Swarm
   Live Restore只是独立Docker引擎的特性，而Swarm的服务是由Swarm管理器管理的。当Swarm管理器不可用时，Swarm服务是可以在工作节点上继续运行的，只是不同通过Swarm管理器进行管理，直到Swarm管理恢复工作。


## 容器内部中文异常
问题描述: 容器内部中文乱码、无法正常显示中文、
- 例如显示中文：`--------���`
```shell
# 查看容器内部编码
root@e58a220f03c3:/# locale -a
C
C.UTF-8
POSIX
```
然而 `POSIX` 字符集是不支持中文的，而 `C.UTF-8` 是支持中文的只要把系统中的环境 `LANG` 改为 `"C.UTF-8"` 格式即可解决问题。同理，在 `K8S` 进入 `pod` 不能输入中文也可用此方法解决。
```shell
export LANG=zh_CN.UTF-8
```

