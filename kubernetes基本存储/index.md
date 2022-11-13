# Kubernetes基本存储

## 本章了解内容
1. EmptyDir
2. HostPath
3. NFS
4. PV和PVC
5. 生命周期
6. StorageClass

## EmptyDir

​`	EmptyDir`是基础的Volume类型,一个`EmptyDir`就是Host上的一个空目录。`EmptyDir`是在Pod被分配到节点时创建的,它的初始化内容为空,并且无需指定宿主机上对应的目录文件,因为Kubernetes会自动的为他分配一个目录。当Pod被销毁的时候,`EmptyDir`中的数据也会永久的被删除。

### 1. EmptyDir的用途

- 作为临时空间使用,例如某些应用程序所运行时所需要的临时目录,并且无需永久保留
- 一个容器需要从另一个容器中获取数据的目录(多容器共享目录)

### 2. 模拟容器文件共享

在一个Pod中准备两个容器nginx和busybox,然后声明一个Volume分别挂载在两个容器的目录中,然后nginx负责向Volume中写日志,busybox负责读取日志内容到控制台。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: volume-test
spec:
  containers:
  - name: nginx
    image: nginx:latest
    ports:
    - containerPort: 80
    volumeMounts:
    - name: logs-volume
      mountPath: /var/log/nginx
  - name: busybox
    image: busybox:1.30
    command: ["/bin/sh","-c","tail -f /logs/access.log"]
    volumeMounts:
    - name: logs-volume
      mountPath: /logs
  volumes:
  - name: logs-volume
    emptyDir: {}
```

**你可以进入到你的busybox容器查看**
> 实际上就是相当于Nginx挂载了/var/log/nginx/目录,然后Busybox也挂载了/var/log/nginx/下的内容到自己的/logs/目录。

```shell
kubectl exec  -it volume-test -c busybox /bin/sh
或者使用kubectl logs 进行查看
kubectl logs -f volume-test -c busybox 
10.233.97.0 - - [08/Feb/2022:03:42:43 +0000] "GET / HTTP/1.1" 200 615 "-" "curl/7.29.0" "-"
```



## HostPath

​由于`EmptyDir`的生命周期是与Pod相关联的,如果Pod销毁的话,那么`EmptyDir`也会随之删除。如果想要简单的将数据持久化到主机中,可以选择`HostPath`。

​`HostPath`就是主机中的实际目录挂载在Pod中,以供给容器进行使用。这样的设计就可以保证Pod销毁掉以后,数据依然还在主机节点中。

在说一下`type`的具体类型
- `DirectoryOrCreate`：目录存在就是用,不存在就先创建后使用。
- `Directory`：目录必须存在
- `FileOrCreate`：文件存在就是用,不存在就创建使用
- `File`: 文件必须存在
- `Socket unix`：套接字必须存在
- `CharDevice`：字符设备必须存在
- `BlockDevice`：块儿设备必须存在
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: volume-test
spec:
  containers:
  - name: nginx
    image: nginx:latest
    ports:
    - containerPort: 80
    volumeMounts:
    - name: logs-volume
      mountPath: /var/log/nginx
  - name: busybox
    image: busybox:1.30
    command: ["/bin/bash","-c","tail -f /logs/access.log"]
    volumeMounts:
    - name: logs-volume
      mountPath: /logs
  volumes:
  - name: logs-volume
    hostPath:
      path: /tmp/pod-test
      type: DirectoryOrCreate # 挂载的类型
```
## NFS
`HostPath`虽然可以用来解决数据持久化问题,但是一旦节点故障了,Pod转移到了其他的节点上又会出现问题了,此时我们就需要准备单独的网络存储系统。比如 `NFS`、`CIFS`等。
`NFS`是一个网络文件存储系统,可以搭建一台NFS服务器。然后将Pod中的存储直接连接到`NFS`系统中,无论Pod如何转移,只要Node跟`NFS`的连接没有问题,数据就可以成功的进行访问。

### 1. 安装NFS服务器

```shell
# 在所有Kubernetes节点安装NFS服务
yum -y install nfs-utils -y 

# 准备共享目录
mkdir -pv /data/public

# 将共享目录以读写方式暴露给所有主机
vim /etc/exports
/data/public  *(insecure,rw,sync)

# 启动NFS
systemctl  start nfs
```



```yaml
apiVersion: v1
kind: Pod
metadata:
  name: volume-test
spec:
  containers:
  - name: nginx
    image: nginx:latest
    ports:
    - containerPort: 80
    volumeMounts:
    - name: logs-volume
      mountPath: /var/log/nginx
  - name: busybox
    image: busybox:1.30
    command: ["/bin/bash","-c","tail -f /logs/access.log"]
    volumeMounts:
    - name: logs-volume
      mountPath: /logs
  volumes:
  - name: logs-volume
   	nfs: 
   	  server: 192.168.1.2 # NFS服务器地址
   	  path: /data/public # NFS共享文件的路径
```



## PV和PVC

​	PV(Persistent Volume)是持久化卷的意思,是对底层共享存储的一种抽象。一般情况下PV由Kubernetes管理员创建和配置，它与底层具体的共享存储技术有关,并且通过插件完成共享存储的对接。

