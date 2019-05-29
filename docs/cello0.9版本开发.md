1.把 package.json 里 roadhog 版本改为:
```
"roadhog": "^2.5.0-beta.4"
```

2.修改 dashboard 目录下 .webpackrc.js 以改变npm build的输出路径:
```
outputPath: '../dist/',
```

3.修改 config.py
```
MONGODB_HOST = os.getenv('MONGODB_HOST', 'localhost')
```

4.安装mongodb

5.增加docker在本地的监听端口
<a href='https://docs.docker.com/install/linux/linux-postinstall/'>见docker 文档</a>
