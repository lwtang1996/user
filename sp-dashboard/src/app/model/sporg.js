'use strict';

module.exports = app => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;

  const SporgSchema = new Schema({
    sp_org_name: {type: String},
    network_type: {type: String},
    consensus_plugin: {type: String},
    create_ts: {type: Date},
    status: {type: String},
  });

  return mongoose.model('Sporg', SporgSchema, 'sp_org');
};