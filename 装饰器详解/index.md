# Python装饰器详解

本博客的内容要点
1. 什么是函数闭包(function closure)?
2. 什么是语法糖(Syntactic sugar)?
3. 什么是装饰器(decorator)?

## 什么是函数闭包(function closure)？
> 看下方的一段代码

1. 函数的主要功能(输出奇数)和辅助功能(统计函数执行时间)全部都放在一个函数中,一旦要对其进行修改,如果修改错误就会导致出现Bug,导致该函数不可用。
2. 不方便修改
3. 我们的目的是为了能不能在直接调用主要函数的同时调用辅助函数？
```python
import time
def  print_odds():
    """
    输出0-100之间所有的奇数并且返回函数的执行时间
    """
    # 查找并输出所有奇数
    start_time = time.clock()
    for i in range(100):
        if i % 2 == 1:
            print(i)
    end_time = time.clock()
    print("函数执行时间为 {}".format(end_time - start_time))


if __name__ == '__main__':
    print_odds()
```
接着上面的`3`我们能不能直接调用主要函数的同时调用辅助函数？

**该段代码的缺点**
1.我们期望的是直接调用主要函数,同时执行辅助函数,而并不是把辅助函数写在前面。

2.并且对于使用者来说`count_time`函数是不应该被看到的,在可读性上与我们的期望相反
```python
import time
def  count_time(func): # 参数传入一个函数
    """
    输出0-100之间所有的奇数并且返回函数的执行时间
    """
    # 查找并输出所有奇数
    start_time = time.clock()
    func() #通过调用传入的函数进行执行
    end_time = time.clock()
    print("函数执行时间为 {}".format(end_time - start_time))


def print_odds():
    for i in range(100):
        if i % 2 == 1:
            print(i)

if __name__ == '__main__':
    count_time(print_odds) # 传入需要进行统计时间的函数
```
所以,究竟什么是函数的闭包呢？
- 一个函数参数和返回值都是函数
    - 用于增强函数功能
    - 面向切面编程(AOP)

**究竟如何理解函数闭包**
1. `count_time_wrapper`传入的是一个函数,其`return`的`improved_func`也是一个函数
2. 在返回的函数中既执行了主要函数`func`也执行了统计函数的功能
3. 闭包函数本身就是一个函数,闭包函数的返回值函数是对传入函数的增强函数
4. 很方便的解耦,只需要在主要函数中写主要函数 在辅助函数中写辅助函数即可
```python
import time
def  count_time_wrapper(func): # 参数传入一个函数
    """
    输出0-100之间所有的奇数并且返回函数的执行时间
    """
    def improved_func():
        # 查找并输出所有奇数
        start_time = time.clock()
        func() #通过调用传入的函数进行执行
        end_time = time.clock()
        print("函数执行时间为 {}".format(end_time - start_time))
    return improved_func


def print_odds():
    for i in range(100):
        if i % 2 == 1:
            print(i)




if __name__ == '__main__':
    # 通过调用闭包函数对print_odds函数进行增强
    # 如果不调用闭包函数,其原本功能就是单纯的执行print_odds
    """
    1. 当调用count_time_wrapper后会返回一个新的函数
    2. 返回的函数也命名为print_odds,但此时的print_odds函数是被增强过的函数
    当然你也可以取名为new_print_odds
    """
    print_odds = count_time_wrapper(print_odds)
    print_odds()
```

## 什么是语法糖(Syntactic sugar)?
- 指的是计算机语言中添加的某种语法,这种语法`对语言的功能没有影响`,但是更方便程序员使用。
- 语法糖没有增加新功能,只是更方便的写法
- 语法糖可以完全等价的装换为原本非语法糖的代码
- 装饰器在`第一次`调用被装饰的函数时进行增强

**强调一下装饰器第一次调用**
1. 装饰器在第一次调用之前才会增强,如果没有被调用则不会增强。
2. 装饰器的增强只增强一次,但是对于增强过得函数可以调用很多次。


```python
import time
def  count_time_wrapper(func): # 参数传入一个函数
    """
    输出0-100之间所有的奇数并且返回函数的执行时间
    """
    def improved_func():
        # 查找并输出所有奇数
        start_time = time.clock()
        func() #通过调用传入的函数进行执行
        end_time = time.clock()
        print("函数执行时间为 {}".format(end_time - start_time))
    return improved_func

@count_time_wrapper # 装饰在print_odds函数上
def print_odds():
    for i in range(100):
        if i % 2 == 1:
            print(i)
if __name__ == '__main__':
    print_odds()
```
**对于有返回值和参数的函数**
问题1. 对于有返回值的函数和带参数的函数,不能正常返回,但是可以进行增强

问题2. 对于含有参数的函数调用增强后,并不能成功的接收参数
```python
import time
def  count_time_wrapper(func): # 参数传入一个函数
    """
    输出0-100之间所有的奇数并且返回函数的执行时间
    """
    def improved_func(*args,**kwargs):
        # 查找并输出所有奇数
        start_time = time.clock()
        result = func(*args,**kwargs) # 记录一下传入func()函数的返回值,也就是count_odds的return的返回值,也就是说增强函数的返回值就是原函数的返回值,并且原函数的参数就是增强函数的参数
        end_time = time.clock()
        print("函数执行时间为 {}".format(end_time - start_time))
        return result

    return improved_func



def count_odds(lim=100):
    cnt=0
    for i in range(lim):
        if i % 2 == 1:
            cnt+=1
    return cnt

if __name__ == '__main__':
    print(count_odds(lim=100))
    new_count_odds = count_time_wrapper(count_odds)
    """
    1. 因为我们调用的count_odds是增强过后的参数,improved_func增强函数中并没有
    lim的参数,只需要在调用improved_func函数的时候接收传入的函数即可
    """
    print(new_count_odds(lim=10000000))
```
