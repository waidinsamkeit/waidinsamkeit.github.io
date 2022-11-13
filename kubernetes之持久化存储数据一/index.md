# Kubernetes之持久化存储数据(一)

## 持久化存储-NFS

- Emptydir：是本地存储,Pod重启,数据不存在了

- Nfs：网络存储,Pod重启后,数据还是存在的

## 部署NFS服务器

> 可以单独设置一台服务器为NFS服务器

```bash
yum -y install nfs-utils
systemctl start nfs
```

## 设置挂载目录

```bash
mkdir /data/k8s_nfs -p
vim /etc/exports
/data/k8s_nfs *(rw,no_root_squash)
```

## 在K8S节点上安装NFS

```bash
yum -y install nfs-utils
```

## 部署应用挂载NFS

```yaml
vim nginx-nfs.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-dep1
spec:
  replicas: 1
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
        image: nginx
        volumeMounts:
        - name: wwwroot
          mountPath: /usr/share/nginx/html # NFS挂载到内部的目录
        ports:
        - containerPort: 80
      volumes:
        - name: wwwroot
          nfs:
            server: 172.16.87.100
            path: /data/k8s_nfs # NFS文件夹地址
            
```

```bash
kubectl apply -f nginx-nfs.yaml
# 注意,你需要进入到/data/k8s_nfs创建一个Index.html然后进入到容器中才能验证效果
```

