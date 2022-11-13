# Kubernetes持久化配置文件

ConfigMap了解
描述信息ConfigMap 功能在 Kubernetes1.2 版本中引入，许多应用程序会从配置文件、命令行参数或环境变量中读取配置信息。ConfigMap API 给我们提供了向容器中注入配置信息的机制，ConfigMap 可以被用来保存单个属性，也可以用来保存整个配置文件或者 JSON 二进制大对象



有点儿类似于`zookeeper` `nacos`这种服务注册中心

## configMap的创建

> 使用目录创建

```bash
$ ls docs/user-guide/configmap/kubectl/
game.properties
ui.properties

$ cat docs/user-guide/configmap/kubectl/game.properties
enemies=aliens
lives=3
enemies.cheat=true
enemies.cheat.level=noGoodRotten
secret.code.passphrase=UUDDLRLRBABAS
secret.code.allowed=true
secret.code.lives=30

$ cat docs/user-guide/configmap/kubectl/ui.properties
color.good=purple
color.bad=yellow
allow.textmode=true
how.nice.to.look=fairlyNice

$ kubectl create configmap game-config --from-file=docs/user-guide/configmap/kubectl
```

`--from-file`指定的目录下的所有文件都会配置在configMap中以,以键值对的方式存在.



## 使用文件创建

只要指定为一个文件就可以从单个文件中创建 ConfigMap

```bash
kubectl create configmap game-config-2 --from-file=docs/user-guide/configmap/kubectl/game.properties
```

`game.properties`是一个文件

## 使用字面值创建

```bash
kubectl create configmap special-config --from-literal=special.how=very --from-literal=special.type=charm
```

`special.how`键名 `very`键值

## Pod中使用ConfigMap

1. 使用ConfigMap代替环境变量

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: special-config
  namespace: default
data:
	special.how: very
	special.type: charm
```

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: env-config
  namespace: default
data:
  log_level: INFO
  
```

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: dapi-test-pod
spec:
  containers:
    - name: test-api
      image: nginx:1.7.9
      command: ["/bin/sh","-c","env"]
      env:
        - name: SPECIAL_LEVEL_KEY
          valueFrom: 
            configMapKeyRef:
              name: spacial-config
              key: special.how
        - name: SPECIAL_TYPE_KEY
          valueFrom:
            configMapKeyRef:
            name: special-config
            key: special.type
      envFrom: 
        - configMapRef
            name: env-config
    restartPolicy: Never
```

## 使用configMap设置命令行参数

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: special-config
  namespace: default
data:
	special.how: very
	special.type: charm
```

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: dapi-test-pod
spec:
  containers:
    - name: test-api
      image: nginx:1.7.9
      command: ["/bin/sh","-c","echo $($SPECIAL_LEVEL_KEY)$(SPECIAL_TYPE_KEY)"]
      env:
        - name: SPECIAL_LEVEL_KEY
          valueFrom: 
            configMapKeyRef:
              name: spacial-config
              key: special.how
        - name: SPECIAL_TYPE_KEY
          valueFrom:
            configMapKeyRef:
            name: special-config
            key: special.type
      envFrom: 
        - configMapRef
            name: env-config
    restartPolicy: Never
```

## 通过数据卷插件方式使用configMap

**在数据卷里面使用configMap,有不同的选项。最基本的就是将文件填入数据卷中,键就是文件名，键值就是文件内容**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: dapi-test-pod
spec:
  containers:
    - name: test-api
      image: nginx:1.7.9
      command: ["/bin/sh","-c","cat /etc/config/special.how"]
      volumeMounts:
        - name: config-volume
          mountPath: /etc/config
    volumes:
      - name: config-volume
        configMap:
          name: special-config
    restartPolicy: Never
```

## configMap的热更新

```yaml
apiVersion: v1
kind: ConfigMap
metadata:  
  name: log-config
  namespace: default
data:
  log_level: INFO
---
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
name: my-nginx
spec:
  replicas: 1
  template:
    metadata:
      labels:
        app: mynginx
      spec:
        containers:
        - name: my-nginx
          image: nginx:1.7.9
          ports:
          - containerPort: 80
          volumeMounts:
          - name: config-volume
            mountPath: /etc/config
        volumes:
          - name: config-volume
            configMap
              name: log-config
```

**修改configMap**

```bash
kubectl edit configmap log-comfig
```

**修改`log_level`的值为DEBUG等待大概10秒**

```bash
apiVersion: v1
kind: ConfigMap
metadata:  
  name: log-config
  namespace: default
data:
  log_level: DEBUG
```

**滚动更新Pod**

```bash
kubectl patch deployment my-nginx --patch'{"spec": {"template": {"metadata": {"annotations":{"version/config": "20190411" }}}}}'
```



