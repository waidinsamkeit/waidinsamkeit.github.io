# 数据库表关系之-多对多关系

- 本章内容针对`tortoise-orm`进行多对多关系的数据分析

![Access表ER图](https://pic.rmb.bdstatic.com/bjh/13b7514900a62c2c2f712c334fdf07d0.png)

---

![role角色表](https://pic.rmb.bdstatic.com/bjh/410606c6fbf6e20ff466b07f1ca61689.png)

### 简单的多对多关系介绍

- 如上ER图中看到了我们的三张表：分别是`access`、`role`、`user`(user这张表我没放上去).

> 多对多关系: role角色表的一条记录能够对应另外一张user用户表中的多条记录，同时user表中的一条记录也能对应role表中的多条记录,被称之为我们的多对多关系。

- 在`tortoise-orm`的`ManyToManyRelation`关系中,默认是使用`pk`字段作为关联字段的

```python
class ManyToManyRelation(ReverseRelation[MODEL]):
    """
    Many to many relation container for :func:`.ManyToManyField`.
    """

    def __init__(self, instance: "Model", m2m_field: "ManyToManyFieldInstance") -> None:
        super().__init__(m2m_field.related_model, m2m_field.related_name, instance, "pk")  # type: ignore
        self.field = m2m_field
        self.instance = instance
```



- 表结构如下

```python
# 角色表
class Role(TimestampMixin):
    role_name = fields.CharField(max_length=15, description="角色名称")
    user: fields.ManyToManyRelation["User"] = fields.ManyToManyField("base.User", related_name="role",
                                                                     on_delete=fields.CASCADE)
    access: fields.ManyToManyRelation["Access"] = fields.ManyToManyField("base.Access", related_name="role",
                                                                         on_delete=fields.CASCADE)
    role_status = fields.BooleanField(default=False, description="True:启用 False:禁用")
    role_desc = fields.CharField(null=True, max_length=255, description='角色描述')

    class Meta:
        table_description = "角色表"
        table = "role"
# 用户表
class User(TimestampMixin):
    role: fields.ManyToManyRelation[Role]
    username = fields.CharField(unique=True, null=False, min_length=5, max_length=32, description="用户名")
    password = fields.CharField(null=False,min_length=8,max_length=255)
    mobile_phone = fields.CharField(unique=True, null=False, description="手机号", max_length=11)
    email = fields.CharField(unique=True, null=False, description='邮箱', max_length=32)
    full_name = fields.CharField(null=True, description='姓名', max_length=15)
    is_activate = fields.BooleanField(default=0, description='0未激活 1正常 2禁用')
    is_staff = fields.BooleanField(default=False, description="用户类型 True:超级管理员 False:普通管理员")
    header_img = fields.CharField(null=True, max_length=255, description='用户头像')
    sex = fields.IntField(default=0, null=True, description='0未知 1男 2女')
    login_host = fields.CharField(null=True, max_length=15, description="访问IP")

    # 返回用户名默认
    def __str__(self):
        return self.username

    class Meta:
        table_description = "用户表"
        table = "user"
        
# 权限表
class Access(TimestampMixin):
    role: fields.ManyToManyRelation[Role]
    access_name = fields.CharField(max_length=15, description="权限名称")
    parent_id = fields.IntField(default=0, description='父id')
    scopes = fields.CharField(unique=True, max_length=255, description='权限范围标识')
    access_desc = fields.CharField(null=True, max_length=255, description='权限描述')
    menu_icon = fields.CharField(null=True, max_length=255, description='菜单图标')
    is_check = fields.BooleanField(default=False, description='是否验证权限 True为验证 False不验证')
    is_menu = fields.BooleanField(default=False, description='是否为菜单 True菜单 False不是菜单')

    def __str__(self):
        return self

    class Meta:
        table_description = "权限表"
        table = "access"
```

### 根据ER图进行关系分析

> tortoise-orm维护多对多的表关系才用的是中间表的形式,通过`related_name`来生成表中间表前缀.

- 角色对用户

  - 一个角色可以对应多个用户

    > 系统管理员角色可以对应多个用户： 张三是管理员、李四是管理员、王五也是管理员。多个用户对应的同时都是系统管理员的角色。

> 兄弟们: 以后在更新,torroise-orm这个多对多关系的查询我真是搞得不太明白...
