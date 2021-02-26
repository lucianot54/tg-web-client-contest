import {
  send
} from '../transport';

import {
  serializeMethod
} from '../tl';

const users = {};

users.getUsers = inputUsers => {

};

users.getCurrentUser = () => {
  return send(serializeMethod('users.getUsers', {
    id: [
      { _: 'inputUserSelf' }
    ]
  }));
};

export { users };