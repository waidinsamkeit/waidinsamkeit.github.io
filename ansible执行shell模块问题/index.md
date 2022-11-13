# Ansible执行Shell模块问题

## 问题

Ansible调用shell远程启动java包，找不到`JAVA_HOME`或者直接输出为空。 

```shell
[root@bogon ~]# ansible testserver -m shell -a "nohup java -jar /server/share-0.0.1-SNAPSHOT.jar --spring.profiles.active=test3 > /server/nohup.out  &"
172.16.87.11 | CHANGED | rc=0 >>
nohup: failed to run command ‘java’: No such file or directory
```

## 解决过程

1. 首先，在/etc/profile中声明java的变量,发现执行`ansible-playbook`返回为空

```shell
export JAVA_HOME=/usr/local/java
export JRE_HOME=/usr/local/java/jre
export CLASSPATH=$JAVA_HOME/lib:$JRE_HOME/lib
export PATH=$PATH:$JAVA_HOME/bin:$JRE_HOME/bin
```
2. 其次，在`~/.bash_profile`中添加环境变量，用ansible远程执行脚本，发现依然输出为空和找不到java....

3. 最后...考虑ansible执行的环境变量与登录时使用的环境变量是否有所不同,所以将`JAVA_HOME`写在`/etc/bashrc`里面,发现执行结果正常...

## 原因

由于我的猜测可能是由于ansible执行的时候并没有调用`/etc/profile`里面的环境变量配置,只加载`/etc/bashrc`和`~/.bashrc`里面环境变量

## 善意的提醒

建议以后把一些Devops或者持续交付的环境变量全部配置到`~/.bashrc或者/etc/bashrc`



