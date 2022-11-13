# Elasticsearch+kibana+Logstash部署

## 1.0 准备条件
准备如下：
- filebeat-6.3.2
- elasticsearch-6.3.2
- kibana-6.3.2
- logstash-6.3.2  
- 内存3GB以上,`elasticsearch`这东西太吃内存了,实验环境建议内存给到4G.
- 官网地址 https://www.elastic.co/cn/elasticsearch/

**如果你嫌弃官网下载的太慢,可以使用以下微云地址下载**

- https://share.weiyun.com/fnAz5I2f
- 版本最好是和我这个一致吧

> 教程是老教程了,微云这会儿也限速了  - 2022-03-21


## 2.0 搭建Elasticsearch
#### 2.0.1 准备JDK环境

- [下载`JDK8`](https://www.oracle.com/java/technologies/javase/javase-jdk8-downloads.html)

```shell
#  解压并且移动jdk目录
[root@MySQL8 ~]# tar -zxf jdk-8u201-linux-x64.tar.gz
[root@MySQL8 ~]# mv jdk1.8.0_201/ /usr/local/java
#  设置java的环境变量
echo '
export JAVA_HOME=/usr/local/java
export JRE_HOME=/usr/local/java/jre
export CLASSPATH=$JAVA_HOME/lib:$JRE_HOME/lib
export PATH=$PATH:$JAVA_HOME/bin:$JRE_HOME/bin
' >> /etc/profile
[root@MySQL8 ~]# source /etc/profile  # 加载profile使其生效
# 检测配置的java环境变量是否生效
[root@MySQL8 ~]# java -version # 使用java -verison出现版本信息
java version "1.8.0_201"
Java(TM) SE Runtime Environment (build 1.8.0_201-b09)
Java HotSpot(TM) 64-Bit Server VM (build 25.201-b09, mixed mode)
```

#### 2.0.2 部署Elasticsearch单机版
```shell
[root@localhost ~]# tar -zxf elasticsearch-6.3.2.tar.gz
[root@localhost ~]# mv elasticsearch-6.3.2 /usr/local/elasticsearch-6.3.2
[root@localhost ~]# cd /usr/local/elasticsearch-6.3.2/config/
[root@localhost ~]# vim elasticsearch.yml
```
修改以下内容
```shell
# 有注释的把注释取消,没有注释的手动添加
# ---------------------------------- Cluster -----------------------------------
cluster.name: my-application
# ------------------------------------ Node ------------------------------------
node.name: node-1
node.data: true
node.master: true
# ----------------------------------- Paths ------------------------------------
# 日志目录和数据目录
path.data: /usr/local/elasticsearch-6.3.2/data
path.logs: /usr/local/elasticsearch-6.3.2/logs
# ---------------------------------- Network -----------------------------------
network.host: 192.168.231.60  # 本机ip的地址    
http.port: 9200               # 端口为9200
http.cors.enabled: true
http.cors.allow-origin: "*"
# --------------------------------- Discovery ----------------------------------
discovery.zen.minimum_master_nodes: 1
```
#### 2.0.3 安装Kibana
```shell
[root@localhost ~]# tar -zxf kibana-6.3.2-linux-x86_64.tar.gz
[root@localhost ~]# mv kibana-6.3.2 /usr/local/kibana-6.3.2
[root@localhost ~]# cd /usr/local/kibana-6.3.2/config/
[root@localhost ~]# vim kibana.yml
```
修改以下内容
```shell
# Kibana is served by a back end server. This setting specifies the port to use.
server.port: 15601              # Kibana的web页面端口

# To allow connections from remote users, set this parameter to a non-loopback address.
server.host: "192.168.231.60"  # kibana本机ip地址

# The URL of the Elasticsearch instance to use for all your queries.
elasticsearch.url: "http://192.168.231.60:9200" # 填写elasticsearch的ip地址

# dashboards. Kibana creates a new index if the index doesn't already exist.
kibana.index: ".kibana" #  kibana的索引文件
```

#### 2.0.4 安装Logstash
```shell
[root@localhost ~]# tar -zxf logstash-6.3.2.tar.gz
[root@localhost ~]# mv logstash-6.3.2  /usr/local/logstash-6.3.2
[root@localhost ~]# cd /usr/local/logstash-6.3.2/config/
[root@localhost config]# vim logstash.yml
```
修改以下内容
```shell
path.config: /usr/local/logstash-6.3.2/config/*.conf # 此目录为logstash安装的目录
config.reload.automatic: true # 配置文件自动加载
config.reload.interval: 3s    # 每次加载间隔时间
http.host: "192.168.231.60"   # 本机IP地址
path.logs: /usr/local/logstash-6.3.2/logs  # 日志目录
```

#### 2.0.5 安装filebeat
```shell
[root@localhost ~]# tar -zxf filebeat-6.3.2-linux-x86_64.tar.gz
[root@localhost ~]# tar -zxf filebeat-6.3.2 /usr/local/filebeat-6.3.2
[root@localhost ~]# cd /usr/local/filebeat-6.3.2/
[root@localhost ~]# vim filebeat.yml
```
修改以下内容
```shell
#  如果添加日志的话记得删除原来的
#=========================== Filebeat inputs =============================
filebeat:
  prospectors:
    - type: log    # 类型
      paths:
        - /var/log/nginx/access.log    #采取的日志目录
      tags: true
      
# Change to true to enable this input configuration.
  enabled: true

#----------------------------- Logstash output --------------------------------
output.logstash:
        #  The Logstash hosts
        hosts: ["192.168.231.60:5044"] # logstash默认端口5044


#-------------------------- Elasticsearch output ------------------------------
# output.elasticsearch:   //注释
  # Array of hosts to connect to. //注释
  #  hosts: ["localhost:9200"]  //注释

```
#### 2.0.6 编写nginx-access.conf
```shell
[root@localhost bin]# vim /usr/local/logstash-6.3.2/config/nginx-access.conf
```
**nginx-access.conf**

```shell
input {
 beats {
  port => 5044
   }
}
output {
 elasticsearch {
  hosts => "192.168.231.60:9200"
  index => "nginx-%{+YYYY.MM.dd}"
   }
}
```




#### 2.0.7 启动服务
```shell
# 启动elasticsearch
[root@localhost ~]# cd /usr/local/elasticsearch-6.3.2/bin/
[root@localhost bin]# nohup ./elasticsearch &

# 启动kibana
[root@localhost kibana-6.3.2]# cd /usr/local/kibana-6.3.2/bin/
[root@localhost bin]# nohup ./kibana &

# 启动logstash
[root@localhost bin]# cd /usr/local/logstash-6.3.2/bin/
[root@localhost bin]# nohup ./logstash -t /usr/local/logstash-6.3.2/config/nginx-access.conf

# 启动filebeat
[root@localhost filebeat-6.3.2]# cd /usr/local/filebeat-6.3.2/
[root@localhost filebeat-6.3.2]# nohup ./filebeat -c /usr/local/filebeat-6.3.2/filebeat.yml
```

#### 2.0.8 验证结果
```shell
访问192.168.231.60:15601
出现kibana页面即可
```

