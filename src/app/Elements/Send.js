import {
  bindRefs,
  on
} from '../../helpers';

import {
  uploadFile
} from '../Api/files';

const smiles = {
  people: ["๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐คฃ", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐ฅฐ", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐คช", "๐คจ", "๐ง", "๐ค", "๐", "๐คฉ", "๐ฅณ", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐ฃ", "๐", "๐ซ", "๐ฉ", "๐ฅบ", "๐ข", "๐ญ", "๐ค", "๐ ", "๐ก", "๐คฌ", "๐คฏ", "๐ณ", "๐ฅต", "๐ฅถ", "๐ฑ", "๐จ", "๐ฐ", "๐ฅ", "๐", "๐ค", "๐ค", "๐คญ", "๐คซ", "๐คฅ", "๐ถ", "๐", "๐", "๐ฌ", "๐", "๐ฏ", "๐ฆ", "๐ง", "๐ฎ", "๐ฒ", "๐ด", "๐คค", "๐ช", "๐ต", "๐ค", "๐ฅด", "๐คข", "๐คฎ", "๐คง", "๐ท", "๐ค", "๐ค", "๐ค", "๐ค ", "๐", "๐ฟ", "๐น", "๐บ", "๐คก", "๐ฉ", "๐ป", "๐", "๐ฝ", "๐พ", "๐", "๐บ", "๐ธ", "๐น", "๐ป", "๐ผ", "๐ฝ", "๐", "๐ฟ", "๐พ"],
  nature: ["๐ถ", "๐ฑ", "๐ญ", "๐น", "๐ฐ", "๐ฆ", "๐ป", "๐ผ", "๐จ", "๐ฏ", "๐ฆ", "๐ฎ", "๐ท", "๐ฝ", "๐ธ", "๐ต", "๐", "๐", "๐", "๐", "๐", "๐ง", "๐ฆ", "๐ค", "๐ฃ", "๐ฅ", "๐ฆ", "๐ฆ", "๐ฆ", "๐ฆ", "๐บ", "๐", "๐ด", "๐ฆ", "๐", "๐", "๐ฆ", "๐", "๐", "๐", "๐ฆ", "๐ฆ", "๐ฆ", "๐ข", "๐", "๐ฆ", "๐ฆ", "๐ฆ", "๐", "๐ฆ", "๐ฆ", "๐ฆ", "๐ฆ", "๐ก", "๐ ", "๐", "๐ฌ", "๐ณ", "๐", "๐ฆ", "๐", "๐", "๐", "๐ฆ", "๐ฆ", "๐", "๐ฆ", "๐ฆ", "๐ช", "๐ซ", "๐ฆ", "๐ฆ", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐ฆ", "๐", "๐ฆ", "๐", "๐ฉ", "๐", "๐", "๐ฆ", "๐ฆ", "๐ฆ", "๐ฆข", "๐", "๐ฆ", "๐ฆก", "๐", "๐", "๐ฆ", "๐พ", "๐", "๐ฒ", "๐ต", "๐", "๐ฒ", "๐ณ", "๐ด", "๐ฑ", "๐ฟ", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐พ", "๐", "๐ท", "๐น", "๐ฅ", "๐บ", "๐ธ", "๐ผ", "๐ป", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐ซ", "โญ", "๐", "โจ", "โก", "๐ฅ", "๐ฅ", "๐", "โ", "โ", "๐จ", "๐ง", "๐ฆ", "โ", "๐"],
  food: ["๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐ฅญ", "๐", "๐ฅฅ", "๐ฅ", "๐", "๐", "๐ฅ", "๐ฅฆ", "๐ฅฌ", "๐ฅ", "๐ฝ", "๐ฅ", "๐ฅ", "๐ ", "๐ฅ", "๐ฅฏ", "๐", "๐ฅ", "๐ฅจ", "๐ง", "๐ฅ", "๐ณ", "๐ฅ", "๐ฅ", "๐ฅฉ", "๐", "๐", "๐ฆด", "๐ญ", "๐", "๐", "๐", "๐ฅช", "๐ฅ", "๐ฎ", "๐ฏ", "๐ฅ", "๐ฅ", "๐ฅซ", "๐", "๐", "๐ฒ", "๐", "๐ฃ", "๐ฑ", "๐ฅ", "๐ค", "๐", "๐", "๐", "๐ฅ", "๐ฅ ", "๐ฅฎ", "๐ข", "๐ก", "๐ง", "๐จ", "๐ฆ", "๐ฅง", "๐ง", "๐ฐ", "๐", "๐ฎ", "๐ญ", "๐ฌ", "๐ซ", "๐ฟ", "๐ฉ", "๐ช", "๐ฐ", "๐ฅ", "๐ฏ", "๐ฅ", "๐ผ", "๐ต", "๐ฅค", "๐ถ", "๐บ", "๐ป", "๐ฅ", "๐ท", "๐ฅ", "๐ธ", "๐น", "๐พ", "๐ฅ", "๐ด", "๐ฅฃ", "๐ฅก", "๐ฅข", "๐ง"],
  travel: ["๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐ด", "๐ฒ", "๐ต", "๐จ", "๐", "๐", "๐", "๐", "๐ก", "๐ ", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐ซ", "๐ฌ", "๐บ", "๐", "๐ธ", "๐", "๐ถ", "โต", "๐ค", "๐ข", "โ", "โฝ", "๐ง", "๐ฆ", "๐ฅ", "๐", "๐ฟ", "๐ฝ", "๐ผ", "๐ฐ", "๐ฏ", "๐ก", "๐ข", "๐ ", "โฒ", "๐", "๐ป", "โบ", "๐ ", "๐ก", "๐ญ", "๐ข", "๐ฌ", "๐ฃ", "๐ค", "๐ฅ", "๐ฆ", "๐จ", "๐ช", "๐ซ", "๐ฉ", "๐", "โช", "๐", "๐", "๐", "๐พ", "๐", "๐", "๐", "๐ ", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐"],
  activity: ["โฝ", "๐", "๐", "โพ", "๐ฅ", "๐พ", "๐", "๐", "๐ฅ", "๐ฑ", "๐", "๐ธ", "๐", "๐", "๐ฅ", "๐", "๐ฅ", "โณ", "๐น", "๐ฃ", "๐ฅ", "๐ฅ", "๐ฝ", "๐น", "๐ท", "๐ฅ", "๐ฟ", "๐", "๐", "๐ฅ", "๐ฅ", "๐ฅ", "๐", "๐ซ", "๐ช", "๐ญ", "๐จ", "๐ฌ", "๐ค", "๐ง", "๐ผ", "๐น", "๐ฅ", "๐ท", "๐บ", "๐ธ", "๐ป", "๐ฒ", "๐ฏ", "๐ณ", "๐ฎ", "๐ฐ", "๐งฉ"],
  objects: ["โ", "๐ฑ", "๐ฒ", "๐ป", "๐ฝ", "๐พ", "๐ฟ", "๐", "๐ผ", "๐ท", "๐ธ", "๐น", "๐ฅ", "๐", "๐", "๐ ", "๐บ", "๐ป", "๐งญ", "โฐ", "โ", "โณ", "๐ก", "๐", "๐", "๐ก", "๐ฆ", "๐งฏ", "๐ธ", "๐ต", "๐ด", "๐ถ", "๐ท", "๐ฐ", "๐ณ", "๐", "๐งฐ", "๐ง", "๐จ", "๐ฉ", "๐งฑ", "๐งฒ", "๐ซ", "๐ฃ", "๐งจ", "๐ช", "๐ฌ", "๐บ", "๐ฎ", "๐ฟ", "๐งฟ", "๐", "๐ญ", "๐ฌ", "๐", "๐", "๐งฌ", "๐ฆ ", "๐งซ", "๐งช", "๐งน", "๐งบ", "๐งป", "๐ฝ", "๐ฐ", "๐ฟ", "๐", "๐งผ", "๐งฝ", "๐งด", "๐", "๐ช", "๐", "๐งธ", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐ฎ", "๐", "๐งง", "๐ฉ", "๐จ", "๐ง", "๐", "๐ฅ", "๐ค", "๐ฆ", "๐ช", "๐ซ", "๐ฌ", "๐ญ", "๐ฎ", "๐ฏ", "๐", "๐", "๐", "๐", "๐งพ", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐ฐ", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐งท", "๐", "๐", "๐", "๐", "๐งฎ", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐"],
  symbols: ["๐งก", "๐", "๐", "๐", "๐", "๐ค", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐ฏ", "๐", "๐", "โ", "โ", "โ", "โ", "โ", "โ", "โ", "โ", "โ", "โ", "โ", "โ", "โ", "๐", "๐", "๐ด", "๐ณ", "๐ถ", "๐", "๐ธ", "๐บ", "๐ท", "๐", "๐ฎ", "๐", "ใ", "ใ", "๐ด", "๐ต", "๐น", "๐ฒ", "๐ฐ", "๐ฑ", "๐", "๐", "๐พ", "๐", "โ", "โญ", "๐", "โ", "๐", "๐ซ", "๐ฏ", "๐ข", "๐ท", "๐ฏ", "๐ณ", "๐ฑ", "๐", "๐ต", "๐ญ", "โ", "โ", "โ", "โ", "๐", "๐", "ใฝ", "๐ธ", "๐ฑ", "๐ฐ", "โ", "๐ฏ", "๐น", "โ", "๐", "๐ ", "โ", "๐", "๐ค", "๐ง", "๐พ", "โฟ", "๐ฟ", "๐ณ", "๐", "๐", "๐", "๐", "๐", "๐น", "๐บ", "๐ผ", "๐ป", "๐ฎ", "๐ฆ", "๐ถ", "๐", "๐ฃ", "๐ค", "๐ก", "๐ ", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐ข", "โธ", "โฏ", "โน", "โบ", "โญ", "โฎ", "โฉ", "โช", "โซ", "โฌ", "๐ผ", "๐ฝ", "๐", "๐", "๐", "๐", "๐", "โ", "โ", "โ", "๐ฒ", "๐ฑ", "๐โ๐จ", "๐", "๐", "๐", "๐", "๐", "ใฐ", "โฐ", "โฟ", "๐", "๐ด", "๐ต", "โซ", "โช", "๐บ", "๐ป", "๐ธ", "๐น", "๐ถ", "๐ท", "๐ณ", "๐ฒ", "โพ", "โฝ", "โฌ", "โฌ", "๐", "๐", "๐", "๐", "๐", "๐", "๐ฃ", "๐ข", "๐ฌ", "๐ญ", "๐", "๐ด", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐", "๐ ", "๐ก", "๐ข", "๐ฃ", "๐ค", "๐ฅ", "๐ฆ", "๐ง", "๐ด", "๐", "๐ฉ", "๐ณโ๐", "๐บ๐ณ", "๐ฆ๐ซ", "๐ฆ๐ฝ", "๐ฆ๐ฑ", "๐ฉ๐ฟ", "๐ฆ๐ธ", "๐ฆ๐ฉ", "๐ฆ๐ด", "๐ฆ๐ฎ", "๐ฆ๐ถ", "๐ฆ๐ฌ", "๐ฆ๐ท", "๐ฆ๐ฒ", "๐ฆ๐ผ", "๐ฆ๐บ", "๐ฆ๐น", "๐ฆ๐ฟ", "๐ง๐ธ", "๐ง๐ญ", "๐ง๐ฉ", "๐ง๐ง", "๐ง๐พ", "๐ง๐ช", "๐ง๐ฟ", "๐ง๐ฏ", "๐ง๐ฒ", "๐ง๐น", "๐ง๐ด", "๐ง๐ฆ", "๐ง๐ผ", "๐ง๐ท", "๐ฎ๐ด", "๐ป๐ฌ", "๐ง๐ณ", "๐ง๐ฌ", "๐ง๐ซ", "๐ง๐ฎ", "๐ฐ๐ญ", "๐จ๐ฒ", "๐จ๐ฆ", "๐ฎ๐จ", "๐จ๐ป", "๐ง๐ถ", "๐ฐ๐พ", "๐จ๐ซ", "๐น๐ฉ", "๐จ๐ฑ", "๐จ๐ณ", "๐จ๐ฝ", "๐จ๐จ", "๐จ๐ด", "๐ฐ๐ฒ", "๐จ๐ฌ", "๐จ๐ฉ", "๐จ๐ฐ", "๐จ๐ท", "๐จ๐ฎ", "๐ญ๐ท", "๐จ๐บ", "๐จ๐ผ", "๐จ๐พ", "๐จ๐ฟ", "๐ฉ๐ฐ", "๐ฉ๐ฏ", "๐ฉ๐ฒ", "๐ฉ๐ด", "๐ช๐จ", "๐ช๐ฌ", "๐ธ๐ป", "๐ฌ๐ถ", "๐ช๐ท", "๐ช๐ช", "๐ธ๐ฟ", "๐ช๐น", "๐ช๐บ", "๐ซ๐ฐ", "๐ซ๐ด", "๐ซ๐ฏ", "๐ซ๐ฎ", "๐ซ๐ท", "๐ฌ๐ซ", "๐ต๐ซ", "๐น๐ซ", "๐ฌ๐ฆ", "๐ฌ๐ฒ", "๐ฌ๐ช", "๐ฉ๐ช", "๐ฌ๐ญ", "๐ฌ๐ฎ", "๐ฌ๐ท", "๐ฌ๐ฑ", "๐ฌ๐ฉ", "๐ฌ๐ต", "๐ฌ๐บ", "๐ฌ๐น", "๐ฌ๐ฌ", "๐ฌ๐ณ", "๐ฌ๐ผ", "๐ฌ๐พ", "๐ญ๐น", "๐ญ๐ณ", "๐ญ๐ฐ", "๐ญ๐บ", "๐ฎ๐ธ", "๐ฎ๐ณ", "๐ฎ๐ฉ", "๐ฎ๐ท", "๐ฎ๐ถ", "๐ฎ๐ช", "๐ฎ๐ฒ", "๐ฎ๐ฑ", "๐ฎ๐น", "๐ฏ๐ฒ", "๐ฏ๐ต", "๐", "๐ฏ๐ช", "๐ฏ๐ด", "๐ฐ๐ฟ", "๐ฐ๐ช", "๐ฐ๐ฎ", "๐ฝ๐ฐ", "๐ฐ๐ผ", "๐ฐ๐ฌ", "๐ฑ๐ฆ", "๐ฑ๐ป", "๐ฑ๐ง", "๐ฑ๐ธ", "๐ฑ๐ท", "๐ฑ๐พ", "๐ฑ๐ฎ", "๐ฑ๐น", "๐ฑ๐บ", "๐ฒ๐ด", "๐ฒ๐ฌ", "๐ฒ๐ผ", "๐ฒ๐พ", "๐ฒ๐ป", "๐ฒ๐ฑ", "๐ฒ๐น", "๐ฒ๐ญ", "๐ฒ๐ถ", "๐ฒ๐ท", "๐ฒ๐บ", "๐พ๐น", "๐ฒ๐ฝ", "๐ซ๐ฒ", "๐ฒ๐ฉ", "๐ฒ๐จ", "๐ฒ๐ณ", "๐ฒ๐ช", "๐ฒ๐ธ", "๐ฒ๐ฆ", "๐ฒ๐ฟ", "๐ฒ๐ฒ", "๐ณ๐ฆ", "๐ณ๐ท", "๐ณ๐ต", "๐ณ๐ฑ", "๐ณ๐จ", "๐ณ๐ฟ", "๐ณ๐ฎ", "๐ณ๐ช", "๐ณ๐ฌ", "๐ณ๐บ", "๐ณ๐ซ", "๐ฐ๐ต", "๐ฒ๐ฐ", "๐ฒ๐ต", "๐ณ๐ด", "๐ด๐ฒ", "๐ต๐ฐ", "๐ต๐ผ", "๐ต๐ธ", "๐ต๐ฆ", "๐ต๐ฌ", "๐ต๐พ", "๐ต๐ช", "๐ต๐ญ", "๐ต๐ณ", "๐ต๐ฑ", "๐ต๐น", "๐ต๐ท", "๐ถ๐ฆ", "๐ท๐ช", "๐ท๐ด", "๐ท๐บ", "๐ท๐ผ", "๐ผ๐ธ", "๐ธ๐ฒ", "๐ธ๐น", "๐ธ๐ฆ", "๐ธ๐ณ", "๐ท๐ธ", "๐ธ๐จ", "๐ธ๐ฑ", "๐ธ๐ฌ", "๐ธ๐ฝ", "๐ธ๐ฐ", "๐ธ๐ฎ", "๐ฌ๐ธ", "๐ธ๐ง", "๐ธ๐ด", "๐ฟ๐ฆ", "๐ฐ๐ท", "๐ธ๐ธ", "๐ช๐ธ", "๐ฑ๐ฐ", "๐ง๐ฑ", "๐ธ๐ญ", "๐ฐ๐ณ", "๐ฑ๐จ", "๐ต๐ฒ", "๐ป๐จ", "๐ธ๐ฉ", "๐ธ๐ท", "๐ธ๐ช", "๐จ๐ญ", "๐ธ๐พ", "๐น๐ผ", "๐น๐ฏ", "๐น๐ฟ", "๐น๐ญ", "๐น๐ฑ", "๐น๐ฌ", "๐น๐ฐ", "๐น๐ด", "๐น๐น", "๐น๐ณ", "๐น๐ท", "๐น๐ฒ", "๐น๐จ", "๐น๐ป", "๐ป๐ฎ", "๐บ๐ฌ", "๐บ๐ฆ", "๐ฆ๐ช", "๐ฌ๐ง", "๐ด๓ ง๓ ข๓ ฅ๓ ฎ๓ ง๓ ฟ", "๐ด๓ ง๓ ข๓ ณ๓ ฃ๓ ด๓ ฟ", "๐ด๓ ง๓ ข๓ ท๓ ฌ๓ ณ๓ ฟ", "๐บ๐ธ", "๐บ๐พ", "๐บ๐ฟ", "๐ป๐บ", "๐ป๐ฆ", "๐ป๐ช", "๐ป๐ณ", "๐ผ๐ซ", "๐ช๐ญ", "๐พ๐ช", "๐ฟ๐ฒ", "๐ฟ๐ผ"]
};

const pasteEmoji = ($container, type, emojis) => {
  const $block = document.createElement('div');
  $block.className = 'send-smiles_emoji-block';
  $block.id = `emojiBlock-${type}`;

  let emojisHtml = '';
  emojis.forEach(emoji => {
    emojisHtml += `<div class="send-smiles_emoji">${emoji}</div>`;
  });

  $block.innerHTML = emojisHtml;
  $container.appendChild($block);
};

class SendElement extends HTMLElement {
  constructor() {
    super();

    this._scrollValue = 1;
  }

  connectedCallback() {
    this.className = 'send';

    const attachMenuItems = [
      [ 'photo', 'photo', 'Photo' ],
      [ 'document', 'document', 'Document' ]
    ];

    this.innerHTML =
     `<div class="send_form">
        <div class="send_button">
          <div class="send-smiles is-active">
            <div class="send-smiles_wrapper">
              <div class="send-smiles_top">
                <div class="tabs">
                  <div class="tabs_elem is-active">Emoji</div>
                  <div class="tabs_elem">Stickers</div>
                </div>
              </div>
              <div class="send-smiles_content">
                <div class="send-smiles_body">
                  <tg-scroll offset-side="2" offset-top="2"
                             offset-bottom="2" ref="scrollEmoji"></tg-scroll>
                </div>
                <div class="send-smiles_bottom">
                  <div class="send-smiles_bottom-elem" to-id="people">
                    <div class="icon icon__smile"></div>
                  </div>
                  <div class="send-smiles_bottom-elem" to-id="nature">
                    <div class="icon icon__animals"></div>
                  </div>
                  <div class="send-smiles_bottom-elem" to-id="food">
                    <div class="icon icon__eats"></div>
                  </div>
                  <div class="send-smiles_bottom-elem" to-id="travel">
                    <div class="icon icon__car"></div>
                  </div>
                  <div class="send-smiles_bottom-elem" to-id="activity">
                    <div class="icon icon__sport"></div>
                  </div>
                  <div class="send-smiles_bottom-elem" to-id="objects">
                    <div class="icon icon__lamp"></div>
                  </div>
                  <div class="send-smiles_bottom-elem" to-id="symbols">
                    <div class="icon icon__flag"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="icon icon__smile"></div>
        </div>
        <label ref="sendLabel">Message</label>
        <tg-scroll offset-side="8" offset-bottom="8"
                   offset-top="8" ref="sendScroll">
          <textarea ref="sendInput" autocomplete="off" rows="1"></textarea>
        </tg-scroll>
        <div class="send_button send_button__right">
          <div class="menu-wrapper">
            <tg-menu items="${encodeURIComponent(JSON.stringify(attachMenuItems))}" is-visible ref="menuSend"></tg-menu>
          </div>
          <div class="icon icon__attach"></div>
        </div>
      </div>
      <tg-button icon="send" ref="sendButton"></tg-button>
      <input type="file" class="send-input-file" ref="inputFilePhoto" accept=".png, .jpg, .jpeg">
      <input type="file" class="send-input-file" ref="inputFileDocument">`;

    bindRefs(this);

    const $emojiContainer = this._$scrollEmoji.$content;

    pasteEmoji($emojiContainer, 'people', smiles.people);
    pasteEmoji($emojiContainer, 'nature', smiles.nature);
    pasteEmoji($emojiContainer, 'food', smiles.food);
    pasteEmoji($emojiContainer, 'travel', smiles.travel);
    pasteEmoji($emojiContainer, 'activity', smiles.activity);
    pasteEmoji($emojiContainer, 'objects', smiles.objects);
    pasteEmoji($emojiContainer, 'symbols', smiles.symbols);

    on(this._$scrollEmoji.$content, 'click', e => {
      if(e.target.className != 'send-smiles_emoji') return;

      const value = this._$sendInput.value;
      this._$sendInput.value = this._$sendInput.value +
        (value.length ? ' ' : '') +
        e.target.textContent + ' ';
      this._inputHandler();
    });

    Array.from(this.querySelectorAll('.send-smiles_bottom-elem')).forEach(elem => {
      on(elem, 'click', () => {
        const toId = '#emojiBlock-' + elem.getAttribute('to-id');
        this._$scrollEmoji._scrollContainer(
          this._$scrollEmoji.$content.querySelector(toId).offsetTop ,
          true
        );
      })
    });

    on(this._$menuSend, 'photoMenuClick', () => {
      this._$inputFilePhoto.click();
    });

    on(this._$menuSend, 'documentMenuClick', () => {
      this._$inputFileDocument.click();
    });

    on(this._$inputFilePhoto, 'change', () => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        this._$inputFilePhoto.value = '';

        const inputFile = await uploadFile(new Uint8Array(reader.result));

        this._inputMedia = {
          _: 'inputMediaUploadedPhoto',
          file: inputFile
        };

        this.dispatchEvent(new CustomEvent('sendMedia'), {
          bubbles: true
        });
      };
      reader.readAsArrayBuffer(this._$inputFilePhoto.files[0]);
    });

    on(this._$inputFileDocument, 'change', () => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const inputFile = await uploadFile(new Uint8Array(reader.result));

        this._inputMedia = {
          _: 'inputMediaUploadedDocument',
          file: inputFile,
          mime_type: this._$inputFileDocument.files[0].type,
          attributes: [
            {
              _: 'documentAttributeFilename',
              file_name: this._$inputFileDocument.files[0].name
            }
          ]
        };

        this._$inputFileDocument.value = '';
        this.dispatchEvent(new CustomEvent('sendMedia'), {
          bubbles: true
        });
      };
      reader.readAsArrayBuffer(this._$inputFileDocument.files[0]);
    });

    on(this._$sendLabel, 'click', () => {
      this.setFocus();
    });

    on(this._$sendButton, 'click', () => {
      this.dispatchEvent(new CustomEvent('sendMess'), {
        bubbles: true
      });
    });

    on(this._$sendInput, 'input', this._inputHandler.bind(this));

    on(this._$sendInput, 'keydown', e => {
      if(e.keyCode == 13) {
        if(e.ctrlKey) {
          const value = this.getValue();
          this.setValue(
            value.substr(0, this._$sendInput.selectionStart) +
            '\n' +
            value.substr(this._$sendInput.selectionStart)
          );

          return true;
        }

        this.dispatchEvent(new CustomEvent('sendMess'), {
          bubbles: true
        });
        e.preventDefault();
        return false;
      }
    });

    on(this._$sendScroll, 'scrollValueUpdate', async () => {
      let scrollValue = this._$sendScroll.scrollValue;
      if(scrollValue === null) scrollValue = 1;
      this._scrollValue = scrollValue;
    });
  }

  getValue() {
    return this._$sendInput.value;
  }

  setValue(value) {
    this._$sendInput.value = value;
    this._inputHandler();
  }

  setFocus() {
    this._$sendInput.focus();
  }

  _inputHandler() {
    let isSetBotScroll = false;
    if(this._scrollValue >= 1) isSetBotScroll = true;

    this._$sendInput.style.height = 'auto';
    const height = this._$sendInput.scrollHeight;
    this._$sendInput.style.height = height + 'px';
    this._$sendScroll.style.height = height + 'px';
    this._$sendScroll.update();

    if(isSetBotScroll) this._scrollValue = 1;
    if(this._scrollValue >= 1) {
      this._$sendScroll._scrollContainer(999999, true);
    }

    this.dispatchEvent(new CustomEvent('itInput'), {
      bubbles: true
    });

    this.classList[
      this._$sendInput.value != '' ? 'add' : 'remove'
    ]('is-fill');
  }
}

if(!customElements.get('tg-send')) {
  customElements.define('tg-send', SendElement);
}