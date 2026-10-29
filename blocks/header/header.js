/*
 * Header block
 *
 * Content contract (content/nav.plain.html, one top-level <div> per section):
 *   1. Utility bar  – lists of links (icon <img> + label). A link whose label
 *                     matches the search page becomes the expandable search.
 *                     A list item without a direct link but with a nested list
 *                     becomes a dropdown (e.g. "Manage booking").
 *   2. Brand        – logo link with image.
 *   3..n. Menus     – one section per top-level trigger:
 *                     <h2>Trigger</h2>
 *                     <ul> level-2 categories, each <li><a href="#">Label</a><ul>…</ul></li>
 *                       inside: optional <li><strong>Group label</strong><ul>…</ul></li>
 *                       (highlighted group), plain links, and links with a nested
 *                       <ul> (open a further column on click)
 *                     </ul>
 *                     promo: <p><img></p><h3>Title</h3><p>Text</p><p><a>CTA</a></p>
 *   last. Tools     – CTA (<strong><a>), then plain paragraphs used as UI labels:
 *                     first = menu toggle label, second = close label,
 *                     third = back label (mobile sub-levels).
 *
 * All copy comes from the fragment; this file only builds structure + behaviour.
 */

const DESKTOP = window.matchMedia('(min-width: 1200px)');

let idCounter = 0;
function uid(prefix) {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (v === undefined || v === null || v === false) return;
    if (k === 'class') node.className = v;
    else node.setAttribute(k, v === true ? '' : v);
  });
  children.flat().forEach((c) => {
    if (c === undefined || c === null) return;
    node.append(c);
  });
  return node;
}

/**
 * Fetches the nav fragment. Metadata-independent dual fetch:
 * /content (local preview) first, then site root (DA/EDS).
 * @returns {Promise<{doc: Document, base: string}|null>}
 */
async function fetchNav() {
  let resp = await fetch('/content/nav.plain.html');
  if (!resp.ok) resp = await fetch('/nav.plain.html');
  if (!resp.ok) return null;
  const html = await resp.text();
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const base = new URL(resp.url, window.location.href).href;
  // published fragments wrap list-item content in <p> and images in <picture>:
  // normalize to the authored shape the builders below expect
  doc.querySelectorAll('li > p').forEach((p) => p.replaceWith(...p.childNodes));
  doc.querySelectorAll('picture').forEach((pic) => {
    const img = pic.querySelector('img');
    if (img) pic.replaceWith(img);
  });
  // ...and move text that followed an icon out of its link: pull it back in
  doc.querySelectorAll('li > a').forEach((a) => {
    if (!a.querySelector('img') || a.textContent.trim()) return;
    let next = a.nextSibling;
    while (next && next.nodeType === Node.TEXT_NODE) {
      const following = next.nextSibling;
      if (next.textContent.trim()) a.append(next);
      next = following;
    }
  });
  doc.querySelectorAll('img[src]').forEach((img) => {
    img.src = new URL(img.getAttribute('src'), base).href;
  });
  return { doc, base };
}

function textOf(node) {
  return (node?.textContent || '').replace(/\s+/g, ' ').trim();
}

