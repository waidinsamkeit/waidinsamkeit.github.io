# Nginx优化-常规优化



### 1.1 nginx连接数优化

```shell
events {
    worker_connections  65530;  # 设置nginx最大连接,最多为65535
    use epoll; # 采用epoll模型，作用于event的I/O异步
}
```

- 进程优化

```shell
worker_processes 8;
# NGinx的工作线程一般为核心数或者核心数X2 最多设置为8如果超出性能则不会进行提升了
worker_cpu_affinity 00000001 00000010 00000100 00001000 00010000 00100000 01000000 10000000; //设置NGinx的cpu亲和力，8核心就这样设置
worker_rlimit_nofile 102400; //nginx 子进程允许打开的文件次数
```

### 1.2 选项参数优化

```shell
http {
    include       mime.types;
    default_type  application/octet-stream;
    #log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
    limit_req_zone $binary_remote_addr zone=allip:10m rate=1000r/m;
    client_header_timeout 15; # 建立链接后发送request header的链接时间，如果超过此时间没有发送数据，则报错408
    client_body_timeout 15;  # 建立链接后发送request body的链接时间，如果超过此时间没有发送数据，则报错408
    send_timeout 60s;  # 服务端向客户端传输数据的超时实际那
    #                  '$status $body_bytes_sent "$http_referer" '
    #                  '"$http_user_agent" "$http_x_forwarded_for"';
    #access_log  logs/access.log  main;

    sendfile        on;
    #tcp_nopush     on;

    #keepalive_timeout  0;
    keepalive_timeout  45;   # TCP链接最多保持时间
    gzip_http_version 1.1;  gzip_http_version 1.1;# 识别gzip使用的http的版本，默认1.1
    gzip  on; # 开启gzip on 减少数据传输量
}
```

### 1.3系统内核层面优化

```shell
echo "net.core.somaxconn = 50000" > /etc/sysctl.conf
# 最大连接数
echo "net.ipv4.tcp_syncookies = 1" > /etc/sysctl.conf
# 表示开启SYN Cookies。当出现SYN等待队列溢出时，启用cookies来处理，可防范少量SYN攻击，默认为0，表示关闭；
echo 1 > /proc/sys/net/ipv4/tcp_tw_recycle
# 表示开启TCP连接中TIME-WAIT sockets的快速回收，默认为0，表示关闭。
echo 1 > /proc/sys/net/ipv4/tcp_tw_reuse
# 表示开启重用。允许将TIME-WAIT sockets重新用于新的TCP连接，默认为0，表示关闭；
```

### 1.4 允许打开最大文件数

```shell
cat>>/etc/security/limits.conf<<EOF
* soft nofile 655350
* hard nofile 655350
EOF
```

### 1.5 nginx 添加统计模块及配置

```shell
# 在 nginx.conf 中配置统计模块
location /status{
    # 开启状态
    stub_status on;
    # 不需要日志
    access_log off;
    # 只允许此 ip 访问
    allow 192.168.20.21;
    # 其他 ip 禁止访问
    deny all;
}
```

访问即可http://192.168.20.21/status

### 1.6 限制同一个IP访问频率

```shell
在nginx.conf里的http{}里加上如下代码：
http {
    include       mime.types;
    default_type  application/octet-stream;
    # log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
    limit_req_zone $binary_remote_addr zone=allip:10m rate=1000r/m;
    limit_conn_zone $server_name zone=allserver:10m;
    # 定义一个名为one的limit_req_zone用来存储session，大小是10M内存，　　

　　# 以$binary_remote_addr 为key,限制平均每分钟的请求为1000个，

　　# 1M能存储16000个状态，rete的值必须为整数
　　# $server_name 为限制同一server最大并发数
}
```

```shell
# 在需要限制并发数和下载带宽的网站配置server{}里加上如下代码：
limit_conn allip 2;    # allip是根据http中的zone选择的，是一个自定名称
limit_conn allserver 20; # allserver也是和http的zone保持一致
limit_rate 100k; # 限制下载速度,根据带宽进行确定
```

