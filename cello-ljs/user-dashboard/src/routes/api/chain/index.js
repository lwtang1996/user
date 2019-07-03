
/* Copyright IBM Corp, All Rights Reserved.

 SPDX-License-Identifier: Apache-2.0
*/
import { Router } from 'express'
const Chain = require("../../../modules/chain");
import ChainModel from '../../../models/chain'
import ChainCode from '../../../models/chainCode'
import util from 'util'
import multer from 'multer'
import config from '../../../config'
import Moment from 'moment'
import { extendMoment } from 'moment-range';
import jsonfile from 'jsonfile'
const moment = extendMoment(Moment);
const log4js = require('log4js');
const logger = log4js.getLogger(__filename.slice(__dirname.length + 1));
const logLevel = process.env.DEV === "True" ? "DEBUG" : "INFO"
var superagent = require('superagent');
var agent = require('superagent-promise')(require('superagent'), Promise);
const fs = require('fs-extra');
var requester = require('request');
const shell = require('shelljs');
logger.setLevel(logLevel);

const router = new Router()


//根据channel，去访问launchpeer节点，获得链的信息，如块、交易等
router.get("/:apikey/list", function(req, res) {
  const currentChannel = req.query.currentChannel;//当前要list的channel
  const launchpeer = req.query.launchpeer;  //要访问的peer,格式为: org name+空格+peer name
  const chain = new Chain(req.apikey, req.username);
  chain.list(req.query.page,currentChannel, launchpeer).then(function(result) {
    res.json({
      ...result,
      limit: config.limit.chainNumber
    });
  }).catch(function(err) {
    res.json(err);
  });
});

router.get("/search", function (req, res) {
  const chainName = req.query.name;
  ChainModel.count({user_id: req.apikey, name: chainName}, function (err, result) {
    res.json({
      success: true,
      existed: result>0
    })
  })
})

// dblist的作用是前端通过查询数据库获得chain的信息，和list相比比较简单。可以快速的获取chain的信息
router.get("/:apikey/db-list", function (req, res) {

  ChainModel.find({user_id: req.apikey, _id:req.query.currentChainId}, function (err, docs) {
    if (err) {
        res.json({success: false, err})
        return
    }
    if (docs != null) {
        const chains = docs.map((chain, i) => {
            return {
                id: chain.id,
                name: chain.name,
                type: chain.type,
                orgs:chain.orgs,
                template:chain.template,
                localchannels:chain.channels,
                curchannel:chain.curchannel,
            }
        })
        res.json({
            success: true,
            chains
        })
    } else {
        res.json({
            success: false,
        })
    }


  })
})

// 没用到
router.get("/:id/stat", function (req, res) {
  const id = req.params.id;
  ChainModel.findOne({id}, function (err, chainDoc) {
    if (err) res.json({success: false})
    res.json({
      success: true,
      id,
      initialized: chainDoc.initialized
    })
  })
})

// userdashboard向operator dashboard申请链
router.post("/:apikey/apply", function(req, res) {
  const chain = new Chain(req.apikey, req.username);
  chain.apply(
    req.body.name,
    '',
    '',
    '',//req.body.size,
    req.body.type
  ).then(function (result) {
    res.json(result)
  }).catch(function (err) {
    res.json(err)
  })
  // chain.apply(req.body.name,
  //   req.body.description,
  //   req.body.plugin,
  //   req.body.mode,
  //   req.body.size)
  //   .then(function(result) {
  //     res.json(result);
  //   }).catch(function(err) {
  //   res.json(err);
  // });
});

// 上传channel的配置文件，用于生成channel.tx文件
router.post("/uploadconfig", function (req, res) {
    const configDir = config.path.fabricConfig
    const storage = multer.diskStorage({
        destination: function(req, file, callback) {
            callback(null, configDir)
        },
        filename: function(req, file, callback) {
            callback(null, file.originalname)
        }
    })
    const upload = multer({
        storage: storage,
        limits: { fileSize: config.fileUploadLimits},
    }).single('file');
    upload(req, res, function(err) {
        res.json({
            success: true
        })
    })
})



// 用户在浏览器上点击，获取channel的tx文件，并下载的用户本地
router.post("/:apikey/genchanneltxfile", function(req, res) {

    const chain = new Chain(req.apikey, req.username);
    chain.genchanneltxfile(
        req.body.channelname1
    ).then(function (result) {
        res.json(result)
        // res.download(result)
    }).catch(function (err) {
        res.json(err)
    })
});

// 创建通道
router.post("/:apikey/createchannel", function(req, res) {

    const chain = new Chain(req.apikey, req.username);
    chain.createchannel(
        req.body.chainid, // chain  ID
        req.body.channelname, // 要创建的channel名称
        req.body.signorg, // 发起创建channel的组织名称
    ).then(function (result) {
        res.json(result)
    }).catch(function (err) {
        res.json(err)
    })
});

// 将各个组织的节点加入channel,
router.post("/:apikey/joinchannel", function(req, res) {

    const chain = new Chain(req.apikey, req.username);
    chain.joinchannel(
        req.body.chainid,
        req.body.channelname, // 加入的channel名称
        req.body.orgs // 要加入channel的组织
    ).then(function (result) {
        res.json(result)
    }).catch(function (err) {
        res.json(err)
    })
});

// 下载channel的config文件,用来更新通道配置
router.post("/:apikey/downloadchannelconfigfile", function (req, res) {
    const chainId = req.body.chainid;
    const channelName = req.body.channelname; // channel 名称
    const signorg = req.body.signorg; // 发起该操作的组织名称
    ChainModel.findOne({_id: chainId}, function (err, chain) {
        if (err) {
            res.json({
                success: false,
                error: "chain not exist!"
            })
        } else {
            const helper = require(`/opt/cello/fabric-1.0/lib/helper`)
            helper.initializeWithChannel(chain.template, channelName, chain.channelpeerlist)
            helper.getChannelConfig(signorg, channelName).then(function(config_envelope) {
                var original_config_proto = config_envelope.config.toBuffer();

                // fs.ensureDirSync('/opt/cello/fabric-1.0');
                // fs.writeFile('/opt/cello/fabric-1.0/config_block.pb', original_config_proto, 'binary',function (err) {
                //
                //     if (err) {
                //         res.json({
                //             success: false,
                //             error: "write config pb file fail!"
                //         })
                //         return
                //     }
                //
                //     if (shell.exec('configtxlator proto_decode --input /opt/cello/fabric-1.0/config_block.pb --type common.Block  --output /opt/cello/fabric-1.0/original_config.json').code !== 0) {
                //         res.json({
                //             success: false,
                //             error: "translate config to json fail!"
                //         })
                //         return
                //     }
                //
                // })




                var response = superagent.post('http://127.0.0.1:7059/protolator/decode/common.Config',
                    original_config_proto)
                    .buffer()
                    .end((err, response) => {
                        if(err) {
                            res.json(err);
                            return
                        }
                        var original_config_json = response.text.toString();
                        res.json({
                            success: true,
                            data: original_config_json
                        })
                        return
                    });


            });
        }
    })

})

