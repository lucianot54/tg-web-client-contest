/**
 * Add/remove event listener wrapper
 */
export const on = (elem, type, handler) => {
  elem.addEventListener(type, handler);
};

const off = (elem, type, handler) => {
  elem.removeEventListener(type, handler);
};

/**
 * Call window resize event handlers with delay to pretty performance
 */
let fireTimeout;
let resizeHandlers = [];

const callResizeHandlers = () => {
  resizeHandlers.forEach(handler => {
    handler();
  })
};

on(window, 'resize', () => {
  if(fireTimeout) clearTimeout(fireTimeout);
  fireTimeout = setTimeout(callResizeHandlers, 100);
});

export const onResize = handler => {
  resizeHandlers.push(handler);
};

export const clearResizeHandlers = () => {
  resizeHandlers = [];
};

/**
 * Window global events handling wrapper
 */
let windowHandlers = [];

export const onWindow = (type, handler) => {
  windowHandlers.push({
    type,
    handler
  });

  on(window, type, handler);
};

export const offWindowAll = () => {
  windowHandlers.forEach(handler => {
    off(window, handler.type, handler.handler);
  });

  windowHandlers = [];
};

export const deferred = () => {
  const defer = {};

  defer.promise = new Promise((resolve, reject) => {
    defer.resolve = resolve;
    defer.reject = reject;
  });

  return defer;
};

const bytesToStringChunkSize = 0x8000;

export const bytesToStr = bytes => {
  if(bytes.constructor != Uint8Array) bytes = Uint8Array.from(bytes);

  const stringParts = [];
  for(let i = 0, l = bytes.length; i < l; i += bytesToStringChunkSize) {
    stringParts.push(
      String.fromCharCode.apply(null, bytes.subarray(i, i + bytesToStringChunkSize))
    );
  }
  return stringParts.join('');
};

export const sleep = ms => {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
};

var _fillUp = function (value, count, fillWith) {
  var l = count - value.length;
  var ret = "";
  while (--l > -1)
      ret += fillWith;
  return ret + value;
}

export function hexdump(arrayBuffer, offset, length) {
  var view = new DataView(arrayBuffer);
  offset = offset || 0;
  length = length || arrayBuffer.byteLength;

  var out = _fillUp("Offset", 8, " ") + "  00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F\n";
  var row = "";
  for (var i = 0; i < length; i += 16) {
      row += _fillUp(offset.toString(16).toUpperCase(), 8, "0") + "  ";
      var n = Math.min(16, length - offset);
      var string = "";
      for (var j = 0; j < 16; ++j) {
          if (j < n) {
              var value = view.getUint8(offset);
              string += value >= 32 ? String.fromCharCode(value) : ".";
              row += _fillUp(value.toString(16).toUpperCase(), 2, "0") + " ";
              offset++;
          }
          else {
              row += "   ";
              string += " ";
          }
      }
      row += " " + string + "\n";
  }
  out += row;
  return out;
}

export const formMessageDate = unix => {
  const date = new Date(unix * 1000);

  let hours = date.getHours();
  if(hours < 10) hours = '0' + hours;

  let minutes = date.getMinutes();
  if(minutes < 10) minutes = '0' + minutes;

  return `${hours}:${minutes}`;
};