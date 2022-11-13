# Kubernete-Helm包管理工具

## 概念

Helm是一个Kubernetes的包管理工具,就像Linux下的包管理工具,可以很方便的将之前打包好的yaml文件部署到Kubernetes上.

## Helm可以解决那些问题

1. 使用Helm可以把这些yaml作为一个整体管理
2. 实现yaml高效复用
3. Helm应用级别的版本管理

## Helm基础

- **Charts**: Helm使用的打包格式，一个Chart包含了一组K8s资源集合的描述文件。Chart有特定的文件目录结构，如果开发者想自定义一个新的 Chart，只需要使用Helm create命令生成一个目录结构即可进行开发。
- **Release**: 通过Helm将Chart部署到 K8s集群时创建的特定实例，包含了部署在容器集群内的各种应用资源。
- **Tiller**: Helm 2.x版本中，Helm采用Client/Server的设计，Tiller就是Helm的Server部分，需要具备集群管理员权限才能安装到K8s集群中运行。Tiller与Helm client进行交互，接收client的请求，再与K8s API Server通信，根据传递的Charts来生成Release。而在最新的Helm 3.x中，据说是为了安全性考虑移除了Tiller。
- **Chart Repository**: Helm Chart包仓库，提供了很多应用的Chart包供用户下载使用，官方仓库的地址是[https://hub.helm.sh](https://link.zhihu.com/?target=https%3A//hub.helm.sh)，可以在上面发现很多有意思的项目。之后我们会在官方hub找一个应用做个简单的Demo。
- **helm**：一个命令行管理工具,用来进行配置。

## 部署Helm

**官网地址**：https://helm.sh/zh/

```bash
wget https://get.helm.sh/helm-v3.5.2-linux-amd64.tar.gz
tar -zxf helm-v3.5.2-linux-amd64.tar.gz
mv linux-amd64/helm /usr/bin/
```

## 配置Helm仓库

```bash
 helm repo add aliyun https://kubernetes.oss-cn-hangzhou.aliyuncs.com/charts
 helm repo list # 查看helm仓库地址
 helm repo update # 更新仓库地址
 helm repo remove aliyun # 移除aliyun仓库
```

## 使用Helm部署一个应用

```bash
helm search repo weave # 搜索一个weave应用
helm install docker-ui aliyun/weave-scope # 安装一个应用
helm list # 查看安装列表
helm status  docker-ui # 查看状态
```

## 修改weave的Yaml文件

由于服务没有对外暴露端口,所以需要修改Yaml文件

```bash
kubectl edit svc weave-scope-weave-scope
type: NodePort # type改为NodePort
http://172.16.87.10:31556/ # 访问NodePort端口即可
```

# Chart

使用chart部署一个应用

## 创建一个Chart

```bash
helm create chart # 先创建一个chart模板
├── chart
├── Chart.yaml # 当前chart的属性配置信息
├── templates # 存放模板的目录
│   ├── deployment.yaml
│   ├── _helpers.tpl
│   ├── hpa.yaml
│   ├── ingress.yaml
│   ├── NOTES.txt
│   ├── serviceaccount.yaml
│   ├── service.yaml
│   └── tests
│       └── test-connection.yaml
└── values.yaml # 定义全局变量的文件
```

## 创建一个应用

```bash
cd templates/ # 进入到模板目录
kubectl create deployment web-server --image=nginx:1.7.9 --dry-run -o yaml > deployment.yaml
kubectl expose deployment web-server --port=80 --target-port=80 --type=NodePort --dry-run -o yaml > service.yaml
helm install web-server chart/ # 使用helm直接创建应用
```

## Chart应用升级

```bash
helm upgrade web-server chart/
Release "web-server" has been upgraded. Happy Helming!
NAME: web-server
LAST DEPLOYED: Sun Feb 28 17:40:39 2021
NAMESPACE: default
STATUS: deployed
REVISION: 2
TEST SUITE: None
```

# 通过Helm高效复用

- 通过传递参数,动态渲染模板,动态传入参数生成。
- yaml中大体上有几个不同的地方
  - `image`
  - `tag`
  - `label`
  - `port`
  - `replicas`

## 在Value.yaml中定义变量

```yaml
vim value.yaml
# base Infomation
replicas: 1
image: nginx
tag: 1.7.9
label: nginx
port: 80
```

## 引入Value.yaml变量方式

- **通过表达式的方式进行适用全局变量**

```yaml
# {{.Values.Name}}
# {{.Release.Name}} 取一个动态生成的名字.
```

## 修改Deployment.yaml

```yaml
vim templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  creationTimestamp: null
  labels:
    app: {{ .Values.label }} # 改动处
  name: {{ .Release.Name }}-deployment # 改动处
spec:
  replicas: 1
  selector:
    matchLabels:
      app: {{ .Values.label }} # 改动处
  strategy: {}
  template:
    metadata:
      creationTimestamp: null
      labels:
        app: {{ .Values.label }} # 改动处
    spec:
      containers:
      - image: {{ .Values.image }} # 改动处
        resources: {}
status: {}
```

## 修改Service.yaml

```yaml
vim templates/service.yaml
apiVersion: v1
kind: Service
metadata:
  creationTimestamp: null
  labels:
    app: {{ .Values.label }} # 改动处
  name: {{ .Release.Name }}-svc # 修改处
spec:
  ports:
  - port: {{ .Values.port }} # 修改处
    protocol: TCP
    targetPort: 80
  selector:
    app: {{ .Values.label }} # 修改处
  type: NodePort
status:
  loadBalancer: {}
```

## 尝试运行应用

```bash
helm install --dry-run web2 charts/ # 起的名字叫web2
```

- `--dry-run`：表示尝试运行

```bash
helm install  web2 charts/ # 实际运行
```

