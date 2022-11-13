# Linux Shell 文本处理工具集锦-find篇

#### 1 查找txt和pdf文件

```shell
find . ( -name "*.txt"-o -name "*.pdf") -print
```

#### 2 正则方式查找.txt和pdf

```shell
find . -regex  ".*(.txt|.pdf)$"
```

#### 3 否定参数

查找所有非txt文本

```shell
find . ! -name "*.txt" -print
```

#### 4 指定搜索深度

打印出当前目录的文件（深度为1）

```shell
find . -maxdepth 1 -type f
```

#### 5 定制搜索

##### 按类型搜索：

```shell
find . -type d -print  # 只列出所有目录-type f 文件 / l 符号链接
```

##### 按时间搜索：

```shell
-atime 访问时间 (单位是天，分钟单位则是-amin，以下类似）
-mtime 修改时间 （内容被修改）
-ctime 变化时间 （元数据或权限变化）
```

##### 最近7天被访问过的所有文件：

```shell
find . -atime 7 -type f -print
```

##### 按大小搜索：

w字 k M G

##### 寻找大于2k的文件

```shell
find . -type f -size +2k
```

##### 按权限查找：

```shell
find . -type f -perm 644-print # 找具有可执行权限的所有文件
```

##### 按用户查找：

```shell
find . -type f -user weber -print #  找用户weber所拥有的文件
```

#### 6 找到后的后续动作

删除：

##### 删除当前目录下所有的swp文件：

```
find . -type f -name "*.swp"-delete
```

##### 执行动作（强大的exec）

```
find . -type f -user root -exec chown weber {} ; //将当前目录下的所有权变更为weber
```

注：{}是一个特殊的字符串，对于每一个匹配的文件，{}会被替换成相应的文件名；

##### eg：将找到的文件全都copy到另一个目录：

```
find . -type f -mtime +10-name "*.txt"-exec cp {} OLD ;
```

#### 7 结合多个命令

tips: 如果需要后续执行多个命令，可以将多个命令写成一个脚本。然后 -exec 调用时执行脚本即可；

```
-exec ./commands.sh {} ;
```

##### -print的定界符

默认使用' '作为文件的定界符；

-print0 使用''作为文件的定界符，这样就可以搜索包含空格的文件；

