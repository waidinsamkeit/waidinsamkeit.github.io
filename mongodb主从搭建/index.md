# Mongodb主从搭建

### Mongodb主从搭建
- 内存2以上
- 无特殊要求
- 主IP：192.168.1.100
- 从IP：192.168.1.101
- 准备配置如下，每台服务器都执行

```shell
sudo echo "never" > /sys/kernel/mm/transparent_hugepage/enabled
sudo echo "never" >  /sys/kernel/mm/transparent_hugepage/defrag
vim /etc/security/limits.conf
# 添加mongo用户可以打开的文件数量的限制
mongod  soft  nofile  64000
mongod  hard  nofile  64000
mongod  soft  nproc  32000
mongod  hard  nproc  32000
```



#### 1.0 下载安装Mongo

```shell
[root@bogon ~]# curl -O http://fastdl.mongodb.org/linux/mongodb-linux-x86_64-3.4.2.tar.gz
```

```shell
[root@bogon ~]# tar -zxf mongodb-linux-x86_64-3.4.2.tgz # 解压 
[root@bogon ~]# mv mongodb-linux-x86_64-3.4.2 /usr/local/mongo # 移动目录到/usr/local/mongo
```

####  1.2 主mongo配置

```shell
[root@bogon mongo]# mkdir /usr/local/mongo/{conf,data,logs}
[root@bogon mongo]# vim /usr/local/mongo/conf/mongo.conf
port=27017
fork=true
logpath=/usr/local/mongo/logs/mongodb.log
logappend=true
dbpath=/usr/local/mongo/data
maxConns=1024
master=true
oplogSize=2048
```

```json
port=27017       #端口号
fork=true        #以守护进程方式运行
logpath=/usr/local/mongodb/logs/mongodb.log  #日志文件
logappend=true   #日志输出方式
dbpath=/usr/local/mongodb/data  #数据库位置
maxConns=1024    #数据库最大连接数
master=true      #主模式
oplogSize=2048   #日志滚动，单位M
```

#### 1.3 从Mongo配置

```shell
[root@bogon mongo]# mkdir /usr/local/mongo/{conf,data,logs}
[root@bogon mongo]# vim /usr/local/mongo/conf/mongo.conf
port=27017
fork=true
logpath=/usr/local/mongo/logs/mongodb.log
logappend=true
dbpath=/usr/local/mongo/data
maxConns=1024
slave=true
source=192.168.1.100:27017
autoresync=true
```

```json
port=27017
fork=true
logpath=/usr/local/mongo/logs/mongodb.log
logappend=true
dbpath=/usr/local/mongo/data
maxConns=1024
slave=true                  # 从模式
source=192.168.1.100:27017  # 指定主Mongodb
autoresync=true             # 自动同步
```

```shell
[root@localhost ~]# ln -s /usr/local/mongo/bin/* /usr/bin/
```

```shell
[root@bogon mongo]# mongod -f /usr/local/mongo/conf/mongo.conf 
# -f 指定配置文件
[root@bogon mongo]# mongod -f /usr/local/mongo/conf/mongo.conf --shutdown //关闭mongo
```

#### 测试mongo主从同步

```shell
#  创建一个user库，然后创建集合，插入字段测试是否同步
[root@bogon mongo]# mongo 
> use test
> db.test.save({AGE:18})
> db.test.find()
{ "_id" :ObjectId("52addd66124c02eb8b2d1a5a"), "AGE" : 18 } //此为查出的数据
> show dbs
admin  0.000GB
local  0.000GB
test   0.000GB

#  从库查询数据
[root@bogon mongo]# mongo 
> use test
> db.test.find()
{ "_id" :ObjectId("52addd66124c02eb8b2d1a5a"), "AGE" : 18 } //此为查出的数据
```

### 问题解决

- `WARNING: Access control is not enabled for the database`

> 原因分析：新版本的MongDB增加了安全性设计，推荐用户创建使用数据库时进行验证。如果用户想建立简单连接，则会提示警示信息。

解决方法

```shell
[root@bogon logs]# mongo # 进入mongo数据库
use admin //进入admin
db.createUser({user: 'root', pwd: '123456qwerty!@#$%^', roles: ['root']}) # 创建用户密码和权限
db.auth('root', '123456qwerty!@#$%^') # 返回1 认证成功，返回0认证失败
# 因为mongo的密码是针对库设置的，不是像mysql一样针对全局设置的
```

- "errmsg" : "not master and slaveOk=false"

> 如果从服务器上进入mongo以后使用show dbs查看是否同步数据库报这个错误是正常的
>
> 因为SECONDARY是禁止读的

解决方法

```shell
# 从库执行
rs.slaveOk()
use test
db.agre.find()
{ "_id" : ObjectId("5f87ff66ab2013c2fb746333"), "AGE" : 18 } //从库能查寻到数据即可
```



### 关于Mongo认证机制

- `--auth`:表示带着认证方式进行启动

```shell
mongod -f /usr/local/mongo/conf/mongo.conf --auth
```

进入到mongo使用`show dbs`发现报错

```shell
not authorized on admin to execute command { listDatabases: 1.0 }
```

此时应该先到admin库中进行验证

```shell
> use admin
> db.auth('root', '123456qwerty!@#$%^')  # 返回结果为1则认证成功
> show dbs # 此时查看数据就可以了
```


