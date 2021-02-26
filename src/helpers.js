
/**
 * Dom helpers
 */

const bindRefs = dom => {
  dom.querySelectorAll('[ref]').forEach(elem => {
    dom['_$' + elem.getAttribute('ref')] = elem;
  });
};

/**
 * Add/remove event listener wrapper
 */

const on = (elem, type, handler) => {
  elem.addEventListener(type, handler);
};

const off = (elem, type, handler) => {
  elem.removeEventListener(type, handler);
};

/**
 * Window global events handling wrapper
 */

let windowHandlers = [];

const onWindow = (type, handler) => {
  windowHandlers.push({
    type,
    handler
  });

  on(window, type, handler);
};

const offWindowAll = () => {
  windowHandlers.forEach(handler => {
    off(window, handler.type, handler.handler);
  });

  windowHandlers = [];
};

/**
 * Call window resize event handlers with delay to pretty performance
 */

let fireTimeout;
let resizeHandlers = [];

const callResizeHandlers = () => {
  resizeHandlers.forEach(handler => {
    handler();
  });
};

const resizeHandlerWrapper = () => {
  if(fireTimeout) clearTimeout(fireTimeout);
  fireTimeout = setTimeout(callResizeHandlers, 100);
};

let windowResizeInitialized = false;

const onWindowResize = handler => {
  if(!windowResizeInitialized) {
    windowResizeInitialized = true;

    on(window, 'resize', resizeHandlerWrapper);
  }

  resizeHandlers.push(handler);
};

const clearWindowResize = () => {
  resizeHandlers = [];
  off(window, 'resize', resizeHandlerWrapper);
};

/**
 * Main
 */

const randomInt = max => {
  return Math.floor(Math.random() * max);
};

const deferred = () => {
  const defer = {};

  defer.promise = new Promise((resolve, reject) => {
    defer.resolve = resolve;
    defer.reject = reject;
  });

  return defer;
};

const sleep = ms => {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
};

const getTimeFormatted = (unix, isOnlyTime) => {
  const date = new Date(unix * 1000);

  const dateDay = new Date();
  dateDay.setDate(dateDay.getDate() - 1);

  if(isOnlyTime || unix > Math.round(dateDay / 1000)) {
    let hours = date.getHours();
    let minutes = date.getMinutes();
    if(minutes < 10) minutes = '0' + minutes;

    return `${hours}:${minutes}`;
  }

  const dateWeek = new Date();
  dateWeek.setHours(0, 0, 0, 0);
  dateWeek.setDate(dateWeek.getDate() - 6);

  if(unix > Math.round(dateWeek / 1000)) {
    switch(date.getDay()) {
      case 0: return 'Sun';
      case 1: return 'Mon';
      case 2: return 'Tue';
      case 3: return 'Wed';
      case 4: return 'Thu';
      case 5: return 'Fri';
      case 6: return 'Sat';
    }
  }

  const dateYear = new Date();
  dateWeek.setHours(0, 0, 0, 0);
  dateYear.setFullYear(dateYear.getFullYear() - 1);

  if(unix > Math.round(dateYear / 1000)) {
    const day = date.getDate();

    switch(date.getMonth()) {
      case 0: return `${day} jan`;
      case 1: return `${day} feb`;
      case 2: return `${day} mar`;
      case 3: return `${day} apr`;
      case 4: return `${day} may`;
      case 5: return `${day} jun`;
      case 6: return `${day} jul`;
      case 7: return `${day} aug`;
      case 8: return `${day} sep`;
      case 9: return `${day} oct`;
      case 10: return `${day} nov`;
      case 11: return `${day} dec`;
    }
  }

  let month = date.getMonth() + 1;
  if(month < 10) month = '0' + month;
  const year = date.getFullYear().toString().substr(2);

  return `${date.getDate()}.${month}.${year}`;
};

const getFullTimeFormatted = unix => {
  const date = new Date(unix * 1000);

  const day = date.getDate();
  let month = date.getMonth() + 1;
  if(month < 10) month = '0' + month;
  const year = date.getFullYear();

  let hours = date.getHours();
  let minutes = date.getMinutes();
  if(minutes < 10) minutes = '0' + minutes;
  let seconds = date.getSeconds();
  if(seconds < 10) seconds = '0' + seconds;

  return `${day}.${month}.${year} at ${hours}:${minutes}:${seconds}`;
};

