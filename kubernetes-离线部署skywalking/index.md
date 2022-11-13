# Kubernetes-离线部署skywalking

> 注意：请各位记住把所有离线包全拿到本地.....

###  在线部署chartmuseum

直接使用最简单的 docker run 方式，使用local 本地存储方式，通过 -v 映射到宿主机 /opt/charts
更多支持安装方式见官网

```bash
mkdir /opt/charts
docker run -d \
  -p 8080:8080 \
  -e DEBUG=1 \
  -e STORAGE=local \
  -e STORAGE_LOCAL_ROOTDIR=/charts \
  -v /opt/charts:/charts \
  chartmuseum/chartmuseum:latest
```

### 下载Skywalking包

```bash
git clone https://github.com/apache/skywalking-kubernetes.git
# 更换仓库
cd skywalking-kubernetes-master/chart/skywalking/
vim Chats.yaml
dependencies:
  - name: elasticsearch
    version: ~7.12.1  # 官网的版本号为7.5.1 最新的elastic版本为7.12.1
    repository: http://localhost:8080 # 修改为你本地的Repo地址
    condition: elasticsearch.enabled
```

### 添加elasticsearch仓库

```bash
helm repo add elastic https://helm.elastic.co
helm pull elastic/elasticsearch  # 把elasticsearch内容拉下来
```

###  上传本地Helm

> 以防万一请先安装helmpush插件
>
> https://github.com/chartmuseum/helm-push

```bash
helm repo add chartmuseum http://localhost:8080
curl --data-binary "@elasticsearch-7.12.1.tgz" http://localhost:8080/api/charts
helm push /root/skywalking-kubernetes-master/chart/skywalking/ chartmuseum
helm repo update # 更新仓库
```

**你可以尝试搜索一下**
> 保证仓库中存在elasticsarch和skywalking 

```bash
[root@k-master1 ~]# helm search repo
NAME                            CHART VERSION   APP VERSION     DESCRIPTION                                       
chartmuseum/elasticsearch       7.12.1          7.12.1          Official Elastic helm chart for Elasticsearch     
chartmuseum/skywalking          4.0.0                           Apache SkyWalking APM System
```

###  部署skywalking

```bash
cd skywalking-kubernetes/chart
helm dep up skywalking
# change the release name according to your scenario
export SKYWALKING_RELEASE_NAME=skywalking
# change the namespace according to your scenario
export SKYWALKING_RELEASE_NAMESPACE=default
helm install "${SKYWALKING_RELEASE_NAME}" skywalking -n "${SKYWALKING_RELEASE_NAMESPACE}" \
  --set oap.image.tag=8.1.0-es7 \
  --set oap.storageType=elasticsearch7 \
  --set ui.image.tag=8.1.0 \
  --set elasticsearch.imageTag=7.5.1
helm uninstall skywalking # 卸载skywalking
```

###  准备离线镜像

```shell
busybox:1.30
docker.elastic.co/elasticsearch/elasticsearch:7.5.1
apache/skywalking-oap-server:8.1.0-es7
apache/skywalking-ui:8.1.0
chartmuseum/chartmuseum:latest
# 然后打包 上传....就OK
```



### Helm中的Elasticsearch可能会存在问题

> 你们也可以用我的这个elasticsearch配置 注意修改PVC

