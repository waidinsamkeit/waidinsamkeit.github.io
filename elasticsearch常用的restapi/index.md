# Elasticsearch常用的RESTAPI

## GET方式
### 1.0 查询Elastic节点状态
```shell
curl -v 192.168.10.1:9200/_cat/health?v
```

### 1.1 初始化索引
```shell
# 在创建索引之前 对索引进行初始化操作,指定shards数量和replicas数量
curl -XPUT 'http://192.168.10.1:9200/library' -d {
    "settings":{
        "index":{
            "number_of_shards":5,
            "number_of_replicas":1,   
        }
    }
}
```
### 1.2 查看索引信息
```shell
GET 地址/索引名称/_settings
curl -X GET http://192.168.10.1:9200/test/_settings 
```
### 1.3 查看多个索引信息
```shell
GET 地址/索引名称，索引名称/_settings 
curl -X GET http://192.168.10.1:9200/test,test2/_settings
```
### 1.4 查询所有索引的信息
```shell
curl -X GET http://192.168.10.1:9200/_all/_settings
```
### 1.5 查看所有索引列表
```shell
curl -X GET 'http://192.168.10.1:9200/_cat/indices?v='
```
### 1.6 查看索引相关信息
```shell
1.根据id查看文档信息
get 地址/索引名称/type名称/文档id
curl -X GET http://192.168.10.1:9200/test10/people/1

2.通过source获取指定字段
get /索引名称/type名称/文档id?_source=字段
curl -X GET http://192.168.10.1:9200/test10/people/1?_source=title
```

## PUT方式
### 1.0 创建索引
```shell
# 创建一个索引名称为test9的索引
curl -X PUT http://192.168.10.1:9200/test9/ 
{
"acknowledged": true,
"shards_acknowledged": true
}
```
### 1.1 创建索引及类型和文档
```shell
PUT 地址/索引名称/type名称/文档id
curl -X PUT http://192.168.10.1:9200/test10/people/1 -d '{
	"title": "test10"
}' 
```
### 1.2 创建索引及类型,不设置文档ID（因为会自动设置文档ID）
```shell
POST 地址/索引名称/type名称/ 
curl -X POST http://192.168.10.1:9200/test11/people/ -d 
'{
	"title": "test11"
}
```
### 1.3 更新同一id下的信息
```shell
PUT 地址/索引名称/type名称/文档id
curl -X PUT http://192.168.10.1:9200/test10/people/1 -d 
'{
	"title": "test10"
}'
```
### 1.4 更新指定字段
```shell
POST 地址/索引名称/type名称/文档id/_update
curl -X POST  http://192.168.10.1:9200/test10/people/1 -d 
'{
	"doc":{
		"title": "testt12"
	}
}'
```
## DELETE
### 1.0 delete 地址/索引名称
```shell
curl -X DELETE  http://192.168.10.1:9200/test10
```

### 1.1 删除文档
```shell
delete 地址/索引名称/type名称/文档id
curl -X DELETE  http://192.168.10.1:9200/test10/people/1
```

