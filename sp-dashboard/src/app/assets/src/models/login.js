/*
 SPDX-License-Identifier: Apache-2.0
*/
import { login } from "../services/user";
import { setAuthority } from "../utils/authority";
import { routerRedux } from "dva/router";

export default {
  namespace: "login",

  state: {
    status: undefined,
  },

  effects: {
    *login({ payload }, { call, put }) {
      console.log(payload);
      const response = yield call(login, payload);
      console.log(response);
      // if (response && response.success) {
      //   console.log('login success');
      //   yield put(
      //     routerRedux.push('/infos/index')
      //   );
      //   //window.location = response.next;
      // }
      if (!response) {
        window.location = window.webRoot;
      }
    },
  },

  reducers: {
    changeLoginStatus(state, { payload }) {
      setAuthority(payload.currentAuthority);
      return {
        ...state,
        status: payload.status,
        type: payload.type,
      };
    },
  },
};
