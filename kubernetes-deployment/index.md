# Kubernetes-Deployment

## Deployment应用场景

- 部署无状态应用`Web`或者`微服务`
- 管理Pod和ReplicaSet
- 部署、滚动升级

## Pod资源限制

```yaml
resource: # 调度时候资源配置大小
  requests:
  memory: "64Mi"
  cpu: "250m"
limits: # Pod的最大值
  memory: "64Mi"
  cpu: "250m"
```

## 健康检查

```yaml
livenessProbe:
  exec:
    command:
    - cat
    - /tmp/healthy
  initalDelaySeconds: 5
  periodSeconds: 5
```

- `livenessProbe`: 存活检查
- `readinessProbe`:就绪检查

> 检测方式如下

1. HTTPGET：通过发送HTTP请求进行检测,范围200-400为正确
2. EXEC：通过进入容器执行命令进行检测
3. TCPSocker：通过建立Socker连接来进行检测

## 生成Yaml文件

```bash
kubectl create deployment web --image=nginx:1.7.9 -o yaml > web.yaml
```

## 对外暴露端口

```bash
kubectl expose deployment nginx --port=80 --type=NodePort --target-port=80
```

## 应用升级(更新镜像)

```bash
kubectl set image deployment nginx nginx=nginx:1.8.1
kubectl rollout status deployment nginx # 查看升级状态
kubectl rollout history deployment nginx # 查看升级版本历史
kubectl rollout undo deployment nginx # 回滚到上一个版本
kubectl rollout undo deployment nginx --to-revision=3 # 指定版本回滚
```

## 动态扩容(属于弹性伸缩一部分)

```bash
kubectl scale deployment nginx --replicas=4 # 扩容副本数量为4
```
## Pod的重启策略
Pod的重启策略（RestartPolicy）应用与Pod内所有容器，并且仅在Pod所处的Node上由kubelet进行判断和重启操作。当某个容器异常退出或者健康检查失败时，kubelet将根据RestartPolicy的设置来进行相应的操作。

Pod的重启策略包括：Always、OnFailure和Never，默认值为Always。
`Always`：当容器失效时，由kubelet自动重启该容器。
`OnFailure`：当容器终止运行且退出码不为0时，由kubelet自动重启该容器。
`Never`：不论容器运行状态如何，kubelet都不会重启该容器。

