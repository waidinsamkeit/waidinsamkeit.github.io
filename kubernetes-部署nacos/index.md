# kubernetes-部署NACOS

## 简单安装使用
>  最新版本应该是1.4.1
```shell
git clone https://github.com/nacos-group/nacos-k8s.git
```

- 简单使用
- 如果你使用简单方式快速启动,请注意这是没有使用持久化卷的,可能存在数据丢失风险:!!! 

```shell
cd nacos-k8s
chmod +x quick-startup.sh
./quick-startup.sh
```

- 演示使用
- **服务注册**
```shell
curl -X PUT 'http://cluster-ip:8848/nacos/v1/ns/instance?serviceName=nacos.naming.serviceName&ip=20.18.7.10&port=8080'
```
- **服务发现**
```shell
curl -X GET 'http://cluster-ip:8848/nacos/v1/ns/instance/list?serviceName=nacos.naming.serviceName'
```
- **发布配置**
```shell
curl -X POST "http://cluster-ip:8848/nacos/v1/cs/configs?dataId=nacos.cfg.dataId&group=test&content=helloWorld"
```
- **获取配置**
```shell
curl -X GET "http://cluster-ip:8848/nacos/v1/cs/configs?dataId=nacos.cfg.dataId&group=test"
```

## 高级用法

> 在高级使用中,Nacos在K8S拥有自动扩容缩容和数据持久特性,请注意如果需要使用这部分功能请使用PVC持久卷,Nacos的自动扩容缩容需要依赖持久卷,以及数据持久化也是一样,本例中使用的是NFS来使用PVC.

### 部署NFS

nfs-client-provisioner 可动态为kubernetes提供pv卷，是Kubernetes的简易NFS的外部provisioner，本身不提供NFS，需要现有的NFS服务器提供存储。持久卷目录的命名规则为: `${namespace}-${pvcName}-${pvName}`

**创建角色**

```shell
kubectl create -f deploy/nfs/rbac.yaml
```

**修改NFS的yaml**

```yaml
vim nacos-k8s/deploy/nfs/deployment.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: nfs-client-provisioner
---
kind: Deployment
apiVersion: apps/v1
metadata:
  name: nfs-client-provisioner
spec:
  replicas: 1
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app: nfs-client-provisioner
  template:
    metadata:
      labels:
        app: nfs-client-provisioner
    spec:
      serviceAccount: nfs-client-provisioner
      containers:
        - name: nfs-client-provisioner
          image: quay.io/external_storage/nfs-client-provisioner:latest
          volumeMounts:
            - name: nfs-client-root
              mountPath: /persistentvolumes
          env:
            - name: PROVISIONER_NAME
              value: fuseim.pri/ifs
            - name: NFS_SERVER
              value: 10.1.6.93 # 修改NFS的IP为你本地的NFSIP地址
            - name: NFS_PATH
              value: /server/nacos
      volumes:
        - name: nfs-client-root
          nfs:
            server: 10.1.6.93 # 同上
            path: /server/nacos
```

**部署NFS-client**

```yaml
kubectl create -f deploy/nfs/deployment.yaml
```

**部署NFS StorageClass**

```
kubectl create -f deploy/nfs/class.yaml
```

**验证nfs-client-provisioner是否成功**

```shell
kubectl get pod -l app=nfs-client-provisioner
```

### 部署mysql

```shell
kubectl create -f deploy/mysql/mysql-nfs.yaml
```

### 部署Nacos

- 修改 **deploy/nacos/nacos-pvc-nfs.yaml** 

> 可以自行选择更改

```yaml
data:
  mysql.master.db.name: "主库名称"
  mysql.master.port: "主库端口"
  mysql.slave.port: "从库端口"
  mysql.master.user: "主库用户名"
  mysql.master.password: "主库密码"
```

- **创建Nacos**

```shell
kubectl create -f nacos-k8s/deploy/nacos/nacos-pvc-nfs.yaml
```

### 扩容测试

- 在扩容前，使用 [`kubectl exec`](https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands/#exec)获取在pod中的Nacos集群配置文件信息

```shell
for i in 0 1; do echo nacos-$i; kubectl exec nacos-$i cat conf/cluster.conf; done
```

StatefulSet控制器根据其序数索引为每个Pod提供唯一的主机名。 主机名采用 - 的形式。 因为nacos StatefulSet的副本字段设置为3，所以当前集群文件中只有三个Nacos节点地址

- 使用kubectl scale 对Nacos动态扩容

```
kubectl scale sts nacos --replicas=5
```

