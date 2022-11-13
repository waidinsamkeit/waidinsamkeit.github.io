# 12306抢票小助手

不过，抢票软件并非万能，巧coder难为无票之炊，除了技术，你可能还需要一点点运气。
无论采取哪种交通方式，祝大家都能开开心心过年回家，平平安安回来搬砖~

- [原生项目地址](https://github.com/testerSunshine/12306)

- 其实作者已经没有在维护了...
- 我只是拿剩下的进行了二开
- 多多少少会有些问题..:pig:

## 支持的Python版本

- [ ]  2.7.10 - 2.7.15(目前根据作者代码来看已经不支持)
- [x] 3.6 - 3.7.4(推荐)
- [ ] 2.7.9(不太确定)
- [ ] 3.8.x(今天测试-不支持)

## 已实现功能

- [x] 自动打码
- [x] 自动登录
- [x] 准点预售和捡漏
- [x] 智能候补
- [x] 邮件通知
- [x] server酱通知
- [x] 短信通知提示(2020-1-11日新增)
- [x] 更新Token参数(优先调用)
- [ ] 预获取Cookie(待增加)
- [ ] 设置支付接口`(直接调用支付-(这个暂且不太想考虑了...有些不安全))`

## 依赖库

- 验证码目前可以本地识别，需要下载模型，放于项目根目录

```shell
  git clone https://github.com/testerSunshine/12306model.git # 依赖模型
```

- 自托管云打码服务器搭建：[12306_code_server](https://github.com/YinAoXiong/12306_code_server)

```yaml
version: "3"
services:
  code_12306:
    image: yinaoxiong/12306_code_server
    ports:
      - 5002:80 #可以根据需要修改端口
    environment:
      - WORKERS=1 #gunicorn works 默认为1可以根据服务器配置自行调整
    restart: always
```

- 项目依赖`[requirements.txt]`
- Python依赖`--with-ssl`

## 部署教程

- 推荐root用户直接安装

```shell
# 这个项目是我自己的
git clone https://gitee.com/lanmy/why_12305.git
cd why_12305
pip3 install -i https://pypi.tuna.tsinghua.edu.cn/simple -r requirements.txt 
```

`关于无法安装tensorflow`
```python
1. tensorflow的兼容版本 1.14.0rc\1.14.0rc\1.15.0\1.15.0rc
2.如果出现以下问题
ERROR: Could not find a version that satisfies the requirement tensorflow==1.15.0rc
ERROR: No matching distribution found for tensorflow==1.15.0rc
# 请看我写的支持的Python版本！！！
3.有必要时请更新你的PIP
pip3 install --upgrade pip
```


- 安装Docker与Docker-compose
- 部署12306_code_server`yml文件在上面`

```shell
git clone https://gitee.com/lanmy/auto_dev.git
python install_docker.py
mkdir 12305_code
cd 12305_code
```

**启动code_server**

```shell
docker-compose up -d 
```

### 1.0 服务启动说明

- 筛选CDN
- 修改配置文件
- 测试配置邮箱`我不做了`
- 启动服务

### 1.1 修改配置文件

```python
vim TickerConfig.py
# 如果你没有抢到票，寄希望于其他人退票后捡漏，则TICKET_TYPE = 2
TICKET_TYPE = 1 

# 填入一串你想要抢的车次例如[G2313,G1221]
STATION_TRAINS = [G2313,G1221,G267] 

# 出发城市，比如深圳北，就填深圳就搜得到
FROM_STATION = "北京"

# 到达城市 比如深圳北，就填深圳就搜得到
TO_STATION = "合肥"

# 乘车人(list) 多个乘车人ex:
TICKET_PEOPLES = ["张三,李四"]

# 设置token,获取Tk方法看最下面
tk = "ROKCqQNWEh-asdsadSNQOOasxvzvOO4gBA7qZakafm1m0"

# COOKIE_TYPE设置为1或2都有些问题，建议设置为3
COOKIE_TYPE = 3

# 获取Cookie
RAIL_EXPIRATION = "xxx"
RAIL_DEVICEID = "xxx"

# 此处设置云打码服务器地址，如果有自建的服务器，可以自行更改
HOST = "172.16.87.10:5002"
REQ_URL = "/verify/base64/"
HTTP_TYPE = "http"
```
`**关于无法安装tensorflow**`
车票日期记得写对例如：`2021-01-12`

### 1.2 筛选CDN

至此，准备工作已全部完成，启动前请先筛选cdn，这点很重要！

```shell
python3 run.py c
```

### 1.3 启动服务

```shell
python3 run.py r
```

成功Log

```log
车次: G2515 始发车站: 北京 终点站: 宣化北 二等座:有
正在尝试提交订票...
尝试提交订单...
出票成功
排队成功, 当前余票还剩余: 359 张
正在使用自动识别验证码功能
验证码通过,正在提交订单
提交订单成功！
排队等待时间预计还剩 -12 ms	
排队等待时间预计还剩 -6 ms
排队等待时间预计还剩 -7 ms
排队等待时间预计还剩 -4 ms
排队等待时间预计还剩 -4 ms
恭喜您订票成功，订单号为：EB52743573, 请立即打开浏览器登录12306，访问‘未完成订单’，在30分钟内完成支付！
```

![](https://cdn.jsdelivr.net/gh/waidinsamkeit/picture@latest/2021/01/11/a2ece1960b4e54c6710f02182c1f0e05.png)



## Cookie以及Token获取

> 别再问我怎么获取Cookie了！！！

1. 登录网页版12306官网
2. 网址旁边有个锁子🔐
3. 点击锁子>点击Cookie>点击12306.cn
4. 在`12306.cn的Cookie项`下面找到`RAIL_EXPIRATION`和`RAIL_DEVICEID`
5. 把值复制进去

> 再有不懂！直接百度🙅‍♀️

**Token**

1. 打开12306.cn
2. 打开开发者工具(F12)
3. 点击Network选项->过滤请求类型选择`XHR`
4. 登录12306,然后返回到开发者工具
5. 找到`uamauthclient` -> Headers->一直往下拉会有tk

![](https://cdn.jsdelivr.net/gh/waidinsamkeit/picture@latest/2021/01/11/09c4fc782cf90910f787bc9cb8a7c9f8.png)

