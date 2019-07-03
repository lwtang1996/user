/*
 SPDX-License-Identifier: Apache-2.0
*/
import { IntlProvider, defineMessages } from 'react-intl';
import { isUrl, getLocale } from '../utils/utils';

const currentLocale = getLocale();
const intlProvider = new IntlProvider(
  { locale: currentLocale.locale, messages: currentLocale.messages },
  {}
);
const { intl } = intlProvider.getChildContext();

const messages = defineMessages({
  menus: {
    overview: {
      id: 'Menu.Overview',
      defaultMessage: '系统概况',
    },
    host: {
      id: 'Menu.Host',
      defaultMessage: '主机管理',
    },
    chain: {
      id: 'Menu.Chain',
      defaultMessage: '链管理',
    },
    userManagement: {
      id: 'Menu.UserManagement',
      defaultMessage: '用户管理',
    },
  },
});

const menuData = [
  // {
  //   name: intl.formatMessage(messages.menus.overview),
  //   icon: 'home',
  //   path: 'overview',
  // },
  {
    name: "我的信息",
    path: "infos",
    icon: "user",
    children: [
      {
        name: "初始化",
        path: "index",
      },
      {
        name: "已初始化",
        path: "initialized",
        // hideInMenu: true,
        // hideInBreadcrumb: false,
      },
    ]
  },
  
  // {
  //   name: intl.formatMessage(messages.menus.host),
  //   icon: 'laptop',
  //   path: 'host',
  //   children: [
  //     {
  //       name: intl.formatMessage(messages.menus.host),
  //       path: 'index',
  //     },
  //     {
  //       name: 'Create Host',
  //       path: 'create',
  //       hideInMenu: true,
  //       hideInBreadcrumb: false,
  //     },
  //   ],
  // },
  // {
  //   name: intl.formatMessage(messages.menus.chain),
  //   icon: 'link',
  //   path: 'chain',
  // },
  {
    name: "联盟管理",
    path: "alliance",
    icon: "team",
    children: [
      // {
      //   name: "联盟信息",
      //   path: "alliance-info",
      // },
      {
        name: "创建联盟",
        path: "alliance-create",
      },
      // {
      //   name: "我创建的联盟",
      //   path: "my-alliance",
      // },
   ],
  },
  {
    name: "通道管理",
    path: "channel",
    icon: "desktop",
    children: [
      
      {
        name: "创建通道",
        path: "channel-create",
      },
      {
        name: "通道信息",
        path: "channel-info",
      },
      // {
      //   name: "我创建的联盟",
      //   path: "my-alliance",
      // },
   ],
  },
  {
    name: intl.formatMessage(messages.menus.userManagement),
    icon: 'user',
    path: 'user-management',
  },
];

function formatter(data, parentPath = '/', parentAuthority) {
  return data.map(item => {
    let { path } = item;
    if (!isUrl(path)) {
      path = parentPath + item.path;
    }
    const result = {
      ...item,
      path,
      authority: item.authority || parentAuthority,
    };
    if (item.children) {
      result.children = formatter(item.children, `${parentPath}${item.path}/`, item.authority);
    }
    return result;
  });
}

export const getMenuData = () => formatter(menuData);
