# Coturn穿透服务器搭建

```shell
yum -y install libevent-devel openssl-devel
```

### 1.1下载编译安装coturn

```shell
git clone https://github.com/coturn/coturn
cd coturn 
./configure  --prefix=/usr/local/coturn
make install
```

### 1.2查看是否安装成功

```shell
which turnserver
```

### 1.3配置文件

```shell
安装目录位于/usr/local/coturn
cd /usr/local/coturn/etc/
cp turnserver.conf.default turnserver.conf
```

###  1.4 配置证书

```shell
openssl req -x509 -newkey rsa:2048 -keyout ./turn_server_pkey.pem -out ./etc/turn_server_cert.pem -days 99999 -nodes 
```

- 生成的证书默认放在./当前目录
- 可以通过pwd进行查看



### 1.5修改配置信息

```shell
vim /usr/local/coturn/etc/turnserver.conf
relay-device=eth0   # 与前nmcli查到的网卡名称一致
listening-ip=192.168.1.10    # 内网IP
listening-port=3478
tls-listening-port=5349
relay-ip=172.18.77.60
external-ip=xxx.xxx.xxx.xxx    # 公网IP
relay-threads=50
lt-cred-mech
cert=./turn_server_cert.pem
pkey=./turn_server_pkey.pem
pidfile=”/var/run/turnserver.pid”
min-port=49152
max-port=65535
user=users:123.com    # 用户名密码，创建IceServer时用
cli-password=123.com
```

### 1.6 启动turnserver

```shell
 turnserver -o -a -f -user=users:123.com -r Beijing
```

> 千万注意，如果你是阿里云服务器直接去安全组里面放行TCP/UDP 3478端口即可,下面操作是给本地内网测试做的

```shell
firewall-cmd --zone=public --add-port=3478/udp --permanent
firewall-cmd --zone=public --add-port=3478/tcp --permanent
重新载入
firewall-cmd --reload
重启防火墙
systemctl restart firewalld
或者
systemctl stop firewalld
```

### ICE测试
> 地址 https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
### 网页配置如下
```shell
# stun:xxx.xxx.xxx.xxx:3478
# users
# 123.com
```