​	PVC(Persistent Volume Claim)是持久卷声明的意思,是用户对存储需求的一种声明。换句话说，实际就是用户向Kubernetes发出的一种需要存储资源的申请。
![PVPVC.png](https://www.ipicbed.com/images/2022/02/09/PVPVC.png)
### 1. PV

​	Pv是存储资源的抽象,下面是资源清单文件

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: pv2
spec: 
  nfs: # 存储类型,与底层存储对应
  capacity: # 存储能力,目前只支持存储空间的设置
    storage: 2Gi
  accessMode: # 访问模式
  storageClassName: # 存储类别
  persistentVolumeReclaimPolicy: # 回收策略
```

- 存储类型：底层实际存储的类型,kubernetes支持多种存储类型,每种存储类型的配置都有所差异。

- 存储能力：目前只支持存储空间的设置,不过未来可能会加入IOPS、吞吐量等指标配置。

- 访问模式：用户描述用户对存储资源的访问权限。

  - `ReadWriteOnce(RWO)`：读写权限,但是只能被单个节点挂载。
  - `ReadOnlyMany(ROX)`：只读权限，可以被多个节点挂载。
  - `ReadWriteMany(RWX)`：读写权限，可以被多个节点挂载。

  > 注意：底层不同的存储类型可能支持的访问模式不同。

- 回收策略：当Pv不在被使用的时候,对这个Pv的处理方式。

  - `Retain(保留)`：保留数据,需要管理员手动清理数据。
  - `Recycle(回收)`：清除PV中的数据。
  - `Delete(删除)`：与PV项链的后端存储完成Volume的删除操作

  > 注意：底层不同的存储类型可能支持的访问模式不同。

- 存储类别：PV可以通过`StorageClassName`参数绑定一个存储类别。具有特定类型的PV智能与请求了该类型的Pvc进行绑定。未设定类型的PV只能与不请求任何类型的PVC进行绑定。

- 状态：一个PV的生命周期中,可能会处于4种不同的阶段

  - `Available(可用)`：表示可用状态,还没有被任何PVC绑定。
  - `Bound(已经绑定)`：表示该PV已经被PVC绑定
  - `Released(已释放) `：表示PVC被删除,但是资源还未被集群重新声明。
  - `Failed(失败)`：表示该PV的自动回收失败。

简单的演示一下PV的使用

```yaml
  apiVersion: v1
  kind: PersistentVolume
  metadata:
    name: pv1
  spec:
    capacity:
      storage: 1Gi
    accessModes:
    - ReadWriteMany
    persistentVolumeReclaimPolicy: Retain
    nfs:
      path: /var/data
```



### 2. PVC

​	PVC是资源的申请,用来声明对存储空间、访问模式、存储类别需求信息。

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: pvc
spec:
  accessModes: # 访问莫斯
  selector: # 采用标签对Pv选择
  StorageClassName: # 存储类别
  resources: # 请求空间
    requests:
      storage: 5Gi
```

- `accessModes(访问模式)`：用于描述用户对存储资源的访问权限。

- `selector(选择条件)`：通过selector的设置,可使PVC对于系统中已经存在的PVC进行筛选。 

- `storageClassName`：PVC在定义的时候设定需要后端存储的类别,只有设置了该Class的Pv才能被系统选出。

简单的演示一下Pvc的使用

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: pvc1
spec:
  accessModes: ReadWriteMany
  resources:
    requests:
      storage: 1Gi
---
apiVersion: v1
kind: Pod
metadata:
  name: volume-test
spec:
  containers:
    - name: nginx
      image: nginx:latest
      ports:
        - containerPort: 80
      volumeMounts:
        - name: logs-volume
          mountPath: /var/log/nginx
    - name: busybox
      image: busybox:1.30
      command: ["/bin/bash","-c","tail -f /logs/access.log"]
      volumeMounts:
        - name: volume
          mountPath: /logs
  volumes:
    - name: volume
      persistentVolumeClaim:
        claimName: pvc1
        readOnly: true
```



## 生命周期

​	PV和PVC是一一对应的,PV和PVC之间的相互作用遵循以下生命周期。

- 1.资源供应：管理员手动创建底层存储和PV。
- 2.资源绑定：用户创建PVC请求,Kubernetes负责根据PVC的请求去寻找PV,并且进行绑定,在用户定义好PVC之后,系统将根据PVC对存储资源的请求已存在的PV中选择一个满足条件的。
  - 一旦找到,就会将该PV与用户定义的PVC进行绑定,用户的应用就可以使用此PVC了。
  - 如果找不到,PVC则会无限期处于`Pending`状态,直到找到符合要求的PVC。
- 3.资源使用：用户可在Pod中像Volume一样使用Pvc,Pod使用Volume的定义,将Pvc挂载到容器内的某个路径进行使用。
- 4.资源释放：用户删除PVC释放PV,当存储资源使用完毕后,用户可以删除PVC,与该PVC绑定的PV会被标记完已释放,但不能立刻的与其他PVC进行绑定。通过之前PVC写入的数据可能还留存在存储设备上,只有清楚之后该PV才能再次使用。
- 5.资源回收：kubernetes根据pv设置的回收策略进行资源的回收,对于PV，管理员可以设定回收策略,用于设置与之绑定的PVC释放资源之后如何处理数据遗留的问题。只有PV的存储空间完成回收,才能与新的PVC绑定和使用。
![PVC.png](https://www.ipicbed.com/images/2022/02/09/PVC.png)
