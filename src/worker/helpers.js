const randomBytes = length => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
};

const addPadding = (bytes, blockSize) => {
  const size = blockSize - (bytes.length % blockSize);
  if(size == 0 || size == blockSize) return new Uint8Array(bytes);

  return new Uint8Array([
    ... bytes,
    ... randomBytes(size)
  ]);
};

export {
  randomBytes,
  addPadding
};