/** Own text of an <li> (excluding nested lists). */
function ownText(li) {
  return [...li.childNodes]
    .filter((n) => !(n.nodeType === 1 && ['UL', 'OL'].includes(n.tagName)))
    .map((n) => n.textContent)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function prepImage(img, { eager = false } = {}) {
  if (!img) return img;
  img.loading = eager ? 'eager' : 'lazy';
  img.decoding = 'async';
  return img;
}

function classifySections(sections) {
  const result = {
    utility: null, brand: null, menus: [], tools: null,
  };
  sections.forEach((section) => {
    const hasHeading = section.querySelector(':scope > h2, :scope > h3');
    const lists = section.querySelectorAll(':scope > ul');
    const cta = section.querySelector(':scope > p > strong > a, :scope > p > em > a');
    if (hasHeading && lists.length) result.menus.push(section);
    else if (cta) result.tools = section;
    else if (!lists.length && section.querySelector('a img')) result.brand = section;
    else if (lists.length && !result.utility) result.utility = section;
  });
  return result;
}

/* ---------------- shared open/close state ---------------- */

function closeDropdowns(root, except) {
  root.querySelectorAll('.nav-dropdown-toggle[aria-expanded="true"]').forEach((btn) => {
    if (btn !== except) btn.setAttribute('aria-expanded', 'false');
  });
}

function closeSearch(root) {
  const item = root.querySelector('.nav-search');
  if (!item || !item.classList.contains('is-open')) return;
  item.classList.remove('is-open');
  item.querySelector('.nav-search-toggle')?.setAttribute('aria-expanded', 'false');
}

/** Locks page scroll while a desktop megamenu or the mobile menu covers the page. */
function updateScrollLock(nav) {
  const lock = DESKTOP.matches
    ? !!nav.querySelector('.nav-trigger[aria-expanded="true"]')
    : nav.getAttribute('aria-expanded') === 'true';
  document.body.classList.toggle('nav-scroll-lock', lock);
}

function closeMegamenus(root, except) {
  root.querySelectorAll('.nav-trigger[aria-expanded="true"]').forEach((btn) => {
    if (btn !== except) btn.setAttribute('aria-expanded', 'false');
  });
  updateScrollLock(root.closest('nav') || root);
}

/** Collapses every nested level (categories + further columns) of a megamenu. */
function resetLevels(scope, { keepFirst = false } = {}) {
  scope.querySelectorAll('.nav-flyout-toggle').forEach((b) => b.setAttribute('aria-expanded', 'false'));
  scope.querySelectorAll('.nav-megamenu').forEach((m) => m.classList.remove('has-flyout'));
  if (scope.classList?.contains('nav-megamenu')) scope.classList.remove('has-flyout');
  const groups = scope.classList?.contains('nav-megamenu') ? [scope] : [...scope.querySelectorAll('.nav-megamenu')];
  groups.forEach((m) => {
    m.querySelectorAll('.nav-category').forEach((b, i) => {
      b.setAttribute('aria-expanded', String(keepFirst && i === 0));
    });
  });
}

/** Closes the whole menu (mobile sheet + every open panel). */
function closeAll(nav) {
  nav.setAttribute('aria-expanded', 'false');
  nav.querySelector('.nav-hamburger-button')?.setAttribute('aria-expanded', 'false');
  closeDropdowns(nav);
  closeSearch(nav);
  nav.querySelectorAll('.nav-trigger[aria-expanded="true"]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
  resetLevels(nav, { keepFirst: DESKTOP.matches });
  updateScrollLock(nav);
}

/**
 * Header bar for a full-screen mobile sub-level: back, title, close.
 * Hidden on desktop.
 */
function buildSheetHead(title, labels, onBack, tag = 'div') {
  const back = el(
    'button',
    { type: 'button', class: 'nav-sheet-back' },
    el('span', { class: 'nav-chevron-left', 'aria-hidden': 'true' }),
    el('span', {}, labels.back || ''),
  );
  const close = el(
    'button',
    { type: 'button', class: 'nav-sheet-close' },
    el('span', { class: 'nav-close-icon', 'aria-hidden': 'true' }),
    el('span', {}, labels.close || ''),
  );
  back.addEventListener('click', (e) => {
    e.stopPropagation();
    onBack();
  });
  close.addEventListener('click', (e) => {
    e.stopPropagation();
    closeAll(close.closest('nav'));
  });
  return el(tag, { class: 'nav-sheet-head' }, back, el('p', { class: 'nav-sheet-title' }, title), close);
}

/* ---------------- utility bar ---------------- */

function buildSearch(li, link) {
  const label = textOf(link);
  const icon = link.querySelector('img');
  const action = link.href;
  li.classList.add('nav-search');
  const formId = uid('nav-search-form');

  const toggle = el('button', {
    type: 'button', class: 'nav-search-toggle', 'aria-expanded': 'false', 'aria-controls': formId,
  }, prepImage(icon), el('span', {}, label));

  const input = el('input', {
    type: 'search', name: 'q', placeholder: label, 'aria-label': label, autocomplete: 'off',
  });
  const submit = el('button', { type: 'submit', class: 'nav-search-submit', 'aria-label': label }, icon ? prepImage(icon.cloneNode()) : null);
  const form = el('form', {
    id: formId, class: 'nav-search-form', role: 'search', action,
  }, submit, input);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    window.location.href = q ? `${action}#q=${encodeURIComponent(q)}` : action;
  });
  const backdrop = el('div', { class: 'nav-search-backdrop', 'aria-hidden': 'true' });

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const root = li.closest('nav');
    const open = !li.classList.contains('is-open');
    closeDropdowns(root);
    closeMegamenus(root);
    li.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    if (open) input.focus();
  });
  backdrop.addEventListener('click', () => closeSearch(li.closest('nav')));
  li.replaceChildren(toggle, form, backdrop);
}

