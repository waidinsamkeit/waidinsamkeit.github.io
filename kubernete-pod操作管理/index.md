# Kubernete-Pod操作管理

有状态和无状态的区别
- 无状态
  1. 认为Pod都是一样的
  2. 没有顺序要求
  3. 不用考虑在哪个Node运行
  4. 随意进行伸缩和扩展
- 有状态
  1. 有关无状态的因素都需要考虑
  2. 让每个Pod都是独立的,保持Pod启动顺序的唯一性
  3. 唯一的网络标识符,持久化存储数据
  4. 有序化,例如MYSQL主从


>  无头Service

- ClusterIP：None

## 部署StatefulSet

```yaml
# 首先构建一个无头Service
apiVersion: v1
kind: Service
metadata:
  name: nginx
  labels: 
    app: nginx
spec:
  ports:
  - port: 80
    name: web
  clusterIP: None
  selector:
    app: nginx
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: nginx-statefulset
  namespace: default
spec: 
  serviceName: nginx
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

## 部署守护进程

**在每个Node上运行一个Pod,新加入的node也同样运行一个Pod在里面**

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: ds-test
  labels:
    app: filebeat
spec: 
  selector:
    matchLabels:
      app: filebeat
  template: 
    metadata: 
      labels:
        app: filebeat
    spec:
      containers: 
      - name: logs
        image: nginx
        ports: 
        - containerPort: 80
        volumeMounts:
        - name: varlog
          mountPath: /tmp/log
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
```

## Job与Cronjob

1. Job(一次性任务)

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: pi
spec:
  template:
    spec: 
      containers:
      - name: pi
        image: perl
        command: ["perl","-Mbignum=bpi","-wle","print bpi(2000)"]
      restartPolicy: Never
  backoffLimit: 4 # 失败后尝试执行4次
```

2. Cronjob(定时任务)

```yaml
apiVersion: batch/v1beta1
kind: CronJob
metadata: 
  name: hallo
spec:
  schedule: "*/1 * * * *"
  jobTemplate: 
    spec: 
      template: 
        spec: 
          containers: 
          - name: hello
            image: busybox
            args: 
            - /bin/sh
            - -c
            - date; echo Hello form the Kubernetes Cluster messages
          restartPolicy: OnFailure
```