const monthsFull = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

const getInfoTimeFormatted = unix => {
  const date = new Date(unix * 1000);
  const dateStartDay = new Date();
  dateStartDay.setHours(0, 0, 0, 0);

  if(Math.round(date / 1000) > Math.round(dateStartDay / 1000)) return 'Today';

  if(Math.round(date / 1000) > Math.round(dateStartDay / 1000) - 86400) {
    return 'Yesterday';
  }

  const dateWeek = new Date();
  dateWeek.setHours(0, 0, 0, 0);
  dateWeek.setDate(dateWeek.getDate() - 6);

  if(unix > Math.round(dateWeek / 1000)) {
    switch(date.getDay()) {
      case 0: return 'Sunday';
      case 1: return 'Monday';
      case 2: return 'Tuesday';
      case 3: return 'Wednesday';
      case 4: return 'Thursday';
      case 5: return 'Friday';
      case 6: return 'Saturday';
    }
  }

  const dateYear = new Date();
  dateWeek.setHours(0, 0, 0, 0);
  dateYear.setFullYear(dateYear.getFullYear() - 1);

  if(unix > Math.round(dateYear / 1000)) {
    const day = date.getDate();
    return `${monthsFull[date.getMonth()]} ${day}`;
  }

  const month = monthsFull[date.getMonth()];
  return `${date.getDate()} ${month} ${date.getFullYear()}`;
};

const compareObjects = (obj1, obj2) => {
  return JSON.stringify(obj1) == JSON.stringify(obj2);
};

const getNumberFormatted = number => {
  if(number > 999499) {
    const middle = Math.round(number / 100000);
    if(!(middle % 10)) return `${middle / 10}M`;
    return `${(middle / 10).toFixed(1)}M`;
  }

  if(number > 999) {
    const middle = Math.round(number / 100);
    if(!(middle % 10)) return `${middle / 10}K`;
    return `${(middle / 10).toFixed(1)}K`;
  }

  return number;
};

const formatInfoNumber = number => {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const emptyPhotoColors = [
  'e17076', 'faa774',
  'a695e7', '7bc862',
  '6ec9cb', '65aadd',
  'ee7aae'
];

const getEmptyPhotoColor = id => {
  let masked = id & 0xFFFFFFFF;
  if(masked > 2147483647) masked -= 4294967296;
  return emptyPhotoColors[Math.abs(masked) % 7];
};

const getSizeText = size => {
  var thresh = 1024;
  if(Math.abs(size) < thresh) {
    return size + ' B';
  }
  var units = [ 'KB', 'MB', 'GB' ];
  var u = -1;
  do {
    size /= thresh;
    ++u;
  } while(Math.abs(size) >= thresh && u < units.length - 1);
  return size.toFixed(1)+' '+units[u];
};

/**
 * Debug
 */

const hexdumpFillUp = (value, count, fillWith) => {
  let l = count - value.length;
  let result = '';
  while(--l > -1) result += fillWith;
  return result + value;
};

const hexdump = (arrayBuffer, offset, length) => {
  var view = new DataView(arrayBuffer);
  offset = offset || 0;
  length = length || arrayBuffer.byteLength;

  let out = hexdumpFillUp('Offset', 8, ' ') +
    '  00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F\n';
  let row = '';
  for(let i = 0; i < length; i += 16) {
    row += hexdumpFillUp(offset.toString(16).toUpperCase(), 8, '0') + '  ';
    const n = Math.min(16, length - offset);
    let string = '';
    for(let j = 0; j < 16; ++j) {
      if(j < n) {
        const value = view.getUint8(offset);
        string += value >= 32 ? String.fromCharCode(value) : '.';
        row += hexdumpFillUp(value.toString(16).toUpperCase(), 2, '0') + ' ';
        offset++;
      } else {
        row += '   ';
        string += ' ';
      }
    }
    row += ' ' + string + '\n';
  }
  out += row;
  return out;
};

export {
  bindRefs,
  on,
  off,
  onWindow,
  offWindowAll,
  onWindowResize,
  clearWindowResize,
  randomInt,
  deferred,
  sleep,
  getTimeFormatted,
  getFullTimeFormatted,
  getInfoTimeFormatted,
  compareObjects,
  getNumberFormatted,
  getEmptyPhotoColor,
  formatInfoNumber,
  getSizeText,
  hexdump
};