function buildDropdown(li) {
  const sub = li.querySelector(':scope > ul');
  // published fragments wrap the label in <p> and the icon in <picture>
  const icon = li.querySelector(':scope > img, :scope > picture > img, :scope > p > img, :scope > p > picture > img');
  const label = ownText(li);
  const panelId = uid('nav-dropdown');
  li.classList.add('nav-dropdown-item');

  const toggle = el('button', {
    type: 'button', class: 'nav-dropdown-toggle', 'aria-expanded': 'false', 'aria-controls': panelId,
  }, prepImage(icon), el('span', {}, label), el('span', { class: 'nav-chevron', 'aria-hidden': 'true' }));

  sub.querySelectorAll('img').forEach((img) => prepImage(img));
  const panel = el('div', { class: 'nav-dropdown', id: panelId }, sub);

  let timer;
  const setOpen = (open) => {
    clearTimeout(timer);
    if (open) {
      const root = li.closest('nav');
      closeDropdowns(root, toggle);
      closeSearch(root);
    }
    toggle.setAttribute('aria-expanded', String(open));
  };
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });
  li.addEventListener('mouseenter', () => { if (DESKTOP.matches) setOpen(true); });
  li.addEventListener('mouseleave', () => {
    if (!DESKTOP.matches) return;
    timer = setTimeout(() => toggle.setAttribute('aria-expanded', 'false'), 150);
  });
  li.replaceChildren(toggle, panel);
}

function buildUtility(section) {
  const wrap = el('div', { class: 'nav-utility' });
  [...section.querySelectorAll(':scope > ul')].forEach((ul, i) => {
    ul.className = `nav-utility-list nav-utility-list-${i + 1}`;
    [...ul.children].forEach((li) => {
      li.classList.add('nav-utility-item');
      li.querySelectorAll(':scope > img, :scope > a > img').forEach((img) => prepImage(img));
      const link = li.querySelector(':scope > a');
      const leadIcon = link?.firstElementChild;
      // icon sits beside (not inside) the text link, as on the source header
      if (leadIcon?.tagName === 'IMG' && textOf(link) && !/\/search\/?$/.test(new URL(link.href).pathname)) {
        leadIcon.classList.add('nav-utility-icon');
        link.before(leadIcon);
      }
      const sub = li.querySelector(':scope > ul');
      if (sub && !link) {
        buildDropdown(li);
      } else if (link && /\/search\/?$/.test(new URL(link.href).pathname)) {
        buildSearch(li, link);
      } else if (li.querySelectorAll(':scope > a').length > 1) {
        li.classList.add('nav-utility-links');
      }
    });
    wrap.append(ul);
  });
  return wrap;
}

/* ---------------- megamenu ---------------- */

function setActive(buttons, active) {
  buttons.forEach((b) => b.setAttribute('aria-expanded', String(b === active)));
}

function buildFlyoutItem(li, panel, labels) {
  const link = li.querySelector(':scope > a');
  const sub = li.querySelector(':scope > ul');
  const subId = uid('nav-flyout');
  const btn = el('button', {
    type: 'button', class: 'nav-flyout-toggle', 'aria-expanded': 'false', 'aria-controls': subId,
  }, el('span', {}, textOf(link)), el('span', { class: 'nav-chevron-right', 'aria-hidden': 'true' }));
  sub.id = subId;
  sub.className = 'nav-flyout';
  sub.prepend(buildSheetHead(textOf(link), labels, () => {
    btn.setAttribute('aria-expanded', 'false');
    panel.closest('.nav-megamenu')?.classList.remove('has-flyout');
    btn.focus();
  }, 'li'));
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = btn.getAttribute('aria-expanded') !== 'true';
    const megamenu = panel.closest('.nav-megamenu');
    megamenu.querySelectorAll('.nav-flyout-toggle').forEach((b) => b.setAttribute('aria-expanded', 'false'));
    btn.setAttribute('aria-expanded', String(open));
    megamenu.classList.toggle('has-flyout', open);
  });
  li.classList.add('nav-has-flyout');
  li.replaceChildren(btn, sub);
}

