# Python-方法反射

## 什么是反射?

反射的概念是由Smith在1982年首次提出的，主要是指程序可以访问、检测和修改它本身状态或行为的一种能力（自省）。这一概念的提出很快引发了计算机科学领域关于应用反射性的研究。它首先被程序语言的设计领域所采用,并在Lisp和面向对象方面取得了成绩。

**简而言之** ：反射就是通过字符串的去操作对象中的属性

## 反射的方法

`getattr()` : 用于返回一个对象属性值。

`hasattr()`: 用于判断对象是否包含对应的属性

`delattr()`: 用于删除属性。

`setattr()`: 用于设置属性值，该属性不一定是存在的。

## 实例化对象

```python
class Person():
	def __init__(self,name,age):
		self.name = name
		self.age = age
	def walk(self):
		print("%s is walking..."% self.name)
    
def talk(self):
	print("%s 调用成功" % self.name)
p = Person("Hopc",'22')

```

### `getattr()`方法

```python
a = getattr(p,"age")
print("getattr调用: ",a)
getattr调用:  22 # 此为打印结果

# 如果没有age这这个属性则会报错
AttributeError: 'Person' object has no attribute 'age'
```

### `hasattr()`方法

```python
if hasattr(p,"name2"): # 通过hasattr判断p实例中的name2属性
	print("successSecret")
else:
	print("None")
```

### `setattr`方法

```python
"static属性"
setattr(p,"sex","Famale")
print(p.sex)
Famale # 此为打印结果

"设置一个方法"
setattr(p,"talk",talk)
p.talk(p) # 需要再把p对象传入才能调用
Hopc 调用成功 # 此为打印结果

"对类直接进行绑定"
setattr(Person,"talks",talk)
p.talks()
Hopc is walking...
```

### `delattr`方法

```python
del p.age
p.age()
AttributeError: 'Person' object has no attribute 'age'
```



