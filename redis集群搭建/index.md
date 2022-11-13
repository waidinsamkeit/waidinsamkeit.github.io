# Redis集群搭建

## Redis Cluster（Redis集群）简介

- redis是一个开源的key value存储系统，受到了广大互联网公司的青睐。redis3.0版本之前只支持单例模式，在3.0版本及以后才支持集群，我这里用的是redis3.0.0版本；
- redis集群采用P2P模式，是完全去中心化的，不存在中心节点或者代理节点；
- redis集群是没有统一的入口的，客户端（client）连接集群的时候连接集群中的任意节点（node）即可，集群内部的节点是相互通信的（PING-PONG机制），每个节点都是一个redis实例；
- 为了实现集群的高可用，即判断节点是否健康（能否正常使用），redis-cluster有这么一个投票容错机制：如果集群中超过半数的节点投票认为某个节点挂了，那么这个节点就挂了（fail）。这是判断节点是否挂了的方法；
- 那么如何判断集群是否挂了呢? -> 如果集群中任意一个节点挂了，而且该节点没有从节点（备份节点），那么这个集群就挂了。这是判断集群是否挂了的方法；
- 那么为什么任意一个节点挂了（没有从节点）这个集群就挂了呢？ -> 因为集群内置了16384个slot（哈希槽），并且把所有的物理节点映射到了这16384[0-16383]个slot上，或者说把这些slot均等的分配给了各个节点。当需要在Redis集群存放一个数据（key-value）时，redis会先对这个key进行crc16算法，然后得到一个结果。再把这个结果对16384进行求余，这个余数会对应[0-16383]其中一个槽，进而决定key-value存储到哪个节点中。所以一旦某个节点挂了，该节点对应的slot就无法使用，那么就会导致集群无法正常工作。
- 综上所述，每个Redis集群理论上最多可以有16384个节点。


Redis集群至少需要3个节点，因为投票容错机制要求超过半数节点认为某个节点挂了该节点才是挂了，所以2个节点无法构成集群。
要保证集群的高可用，需要每个节点都有从节点，也就是备份节点，所以Redis集群至少需要6台服务器。因为我没有那么多服务器，也启动不了那么多虚拟机，所在这里搭建的是伪分布式集群，即一台服务器虚拟运行6个redis实例，修改端口号为（7001-7006）`1+1+1+1+1+1 = 6`


## 搭建集群

- Redis版本`6.0.8`
- Gcc7x.x.x

### 1.0 **创建目录**

```bash
mkdir /usr/local/redis-cluster
cd /usr/local/redis-cluster
wget http://download.redis.io/releases/redis-6.0.8.tar.gz
mkdir {7001..7006}
```

### 1.1 复制配置文件

```bash
tar -zxf redis-6.0.8.tar.gz
cd redis-6.0.8/ && make install 
cp -a redis-6.0.8/redis.conf 7001/ # 以此类推
cp -a redis-6.0.8/redis.conf 7002/
```

- 如果你不想编译安装的话,你可以把redis中的/bin目录的命令移动到每个node节点文件夹中，这样以方便你使用`redis-server`命令

### 1.2 编辑配置文件

> 此文件内容为集群模式最小配置文件内容.

```bash
vim 7001/redis.conf # 以此类推,记得更改端口号和日志文件
bind 127.0.0.1 # IP可更换为内网IP
port 7001
cluster-enabled yes
cluster-config-file nodes7001.conf
cluster-node-timeout 5000
appendonly yes
daemonize yes
logfile /usr/local/redis-cluster/7001/redis-7001.log
maxmemory 4GB
requirepass *******
dir /usr/local/redis-cluster/7001
masterauth ****
```

- `port 7001` Redis运行端口
- `cluster-enabled yes`启用集群模式
- `cluster-config-file nodes.conf`集群模式配置文件
- `cluster-node-timeout 5000`节点的超时时限
- `appendonly yes`开启AOF持久化
- `daemonize yes`开启后台运行
- `maxmemory 4GB`Redis最大可用内存
- `requirepass`连接Redis客户端密码
- `masterauth` Slave连接master需要的认证

### 1.3 启动集群

> 自己建一个启动脚本,要不然手动启动太麻烦了

```bash
#!/bin/bash
redis-server /usr/local/redis-cluster/7001/redis.conf
redis-server /usr/local/redis-cluster/7002/redis.conf
redis-server /usr/local/redis-cluster/7003/redis.conf
redis-server /usr/local/redis-cluster/7004/redis.conf
redis-server /usr/local/redis-cluster/7005/redis.conf
redis-server /usr/local/redis-cluster/7006/redis.conf
```

