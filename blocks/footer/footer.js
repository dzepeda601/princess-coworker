/*
 * Footer block
 *
 * Content contract (content/footer.plain.html, one top-level <div> per section):
 *   Link columns – a section with headings and lists: <h2>Group</h2><ul>links</ul>, repeated.
 *                  A <ul> without its own heading continues the group above it.
 *                  A list whose links only hold images (e.g. app store badges) is a badge group
 *                  (shown in the desktop columns only).
 *                  Below 1200px every titled group becomes an accordion (several can be open).
 *   Legal bar    – a section with a single list of links and no heading.
 *   Partner row  – paragraphs with links; a bold link (<strong><a>) renders as a button,
 *                  a link may hold a logo image and optional text.
 *   Copyright    – paragraphs without links.
 *
 * Links to a domain other than the footer's main domain open in a new tab.
 * All copy comes from the fragment; this file only builds structure and behaviour.
 */

const DESKTOP = window.matchMedia('(width >= 1200px)');

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
    if (c !== undefined && c !== null) node.append(c);
  });
  return node;
}

/**
 * Fetches the footer fragment. Metadata-independent dual fetch:
 * /content (local preview) first, then site root (DA/EDS).
 * @returns {Promise<Document|null>}
 */
async function fetchFooter() {
  let resp = await fetch('/content/footer.plain.html');
  if (!resp.ok) resp = await fetch('/footer.plain.html');
  if (!resp.ok) return null;
  const html = await resp.text();
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const base = new URL(resp.url, window.location.href).href;
  doc.querySelectorAll('img[src]').forEach((img) => {
    img.src = new URL(img.getAttribute('src'), base).href;
    img.loading = 'lazy';
  });
  return doc;
}

const isHeading = (node) => /^H[1-6]$/.test(node.tagName);

function classifySection(section) {
  const children = [...section.children];
  const hasHeading = children.some(isHeading);
  const hasList = children.some((c) => c.tagName === 'UL' || c.tagName === 'OL');
  if (hasHeading && hasList) return 'column';
  if (hasList) return 'legal';
  if (section.querySelector('a')) return 'partners';
  return 'text';
}

function isImageOnlyList(list) {
  const links = [...list.querySelectorAll('a')];
  return links.length > 0 && links.every((a) => a.querySelector('img') && !a.textContent.trim());
}

function buildColumn(section) {
  const column = el('div', { class: 'footer-column' });
  let group = null;
  const startGroup = (title) => {
    const panel = el('div', { class: 'footer-group-panel', id: uid('footer-group') });
    group = el('div', { class: 'footer-group' }, title, panel);
    column.append(group);
    return group;
  };
  [...section.children].forEach((node) => {
    if (isHeading(node)) {
      node.classList.add('footer-group-title');
      startGroup(node);
      return;
    }
    if (node.tagName === 'UL' || node.tagName === 'OL') {
      if (!group) startGroup(null);
      node.classList.add('footer-group-list');
      if (isImageOnlyList(node)) group.classList.add('footer-group-badges');
      group.querySelector('.footer-group-panel').append(node);
    }
  });
  return column;
}

function buildLegal(section) {
  const list = section.querySelector('ul, ol');
  list.classList.add('footer-legal-list');
  return el('div', { class: 'footer-legal' }, list);
}

