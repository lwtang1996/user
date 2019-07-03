## zookeepeer

### config

```shell
    tickTime=2000
    dataDir=/var/zookeeper
    clientPort=2181
    initLimit=5
    syncLimit=2
    autopurge.snapRetainCount=3
    autopurge.purgeInterval=1
```

zookeeper 的config文件默认在conf/zoo.cfg，默认配置如上所示：

+ tickTime:  ZooKeeper使用的基本时间单位（以毫秒为单位）。它用于做心跳，最小会话超时将是tickTime的两倍;

+ dataDir: 存储内存数据库快照的位置，除非另有说明，否则指向数据库更新的事务日志;

+ clientPort: 侦听客户端连接的端口;

+ initLimit: 暂停ZooKeeper用于限制仲裁中ZooKeeper服务器连接到领导者的时间长度, 实际长度为：5*tickTime;

+ syncLimit 限制服务器与领导者的过期时间, 实际长度为 2*tickTime;

对应的环境变量如下：

```shell
    ZOOCFGDIR="/conf"
    ZOO_AUTOPURGE_PURGEINTERVAL="1"
    ZOO_AUTOPURGE_SNAPRETAINCOUNT="3"
    ZOO_CONF_DIR="/conf"
    ZOO_DATA_DIR="/data"
    ZOO_DATA_LOG_DIR="/datalog"
    ZOO_INIT_LIMIT="5"
    ZOO_PORT="2181"
    ZOO_SYNC_LIMIT="2"
    ZOO_TICK_TIME="2000"
    ZOO_USER="zookeeper"
```

### 参考网址：
+ https://zookeeper.apache.org/doc/r3.1.2/zookeeperStarted.html