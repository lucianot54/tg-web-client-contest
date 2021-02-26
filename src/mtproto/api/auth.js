import {
  bytesToHex,
  strToBytes,
  hexToBytes
} from '../bin';

import {
  mainDcId,
  send,
  getTransport,
  destroyTransport
} from '../transport';

import {
  serializeMethod
} from '../tl';

import {
  deferred,
  bytesToStr
} from '../../helpers/utils';

const auth = {};

/*const computeHash = (password, salt1, salt2) => {
  const hash1 = hexToBytes(sha256(
    bytesToStr(salt1) + password + bytesToStr(salt1)
  ));
  const hash2 = hexToBytes(sha256(
    bytesToStr(salt2) + bytesToStr(hash1) + bytesToStr(salt2)
  ));

  console.log(hash1);
};

auth.checkPassword = password => {
  const defer = deferred();

  let secureRandom;
  let g;
  let p;
  let salt1;
  let salt2;

  send(serializeMethod('account.getPassword', {}))
  .then(result => {
    console.log(result);
    return;

    secureRandom = strToBytes(result.secure_random);
    salt1 = strToBytes(result.new_algo.salt1);
    salt2 = strToBytes(result.new_algo.salt2);
    g = bigInt(result.new_algo.g);
    p = bigInt.fromArray(strToBytes(result.new_algo.p), 256);

    const pwHash = computeHash(password, salt1, salt2);
  });

  return defer.promise;
};*/

auth.sendCode = phone => {
  const defer = deferred();

  const dataBuffer = serializeMethod('auth.sendCode', {
    phone_number: phone,
    api_id: 832266,
    api_hash: 'efdc90dbf343a65bb4fba668f6e7d3a3',
    settings: {}
  });

  send(dataBuffer)
  .then(result => {
    if(result.error_code == 303) {
      const newDc = parseInt(result.error_message.split('_')[2]);
      const prevMainDc = mainDcId;

      TGInit.setStorage('nearest_dc', newDc);

      return getTransport(newDc, true)
      .then(transport => {
        destroyTransport(prevMainDc);

        return send(dataBuffer);
      });
    }

    return result;
  })
  .then(result => {
    if(result.error_message) {
      defer.resolve({ err: result.error_message });
    } else {
      defer.resolve({ hash: result.phone_code_hash, codeLength: result.type.length });
    }
  });

  return defer.promise;
};

auth.signIn = (phone, hash, code) => {
  const defer = deferred();

  send(serializeMethod('auth.signIn', {
    phone_number: phone,
    phone_code_hash: hash,
    phone_code: code
  }))
  .then(result => {
    if(result._ == 'auth.authorizationSignUpRequired') {
      let termOfService = '';
      if(result.terms_of_service && result.terms_of_service.text) {
        termOfService = result.terms_of_service.text;
      }

      defer.resolve({ next: 'reg', termOfService });
    }

    if(result.error_message) {
      if(result.error_message == 'SESSION_PASSWORD_NEEDED') {
        return defer.resolve({ next: 'pass' });
      }

      defer.resolve({ err: result.error_message });
    }

    if(result._ == 'auth.authorization') {
      TGInit.setStorage('access_hash', bytesToHex(result.user.access_hash._bytes));
      TGInit.setStorage('user_id', result.user.id);
      defer.resolve({ next: 'done' });
    }
  });

  return defer.promise;
};

auth.signUp = (phone, hash, firstName, lastName) => {
  const defer = deferred();

  send(serializeMethod('auth.signUp', {
    phone_number: phone,
    phone_code_hash: hash,
    first_name: firstName,
    last_name: lastName
  }))
  .then(result => {
    if(result.error_message) {
      defer.resolve({ err: result.error_message });
    }

    if(result._ == 'auth.authorization') {
      TGInit.setStorage('access_hash', bytesToHex(result.user.access_hash._bytes));
      TGInit.setStorage('user_id', result.user.id);
      defer.resolve({ next: 'done' });
    }
  });

  return defer.promise;
};

export { auth };