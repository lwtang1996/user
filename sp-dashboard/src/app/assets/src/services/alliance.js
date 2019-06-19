import request from '../utils/request';

export async function createAlliance(params) {
  console.log('in service/alliance:',params);
  return request(`/api/alliance`, {
    method: 'POST',
    body: params,
  });
}

export async function acceptJoinAlliance(params) {
  return request('api/acceptjoinalliance', {
    method: 'POST',
    body: params,
  });
}

export async function queryAlliance() {
  return request(`api/alliances`);
}

export async function queryInvation() {
  return request('api/invation');
}