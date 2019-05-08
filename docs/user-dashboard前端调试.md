所有步骤适用于master分支

### copy operator部分代码
1.新建user文件夹,把*cello/src/operator-dashboard/static/dashboard*目录下除**node_modules**的其它文件和文件夹拷贝到user文件夹下。

2.删除*user/src*目录下的所有文件。

### copy user前端部分代码
把*cello/src/user-dashboard/src/app/assets/src*目录下所有文件和文件夹拷贝到*user/src*下。

### 适当修改
#### user目录下
1.把**package.json**里roadhog版本改为:
```
"roadhog": "^2.5.0-beta.4"
```

2.把 .webpackrc.js 里两行注释掉:
```
outputPath: '/var/www/dist/',
publicPath: '/static/dist/',
```

#### user/src目录下
注释 index.js 文件中一行:
```
__webpack_public_path__ = `${window.webRoot}static/`;
```

#### user/public目录下
新建 index.html 文件,如下:
```
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Cello User Dashboard</title>
        <link rel="icon" type="image/x-icon" href="favicon.png" />
    </head>
    <body>
        <div id="root"></div>
        <script type="text/javascript" src="index.js"> </script>
    </body>
</html>
```
如果没有id=root这一行，会在index.js中报错:
```
[app.start] container null not found
```

### 在user目录下run
1.npm install
2.npm run start(会提示包缺失，根据提示npm install相应包即可)

### 附:最快的方法
直接拉取，然后install、run
https://github.com/LWTang/user.git