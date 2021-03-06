/*
 SPDX-License-Identifier: Apache-2.0
*/
import request from '../utils/request'
import config from '../utils/config'
import { stringify } from 'qs';

const { api } = config
const { chain } = api

export async function applyChain(params) {
  return request(chain.apply.format({apikey: window.apikey}), {
    method: "POST",
    body: params
  })
}

// ljs modified
export async function createChannel(params) {
  return request(chain.createChannel.format({apikey: window.apikey}), {
    method: "POST",
    body: params
  })
}

export async function joinChannel(params) {
  return request(chain.joinChannel.format({apikey: window.apikey}), {
    method: "POST",
    body: params
  })
}

export async function updateChannel(params) {
  return request(chain.updateChannel.format({apikey: window.apikey}), {
    method: "POST",
    body: params
  })
}

export async function genchanneltxfile(params) {
  return request(chain.genchanneltxfile.format({apikey: window.apikey}), {
    method: "POST",
    body: params
  })
}

export async function downloadchannelconfigfile(params) {
  return request(chain.downloadchannelconfigfile.format({apikey: window.apikey}), {
    method: "POST",
    body: params
  })
}

export async function downloadorgconfigfile(params) {
  return request(chain.downloadorgconfigfile.format({apikey: window.apikey}), {
    method: "POST",
    body: params
  })
}

export async function downloadConnectionProfile(params) {
  return request(chain.downloadConnectionProfile.format({apikey: window.apikey}), {
    method: "POST",
    body: params
  })
}



export async function listChain(params) {
  return request(`${chain.list.format({apikey: window.apikey})}?${stringify(params)}`)
}

export async function listDBChain(params) {
  return request(`${chain.dbList.format({apikey: window.apikey})}?${stringify(params)}`)
}

export async function releaseChain(params) {
  return request(chain.release.format({apikey: window.apikey, id: params.id}), {
    method: "POST",
    body: params
  })
}

export async function editChain(params) {
  return request(chain.edit.format({apikey: window.apikey, id: params.id}), {
    method: "POST",
    body: params
  })
}

export async function queryChannels(params) {
  return request(`${chain.queryChannels.format({dbId: params.dbId})}?${stringify(params)}`)
}

export async function recentBlocks(params) {
  return request(`${chain.blocks.format({dbId: params.dbId})}?${stringify(params)}`)
}

export async function recentTransactions(params) {
  return request(`${chain.transaction.format({dbId: params.dbId})}?${stringify(params)}`)
}

export async function recentTokenTransfer(params) {
  return request(`${chain.recentTokenTransfer.format({dbId: params.dbId})}?${stringify(params)}`)
}

export async function queryByBlockId(params) {
  return request(`${chain.queryByBlockId.format({chainId: params.chainId})}?${stringify(params)}`)

}
export async function queryByTransactionId(params) {
  return request(`${chain.queryByTransactionId.format({chainId: params.chainId})}?${stringify(params)}`)

}

export async function queryChainCodes(params) {
  return request(`${chain.queryChainCodes.format({dbId: params.dbId})}?${stringify(params)}`)
}
