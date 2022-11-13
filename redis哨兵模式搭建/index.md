# Redis哨兵模式搭建

## 哨兵模式简介

**主从切换技术的方法是：当主服务器宕机后，需要手动把一台从服务器切换为主服务器，这就需要人工干预，费事费力，还会造成一段时间内服务不可用。**这不是一种推荐的方式，更多时候，我们优先考虑**哨兵模式**。

哨兵模式是一种特殊的模式，首先Redis提供了哨兵的命令，哨兵是一个独立的进程，作为进程，它会独立运行。其原理是**哨兵通过发送命令，等待Redis服务器响应，从而监控运行的多个Redis实例。**


![](https://cdn.jsdelivr.net/gh/waidinsamkeit/picture@latest/2021/01/04/cda824de54f19560faaf9b251690a2cf.png)


这里的`哨兵`有两个作用

- 通过发送命令，让Redis服务器返回监控其运行状态，包括主服务器和从服务器。
- 当哨兵监测到master宕机，会自动将slave切换成master，然后通过**发布订阅模式**通知其他的从服务器，修改配置文件，让它们切换主机。

然而一个哨兵进程对Redis服务器进行监控，可能会出现问题，为此，我们可以使用多个哨兵进行监控。各个哨兵之间还会进行监控，这样就形成了多哨兵模式。

用文字描述一下**故障切换（failover）**的过程。假设主服务器宕机，哨兵1先检测到这个结果，系统并不会马上进行failover过程，仅仅是哨兵1主观的认为主服务器不可用，这个现象成为**主观下线**。当后面的哨兵也检测到主服务器不可用，并且数量达到一定值时，那么哨兵之间就会进行一次投票，投票的结果由一个哨兵发起，进行failover操作。切换成功后，就会通过发布订阅模式，让各个哨兵把自己监控的从服务器实现切换主机，这个过程称为**客观下线**。这样对于客户端而言，一切都是透明的。

## 搭建Redis哨兵

配置3个哨兵和1主2从的Redis服务器

| 服务类型 | 是否是主服务器 | IP地址       | 端口  |
| -------- | -------------- | ------------ | ----- |
| Redis    | 是             | 172.16.87.10 | 6379  |
| Redis    | 否             | 172.16.87.11 | 6379  |
| Redis    | 否             | 172.16.87.12 | 6379  |
| Sentinel | -              | 172.16.87.10 | 26379 |
| Sentinel | -              | 172.16.87.11 | 26379 |
| Sentinel | -              | 172.16.87.12 | 26379 |

## 部署Redis(三台全搞)

> Redis6.x版本以上需要GCC4.9X

```bash
wget http://download.redis.io/releases/redis-6.0.8.tar.gz
yum -y install centos-release-scl  scl-utils-build
yum -y install devtoolset-7-gcc* gcc
scl enable devtoolset-7 bash
echo "511" > /proc/sys/net/core/somaxconn
echo "vm.overcommit_memory = 1" >> /etc/sysctl.conf && sysctl -p
mv redis-6.0.8 /usr/local/ && cd /usr/local/redis-6.0.8/ && make install
mkdir /usr/local/redis-6.0.8/logs
```

更改Redis 主配置文件`172.16.87.10`
- 修复master认证密码


```bash
[root@localhost redis]# vim /usr/local/redis/redis.conf
bind 172.16.87.10  # 改为本机IP
port 6379   # 默认6379
daemonize yes  # 改为yes允许后台运行
pidfile /var/run/redis_6379.pid # pid文件位置
maxmemory 750mb # 设置最大内存 一般为3/4,生产建议
dbfilename redis-master.rdb # 改一下rdb文件名称
logfile "/usr/local/redis/logs/redis-master.log"
requirepass 123.com
masterauth 123.com
```

更改Redis从配置文件172.16.87.11`

```bash
[root@localhost redis]# vim /usr/local/redis/redis.conf
bind 172.16.87.11  # 改为本机IP
port 6379   # 默认6379
daemonize yes  # 改为yes允许后台运行
pidfile /var/run/redis_6379.pid # pid文件位置
maxmemory 750mb # 设置最大内存 一般为3/4,生产建议
dbfilename redis-slove.rdb # 改一下rdb文件名称
logfile "/usr/local/redis/logs/redis-slove1.log"
requirepass 123.com
# 指定主服务器，注意：有关slaveof的配置只是配置从服务器，主服务器不需要配置
slaveof 172.16.87.10 6379
# 主服务器密码
masterauth 123.com
```

更改Redis从配置文件`172.16.87.12`

```bash
[root@localhost redis]# vim /usr/local/redis/redis.conf
bind 172.16.87.12  # 改为本机IP
port 6379   # 默认6379
daemonize yes  # 改为yes允许后台运行
pidfile /var/run/redis_6379.pid # pid文件位置
maxmemory 750mb # 设置最大内存 一般为3/4,生产建议
dbfilename redis-slove.rdb # 改一下rdb文件名称
logfile "/usr/local/redis/logs/redis-slove2.log"
requirepass 123.com
slaveof 172.16.87.10 6379
# 主服务器密码
masterauth 123.com
```

上述内容主要是配置Redis服务器，从服务器比主服务器多一个slaveof的配置和密码。

## 配置哨兵文件

在Redis安装目录下有一个`sentinel.conf`文件

三台Redis都需要更改此配置文件
注意logfile的命名


```bash
cp sentinel.conf sentinel.conf.back # 先备份一个
vim sentinel.conf
protected-mode no
daemonize yes
logfile "/usr/local/redis-6.0.8/logs/redis-sentinel10.log"  # 记得创建logs目录
sentinel monitor mymaster 172.16.87.10 6379 2
sentinel auth-pass mymaster 123.com
```

- `protected-mode no` 禁止保护模式
- `daemonize yes` 后台运行
- `sentinel monitor mymaster 172.16.87.10 6379 2` 配置监听的主服务器
  - `2`代表只有两个或两个以上的哨兵认为主服务器不可用的时候，才会进行failover操作.
- `sentinel auth-pass mymaster 123.com`
  - mymaster为服务名 123.com为密码,与上述一样即可
- `logfile`我相信大家都能看得懂...我是这样命名的
  - redis-sentinel10.log(172.16.87.10) redis-sentinel11.log(172.16.87.11)以此类推

> 上述都修改完成可以启动redis了

## 启动Redis和哨兵

注意启动的顺序：首先是主的Redis服务进程，然后启动从机的Redis服务进程，最后启动3个哨兵的服务进程。

```bash
redis-server  /usr/local/redis-6.0.8/redis.conf # 三台Redis服务都用这个命令启动
redis-sentinel /usr/local/redis-6.0.8/sentinel.conf # 三台Redis哨兵服务
```

## 检查Redis主从是否同步成功

查看Redis日志

```bash
tail -f /usr/local/redis-6.0.8/logs/redis-master.log
9040:M 03 Jan 2021 11:46:53.570 * Synchronization with replica 172.16.87.11:6379 succeeded
9040:M 03 Jan 2021 11:48:19.065 * Synchronization with replica 172.16.87.12:6379 succeeded
```

出现两个`successed`并且成功同步复制即成功.

## 检测哨兵的主从切换是否成功

**你可以直接kill掉Redis的master**

```bash
killall -9 redis-server
# 然后查看从上的哨兵日志.
+sdown master mymaster 172.16.87.10 6379 可以看出master已经宕机,然后更换新的master为11
```

```bash
13706:X 03 Jan 2021 21:54:34.755 # +sdown master mymaster 172.16.87.10 6379
13706:X 03 Jan 2021 21:54:34.816 # +new-epoch 1
13706:X 03 Jan 2021 21:54:34.818 # +vote-for-leader d8c5bbbb14158ccb0ff962c4b0ed2e7e6bb9067c 1
13706:X 03 Jan 2021 21:54:34.818 # +odown master mymaster 172.16.87.10 6379 #quorum 3/2
13706:X 03 Jan 2021 21:54:34.819 # Next failover delay: I will not start a failover before Sun Jan  3 22:00:35 2021
13706:X 03 Jan 2021 21:54:35.344 # +config-update-from sentinel d8c5bbbb14158ccb0ff962c4b0ed2e7e6bb9067c 172.16.87.12 26379 @ mymaster 172.16.87.10 6379
13706:X 03 Jan 2021 21:54:35.344 # +switch-master mymaster 172.16.87.10 6379 172.16.87.11 6379
13706:X 03 Jan 2021 21:54:35.344 * +slave slave 172.16.87.12:6379 172.16.87.12 6379 @ mymaster 172.16.87.11 6379
13706:X 03 Jan 2021 21:54:35.345 * +slave slave 172.16.87.10:6379 172.16.87.10 6379 @ mymaster 172.16.87.11 6379
```

连接到Redis172.16.87.11

```bash
[root@localhost redis-6.0.8]# redis-cli -h 172.16.87.11 -a 123.com
172.16.87.11:6379> info replication
# Replication
role:master # 角色已经变成了master
connected_slaves:1
slave0:ip=172.16.87.12,port=6379,state=online,offset=133347,lag=0
master_replid:dbee8e7470ab8f5fddadc8958659a39d75033521
master_replid2:bd20b8c1ab987db5bc6bfa6eaca6df5d6ffdfa53
master_repl_offset:133486
second_repl_offset:93027
repl_backlog_active:1
repl_backlog_size:1048576
repl_backlog_first_byte_offset:197
repl_backlog_histlen:133290
```