// 下载某个组织的config信息
router.post("/:apikey/downloadorgconfigfile", function (req, res) {
    const chainId = req.body.chainid;
    const org = req.body.org; // 要下载config的组织名称
    ChainModel.findOne({_id: chainId}, function (err, chain) {
        if (err) {
            res.json({
                success: false,
                error: "chain not exist!"
            })
        } else {
            if (shell.exec(`/opt/cello/fabric-1.0/configtxgen -printOrg ${org} --configPath=/opt/cello/fabric-1.0/  > /opt/cello/fabric-1.0/orgconfig.json`).code !== 0) {
                res.json({
                    success: false,
                    error: "generate org config fail!"
                })
                return;
            }
            fs.readFile('/opt/cello/fabric-1.0/orgconfig.json','binary',  function (err, data) {
                if (err || data==null) {
                    res.json({success: false})
                }
                res.json({
                    success: true,
                    data: data
                })

            })

        }
    })

})

// 下载connection profile文件,这个文件在SDK中使用, CLient APP通过这个文件获得链的信息,可参见ali 区块链的sdk例子
router.post("/:apikey/downloadConnectionProfile", function (req, res) {
    const chainId = req.body.chainid;
    const org = req.body.org;
    const channelname = req.body.channelname;
    ChainModel.findOne({_id: chainId}, function (err, chain) {
        if (err) {
            res.json({
                success: false,
                error: "chain not exist!"
            })
        } else {

            var peers = {};
            var organizations = {};
            for (let orgkey in chain.template.network.application) {
                if (orgkey == org) {
                    var peernamearray = [];
                    var canamearray = [];
                    var peers_in_channel = {};
                    var orgTlsCaCertdata;


                    for (let peerkey in chain.template.network.application[orgkey].peers){
                        let apeer = {};
                        apeer["url"] = chain.template.network.application[orgkey].peers[peerkey].requests;
                        apeer["eventUrl"] = chain.template.network.application[orgkey].peers[peerkey].events;

                        orgTlsCaCertdata = fs.readFileSync('/opt/cello/fabric-1.0/' + chain.template.network.application[orgkey].peers[peerkey]['tls_cacerts']);
                        apeer["tlsCACerts"] = {
                            'pem': Buffer.from(orgTlsCaCertdata).toString(),
                        };

                        apeer["grpcOptions"] = {
                            'allow-insecure': false,
                            'fail-fast': false,
                            'keep-alive-permit': false,
                            'keep-alive-time': '0s',
                            'keep-alive-timeout': '20s',
                            'ssl-target-name-override': chain.template.network.application[orgkey].peers[peerkey]['server_hostname']
                        };

                        peernamearray.push(peerkey);
                        peers_in_channel[peerkey] = {
                            'chaincodeQuery': true,
                            'endorsingPeer': true,
                            'eventSource': true,
                            'ledgerQuery': true
                        };

                        peers[peerkey] = apeer;
                    }
                    canamearray.push(orgkey+'CA');

                    /*
                     organizations:
                         orghust1MSP:
                             peers:
                             - peer1.orghust1.aliyunbaas.com:31111
                             - peer2.orghust1.aliyunbaas.com:31121
                             mspid: orghust1MSP
                             cryptoPath: /tmp/msp
                             certificateAuthorities:
                             - ca1.orghust1.aliyunbaas.com
                     */

                    organizations[chain.template.network.application[orgkey].mspid] = {
                        'peers': peernamearray,
                        'mspid': chain.template.network.application[orgkey].mspid,
                        'cryptoPath': '/tmp/msp',
                        'certificateAuthorities': canamearray,
                    }



                    /*
                     orderers:
                     orderer1:
                     url: grpcs://orderer1.myhust.aliyunbaas.com:31010
                     tlsCACerts:
                     pem: |
                     -----BEGIN CERTIFICATE-----
                     MIICDTCCAbOgAwIBAgIUCeMe74952AioYkMcBlCZxnJrkiQwCgYIKoZIzj0EAwIw
                     YzELMAkGA1UEBhMCQ04xETAPBgNVBAgTCFpoZWppYW5nMREwDwYDVQQHEwhIYW5n
                     emhvdTEPMA0GA1UEChMGbXlodXN0MR0wGwYDVQQDExRteWh1c3QgVExTIFJvb3Qg
                     Q2VydDAeFw0xODEwMTcwMzIxMDBaFw0zODEwMTIwMzIxMDBaMGMxCzAJBgNVBAYT
                     AkNOMREwDwYDVQQIEwhaaGVqaWFuZzERMA8GA1UEBxMISGFuZ3pob3UxDzANBgNV
                     BAoTBm15aHVzdDEdMBsGA1UEAxMUbXlodXN0IFRMUyBSb290IENlcnQwWTATBgcq
                     hkjOPQIBBggqhkjOPQMBBwNCAARH4NpXymHAFJyt5FOHroiKLe6BR1/725d5H9bQ
                     Q2L1DWrbQ86o7fshZS73p/mIOU1xtaFXZevedK3HYQJG7RhUo0UwQzAOBgNVHQ8B
                     Af8EBAMCAQYwEgYDVR0TAQH/BAgwBgEB/wIBATAdBgNVHQ4EFgQUnoftNehhWTZU
                     Ab1IwtMNx00ZFTkwCgYIKoZIzj0EAwIDSAAwRQIhAMZDOigrbMptPbqn2ClegIZ4
                     ijlBbuiQQFE/PorWLqweAiB3YHmQxtT74SDnzyRjhXPTDkYNWRBSqZuh32CxvEGJ
                     Pw==
                     -----END CERTIFICATE-----
                     grpcOptions:
                     allow-insecure: false
                     fail-fast: false
                     keep-alive-permit: false
                     keep-alive-time: 0s
                     keep-alive-timeout: 20s
                     ssl-target-name-override: orderer1.myhust.aliyunbaas.com
                     */
                    var orderers = {};
                    var orderernamearray = [];
                    for (let orderkey in chain.template.network) {
                        if (orderkey == 'orderer') {
                            var orderer1 = {};
                            let certdata = fs.readFileSync('/opt/cello/fabric-1.0/' + chain.template.network[orderkey].tls_cacerts);
                            orderer1 = {
                                'url': chain.template.network[orderkey].url,
                                "tlsCACerts": {
                                    'pem': Buffer.from(certdata).toString(),
                                },
                                'grpcOptions': {
                                    'allow-insecure': false,
                                    'fail-fast': false,
                                    'keep-alive-permit': false,
                                    'keep-alive-time': '0s',
                                    'keep-alive-timeout': '20s',
                                    'ssl-target-name-override': chain.template.network[orderkey].server_hostname
                                }
                            }

                            orderers['orderer1'] = orderer1;
                            orderernamearray.push('orderer1');
                        }
                    }
                    /*
                     client:
                         organization: orghust1MSP
                         logging:
                         level: info
                         credentialStore:
                         path: /tmp/msp/signcerts
                         cryptoStore:
                         path: /tmp/msp
                         BCCSP:
                         security:
                         default:
                         provider: SW
                         level: 256
                         softVerify: true
                         enabled: true
                         hashAlgorithm: SHA2
                     */
                    var client = {};
                    client = {
                        'organization': chain.template.network.application[orgkey].mspid,
                        'logging': {
                            'level': 'info',
                        },
                        'credentialStore': {
                            'path': '/tmp/msp/signcerts',
                            'cryptoStore': {
                                'path': '/tmp/msp'
                            }
                        },
                        'BCCSP': {
                            'security': {
                                'default': {
                                    'provider': 'SW'
                                },
                                'level': 256,
                                'softVerify': true,
                                'enabled': true,
                                'hashAlgorithm': 'SHA2',
                            }
                        }
                    };

                    /*
                     certificateAuthorities:
                         ca1.orghust1.aliyunbaas.com:
                             url: https://ca1.orghust1.aliyunbaas.com:31154
                             tlsCACerts:
                                 pem: |
                                     -----BEGIN CERTIFICATE-----
                                     MIICITCCAcegAwIBAgIUJy/WVz0Sob7bYE2aZSHCANPVkYwwCgYIKoZIzj0EAwIw
                                     bTELMAkGA1UEBhMCQ04xETAPBgNVBAgTCFpoZWppYW5nMREwDwYDVQQHEwhIYW5n
                                     emhvdTEWMBQGA1UEChMNQWxpYmFiYSBDbG91ZDEgMB4GA1UEAxMXRmFicmljLUNB
                                     IFRMUyBSb290IENlcnQwHhcNMTgxMDE3MDMxODAwWhcNMzgxMDEyMDMxODAwWjBt
                                     MQswCQYDVQQGEwJDTjERMA8GA1UECBMIWmhlamlhbmcxETAPBgNVBAcTCEhhbmd6
                                     aG91MRYwFAYDVQQKEw1BbGliYWJhIENsb3VkMSAwHgYDVQQDExdGYWJyaWMtQ0Eg
                                     VExTIFJvb3QgQ2VydDBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABMzLDSBS95OH
                                     HBcIieFHgQ35bI2Gb0VVMyD6F43yqEq3hEQ1NjqmEZoWvbQ0zyWktf2SwzUrRuJm
                                     o6pxOPx43SujRTBDMA4GA1UdDwEB/wQEAwIBBjASBgNVHRMBAf8ECDAGAQH/AgEB
                                     MB0GA1UdDgQWBBREM6IpuySrZ2LdBIxZCLao45cgQzAKBggqhkjOPQQDAgNIADBF
                                     AiEA/JT9gpNVnJ0TF6UAQxmQxZJTfFAsitoJXvqEj18VTjACIEWBjPziOQYEMnQ5
                                     fv3IogKtBbZjzJQUB/nUrjr5PkfW
                                     -----END CERTIFICATE-----
                             caName: client
                     */
                    var certificateAuthorities = {};
                    var aca = {
                        'url': chain.template.network.application[orgkey].ca,
                        'tlsCACerts': {
                            'pem': Buffer.from(orgTlsCaCertdata).toString(),
                        },
                        'caName': 'client',
                    };
                    certificateAuthorities[orgkey+'CA'] = aca;

                    /*
                     channels:
                         first-channel:
                             peers:
                                 peer1.orghust1.aliyunbaas.com:31111:
                                     chaincodeQuery: true
                                     endorsingPeer: true
                                     eventSource: true
                                     ledgerQuery: true
                                 peer2.orghust1.aliyunbaas.com:31121:
                                     chaincodeQuery: true
                                     endorsingPeer: true
                                     eventSource: true
                                     ledgerQuery: true
                             orderers:
                                 - orderer1
                                 - orderer2
                                 - orderer3
                     */
                    var channels = {};
                    var achannel = {
                        'peers': peers_in_channel,
                        'orderers':orderernamearray

                    };
                    channels[channelname] = achannel;

                    // 组织最总的json对象
                    var connectionProfile = {};
                    connectionProfile['name'] = 'Handchain-baas-Config';
                    connectionProfile['description'] = 'The network generated by handchain BaaS.';
                    connectionProfile['version'] = '1.0.0';
                    connectionProfile['peers'] = peers;
                    connectionProfile['organizations'] = organizations;
                    connectionProfile['orderers'] = orderers;
                    connectionProfile['client'] = client;
                    connectionProfile['channels'] = channels;
                    connectionProfile['certificateAuthorities'] = certificateAuthorities;

                    var connectionProfileJson = JSON.stringify(connectionProfile, null, 2);
                    // res.json({
                    //     success: true,
                    //     data: connectionProfileJson
                    // })

                    fs.writeFile('/opt/cello/fabric-1.0/connection-profile.json', connectionProfileJson, 'binary',function (err) {
                        if (err) {
                            res.json({success: false})
                        }

                        var adminpath = chain.template.network.application[orgkey].admin.key;
                        let findex = adminpath.indexOf("msp/keystore")
                        adminpath = adminpath.slice(0,findex)

                        let strrr = `mv /opt/cello/fabric-1.0/connection-profile.json /opt/cello/fabric-1.0/${adminpath}`;
                        if (shell.exec(`mv /opt/cello/fabric-1.0/connection-profile.json /opt/cello/fabric-1.0/${adminpath}`).code !== 0) {

                        }


                        // if (shell.exec(`tar -xvf /opt/cello/fabric-1.0/receivedfile.tar.gz -C /opt/cello/fabric-1.0/`).code !== 0) {
                        //
                        // }
                        strrr = `tar -cvf /opt/cello/fabric-1.0/${orgkey}Msp.tar.gz -C /opt/cello/fabric-1.0/${adminpath} msp tls connection-profile.json`;
                        if (shell.exec(`tar -cvf /opt/cello/fabric-1.0/${orgkey}Msp.tar.gz -C /opt/cello/fabric-1.0/${adminpath} msp tls connection-profile.json`).code !== 0) {

                        }


                        let data = fs.readFileSync('/opt/cello/fabric-1.0/'+orgkey+'Msp.tar.gz','binary');

                        var b = new Buffer(data).toString('base64');

                        res.json({
                            success: true,
                            data: b
                        })

                    })

                }


            }

        }
    })

})

