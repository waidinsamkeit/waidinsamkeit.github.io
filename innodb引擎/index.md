# MySQL常用存储引擎之InnoDB

**MySQL5.5以后版本的默认存储引擎**

- 支持事物的ACID特性
- Innodb使用表空间存储 
  - innodb_file_per_table (如果此参数为ON)
    - 则会创建一个独立的表空间:`tablename.ibd`
    - 系统表空间:`ibdataX(如果参数为OFF)` X表示一个数字



**演示参数ON**

```shell
mysql> show variables like 'innodb_file_per_table';
+-----------------------+-------+
| Variable_name         | Value |
+-----------------------+-------+
| innodb_file_per_table | ON    |
+-----------------------+-------+
1 row in set (0.00 sec)
由此可见 file_per_table是开启的,可以为每一个表创造一个表空间
mysql> create table myinnodb(id int,c1 varchar(40)); # 新建一个表
找的你的数据库下面可以看到
myinnodb.ibd myinnodb.frm
```

**演示参数OFF**

```shell
mysql> set global innodb_file_per_table=OFF;
mysql> show variables like "innodb_file_per_table";
+-----------------------+-------+
| Variable_name         | Value |
+-----------------------+-------+
| innodb_file_per_table | OFF   |
+-----------------------+-------+
1 row in set (0.00 sec)
mysql> create table myinnodb1(id int,cid varchar(20))engine=innodb;
查看数据库目录下只有
 myinnodb1.frm  # 存储的系统表空间
```

## 1.0 系统表空间和独立表空间怎么选

**比较**

- 系统表空间无法简单的收缩文件大小
- 独立表空间可以通过`optimize table`命令收缩文件大小
- 系统表空间会产生IO瓶颈
- 独立表空间可以同时向多个文件刷新数据

>  建议对Innodb使用独立表空间

## 1.1 如何把原来存在于系统表空间的表转移到独立表空间

**步骤**

1. 使用mysqldump导出所有数据库表数据

2. 停止mysql服务,修改参数,并删除innodb相关文件

3. 重启mysql服务,重建innodb系统表空间

4. 重新导入数据

>  注意: Innodb数据字典信息,这种信息还是很重要的

## 1.3 Innodb存储引擎的特性

- Innodb是一种事务性存储引擎
- 完全支持事物的ACID特性
- `Redo log`和`Undo log`

> 查看Redo log大小 以字节为单位
>
> **redo log通常是物理日志，记录的是数据页的物理修改，而不是某一行或某几行修改成怎样怎样，它用来恢复提交后的物理数据页(恢复数据页，且只能恢复到最后一次提交的位置)。**

```shell
mysql> show variables like "innodb_log_buffer_size";
+------------------------+----------+
| Variable_name          | Value    |
+------------------------+----------+
| innodb_log_buffer_size | 16777216 |
+------------------------+----------+
1 row in set (0.00 sec)
cd /var/lib/mysql/
查看到这个目录下会有两个文件
ib_logfile0 和 ib_logfile1
这是因为默认的redo log的files是2
mysql> show variables like 'innodb_log_files_in_group';
+---------------------------+-------+
| Variable_name             |Value |
+---------------------------+-------+
| innodb_log_files_in_group | 2     |
+---------------------------+-------+
1 row in set (0.00 sec)

```



> **Undo log用来回滚行记录到某个版本。undo log一般是逻辑日志，根据每行记录进行记录。**
>
> 包括MVCC

- Innodb支持行级锁
- 行级锁可以最大程度的支持并发
- 行级锁由存储引擎层实现

## 1.4 什么是数据库中的锁

1. 锁的主要作用是管理共享资源的并发访问

2. 锁用于实现事物的隔离性

3. 所保证一个用户写入数据时候另一个用户进行写的时候会被阻塞

锁的类型

- 共享锁(读锁)
- 独占锁(写锁)

**独占锁以及共享锁演示**

```shell
begin  # 开启一个事务
insert into myinnodb values(3,'bb');
update myinnodb set name='bbbb' where id =2; # 更新name字段的值为bbbb
其实innodb在锁的方面还是比较复杂的 了解即可
加入表级别的独占锁
mysql> lock table myinnodb write;
mysql> unlock table;
```

> 当存在锁的情况下 select的语句会被阻塞需要进行解锁

**锁的粒度**

- 表级锁 通过mysql的服务器层实现
- 行级锁 

**阻塞和死锁**

- 阻塞是为了保证并发的正常运行
  - 过多的阻塞会导致数据库的连接进行堆积
- 死锁是两个或两个以上的事务在执行的过程中占用相互等待的资源导致异常,少量死锁不会有影响
  - 当有大量的死锁就会有问题了



## 1.5 Innodb状态检查

```shell
show engine innodb status # 间隔30s进行采样 
主要是包括一些 I/O读写进程 一些配置页 缓存信息 索引等等
*************************** 1. row ***************************
  Type: InnoDB
  Name:
Status:
=====================================
2020-09-17 23:22:26 0x7f371091e700 INNODB MONITOR OUTPUT
=====================================
Per second averages calculated from the last 21 seconds # 21秒的统计值
```



## 适用场景

- 适合于大多数的OLTP应用


