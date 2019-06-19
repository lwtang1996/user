/*
 SPDX-License-Identifier: Apache-2.0
*/
import { orgInitial } from '../services/organization'

export default {
    namespace: "information",

    state: {
        informations: [],
    },

    effects: {
        *orgInitial({payload}, {call, put}) {
            //console.log(payload);
            const response = yield call(orgInitial, payload);
        }
    },

    reducers: {
    },
};