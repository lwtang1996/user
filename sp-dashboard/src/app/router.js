'use strict';
const LocalStrategy = require('passport-local').Strategy;

module.exports = app => {
  const { router, controller, io, passport } = app;

  passport.use(new LocalStrategy({
    passReqToCallback: true,
  }, (req, username, password, done) => {
    const user = {
      provider: 'local',
      username,
      password,
    };
    app.passport.doVerify(req, user, done);
    console.log(user);
  }));
  passport.verify(async (ctx, user) => {
    console.log(user);
    const userInfo = await ctx.service.user.login(user);
    return await userInfo;
  });
  passport.serializeUser(async (ctx, user) => {
    return user;
  });
  passport.deserializeUser(async (ctx, user) => {
    return user;
  });

  router.get('/', controller.home.index);
  // router.post('/api/auth/login', app.controller.home.login);
  router.post('/api/auth/login', passport.authenticate('local', {successRedirect: process.env.WEBROOT}));
  router.post('/api/sp_org', controller.home.spinit);
  router.get('/api/sp_org_initialized', controller.home.fetch_spOrg);
  router.get('/api/channel_fetch_orgs', controller.channel.fetch_orgs);
  router.post('/api/create_channel', controller.channel.create_channel);

  // io.of('/').route('join', io.controller.home.join);

  router.prefix(process.env.WEBROOT);
  
};