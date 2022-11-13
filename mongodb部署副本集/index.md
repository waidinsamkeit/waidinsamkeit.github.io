# Mongo部署副本集

## 部署副本集

#### 1.0 更改Mongo配置文件

```shell
[root@localhost mongo]# vim conf/mongo.conf
port=27017
fork=true
logpath=/usr/local/mongo/logs/mongodb.log
logappend=true
dbpath=/usr/local/mongo/data
replSet=rs0 # 加入副本集名称,此名称要一致
```

 **启动Mongo**

```shell
[root@localhost mongo]# mongod -f conf/mongo.conf 
```

#### 1.1 主Mongo配置

```mssql
[root@localhost mongo]# mongo
> conf=
    {
    "_id" : "rs0",
    "members" : [
        { "_id" : 0, "host" : "172.17.100.193:27017" },
        { "_id" : 1, "host" : "172.17.100.191:27017" }
        ]
    }
# 填写mongo的ip地址即可
> rs.initiate(conf) # 初始化副本集
{ "ok" : 1 } # 如果出现ok1则表示成功
```

#### 1.2 副本集更新

```shell
# 向副本集中添加成员
rs.add("172.17.100.191:27017")
 
# 从副本集中删除成员
rs.remove("172.17.100.191:27017")
 
# 向副本集中添加仲裁
rs.addArb("172.17.100.191:27017")
 
# 向副本集中添加备份节点
rs.add({"_id":3,"host":"172.17.100.191:27017","priority":0,"hidden":true})  // _id请依次递增
```

#### 1.4 更新副本集优先级

```shell
cfg = rs.conf()
cfg.members[0].priority = 5  #  设置权重为5
# members[0]里面填写你要更改的节点数字 id是1就写1 是2就设置2
rs.reconfig(cfg) # 重新加载配置
```

####  1.5 查看副本集状态

```shell
rs0:PRIMARY> rs.status()

```

#### 1.6 查看副本集的配置信息

```shell
rs0:PRIMARY> rs.conf()
```

####  1.7 查看节点复制信息

```shell
rs0:PRIMARY> db.printSlaveReplicationInfo()
```

#### 1.8 插入测试数据

```shell
rs0:PRIMARY> for(var i=0;i<10000;i++){db.customer.insert({"name":"user"+i})}
WriteResult({ "nInserted" : 1 })
rs0:PRIMARY> db.customer.count()
10000
#  在Secondary上查看客户数据是否已经同步：
rs0:SECONDARY> rs.slaveOk()
rs0:SECONDARY> db.customer.count()
10000
```

## 开启安全验证

>  先停止从上面的mongo然后在停止主上面的mongo

- 在master上进行操作

#### 2.0 创建用户

```shell
rs0:PRIMARY> use admin
rs0:PRIMARY> db.createUser({user: 'root', pwd: '123.com', roles: ['root']}) 
#  创建root用户并且给予root权限,密码为123.com
```

```shell
# 例如对某个库授权
rs0:PRIMARY> use test
rs0:PRIMARY> db.createUser({user:"admin",pwd:"admin",roles:[{role:"readWrite",db:"test"}]})
# role角色具体可以看官网的分配权限
# db: 指定授权的库
```

#### 2.1 创建秘钥文件

```shell
[root@localhost mongo]# openssl rand -base64 666 > /usr/local/mongo/keyfile
```

将生成的keyFile文件拷贝到其他节点服务器上，并修改文件的操作权限为 600

```shell
# 更新启动配置文件,master上配置
[root@localhost mongo]# vim conf/mongo.conf 
auth=true
oplogSize=100
keyFile=/usr/local/mongo/keyfile
```

```shell
# 更新启动配置文件,slave上配置
[root@localhost mongo]# vim conf/mongo.conf 
oplogSize=100
keyFile=/usr/local/mongo/keyfile
```

#### 2.2 启动副本集

```shell
[root@localhost mongo]# mongod -f /usr/local/mongo/conf/mongo.conf
# 先开master
[root@localhost mongo]# mongod -f /usr/local/mongo/conf/mongo.conf 
# 然后再从上开启服务,不加auth认证
```

