# Django实现调用腾讯云短信接口

## 腾讯云短信接口

- 注册
  
- 登录

> 具体怎么注册腾讯云接口看下面的文章吧
> 
> [腾讯云接口注册](https://pythonav.com/wiki/detail/10/81/)

### 1.0 安装SDK

```python
pip3 install qcloudsms_py
conda install qcloudsms_py
```

### 1.1 编写发送短信接口

- 我的环境是基于django
  
- `TENCENT_SMS_APP_ID, TENCENT_SMS_APP_KEY, TENCENT_SMS_SIG`: 分别都写在了`settings.develop`配置文件下
  

```python
# tencent/smsket.py
import ssl
from love_language.settings.develop import TENCENT_SMS_APP_ID, TENCENT_SMS_APP_KEY, TENCENT_SMS_SIGN
# ssl._create_default_https_context = ssl._create_unverified_context
from qcloudsms_py import SmsMultiSender, SmsSingleSender
from qcloudsms_py.httpclient import HTTPError


class SendTenSms():
    def __init__(self, phone_num, template_id, template_param_list):
        """
        单条发送短信
        :param phone_num: 手机号
        :param template_id: 腾讯云短信模板ID
        :param template_param_list: 短信模板所需参数列表，例如:【验证码：{1}，描述：{2}】，则传递参数 [888,666]按顺序去格式化模板
        :return:
        """
        self.phone_num = phone_num
        self.template_id = template_id
        self.template_param_list = template_param_list

    def send_sms_single(self):
        appid = TENCENT_SMS_APP_ID  # 自己应用ID
        appkey = TENCENT_SMS_APP_KEY  # 自己应用Key
        sms_sign = TENCENT_SMS_SIGN  # 自己腾讯云创建签名时填写的签名内容（使用公众号的话这个值一般是公众号全称或简称）
        sender = SmsSingleSender(appid, appkey)
        try:
            response = sender.send_with_param(86, self.phone_num, self.template_id, self.template_param_list,
                                              sign=sms_sign)
        except HTTPError as e:
            response = {'result': 1000, 'errmsg': "网络异常发送失败"}
        return respons
```

```python
# urls.py
from django.contrib import admin
from django.urls import path,re_path
from config.views import *

urlpatterns = [
    path('sms/',OperateTenSms.as_view(),name='短信发送接口')
]
```

```python
# views.py
import random
from django.shortcuts import render
from django.http import HttpResponse
from django.views import View
from config.tencent.smsket import SendTenSms


# 腾讯云发送短信接口
class OperateTenSms(View):
    def get(self, request):
        # 实例化接口
        code = random.randrange(1000, 999999)
        send_sms = SendTenSms('接受短信的手机号码', '短信正文模板', [code])
        send_sms.send_sms_single()
        if send_sms.send_sms_single()['result'] == 0:
            return HttpResponse("短信发送成功")
        else:
            return HttpResponse(send_sms.send_sms_single()['errmsg'])

    def post(self, request):
        pass

```

### 发送短信出现问题汇总

#### SSLERROR at /send/sms/

```html
[SSL: CERTIFICATE_VERIFY_FAILED]
```

```python
# 解决方法
import ssl
```

#### 如何灵活的设置短信正文模板ID

```python
# setting.py
# 短信模板
TENCENT_SMS_TEMPLATE = {
    'register': 1313162,
    'login': 1312871,
}
# views.py
import random
from django.shortcuts import render
from django.http import HttpResponse
from django.views import View
from config.tencent.smsket import SendTenSms
from love_language.settings.develop import TENCENT_SMS_TEMPLATE


# 腾讯云发送短信接口
class OperateTenSms(View):
    def get(self, request):
        """
        :param request:
        :return:
        ?tpl=login
        ?tpl=register
        """
        t_id = request.POST.get('template_id')
        # 通过传入的t_id的键去取模板当中的值
        template_id = TENCENT_SMS_TEMPLATE.get(t_id)
        # 当template_id为空的时候
        if not template_id:
            return HttpResponse("短信模板不存在")

        # 实例化接口
        code = random.randrange(1000, 999999)
        send_sms = SendTenSms('接收短信的手机号', template_id, [code])
        send_sms.send_sms_single()
        if send_sms.send_sms_single()['result'] == 0:
            return HttpResponse("短信发送成功")
        else:
            return HttpResponse(send_sms.send_sms_single()['errmsg'])

    def post(self, request):
        pass
```
