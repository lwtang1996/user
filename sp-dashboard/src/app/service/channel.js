'use strict';

const Service = require('egg').Service;
const Client = require('fabric-client');
const fs = require('fs');
const path = require('path');
//const shell = require('shelljs');

class ChannelService extends Service {

  async create_channel1() {
    const { ctx } = this;

    Client.addConfigFile(path.join(__dirname, '../../config/config.json'));
    const ORGS = Client.getConfigSetting('test-network');
    const client = new Client();

    const caRootsPath = ORGS.orderer.tls_cacerts;
    const data = fs.readFileSync(path.join(__dirname, caRootsPath));
    // await ctx.createChannel(network, keyValueStorePath, config.default.channelName, 
    //   channelConfigPath, 'org1', chain.type);

    //向orderer发送建立通道请求
    //const result = await client.createChannel(request);
  }

  async generateNetworkFabricV1_2() {

    const orderers = {};
    const certificateAuthorities = {};
    const keyValueStorePath = `/opt/data/client-kvs`;
    const channels = {
      orderers: [
        'orderer.example.com',
      ],
    };
    const peers = {};
    const organizations = {};
    const channelsPeers = {};
    orderers['orderer'] = {
      grpcOptions: {
        'ssl-target-name-override': 'orderer',
      },
      tlsCACerts: {
        path: './app/lib/fabric/fixtures/channel/v1.2/crypto-config/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt',
      },
      url: `grpcs://0.0.0.0:8050`,
    };
    let network = {};

    const peerNames = [];
    peerNames.push(`peer0.org1.example.com`);

    peers[`peer0.org1.example.com`] = {
      eventUrl: `grpcs://127.0.0.1:7150`,
      grpcOptions: {
        'ssl-target-name-override': `peer0.org1.example.com`,
      },
      tlsCACerts: {
        path: `./app/lib/fabric/fixtures/channel/v1.2/crypto-config/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt`,
      },
      url: `grpcs://127.0.0.1:7050`,
    };
    channelsPeers[`peer0.org1.example.com`] = {
      chaincodeQuery: true,
      endorsingPeer: true,
      eventSource: true,
      ledgerQuery: true,
    };
    organizations[`org1`] = {
      adminPrivateKey: {
        path: `./app/lib/fabric/fixtures/channel/v1.2/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore/admin_sk`,
      },
      certificateAuthorities: [`ca-org1`],
      mspid: `Org1MSP`,
      peers: peerNames,
      signedCert: {
        path: `./app/lib/fabric/fixtures/channel/v1.2/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/Admin@org1.example.com-cert.pem`,
      },
    };
    certificateAuthorities[`ca-org1`] = {
      caName: `ca-org1`,
      httpOptions: {
        verify: false,
      },
      registrar: [
        {
          enrollId: 'admin',
          enrollSecret: 'adminpw',
        },
      ],
      tlsCACerts: {
        path: `./app/lib/fabric/fixtures/channel/v1.2/crypto-config/peerOrganizations/org1.example.com/ca/ca.org1.example.com-cert.pem`,
      },
      url: `https://127.0.0.1:7850`,
    };
    network[`org1`] = {
      'x-type': 'hlfv1',
      name: `alliance-org1`,
      description: `org1`,
      version: '1.0',
      client: {
        organization: `org1`,
        credentialStore: {
          path: keyValueStorePath,
          cryptoStore: {
            path: `${keyValueStorePath}/tmp`,
          },
          wallet: 'wallet',
        },
      },
    };

    channels.peers = channelsPeers;
    const channelsConfig = {};
    channelsConfig[`mychannel`] = channels;
    network = Object.assign(network, {
      config: {
        version: '1.0',
        'x-type': 'hlfv1',
        name: 'alliance',
        description: 'alliance',
        orderers,
        certificateAuthorities,
        organizations,
        peers,
        channels: channelsConfig,
      },
    });
    return network;
  }

  async create_channel() {
    const { ctx } = this;
    //const client = new Client();
    // await ctx.createChannel(network, keyValueStorePath, config.default.channelName, 
    //   channelConfigPath, 'org1', chain.type);
    const network = await this.generateNetworkFabricV1_2();
    const channelConfigPath = `../config`;
    await ctx.createChannel(network,'','mychannel',channelConfigPath,'org1','fabric-1.2');

    //向orderer发送建立通道请求
    //const result = await client.createChannel(request);
  }

  
}

module.exports = ChannelService;