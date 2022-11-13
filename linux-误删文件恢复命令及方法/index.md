# Linux 误删文件恢复命令及方法

为rm -rf 的手残党准备的

> 注意事项：虽然有软件可以对误删的数据进行恢复，但是完全恢复数据的概率并不是百分百的。

> 在提醒：适用rm -rf 的时候依旧慎用



### extundelete恢复


使用存储在分区日志中的信息，尝试恢复已从ext3或ext4的分区中删除的文件

extundelete官方地址([官网文档](http://extundelete.sourceforge.net))

extundelete([下载地址](http://downloads.sourceforge.net/project/extundelete/extundelete/0.2.4/extundelete-0.2.4.tar.bz2))最新版本的extundelete是0.2.4，于2013年1月发布

- 在数据删除之后，要卸载被删除数据所在的磁盘或是分区
- 如果是系统根分区遭到误删除，就要进入单用户模式,将根分区以只读的方式挂载,尽可能避免数据被覆盖
- 数据被覆盖后无法找回
- 恢复仍有一定的机率失败，平时应对重要数据作备份，小心使用rm

#### 1.0安装依赖

`Centos7`

```shell
yum -y install e2fsprogs-devel   e2fsprogs* gcc*
```

`Ubuntu`

```shell
apt-get install build-essential  e2fslibs-dev  e2fslibs-dev
```

#### 2.0安装编译

```shell
wget http://downloads.sourceforge.net/project/extundelete/extundelete/0.2.4/extundelete-0.2.4.tar.bz2
tar -xf  extundelete-0.2.4.tar.bz2
cd  extundelete-0.2.4
./configure --prefix=/usr/local/extundelete
make install
ln -s /usr/local/extundelete/bin/extundelete /usr/bin/
```

使用`extundelete -v`可以查看版本

```shell
[root@VM-0-13-centos extundelete-0.2.4]# extundelete -v
extundelete version 0.2.4
libext2fs version 1.42.9
Processor is little endian.
```

#### 3.0 进行文件恢复

------

**1、查看要恢复文件的分区的文件系统**

```shell
df  -Th
Filesystem     Type      Size  Used Avail Use% Mounted on
devtmpfs       devtmpfs  909M     0  909M   0% /dev
tmpfs          tmpfs     920M   24K  920M   1% /dev/shm
tmpfs          tmpfs     920M  468K  919M   1% /run
tmpfs          tmpfs     920M     0  920M   0% /sys/fs/cgroup
/dev/vda1      ext4       50G   11G   37G  23% /
tmpfs          tmpfs     184M     0  184M   0% /run/user/0
```

**2、对要恢复文件的分区解除挂载**

```shell
umount /xxx
```

**3、查看可以恢复的数据**

指定误删文件的分区进行查找
最后一列标记为Deleted的文件，即为删除了的文件

```shell
extundelete /dev/vdb1 --inode 2 （根分区的inode值是2）
```

**4、恢复单个目录**

指定要恢复的目录名
如果是空目录，则不会恢复

```shell
extundelete /dev/vdb1 --restore-directory  ferris
```

当执行恢复文件的命令后，会在执行命令的当前的目录下生成RECOVERED_FILES目录，恢复的文件都会放入此目录中。如未生成目录，即为失败。

**5、恢复单个文件**

指定要恢复的文件名
如果几k大小的小文件，有很大几率恢复失败

```shell
extundelete /dev/vdb1 --restore-file openssh-7.7p1.tar.g
```

**6、恢复全部删除的文件**

无需指定文件名或目录名，恢复全部删除的数据

```shell
extundelete /dev/vdb1 --restore-all
```

