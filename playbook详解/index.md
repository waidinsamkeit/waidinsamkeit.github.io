# Ansible-Playbook

- `playbook`是由一个或多个`"play"`组成的列表
-  `playbook`的主要功能在于将预定义的一组主机，装扮成事先通过ansible中的task定义好的角色。  
- Task实际是调用ansible的一个module，将多个play组织在一个`playbook`中，  即可以让它们联合起来，按事先编排的机制执行预定义的动作
- `Playbook`采用`YAML`语言编写

```yaml
---
- hosts: test # 指定主机列表
  remote_user: root # 远程操作以什么身份执行
  tasks:
    - name: Install Redis  # 提示字段,表示当前处于什么进度
      command:  install redis # 当前执行的具体命令操作
```

## 1.0 PlayBook核心元素

- `Hosts`：playbook中的每一个play的目的都是为了让特定主机以某个指定的用户身份执行任务,hosts用于指定要执行指定任务的主机，须事先定义在主机清单中.
  - [详细请看](https://cdn.mletter.cn/ansible%E5%9F%BA%E7%A1%80%E5%90%88%E9%9B%86/#203-ansible%E7%9A%84host-pattern)
- `remote_user`:  可用于Host和task中。也可以通过指定其通过sudo的方式在远程主机上执行任务，其可用于play全局或某任务.此外，甚至可以在sudo时使用sudo_user指定sudo时切换的用户.
- `varniables`: 内置变量或自定义变量在playbook中调用
- `Templates模板 `: 可替换模板文件中的变量并实现一些简单逻辑的文件
- `Handlers和notify`: 结合使用，由特定条件触发的操作，满足条件方才执行，否则不执行
- `tags`: 指定某条任务执行，用于选择运行playbook中的部分代码.

```shell
ansible-playbook -C hello.yaml 
```
- -C 选项检查剧本是否成功,并不实际执行

### 1.0.1 忽略错误信息
也可以使用`ignore_errors`来忽略错误信息

```yaml
tasks:
 - name: run this 
   shell: /usr/bin/ls || /bin/true 
   ignore_errors: True
```

### 1.0.2 常用选项

- `--check`: 只检测可能会发生的改变,但是不会执行
- `--list-hosts`: 列出运行任务的主机
- `--limit`: 主机列表,只针对主机列表中的主机执行
- `-v`: 显示过程
- `--list-tasks`: 查看任务列表

```shell
ansible-playbook hello.yaml  --check
ansible-playbook hello.yaml  --list-hosts
ansible-playbook hello.yaml  --limit 10.1.6.111
```

## 2.0 Handlers和notify

> 由于playbook执行会有次序问题,所以当出现次序问题的时候,可以使用handlers结合notify

- `Handlers`: 是`task`列表,这些task与前述的task没有本质的区别,用于当不同的资源发生变化的时候,才会采取一定的操作.
- `Notify`: 此action可以用在每个play的最后被触发,这样可以避免多次有改变的发生时每次都执行指定的操作,仅仅在所有变化发生完后,一次性执行制定操作,在notify中列出的操作称为`hendler`，也就是notify中定义的操作.

> `Handlers`和`notify`可以写多个

```yaml
---
- hosts: test
  remote_user: root
  tasks:
    - name: "create new file"
      file: name=/data/newfile state=touch
    - name: "create new user"
      user: name=test2 system=yes shell=/sbin/nologin
    - name: "install httpd"
      yum:   name=httpd state=installed
      notify: restart service  # 表示执行完yum操作以后需要执行handlers的操作
    - name: "copy log"
      copy: src=/var/log/httpd/error_log   dest=/data
  handlers:
    - name: restart service 
      service: name=httpd state=restarted
```

## 3.0 PlayBook的tags使用

- 给特定的内容打上tags可以单独的执行标签内容

```yaml
---
- hosts: test
  remote_user: root
  tasks:
    - name: "create new file"
      file: name=/data/newfile state=touch
      tags: newfile
    - name: "create new user"
      user: name=test2 system=yes shell=/sbin/nologin
      tags: newuser
    - name: "install httpd"
      yum:   name=httpd state=installed
      notify: restart service  # 表示执行完yum操作以后需要执行handlers的操作
    - name: "copy log"
      copy: src=/var/log/httpd/error_log   dest=/data
  handlers:
    - name: restart service 
      service: name=httpd state=restarted
```



```shell
ansible-playbook -t newfile test.yaml # 表示只执行newfile标签的动作
ansible-playbook -t newfile,newuser test.yaml # 表示只执行newfile标签的动作
```





## 4.0 PlayBook中变量的使用

- 变量名：仅能由字母、数字和下划线组成，且只能以字母开头
- 变量的来源
  - 通过`setup`模块
  - 在`/etc/ansible/hosts`中定义

> 1. 普通变量：主机组中的主机单独定义,优先级高于公共变量
> 2. 公共变量：针对主机组所有主机定义统一变量
> 3. 通过命令行指定变量： 优先级最高



### 4.0.1 通过命令行指定变量

```yaml
---
- hosts: test
  remote_user: root
  tasks:
    - name: "create new file"
      file: name=/data/{{filename}} state=touch
      tags: newfile
      
ansible-playbook -e 'filename=app1'  # /data/app1
```

### 4.0.2 在playbook中定义

```yaml
# 在playbook中定义
---
- hosts: test
  remote_user: root
  vars:
   - filename: app1
  tasks:
    - name: "create new file"
      file: name=/data/{{filename}} state=touch
      tags: newfile
```

### 4.0.3 通过setup模块获取变量

```shell
ansible setup facts 远程主机的所有变量都可直接调用 (系统自带变量)
setup模块可以实现系统中很多系统信息的显示
ansible all -m setup -a 'filter="ansible_nodename"'     查询主机名
ansible all -m setup -a 'filter="ansible_memtotal_mb"'  查询主机内存大小
ansible all -m setup -a 'filter="ansible_distribution_major_version"'  查询系统版本
ansible all -m setup -a 'filter="ansible_processor_vcpus"' 查询主机cpu个数
```

### 4.0.4 在hosts中定义变量

- 定义主机组单独的变量

```shell
[test]
192.168.1.1 http_port=81
192.168.1.2 http_port=82
---
- hosts: test
  remote_user: root
  tasks:
    - name: "create new file"
      hostname: name=www{{http_port}}.baidu.com
```

- 定义公共变量

```shell
# 针对test主机组当中的所有主机都有效
[test:vars]
nodename=www
domain=baidu.com
```

### 4.0.5 通过文件加载变量

```yaml
# vars.yaml
filename: applications
# playbook.yaml
- hosts: test
  remote_user: root
  vars_files:
    - vars.yaml
  tasks:
    - name: "create new file"
      file: name=/data/{{filename}}
```

## 5.0 模板Templates

- 采用`Jinja2`语言，使用字面量，有下面形式
- 数字：整数，浮点数
  - 列表：[item1, item2, ...]
  - 元组：(item1, item2, ...)
  - 字典：{key1:value1, key2:value2, ...}
  - 布尔型：true/false
- 算术运算：+, -, *, /, //, %, **
- 比较操作：==, !=, >, >=, <, <=
- 逻辑运算：and，or，not
- 流表达式：For，If，When

```shell
# For more information on configuration, see:
#   * Official English Documentation: http://nginx.org/en/docs/
#   * Official Russian Documentation: http://nginx.org/ru/docs/

user nginx;
worker_processes {{ansible_processor_vcpus**2}}; # 例如,你可以将nginx核心数动态的设置为主机的CPU数量
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;
```

### 5.0.1 When语法

- 条件测试:如果需要根据变量、facts或此前任务的执行结果来做为某task执行与否的前提时要用到条件测试,
  通过when语句实现，在task中使用，jinja2的语法格式
- 在task后添加when子句即可使用条件测试；when语句支持Jinja2表达式语法

> 当`ansible_distribution`=CentOS的时候才会去执行template

```yaml
---
- hosts: test
  remote_user: root
  tasks:
    - name: "Install Nginx"
      yum: name=nginx 
    - name: Config conf
      template: src=/templates/nginx.conf.j2 dest=/etc/nginx/nginx.conf
      when: ansible_distribution == "CentOS"
    - name: start nginx
      service: name=nginx state=started enabled=yes
```

### 5.0.2 With_item

- 迭代写法

```yaml
---
- hosts: test
  remote_user: root
  tasks:
    - name: "Create new file"
      file: name=/data/{{items}} state=touch
      with_items:
        - app1
        - app2
        - app3
```

- 迭代嵌套子变量

```yaml
- hosts: test
  remote_user: root
  tasks:
    - name: "Create new file"
      file: name=/data/{{item.name}}_{{item.date}} state=touch
      with_items:
        - {name: 'app1', date: '2022'}
```





### 5.0.3 for循环

```yaml
---
- hosts: test
  remote_user: root
  vars:
    ports:
      - 81
      - 82
      - 83
  tasks:
    - name: copy template
      template: src=/root/templates/for.j2 dest=/data/for.conf
# 或者
---
- hosts: test
  remote_user: root
  vars:
    ports:
      - listen:81
      - listen:82
      - listen:83
  tasks:
    - name: copy template
      template: src=/root/templates/for.j2 dest=/data/for.conf
# 或者
---
- hosts: test
  remote_user: root
  vars:
    config:
      - host1:
        port: 81
        name: host1.do.com
        rootdir: /root/     
  tasks:
    - name: copy template
      template: src=/root/templates/for.j2 desc=/data/for.conf
```

> 创建一个模板文件

```jinja2
{%for i in ports%}
server {
 listen {{i}}
}
{%endfor%}
# 或者
{%for i in ports%}
server {
 listen {{i.listen}}
}
{%endfor%}
# 或者
{%for i in ports%}
server {
 listen {{ i.port }}
 name  {{ i.name }}
}
{%endfor%}
```

### 5.0.4 if判断

```jinja2
{%for i in ports%}
server {
 listen {{ i.port }}
 {% if i.name is defind %}
 name  {{ i.name }}
 {% endif %}
}
{%endfor%}a
```
