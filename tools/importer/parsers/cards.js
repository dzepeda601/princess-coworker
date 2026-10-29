/* eslint-disable */
/* global WebImporter */

/**
 * Parser for the cards block.
 *
 * Block rows (local blocks/cards): one row per card,
 *   cell 1 = image, cell 2 = H3 title + description/price paragraph(s) + CTA link.
 *
 * Source instances:
 *  - .grid-container.cmp-grid-container--carousel: .dynamic-pricing and .teaser items.
 *    Carousels repeat their items (duplicates lack pricing) -> dedupe by title+href,
 *    keeping the first occurrence.
 *  - .destination-grid: a.cmp-destination-grid__card-cta-link tiles (visible + hidden
 *    "View All" list): image + label linked to the destination.
 *  - .microsite-carousel-two: slides (skip .is-clone); heading/intro in
 *    .cmp-microsite-carousel-two__wrapper__content is kept as default content before the block.
 *  - .grid-container teaser grids: teaser cards (read-time text kept, link-style CTAs not bolded).
 *  - multi-line <p> deal titles are joined into one H3.
 */

function cleanText(text) {
  return (text || '').replace(/[‎‏]/g, '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

function usableSrc(img) {
  if (!img) return '';
  // live page lazy-loads with data-lazy-src / data-src-* and a data: GIF placeholder in src
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
  // AEM core image: <picture><source data-srcset> ... and .cmp-image[data-src] (templated wid)
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
    // drop templated params like wid={.width} that only resolve client-side
    if (s && /%7B|\{/.test(s)) s = s.split('?')[0];
    candidates.push(s);
  }
  return candidates.find((s) => s && !s.startsWith('data:') && !s.startsWith('blob:')) || '';
}

function makeImg(document, imgEl, fallbackAlt) {
  const src = usableSrc(imgEl);
  if (!src) return null;
  const img = document.createElement('img');
  img.src = src;
  img.alt = cleanText(imgEl.getAttribute('alt')) || fallbackAlt || '';
  return img;
}

function firstUsableImg(root, selector) {
  return [...root.querySelectorAll(selector)].find((img) => usableSrc(img)) || null;
}

function makeHeading(document, text, href) {
  const h3 = document.createElement('h3');
  if (href) {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = text;
    h3.append(a);
  } else {
    h3.textContent = text;
  }
  return h3;
}

function makeParagraph(document, text) {
  const p = document.createElement('p');
  p.textContent = text;
  return p;
}

function makeCta(document, a, labelSelector) {
  if (!a || !a.getAttribute('href')) return null;
  const labelEl = labelSelector ? a.querySelector(labelSelector) : null;
  const label = cleanText((labelEl || a).textContent);
  if (!label) return null;
  const p = document.createElement('p');
  const link = document.createElement('a');
  link.href = a.getAttribute('href');
  link.textContent = label;
  p.append(link);
  return p;
}

/** "From <s>$1,060</s> $529 per person" from a dynamic-pricing pricing paragraph (DA keeps <s>, not <del>). */
function buildPrice(document, p) {
  const out = document.createElement('p');
  const parts = [];
  p.childNodes.forEach((node) => {
    if (node.nodeType === 3) {
      const t = cleanText(node.textContent);
      if (t) parts.push(t);
    } else if (node.nodeType === 1) {
      const t = cleanText(node.textContent);
      if (!t) return;
      if (node.classList.contains('pricing-strikethrough') || node.tagName === 'DEL' || node.tagName === 'S') {
        const strike = document.createElement('s');
        strike.textContent = t;
        parts.push(strike);
      } else {
        parts.push(t);
      }
    }
  });
  if (!parts.length) return null;
  parts.forEach((part, i) => {
    if (i > 0) out.append(' ');
    out.append(part);
  });
  return out;
}

function parseDynamicPricing(document, item) {
  const imgEl = firstUsableImg(item, '.cmp-dynamic-pricing__image img, img');
  const titleEls = [...item.querySelectorAll(
    '.cmp-dynamic-pricing__title h1, .cmp-dynamic-pricing__title h2, .cmp-dynamic-pricing__title h3, .cmp-dynamic-pricing__title h4, .cmp-dynamic-pricing__title p',
  )].filter((el) => cleanText(el.textContent));
  // a title typed as several lines of <p> ("Sail from" / "Southampton") is one heading
  const title = titleEls.length > 1 && titleEls.every((el) => el.tagName === 'P')
    ? titleEls.map((el) => cleanText(el.textContent)).join(' ')
    : cleanText((titleEls[0] || {}).textContent);
  const a = item.querySelector('.cmp-dynamic-pricing__button a[href]') || item.querySelector('a[href]');
  const href = a ? a.getAttribute('href') : '';

  const body = [];
  if (title) body.push(makeHeading(document, title));
  // subtitle / badge next to the title (e.g. "From Los Angeles")
  item.querySelectorAll('.cmp-dynamic-pricing__badge, .cmp-dynamic-pricing__subtitle').forEach((el) => {
    const t = cleanText(el.textContent);
    if (t) body.push(makeParagraph(document, t));
  });
  // price lines: the live DOM nests the price <p> inside p.pricing -> keep innermost, dedupe
  const priceTexts = new Set();
  item.querySelectorAll('.cmp-dynamic-pricing__pricing-text p').forEach((p) => {
    if (p.closest('.hidden') || p.querySelector('p')) return;
    const t = cleanText(p.textContent);
    if (!t || priceTexts.has(t)) return;
    priceTexts.add(t);
    const price = buildPrice(document, p);
    if (price) body.push(price);
  });
  const cta = makeCta(document, a, '.cmp-button-v2__text');
  if (cta) body.push(cta);

  return { key: `${title}|${href}`, image: makeImg(document, imgEl, title), body };
}

function parseTeaser(document, item) {
  const imgEl = firstUsableImg(item, '.cmp-teaser__image img, img');
  const titleEl = item.querySelector('.cmp-teaser__title, .cmp-teaser__subtitle')
    || item.querySelector('.cmp-teaser__content h1, .cmp-teaser__content h2, .cmp-teaser__content h3, .cmp-teaser__content h4');
  const title = titleEl ? cleanText(titleEl.textContent) : '';
  const a = item.querySelector('.cmp-teaser__action-container a[href]') || item.querySelector('a.cmp-button-v2[href]');
  const href = a ? a.getAttribute('href') : '';

  const body = [];
  const pretitle = item.querySelector('.cmp-teaser__pretitle');
  if (pretitle && cleanText(pretitle.textContent)) body.push(makeParagraph(document, cleanText(pretitle.textContent)));
  if (title) body.push(makeHeading(document, title));
  const desc = item.querySelector('.cmp-teaser__description');
  if (desc) {
    const ps = [...desc.querySelectorAll('p')].filter((p) => cleanText(p.textContent));
    if (ps.length) ps.forEach((p) => body.push(makeParagraph(document, cleanText(p.textContent))));
    else if (cleanText(desc.textContent)) body.push(makeParagraph(document, cleanText(desc.textContent)));
  }
  // read time etc. typed next to the CTA ("7 Min")
  item.querySelectorAll('.cmp-teaser__action-container .cmp-text p').forEach((p) => {
    const t = cleanText(p.textContent);
    if (t) body.push(makeParagraph(document, t));
  });
  const cta = makeCta(document, a, '.cmp-button-v2__text');
  // link/tertiary-style CTAs stay plain links
  const isTextLink = a && a.closest('.cmp-button-v2--style-link, .cmp-button-v2--style-tertiary');
  if (cta && isTextLink) body.push(cta);
  else if (cta) {
    // teaser CTAs are filled (primary) buttons on the source: bold marks primary in EDS
    const link = cta.querySelector('a');
    const strong = document.createElement('strong');
    link.replaceWith(strong);
    strong.append(link);
    body.push(cta);
  }

  return { key: `${title}|${href}`, image: makeImg(document, imgEl, title), body };
}

function parseDestinationTile(document, tile) {
  const label = cleanText((tile.querySelector('.cmp-destination-grid__card-cta-text') || tile).textContent);
  const href = tile.getAttribute('href') || '';
  const imgEl = firstUsableImg(
    tile,
    'img.cmp-destination-grid__card-image:not(.cmp-destination-grid__card-image-pause-gif), img.cmp-destination-grid__card-image',
  );
  const body = label ? [makeHeading(document, label, href)] : [];
  return { key: `${label}|${href}`, image: makeImg(document, imgEl, label), body };
}

function parseCarouselSlide(document, slide) {
  const imgEl = firstUsableImg(slide, '.cmp-microsite-carousel-two__slide__wrapper__image-wrapper img, img');
  const titleEl = slide.querySelector('[class*="__s-title"]') || slide.querySelector('h1, h2, h3, h4');
  const title = titleEl ? cleanText(titleEl.textContent) : '';
  const a = slide.querySelector('a.cmp-microsite-carousel-two__slide__wrapper__cta--anchor[href]') || slide.querySelector('a[href]');
  const href = a ? a.getAttribute('href') : '';

  const body = [];
  if (title) body.push(makeHeading(document, title));
  const desc = slide.querySelector('[class*="__s-description"], .cmp-microsite-carousel-two__image-caption');
  if (desc) {
    const ps = [...desc.querySelectorAll('p')].filter((p) => cleanText(p.textContent));
    if (ps.length) ps.forEach((p) => body.push(makeParagraph(document, cleanText(p.textContent))));
    else if (cleanText(desc.textContent)) body.push(makeParagraph(document, cleanText(desc.textContent)));
  }
  const cta = makeCta(document, a, '.cmp-microsite-carousel-two__slide__wrapper__cta--text');
  if (cta) body.push(cta);

  return { key: `${title}|${href}`, image: makeImg(document, imgEl, title), body };
}

function collectCards(element, document) {
  const notClone = (el) => !el.closest('.is-clone');

  const tiles = [...element.querySelectorAll('a.cmp-destination-grid__card-cta-link')];
  if (tiles.length) return tiles.map((t) => parseDestinationTile(document, t));

  const slides = [...element.querySelectorAll('.cmp-microsite-carousel-two__slide__wrapper')].filter(notClone);
  if (slides.length) return slides.map((s) => parseCarouselSlide(document, s));

  const items = [...element.querySelectorAll('.dynamic-pricing, .teaser')]
    .filter(notClone)
    .filter((el, i, arr) => !arr.some((other) => other !== el && other.contains(el)));
  if (items.length) {
    return items.map((it) => (it.classList.contains('teaser')
      ? parseTeaser(document, it)
      : parseDynamicPricing(document, it)));
  }

  // fallback: generic grid items
  return [...element.querySelectorAll('.cmp-grid-container__items > div')].filter(notClone).map((it) => {
    const imgEl = firstUsableImg(it, 'img');
    const titleEl = it.querySelector('h1, h2, h3, h4, h5, h6');
    const title = titleEl ? cleanText(titleEl.textContent) : '';
    const a = it.querySelector('a[href]');
    const body = [];
    if (title) body.push(makeHeading(document, title));
    const cta = makeCta(document, a, '.cmp-button-v2__text');
    if (cta) body.push(cta);
    return { key: `${title}|${a ? a.getAttribute('href') : ''}`, image: makeImg(document, imgEl, title), body };
  });
}

export default function parse(element, { document }) {
  // carousels repeat their slides; keep one card per title+link, preferring the copy
  // whose live price had loaded (the struck-through "was" price marks a priced card)
  const byKey = new Map();
  const hasPrice = (card) => card.body.some((el) => el.querySelector && el.querySelector('s'));
  collectCards(element, document).forEach((card) => {
    if (!card.body.length && !card.image) return;
    const existing = byKey.get(card.key);
    if (!existing || (!hasPrice(existing) && hasPrice(card))) byKey.set(card.key, card);
  });
  const cells = [...byKey.values()].map((card) => [card.image || '', card.body]);

  // desktop carousels on the source (not the mobile/tablet-only ones) become the carousel variant;
  // template transformers can also request it via data-excat-block-options="carousel"
  const options = (element.getAttribute('data-excat-block-options') || '').split(',').map((o) => o.trim());
  const isCarousel = options.includes('carousel')
    || element.matches('.cmp-grid-container--carousel:not(.cmp-grid-container--carousel-mobile-tablet)');
  const block = WebImporter.Blocks.createBlock(document, { name: isCarousel ? 'Cards (carousel)' : 'cards', cells });
  // microsite carousels carry their section heading (and intro) inside the component
  const intro = [];
  element.querySelectorAll('.cmp-microsite-carousel-two__wrapper__content').forEach((wrap) => {
    wrap.querySelectorAll('h1, h2, h3, h4, h5, h6, p').forEach((n) => {
      const t = cleanText(n.textContent);
      if (!t) return;
      if (/^H\d$/.test(n.tagName)) {
        const h2 = document.createElement('h2');
        h2.textContent = t;
        intro.push(h2);
      } else {
        intro.push(makeParagraph(document, t));
      }
    });
  });
  // the destination grid carries its section heading inside the component: keep it as default content
  const gridTitle = element.querySelector('.cmp-destination-grid__title');
  if (gridTitle && cleanText(gridTitle.textContent)) {
    const h2 = document.createElement('h2');
    h2.textContent = cleanText(gridTitle.textContent);
    element.replaceWith(h2, block);
  } else {
    element.replaceWith(...intro, block);
  }
}
