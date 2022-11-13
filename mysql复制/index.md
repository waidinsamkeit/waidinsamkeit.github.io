# MySQL复制功能介绍


- 分担数据库的读负载
- 对服务器进行水平扩展
- 异步复制(无法保证主库和从库的延迟)

## 复制解决了什么问题？

- 不同服务器上的数据分布
- 利用二进制日志进行增量备份
- 不需要太多带宽
- 但是基于行复制 需要大量的带宽
- 跨IDC环境下可能有问题 应该进行分批复制
- 实现数据读取的负载均衡
- 采用非共享架构 增加数据安全性
- 减少主库服务器的负载
- 数据库之间的故障切换

## binlog日志
> 记录了所有MySQL数据库的修改事件 包括增删改查时间和对表结构的修改事件

### 二进制日志格式

1. 基于段的格式 `binlog_format=STATEMENT`
  - 日志记录量相对较,节约磁盘及网络I/O
2. 缺点如下
  - 必须记录上下文信息
  - 必须保证从数据库的语句与主数据库相同

> 查看日志使用的格式

```shell
mysql> show variables like "binlog_format";
+---------------+-------+
| Variable_name | Value |
+---------------+-------+
| binlog_format | ROW   |
+---------------+-------+
1 row in set (0.00 sec)
set session binlog_format=statement; # 改成基于段的格式
mysql> flush logs; # 刷新日志
mysql> show binary logs;
+------------------+-----------+
| Log_name         | File_size |
+------------------+-----------+
| mysql_bin.000001 |       201 |
| mysql_bin.000002 |       154 |
+------------------+-----------+
2 rows in set (0.00 sec)

```

**如果启动报错**
```shell
ERROR 1381 (HY000): You are not using binary logging 
请在mysql的配置文件中加入
server-id=1
log_bin=mysql_bin 重启mysql就行
```




### 查看二进制日志所记录的内容

```shell
mysql> create database crn;
Query OK, 1 row affected (0.07 sec)

mysql> use crn
Database changed
mysql> create table t(id int,name varchar(20));
Query OK, 0 rows affected (0.90 sec)

mysql> insert into t values(1,'nica'),(2,'logs');
Query OK, 2 rows affected (0.15 sec)
Records: 2  Duplicates: 0  Warnings: 0

[root@MySQL8-slave2 ~]# cd /var/lib/mysql
[root@MySQL8-slave2 mysql]# mysqlbinlog mysql_bin.000002 # 里面可以看到所有的操作记录 是基于段的
```

### 基于行的日志格式binlog_formart=ROW
  - Row可以解决主从同步不一致的问题(记录所有行)
> 例如 同一个SQL语句修改了10000条数据的情况,基于段的日志格式只会记录这个SQL语句基于行的日志会有10000条记录分别记录每一行SQL语句.
   - 使MySQL主从复制更加安全
   - 对每一行数据的修改比基于段的复制搞笑
   - 记录日志量较大
```shell
     binlog_row_image=[full|minimal|noblob]
     full表述全部记录
     minimage只记录列的修改
     noblob不会记录text的值
     mysql> alter table t add c2 text;#加入一个c2列 字段类型为text
     mysql> insert into t values(3,'ee','bbb');
     查看你的mysqlbinlog日志
     [root@MySQL8-slave2 mysql]# mysqlbinlog mysql_bin.000003
     # 单独的用mysqlbinary完全看不到row里面的数据
     
     [root@MySQL8-slave2 mysql]# mysqlbinlog mysql_bin.000003 -vv # 加入-vv参数就可以看到row格式的binlog日志记录方式
     2.这个时候我们更改一下binlog_row_image的参数为minimal
     mysql> set session binlog_row_image=minimal;
     mysql> update t set c2='this 2' where id=2; # 更改数据
     再次查看mysql_binlog.000003里面的数据
     ### UPDATE `crn`.`t` //可以看到minimal是这样的
     3.更改binlog_row_image的参
     blob
     mysql> set session binlog_row_image=noblob; //注意这个时候不能用text格式
     mysql> update t set name='blob' where id=3;
     再次查看mysql_binlog.000003里面的数据
     ### SET
     ###   @1=3 /* INT meta=0 nullable=1 is_null=0 */
     ###   @2='blob' /* VARSTRING(20) meta=20 nullable=1 is_null=0 */
     # at 1092
     #200918 10:18:03 server id 1  end_log_pos 1123 CRC32 0x707bd6dc         Xid = 61
     COMMIT/*!*/;
     SET @@SESSION.GTID_NEXT= 'AUTOMATIC' /* added by mysqlbinlog */ /*!*/;
     DELIMITER ;
     # End of log file  //其实和ROW的方式差不多的 因为没更新text的列 所以SET后面没有数据
```

### 混合日志格式binlog_format=MIXED
  -  根据SQL语句由系统决在基于段和基于行的日志格式中进行选择
  - 数据量的大小由所执行的SQL语句决定

## 对于二进制日志选择

建议

- binlog_format=mixed
- binlog_formart=row

**这两个还是作为首选**

> 注意,在使用binlog_formart=row的时候注意也应该设置`binlog_row_image=minial`