// 上传channel的原配置文件, 为了更新通道用
router.post("/uploadoriginalconfigjson", function (req, res) {

    const configDir = "/opt/cello/fabric-1.0"
    //const configDir = config.path.fabricConfig
    const storage = multer.diskStorage({
        destination: function(req, file, callback) {
            callback(null, configDir)
        },
        filename: function(req, file, callback) {
            callback(null, "originalconfig.json")
        }
    })
    const upload = multer({
        storage: storage,
        limits: { fileSize: config.fileUploadLimits},
    }).single('originalconfigjson');
    upload(req, res, function(err) {
        res.json({
            success: true
        })
    })
})

// 上床channel修改后的配置文件,为了更新通道用
router.post("/uploadupdatedconfigjson", function (req, res) {

    const configDir = "/opt/cello/fabric-1.0"
    //const configDir = config.path.fabricConfig
    const storage = multer.diskStorage({
        destination: function(req, file, callback) {
            callback(null, configDir)
        },
        filename: function(req, file, callback) {
            callback(null, "updatedconfig.json")
        }
    })
    const upload = multer({
        storage: storage,
        limits: { fileSize: config.fileUploadLimits},
    }).single('updatedconfigjson');
    upload(req, res, function(err) {
        res.json({
            success: true
        })
    })
})