```bash
chmod +x start.sh
sh start.sh
```

```bash
[root@bogon redis-cluster]# ps -aux | grep redis
root       65558  0.0  0.0  64864  6256 ?        Ssl  09:54   0:00 redis-server *:7001 [cluster]
root       65564  0.0  0.0  61792  4760 ?        Ssl  09:54   0:00 redis-server *:7002 [cluster]
root       65566  0.0  0.0  61792  4736 ?        Ssl  09:54   0:00 redis-server *:7003 [cluster]
root       65572  0.0  0.0  61792  4712 ?        Ssl  09:54   0:00 redis-server *:7004 [cluster]
root       65578  0.0  0.0  61792  4704 ?        Ssl  09:54   0:00 redis-server *:7005 [cluster]
root       65580  0.0  0.0  61792  4780 ?        Ssl  09:54   0:00 redis-server *:7006 [cluster]
```

### 1.4 加入集群

现在我们有许多实例正在运行，我们需要通过向节点写入一些有意义的配置来创建集群。

如果您使用的是`Redis 5`或更高版本，这很容易完成，因为嵌入到中的Redis Cluster命令行实用程序为我们提供了帮助，该实用程序`redis-cli`可用于创建新集群，检查或重新分片现有集群等。

对于Redis版本3或4，有一个称为的旧工具`redis-trib.rb`，它非常相似。您可以`src`在Redis源代码分发的目录中找到它。您需要安装`redis`gem才能运行`redis-trib`。

> 如果你是用的是Redis3.x或者4.x 请前往官网链接  [点我进入](https://redis.io/topics/cluster-tutorial)

- 此方法为`Redis5`或者更高版本

```bash
redis-cli --cluster create 127.0.0.1:7001 127.0.0.1:7002 \
127.0.0.1:7003 127.0.0.1:7004 127.0.0.1:7005 127.0.0.1:7006 \
--cluster-replicas 1
Can I set the above configuration? (type 'yes' to accept): yes
```

- `--cluster-replicas 1`给Master只分配一个slave

### 1.5 连接集群

```bash
redis-cli -c -p 7001 -a *** 
127.0.0.1:7001> info 
# Replication
role:master
connected_slaves:1
127.0.0.1:7001> set Host Linux7
-> Redirected to slot [16156] located at 127.0.0.1:7003
OK
```

- `-a`是你设置的requirepass密码

注意：出现connected_slaves:1 表示连接到了一个从服务器 如果为0 请查看服务器错误日志

### 1.6 故障切换

连接到7003的从服务器7005 查看数据是否同步

```bash
redis-cli -c -p 7005 -a ***
master_host:127.0.0.1
master_port:7003
127.0.0.1:7005> get Host
"Linux7"
```

宕机7003服务器

```bash
[root@bogon redis-cluster]# ps -aux | grep 7003
root       70467  0.2  0.0  64352  5120 ?        Ssl  11:20   0:01 redis-server *:7003 [cluster]
root       70871  0.0  0.0  12112  1052 pts/0    S+   11:29   0:00 grep --color=auto 7003
[root@bogon redis-cluster]# kill -15 70467
```

通过`info`发现7005已经成为主服务器

```bash
127.0.0.1:7005> info
# Replication
role:master
connected_slaves:0
```

再次启动7003发现已经更改为从服务器，并且已经被7005连接到

```shell
127.0.0.1:7005> 
# Replication
role:master
connected_slaves:1
```



## 总结

首先 先说结论：redis集群无法保证强一致性

既然无法保证强一致性，也就是说有可能出现写数据丢失的情况，比如一个客户端发一个写请求给master，master再同步到slave之前就给client一个回执。这个时候会存在一个时间窗口，master 和 slave之间的数据是不一致的。但是redis的最终一致性会使master和slave的数据是最终一致。

另外还有一个可能，在客户端收到了master的一个写请求回执之后，此时master准备把数据同步到slave，同步之前突然挂了，那么这个数据真的就是会丢失了。

如果为了保证强一致，比如我们每秒刷盘进行持久化，那么牺牲了这个吞吐量，就特别类似我们常说的同步复制了。但是redis集群是没有实现强一致的。

1、redis保证最终一致性

2、用最终一致性换取了高吞吐量

3、主节点挂了的时候，如果数据没有同步到备节点，是会出现数据丢失的情况

4、发生网络分区的时候也可能会丢数据，这个时候有个node timeout时间概念


