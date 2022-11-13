# Nginx配置WSS

## 简单了解一下 WebSocket

现在，很多网站为了实现推送技术，所用的技术都是轮询。轮询是在特定的的时间间隔（如每1秒），由浏览器对服务器发出HTTP请求，然后由服务器返回最新的数据给客户端的浏览器。这种传统的模式带来很明显的缺点，即浏览器需要不断的向服务器发出请求，然而HTTP请求可能包含较长的头部，其中真正有效的数据可能只是很小的一部分，显然这样会浪费很多的带宽等资源。

在这种情况下，HTML5定义了WebSocket协议，能更好的节省服务器资源和带宽，并且能够更实时地进行通讯。

WebSocket一种在单个 TCP 连接上进行全双工通讯的协议。使得客户端和服务器之间的数据交换变得更加简单，允许服务端主动向客户端推送数据。在 WebSocket API 中，浏览器和服务器只需要完成一次握手，两者之间就直接可以创建持久性的连接，并进行双向数据传输。
简单点说，WebSocket 就是减小客户端与服务器端建立连接的次数，减小系统资源开销，只需要一次 HTTP 握手，整个通讯过程是建立在一次连接/状态中，也就避免了HTTP的非状态性，服务端会一直与客户端保持连接，直到你关闭请求，同时由原本的客户端主动询问，转换为服务器有信息的时候推送。当然，它还能做实时通信、更好的二进制支持、支持扩展、更好的压缩效果等这些优点。

## ws 和 wss

Websocket使用 ws 或 wss 的统一资源标志符，类似于 HTTP 或 HTTPS ，其中 wss 表示在 TLS 之上的 Websocket ，相当于 HTTPS 了。如：

```html
ws://example.com/echo
wss://example.com/echo
```

默认情况下，Websocket 的 ws 协议使用 80 端口；运行在TLS之上时，wss 协议默认使用 443 端口。其实说白了，wss 就是 ws 基于 SSL 的安全传输，与 HTTPS 一样样的道理。

如果你的网站是 HTTPS 协议的，那你就不能使用 `ws://` 了，浏览器会 block 掉连接，和 HTTPS 下不允许 HTTP 请求一样

## Nginx配置webscoket

```nginx
upstream websocket {
        server 127.0.0.1:1132; # wss接口

} 
# upstream 的位置你们应该都知道放在哪儿
location /websocket { 
    proxy_pass http://websocket; 
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";}
```

- location部分一般根据开发的接口来
- proxy_pass [http://websocket](http://websocket/); 表示代理到websocket

**重启nginx**
```shell
nginx -s reload 
```
