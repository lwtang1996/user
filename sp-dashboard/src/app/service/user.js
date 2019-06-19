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
}

module.exports = UserService;