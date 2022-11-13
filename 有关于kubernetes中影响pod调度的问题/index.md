# 有关于Kubernetes中影响Pod调度的问题

> 此问题引出的是生产环境中所有的资源完全充足,但是会出现更新Pod、删除Pod、新建Pod无法调度的情况。
## 生产环境解决问题办法
找到问题跟原所在,默认的`maxPods: 110`,K8S默认一个节点上的pod调度数是110，当前有限制pod数的需求。
`vim /var/lib/kubelet/config.yaml`
```shell
maxPods: 110 # 修改为maxPods: 330
```
## 影响Pod调度的情况
### requests资源限制
- `requests`：是一种硬限制,Kubernetes在进行Pod请求调度的时候,节点的可用资源必须满足`500m`的CPU才能进行调度,且使用最大限制为`1`个CPU,如果该Pod超过请求的最大限制,则Kubernetes将会把该Pod进行Kill重启。
```yaml
resources:
  limits:
    cpu: '1'
  requests:
    cpu: 500m
```
当你设置request为`500m`以及limit为`1000m`的时候,当你使用 `kubectl
describe node`查看节点资源的时候可能会与你设置的请求量不符合,这是以你Pod
的实际使用量为标准的。

### 节点标签的Label
- 标签选择器：  `kubectl label node kubernetes-node1 env_role=dev` 通过此命令对相应的节点加入标签 `kubectl label node 节点名称  标签名称`
```yaml
spec:
 nodeSelector: 
  env_role: dev
```
当然,你也可以通过`kubectl get node --show-labels`命令查看当前节点的标签
```shell
NAME      STATUS                     ROLES    AGE    VERSION   LABELS
master1   Ready,SchedulingDisabled   master   141d   v1.17.9   beta.kubernetes.io/arch=amd64,beta.kubernetes.io/os=linux,kubernetes.io/arch=amd64,kubernetes.io/hostname=master1,kubernetes.io/os=linux,node-role.kubernetes.io/master=
master2   Ready,SchedulingDisabled   master   139d   v1.17.9   beta.kubernetes.io/arch=amd64,beta.kubernetes.io/os=linux,kubernetes.io/arch=amd64,kubernetes.io/hostname=master2,kubernetes.io/os=linux,node-role.kubernetes.io/master=
master3   Ready,SchedulingDisabled   master   139d   v1.17.9   beta.kubernetes.io/arch=amd64,beta.kubernetes.io/os=linux,kubernetes.io/arch=amd64,kubernetes.io/hostname=master3,kubernetes.io/os=linux,node-role.kubernetes.io/master=
node1     Ready                      worker   141d   v1.17.9   beta.kubernetes.io/arch=amd64,beta.kubernetes.io/os=linux,kubernetes.io/arch=amd64,kubernetes.io/hostname=node1,kubernetes.io/os=linux,node-role.kubernetes.io/worker=
node2     Ready                      worker   141d   v1.17.9   beta.kubernetes.io/arch=amd64,beta.kubernetes.io/os=linux,kubernetes.io/arch=amd64,kubernetes.io/hostname=node2,kubernetes.io/os=linux,node-role.kubernetes.io/worker=
node3     Ready                      worker   141d   v1.17.9   beta.kubernetes.io/arch=amd64,beta.kubernetes.io/os=linux,kubernetes.io/arch=amd64,kubernetes.io/hostname=node3,kubernetes.io/os=linux,node-role.kubernetes.io/worker=
```
### 节点亲和性
- 节点亲和性：`nodeAffinity`和之前`nodeSelector`基本上是一样的,有的话满足进行调度,如果没有的话则依旧也可以调度。
- 硬亲和性：`requiredDuringSchedulingIgnoreDuringExecution`,当前约束的条件表示为在`env_role`这个键中有`dev`/`test` 有的话即满足的调度,如果不满足则不调度。
- 软亲和性: `preferredDuringSchedulingIgnoredDuringExecution`,进行尝试是否满足测试,如果满足则满足调度,如果不满足则依旧会进行调度。
- 支持的操作符：`In`/`Not In`/`Gt`/`Lt`/`DoesNotExists`分别为 存在、不存在、大于、小于、不存在。
```yaml
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoreDuringExecution:
        nodeSelectorTerms:
        - metchExpressions:
            - key: env_role
            operator: In
            values:
            - dev
            - test
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 1  # 表示权重 比例
        preference:
          matchExpressions:
          - key: group
          operator: In # 操作符 In 
          values:
          - otherprod
```

### 污点和污点容忍
- 污点：`nodeSelector`和`nodeAffinity`Pod调度在某些节点上,是属于Pod的属性,在调度的时候进行实现,而污点是对节点做不分配调度,是节点属性。
- 污点容忍：当一个污点不允许被调度的时候,同时又想让他可能会参与调度,类似于软亲和性。
- 场景：作为专用节点、配置特定硬件节点、基于Taint驱逐
- NoSchedule：一定不被调度
- PreferNoSchdule: 尽量不被调度
- NoExecute: 不调度,并且会驱逐在该节点上Pod
```yaml
# 污点容忍
spec:
  tolerations:
  - key: "env_role"
    operator: "Equal"
    value: "yes"
    effect: "NoSchedule"

```
> 使用`kubectl describe node kubernetes-master1 | grep Taints`进行查看是否为污点。   
> 使用`kubectl taint node 节点名称 key=value:污点值`
