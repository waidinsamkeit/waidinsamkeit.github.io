# Ansible-Tasks任务控制


## Ansible-with_items

- 通过`with_items`进行循环

**语法**

- `{{ item }}`: 为读取`with_items`的固定写法
- `with_items`: 是一个列表,下面可以有多个不同的内容

```yaml
- hosts: test
  remote_user: root
  gather_facts: false
  vars_files: ./public_vars.yaml
  tasks:
    - name: Services Http start
      service: name={{ item }} state=started
      with_items:
        - httpd
        - firewalld
```

### 普通写法

```yaml
- hosts: test
  remote_user: root
  gather_facts: false
  vars_files: ./public_vars.yaml
  tasks:
    - name: Set authorized_key in dest hosts
      authorized_key:
        user: root
        key: "{{ lookup('file', '/root/.ssh/id_rsa.pub') }}"
      register: result_auth_info
      tags: authorized_key_hosts
    - name: Install httpd
      yum: name="httpd" state=present
    - name: Services Http start
      service: name={{ item }} state=started
      with_items:
        - httpd
        - firewalld
```

### 使用变量的循环写法

```yaml
- hosts: test
  remote_user: root
  gather_facts: true
  tasks:
    - name: Install httpd
      yum: name={{ packages }} state=present
      vars:
        packages:
          - httpd
          - pcre-devel
```

### 使用变量字典循环方式批量创建用户

```yaml
- hosts: test
  remote_user: root
  gather_facts: false
  vars_files: ./public_vars.yaml
  tasks:
    - name: Add Users
      user: name={{ item.name }} groups={{ item.groups }} state=present
      with_items:
        - { name: "alex",groups: "test"}
        - { name: "alex1",groups: "test"}
```

### 使用变量字典循环拷贝文件

```yaml
- hosts: test
  remote_user: root
  gather_facts: false
  tasks:
    - name: Add Users
      copy: 
        src: '{{ item.src }}'
        dest: '{{ item.dest }}' 
        mode:  '{{ item.mode }}'
      with_items:
        - { src: "./1.txt", dest: "/tmp", mode: 0644}
        - { src: "./2.txt", dest: "/tmp", mode: 0644}
```

## Ansible-Handlers

- 通过`notify`进行监控->通过`handlers`触发

> 关于`Handler`的一些小注意事项
>
> 1. 无论你拥有多少个notify通知相同的`handlers`,`handlers`仅仅会在所有tasks正常执行完成后运行一次
> 2. 只有tasks发生改变了才会通知`handlers`,没有改变则不会触发`handlers`
> 3. 不能使用`handlers`替代tasks,因为handlers是一个特殊的tasks
> 4. `notify`的名称要与`handlers`的名称一致

```yaml
- hosts: test
  remote_user: root
  gather_facts: false
  tasks:
    - name: Set authorized_key in dest hosts
      authorized_key:
        user: root
        key: "{{ lookup('file', '/root/.ssh/id_rsa.pub') }}"
      register: result_auth_info
      tags: authorized_key_hosts
    - name: Install httpd
      yum: name="httpd" state=present
      notify: Debug Message
      register: install_info
  handlers:
    - name: Debug Message
      debug: 
        msg: '{{install_info}}'
```

## Ansible-Tags

> 根据`playbook`中的指定标签的内容进行执行、调试等操作.

- 对一个tasks指定一个tags标签
- 对一个tasks指定多个tags标签(真没啥意义,感觉不实用。)
- 对多个tasks指定一个标签

### 执行指定Tags标签内容

- `tags`: 指定标签名称

```yaml
- hosts: test
  remote_user: root
  gather_facts: false
  tasks:
    - name: Set authorized_key in dest hosts
      authorized_key:
        user: root
        key: "{{ lookup('file', '/root/.ssh/id_rsa.pub') }}"
      register: result_auth_info
      tags: 
        - authorized_key_hosts
```

- `-t`: 通过`-t`选项参数进行选择指定标签进行运行

```shell
ansible-playbook 1.yaml -t authorized_key_hosts -i hosts
```

### 跳过指定标签执行其他内容

- 跳过指定的标签内容,执行标签内容外的其他内容

```shell
ansible-playbook 1.yaml --skip-tags "authorized_key_hosts" -i hosts
```



## Ansible-Include

> 一个可以将`playbook`简单的进行复用的一个功能!

### 简单应用

**编写一个重启http服务的配置**

```yaml
- name: Start HTTP
  service: name=httpd state=restarted
```

**PlayBook中的应用**

- `include`： 查找的文件目录为你当前所在的目录,可以通过`pwd`命令进行查看。

```yaml
- hosts: test
  remote_user: root
  gather_facts: true
  tasks:
    - name: Set authorized_key in dest hosts
      authorized_key:
        user: root
        key: "{{ lookup('file', '/root/.ssh/id_rsa.pub') }}"
      register: result_auth_info
      tags: authorized_key_hosts
    - name: Install HTTP
      yum: name="httpd" state=present
    - name: Restart HTTP
      include: starthttp.yaml  # 包含你刚刚写的配置
      #  include_tasks: starthttpd.yaml  # 两种写法都可以
```

