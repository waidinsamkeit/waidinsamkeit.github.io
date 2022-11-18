# Ansible-vars

## 1.0 Ansible怎么定义变量
- 通过`playbook`中的`play`进行变量的定义
- 通过`inventory`主机清单进行变量定义
- 通过执行`playbook`的时候增加`-e`选项进行定义
### 1.0.1 通过Playbook中的vars定义变量
- 在`Playbook`中通过写入`vars`语法定义变量
- 通过`{{变量名}}`进行引用!
```yaml
- hosts: test
  remote_user: root
  vars: 
    - httpd_package: httpd
  tasks:
    - name: Install DepencyEnvorment
      yum:
        name: {{httpd_package}}
        state: present
        update_cache: yes
```

### 1.0.2 通过定义变量文件进行使用
- 定义一个名字为`public_vars.yaml`的变量配置文件
```shell
depence: ['openssl-devel','pcre-devel','zlib-devel']
```
> 注意: 当你引用了变量文件中的变量,请在读取变量的时候增加双引号`""`
```yaml
- hosts: test
  remote_user: root
  vars_files: 
    - ./public_vars.yaml
    - ./public_vars2.yaml # 如果是多个变量的话
  tasks:
    - name: "Install De"
      yum: 
        name: "{{depence}}" # 通过双引号去引入变量内容,不然会报错
        state: present
        update_cache: no
```

### 1.0.3 通过编辑`inventory`主机清单进定义
- 这种方法一般用的很少
```shell
[test]
10.1.6.205
[test:vars]
file_name=group_sys
```
> 官方推荐的方法: 在项目目录中创建两个变量目录`host_vars`和`group_vars`
#### group_vars
```shell
mkdir host_vars; mkdir group_vars
```
创建一个同名文件,用于写入变量内容
> 必须与hosts清单中的组名保持一致,如果不同名会报错。但是如果你想要多个配置文件使用同一个组中的变量,只需要在`group_vars/all`新建一个`all`文件,所有组可用!
```shell
[root@bogon ~]# cat group_vars/test 
file_name: group_sys
```

#### host_vars
- 在`host_vars`中创建一个文件,文件名与`inventory`清单中的主机名称要保持完全一致,如果是IP地址,则创建相同IP地址的文件即可
```shell
vim host_vars/10.1.6.205
[root@bogon ~]# cat host_vars/10.1.6.205 
file_name: group_sys
```


