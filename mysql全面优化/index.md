# MySQL全面优化思路-基础内容

## MySQL性能优化-优化思路

> 大概的优化思路分为以下几个内容

> PS: 优化是有风险的,如果你要优化就要变更。
- 硬件层面优化
- 系统层面优化
- MySQL版本选择优化
- MySQL三层结构及参数优化
- MySQL开发规范
- MySQL的索引优化
- MySQL的事务以及锁优化
- MySQL架构优化
- MySQL安全优化
## 硬件层面优化
> 这个地方就略过了就是一些加大硬件配置的需求.
## 系统层面优化
- id: 空闲状态,如果数值越大,表示空闲状态越多。如果可能达到0的情况下,表示当前CPU的核心处于满负荷状态。
- us: 表示当前CPU核心数量的使用率。
- sy: 表示CPU与内核交互的频率,内核与CPU处理请求的占用,如果此参数高,表示内核很忙。
- wa: CPU从内存中刷数据到硬盘中的占用,可能会出现I/O的问题。
```shell
[root@mysql-master ~]# top
top - 15:05:11 up 35 days,  5:54,  2 users,  load average: 0.00, 0.01, 0.05
Tasks: 225 total,   2 running, 223 sleeping,   0 stopped,   0 zombie
%Cpu0  :  0.0 us,  0.0 sy,  0.0 ni,100.0 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st
%Cpu1  :  0.0 us,  0.0 sy,  0.0 ni,100.0 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st
%Cpu2  :  0.0 us,  0.0 sy,  0.0 ni,100.0 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st
%Cpu3  :  0.0 us,  0.0 sy,  0.0 ni,100.0 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st
%Cpu4  :  0.0 us,  0.0 sy,  0.0 ni,100.0 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st
%Cpu5  :  0.0 us,  0.0 sy,  0.0 ni,100.0 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st
%Cpu6  :  0.0 us,  0.0 sy,  0.0 ni,100.0 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st
%Cpu7  :  0.0 us,  0.0 sy,  0.0 ni,100.0 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st
KiB Mem : 24522416 total, 14931524 free,  3675344 used,  5915548 buff/cache
KiB Swap: 12386300 total, 12386300 free,        0 used. 20450988 avail Mem
```

通过 `top -Hp 10380` 指定占用高的进程,可以看到具体是那些线程占用过高

假设 `1893`线程占用过高,可以从数据库中查看`performance_schema`库中具体的信息

> 定位操作系统线程->从系统线程中定位数据库线程

```sql
*************************** 38. row ***************************
          THREAD_ID: 128014
               NAME: thread/sql/one_connection
               TYPE: FOREGROUND
     PROCESSLIST_ID: 127988
   PROCESSLIST_USER: ooooo
   PROCESSLIST_HOST: 192.168.0.1
     PROCESSLIST_DB: test
PROCESSLIST_COMMAND: Sleep
   PROCESSLIST_TIME: 104
  PROCESSLIST_STATE: NULL
   PROCESSLIST_INFO: **
   PARENT_THREAD_ID: NULL
               ROLE: NULL
       INSTRUMENTED: YES
            HISTORY: YES
    CONNECTION_TYPE: SSL/TLS
       THREAD_OS_ID: 16165
*************************** 39. row ***************************
```

### 如果可能存在的是IO问题

- 查询`MySQL`中的`sys`库中存在记录`IO`的表

> 如果存在IO问题： 可以选择用内存换取时间的方法..

```sql
mysql> use sys
mysql> show tables;
| x$io_by_thread_by_latency                     |
| x$io_global_by_file_by_bytes                  |
| x$io_global_by_file_by_latency                |
| x$io_global_by_wait_by_bytes                  |
| x$io_global_by_wait_by_latency                | 
```

## MySQL版本选择优化

> 在这里...笔者非常推荐MySQL8.0x!!! 同样的机器,8.0比5.7快2.5倍左右吧

1. 选择稳定版,选择开源社区的稳定版和GA版本

2. 选择MySQL数据库GA版本发布后6-12个月的GA双数版本

3. 要选择开发兼容的MySQL版本

## MySQL三层结构及参数优化

### 连接层优化

> 一切根据自己或者项目需要自由设置吧!

```shell
max_connections = 1000
max_connect_errors = 999999
wait_timeout = 600
interactive_wait_timeout = 3600
net_read_timeout = 120
new_write_timeout = 120
max_allowed_packet = 500M
```

### Server层优化

> 一切根据自己或者项目需要自由设置吧!

```shell
sort_buffer_size = 8M
sql_safe_updates = 1
slow_query_log = 1
long_query_time = 1
slow_query_log_file = /data/mysql/mysql-slow.log
log_queries_not_using_indexes = 10
read_buffer_size = 2M
read_rnd_buffer_size = 8M
sort_buffer_size = 8M
join_buffer_size = 8M
key_buffer_size = 16M
max_binlog_size = 500M
max_execution_time = 28800
log_timestamps = SYSTEM
init_connect = "set names utf8mb4"
binlog_format = ROW
event_scheduler = OFF
lock_wait_timeout =
sync_binlog = 1
```

### Engine层优化

> 一切根据自己或者项目需要自由设置吧!

