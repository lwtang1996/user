# sp工程文件
node:v8.9.4
npm:5.6.0
环境变量：
```
WEBROOT=/
```
本地mongodb数据库：
```
数据库：hostManager
表：service_provider
表里有一条记录：name:'hust',password:'pass'
```
1. cd src
2. npm install
3. npm run build:dev
4. npm run dev


## 笔记
1. mongoose会自动给表名加一个s，通过指定mongoose.model()的第三个参数来确定表的名称
2. 疑问：userModel = await this.ctx.model.User.findOne()，返回的userModel可以直接访问userModel.username，但是不能直接访问userModel.password
3. 

##数据库表
1. alliance
```
{
  init_org_name: //创建联盟的组织名
  org_member:[] //联盟中组织成员
}
```

2. channel
```
{
  alliance_name: //所属联盟名称
  init_org_name: //创建通道的组织名
  channel_name: //通道名
  org_member:[] //通道中组织成员
}
```