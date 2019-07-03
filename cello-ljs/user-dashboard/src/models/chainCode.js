
/* Copyright IBM Corp, All Rights Reserved.

 SPDX-License-Identifier: Apache-2.0
*/
const mongoose = require('mongoose');
import rimraf from 'rimraf'
const log4js = require('log4js');
const logger = log4js.getLogger(__filename.slice(__dirname.length + 1));
const logLevel = process.env.DEV === "True" ? "DEBUG" : "INFO"
logger.setLevel(logLevel);

const chainCode = new mongoose.Schema({
  name: String, // 有随机数的,唯一的
  userId: String,
  chainCodeName: String,  // 不是唯一的
  uploadTime: { type: Date, default: Date.now },
  chain: {type: mongoose.Schema.Types.ObjectId, ref: "chain"},
  status: {
    type: String,
    default: 'uploaded',
    enum: ['uploaded', 'installed', 'instantiated', 'error', 'instantiating']
  },
  path: String,
  channelName:String,
  version: String,
})

chainCode.post('remove', function(doc) {
  // rimraf(doc.path, function () { logger.info(`delete chain code directory ${doc.path}`); });
});

const ChainCode = mongoose.model('ChainCode', chainCode);

module.exports = ChainCode;
