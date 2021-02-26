import {
  send
} from '../transport';

import {
  randomInt
} from '../bin';

import {
  serializeMethod,
  serializeObject
} from '../tl';

import {
  deferred
} from '../../helpers/utils';

const messages = {};

messages.getDialogs = () => {
  return send(serializeMethod('messages.getDialogs', {
    offset_date: 0,
    offset_id: 0,
    offset_peer: {
      _: 'inputPeerEmpty'
    },
    limit: 100,
    hash: 0
  }));
};

messages.getHistory = peer => {
  return send(serializeMethod('messages.getHistory', {
    peer,
    offset_date: 0,
    offset_id: 0,
    add_offset: 0,
    limit: 20,
    max_id: 0,
    min_id: 0,
    hash: 0
  }));
};

export { messages };