//
// router.post("/:apikey/updatechannel", function(req, res) {
//     const chainId = req.body.chainid;
//     const channel_name = req.body.channelname
//     const signorg = req.body.signorg;
//     const addorg = req.body.addorg;
//     var updated_config_json
//     var original_config_json
//     var updated_config_proto
//     var original_config_proto
//     var config_proto
//     var signatures = [];
//     var orgs = req.body.orgs;
//     var channelName = channel_name;
//
//     ChainModel.findOne({_id: chainId}, function (err, chain) {
//         if (err) {
//             res.json({
//                 success: false,
//                 error: "chain not exist!"
//             })
//         } else {
//
//             let promises0 = []
//
//             let p0 = new Promise((resolve, reject) => {
//                 const helper = require(`/opt/cello/fabric-1.0/lib/helper`)
//                 helper.initializeWithChannel(chain.template, channelName, chain.channelpeerlist)
//                 helper.getChannelConfig(signorg, channelName).then(function(config_envelope) {
//                     var original_config_proto = config_envelope.config.toBuffer();
//
//                     var response = superagent.post('http://127.0.0.1:7059/protolator/decode/common.Config',
//                         original_config_proto)
//                         .buffer()
//                         .end((err, response) => {
//                             if(err) {
//                                 res.json(err);
//                                 return
//                             }
//                             var original_config_json = response.text.toString();
//
//                             fs.writeFileSync('/opt/cello/fabric-1.0/originalconfig.json', original_config_json);
//
//                             resolve();
//                         });
//                 });
//             })
//             promises0.push(p0);
//
//             let p1 = new Promise((resolve, reject) => {
//                 if (shell.exec(`/opt/cello/fabric-1.0/configtxgen -printOrg ${addorg} --configPath=/opt/cello/fabric-1.0/  > /opt/cello/fabric-1.0/${addorg}.json`).code !== 0) {
//                     res.json({
//                         success: false,
//                         error: "generate org config fail!"
//                     })
//                     return;
//                 }
//                 resolve();
//             })
//             promises0.push(p1)
//
//             Promise.all(promises0).then(() => {
//
//                 if (shell.exec(`/opt/cello/fabric-1.0/jq -s '.[0] * {"channel_group":{"groups":{"Application":{"groups": {"${addorg}":.[1]}}}}}' /opt/cello/fabric-1.0/originalconfig.json /opt/cello/fabric-1.0/${addorg}.json > /opt/cello/fabric-1.0/updatedconfig.json`).code !== 0) {
//                     res.json({
//                         success: false,
//                         error: "generate org config fail!"
//                     })
//                     return;
//                 }
//
//                 if (shell.exec(`/opt/cello/fabric-1.0/configtxlator proto_encode --input /opt/cello/fabric-1.0/originalconfig.json --type common.Config --output /opt/cello/fabric-1.0/config.pb`).code !== 0) {
//                     res.json({
//                         success: false,
//                         error: "generate org config fail!"
//                     })
//                     return;
//                 }
//
//                 if (shell.exec(`/opt/cello/fabric-1.0/configtxlator proto_encode --input /opt/cello/fabric-1.0/updatedconfig.json --type common.Config --output /opt/cello/fabric-1.0/modified_config.pb`).code !== 0) {
//                     res.json({
//                         success: false,
//                         error: "generate org config fail!"
//                     })
//                     return;
//                 }
//
//                 if (shell.exec(`/opt/cello/fabric-1.0/configtxlator compute_update --channel_id ${channel_name} --original /opt/cello/fabric-1.0/config.pb --updated /opt/cello/fabric-1.0/modified_config.pb --output /opt/cello/fabric-1.0/new_org_update.pb`).code !== 0) {
//                     res.json({
//                         success: false,
//                         error: "generate org config fail!"
//                     })
//                     return;
//                 }
//
//                 config_proto = fs.readFileSync('/opt/cello/fabric-1.0/new_org_update.pb');
//
//                 let promises = []
//                 const helper = require(`/opt/cello/fabric-1.0/lib/helper`)
//                 // helper.initialize(chain.template)
//                 helper.initializeWithChannel(chain.template, channel_name, chain.channelpeerlist)
//                 orgs.forEach((org, i) => {
//                     let p = new Promise((resolve, reject) => {
//                         var client = helper.getClientForOrg(org);
//                         var channel = helper.getChannelForName(channel_name,org);
//                         client._userContext = null;
//                         helper.getOrgAdmin(org).then((user) => {
//                             // read the config block from the orderer for the channel
//                             // and initialize the verify MSPs based on the participating
//                             // organizations
//                             return channel.initialize();
//                         }, (err) => {
//                             // logger.error('Failed to enroll user \'' + username + '\'. ' + err);
//                             // throw new Error('Failed to enroll user \'' + username + '\'. ' + err);
//                         }).then((success) => {
//
//                             var signature = client.signChannelConfig(config_proto, channel_name);
//                             signatures.push(signature);
//                             client._userContext = null;
//
//                             logger.info('org %s sign the update channel %s request!! signature is %s', org, channel_name, signature.toString());
//
//
//                             resolve()
//                         });
//                     })
//                     promises.push(p)
//                 });
//
//                 Promise.all(promises).then(() => {
//
//                     // -------------begin
//                     var client = helper.getClientForOrg(signorg);
//                     var channel = helper.getChannelForName(channel_name,signorg);
//                     client._userContext = null;
//                     helper.getOrgAdmin(signorg).then((user) => {
//                         // read the config block from the orderer for the channel
//                         // and initialize the verify MSPs based on the participating
//                         // organizations
//                         return channel.initialize();
//                     }, (err) => {
//                         // logger.error('Failed to enroll user \'' + username + '\'. ' + err);
//                         // throw new Error('Failed to enroll user \'' + username + '\'. ' + err);
//                     }).then((success) => {
//
//                         let tx_id = client.newTransactionID();
//                         let request = {
//                             config: config_proto,
//                             signatures : signatures,
//                             name : channel_name,
//                             orderer : channel.getOrderers()[0],
//                             txId  : tx_id
//                         };
//
//                         logger.info('begin to update channel!!!');
//                         logger.info('update config is: %s', config_proto.toString());
//                         logger.info('orderer address is: %s', channel.getOrderers()[0]);
//
//                         // this will send the update request to the orderer
//                         return client.updateChannel(request);
//                         // -------------end
//
//
//                         // // -------------begin
//                         // var client = helper.getOrdererClient();
//                         // var channel = helper.getChannelForName(channel_name,signorg);
//                         //
//                         // // var signature = client.signChannelConfig(config_proto, channel_name);
//                         // // signatures.push(signature);
//                         //
//                         // helper.getOrdererAdmin().then((user) => {
//                         //     let tx_id = client.newTransactionID();
//                         //     let request = {
//                         //         config: config_proto,
//                         //         signatures : signatures,
//                         //         name : channel_name,
//                         //         orderer : channel.getOrderers()[0],
//                         //         txId  : tx_id
//                         //     };
//                         //
//                         //
//                         //     logger.info('begin to update channel!!!');
//                         //     logger.info('update config is: %s', config_proto.toString());
//                         //     logger.info('orderer address is: %s', channel.getOrderers()[0]);
//                         //
//                         //     // this will send the update request to the orderer
//                         //     return client.updateChannel(request);
//                         //     // -------------end
//
//
//                     }, (err) => {
//
//                     }).then((result) => {
//                         if(result.status && result.status === 'SUCCESS') {
//                             res.json({
//                                 success: true,
//                                 message: "Update Channel Success!"
//                             })
//                         } else {
//                             logger.error('updateChannel error:' + result.info);
//                             res.json({
//                                 success: false,
//                                 message: result.info,
//                             })
//                         }
//                         return;
//                     }, (err) => {
//                         logger.error('Failed to updateChannel due to error: ' + err.stack ? err.stack :
//                             err);
//                         res.json({
//                             success: false,
//                             message: "Update Channel Fail!"
//                         })
//                     })
//
//
//                 }).catch((err) => {
//                     logger.error('Failed to updateChannel due to error: ' + err.stack ? err.stack :
//                         err);
//                     res.json({
//                         success: false,
//                         message: "Update Channel Fail!"
//                     })
//                 });
//
//             })
//         }
//     })
//
// });


