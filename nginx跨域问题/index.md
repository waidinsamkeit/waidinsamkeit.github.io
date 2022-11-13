# 有关于Nginx跨域问题


项目中使用Nginx服务实现文件的访问，由于和tomcat的接口不是一个域，前端VUE做了图片处理，导致出现跨域问题

```nginx
location /file {
            alias  /kjc;
            add_header Access-Control-Allow-Origin *;
            add_header Access-Control-Allow-Credentials true;
}
```

添加跨域配置：           

```nginx
add_header Access-Control-Allow-Origin *;
add_header Access-Control-Allow-Credentials true;
```


