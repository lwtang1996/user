import { stringify } from 'qs';
import request from '../utils/request';
import config from '../utils/config';

const { url } = config;

export async function queryOrgs() {
    //console.log('in service');
    return request('/api/orgs');
}

export async function orgInitial(params) {
    console.log(params);
    return request('/api/spinit', {
        method: 'POST',
        body: params,
    });
}