// 更新通道操作
router.post("/:apikey/updatechannel", function(req, res) {
    const chainId = req.body.chainid;
    const channel_name = req.body.channelname  // 要更新的通道
    const signorg = req.body.signorg; // 发起组织
    var updated_config_json
    var original_config_json
    var updated_config_proto
    var original_config_proto
    var config_proto
    var signatures = [];
    var orgs = req.body.orgs

    ChainModel.findOne({_id: chainId}, function (err, chain) {
        if (err) {
            res.json({
                success: false,
                error: "chain not exist!"
            })
        } else {
            let readpromises = []
            let p1 = new Promise((resolve, reject) => {
                fs.readFile("/opt/cello/fabric-1.0/updatedconfig.json", function (err, data) { 
                    if (err) {
                        res.json({
                            success: false,
                            error: "updatedconfig not exist!"
                        })
                        reject()
                    }
                    updated_config_json = new Buffer(data);
                    // updated_config_json = data
                    resolve()

                })
            })
            let p2 = new Promise((resolve, reject) => {
                fs.readFile("/opt/cello/fabric-1.0/originalconfig.json", function (err, data) {
                    if (err) {
                        res.json({
                            success: false,
                            error: "originalconfig not exist!"
                        })
                        reject()
                    }
                    original_config_json = new Buffer(data);
                    resolve()

                })
            })
            readpromises.push(p1)
            readpromises.push(p2)


            Promise.all(readpromises).then(() => {

                /*var aaa = superagent.post('http://127.0.0.1:7059/protolator/encode/common.Config',
                    original_config_json.toString())
                    .buffer()
                    .end((err, res) => {
                        if(err) {
                            logger.error(err);
                            return;
                        }
                        let config_proto = res.body;
                        //logger.info('config_proto %s',config_proto.toString());
                    });*/

                return superagent.post('http://127.0.0.1:7059/protolator/encode/common.Config',
                    original_config_json.toString())
                    .buffer();

            }).then((response) => {
                original_config_proto = response.body;
                //original_config_proto = Buffer.from(response.body, 'binary');

                /*var aaa = superagent.post('http://127.0.0.1:7059/protolator/encode/common.Config',
                    updated_config_json.toString())
                    .buffer()
                    .end((err, res) => {
                        if(err) {
                            logger.error(err);
                            return;
                        }
                        let config_proto = res.body;
                        //logger.info('config_proto %s',config_proto.toString());
                    });*/

                return superagent.post('http://127.0.0.1:7059/protolator/encode/common.Config',
                    updated_config_json.toString())
                    .buffer();
            }).then((response) => {
                updated_config_proto = response.body;
                //updated_config_proto = Buffer.from(response.body, 'binary');
                var formData = {
                    channel: channel_name,
                    original: {
                        value: original_config_proto,
                        options: {
                            filename: 'original.proto',
                            contentType: 'application/octet-stream'
                        }
                    },
                    updated: {
                        value: updated_config_proto,
                        options: {
                            filename: 'updated.proto',
                            contentType: 'application/octet-stream'
                        }
                    }
                };

                // configtxlator服务需要事先启动起来
                return new Promise((resolve, reject) =>{
                    requester.post({
                        url: 'http://127.0.0.1:7059/configtxlator/compute/update-from-configs',
                        formData: formData
                    }, function optionalCallback(err, res, body) {
                        if (err) {
                            reject(err);
                        } else {
                            var proto = Buffer.from(body, 'binary');
                            logger.info('update config is %s', proto.toString());

                            fs.writeFile('/opt/cello/fabric-1.0/update-config-by-lator.pb', body, 'binary',function (err) {

                                if (shell.exec(`/opt/cello/fabric-1.0/configtxlator proto_encode --input /opt/cello/fabric-1.0/originalconfig.json --type common.Config --output /opt/cello/fabric-1.0/config.pb`).code !== 0) {
                                    res.json({
                                        success: false,
                                        error: "generate org config fail!"
                                    })
                                    return;
                                }

                                if (shell.exec(`/opt/cello/fabric-1.0/configtxlator proto_encode --input /opt/cello/fabric-1.0/updatedconfig.json --type common.Config --output /opt/cello/fabric-1.0/modified_config.pb`).code !== 0) {
                                    res.json({
                                        success: false,
                                        error: "generate org config fail!"
                                    })
                                    return;
                                }

                                if (shell.exec(`/opt/cello/fabric-1.0/configtxlator compute_update --channel_id ${channel_name} --original /opt/cello/fabric-1.0/config.pb --updated /opt/cello/fabric-1.0/modified_config.pb --output /opt/cello/fabric-1.0/new_org_update.pb`).code !== 0) {
                                    res.json({
                                        success: false,
                                        error: "generate org config fail!"
                                    })
                                    return;
                                }

                                // if (shell.exec(`/opt/cello/fabric-1.0/configtxlator proto_decode --input /opt/cello/fabric-1.0/new_org_update.pb --type common.ConfigUpdate | /opt/cello/fabric-1.0/jq . > /opt/cello/fabric-1.0/new_org_update.json`).code !== 0) {
                                //     res.json({
                                //         success: false,
                                //         error: "generate org config fail!"
                                //     })
                                //     return;
                                // }
                                //
                                // if (shell.exec(`echo '{"payload":{"header":{"channel_header":{"channel_id":"mychannel", "type":2}},"data":{"config_update":'$(cat /opt/cello/fabric-1.0/new_org_update.json)'}}}' | /opt/cello/fabric-1.0/jq . > /opt/cello/fabric-1.0/new_org_update_in_envelope.json`).code !== 0) {
                                //     res.json({
                                //         success: false,
                                //         error: "generate org config fail!"
                                //     })
                                //     return;
                                // }
                                //
                                // if (shell.exec(`/opt/cello/fabric-1.0/configtxlator proto_encode --input /opt/cello/fabric-1.0/new_org_update_in_envelope.json --type common.Envelope --output /opt/cello/fabric-1.0/new_org_update_in_envelope.pb`).code !== 0) {
                                //     res.json({
                                //         success: false,
                                //         error: "generate org config fail!"
                                //     })
                                //     return;
                                // }


                                var config_proto_string = fs.readFileSync('/opt/cello/fabric-1.0/new_org_update.pb');
                                resolve(config_proto_string);

                            })


                            //resolve(proto);

                            // superagent.post('http://127.0.0.1:7059/protolator/decode/common.Config/update',proto)
                            // .buffer().end((err, response) => {
                            //     if(err) {
                            //         reject(err);
                            //     }
                            //     var update_json = response.text.toString();
                            //     resolve(update_json);
                            // });
                        }
                    });
                });

            }).then((response) =>{

                config_proto = response;

                let promises = []
                const helper = require(`/opt/cello/fabric-1.0/lib/helper`)
                // helper.initialize(chain.template)
                helper.initializeWithChannel(chain.template, channel_name, chain.channelpeerlist)
                orgs.forEach((org, i) => {
                    let p = new Promise((resolve, reject) => {
                        var client = helper.getClientForOrg(org);
                        var channel = helper.getChannelForName(channel_name,org);
                        client._userContext = null;
                        helper.getOrgAdmin(org).then((user) => {
                            // read the config block from the orderer for the channel
                            // and initialize the verify MSPs based on the participating
                            // organizations
                            return channel.initialize();
                        }, (err) => {
                            // logger.error('Failed to enroll user \'' + username + '\'. ' + err);
                            // throw new Error('Failed to enroll user \'' + username + '\'. ' + err);
                        }).then((success) => {

                            var signature = client.signChannelConfig(config_proto, channel_name);
                            signatures.push(signature);
                            client._userContext = null;

                            logger.info('org %s sign the update channel %s request!! signature is %s', org, channel_name, signature.toString());


                            resolve()
                        });
                    })
                    promises.push(p)
                });

                Promise.all(promises).then(() => {

                    // -------------begin
                    var client = helper.getClientForOrg(signorg);
                    var channel = helper.getChannelForName(channel_name,signorg);
                    client._userContext = null;
                    helper.getOrgAdmin(signorg).then((user) => {
                        // read the config block from the orderer for the channel
                        // and initialize the verify MSPs based on the participating
                        // organizations
                        return channel.initialize();
                    }, (err) => {
                        // logger.error('Failed to enroll user \'' + username + '\'. ' + err);
                        // throw new Error('Failed to enroll user \'' + username + '\'. ' + err);
                    }).then((success) => {

                        // var config_proto_string = fs.readFileSync('/opt/cello/fabric-1.0/new_org_update_in_envelope.pb');

                        let tx_id = client.newTransactionID();
                        let request = {
                            config: config_proto,
                            signatures : signatures,
                            name : channel_name,
                            orderer : channel.getOrderers()[0],
                            txId  : tx_id
                        };

                        logger.info('begin to update channel!!!');
                        logger.info('update config is: %s', config_proto.toString());
                        logger.info('orderer address is: %s', channel.getOrderers()[0]);

                        // this will send the update request to the orderer
                        return client.updateChannel(request);
                    // -------------end


                    // // -------------begin
                    // var client = helper.getOrdererClient();
                    // var channel = helper.getChannelForName(channel_name,signorg);
                    //
                    // // var signature = client.signChannelConfig(config_proto, channel_name);
                    // // signatures.push(signature);
                    //
                    // helper.getOrdererAdmin().then((user) => {
                    //     let tx_id = client.newTransactionID();
                    //     let request = {
                    //         config: config_proto,
                    //         signatures : signatures,
                    //         name : channel_name,
                    //         orderer : channel.getOrderers()[0],
                    //         txId  : tx_id
                    //     };
                    //
                    //
                    //     logger.info('begin to update channel!!!');
                    //     logger.info('update config is: %s', config_proto.toString());
                    //     logger.info('orderer address is: %s', channel.getOrderers()[0]);
                    //
                    //     // this will send the update request to the orderer
                    //     return client.updateChannel(request);
                    //     // -------------end


                    }, (err) => {

                    }).then((result) => {
                        if(result.status && result.status === 'SUCCESS') {
                            res.json({
                                success: true,
                                message: "Update Channel Success!"
                            })
                        } else {
                            logger.error('updateChannel error:' + result.info);
                            res.json({
                                success: false,
                                message: result.info,
                            })
                        }
                        return;
                    }, (err) => {
                        logger.error('Failed to updateChannel due to error: ' + err.stack ? err.stack :
                            err);
                        res.json({
                            success: false,
                            message: "Update Channel Fail!"
                        })
                    })


                }).catch((err) => {
                    logger.error('Failed to updateChannel due to error: ' + err.stack ? err.stack :
                        err);
                    res.json({
                        success: false,
                        message: "Update Channel Fail!"
                    })
                });
            })


        }
    })

});

