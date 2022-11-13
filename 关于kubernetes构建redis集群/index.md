# 关于Kubernetes构建Redis集群


## 编写你的Dockerfile

```bash
FROM centos:8

# add our user and group first to make sure their IDs get assigned consistently, regardless of whatever dependencies get added
RUN groupadd -r -g 1000 redis && useradd -r -g redis -u 1000 redis

# Redis信息 注意SHA校验
ENV REDIS_VERSION 6.0.8
ENV REDIS_DOWNLOAD_URL http://download.redis.io/releases/redis-6.0.8.tar.gz
ENV REDIS_DOWNLOAD_SHA 98ed7d532b5e9671f5df0825bb71f0f37483a16546364049384c63db8764512b

# set -eux 以Debug的方式执行shell 遇到错误会退出
RUN set -eux; \
     \
     sed -e 's|^mirrorlist=|#mirrorlist=|g' \
         -e 's|^#baseurl=http://mirror.centos.org|baseurl=https://mirrors.tuna.tsinghua.edu.cn|g' \
         -i.bak \
         /etc/yum.repos.d/CentOS-*.repo

RUN set -eux; \
    \
	yum makecache; \
	yum -y install zlib-devel \
        openssl-devel \
        gcc \
        wget \
        make \
        gcc-c++;\
	wget -O redis.tar.gz "$REDIS_DOWNLOAD_URL"; \
	echo "$REDIS_DOWNLOAD_SHA *redis.tar.gz" | sha1sum ; \
	mkdir -p /usr/local/redis; \
	tar -xzf redis.tar.gz -C /usr/local/redis --strip-components=1; \
	rm redis.tar.gz; \
    make -C /usr/local/redis; \
    make -C /usr/local/redis install;

chown redis:redis /data
VOLUME /usr/local/redis
WORKDIR /usr/local/redis
COPY redis.conf /usr/local/redis/
#COPY docker-entrypoint.sh /usr/local/bin/
#ENTRYPOINT ["docker-entrypoint.sh"]
# 可选
# RUN chmod -R 777 /usr/local/redis
EXPOSE 6379
# ENTRPOINT 参数可选 可以直接运行 也可以在yaml指定command
ENTRYPOINT ["redis-server","/usr/local/redis/redis.conf","--protected-mode","no"]
```

**redis.conf**

```conf
appendonly yes
cluster-enabled yes
cluster-config-file nodes.conf
cluster-node-timeout 5000
dir /usr/local/redis/
port 6379
daemonize no
```

**redis-cluster.yaml**

> 提醒您: 请挂载数据卷配置,注意保存数据,防止数据丢失！！！

```yaml
---
kind: Service
apiVersion: v1
metadata:
  name: redis-headless
  namespace: production-contract
  labels:
    app: redis
  annotations:
    kubesphere.io/alias-name: redis
    kubesphere.io/creator: admin
    kubesphere.io/serviceType: statefulservice
spec:
  ports:
    - name: http-redis 
      protocol: TCP
      port: 6379
      targetPort: 6379
  selector:
    app: redis
  clusterIP: None
  type: ClusterIP
  sessionAffinity: None
---
kind: StatefulSet
apiVersion: apps/v1
metadata:
  name: redis
  namespace: production-contract
  labels:
    app: redis
  annotations:
    kubesphere.io/creator: admin
spec:
  replicas: 6
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      creationTimestamp: null
      labels:
        app: redis
      annotations:
        kubesphere.io/containerSecrets: '{"container-u4km8f":"harbor"}'
    spec:
      containers:
        - name: container-u4km8f
          image: '10.1.6.15/apps/redis:prod'
          ports:
            - name: http-redis
              containerPort: 6379
              protocol: TCP
          resources: {}
          terminationMessagePath: /dev/termination-log
          terminationMessagePolicy: File
          imagePullPolicy: IfNotPresent
      restartPolicy: Always
      terminationGracePeriodSeconds: 30
      dnsPolicy: ClusterFirst
      serviceAccountName: default
      serviceAccount: default
      securityContext: {}
      imagePullSecrets:
        - name: harbor
      affinity: {}
      schedulerName: default-scheduler
  serviceName: redis-headless
  podManagementPolicy: OrderedReady
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      partition: 0
  revisionHistoryLimit: 10
```



## 错误排查

### 关于容器启动退出问题

1. Docker容器后台运行,就必须有一个前台进程

2. redis.conf中的`daemonize`不要设置为`yes`



### 关于kubernetes内部加入Redis集群错误

```shell
ERR Invalid node address specified: redis-1.redis-headless.production-contract.svc.cluster.local:6379 
```

因为`redis`不支持主机名加入集群,你可以使用`dig `命令将主机名解析成IP后,以解析结果为IP的方式加入。

**如下所示**

```bash
[root@redis-0 data]# redis-cli --cluster create `dig +short redis-0.redis-headless.production-contract.svc.cluster.local`:6379 \
>  `dig +short redis-1.redis-headless.production-contract.svc.cluster.local`:6379 \
>  `dig +short redis-2.redis-headless.production-contract.svc.cluster.local`:6379 \
>  `dig +short redis-3.redis-headless.production-contract.svc.cluster.local`:6379 \
>  `dig +short redis-4.redis-headless.production-contract.svc.cluster.local`:6379 \
>  `dig +short redis-5.redis-headless.production-contract.svc.cluster.local`:6379 \
> --cluster-replicas 1
```

