import { createAlliance, queryAlliance, queryInvation, acceptJoinAlliance} from '../services/alliance'
import { routerRedux } from 'dva/router';
import { message } from 'antd';

export default {
  namespace: "alliance",

  state: {
    allianceinfo: [],
    invitations: [],
  },

  effects: {
    *createAlliance({payload}, {call, put}) {
      console.log(payload);
      const response = yield call(createAlliance, payload);
      //console.log('aaaaaaaaaaaaaaaaaaaaaaaa');
      message.success('创建联盟成功');
      // if(true) {
      //   yield put(
      //     routerRedux.push({
      //       pathname: '/alliance/my-alliance',
      //     })
      //   );
      // }
    },

    *fetchAlliance({payload}, {call, put}) {
      console.log('in model');
      const response = yield call(queryAlliance, payload);
      //console.log(response);
      yield put({
        type: 'setAlliances',
        payload: response,
      })
    },

    *fetchInvitation( {payload}, {call, put}) {
      const response = yield call(queryInvation, payload);
      //console.log(response);
      yield put({
        type: 'setInvation',
        payload: response,
      });
    },

    *acceptInvitation({payload}, {call, put}) {
      console.log(payload);
      const response = yield call(acceptJoinAlliance, payload);
    },
  },

  reducers: {
    setAlliances(state, action){
      //console.log(action.payload);
      return {
        ...state,
        allianceinfo: action.payload,
      };
    },

    setInvation(state, action) {
      return {
        ...state,
        invitations: action.payload,
      };
    },
  },
}