router.post("/:apikey/:id/release", function(req, res) {
  const chain = new Chain(req.apikey, req.username);
  chain.release(req.params.id).then(function(result) {
    res.json(result);
  }).catch(function(err) {
    res.json(err);
  });
});
router.post("/:apikey/:id/edit", function(req, res) {
  const chain = new Chain(req.apikey, req.username);
  chain.edit(req.params.id, req.body.name).then(function(result) {
    res.json(result);
  }).catch(function(err) {
    res.json(err);
  });
});
// 上传通道配置文件
router.post("/uploadchannelconfig", function (req, res) {

    const configDir = "/opt/cello/fabric-1.0"
    //const configDir = config.path.fabricConfig
    const storage = multer.diskStorage({
        destination: function(req, file, callback) {
            callback(null, configDir)
        },
        filename: function(req, file, callback) {
            callback(null, file.originalname)
        }
    })
    const upload = multer({
        storage: storage,
        limits: { fileSize: config.fileUploadLimits},
    }).single('channelconfigfile');
    upload(req, res, function(err) {
        res.json({
            success: true
        })
    })
})

// 上传通道tx文件
router.post("/uploadchanneltx", function (req, res) {

    const configDir = "/opt/cello/fabric-1.0"
    //const configDir = config.path.fabricConfig
    const storage = multer.diskStorage({
        destination: function(req, file, callback) {
            callback(null, configDir)
        },
        filename: function(req, file, callback) {
            callback(null, file.originalname)
        }
    })
    const upload = multer({
        storage: storage,
        limits: { fileSize: config.fileUploadLimits},
    }).single('channeltxfile');
    upload(req, res, function(err) {
        res.json({
            success: true
        })
    })
})



