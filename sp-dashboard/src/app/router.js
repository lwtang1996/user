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
  router.post('/api/spinit', controller.home.spinit);

  io.of('/').route('join', io.controller.home.join);

  router.prefix(process.env.WEBROOT);
  
};