# MySQL常用存储引擎之MyISAM

**MySQL`5.5`版本之前的默认存储引擎就是`MyISAM`**

- 系统表
- 临时表(查询优化器建立的临时表)

MyISAM存储引擎表由`MYD`和`MYI`组成

## MyISAM的特性

- 并发性与锁级别

>  对于读写混合的并发性不会太好

- 表损坏修复

> 通过 check table tablename 进行检查
>
> 通过 repair table tablename 进行恢复

**演示实例**

```shell
use test # 进入你自己的数据库
create table myIsam(id int,c1 varchar(10))engine=myisam; # 需要通过engine指定引擎
cd /var/lib/mysql/test # test是你的库名字 库的位置一般都在你的安装路径下 yum的默认在/var/lib/mysql
myIsam_352.sdi  myIsam.MYD  myIsam.MYI
                 存储数据信息    存储索引信息
回到mysql的test1库中执行
check table myisam
+--------------+-------+----------+------------------------------------+
| Table        | Op    | Msg_type | Msg_text                           |
+--------------+-------+----------+------------------------------------+
| test1.myisam | check | status   | OK                                 |
| test1.myisam | check | status   | OK                                 |
+--------------+-------+----------+------------------------------------+
接着执行repair table myisam # MyISAM表损坏的时候才有用

```

- MyISAM表支持的索引类型
- MyISAM表支持数据压缩

> 压缩可以使用

**演示实例**

```shell
[root@localhost test]# myisampack -b -f myIsam
Compressing myIsam.MYD: (0 records)
- Calculating statistics
- Compressing file
Empty file saved in compressed format
# (0 records) 空文件
# 查看文件大小，-f是强制压缩
# myIsam.OLD 压缩之前文件的备份
# 实际上压缩后(MYI)的文件比压缩前(OLD)的文件还要大,因为原来的数据太小了 知识为了演示
```

**对于表中的读写**

```shell
# 当前myIsam表已经进行压缩了，进行插入操作，结论【对于已经压缩的表是不能进行写操作的，只能读】
mysql> insert into myIsam values(1,'haha');
ERROR 1036 (HY000): Table 'myIsam' is read only
```

**限制**

版本<5.0的默认表大小为4Gb

如存储大表则需要修改`MAX_Rows`和`AVG_Row_LENGTH`

- 修改会导致表重建

版本>5.0的默认表大小为256TB

## 适用场景

- 非事务型应用
- 只读类应用
- 空间类应用(例如GPS 利用空间函数)


