import { stringify } from 'qs';
import request from '../utils/request';
import config from '../utils/config';

const { url } = config;

export async function queryOrgs() {
    //console.log('in service');
    return request('/api/orgs');
}

export async function orgInitial(params) {
    //console.log(params);
    return request('/api/sp_org', {
        method: 'POST',
        body: params,
    });
}

export async function spOrg_initialized() {
    console.log('in service');
    return request('/api/sp_org_initialized');
}