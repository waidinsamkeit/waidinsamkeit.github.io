# Nacos集群部署

- [点我进入官网](https://nacos.io/zh-cn/docs/cluster-mode-quick-start.html)

- **服务发现和服务运行状况检查**

  Nacos支持基于DNS和基于RPC（Dubbo / gRPC）的服务发现。服务提供商向[本机](https://nacos.io/en-us/docs/sdk.html)，[OpenAPI](https://nacos.io/en-us/docs/open-API.html)或[专用代理](https://nacos.io/en-us/docs/other-language.html)注册服务后，使用者可以使用[DNS](https://nacos.io/en-us/docs/other-language.html)或[HTTP](https://nacos.io/en-us/docs/other-language.html)查找服务。

  Nacos提供实时运行状况检查，以防止服务将请求发送到不正常的主机或服务实例。Nacos支持传输层（PING或TCP）运行状况检查和应用程序层（例如HTTP，Redis，MySQL和用户定义的协议）运行状况检查。对于复杂云和网络拓扑（例如VPC，边缘服务等）的运行状况检查，Nacos提供代理模式和服务器模式运行状况检查。Nacos还提供统一的服务运行状况仪表板，以帮助您管理服务的可用性和流量。

- **动态配置管理**

  动态配置服务使您可以在所有环境中以集中，外部化和动态的方式管理所有应用程序和服务的配置。

  动态配置消除了在更新配置时重新部署应用程序和服务的需要。

  配置的集中管理使您更方便地实现无状态服务和按需弹性扩展服务实例。

  Nacos提供了[易于使用的UI TODO](https://nacos.io/en-us/docs/xx)，可帮助您管理所有应用程序或服务的配置。它提供了一些现成的功能，包括配置版本跟踪，canary / beta版本，配置回滚和客户端配置更新状态跟踪，以确保安全并控制配置更改的风险。

- **动态DNS服务**

  支持加权路由的动态DNS服务使您可以更轻松地在数据中心内的生产环境中实施中间层负载平衡，灵活的路由策略，流量控制和简单的DNS解析服务。动态DNS服务使您更容易实现基于DNS的服务发现。

  Nacos提供了一些简单的[DNS API TODO，](https://nacos.io/en-us/docs/xx)供您管理DNS域名和IP。

- **服务治理和元数据管理**

  Nacos允许您从微服务平台构建器的角度管理所有服务和元数据。这包括管理服务描述，生命周期，服务静态依赖关系分析，服务运行状况，服务流量管理，路由和安全规则，服务SLA和一线指标。

![nacos_map](https://nacos.io/img/nacosMap.jpg#vwid=1880&vhei=1198)

- 特征大图：从功能特征和非功能特征介绍我们要解决的问题域的特征。
- 更大的体系结构：清晰的体系结构可快速进入Nacos世界
- 业务图：当前功能和最佳实践可以支持的业务场景
- 生态大图：系统地整理Nacos与主流技术生态之间的关系
- 优势大图：展示Nacos核心竞争力
- 战略图片：Nacos从战略到战术层面的宏观优势

## 配置清单

| 192.168.20.10 | Mysql-master | nacos |
| ------------- | ------------ | ----- |
| 192.168.20.11 | mysql-slave  | nacos |
| 192.168.20.12 | mysql-slave  | nacos |

### 1.0 三台数据库配置

```shell
[root@localhost ~]# vim /etc/my.cnf
[mysqld]
log-bin=mysql-bin # 非必需
server-id=1　　　　# 必需
master的server-id为1 那么slave1的server-id就是2 然后以此类推
[root@localhost ~]# systemctl restart mysqld
```

#### 1.0.1 创建数据库同步用户

```mysql
# 此操作在master进行
[root@localhost ~]# mysql -u root -p
mysql> CREATE USER 'repl'@'192.168.20.%' IDENTIFIED BY '123.comA'; /IP段写自己的 
mysql> GRANT REPLICATION SLAVE ON *.* TO 'repl'@'192.168.20.%';
mysql> FLUSH PRIVILEGES;
mysql> show master status\G    //查看master状态
*************************** 1. row ***************************
             File: mysql-bin.000001
         Position: 875
     Binlog_Do_DB: 
 Binlog_Ignore_DB: 
Executed_Gtid_Set: 
1 row in set (0.00 sec)
```

#### 1.0.2 从库配置

```mysql
// 此操作在从服务器上执行
[root@bogon ~]# mysql -u root -p
change master to master_host='192.168.20.10', master_user='repl', master_password='123.comA', master_log_file='mysql-bin.000001', master_log_pos=875;
mysql> start slave; //开启从数据同步
mysql> show slave status\G //查看从服务器状态
*************************** 1. row ***************************
如果都是yes的话就表示成功,如果一个yes一个no就查看报错信息,主从排错我就不多说了
Slave_IO_Running: Yes   
Slave_SQL_Running: Yes 
```

####  1.0.3 检测主从同步

```mysql
# 主服务器上创建一个数据库
mysql> create database nacos;
# 从服务器上进行查询
mysql> show databases;
+--------------------+
| Database            |
+--------------------+
| information_schema  |
| mysql               |
| performance_schema  |
| sys                 |
| nacos               |
+--------------------+
5 rows in set (0.04 sec)  # 查询到有nacos库即同步成功
grant all privileges on nacos to 'root'@'%' identified by '123.comA';
```

------

### 2.0 单实例版nacos集群

- [下载地址](https://github.com/alibaba/nacos/releases/download/1.3.2/nacos-server-1.3.2.tar.gz)

- 这里使用源代码方式部署

- 集群最少3节点以上(采用端口号方式)
- nacos1.0.0没有集群功能
- JDK8+
- maven3.2+

#### 2.1 安装nacos

```shell
[root@localhost ~]# tar -zxf nacos-server-1.3.2.tar.gz
[root@localhost ~]# mv nacos /usr/local/nacos
[root@localhost ~]# mv nacos /usr/local/nacos1
[root@localhost ~]# mv nacos /usr/local/nacos2
```

#### 2.2 修改nacos端口号

```shell
# 默认不用修改nacos 直接修改nacos1和nacos2
[root@localhost bin]# vim /usr/local/nacos1/conf/application.properties
server.port=8849 # 更改为8849
[root@localhost bin]# vim /usr/local/nacos2/conf/application.properties
server.port=8850 # 更改为8850
```

#### 2.3 配置集群文件

```shell
[root@localhost nacos]# cd /usr/local/nacos/conf/
[root@localhost conf]# cp cluster.conf.example cluster.conf // 三台机器都这么执行
[root@localhost conf]# vim cluster.conf
# 采用这种不同端口号来充当nacos实例
192.168.20.10:8848
192.168.20.10:8849
192.168.20.10:8850 
```

#### 2.4 修改启动脚本

```shell
[root@bogon bin]# vim /usr/local/nacos/bin/startup.sh
JAVA_OPT="${JAVA_OPT} -server -Xms1g -Xmx1g # 修改启动内存为
```

#### 2.5 启动nacos集群

```shell
[root@localhost conf]# cd /usr/local/nacos/bin/
sh startup.sh -p embedded  //三个配置全部启动
# -p embedded # 表示采用内置数据源
[root@localhost bin]# tail -f ../logs/nacos.log 
```

```log
# 启动成功提示
2020-10-18 22:13:26,644 INFO Nacos started successfully in cluster mode. use embedded storage
```

```shell
访问：http://192.168.20.10:8848/nacos/index.html
```

### 3.0 多实例版nacos集群

```shell
# 三台全部修改cluster.conf配置文件
192.168.20.10:8848
192.168.20.21:8848
192.168.20.22:8848
```

```shell
sh startup.sh -p embedded # 启动
```

```shell
http://192.168.20.21:8848/nacos/index.html
```

#### 3.1 nacos连接mysql存储源

```shell
# 三台配置文件都修改
[root@bogon nacos]# vim conf/application.properties
spring.datasource.platform=mysql
db.num=1  # 数据库个数
db.url.0=jdbc:mysql://192.168.20.22:3306/nacos_config?characterEncoding=utf8&connectTimeout=1000&socketTimeout=3000&autoReconnect=true&useUnicode=true&useSSL=false&serverTimezone=UTC # 此处填写mysql的ip
db.user=root  # 用户
db.password=xxx  # 此为mysql的密码
```

#### 3.2 导入mysql数据

```mysql
mysql> CREATE DATABASE nacos_config; # 先进入mysql创建一个库
[root@bogon conf]# mysql -u root -p nacos_config < nacos-mysql.sql  //把nacos的表结构导入进去
[root@bogon bin]# ./startup.sh 启动nacos
```

#### 3.3 测试nacos持久化

然后访问nacos新建一个测试的数据

```shell
然后停止掉nacos
[root@bogon bin]# ./shutdown.sh
```

> 进入mysql查询数据

```mysql
mysql> use nacos_config
mysql> select * from config_info\G
*************************** 1. row ***************************
          id: 1
     data_id: 1
    group_id: DEFAULT_GROUP
     content: test
         md5: 098f6bcd4621d373cade4e832627b4f6
  gmt_create: 2020-10-19 07:54:39
gmt_modified: 2020-10-19 07:54:39
    src_user: NULL
      src_ip: 192.168.20.1
    app_name: 
   tenant_id: 
      c_desc: NULL
       c_use: NULL
      effect: NULL
        type: text
    c_schema: NULL
1 row in set (0.00 sec)
```

