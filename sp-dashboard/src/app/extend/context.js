'use strict';

module.exports = {
  get createChannel() {
    return this.app.createChannel;
  },
};