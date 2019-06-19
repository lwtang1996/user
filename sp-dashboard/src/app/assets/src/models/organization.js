import { queryOrgs } from '../services/organization';

export default {
  namespace: "organization",
  
  state: {
    organizations: [],
  },

  effects: {
    *fetchOrganizations({payload}, {call, put}) {
      //console.log('hhhhh');
      const response = yield call(queryOrgs, payload);
      //console.log(response);
      yield put({
        type: 'setOrgs',
        payload: response,
      });
    },
  },

  reducers: {
    setOrgs(state, action) {
      console.log('in reducers');
      console.log(action.payload);
      return {
        ...state,
        organizations: action.payload.data,
      };
    },
  },
};