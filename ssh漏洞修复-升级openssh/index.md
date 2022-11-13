# SSH漏洞修复-升级openssh

## 修复解决漏洞
- `解决OPenssh7.x以前的绝大多数问题`
- `OpenSSH 命令注入漏洞(CVE-2020-15778)`
- `OpenSSH 用户枚举漏洞(CVE-2018-15919)`
- `OpenSSH 安全漏洞(CVE-2017-15906)`
> 升级能解决绝大多数的问题


## 安装依赖环境
```bash
yum -y install rpm-build gcc gcc-c++ glibc glibc-devel openssl-devel openssl prce pcre-devel zlib zlib-devel make wget krb5-devel pam-devel libX11-devel xmkmf libXt-devel initscripts libXt-devel imake gtk2-devel
```
## 下载Openssh和Openssl
```shell
wget ftp://mirrors.sonic.net/pub/OpenBSD/OpenSSH/portable/openssh-8.4p1.tar.gz
wget https://www.openssl.org/source/openssl-1.1.1h.tar.gz
```

## 安装Openssl
```shell
tar -zxf openssl-1.1.1h.tar.gz
cd openssl-1.1.1h
./config --prefix=/usr/local/openssl-1.1.1 -d shared
make install
echo "/usr/local/openssl-1.1.1/lib" >> /etc/ld.so.conf 
```

## 安装Openssh
```shell
tar -zxf openssh-8.4p1.tar.gz
cd openssh-8.4p1
mv /etc/ssh/ /home/ssh-back
./configure --prefix=/usr/local/openssh-8.4 --sysconfdir=/etc/ssh --with-ssl-dir=/usr/local/openssl-1.1.1/ --with-zlib
make install
```

## 备份SSH
```shell
mv /usr/sbin/sshd /home/sshd_back
cp -rf /usr/local/openssh-8.4/sbin/sshd /usr/sbin/sshd
mv /usr/bin/ssh /home/ssh_back
cp -rf /usr/local/openssh-8.4/bin/ssh /usr/bin/
mv /usr/bin/ssh-keygen /home/ssh-keygen_back
cp -rf /usr/local/openssh-8.4/bin/ssh-keygen /usr/bin/
```

## 启动sshd服务
你可能会遇到sshd无法启动
```shell
sshd.service start operation timed out. Terminating
```
> 解决方法
```shell
systemctl stop sshd
rm -rf /lib/systemd/system/sshd.service
systemctl daemon-reload
# openssh-8.4p1是你最开始tar解压的目录,而不是安装后的目录
cp openssh-8.4p1/contrib/redhat/sshd.init /etc/init.d/sshd
/etc/init.d/sshd restart 或者 systemctl start sshd
systemctl enable sshd
```