router.get("/:id/blockHeight", function (req, res) {
  const chainId = req.params.id;
  ChainModel.findOne({_id: chainId}, function (err, chain) {
    const chainRootDir = util.format(config.path.chain, req.username, chainId)
    const helper = require(`/opt/cello/fabric-1.0/lib/helper`)
    //helper.initialize(chain.template)
    helper.initializeWithChannel(chain.template, chain.curchannel, chain.channelpeerlist)
    const query = require(`/opt/cello/fabric-1.0/lib/query`)
    query.getChannelHeight('peer1', req.username, 'org1', chain.curchannel)
      .then(function(message) {
        res.json({
          success: true,
          height: parseInt(message)
        })
      });
  })
})

router.get("/:id/queryChannels", function (req, res) {
  const chainId = req.params.id;
  ChainModel.findOne({_id: chainId}, function (err, chain) {
      if (!chain.initialized){
          res.send({
              success: true,
              channels: [],
          })
          return
      }

      const chainRootDir = util.format(config.path.chain, req.username, chainId)
      const query = require(`/opt/cello/fabric-1.0/lib/query`)
      query.initializeWithChannel(chain.template,chain.curchannel, chain.channelpeerlist)
      query.getChannels('peer1', req.username, 'org1', chain.curchannel)
      .then(function(message) {
        res.send({
          success: true,
          channels:message.channels,
        });
      }, (err) => {
        res.send({
          success: false,
          channels: [],
          error: err.stack ? err.stack : err
        })
      }).catch((err) => {
      res.send({
        success: false,
        channels: [],
        error: err.stack ? err.stack : err
      })
    });
  })
})

// 查询最近的区块信息
router.get("/:id/recentBlock", function (req, res) {
  const chainId = req.params.id;
  const launchpeer = req.query.launchpeer; // 要查询的peer,格式为:orgname+空格+peername
  if (typeof(launchpeer) == "undefined"){
      res.json({
          success: true,
      })
      return;
  }

  const fgindex = launchpeer.indexOf(' ')
  const orgname = launchpeer.slice(0,fgindex)
  const peername = launchpeer.slice(fgindex+1,launchpeer.length)
  const currentChannel = req.query.currentChannel;
  const blockHeight = parseInt(req.query.blockHeight);
  let recentNum = parseInt(req.query.recentNum);
  recentNum = recentNum > blockHeight ? blockHeight : recentNum;
  let blockIds = []
  for (let index=blockHeight-1; index>=blockHeight-recentNum; index--) {
    blockIds.push(index)
  }
  let allBlocks = []
  ChainModel.findOne({_id: chainId}, function (err, chain) {
    let promises = []
    for (let index in blockIds) {
      const blockId = blockIds[index];
      let p = new Promise((resolve, reject) => {
        const chainRootDir = util.format(config.path.chain, req.username, chainId)
        const query = require(`/opt/cello/fabric-1.0/lib/query`)
        query.initializeWithChannel(chain.template,currentChannel, chain.channelpeerlist)
        query.getBlockByNumber(peername, blockId, req.username, orgname, currentChannel)
          .then(function (message) {
            const {header: {data_hash}} = message;
            let txTimestamps = []
            message.data.data.map((item, index) => {
              const {payload: {header: {channel_header: {tx_id, timestamp, channel_id}}}} = item;
              const txTime = moment(timestamp, "ddd MMM DD YYYY HH:mm:ss GMT+0000 (UTC)")
              txTimestamps.push(txTime.utc())
            })
            txTimestamps = txTimestamps.sort(function (a, b) {  return a - b;  });
            allBlocks.push({
              id: blockId,
              hash: data_hash,
              transactions: message.data.data.length,
              timestamp: txTimestamps.slice(-1).pop()
            })
            resolve()
          })
      })
      promises.push(p)
    }
    Promise.all(promises).then(() => {
      res.json({success: true, allBlocks})
    })
  })
})

// 查询最近的区块信息
router.get("/:id/recentTransaction", function (req, res) {
  const chainId = req.params.id;
  const launchpeer = req.query.launchpeer;// 要查询的peer,格式为:orgname+空格+peername
  if (typeof(launchpeer) == "undefined"){
      res.json({
          success: true,
      })
      return;
  }
  const fgindex = launchpeer.indexOf(' ')
  const orgname = launchpeer.slice(0,fgindex)
  const peername = launchpeer.slice(fgindex+1,launchpeer.length)

  const currentChannel = req.query.currentChannel;
  const blockHeight = parseInt(req.query.blockHeight);
  let recentNum = parseInt(req.query.recentNum);
  recentNum = recentNum > blockHeight ? blockHeight : recentNum;
  let blockIds = []
  for (let index=blockHeight-1; index>=blockHeight-recentNum; index--) {
    blockIds.push(index)
  }
  let allTransactions = []
  ChainModel.findOne({_id: chainId}, function (err, chain) {
    let promises = []
    for (let index in blockIds) {
      const blockId = blockIds[index];
      let p = new Promise((resolve, reject) => {
        const chainRootDir = util.format(config.path.chain, req.username, chainId)
        const query = require(`/opt/cello/fabric-1.0/lib/query`)
        query.initializeWithChannel(chain.template,currentChannel, chain.channelpeerlist)
        query.getBlockByNumber(peername, blockId, req.username, orgname, currentChannel)
          .then(function (message) {
            message.data.data.map((item, index) => {
              const {payload: {header: {channel_header: {tx_id, timestamp, channel_id}}}} = item;
              const txTime = moment(timestamp, "ddd MMM DD YYYY HH:mm:ss GMT+0000 (UTC)")
              if (tx_id) {
                allTransactions.push({
                  id: tx_id,
                  timestamp: txTime.utc(),
                  channelId: channel_id
                })
              }
            })
            resolve()
          })
      })
      promises.push(p)
    }
    Promise.all(promises).then(() => {
      res.json({success: true, allTransactions})
    })
  })
})

