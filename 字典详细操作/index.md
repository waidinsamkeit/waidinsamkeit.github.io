# Python字典详细操作

字典是另一种可变容器模型，且可存储任意类型对象。

字典的每个键值 **key=>value** 对用冒号 **:** 分割，每个键值对之间用逗号 **,** 分割，整个字典包括在花括号 **{}** 中 ,格式如下所示：

```python
d = {key1 : value1, key2 : value2 }
```

>  键一般是唯一的，如果重复最后的一个键值对会替换前面的，值不需要唯一。

## 访问字典里的值

把相应的键放入熟悉的方括弧，如下实例:

```python
dict = {'Name': 'Zara', 'Age': 7, 'Class': 'First'}
 
print ("dict['Name']: ", dict['Name'])
print ("dict['Age']: ", dict['Age'])
```

如果用字典里没有的键访问数据，会输出错误如下：
```python
dict['Age']:
Traceback (most recent call last):
  File "test.py", line 8, in <module>
    print "dict['Age']: ", dict['Age'] 
TypeError: 'type' object is unsubscriptable
```
## 字典键的特性

字典值可以没有限制地取任何python对象，既可以是标准的对象，也可以是用户定义的，但键不行。

1. 不允许同一个键出现两次。创建时如果同一个键被赋值两次，后一个值会被记住，如下实例：

```python
dict = {'Name': 'Zara', 'Age': 7, 'Name': 'Manni'} 
print ("dict['Name']: ", dict['Name'])
```

## 字典内置的函数、方法
### len()方法

` len()` 函数计算字典元素个数，即键的总数。

- dict: 要计算元素个数的字典

```python
len(dict)
```

```python
dict = {'Name': 'Zara', 'Age': 7};
print ("Length : %d" % len (dict))
```

### str()方法

` str() `函数将值转化为适于人阅读的形式，以可打印的字符串表示。

- dict -- 字典 ，返回字符串

```python
str(dict)
```

```python
dict = {'Name': 'Zara', 'Age': 7};
print ("Equivalent String : %s" % str (dict))
```

###  clear()方法

`clear()` 函数用于删除字典内所有元素

```python
dict.clear()
```

```python
dict = {'Name': 'Zara', 'Age': 7};

print ("Start Len : %d" %  len(dict))
dict.clear()
print ("End Len : %d" %  len(dict))
```

### copy()方法

`copy()` 函数返回一个字典的浅复制。

- 返回一个字典的浅复制。

```python
dict.copy()
```

```python
dict1 = {'Name': 'Zara', 'Age': 7};
 
dict2 = dict1.copy()
print ("New Dictinary : %s" %  str(dict2))
```

**直接赋值和 copy 的区别**

```python
dict1 =  {'user':'runoob','num':[1,2,3]}
 
dict2 = dict1          # 浅拷贝: 引用对象
dict3 = dict1.copy()   # 浅拷贝：深拷贝父对象（一级目录），子对象（二级目录）不拷贝，还是引用,原对象与深拷贝后得对象是两个独立的存在
 
# 修改 data 数据
dict1['user']='root'
dict1['num'].remove(1)
 
# 输出结果
print(dict1)
print(dict2)
print(dict3)
```

### fromkeys()方法

` fromkeys() `函数用于创建一个新字典，以序列 **seq** 中元素做字典的键，**value** 为字典所有键对应的初始值。

- seq -- 字典键值列表。
- value -- 可选参数, 设置键序列（seq）的值。

```python
dict.fromkeys(seq[, value])
```

```python
#!/usr/bin/python
# -*- coding: UTF-8 -*-
 
seq = ('Google', 'Runoob', 'Taobao')
 
dict = dict.fromkeys(seq)
print("新字典为 : %s" %  str(dict))
 
dict = dict.fromkeys(seq, 10)
print("新字典为 : %s"%  str(dict))
```

### get()方法

`get()` 函数返回指定键的值。

- key -- 字典中要查找的键。
- default -- 如果指定键的值不存在时，返回该默认值。

```python
dict.get(key, default=None)
```

```python
#!/usr/bin/python
# -*- coding: UTF-8 -*-
 
seq = ('Google', 'Runoob', 'Taobao')
 
dict = {'Name': 'Runoob', 'Age': 27}

print ("Value : %s" %  dict.get('Age'))
print ("Value : %s" %  dict.get('Sex', "Not Available"))
```

> 注意嵌套字典中无法通过get()方法来获取字典的键

### items()方法

items() 函数以列表返回可遍历的(键, 值) 元组数组。

```python
dict.items()
```

```python
dict = {'Google': 'www.google.com', 'Runoob': 'www.runoob.com', 'taobao': 'www.taobao.com'}
 
print ("字典值 : %s" %  dict.items())
 
# 遍历字典列表
for key,values in  dict.items():
    print (key,values)  
```

### keys()方法

`keys() `函数以列表返回一个字典所有的键。

```python
dict.keys()
```

```python
dict = {'Name': 'Zara', 'Age': 7}

print ("Value : %s" %  dict.keys())
```

### setdefault()方法

`setdefault()` 函数和 `get()`类似, 如果键不存在于字典中，将会添加键并将值设为默认值。

- key -- 查找的键值。
- default -- 键不存在时，设置的默认键值。

```python
dict.setdefault(key, default=None)
```

```python
dict = {'runoob': '菜鸟教程', 'google': 'Google 搜索'}
 
print ("Value : %s" %  dict.setdefault('runoob', None))
print ("Value : %s" %  dict.setdefault('Taobao', '淘宝'))
```

### update()方法

`update()` 函数把字典dict2的键/值对更新到dict里。

- dict2 -- 添加到指定字典dict里的字典。

```python
dict.update(dict2)
```

```python
dict = {'Name': 'Zara', 'Age': 7}
dict2 = {'Sex': 'female' }

dict.update(dict2)
print ("Value : %s" %  dict)
```

### values()方法

`values() `函数以列表返回字典中的所有值。

```python
dict.values()
```

```python
dict = {'Name': 'Zara', 'Age': 7}

print ("Value : %s" %  dict.values())
```


