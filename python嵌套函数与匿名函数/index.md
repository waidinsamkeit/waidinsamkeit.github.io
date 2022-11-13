# Python嵌套函数与匿名函数

> 函数的嵌套调用是在"函数调用中再调用其他函数"。也就是说:函数嵌套允许在一个函数中调用另外一个函数。如下：

```python
name = "Forest"
def change():
    name = "Forest1"

    def change2():
        # global name  如果声明了这句，下面的name改的是最外层的全局变层
        name = "Forest2" #这句注释掉的话,则打印Forest1 
        print("第3层打印", name)

    change2()  # 调用内层函数
    print("第2层打印", name)
change()
print("最外层打印", name)
```

> 函数的查找顺序优先局部变量>全局变量

## 匿名函数

正常情况下我们写的函数如下,对函数声明了cacl的名称

```python
def cacl(x):
    return x**2
b = cacl(3)
print(b)
```

那么匿名函数则不需要对其进行定义

```python
res = map(lambda x:x**2,[1,2,5,6,7,9]) # 只能写三元运算
res = map(lambda x:x**2 if x >10 else x**3,[1,2,5,6,7,9]) # 最复杂写三元运算
# 如果x>10执行x**2 如果x<10 执行x**3
```

- lambda生成匿名函数
- map(func,seq) 就是将函数作用在序列的每个元素上，然后创建由函数返回值组成的列表。
- map(lambda x: x**x)，遍历mylist每个元素，执行lambda函数，并返回一个列表

