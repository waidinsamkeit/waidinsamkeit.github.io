# 挂载OSS到ECS服务器

阿里云 OSS 是对象存储服务，价格也比较便宜，算得上是一个免费的 CDN，我们可以利用 OSSFS 这个工具，将 OSS 挂载到阿里云 ECS 服务器上，可以达到存储、备份的目的。当然，最主要的是可以减轻服务器的压力。

- 注意阿里云 OSS 下行流量没有免费额度，都需要收费。
- 本次仅针对Centos7.x

> Centos8目前不支持挂载OSS存储,不知道支不支持,老教程了。 -- 2022-03-21

## OSSFS

通过OSSFS，您可以将阿里云OSS存储桶安装到`Linux / Mac OS X`系统中的本地文件中。在系统中，您可以方便地在OSS中的对象上进行操作，同时使用本地文件系统维护数据共享。

## 特征

OSSFS基于S3FS构建，并具有S3FS的所有功能。主要特点：

- 支持大多数POSIX文件系统功能，包括文件读/写，目录，链接操作，权限，uid / gid和扩展属性）。
- 支持通过OSS多部分功能上传大文件。
- 支持MD5验证，以确保数据完整性。

## 下载安装包

到[官方仓库](https://github.com/aliyun/ossfs/releases)下载最新的rpm

> 选择 `ossfs_1.80.5_centos7.0_x86_64.rpm`

```shell
yum -y localinstall ossfs_1.80.5_centos7.0_x86_64.rpm 
```

## 配置OSSFS

首先需要拿到阿里云的 `AccesskeyID` 和 `Accesskeysecret`。登录阿里云账号，然后打开[密钥管理](https://usercenter.console.aliyun.com/#/manage/ak)页面，然后在列表里随便选择一个并记录下来。然后还需要去 oss 控制台创建一个 bucket，我这里 bucket 的名称叫做`test-dev`

为了演示假如我的 AccessKey ID 为 `OIUASIODN89821NK`， Access Key Secret 为 `76&*NQWEUIIOQW`

```bash
echo "test-dev:OIUASIODN89821NK:76&*NQWEUIIOQW" > /etc/passwd-ossfs
```

在系统上创建一个系统目录比如为 `/dev/mount` , 将此目录作为 ossfs 的挂载目录

```shell
ossfs test-dev /dev/mount -ourl=oss-cn-hangzhou-internal.aliyuncs.com -o allow_other
```

`-ourl` 表示的是 oss 的 EndPoint 地址

`-o` 表示运行非 root 用户使用此目录

## 开机启动挂载

这里需要用到`rc.local`

```shell
chmod +x /etc/rc.local
echo "ossfs test-dev /dev/mount -ourl=oss-cn-hangzhou-internal.aliyuncs.com -o allow_other" >> /etc/rc.local
```

