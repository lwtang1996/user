'use strict';
const path = require('path');
const Enum = require('enum');

const apiBaseUrl = `http://${process.env.RESTFUL_SERVER}/api`;
module.exports = appInfo => {
  const config = exports = {
    logger: {
      level: process.env.LOG_LEVEL || 'INFO',
    },
    static: {
      prefix: `${process.env.WEBROOT}static/`,
      dir: [path.join(appInfo.baseDir, 'app/assets/public/')],
    },
    view: {
      defaultViewEngine: 'nunjucks',
      defaultExtension: '.tpl',
      mapping: {
        '.tpl': 'nunjucks',
      },
    },
    mongoose: {
      client: {
        url: `mongodb://127.0.0.1:27017/hostManager`,
        options: {},
      },
    },
    operator: {
      url: {
        base: apiBaseUrl,
        login: `${apiBaseUrl}/auth/login`,
        
      },
    },
    security: {
      csrf: {
        enable: false,
      },
    },
    operations: new Enum(['ApplyChain', 'ReleaseChain', 'NewCode', 'InstallCode', 'InstantiateCode', 'Invoke', 'Query']),
    
    
  };

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + '_1526391549099_1300';

  // add your config here
  config.middleware = [];

  return config;
};
