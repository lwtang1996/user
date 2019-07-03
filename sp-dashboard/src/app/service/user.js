'use strict';

const Service = require('egg').Service;

class UserService extends Service {
  async login(user) {
    //const username = user.username;
    const userModel = await this.ctx.model.User.findOne({ name: user.username, password: user.password});
    // console.log(userModel.username);
    // console.log(user.password);
    // if(userModel.password == user.password) {
    //   console.log('hhhhhh');
    //   return {
    //     username: user.username,
    //     role: 'admin',
    //   }
    // }
    if (userModel) {
      console.log('in database');
      return {
        username: user.username,
        role: 'admin',
      }
    }
    else {
      console.log('not in database');
    }
  }

  async fetch_sp_org() {
    const spModel = await this.ctx.model.Sporg.findOne();
    //console.log('in db');
    console.log('type',typeof(new Date(spModel.create_tx)));
    //const time_ = new Date(spModel.create_tx).toISOString();
    if(spModel) {
      console.log(spModel);
      return {
        sp_org_name: spModel.sp_org_name,
        network_type: spModel.network_type,
        consensus_plugin: spModel.consensus_plugin,
        status: spModel.status,
        time: new Date().toString(),
      }
    }
  }

  async fetch_channel_org() {
    const orgModel = await this.ctx.model.Sporg.findOne();
    if(orgModel) {
      const rst = [{
        orgname: orgModel.sp_org_name,
        orgstatus: orgModel.status,
      }];
      console.log(rst);
      return rst;
    }
  }
}

module.exports = UserService;