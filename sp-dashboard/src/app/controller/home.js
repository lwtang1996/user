const Controller = require('egg').Controller;

class HomeController extends Controller {
  async index() {
    const { ctx } = this;
    let userInfo = {};
    let data = {
      webRoot: process.env.WEBROOT,
    };
    if(!ctx.isAuthenticated()) {
      userInfo = {
        username: '',
        authority: '',
      };
    }
    else {
      //console.log('llll');
      userInfo = {
        username: ctx.user.username,
        authority: ctx.user.role,
      };
    }
    //console.log('userInfo:', userInfo);
    data = {
      ...data,
      ...userInfo,
    };
    //console.log('data:',data);
    await ctx.render('index.tpl', data);
  }

  async spinit() {
    const { ctx } = this;
    //console.log('in spinit:',ctx.request.body);
    const result = await ctx.curl('0.0.0.0:8088/api/sp_org', {
      method: 'POST',
      contentType: 'json',
      data: ctx.request.body,
      dataType: 'json',
    });
    //console.log('response.code:',result.data.code);
    //console.log(result);
    if(result.data.code === 201) {
      ctx.status = 200;
      ctx.body = result.res;
      console.log(ctx.body);
    }
  }

  async fetch_spOrg() {
    const { ctx } = this;
    console.log('in fetch sp org');
    const sp_org_Info = await ctx.service.user.fetch_sp_org();
    ctx.body = {...sp_org_Info};
    console.log(ctx.body);

  }

  // async login() {
  //   //console.log('hhh');
  //   const { ctx } = this;
  //   console.log(ctx.request.body);
  //   const data = ctx.request.body;
  //   if(data.username==='admin' && data.password==='pass') {
  //     ctx.status = 200;
  //     ctx.body = {
  //       "success": true,
  //       "next": '/index',
  //     };
  //   }
  // }
}

module.exports = HomeController;