function buildPartners(section) {
  const row = el('div', { class: 'footer-partners' });
  [...section.children].forEach((p) => {
    const link = p.querySelector('a');
    if (!link) return;
    if (link.querySelector('img')) {
      // the publishing pipeline moves text that followed an image out of its link: pull it back in
      let next = link.nextSibling;
      while (next && next.nodeType === Node.TEXT_NODE) {
        const following = next.nextSibling;
        if (next.textContent.trim()) link.append(next);
        next = following;
      }
    }
    const item = el('div', { class: 'footer-partner' });
    if (link.closest('strong, b')) {
      link.classList.add('footer-button');
    } else if (link.querySelector('img')) {
      const text = [...link.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
      if (text.length) {
        link.classList.add('footer-partner-media');
        const label = el('span', { class: 'footer-partner-text' });
        text.forEach((n) => label.append(n));
        link.append(label);
      } else {
        link.classList.add('footer-partner-logo');
      }
    }
    item.append(link);
    row.append(item);
  });
  return row;
}

function buildText(section) {
  const wrap = el('div', { class: 'footer-copyright' });
  [...section.children].forEach((p, i) => {
    p.classList.add(i === 0 ? 'footer-copyright-text' : 'footer-copyright-note');
    wrap.append(p);
  });
  return wrap;
}

/** Renders registered/trademark signs (®, ™, ℠) as superscript, as on the source brand font. */
function decorateTrademarks(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (/[®™℠]/.test(node.textContent) && !node.parentElement.closest('sup')) nodes.push(node);
  }
  nodes.forEach((node) => {
    const parts = node.textContent.split(/([®™℠])/);
    const frag = document.createDocumentFragment();
    parts.forEach((part) => {
      if (!part) return;
      frag.append(/^[®™℠]$/.test(part) ? el('sup', {}, part) : document.createTextNode(part));
    });
    node.replaceWith(frag);
  });
}

function getRootDomain(hostname) {
  return hostname.split('.').slice(-2).join('.');
}

/** Opens links to domains other than the footer's most common domain in a new tab. */
function decorateLinkTargets(root) {
  const links = [...root.querySelectorAll('a[href]')].filter((a) => /^https?:$/.test(a.protocol));
  const counts = {};
  links.forEach((a) => {
    const domain = getRootDomain(a.hostname);
    counts[domain] = (counts[domain] || 0) + 1;
  });
  const [mainDomain] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || [];
  links.forEach((a) => {
    if (a.hostname === window.location.hostname) return;
    if (getRootDomain(a.hostname) === mainDomain) return;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  });
}

function toggleGroup(button) {
  const panel = document.getElementById(button.getAttribute('aria-controls'));
  const expanded = button.getAttribute('aria-expanded') === 'true';
  button.setAttribute('aria-expanded', String(!expanded));
  if (panel) panel.hidden = expanded;
}

/** Turns titled link groups into accordions below desktop width, and back. */
function setAccordionMode(block, isDesktop) {
  block.querySelectorAll('.footer-group').forEach((group) => {
    const title = group.querySelector('.footer-group-title');
    const panel = group.querySelector('.footer-group-panel');
    if (!title || !panel) return;
    const button = title.querySelector('.footer-group-toggle');
    if (isDesktop) {
      if (button) button.replaceWith(...button.firstElementChild.childNodes);
      panel.hidden = false;
      return;
    }
    if (button) return;
    const toggle = el('button', {
      type: 'button',
      class: 'footer-group-toggle',
      'aria-expanded': 'false',
      'aria-controls': panel.id,
    }, el('span', { class: 'footer-group-label' }, [...title.childNodes]));
    toggle.addEventListener('click', () => toggleGroup(toggle));
    title.append(toggle);
    panel.hidden = true;
  });
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const doc = await fetchFooter();
  if (!doc) return;
  const sections = [...doc.body.children].filter((s) => s.tagName === 'DIV');

  const columns = el('div', { class: 'footer-columns' });
  const bottom = el('div', { class: 'footer-bottom' });

  sections.forEach((section) => {
    const kind = classifySection(section);
    if (kind === 'column') columns.append(buildColumn(section));
    else if (kind === 'legal') bottom.append(buildLegal(section));
    else if (kind === 'partners') bottom.append(buildPartners(section));
    else if (kind === 'text') bottom.append(buildText(section));
  });

  const inner = el('div', { class: 'footer-inner' });
  if (columns.children.length) inner.append(columns);
  if (bottom.children.length) inner.append(bottom);

  block.textContent = '';
  block.append(inner);

  decorateTrademarks(inner);
  decorateLinkTargets(block);

  setAccordionMode(block, DESKTOP.matches);
  DESKTOP.addEventListener('change', (e) => setAccordionMode(block, e.matches));
}
