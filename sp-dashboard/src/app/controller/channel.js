const Controller = require('egg').Controller;

class ChannelController extends Controller {
  async fetch_orgs() {
    const { ctx } = this;
    console.log('in channel fetch orgs');
    const org_Info = await ctx.service.user.fetch_channel_org();
    ctx.body = org_Info;
    //console.log('in contrller',ctx.body);

  }

  async create_channel() {
    const {ctx} = this;
    console.log('in controller', ctx.request.body);
    await ctx.service.channel.create_channel1();
  }
}

module.exports = ChannelController;