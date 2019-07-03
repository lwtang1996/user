import { fetchOrgs, createChannel } from "../services/channel";


export default {
  namespace: 'channel',
  state: {
    orgs: [],
  },
  effects: {
    *fetchOrgs({payload}, {call, put}) {
      const response = yield call(fetchOrgs);
      yield put({
        type: 'setOrgs',
        payload: response,
      });
    },

    *createChannel({payload}, {call, put}) {
      const response = yield call(createChannel, payload);
    }
  },
  reducers: {
    setOrgs(state, action) {
      return {
        ...state,
        orgs: action.payload,
      }
    },
  },
}