### 多个playbook合成

> 如果你写的playbook存在多个文件,你只想执行一个playbook,那么可以使用`import_playbook`。

- `import_playbook`: 引入你需要的playbook文件,必须是一个完整的`playbook`文件

```yaml
- import_playbook: ./tasks1.yaml
- import_playbook: ./tasks2.yaml
```

## Ansible-ignore_errors

> 在Ansible中进行错误的忽略

```yaml
- hosts: test
  remote_user: root
  gather_facts: true
  tasks:
    - name: Set authorized_key in dest hosts
      authorized_key:
        user: root
        key: "{{ lookup('file', '/root/.ssh/id_rsa.pub') }}"
      register: result_auth_info
      tags: authorized_key_hosts
    - name: Ingoring
      command: /bin/false
      ignore_errors: yes
```

**输出结果大概是这样的**

```shell
PLAY [test] 
TASK [Ingoring] ***************************************************************************************************************************************************************************************************************************fatal: [10.1.6.5]: FAILED! => {"changed": true, "cmd": ["/bin/false"], "delta": "0:00:00.026834", "end": "2022-08-29 02:17:00.089749", "msg": "non-zero return code", "rc": 1, "start": "2022-08-29 02:17:00.062915", "stderr": "", "stderr_lines": [], "stdout": "", "stdout_lines": []}
...ignoring

PLAY RECAP ********************************************************************************************************************************************************************************************************************************10.1.6.5                  : ok=3    changed=1    unreachable=0    failed=0    skipped=0    rescued=0    ignored=1   
```

## Ansible-changed_when

> 通常用于失败后所执行一些操作: 例如失败后强制调用`handlers`、失败后强制删除等.
>
> 通常而言，如果任务失败并且play在该主机上中止，则收到play中早前任务通知的处理程序将不会运行。如果在play中设置`force_handlers: yes`关键字，则即使play因为后续任务失败而中止也会调用被通知的处理程序。

### force_handlers

```yaml
- hosts: test
  remote_user: root
  gather_facts: true
  force_handlers: yes # 强制调用handlers
  tasks:
    - name: Set authorized_key in dest hosts
      authorized_key:
        user: root
        key: "{{ lookup('file', '/root/.ssh/id_rsa.pub') }}"
      register: result_auth_info
      tags: authorized_key_hosts
    - name: Test False
      command: echo "This is Force "
      notify: Restart HTTP service
    - name: Install available
      yum: name=dbdbdb state=present
  handlers:
    - name: Restart HTTP service
      service: name=httpd state=restarted
```

虽然任务是失败的,但是依旧调用了最后执行的`handlers`

```shell
[root@localhost ansible_linux]# ansible-playbook 1.yaml -i hosts 
TASK [Install available] ******************************************************************************************************************************************************************************************************************fatal: [10.1.6.57]: FAILED! => {"changed": false, "failures": ["No package dbdbdb available."], "msg": "Failed to install some of the specified packages", "rc": 1, "results": []}

RUNNING HANDLER [Restart HTTP service] ****************************************************************************************************************************************************************************************************changed: [10.1.6.57]
```

### changed_when

> 当前命令确保不会对被控端主机进行变更的时候,可以使用`changer_when`来进行忽略提示中的`changed`

```yaml
- hosts: test
  remote_user: root
  gather_facts: true
  force_handlers: yes # 强制调用handlers
  tasks:
    - name: Set authorized_key in dest hosts
      authorized_key:
        user: root
        key: "{{ lookup('file', '/root/.ssh/id_rsa.pub') }}"
      register: result_auth_info
      tags: authorized_key_hosts
    - name: Check HTTP
      shell: ps -aux | grep httpd
      changed_when: false  # 这样ps -aux | grep httpd 再也不会提示changed
    - name: Message
      debug:
        msg: "{{ ansible_distribution }}"
```

> `changed_when`还可以检查`tasks`任务返回的结果

- 查找输出当中是否存在`successfuly`如果没有则不执行

```yaml
- hosts: test
  remote_user: root
  gather_facts: true
  tasks:
    - name: Set authorized_key in dest hosts
      authorized_key:
        user: root
        key: "{{ lookup('file', '/root/.ssh/id_rsa.pub') }}"
      register: result_auth_info
      tags: authorized_key_hosts
    - name: Install Nginx
      yum: name=nginx  state=present
      notify: Start Nginx
    - name: Check Nginx Configure 
      command: /usr/sbin/nginx -t 
      register: check_nginx
      changed_when: (check_nginx.stdout.find('successful'))
  handlers:
    - name: Start Nginx
      service:  name=nginx state=restarted
```