function buildLinksPanel(list, id, labels, head) {
  const panel = el('div', { class: 'nav-megamenu-links', id }, head);
  const rest = el('ul', { class: 'nav-megamenu-list' });
  [...list.children].forEach((li) => {
    const strong = li.querySelector(':scope > strong');
    const nested = li.querySelector(':scope > ul');
    if (strong && nested && !li.querySelector(':scope > a')) {
      nested.className = 'nav-megamenu-list';
      const featured = el(
        'div',
        { class: 'nav-megamenu-featured' },
        el('p', { class: 'nav-megamenu-featured-label' }, textOf(strong)),
        nested,
      );
      panel.append(featured, el('div', { class: 'nav-megamenu-wave', 'aria-hidden': 'true' }));
      return;
    }
    if (nested && li.querySelector(':scope > a')) buildFlyoutItem(li, panel, labels);
    rest.append(li);
  });
  if (rest.children.length) panel.append(rest);
  return panel;
}

function buildPromo(nodes) {
  const promo = el('aside', { class: 'nav-megamenu-promo' });
  nodes.forEach((node) => {
    const img = node.querySelector('img');
    if (img) {
      promo.append(el('div', { class: 'nav-megamenu-promo-image' }, prepImage(img)));
    } else if (/^H[1-6]$/.test(node.tagName)) {
      promo.append(el('p', { class: 'nav-megamenu-promo-title' }, ...node.childNodes));
    } else if (node.querySelector('a')) {
      node.className = 'nav-megamenu-promo-cta';
      promo.append(node);
    } else {
      node.className = 'nav-megamenu-promo-text';
      promo.append(node);
    }
  });
  return promo;
}

function buildMegamenu(section, labels) {
  const heading = section.querySelector(':scope > h2, :scope > h3');
  const label = textOf(heading);
  const list = section.querySelector(':scope > ul');
  const panelId = uid('nav-megamenu');

  const trigger = el('button', {
    type: 'button', class: 'nav-trigger', 'aria-expanded': 'false', 'aria-controls': panelId,
  }, el('span', { class: 'nav-trigger-label' }, label), el('span', { class: 'nav-chevron', 'aria-hidden': 'true' }));

  // level-2 categories
  const categories = el('ul', { class: 'nav-megamenu-categories' });
  const catButtons = [];
  [...list.children].forEach((li) => {
    const link = li.querySelector(':scope > a');
    const sub = li.querySelector(':scope > ul');
    if (!link || !sub) {
      categories.append(li);
      return;
    }
    const linksId = uid('nav-links');
    const btn = el('button', {
      type: 'button', class: 'nav-category', 'aria-expanded': 'false', 'aria-controls': linksId,
    }, el('span', {}, textOf(link)), el('span', { class: 'nav-chevron-right', 'aria-hidden': 'true' }));
    catButtons.push(btn);
    const head = buildSheetHead(textOf(link), labels, () => {
      btn.setAttribute('aria-expanded', 'false');
      btn.focus();
    });
    const panel = buildLinksPanel(sub, linksId, labels, head);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      setActive(catButtons, btn);
      const megamenu = btn.closest('.nav-megamenu');
      megamenu.querySelectorAll('.nav-flyout-toggle').forEach((b) => b.setAttribute('aria-expanded', 'false'));
      megamenu.classList.remove('has-flyout');
    });
    categories.append(el('li', { class: 'nav-megamenu-category' }, btn, panel));
  });
  if (catButtons[0] && DESKTOP.matches) catButtons[0].setAttribute('aria-expanded', 'true');

  // promo: everything after the list
  const promoNodes = [];
  let node = list.nextElementSibling;
  while (node) {
    promoNodes.push(node);
    node = node.nextElementSibling;
  }

  const close = el(
    'button',
    { type: 'button', class: 'nav-megamenu-close' },
    el('span', { class: 'nav-close-icon', 'aria-hidden': 'true' }),
    el('span', {}, labels.close || ''),
  );

  const megamenu = el(
    'div',
    { class: 'nav-megamenu', id: panelId },
    el(
      'div',
      { class: 'nav-megamenu-inner' },
      categories,
      promoNodes.length ? buildPromo(promoNodes) : null,
      close,
    ),
  );

  const item = el('li', { class: 'nav-section' }, trigger, megamenu);

  trigger.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const root = item.closest('nav');
    const open = trigger.getAttribute('aria-expanded') !== 'true';
    closeDropdowns(root);
    closeSearch(root);
    trigger.setAttribute('aria-expanded', String(open));
    if (open) resetLevels(megamenu, { keepFirst: DESKTOP.matches });
    closeMegamenus(root, trigger);
  });
  close.addEventListener('click', (e) => {
    e.stopPropagation();
    trigger.setAttribute('aria-expanded', 'false');
    closeMegamenus(item.closest('nav'));
    trigger.focus();
  });
  return item;
}

