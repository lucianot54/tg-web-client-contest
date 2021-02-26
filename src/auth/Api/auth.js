/* global tgMain, tgProto */

const sendCode = async phone => {
  let result = await tgProto.sendMethod('auth.sendCode', {
    phone_number: phone,
    api_id: 832266,
    api_hash: 'efdc90dbf343a65bb4fba668f6e7d3a3',
    settings: {}
  });

  if(result.error_message) {
    if(result.error_message == 'AUTH_RESTART') {
      return await sendCode(phone);
    }

    return { err: result.error_message };
  }

  return {
    hash: result.phone_code_hash,
    codeLength: result.type.length
  };
};

const cancelCode = async (phone, hash) => {
  await tgProto.sendMethod('auth.cancelCode', {
    phone_number: phone,
    phone_code_hash: hash
  });
};

const signIn = async (phone, hash, code) => {
  const result = await tgProto.sendMethod('auth.signIn', {
    phone_number: phone,
    phone_code_hash: hash,
    phone_code: code
  });

  if(result._ == 'auth.authorizationSignUpRequired') {
    let termOfService = '';
    if(result.terms_of_service && result.terms_of_service.text) {
      termOfService = result.terms_of_service.text;
    }

    return { next: 'reg', termOfService };
  }

  if(result.error_message) {
    if(result.error_message == 'SESSION_PASSWORD_NEEDED') {
      return { next: 'pass' };
    }

    return { err: result.error_message };
  }

  if(result._ == 'auth.authorization') {
    tgMain.setStorage('user_id', result.user.id);
    return { next: 'done' };
  }
};

const signUp = async (phone, hash, firstName, lastName) => {
  const result = await tgProto.sendMethod('auth.signUp', {
    phone_number: phone,
    phone_code_hash: hash,
    first_name: firstName,
    last_name: lastName
  });

  if(result.error_message) return { err: result.error_message };

  if(result._ == 'auth.authorization') {
    tgMain.setStorage('user_id', result.user.id);
    return { next: 'done' };
  }
};

const checkPassword = async password => {
  const accountPassword = await tgProto.sendMethod('account.getPassword');

  const passwordSrp = await tgMain.callWorker('encryptPassword', {
    password,
    g: accountPassword.current_algo.g,
    p: accountPassword.current_algo.p,
    salt1: accountPassword.current_algo.salt1,
    salt2: accountPassword.current_algo.salt2,
    srpB: accountPassword.srp_B
  });

  const result = await tgProto.sendMethod('auth.checkPassword', {
    password: {
      _: 'inputCheckPasswordSRP',
      srp_id: accountPassword.srp_id,
      A: passwordSrp.A,
      M1: passwordSrp.M1
    }
  });

  if(result.error_message) return { err: result.error_message };

  if(result._ == 'auth.authorizationSignUpRequired') {
    let termOfService = '';
    if(result.terms_of_service && result.terms_of_service.text) {
      termOfService = result.terms_of_service.text;
    }

    return { next: 'reg', termOfService };
  }

  if(result._ == 'auth.authorization') {
    tgMain.setStorage('user_id', result.user.id);
    return { next: 'done' };
  }
};

export {
  sendCode,
  cancelCode,
  signIn,
  signUp,
  checkPassword
};