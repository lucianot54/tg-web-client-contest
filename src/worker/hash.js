const sha1 = async data => {
  const result = await crypto.subtle.digest('SHA-1', data);
  return new Uint8Array(result);
};

const sha256 = async data => {
  const result = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(result);
};

export {
  sha1,
  sha256
};