router.get("/:id/queryByBlockId", function (req, res) {
  const blockId = req.query.id;
  const chainId = req.params.id;
  const launchpeer = req.query.launchpeer;
  if (typeof(launchpeer) == "undefined"){
      res.json({
          success: true,
      })
      return;
  }
  const currentChannel = req.query.currentChannel;
  const fgindex = launchpeer.indexOf(' ')
  const orgname = launchpeer.slice(0,fgindex)
  const peername = launchpeer.slice(fgindex+1,launchpeer.length)


  ChainModel.findOne({_id: chainId}, function (err, chain) {
    const chainRootDir = util.format(config.path.chain, req.username, chainId)
    const query = require(`/opt/cello/fabric-1.0/lib/query`)
    query.initializeWithChannel(chain.template,currentChannel, chain.channelpeerlist);
    query.getBlockByNumber(peername, blockId, req.username, orgname, currentChannel)
        .then(function(message) {
            let txList = []
            message.data.data.map((item, index) => {
                const {payload: {header: {channel_header: {tx_id, timestamp, channel_id}}}} = item;
                const txTime = moment(timestamp, "ddd MMM DD YYYY HH:mm:ss GMT+0000 (UTC)")
                txList.push({
                    id: tx_id,
                    timestamp: txTime.unix(),
                    channelId: channel_id
                })
            })
            res.send({
                success: true,
                txList
            });
        }, (err) => {
            res.json({
                success: false,
                error: err.stack ? err.stack : err
            })
        }).catch((err) => {
        res.json({
            success: false,
            txList: [],
            error: err.stack ? err.stack : err
        })
    });


  })
})

router.get("/:id/queryByTransactionId", function (req, res) {
  const trxnId = req.query.id;
  const chainId = req.params.id;
  const launchpeer = req.query.launchpeer;
  const currentChannel = req.query.currentChannel;
  const fgindex = launchpeer.indexOf(' ');
  const orgname = launchpeer.slice(0,fgindex);
  const peername = launchpeer.slice(fgindex+1,launchpeer.length);

  ChainModel.findOne({_id: chainId}, function (err, chain) {
    const chainRootDir = util.format(config.path.chain, req.username, chainId)
    const query = require(`/opt/cello/fabric-1.0/lib/query`)
      query.initializeWithChannel(chain.template,currentChannel, chain.channelpeerlist)
      query.getTransactionByID(peername, trxnId, req.username, orgname, currentChannel)
      .then(function(message) {
        logger.debug(`message ${JSON.stringify(message, null, 2)}`)
        const {transactionEnvelope: {payload: {header: {channel_header: {type}}, data: {actions}}}, validationCode} = message
        const action = actions.length ? actions[0] : {}
        // const {payload: {chaincode_proposal_payload: {input: {chaincode_spec: {type, chaincode_id: {name}, input: {args}}}}}} = action
        const {payload: {action: {proposal_response_payload: {extension: {chaincode_id:{name,version}, response:{payload}}}}}} = action
        res.json({
          success: true,
          chaincodename:name,
          chaincodeversion:version,
          txdata:payload,
          validationCode,
          type
          // name
          // args
        })
      }, (err) => {
        res.json({
          success: false,
          error: err.stack ? err.stack : err
        })
      }).catch((err) => {
      res.json({
        success: false,
        error: err.stack ? err.stack : err
      })
    });
  })
})

router.get("/:id/queryChainCodes", function (req, res) {
  const chainId = req.params.id;
  const launchpeer = req.query.launchpeer;
  const currentChannel = req.query.currentChannel;
  if (typeof(launchpeer) == "undefined"){
      res.json({
          success: true,
      })
      return;
  }
  const fgindex = launchpeer.indexOf(' ');
  const orgname = launchpeer.slice(0,fgindex);
  const peername = launchpeer.slice(fgindex+1,launchpeer.length);

  let allChainCodes = []
  let currentchain
  ChainModel.findOne({_id: chainId/*, initialized:true*/}, function (err, chain) {
    if (chain != null) {
        currentchain = chain
        // const chainRootDir = util.format(config.path.chain, req.username, chainId)
        const query = require(`/opt/cello/fabric-1.0/lib/query`)
        query.initializeWithChannel(chain.template, "", chain.channelpeerlist)

        let promises0 = []
        chain.channelpeerlist.forEach(function(item,index){
            let arr = item.split(' ')
            // channelpeertable.push({
            //     peername: arr[0],
            //     orgname: arr[1],
            //     channelname: arr[2],
            // })
            let peername = arr[0];
            let orgname = arr[1];
            let channelname  = arr[2];
            let p0 = new Promise((resolve, reject) => {
                query.getInstalledChaincodes(peername, 'instantiated', req.username, orgname, channelname)
                    .then(function(message) {
                        if (typeof message != 'string') {
                            let promises = []
                            for (let index in message) {
                                const chainCodeString = message[index];
                                let l = chainCodeString.slice(0,-1).split(',');
                                let chainCode = {};
                                for (let i in l) {
                                    let a = l[i].split(':');
                                    logger.debug(`key ${a[0]} ${a[1]}`)
                                    chainCode[a[0].trim()] = a[1].trim();
                                }
                                let p = new Promise((resolve, reject) => {
                                    logger.debug(`chain code name ${chainCode.name}`)

                                    ChainCode.findOne({chainCodeName: chainCode.name}, function (err, chainCodeDoc) {
                                        if (err) {
                                            resolve()
                                        } else {
                                            let isExist = false;
                                            for (let i in allChainCodes){
                                                if (allChainCodes[i].name == chainCode.name)
                                                    isExist = true;
                                            }
                                            if (!isExist){
                                                if (chainCodeDoc) {
                                                    allChainCodes.push({
                                                        name: chainCodeDoc.name
                                                    })
                                                    resolve()
                                                } else {
                                                    const newChainCode = new ChainCode({
                                                        name: chainCode.name,
                                                        chainCodeName:chainCode.name,
                                                        userId: currentchain.user_id,
                                                        path: chainCode.path,
                                                        chain:currentchain,
                                                        channelName:channelname,
                                                        status:"instantiated",
                                                        version:chainCode.version,

                                                    })
                                                    newChainCode.save(function(err, data){
                                                        if(err){ return console.log(err) }

                                                    })
                                                    allChainCodes.push({
                                                        name: chainCode.name
                                                    })

                                                    resolve()
                                                }
                                            }else{
                                                resolve()
                                            }

                                        }
                                    })
                                })
                                promises.push(p)
                            }
                            Promise.all(promises).then(() => {
                                // res.json({success: true, allChainCodes: allChainCodes})
                                resolve();
                            })
                        }


                    }, (err) => {
                        reject();
                        // res.json({
                        //     success: false,
                        //     error: err.stack ? err.stack : err
                        // })
                    }).catch((err) => {
                        reject();
                    // res.json({
                    //     success: false,
                    //     error: err.stack ? err.stack : err
                    // })
                });
            });
            promises0.push(p0);

        });

        Promise.all(promises0).then(() => {
            res.json({success: true, allChainCodes: allChainCodes})
        }, (err) => {
            res.json({
                success: false,
                error: err.stack ? err.stack : err
            })
        })


    }

  })
})

export default router
