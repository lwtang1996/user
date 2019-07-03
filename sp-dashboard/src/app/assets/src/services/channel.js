import request from '../utils/request';

export async function fetchOrgs() {
  return request('/api/channel_fetch_orgs');
}

export async function createChannel(params) {
  console.log(params);
  return request('/api/create_channel', {
    method: 'POST',
    body: params,
  });
}