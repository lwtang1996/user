
/* Copyright IBM Corp, All Rights Reserved.

SPDX-License-Identifier: Apache-2.0
 */

/**
 * Created by lixuc on 2017/5/3.
 */
var rp = require("request-promise");
var configuration = require("./configuration");
var dt = require("../kit/date-tool");
var Pagination = require("../kit/pagination");
import jsonfile from 'jsonfile'
import Moment from 'moment'
import { extendMoment } from 'moment-range';
import util from 'util'
import config from '../config'
import sleep from 'sleep-promise';
import ChainModel from '../models/chain'
import UserModel from '../models/user'
// import ChainCode from '../models/chainCode'
import ChainCodeModel from '../models/chainCode'
const fs = require('fs-extra');

const crypto = require("crypto");
const mongoose = require('mongoose');
const moment = extendMoment(Moment);
const log4js = require('log4js');
const logger = log4js.getLogger(__filename.slice(__dirname.length + 1));
const logLevel = process.env.DEV === "True" ? "DEBUG" : "INFO"


const io = require('../io').io();
const shell = require('shelljs');


logger.setLevel(logLevel);

function chain(apikey, username) {
    this.apikey = apikey;
    this.username = username;
    // this.clusterid = null;  // ljs modified
}
chain.prototype = {
    RESTfulURL: "http://" + configuration.RESTful_Server + configuration.RESTful_BaseURL,
    PoolManagerURL: "http://" + configuration.PoolManager_Server + configuration.PoolManager_BaseURL,
    LogURL: "http://" + configuration.Log_Server + configuration.Log_BaseURL,
    RESTfulK8sURL: "http://" + configuration.RESTful_K8sServer,
    amount: function() {
        return new Promise(function(resolve, reject) {
            rp({
                uri: this.RESTfulURL + "cluster/list?user_id=" + this.apikey,
                json: true
            }).then(function(response) {
                if (response.success) {
                    var clusters = response.result.clusters;
                    resolve({
                        success: true,
                        amount: clusters.length
                    });
                } else {
                    var e = new Error(response.message);
                    e.status = 503;
                    throw e;
                }
            }).catch(function(err) {
                reject({
                    success: false,
                    message: (err.status === 503 && err.message) || "System maintenance, please try again later!"
                });
            });
        }.bind(this));
    },


    list: function(page,currentChannel, launchpeer) {
        const username = this.username
        const userId = this.apikey
        return new Promise(function(resolve, reject) {
            rp({
                uri: this.RESTfulURL + "clusters?user_id=" + this.apikey,
                json: true
            }).then(function(response) {
              if (response.status === "OK") {
                let chains = [];
                let clusters = response.data;
                const pageNo = page || 1;
                const pg = new Pagination(clusters);
                clusters = pg.gotoPage(pageNo);
                let promises = []
                  //根据从operator dashboard处查询得到的cluster列表，依次查询
                clusters.forEach((cluster, i) => {
                  const plugin = cluster.consensus_plugin
                  const size = cluster.size
                  let p = new Promise((resolve, reject) => {
                      ChainModel.findOne({clusterId: cluster.id, user_id: userId}, function (err, chainDoc) {
                        if (chainDoc != null) {
                            const peers = cluster.containers.filter(container => container.includes("peer"))
                            const applyTime = moment(cluster.apply_ts)
                            const nowTime = moment().add(8, "hours")
                            let runningHours = moment.range(applyTime, nowTime).diff("hours")
                            let orgtable = []
                            let peertable = []
                            let ordertable = []

                            // 根据template，查询得到order peer  channel的信息，这些信息传到前端，供前端展示之用
                            let thistemplate = chainDoc.template
                            for (let orderkey in thistemplate.network) {
                                if (orderkey == 'orderer')
                                    ordertable.push({
                                        serverHostname: thistemplate.network[orderkey].server_hostname,
                                        url: thistemplate.network[orderkey].url,
                                    })

                            }
                            for (let orgkey in thistemplate.network.application) {
                                orgtable.push({
                                    name: thistemplate.network.application[orgkey].name,
                                    mspid: thistemplate.network.application[orgkey].mspid,
                                    ca: thistemplate.network.application[orgkey].ca,
                                    peernum: 2,
                                })

                                for (let peerkey in thistemplate.network.application[orgkey].peers){
                                    peertable.push({
                                        serverHostname: thistemplate.network.application[orgkey].peers[peerkey].server_hostname,
                                        org: thistemplate.network.application[orgkey].name,
                                        requests: thistemplate.network.application[orgkey].peers[peerkey].requests,
                                        events: thistemplate.network.application[orgkey].peers[peerkey].events,
                                    })
                                }
                            }

                            let channeltable = []
                            let channelpeertable = []
                            chainDoc.channels.forEach(function(item,index){
                                channeltable.push({
                                    channelname: item,
                                })
                            });
                            //  channel peer list的格式为  peername空格orgname空格channelname
                            chainDoc.channelpeerlist.forEach(function(item,index){
                                let arr = item.split(' ')
                                channelpeertable.push({
                                    peername: arr[0],
                                    orgname: arr[1],
                                    channelname: arr[2],
                                })
                            });

                            chains.push({
                                id: cluster.id,
                                dbId: chainDoc.id,
                                blocks: 0,
                                // scNum: result,
                                initialized: chainDoc.initialized,
                                keyValueStore: chainDoc.keyValueStore,
                                status: chainDoc.initialized ? "running" : "initializing",
                                plugin,
                                size,
                                name: chainDoc.name,
                                template: chainDoc.template,
                                type: chainDoc.type,
                                peerNum: peers.length,
                                createTime: applyTime.format("YYYY/MM/DD HH:mm:ss"),
                                runningHours,
                                orgs:chainDoc.orgs,// 格式为字符串数组,数组成员为组织名称
                                localchannels:chainDoc.channels, // 数组，这个链中已经创建的channel
                                curchannel:chainDoc.curchannel, // 当前正在操作的channel名称
                                orgtable, // 供前端以表格的形式展示组织信息
                                peertable,// 供前端以表格的形式展示peer信息
                                ordertable,// 供前端以表格的形式展示order信息
                                channeltable,// 供前端以表格的形式展示channel信息
                                channelpeertable,// 建立channel/org/peer的联系，格式为  peername空格orgname空格channelname
                            });

                            resolve()
                                
                            // ChainCode.count({chain: chainDoc, status: "instantiated"}, function (err, result) {
                            //     resolve()
                            // })
                        } else
                            resolve()

                      })
                  })
                  promises.push(p)
                });

                // 这里不会立即调用，只是声明一个函数
                function asyncQuery(arr) {
                  return arr.reduce((promise, chain) => {
                    return promise.then((result) => {
                      return new Promise((resolve, reject) => {

                          // 如果这个链还未创建过通道
                          if ((typeof(chains[0].localchannels) == "undefined") || (chains[0].localchannels == null)  || (chains[0].localchannels.length == 0)) {

                              let querychannelpromises = []

                              var channelArray = [];
                              var channelpeerArray = [];
                              let isNeedUpdate = false;

                              // 依次对每一个peer进行query，查询这些peer加入channel的情况，以便建立channel peer list
                              for (let orgkey in chains[0].template.network.application) {
                                  for (let peerkey in chains[0].template.network.application[orgkey].peers) {

                                      let p = new Promise((resolve, reject) => {

                                          const query = require(`/opt/cello/fabric-1.0/lib/query`);
                                          query.initializeWithChannel(chain.template,'','',);
                                          query.getChannels(peerkey, username, orgkey)
                                              .then(function (message) {
                                                  if (typeof message != 'string' && ( typeof(message.channels.length) != "undefined") && message.channels.length > 0) {

                                                      for (let i = 0; i < message.channels.length; i++) {
                                                          let isExist = false;
                                                          for (let j = 0; j < channelArray.length; j++) {
                                                              if (message.channels[i].channel_id == channelArray[j]) {
                                                                  isExist = true;
                                                                  break;
                                                              }
                                                          }
                                                          if (!isExist) {
                                                              channelArray.push(message.channels[i].channel_id);
                                                              chains[0].channeltable.push({
                                                                  channelname: message.channels[i].channel_id,
                                                              })
                                                              isNeedUpdate = true;
                                                          }

                                                          channelpeerArray.push(peerkey + ' ' + orgkey + ' ' + message.channels[i].channel_id);
                                                          chains[0].channelpeertable.push({
                                                              peername: peerkey,
                                                              orgname: orgkey,
                                                              channelname: message.channels[i].channel_id,
                                                          })
                                                      }

                                                  }

                                                  resolve()

                                              }, (err) => {
                                                  resolve()
                                              }).catch((err) => {
                                              resolve()
                                          });

                                      })
                                      querychannelpromises.push(p)
                                  }
                              }

                              Promise.all(querychannelpromises).then(() => {
                                  if (isNeedUpdate) {
                                      // 向数据库里保存 channel peer list
                                      ChainModel.findOneAndUpdate({clusterId: chain.id}, {channels:channelArray, channelpeerlist:channelpeerArray}, {upsert: true, new:true}, function (err, doc) {
                                          if (err) {
                                              logger.error(err)
                                              err.status = 503;
                                              throw err;
                                          }
                                      })
                                  }
                                  resolve()
                              })

                          } else {

                              // 查询channel的信息，这里的launchpeer的格式为  org name+空格+peer name
                              if (/*chain.initialized && */typeof(currentChannel)!="undefined" && typeof(launchpeer)!="undefined") {
                                  const fgindex = launchpeer.indexOf(' ')
                                  const orgname = launchpeer.slice(0,fgindex)
                                  const peername = launchpeer.slice(fgindex+1,launchpeer.length)

                                  chains[0].curchannel = currentChannel;

                                  // const helper = require(`/opt/cello/fabric-1.0/lib/helper`)
                                  // helper.initializeWithChannel(chain.template,currentChannel, chain.channelpeerlist)
                                  // helper.setupChaincodeDeploy()
                                  const query = require(`/opt/cello/fabric-1.0/lib/query`)
                                  query.initializeWithChannel(chain.template, currentChannel, chain.channelpeerlist)
                                  query.getChannelHeight(peername, username, orgname, currentChannel)
                                      .then(function(message) {
                                          const chainIndex = chains.findIndex(x => x.id === chain.id);
                                          let chainItem = chains[chainIndex]
                                          chainItem.blocks = parseInt(message)
                                          chains[chainIndex] = chainItem
                                      }).then(sleep(500)).then(() => {
                                      resolve()
                                  })


                              } else {
                                  resolve()
                              }
                          }



                      })
                    })
                  }, Promise.resolve())
                }

                // 依次调用前面定义的promise
                Promise.all(promises).then(() => {
                  asyncQuery(chains).then(() => {
                    resolve({
                      success: true,
                      chains: chains,
                      totalNumber: pg.getTotalRow(),
                      totalPage: pg.getTotalPage()
                    });
                  })
                })
              } else {
                var e = new Error(response.message);
                e.status = 503;
                throw e;
              }
            }).catch(function(err) {
                reject({
                    success: false,
                    message: (err.status === 503 && err.message) || "System maintenance, please try again later!"
                });
            });
        }.bind(this));
    },


    apply: function(name, plugin, mode, size, applyType) {
        return new Promise(function(resolve, reject) {
            const apikey = this.apikey
            const username = this.username

            // 访问operator dashboard
            rp({
                method: "POST",
                uri: this.RESTfulURL + "cluster_op",
                body: {
                    user_id: this.apikey,
                    action: "apply",
                    type: applyType,
                    size: 4,
                    name: name
                },
                json: true

                // method: "GET",
                // uri: "http://192.168.1.185:9906/v1_1/fetch/config?cluster=first&type=all",
                // body: {
                //     service_url:tmstr,
                // },
                // json: true

            }).then(function(response) {

                // var bitmap = new Buffer(response, 'base64');
                // fs.writeFile('./receivedfile.tar.gz', bitmap, 'binary');
                // if (shell.exec(`tar -xvf receivedfile.tar.gz`).code !== 0) {
                //     var e = new Error('tar -xvf receivedfile fail');
                //     e.status = 503;
                //     throw e;
                // }
                //
                // shell.cp('-R', './receivedfile', './');

                if (response.status === "OK") {
                    const {data: {service_url, size,id:clusterId}} = response

                    // 去获取chain的信息，返回一个压缩包
                    rp({
                        method: "GET",
                        uri: "http://" + configuration.RESTful_K8sServer + "/v1_1/fetch/config?cluster="+name+"&type=" + "all",
                        //uri: "http://192.168.1.185:9906/v1_1/fetch/config?cluster=first&type=all",
                        body: {
                            service_url
                        },
                        json: true
                    }).then(function(response) {

                        var bitmap = new Buffer(response, 'base64');
                        fs.ensureDirSync('/opt/cello/fabric-1.0');
                        fs.writeFile('/opt/cello/fabric-1.0/receivedfile.tar.gz', bitmap, 'binary',function (err) {

                            if (err) {
                                logger.error(err)
                                err.status = 503;
                                throw err;
                            }

                            logger.info("write file success      xxxxxxxxxxxxxx");

                            if (shell.exec('rm -rf /opt/cello/fabric-1.0/'+name).code !== 0) {
                            }

                            logger.info("rm name dir success      xxxxxxxxxxxxxx");

                            if (shell.exec('rm -rf /opt/cello/fabric-1.0/crypto-config').code !== 0) {
                            }

                            logger.info("rm crypto-config dir success      xxxxxxxxxxxxxx");

                            // fs.ensureDirSync('/opt/cello/fabric-1.0');
                            // if (shell.exec('rm -r /opt/cello/fabric-1.0/crypto-config').code !== 0) {
                            // }
                            //
                            // logger.info("rm /opt/cello/fabric-1.0/crypto-config dir success      xxxxxxxxxxxxxx");

                            if (shell.exec(`tar -xvf /opt/cello/fabric-1.0/receivedfile.tar.gz -C /opt/cello/fabric-1.0/`).code !== 0) {
                                var e = new Error('tar -xvf receivedfile fail');
                                e.status = 503;
                                throw e;
                            }
                            logger.info("tar -xvf receivedfile.tar.gz success      xxxxxxxxxxxxxx");

                            // if (shell.exec('cp -r ./'+name+'/* ./').code !== 0) {
                            //     var e = new Error('cp receivedfile fail');
                            //     e.status = 503;
                            //     throw e;
                            // }
                            // logger.info("cp to ./ success      xxxxxxxxxxxxxx");


                            if (shell.exec('cp -r /opt/cello/fabric-1.0/'+name+'/* /opt/cello/fabric-1.0/').code !== 0) {
                                var e = new Error('cp receivedfile fail');
                                e.status = 503;
                                throw e;
                            }
                            logger.info("cp to /opt/cello/fabric-1.0/ success      xxxxxxxxxxxxxx");

                            const chainId = mongoose.Types.ObjectId();
                            const chainRootDir = util.format(config.path.chain, username, chainId)

                            let newChain

                            const templateFile = `/opt/cello/fabric-1.0/config.json`

                            let temporgs = [];

                            try {
                                // 在/opt/cello/bass/目录下面，创建链的config.json文件等
                                fs.ensureDirSync(chainRootDir);
                                jsonfile.readFile(templateFile, function(err, template) {

                                    for (let orgkey in template.network.application) {
                                        temporgs.push(orgkey);
                                    }

                                    template.keyValueStore = `${chainRootDir}/client-kvs`
                                    template.CC_SRC_PATH = chainRootDir
                                    const txDir = `${chainRootDir}/tx`
                                    const libDir = `${chainRootDir}/lib`
                                    fs.ensureDirSync(libDir)

                                    //shell.cp('-R', '/home/lijisai/cello/user-dashboard/src/config-template/cc_code/examples', template.CC_SRC_PATH);
                                    // shell.cp('-R', `/home/lijisai/cello/user-dashboard/src/modules/${type}/*`, libDir)

                                    fs.ensureDirSync(template.keyValueStore)
                                    fs.ensureDirSync(txDir)

                                    const configFile = `${chainRootDir}/network-config.json`
                                    jsonfile.writeFile(configFile, template, function (err) {
                                        if (err) {
                                            logger.error(err)
                                            err.status = 503;
                                            throw err;
                                        }

                                        newChain = new ChainModel({
                                            _id: chainId,
                                            keyValueStore: `${chainRootDir}/client-kvs`,
                                            ccSrcPath: chainRootDir,
                                            service_url,  // ljs 暂时没办法生成service_url,可以参照chain里面的值，拼装一个
                                            user_id: apikey,
                                            size,
                                            username,
                                            name,
                                            // plugin,
                                            // mode,
                                            type: "fabric",
                                            template,
                                            clusterId: clusterId,
                                            orgs:temporgs
                                        })

                                        newChain.save(function(err, data){
                                            if(err){ return console.log(err) }

                                            resolve({
                                                success: true,
                                                id: chainId.toString(),
                                                dbId: newChain.id,
                                                applyTime: 0
                                            });
                                        })

                                    })
                                })
                            } catch (err) {
                                logger.error(err)
                                resolve({
                                    success: false,
                                });
                            }
                        })


                    })



                } else {
                    var e = new Error(response.message);
                    e.status = 503;
                    throw e;
                }
            }).catch(function(err) {
                reject({
                    success: false,
                    message: (err.status === 503 && err.message) || "System maintenance, please try again later!"
                });
            });
        }.bind(this));
    },

    // 产生通道的tx文件
    genchanneltxfile: function(channelname) {
        return new Promise(function(resolve){
            try {
                const channelName = channelname;
                const channelConfigPath = "/opt/cello/fabric-1.0";
                fs.ensureDirSync(channelConfigPath)
                if (shell.exec(`/opt/cello/fabric-1.0/configtxgen -profile TwoOrgsChannel --configPath=/opt/cello/fabric-1.0/ -channelID ${channelName} -outputCreateChannelTx ${channelConfigPath}/${channelName}.tx`).code !== 0) {
                    var e = new Error('generate channel tx file fail');
                    e.status = 503;
                    throw e;
                }

                const filepath = channelConfigPath+'/'+channelName+'.tx';
                fs.readFile(filepath, 'binary', function (err, data) {
                    if (err) {
                        logger.error(err)
                        err.status = 503;
                        throw err;
                    }
                    // fs.writeFile('./copychannel.tx', data, 'binary');
                    //
                    var b = new Buffer(data).toString('base64');
                    //
                    // var bitmap = new Buffer(b, 'base64');
                    // fs.writeFile('./copy2222channel.tx', bitmap, 'binary');

                    resolve({
                        success: true,
                        filedata: b,
                    });

                })

            } catch (err) {
                reject({
                    success: false,
                    message: (err.status === 503 && err.message) || "Create Channel fail!"
                });
            }

        }.bind(this));

    },

    downloadchannelconfigfile: function(chainid, channelname) {

        return new Promise(function(resolve){
            try {
                ChainModel.findOne({_id: chainid}, function (err, doc) {
                    if (err) {
                        logger.error(err)
                        err.status = 503;
                        throw err;
                    } else {
                        const {id, username} = doc;
                        const channelName = channelname;
                        const chainRootDir = util.format(config.path.chain, username, id)
                        const channelConfigPath = `${chainRootDir}/tx`

                        fs.ensureDirSync(channelConfigPath)
                        shell.cp('-R', `/opt/cello/fabric-1.0/${channelName}.tx`, channelConfigPath);

                        // const helper = require(`/opt/cello/fabric-1.0/lib/helper.js`)
                        // helper.initialize(doc.template)
                        // helper.getChannelConfig(channelName)
                    }
                })

                var channel = client.newChannel(channel_name);
                channel.addOrderer(orderer);

                return channel.getChannelConfig();  // 这是fabric SDK中的标准接口

                const filepath = channelConfigPath+'/'+channelName+'.tx';
                fs.readFile(filepath, 'binary', function (err, data) {
                    if (err) {
                        logger.error(err)
                        err.status = 503;
                        throw err;
                    }

                    resolve({
                        success: true,
                        filedata: b,
                    });

                })

            } catch (err) {
                reject({
                    success: false,
                    message: (err.status === 503 && err.message) || "Create Channel fail!"
                });
            }

        }.bind(this));

    },

    createchannel: function(chainid, channelname,signorg) {
        return new Promise(function(resolve, reject){
            try {
                ChainModel.findOne({_id: chainid}, function (err, doc) {
                    if (err) {
                        logger.error(err)
                        err.status = 503;
                        throw err;
                    } else {
                        const {id, username} = doc;
                        const channelName = channelname;
                        const chainRootDir = util.format(config.path.chain, username, id)
                        const channelConfigPath = `${chainRootDir}/tx`

                        fs.ensureDirSync(channelConfigPath)
                        shell.cp('-R', `/opt/cello/fabric-1.0/${channelName}.tx`, channelConfigPath);

                        // 注意这里用到的help.js等文件，是在/opt/cello/fabric-1.0/lib/目录下面的，而不是本工程里面的文件
                        const helper = require(`/opt/cello/fabric-1.0/lib/helper.js`)
                        helper.initializeWithChannel(doc.template,channelName, doc.channelpeerlist)
                        const channels = require(`/opt/cello/fabric-1.0/lib/create-channel.js`);
                        //channels.initialize(doc.template)

                        channels.createChannel(channelName, `${channelConfigPath}/${channelName}.tx`, username, signorg).then(function() {
                            let tmpchannels = doc.channels
                            tmpchannels.push(channelName)
                            doc.template.channelName = channelName
                            ChainModel.findOneAndUpdate({_id: doc.id}, {channels: tmpchannels, template:doc.template, curchannel:channelName}, {upsert: true}, function (err, doc) {
                                if (err) {
                                    logger.error(err)
                                    err.status = 503;
                                    throw err;
                                }
                                resolve({
                                    success: true,
                                    message: "Create Channel Success!"
                                })
                            })
                        })
                    }
                })
            } catch (err) {
                reject({
                    success: false,
                    message: (err.status === 503 && err.message) || "Create Channel fail!"
                });
            }

        }.bind(this));

    },


    joinchannel: function(chainid, channelname,orgs) {
        return new Promise(function(resolve, reject){
            try {
                ChainModel.findOne({_id: chainid}, function (err, doc) {
                    if (err) {
                        logger.error(err)
                        err.status = 503;
                        throw err;
                    } else {
                        const {id, username, clusterId, user_id, size, keyValueStore, template} = doc;
                        const channelName = channelname;
                        const chainRootDir = util.format(config.path.chain, username, id)

                        let orgNames=[]

                        for (let i=0; i<orgs.length; i++){
                            let fgindex = orgs[i].indexOf(' ')
                            let oname = orgs[i].slice(0,fgindex)
                            if(orgNames.indexOf(oname) == -1)
                                orgNames.push(oname)
                        }

                        let tmpchannelpeerlist = doc.channelpeerlist

                        const helper = require(`/opt/cello/fabric-1.0/lib/helper.js`)
                        helper.initializeWithChannel(doc.template,channelName, doc.channelpeerlist)

                        // const channels = require(`/opt/cello/fabric-1.0/lib/create-channel.js`);
                        // channels.initializeWithChannel(doc.template,doc.curchannel, doc.channelpeerlist)
                        function asyncInstallChainCode(arr) {
                            return arr.reduce((promise, orgName) => {
                                return promise.then((result) => {
                                    return new Promise((resolve, reject) => {
                                        let peerNames = []
                                        for (let i=0; i<orgs.length; i++){
                                            let fgindex = orgs[i].indexOf(' ')
                                            if (orgName == orgs[i].slice(0,fgindex)){
                                                peerNames.push(orgs[i].slice(fgindex+1,orgs[i].length))
                                                tmpchannelpeerlist.push(orgs[i].slice(fgindex+1,orgs[i].length)+' '+orgName+' '+channelName)
                                            }
                                        }

                                        // for (let key in template.network[orgName].peers) {
                                        //     peerNames.push(key)
                                        // }

                                        const join = require(`/opt/cello/fabric-1.0/lib/join-channel.js`);
                                        join.initializeWithChannel(doc.template,channelName, doc.channelpeerlist)
                                        join.joinChannel(channelName, peerNames, username, orgName)
                                            .then(function(message) {
                                                resolve()
                                            });
                                    })
                                })
                            }, Promise.resolve())
                        }

                        helper.setupCryptoSuite(channelName)
                        asyncInstallChainCode(orgNames).then(() => {
                            io.to(user_id).emit('update chain', {message: 'initialize done'});
                            ChainModel.findOneAndUpdate({_id: doc.id}, {/*initialized: true,*/channelpeerlist: tmpchannelpeerlist}, {upsert: true}, function (err, doc) {
                                if (err) {
                                    logger.error(err)
                                    err.status = 503;
                                    throw err;
                                }

                                resolve({
                                    success: true,
                                    message: "Join Channel Success!"
                                });

                            })
                        })

                        // resolve({
                        //     success: true,
                        //     message: "Join Channel Success!"
                        // });
                    }
                })
            } catch (err) {
                reject({
                    success: false,
                    message: (err.status === 503 && err.message) || "Create Channel fail!"
                });
            }

        }.bind(this));

    },


    edit: function(id, name) {
        return new Promise(function(resolve, reject) {
          try {
            const apikey = this.apikey
              rp({
                  method: "POST",
                  uri: this.RESTfulURL + "cluster_op",
                  body: {
                      user_id: this.apikey,
                      action: "apply",
                      type: 'fabric',
                      size: 4,
                      name: name
                  },
                  json: true

                  // method: "GET",
                  // uri: "http://192.168.1.185:9906/v1_1/fetch/config?cluster=first&type=all",
                  // body: {
                  //     service_url:tmstr,
                  // },
                  // json: true

              }).then(function(response) {

                  // var bitmap = new Buffer(response, 'base64');
                  // fs.writeFile('./receivedfile.tar.gz', bitmap, 'binary');
                  // if (shell.exec(`tar -xvf receivedfile.tar.gz`).code !== 0) {
                  //     var e = new Error('tar -xvf receivedfile fail');
                  //     e.status = 503;
                  //     throw e;
                  // }
                  //
                  // shell.cp('-R', './receivedfile', './');

                  if (response.status === "OK") {
                      const {data: {service_url, size,id:clusterId}} = response

                      //   let tmstr = "{'peer0_org1_grpc': '192.168.1.163:31026','peer0_org1_event': '192.168.1.163:31028','peer0_org2_grpc': '192.168.1.185:31032','peer0_org2_event': '192.168.1.185:31037','peer1_org1_grpc': '192.168.1.185:31035','peer1_org1_event': '192.168.1.185:31037','peer1_org2_grpc': '192.168.1.185:31037','peer1_org2_event': '192.168.1.185:31037','orderer': '192.168.1.163:31010','ca_org1_ecap': '192.168.1.163:31001','ca_org2_ecap': '192.168.1.185:31002'}"
                      rp({
                          method: "GET",
                          uri: "http://" + configuration.RESTful_K8sServer + "/v1_1/fetch/config?cluster="+name+"&type=" + "all",
                          //uri: "http://192.168.1.185:9906/v1_1/fetch/config?cluster=first&type=all",
                          body: {
                              service_url
                          },
                          json: true
                      }).then(function(response) {

                          var bitmap = new Buffer(response, 'base64');
                          fs.writeFile('/opt/cello/fabric-1.0/receivedfile.tar.gz', bitmap, 'binary',function (err) {

                              if (err) {
                                  logger.error(err)
                                  err.status = 503;
                                  throw err;
                              }

                              if (shell.exec('rm -r /opt/cello/fabric-1.0/crypto-config').code !== 0) {
                              }
                              if (shell.exec(`tar -xvf /opt/cello/fabric-1.0/receivedfile.tar.gz -C /opt/cello/fabric-1.0/`).code !== 0) {
                                  var e = new Error('tar -xvf receivedfile fail');
                                  e.status = 503;
                                  throw e;
                              }
                              if (shell.exec('cp -r /opt/cello/fabric-1.0/'+name+'/* /opt/cello/fabric-1.0/').code !== 0) {
                                  var e = new Error('cp receivedfile fail');
                                  e.status = 503;
                                  throw e;
                              }


                              ChainModel.findOne({clusterId: id},  function (err, doc) {
                                  if (err) {
                                      logger.error(err)
                                      err.status = 503;
                                      throw err;
                                  }

                                  const chainRootDir = doc.ccSrcPath

                                  const templateFile = `/opt/cello/fabric-1.0/config.json`

                                  let temporgs = [];

                                  try {
                                      fs.ensureDirSync(chainRootDir);
                                      jsonfile.readFile(templateFile, function(err, template) {

                                          //template.network.orderer.url = `grpcs://${service_url.orderer}`

                                          let orgindex = 0
                                          let peerindex = 0

                                          for (let orgkey in template.network.application) {

                                              temporgs.push(orgkey);

                                              const ca_org_ecap = service_url[`ca_org${orgindex+1}_ecap`]
                                              // template.network.application[orgkey].ca = `https://${ca_org_ecap}`

                                              // peerindex = 0
                                              for (let peerkey in template.network.application[orgkey].peers){
                                                  // template.network.application[orgkey].peers[peerkey].requests = "grpcs://"+service_url[`peer${peerindex}_org${orgindex+1}_grpc`]
                                                  // template.network.application[orgkey].peers[peerkey].events = "grpcs://"+service_url[`peer${peerindex}_org${orgindex+1}_event`]
                                                  // size ++;
                                                  // peerindex++
                                              }
                                              orgindex++
                                          }

                                          template.keyValueStore = `${chainRootDir}/client-kvs`
                                          template.CC_SRC_PATH = chainRootDir
                                          const txDir = `${chainRootDir}/tx`
                                          const libDir = `${chainRootDir}/lib`
                                          fs.ensureDirSync(libDir)

                                          //shell.cp('-R', '/home/lijisai/cello/user-dashboard/src/config-template/cc_code/examples', template.CC_SRC_PATH);
                                          // shell.cp('-R', `/home/lijisai/cello/user-dashboard/src/modules/${type}/*`, libDir)

                                          fs.ensureDirSync(template.keyValueStore)
                                          fs.ensureDirSync(txDir)

                                          const configFile = `${chainRootDir}/network-config.json`
                                          jsonfile.writeFile(configFile, template, function (err) {
                                              if (err) {
                                                  logger.error(err)
                                                  err.status = 503;
                                                  throw err;
                                              }

                                              let channelpeerlist = doc.channelpeerlist
                                              // channelpeerlist = [].concat(doc.channelpeerlist);

                                              for (let i = 0; i < channelpeerlist.length; i++) {
                                                  let arr = channelpeerlist[i].split(' ')
                                                  let isexist = false;
                                                  for (let j=0; j<temporgs.length; j++){
                                                      if (temporgs[j] == arr[1])
                                                          isexist = true
                                                  }

                                                  if (!isexist) {
                                                      channelpeerlist.splice(i, 1); // 将使后面的元素依次前移，数组长度减1
                                                      i--; // 如果不减，将漏掉一个元素
                                                  }
                                              }

                                              // doc.channelpeerlist.forEach(function(item,index){
                                              //     let arr = item.split(' ')
                                              //     let isexist = false;
                                              //     for (let i=0; i<temporgs.length; i++){
                                              //         if (temporgs[i] == arr[1])
                                              //             isexist = true
                                              //     }
                                              //     if (!isexist) {
                                              //         channelpeerlist.splice(index,1)
                                              //     }
                                              // });

                                              ChainModel.findOneAndUpdate({clusterId: id}, {template,service_url,size,orgs:temporgs,channelpeerlist}, {upsert: true}, function (err, chaindoc) {
                                                  if (err) {
                                                      logger.error(err)
                                                      err.status = 503;
                                                      throw err;
                                                  }
                                                  resolve({
                                                      success: true,
                                                  })
                                              })


                                          })
                                      })
                                  } catch (err) {
                                      logger.error(err)
                                      resolve({
                                          success: false,
                                      });
                                  }


                              })



                          })


                      })



                  } else {
                      var e = new Error(response.message);
                      e.status = 503;
                      throw e;
                  }
              })

          } catch (err) {
            reject({
              success: false,
              message: (err.status === 503 && err.message) || "System maintenance, please try again later!"
            });
          }

        }.bind(this));
    },


    release: function(id) {
        return new Promise(function(resolve, reject) {
            rp({
                method: "POST",
                uri: this.RESTfulURL + "cluster_op",
                body: {
                    action: "release",
                    user_id: this.apikey,
                    cluster_id: id,
                    un_reset:true,
                },
                json: true
            }).then(function(response) {



                // if (response.status === "OK") {
                //
                // } else {
                //     let e = new Error(response.message);
                //     e.status = 503;
                //     throw e;
                // }
            }).catch(function(err) {
                reject({
                    success: false,
                    message: (err.status === 503 && err.message) || "System maintenance, please try again later!"
                });
            });

            ChainModel.findOne({clusterId: id}, function (err, doc) {
                if (err) {
                    err.status = 503;
                    throw err;
                } else {

                    ChainCodeModel.find({chain: doc._id}, function (err, docs) {
                        if (err) {
                            err.status = 503;
                            throw err;
                        } else {
                            if (docs != null){
                                docs.map((chaincode, i) => {

                                    chaincode.remove(
                                        function(err){
                                            if (err){
                                                err.status = 503;
                                                throw err;
                                            }
                                        });
                                })

                                // resolve({success: true})
                            }
                            // else
                            //     resolve({success: true})

                        }
                    })

                    doc.remove(
                        function(err){
                            if (err){
                                err.status = 503;
                                throw err;
                            }
                        });


                    // UserModel.find({chainId: id}, function (err, docs) {
                    //     if (err) {
                    //         err.status = 503;
                    //         throw err;
                    //     } else {
                    //         if (docs != null){
                    //             docs.map((user, i) => {
                    //
                    //                 user.remove(
                    //                     function(err){
                    //                         if (err){
                    //                             err.status = 503;
                    //                             throw err;
                    //                         }
                    //                     });
                    //             })
                    //
                    //         }
                    //
                    //
                    //     }
                    // })


                    resolve({success: true})
                }
            })
        }.bind(this));
    },

    // 仅仅userdashboard本地删除数据库，不去真正重启fabric网络
    // release: function(id) {
    //     return new Promise(function(resolve, reject) {
    //         ChainModel.findOne({clusterId: id}, function (err, doc) {
    //             if (err) {
    //                 err.status = 503;
    //                 throw err;
    //             } else {
    //                 doc.remove(function(err){logger.error(err)});
    //                 resolve({success: true})
    //             }
    //         })
    //     }.bind(this));
    // },

    operate: function(id, action) {
        return new Promise(function(resolve, reject) {
            rp({
                method: "POST",
                uri: this.PoolManagerURL + "cluster_op",
                body: {
                    action: action,
                    cluster_id: id
                },
                json: true
            }).then(function(response) {
                if (response.status.toLowerCase() === "ok") {
                    resolve({ success: true });
                } else {
                    var e = new Error(response.error);
                    e.status = 503;
                    throw e;
                }
            }).catch(function(err) {
                reject({
                    success: false,
                    message: (err.status === 503 && err.message) || "System maintenance, please try again later!"
                });
            });
        }.bind(this));
    },
    topologyNodes: function(id) {
        return new Promise(function(resolve, reject) {
            rp({
                uri: this.RESTfulURL + "cluster/topo/nodes?cluster_id=" + id,
                json: true
            }).then(function(response) {
                if (response.success) {
                    var nodes = response.result.nodes;
                    var features = [];
                    for (var i in nodes) {
                        features.push({
                            type: "Feature",
                            geometry: {
                                type: "Point",
                                coordinates: configuration["topology"][nodes[i]["id"]]
                            },
                            properties: nodes[i]
                        });
                    }
                    resolve({
                        success: true,
                        geoData: {
                            type: "FeatureCollection",
                            features: features
                        }
                    });
                } else {
                    var e = new Error(response.message);
                    e.status = 503;
                    throw e;
                }
            }).catch(function(err) {
                reject({
                    success: false,
                    message: (err.status == 503 && err.message) || "System maintenance, please try again later!"
                });
            });
        }.bind(this));
    },
    topologyLinks: function(id) {
        return new Promise(function(resolve, reject) {
            rp({
                uri: this.RESTfulURL + "cluster/topo/links?cluster_id=" + id,
                json: true
            }).then(function(response) {
                if (response.success) {
                    var links = response.result.links;
                    var features = [];
                    for (var i in links) {
                        features.push({
                            type: "Feature",
                            geometry: {
                                type: "LineString",
                                coordinates: [
                                    configuration["topology"][links[i]["from"]],
                                    configuration["topology"][links[i]["to"]]
                                ]
                            },
                            properties: links[i]
                        });
                    }
                    resolve({
                        success: true,
                        geoData: {
                            type: "FeatureCollection",
                            features: features
                        }
                    });
                } else {
                    var e = new Error(response.message);
                    e.status = 503;
                    throw e;
                }
            }).catch(function(err) {
                reject({
                    success: false,
                    message: (err.status == 503 && err.message) || "System maintenance, please try again later!"
                });
            });
        }.bind(this));
    },
    topologyLatency: function(id) {
        return new Promise(function(resolve, reject) {
            rp({
                uri: this.RESTfulURL + "cluster/topo/links?cluster_id=" + id,
                json: true
            }).then(function(response) {
                if (response.success) {
                    var links = response.result.links;
                    resolve({
                        success: true,
                        links: links
                    });
                } else {
                    var e = new Error(response.message);
                    e.status = 503;
                    throw e;
                }
            }).catch(function(err) {
                reject({
                    success: false,
                    message: (err.status == 503 && err.message) || "System maintenance, please try again later!"
                });
            });
        }.bind(this));
    },
    logNodes: function(id) {
        return new Promise(function(resolve, reject) {
            rp({
                uri: this.RESTfulURL + "cluster/topo/nodes?cluster_id=" + id,
                json: true
            }).then(function(response) {
                if (response.success) {
                    var nodes = response.result.nodes;
                    var n = [];
                    for (var i in nodes) {
                        n.push({
                            id: nodes[i]["id"],
                            type: "peer"
                        });
                    }
                    n.sort(function(n1, n2) {
                        if (n1.id < n2.id) return -1;
                        else if (n1.id > n2.id) return 1;
                        else return 0;
                    });
                    n.push({
                        id: "chaincode",
                        type: "chaincode"
                    });
                    resolve({
                        success: true,
                        nodes: n
                    });
                } else {
                    var e = new Error(response.message);
                    e.status = 503;
                    throw e;
                }
            }).catch(function(err) {
                reject({
                    success: false,
                    message: (err.status == 503 && err.message) || "System maintenance, please try again later!"
                });
            });
        }.bind(this));
    },
    log: function(id, type, node, size, time) {
        return new Promise(function(resolve, reject) {
            rp({
                uri: this.LogURL + "?" +
                    "cluster_id=" + id + "&" +
                    "log_type=" + type + "&" +
                    "node_name=" + node + "&" +
                    "log_size=" + (size || 1) +
                    (time ? "&since_ts=" + time : ""),
                json: true
            }).then(function(response) {
                if (response.code == 0) {
                    resolve({
                        success: true,
                        logs: response.data.logs,
                        latest_ts: response.data.latest_ts
                    });
                } else {
                    var e = new Error(response.message.body.error ?
                        response.message.body.error.reason : response.message.code);
                    e.status = 503;
                    throw e;
                }
            }).catch(function(err) {
                reject({
                    success: false,
                    message: (err.status == 503 && err.message) || "System maintenance, please try again later!"
                });
            });
        }.bind(this));
    },
    blocks: function(id) {
        return new Promise(function(resolve, reject) {
            rp({
                uri: this.RESTfulURL + "cluster/ledger/chain?cluster_id=" + id,
                json: true
            }).then(function(response) {
                if (response.success) {
                    var blockchain = response.result.chain;
                    resolve({
                        success: true,
                        height: blockchain.height
                    });
                } else {
                    var e = new Error(response.message);
                    e.status = 503;
                    throw e;
                }
            }).catch(function(err) {
                reject({
                    success: false,
                    message: (err.status == 503 && err.message) || "System maintenance, please try again later!"
                });
            });
        }.bind(this));
    },
    block: function(chainId, blockId) {
        return new Promise(function(resolve, reject) {
            rp({
                uri: this.RESTfulURL + "cluster/ledger/block?cluster_id=" + chainId + "&block_id=" + blockId,
                json: true
            }).then(function(response) {
                if (response.success) {
                    var block = response.result.block;
                    var transactions = block.transactions || [];
                    var trans = [];
                    for (var i in transactions) {
                        var type = transactions[i]["type"];
                        trans.push({
                            chaincodeId: transactions[i]["chaincodeID"],
                            type: type == "1" ? "Deploy" : type == "2" ? "Invoke" : "Query",
                            payload: transactions[i]["payload"],
                            timestamp: dt.format(transactions[i]["timestamp"]["seconds"] * 1000),
                            uuid: transactions[i]["uuid"]
                        });
                    }
                    resolve({
                        success: true,
                        transactions: trans,
                        commitTime: dt.format(block["nonHashData"]["localLedgerCommitTimestamp"]["seconds"] * 1000)
                    });
                } else {
                    var e = new Error(response.message);
                    e.status = 503;
                    throw e;
                }
            }).catch(function(err) {
                reject({
                    success: false,
                    message: (err.status == 503 && err.message) || "System maintenance, please try again later!"
                });
            });
        }.bind(this));
    }
};
module.exports = chain;