```yaml
kind: StatefulSet
apiVersion: apps/v1
metadata:
  name: elasticsearch-master
  namespace: default
  labels:
    app: elasticsearch-master
    app.kubernetes.io/managed-by: Helm
    chart: elasticsearch
    heritage: Helm
    release: skywalking
  annotations:
    esMajorVersion: '7'
    meta.helm.sh/release-name: skywalking
    meta.helm.sh/release-namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: elasticsearch-master
  template:
    metadata:
      name: elasticsearch-master
      creationTimestamp: null
      labels:
        app: elasticsearch-master
        chart: elasticsearch
        heritage: Helm
        release: skywalking
    spec:
      initContainers:
        - name: configure-sysctl
          image: 'docker.elastic.co/elasticsearch/elasticsearch:7.5.1'
          command:
            - sysctl
            - '-w'
            - vm.max_map_count=262144
          resources: {}
          terminationMessagePath: /dev/termination-log
          terminationMessagePolicy: File
          imagePullPolicy: IfNotPresent
          securityContext:
            privileged: true
            runAsUser: 0
      containers:
        - name: elasticsearch
          image: 'docker.elastic.co/elasticsearch/elasticsearch:7.5.1'
          ports:
            - name: http
              containerPort: 9200
              protocol: TCP
            - name: transport
              containerPort: 9300
              protocol: TCP
          volumeMounts:
            - name: datadir
              mountPath: /usr/share/elasticsearch/data
          env:
            - name: node.name
              valueFrom:
                fieldRef:
                  apiVersion: v1
                  fieldPath: metadata.name
            - name: cluster.initial_master_nodes
              value: >-
                elasticsearch-master-0,elasticsearch-master-1,elasticsearch-master-2,
            - name: discovery.seed_hosts
              value: elasticsearch-master-headless
            - name: cluster.name
              value: elasticsearch
            - name: network.host
              value: 0.0.0.0
            - name: ES_JAVA_OPTS
              value: '-Xmx1g -Xms1g'
            - name: node.data
              value: 'true'
            - name: node.ingest
              value: 'true'
            - name: node.master
              value: 'true'
          resources:
            limits:
              cpu: '1'
              memory: 2Gi
            requests:
              cpu: 100m
              memory: 2Gi
          readinessProbe:
            exec:
              command:
                - sh
                - '-c'
                - >
                  #!/usr/bin/env bash -e

                  # If the node is starting up wait for the cluster to be ready
                  (request params: 'wait_for_status=green&timeout=1s' )

                  # Once it has started only check that the node itself is
                  responding

                  START_FILE=/tmp/.es_start_file


                  http () {
                      local path="${1}"
                      if [ -n "${ELASTIC_USERNAME}" ] && [ -n "${ELASTIC_PASSWORD}" ]; then
                        BASIC_AUTH="-u ${ELASTIC_USERNAME}:${ELASTIC_PASSWORD}"
                      else
                        BASIC_AUTH=''
                      fi
                      curl -XGET -s -k --fail ${BASIC_AUTH} http://127.0.0.1:9200${path}
                  }


                  if [ -f "${START_FILE}" ]; then
                      echo 'Elasticsearch is already running, lets check the node is healthy and there are master nodes available'
                      http "/_cluster/health?timeout=0s"
                  else
                      echo 'Waiting for elasticsearch cluster to become cluster to be ready (request params: "wait_for_status=green&timeout=1s" )'
                      if http "/_cluster/health?wait_for_status=green&timeout=1s" ; then
                          touch ${START_FILE}
                          exit 0
                      else
                          echo 'Cluster is not yet ready (request params: "wait_for_status=green&timeout=1s" )'
                          exit 1
                      fi
                  fi
            initialDelaySeconds: 10
            timeoutSeconds: 5
            periodSeconds: 10
            successThreshold: 3
            failureThreshold: 3
          terminationMessagePath: /dev/termination-log
          terminationMessagePolicy: File
          imagePullPolicy: IfNotPresent
          securityContext:
            capabilities:
              drop:
                - ALL
            runAsUser: 1000
            runAsNonRoot: true
      restartPolicy: Always
      terminationGracePeriodSeconds: 120
      dnsPolicy: ClusterFirst
      securityContext:
        runAsUser: 1000
        fsGroup: 1000
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchExpressions:
                  - key: app
                    operator: In
                    values:
                      - elasticsearch-master
              topologyKey: kubernetes.io/hostname
      schedulerName: default-scheduler
  volumeClaimTemplates:
    - metadata:
        name: datadir
        annotations:
          volume.beta.kubernetes.io/storage-class: "managed-nfs-storage-class"
      spec:
        accessModes: ["ReadWriteMany"]
        resources:
          requests:
            storage: 10Gi
  serviceName: elasticsearch-master-headless
  podManagementPolicy: Parallel
  updateStrategy:
    type: RollingUpdate
  revisionHistoryLimit: 10
```

