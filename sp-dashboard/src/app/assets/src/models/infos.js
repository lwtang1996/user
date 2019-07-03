/*
 SPDX-License-Identifier: Apache-2.0
*/
import { orgInitial, spOrg_initialized } from '../services/organization'
import { routerRedux } from 'dva/router';

export default {
    namespace: "information",

    state: {
        informations: [],
    },

    effects: {
        *orgInitial({payload}, {call, put}) {
            //console.log(payload);
            const response = yield call(orgInitial, payload);
            //console.log(response);
            if(response.data.code === 201) {
                //console.log('success return');
                yield put(routerRedux.push({
                    pathname: '/infos/initialized',
                }));
            }
        },

        *fetchInitialized( {payload}, {call, put}) {
            console.log('in model');
            const response = yield call(spOrg_initialized);
            console.log(response);
            yield put({
                type: 'setSporg',
                payload: response,
            });
        }
    },

    reducers: {
        setSporg(state, action) {
            return {
                ...state,
                informations: action.payload,
            };
        },
    },
};