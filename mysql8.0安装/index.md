# MySQL8.0安装


### 1.0 下载安装包

- [下载地址](https://dev.mysql.com/downloads/)

```shell
# 下载官方的mysql8.0
wget https://dev.mysql.com/get/mysql80-community-release-el7-3.noarch.rpm
rpm -ivh mysql80-community-release-el7-3.noarch.rp
yum install mysql-community-server # 安装mysql8.0
```

### 1.1 服务启动

------

```shell
systemctl start mysqld # 启动mysql
systemctl stop mysqld  # 停止mysql
systemctl restart mysqld # 重启mysql
systemctl status mysqld  # 查看mysql的状态
```

------

### 关于MySQL启动报错

```shell
# 优先查看MySQL启动日志,定位错误原因
cat /var/log/mysqld.log
---
2020-09-14T09:26:14.925068Z 1 [ERROR] [MY-011011] [Server] Failed to find valid data directory.
2020-09-14T09:26:14.925300Z 0 [ERROR] [MY-010020] [Server] Data Dictionary initialization failed.
---
```

**如果定位是如上错误**

- 解决办法如下

```shell
rm -rf /var/lib/mysql 
systemctl start mysqld
```


### 1.2 修改密码

- 继`MySQL5.7`以后默认生成密码,密码可以在`/var/log/mysqld.log`中查看

```shell
cat /var/log/mysqld.log | grep password
---
2020-09-14T09:30:23.884566Z 6 [Note] [MY-010454] [Server] A temporary password is generated for root@localhost: E&Vkxormg1
---
```

- 如果是`忘记密码`

```shell
vim /etc/my.cnf  
[mysqld]  
skip-grant-tables   # 在配置文件添加此内容
```

```shell
mysql -u root -p -A 
mysql> use mysql
mysql> update user set authentication_string='' where user='root'; # 因为mysql5.7以后已经废弃password字段了,用了authentication_string字段,所以我们先将密码设置为空.
```

```shell
[mysqld]  
skip-grant-tables   # 将原来的跳过验证删除,然后重启MySQL
mysql -u root -p -A 回车进入就行
mysql> use mysql
mysql> ALTER user 'root'@'localhost' IDENTIFIED BY '(^&*^*&^(*))'; # 将密码修改为(^&*^*&^(*)),这个密码你们自己自定义.
mysql> flush privileges; # 刷新权限
```

- 如果出现`ERROR 1819 (HY000): Your password does not satisfy the current policy requirements`错误提示表示你的密码不符合安全策略要求,一般都是字母+数字+符号+大写构成。

### 1.3 授权用户远程登录

```shell
-- 修改数据库密码认证方式（不修改密码则不执行）
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'chatsure！@#456';
-- root用户设置为可远程连接（注意：需要在mysql数据库下执行）
update user set host='%' where user='root';
-- 给用户授权
grant all privileges on *.* to 'root'@'%' with grant option
-- 创建角色
create role 'role_all'
-- 给角色授权
grant all privileges on *.* to role_all;
-- 给用户添加角色
grant role_all to 'root'@'%';
-- 刷新权限
flush privileges;
```


