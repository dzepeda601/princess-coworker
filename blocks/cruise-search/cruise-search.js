/**
 * Cruise Search block
 * Authored rows: [field label | list of options] … then a final row with the search link.
 * An option without a link is the "any" placeholder; linked options carry their
 * filter as query parameters, which are merged into the search link on submit.
 */

let fieldCount = 0;

/**
 * Builds a labelled select from an authored option list.
 * @param {string} labelText Field label
 * @param {Element} list Authored <ul> of options
 * @returns {Element} field wrapper
 */
function buildField(labelText, list) {
  fieldCount += 1;
  const id = `cruise-search-field-${fieldCount}`;

  const field = document.createElement('div');
  field.className = 'cruise-search-field';

  const label = document.createElement('label');
  label.htmlFor = id;
  label.textContent = labelText;

  const select = document.createElement('select');
  select.id = id;
  [...list.querySelectorAll(':scope > li')].forEach((li) => {
    const option = document.createElement('option');
    const link = li.querySelector('a[href]');
    option.textContent = li.textContent.trim();
    option.value = link ? link.href : '';
    select.append(option);
  });

  field.append(label, select);
  return field;
}

/** @param {Element} block The cruise-search block element */
export default function decorate(block) {
  const form = document.createElement('form');
  form.className = 'cruise-search-form';
  form.setAttribute('role', 'search');

  let action = null;
  [...block.children].forEach((row) => {
    const [first, second] = row.children;
    const list = second && second.querySelector('ul');
    if (list) {
      form.append(buildField(first.textContent.trim(), list));
      return;
    }
    const link = row.querySelector('a[href]');
    if (link) action = link;
  });

  if (action) {
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'cruise-search-submit';
    submit.textContent = action.textContent.trim();
    form.append(submit);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const url = new URL(action ? action.href : window.location.href);
    form.querySelectorAll('select').forEach((select) => {
      if (!select.value) return;
      new URL(select.value).searchParams.forEach((value, key) => url.searchParams.set(key, value));
    });
    window.location.href = url.href;
  });

  block.replaceChildren(form);
}
