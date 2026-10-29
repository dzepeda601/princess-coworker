/* eslint-disable */
/* global WebImporter */

/**
 * Parser for the columns block.
 *
 * Block rows (local blocks/columns): one row,
 *   cell 1 = text (eyebrow, H2 heading, paragraph(s), CTA links), cell 2 = image(s).
 *
 * Source instances:
 *  - .column-container (rc8): .cmp-column-container__item eyebrow / title (a <p>,
 *    promoted to H2) / copy / CTA, plus .has-image items.
 *  - .grid-container.cmp-grid-microsite-container--two-col-right-wider (rc10):
 *    first column = .cmp-text heading + paragraph + button-v2 links, other columns = images.
 */

function cleanText(text) {
  return (text || '').replace(/[‎‏]/g, '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

function usableSrc(img) {
  if (!img) return '';
  // data-lazy-src first: once loaded, the live src can be a blob: URL that is useless outside the page
  const candidates = [
    img.getAttribute('data-lazy-src'),
    img.getAttribute('src'),
    img.getAttribute('data-src'),
    img.getAttribute('data-src-large'),
    img.getAttribute('data-src-medium'),
    img.getAttribute('data-src-small'),
    img.getAttribute('data-lazy'),
  ];
  const picture = img.closest('picture');
  if (picture) {
    picture.querySelectorAll('source').forEach((s) => {
      const set = s.getAttribute('srcset') || s.getAttribute('data-srcset');
      if (set) candidates.push(set.split(',')[0].trim().split(/\s+/)[0]);
    });
  }
  const holder = img.closest('[data-src]');
  if (holder && holder !== img) {
    let s = holder.getAttribute('data-src');
    if (s && /%7B|\{/.test(s)) s = s.split('?')[0];
    candidates.push(s);
  }
  return candidates.find((s) => s && !s.startsWith('data:') && !s.startsWith('blob:')) || '';
}

function collectImages(document, imgs) {
  const out = [];
  const seen = new Set();
  imgs.forEach((imgEl) => {
    // skip inline icons (button chevrons etc.)
    if (imgEl.closest('a, button, .cmp-button-v2__icon')) return;
    const src = usableSrc(imgEl);
    if (!src || seen.has(src)) return;
    seen.add(src);
    const img = document.createElement('img');
    img.src = src;
    img.alt = cleanText(imgEl.getAttribute('alt'));
    out.push(img);
  });
  return out;
}

function makeCta(document, a) {
  if (!a || !a.getAttribute('href')) return null;
  const labelEl = a.querySelector('.cmp-button-v2__text');
  const label = cleanText((labelEl || a).textContent);
  if (!label) return null;
  const p = document.createElement('p');
  const link = document.createElement('a');
  link.href = a.getAttribute('href');
  link.textContent = label;
  p.append(link);
  return p;
}

function el(document, tag, text) {
  const n = document.createElement(tag);
  n.textContent = text;
  return n;
}

function parseColumnContainer(element, document) {
  const text = [];
  const items = [...element.querySelectorAll('.cmp-column-container__item')];
  const textItems = items.filter((it) => !it.classList.contains('has-image'));
  const imageItems = items.filter((it) => it.classList.contains('has-image'));

  textItems.forEach((it) => {
    const eyebrow = it.querySelector('.cmp-column-container__item__eyebrow');
    if (eyebrow && cleanText(eyebrow.textContent)) text.push(el(document, 'p', cleanText(eyebrow.textContent)));
    const title = it.querySelector('.cmp-column-container__item__title');
    if (title && cleanText(title.textContent)) text.push(el(document, 'h2', cleanText(title.textContent)));
    const copy = it.querySelector('.cmp-column-container__item__copy');
    if (copy) {
      const ps = [...copy.querySelectorAll('p')].filter((p) => cleanText(p.textContent));
      if (ps.length) ps.forEach((p) => text.push(el(document, 'p', cleanText(p.textContent))));
      else if (cleanText(copy.textContent)) text.push(el(document, 'p', cleanText(copy.textContent)));
    }
    it.querySelectorAll('a.cmp-column-container__item__cta[href], .button-v2 a[href]').forEach((a) => {
      const cta = makeCta(document, a);
      if (cta) text.push(cta);
    });
  });

  const imgs = [];
  (imageItems.length ? imageItems : [element]).forEach((it) => {
    it.querySelectorAll('.cmp-column-container__item__image img, img').forEach((i) => imgs.push(i));
  });
  return { text, images: collectImages(document, imgs) };
}

function parseMicrositeGrid(element, document) {
  let columns = [...element.querySelectorAll('.cmp-grid-microsite-container__column')];
  // two-col layouts render only the first two columns; the third (display:none) holds a
  // placeholder image (alt "abc") that must not be imported
  const isTwoCol = /--two-col/.test(element.className)
    || !!element.querySelector('[class*="cmp-grid-microsite-container--two-col"]');
  if (isTwoCol) columns = columns.filter((c) => !c.classList.contains('cmp-grid-microsite-container__column--third'));
  const textCol = columns.find((c) => c.querySelector('.cmp-text, h1, h2, h3, h4, p'))
    || columns[0] || element;
  const imageCols = columns.filter((c) => c !== textCol);

  const text = [];
  textCol.querySelectorAll('.cmp-text h1, .cmp-text h2, .cmp-text h3, .cmp-text h4, .cmp-text h5, .cmp-text h6, .cmp-text p, .cmp-text ul, .cmp-text ol')
    .forEach((n) => {
      const t = cleanText(n.textContent);
      if (!t) return;
      if (/^H\d$/.test(n.tagName)) text.push(el(document, 'h2', t));
      else if (n.tagName === 'P') text.push(el(document, 'p', t));
      else text.push(n.cloneNode(true));
    });
  textCol.querySelectorAll('a.cmp-button-v2[href]').forEach((a) => {
    const cta = makeCta(document, a);
    if (cta) text.push(cta);
  });

  const imgs = [];
  (imageCols.length ? imageCols : [element]).forEach((c) => c.querySelectorAll('img').forEach((i) => imgs.push(i)));
  return { text, images: collectImages(document, imgs) };
}

export default function parse(element, { document }) {
  const isColumnContainer = element.matches('.column-container') || !!element.querySelector('.cmp-column-container');
  const { text, images } = isColumnContainer
    ? parseColumnContainer(element, document)
    : parseMicrositeGrid(element, document);

  const cells = [];
  cells.push([text, images.length ? images : '']);

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns', cells });
  element.replaceWith(block);
}
