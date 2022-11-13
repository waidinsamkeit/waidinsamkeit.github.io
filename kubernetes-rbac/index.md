# kubernetes-Rbac

- Kubernetes中的基于角色的访问控制
- Role ClusterRole(角色)
  - 主体如下
  - User
  - Group
  - ServiceAccount

> 一般选择角色与主体进行绑定



## 角色

当角色可以做什么事情的时候,主体就可以做什么操作

* Role：特定的命名空间的访问权限
* Cluster Role: 所有命名空间的访问权限

## 角色绑定

- roleBinding: 角色绑定到主体
- ClusterRoleBinding: 集群角色绑定到主体

## 主体

- user：用户
- group：用户组
- ServiceAccount：服务账户(一般用于Pod访问)

##  创建命名空间

```shell
kubectl create ns roletest
```

## 在新的空间中创建Pod

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-dep
  namespace: roletest
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
        ports:
        - containerPort: 80
```

## 创建一个角色

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: roletest
  name: Pod-role
rules:
- apiGroups: [""] 
  resources: ["pods"] # 只对pods有权限
  verbs: ["get","watch","list"] # 只拥有get watch list权限
```

## 绑定一个用户

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: roletest
subjects:
- kind: User
  name: alex
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: Pod-role
  apiGroup: rbac.authorization.k8s.io
```