/* ---------------- brand + tools ---------------- */

function buildBrand(section) {
  const link = section.querySelector('a');
  if (!link) return null;
  link.className = 'nav-brand-link';
  prepImage(link.querySelector('img'), { eager: true });
  return el('div', { class: 'nav-brand' }, link);
}

function readLabels(section) {
  const plain = section
    ? [...section.querySelectorAll(':scope > p')].filter((p) => !p.querySelector('a, img'))
    : [];
  return { menu: textOf(plain[0]), close: textOf(plain[1]), back: textOf(plain[2]) };
}

function buildTools(section) {
  const tools = el('div', { class: 'nav-tools' });
  const cta = section?.querySelector('a');
  if (cta) {
    cta.className = 'nav-cta';
    tools.append(cta);
  }
  return tools;
}

function buildHamburger(labels, nav) {
  const hamburger = el(
    'button',
    {
      type: 'button', class: 'nav-hamburger-button', 'aria-controls': 'nav', 'aria-expanded': 'false', 'aria-label': labels.menu || null,
    },
    el('span', { class: 'nav-hamburger-icon', 'aria-hidden': 'true' }),
    el('span', { class: 'nav-hamburger-label' }, labels.menu),
  );
  hamburger.addEventListener('click', () => {
    const open = nav.getAttribute('aria-expanded') !== 'true';
    if (!open) {
      closeAll(nav);
      return;
    }
    nav.setAttribute('aria-expanded', 'true');
    hamburger.setAttribute('aria-expanded', 'true');
    updateScrollLock(nav);
  });
  return el('div', { class: 'nav-hamburger' }, hamburger);
}

/* ---------------- decorate ---------------- */

/**
 * Loads and decorates the header.
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const data = await fetchNav();
  if (!data) return;
  const sections = [...data.doc.body.children].filter((c) => c.tagName === 'DIV');
  const parts = classifySections(sections);
  const labels = readLabels(parts.tools);

  const nav = el('nav', { id: 'nav', 'aria-expanded': 'false' });

  // DOM order follows the mobile reading order (bar, utilities, menus, CTA);
  // header.css places the same nodes into the two-row desktop layout.
  const brand = (parts.brand && buildBrand(parts.brand)) || el('div', { class: 'nav-brand' });
  brand.append(buildHamburger(labels, nav));
  nav.append(brand);
  if (parts.utility) nav.append(buildUtility(parts.utility));
  const sectionsList = el('ul', { class: 'nav-sections' }, parts.menus.map((s) => buildMegamenu(s, labels)));
  nav.append(el('div', { class: 'nav-main' }, sectionsList), buildTools(parts.tools));

  // global close behaviour
  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target)) {
      closeDropdowns(nav);
      closeSearch(nav);
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const openTrigger = nav.querySelector('.nav-trigger[aria-expanded="true"]');
    closeDropdowns(nav);
    closeSearch(nav);
    closeMegamenus(nav);
    openTrigger?.focus();
  });

  // reset state when crossing the desktop breakpoint (resize / rotate):
  // closes the mobile menu, resets the hamburger, collapses every panel
  DESKTOP.addEventListener('change', () => closeAll(nav));

  const wrapper = el('div', { class: 'nav-wrapper' }, nav);
  block.replaceChildren(wrapper);
}
