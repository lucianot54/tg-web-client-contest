export const domFromHtml = html => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.firstChild;
};

export const refsFromDom = dom => {
  const refs = {};

  dom.querySelectorAll('[ref]').forEach(elem => {
    refs[elem.getAttribute('ref')] = elem;
  });

  return refs;
};