# kubernetes-卷的概念

## PersistentVolume
**是由管理员设置的存储,他是集群的一部分。就像节点是集群中的资源一样,PV也是集群中的资源。**
**PV是Volume之类的卷插件,但具有独立于适用PV的Pod的生命周期。此API对象包含存储实现的细节**
**即NFS、ISCSI或特定于云供应商存储系统** 

## 有关于PV的分类

- 静态PV: 集群管理员创建一些PV ,他们带有可供集群用户使用的实际存储的细节。,他们存在于KubernetesAPI中
- 动态PV：当管理员创建的静态PV都不匹配用户的persistenVolumeClaim时候,集群可能会尝试动态的为PVC创建卷。此配置基于`StorageClasses`也就是说PVC必须请求`StorangeClasses`并且管理员必须创建并且配置类才能动态创建
- 绑定：master中的控制环路监视新的PVC,寻找匹配的PV(如果可能),并将它们绑定在一起。如果为新的PVC动态调配PV,则该环路将始终会把PV绑定到PVC,否则,用户总会得到它们所请求的存储,但是容量可能超出要求的数量。一旦PV和PVC绑定完成之后 不管他们是如何绑定的 PVC和PV是一对一的映射。


## PVC

- 根据容量和读写模式进行匹配
使用户存储的请求。它与Pod相似。Pod消耗节点资源,PVC消耗PV资源,Pod可以请求特定级别的CPU和内存

- PVC可以请求特定的大小和访问模式。

## 持久化卷声明的保护

PVC保护的目的是确保Pod正在使用的PVC不会从系统中移除

当启用PVC保护alpha的功能时候,如果用户删除了一个Pod正在使用的PVC,则该PVC不会被立即删除

,PVC的删除将会被延迟,直到PVC不再被任何Pod使用



## 持久化卷类型
- GcePersistentDisk
- FlexVolume
- Cinder
- HostPath

## PV创建

选择NFS作为PV的底层存储

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: web-pv
spec:
 capacity:
   storage: 6Gi
 volumeMode: Filesystem
 accessModes:
   - ReadWriteOnce # 仅读写一人
 persistentVolumeReclaimPolicy: Recyle # 回收策略
 storageClassName: slow # 类的名字
 mountOptions:
   - hard
   - nfsvers=4.1
 nfs:
   path: /tmp
   server: 10.1.6.110 # NFS服务器地址
```

## PV访问模式

`PersistentVolume`可以以资源提供者支持的任何方式挂载到主机上。如下图所示

供应商具有不同的功能,每个PV的访问模式都将被设置为该卷支持的特定模式。

> 注意：并不是所有的插件都支持多个读/写客户端

例如可以指定NFS的PV只能以读的方式导出到服务器上.

- ReadWriteOnce：该卷可以被单个Pod以读/写模式挂载
- ReadOnlyMany：该卷可以被多个Pod以只读模式挂载
- ReadWriteMany：该卷可以被多个Pod以读/写模式挂载

## 回收策略

- Retain：保留--手动回收
- Recycle：回收--基本擦除(差不多类似于rm -rf /*) 新版本已经删除了
- Delete(删除)--关联的存储资产(例如AWS EBS)

当前只有NFS和HostPath支持回收策略 AWS EBS Azure Disk支持删除

## 状态

卷可以处于以下某种的状态

- Available：可用-一块空闲资源还没有被任何声明绑定.
- Bound：已绑定-卷已经声明绑定
- Released：已释放-声明被删除,但是资源还未被集群重新声明
- Failed：失败-该卷的自动回收失败

## PVC创建

> 安装NFS的我就不写了

```yaml
# 先部署PV
apiVersion: v1
kind: PersistentVolume
metadata:
  name: nfs-pvalksjdf2
spec:
  capacity:
    storage: 1Gi
  accessModes:
    - ReadWriteMany
  storageClassName: "nfs"
  nfs:
    path: /data
    server: 10.1.6.110
```

**创建服务并且使用Pvc**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-dep
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels: 
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.7.9
        volumeMounts:
        - name: wwwroot
          mountPath: /usr/share/nginx/html
        ports:
        - containerPort: 80
      volumes:
      - name: wwwroot
        persistentVolumeClaim:
          claimName: my-pvc
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-pvc
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: "nfs"
  resources:
    requests:
      storage: 1Gi
```
面介绍的PV和PVC模式是需要运维人员先创建好PV，然后开发人员定义好PVC进行一对一的Bond，但是如果PVC请求成千上万，那么就需要创建成千上万的PV，对于运维人员来说维护成本很高，Kubernetes提供一种自动创建PV的机制，叫StorageClass，它的作用就是创建PV的模板。
具体来说，StorageClass会定义一下两部分：
- PV的属性 ，比如存储的大小、类型等
- 创建这种PV需要使用到的存储插件，比如Ceph等
有了这两部分信息，Kubernetes就能够根据用户提交的PVC，找到对应的StorageClass，然后Kubernetes就会调用 StorageClass声明的存储插件，创建出需要的PV。

这里我们以NFS为例，要使用NFS，我们就需要一个nfs-client的自动装载程序，我们称之为Provisioner，这个程序会使用我们已经配置好的NFS服务器自动创建持久卷，也就是自动帮我们创建PV。
说明：

- 自动创建的PV会以`${namespace}-${pvcName}-${pvName}`的目录格式放到NFS服务器上；
- 如果这个PV被回收，则会以`archieved-${namespace}-${pvcName}-${pvName}`这样的格式存放到NFS服务器上；