```shell
transaction-isolation = "READ-COMMITIED"
innodb_data_home_dir = /xxx
innodb_log_group_home_dir = /xxx
innodb_log_file_size = 2048M
innodb_log_files_in_group = 3
innodb_flush_log_at_trx_commit = 2
innodb_flush_method = O_DIRECT
innodb_io_capacity = 1000
innodb_io_capacity_max = 4000
innodb_buffer_pool_size = 64G
innodb_buffer_pool_instances = 4
innodb_log_buffer_size = 64M
innodb_max_dirty_pages_pct = 85
```

## 全局锁读Global Read Lock (GRL）

> 加锁方法：FTWRL,flush tables with read lock.
>
> 解锁方法：unlock tables；
>
> 可能出现的场景
>
> - 记录binlog日志->不让所有事务提交
>
> - FTWRL->不让新的修改进入
>
> - snapshot innodb-> 允许所有的DML语句,但是不允许DDL
>
> 属于类型: MDL(matedatalock)层面锁
>
> 影响情况: 加锁的期间,阻塞所有事务的写入,阻塞所有事务的commit,时间受到`lock_wait_timeout=315336000`

### 全局读锁的排查方法

```sql
MySQL [(none)]> USE performance_schema
MySQL [performance_schema]> 
# 5.6需要手动开启
MySQL [performance_schema]> UPDATE setup_instruments SET ENABLED = "YES",TIMED = "YES" WHERE NAME='wait/lock/metadata/sql/mdl';
#  查看是否有阻塞问题
MySQL [performance_schema]> SELECT * FROM metadata_locks;
mysql> SELECT OBJECT_SCHEMA,OBJECT_NAME,LOCK_TYPE,LOCK_DURATION,LOCK_STATUS,OWNER_THREAD_ID,OWNER_EVENT_ID FROM performance_schema.metadata_locks;
```

### 5.7版本全局读锁排查

```sql
mysql> SHOW proceslist\G;
mysql> SELECT * FORM sys.schema_table_lock_waits;
```

### 经典故障案例
- 假设模拟一个大的查询或者事物
- 模拟备份时的TWRL,此时会发现命令阻塞
- 发起正常查询请求,发现查询被阻塞
> 5.7版本的Xbackup/mysqldump备份数据库出现锁表状态,所有的查询不能正常进行.

```sql
SELECT *,SLEEP(100) FORM `user` WHERE username = 'test1' for update;
flush tables with read lock;
SELECT * FROM icours.user where username = 'test' for update
```

## Table Lock(表级锁)

- 加锁方式: `lock table t1 read;` 所有会话只读,属于MDL锁。`lock table write; ` 当前会话可以可以RW,属于MDL锁. `SELECT FOR UPDATE;` `SELECT FOR SHARE`

- 解锁方式: `unlock tables`;

### 检测方式

```shell
[mysqld]
performance-schema-instrument = 'wait/lock/metadata/sql/mdl=ON'

SELECT * FROM performance_schema.metadata_locks;
SELECT * FROM performance_schema.threads;
```

## MetaDataLock(元数据锁)

- 作用范围: global、commit、tablespace、schema、table

- 默认时间： `lock_wait_timeout`

```sql
mysql> select @@lock_wait_timeout;
+---------------------+
| @@lock_wait_timeout |
+---------------------+
|            31536000 |
+---------------------+
1 row in set (0.00 sec)
```

### 检测方式

```shell
[mysqld]
performance-schema-instrument = 'wait/lock/metadata/sql/mdl=ON'

SELECT * FROM performance_schema.metadata_locks;
```

```sql
// 找到阻塞的Id
OWNER_THREAD_ID = 12
mysql> SELECT * FROM threads where thread_id = '12'\G;
kill 12;
```

## AutoincLock(自增锁)

- 通过参数: `innodb_autoinc_lock_mod = 0 | 1 | 2`

- 0 表锁：每次插入都请求表锁,效率低下

- 1 mutex： 预计插入多少行,预申请自增序列.如果出现load或者insert select方式会退化为0。

- 2 : 强制使用mutex的方式,并发插入会更高效！

## Innodb Row Lock(行级锁)

- record lock、gap、next、lock

```sql
MySQL [(none)]> SHOW STATUS LIKE 'innodb_row_lock';
MySQL [information_schema]> SELECT * FROM information_schema.innodb_trx;
MySQL [information_schema]> SELECT * FORM sys.schema_table_lock_waits;
MySQL [information_schema]> SELECT * FROM  performance_schema.threads;
MySQL [information_schema]> SELECT * FROM performance_schema.events_statements_current;
MySQL [information_schema]>
```

### 优化方向

1. 优化索引

2. 减少事务的更新范围

3. RC级别

4. 拆分语句

```sql
// 假设 k1是辅助索引
update t1 set num=num+10 where k1<100;
// 改为
select id from t1 where k1<100;
update t1 set num=num+10 where id in (20,30,50)
```

## Dead Lock死锁

> dead lock 多个并发事务之间发生交叉依赖的时候,会出现死锁.

```sql
SHOW ENGINE innodb STATUS\G;
innodb_print——all_deadlocks =1 // 开启记录死锁日志
```


