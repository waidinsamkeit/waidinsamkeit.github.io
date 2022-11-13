# Redis主从复制搭建



## 准备环境

| 192.168.1.100 | MASTER | 6379 |
| :------------ | :----: | :--- |
| 192.168.1.101 | SLAVE  | 6379 |

> 脚本每个人的环境不同.可能有的会有问题，按照自己的环境来改和执行

```shell
[root@localhost redis]# vim start.sh  //就是不想手动敲那么累，全是命令拼凑
#!/bin/bash
Redis_home=/usr/local/redis
# start dow redis
echo -e "\033[41;36m test env  \033[0m"
if [ ! -d "/backup" ]; then
  mkdir /backup
fi
mv /etc/yum.repos.d/* /backup
wget -O /etc/yum.repos.d/CentOS-Base.repo http://mirrors.aliyun.com/repo/Centos-7.repo
wget -O /etc/yum.repos.d/epel.repo http://mirrors.aliyun.com/repo/epel-7.repo
# installk envermint
echo -e "\033[41;36m install env \033[0m"
yum makecache > /dev/null 2>&1
yum -y install centos-release-scl  scl-utils-build
yum -y install devtoolset-7-gcc* gcc
scl enable devtoolset-7 bash
# zip redis
echo -e "\033[41;36m install redis  \033[0m" 
wget http://download.redis.io/releases/redis-6.0.8.tar.gz
tar -zxf redis-6.0.8.tar.gz
mv  redis-6.0.8 $Redis_home
cd /usr/local/redis && make install
```

## 1.0 修改主Redis配置文件

```shell
[root@localhost redis]# vim /usr/local/redis/redis.conf
bind 192.168.1.100  # 改为本机IP
port 6379   # 默认6379
daemonize yes # 改为yes允许后台执行
pidfile /var/run/redis_6379.pid #  pid文件位置
maxmemory 750mb # 设置最大内存 一般为3/4
dbfilename redis-master.rdb #  改一下rdb文件名称
logfile "/usr/local/redis/logs/redis-master.log" # 日志文件
requirepass 123.com  # redis密码
```

## 1.1 修改从Redis配置文件

```shell
[root@localhost ~]# vim /usr/local/redis/redis.conf
bind 192.168.1.101  # 改为本机IP
port 6379   # 默认6379
daemonize yes  # 改为yes允许后台执行
pidfile /var/run/redis_6379.pid #  pid文件位置
maxmemory 750mb # 设置最大内存 一般为3/4
dbfilename redis-slave.rdb # 改一下rdb文件名称
replicaof 192.168.1.100 6379 # 从节点跟随主节点的地址
logfile "/usr/local/redis/logs/redis-slave.log" # 出去记得自己创建目录
requirepass 123.com
```

## 1.3 启动Redis主从

```shell
echo "511" > /proc/sys/net/core/somaxconn
echo "vm.overcommit_memory = 1" >> /etc/sysctl.conf
sysctl -p 
[root@localhost ~]# cd /usr/local/redis/;redis-server redis.conf
```

检测主从是否同步

```shell
[root@localhost redis]# redis-cli -c -h 192.168.1.100 -p 6379 -a 123.com  # 从上面链接主
192.168.1.100:6379> set for ceshi  
[root@localhost redis]# redis-cli -c -h 192.168.1.101 -p 6379 -a 123.com # 在切换到从服务器
192.168.1.101:6379> get for
"ceshi"  # 同步到数据即可
```


