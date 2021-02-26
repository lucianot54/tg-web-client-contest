/* global tgProto */

import './Styles/index.scss';

import schemaApiSource from './Api/schema.tl';
import countriesSource from './countries.txt';
const [ numbersFormatsData, countriesData ] = countriesSource.split('||');

import './Blocks/Auth';
import './Blocks/Code';
import './Blocks/Phone';
import './Blocks/Register';

import './Elements/Button';
import './Elements/Loader';
import './Elements/Modal';
import './Elements/ModalPhoto';
import './Elements/Monkey';
import './Elements/Scroll';

import './Input/Checkbox';
import './Input/Code';
import './Input/Country';
import './Input/Password';
import './Input/Phone';
import './Input/Text';

const init = () => {
  tgProto.setMessagesHandling(true);
  tgProto.setApiScheme(schemaApiSource);

  const authComponent = document.createElement('tga-block-auth');
  document.body.appendChild(authComponent);
  return authComponent;
};

export {
  init,
  numbersFormatsData,
  countriesData
};