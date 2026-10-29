import { createOptimizedPicture } from '../../scripts/aem.js';
import {
  createTag,
  fetchQueryIndexAll,
  getAuthoredLinks,
  normalizePath,
  resolveArticlesFromIndex,
} from '../../scripts/shared.js';

function buildLinksCard(article) {
  const href = normalizePath(article.path);
  const li = createTag('li');
  const link = createTag('a', { href, class: 'cards-card-link' });

  if (article.image) {
    const imageDiv = createTag('div', { class: 'cards-card-image' });
    imageDiv.append(createOptimizedPicture(article.image, article.title || '', false, [{ width: '750' }]));
    link.append(imageDiv);
  }

  const body = createTag('div', { class: 'cards-card-body' });
  body.append(createTag('p', {}, createTag('strong', {}, article.title || href)));
  if (article.description) {
    body.append(createTag('p', {}, article.description));
  }
  link.append(body);
  li.append(link);

  return li;
}

/**
 * Decorate "cards links" variant: fetch index, match paths, render cards.
 */
async function decorateLinks(block) {
  const authoredLinks = getAuthoredLinks(block);
  if (!authoredLinks.length) {
    block.textContent = '';
    block.append(createTag('p', { class: 'cards-links-empty' }, 'No links provided.'));
    return;
  }

  let indexRows = [];
  try {
    indexRows = await fetchQueryIndexAll();
  } catch {
    indexRows = [];
  }

  const articles = resolveArticlesFromIndex(authoredLinks, indexRows);

  const ul = createTag('ul');
  articles.forEach((article) => ul.append(buildLinksCard(article)));
  block.replaceChildren(ul);
}

/**
 * Decorate bento-grid cards variant.
 * Each authored row becomes a card. The first <p> in each card is treated
 * as a tag/label (e.g. "// Knowledge Base v1.0"), and the first card is
 * marked as the featured (primary) card.
 */
function decorateBento(block) {
  const ul = createTag('ul');

  [...block.children].forEach((row, idx) => {
    const li = createTag('li');
    if (idx === 0) li.classList.add('cards-card-featured');
    while (row.firstElementChild) li.append(row.firstElementChild);

    // Unwrap the single wrapper div if present
    const wrapper = li.firstElementChild;
    if (wrapper && wrapper.tagName === 'DIV' && li.children.length === 1) {
      while (wrapper.firstChild) li.append(wrapper.firstChild);
      wrapper.remove();
    }

    // Separate image into its own wrapper (consistent with default cards)
    const picture = li.querySelector('picture');
    if (picture) {
      const imageDiv = createTag('div', { class: 'cards-card-image' });
      const pictureParent = picture.parentElement;
      imageDiv.append(picture);
      li.prepend(imageDiv);
      if (pictureParent && pictureParent.tagName === 'A' && !pictureParent.children.length) {
        pictureParent.remove();
      }
    } else {
      li.classList.add('cards-card-text-only');
    }

    // Find and mark the tag/label (first <p> that looks like a category tag)
    const firstP = li.querySelector('p');
    if (firstP && !firstP.querySelector('picture') && !firstP.classList.contains('button-container')) {
      firstP.classList.add('cards-card-tag');
    }

    // Wrap remaining non-image content in a body div
    const body = createTag('div', { class: 'cards-card-body' });
    [...li.children].forEach((child) => {
      if (!child.classList.contains('cards-card-image')) body.append(child);
    });
    li.append(body);

    ul.append(li);
  });

  block.replaceChildren(ul);
}

const CARD_TYPES = ['overlay', 'deal', 'feature'];
// a price line: a short line with a currency amount (with or without a struck "was" price)
const PRICE = /[$€£¥]\s?\d/;
const isPriceLine = (el) => el.tagName === 'P'
  && (el.querySelector('del, s') || (PRICE.test(el.textContent) && el.textContent.trim().length <= 40));
const HEADING_TAGS = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'];
const isHeading = (el) => HEADING_TAGS.includes(el.tagName);

/**
 * Wrap the text that follows a struck-through (old) price so the current
 * price can be styled, e.g. "From <del>$1,060</del> $529".
 * @param {Element} p price paragraph
 */
function decoratePrice(p) {
  p.classList.add('cards-card-price');
  p.querySelectorAll('del, s').forEach((del) => {
    const next = del.nextSibling;
    if (next && next.nodeType === Node.TEXT_NODE && next.textContent.trim()) {
      const span = createTag('span', { class: 'cards-card-price-current' });
      next.replaceWith(span);
      span.append(next);
    }
  });
}

/**
 * Classify a default card by its authored content, so one block renders the
 * different card patterns used across the site:
 * - overlay: image + body holding only a heading (label shown on the image)
 * - deal: heading, optional price (with strikethrough) and a CTA, no description
 * - feature: heading with descriptive text and an optional CTA
 * CTAs default to the outline (deal) or text-link (feature) style unless the
 * author emphasised the link (bold = primary, italic = secondary).
 * @param {Element} li card
 */
function classifyCard(li) {
  const image = li.querySelector(':scope > .cards-card-image');
  const body = li.querySelector(':scope > .cards-card-body');
  const children = body ? [...body.children] : [];

  if (image && children.length && children.every(isHeading)) {
    li.classList.add('cards-card-overlay');
    // the visible label already names the tile; an identical alt would be read twice
    const label = body.textContent.trim();
    image.querySelectorAll('img').forEach((img) => {
      if (img.alt.trim() === label) img.alt = '';
    });
    return;
  }

  let hasDescription = false;
  children.forEach((el) => {
    if (el.classList.contains('button-container')) {
      el.classList.add('cards-card-cta');
    } else if (isPriceLine(el)) {
      decoratePrice(el);
    } else if (!isHeading(el)) {
      hasDescription = true;
    }
  });

  const type = hasDescription ? 'feature' : 'deal';
  li.classList.add(`cards-card-${type}`);
  children.filter((el) => el.classList.contains('cards-card-cta')).forEach((cta) => {
    const link = cta.querySelector('a.button');
    if (link && !link.classList.contains('primary') && !link.classList.contains('secondary')) {
      link.classList.add(type === 'deal' ? 'secondary' : 'tertiary');
    }
  });
}

/**
 * Decorate regular cards (authored rows with image + body).
 */
function decorateDefault(block) {
  const ul = createTag('ul');

  [...block.children].forEach((row) => {
    const li = createTag('li');
    while (row.firstElementChild) li.append(row.firstElementChild);

    const content = li.firstElementChild;
    if (content?.children?.length > 1) {
      const imageEl = [...content.children].find((el) => el.querySelector('picture'));
      if (imageEl) {
        const picture = imageEl.querySelector('picture');
        const imageDiv = createTag('div', { class: 'cards-card-image' });
        if (picture) imageDiv.append(picture);
        const bodyDiv = createTag('div', { class: 'cards-card-body' });
        [...content.children].forEach((el) => { if (el !== imageEl) bodyDiv.append(el); });
        li.replaceChildren(imageDiv, bodyDiv);
      } else {
        content.className = 'cards-card-body';
      }
    } else {
      [...li.children].forEach((div) => {
        div.className = (div.children.length === 1 && div.querySelector('picture'))
          ? 'cards-card-image' : 'cards-card-body';
      });
    }

    classifyCard(li);
    ul.append(li);
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    const picture = img.closest('picture');
    const url = new URL(img.src, window.location.href);
    // only same-origin raster images can be served through the media optimizer
    if (picture && url.origin === window.location.origin && !url.pathname.endsWith('.svg')) {
      picture.replaceWith(createOptimizedPicture(img.src, img.alt || '', false, [{ width: '750' }]));
    }
  });

  // block-level layout hints: the shared card type, and a 4-up grid for sets of 4, 8, ...
  const cards = [...ul.children];
  const types = new Set(cards.map((li) => CARD_TYPES.find((t) => li.classList.contains(`cards-card-${t}`))));
  if (types.size === 1) block.classList.add(`cards-layout-${[...types][0]}`);
  if (cards.length % 4 === 0 && cards.length % 3 !== 0) block.classList.add('cards-cols-4');

  block.replaceChildren(ul);
}

/**
 * Carousel variant: the card list becomes a horizontally scrolling, snapping
 * track with previous/next arrows. All cards stay in the DOM and in tab order
 * (focus scrolls a card into view), so the arrows are a pointer convenience only.
 * @param {Element} block decorated cards block
 */
function decorateCarousel(block) {
  const ul = block.querySelector(':scope > ul');
  if (!ul) return;

  const viewport = createTag('div', { class: 'cards-carousel-viewport', tabindex: '0', role: 'region' });
  const heading = block.closest('.section')?.querySelector('h2[id]');
  if (heading) viewport.setAttribute('aria-labelledby', heading.id);
  viewport.append(ul);

  const step = () => {
    const card = ul.firstElementChild;
    const gap = parseFloat(getComputedStyle(ul).columnGap) || 0;
    return card ? card.getBoundingClientRect().width + gap : viewport.clientWidth;
  };
  const go = (dir) => {
    const max = viewport.scrollWidth - viewport.clientWidth - 1;
    let left = viewport.scrollLeft + dir * step();
    // wrap around at either end, as the source carousel does
    if (dir > 0 && viewport.scrollLeft >= max) left = 0;
    if (dir < 0 && viewport.scrollLeft <= 0) left = max + 1;
    viewport.scrollTo({ left, behavior: 'smooth' });
  };
  const arrow = (dir) => {
    const button = createTag('button', {
      type: 'button',
      class: `cards-carousel-arrow cards-carousel-${dir > 0 ? 'next' : 'prev'}`,
      tabindex: '-1',
      'aria-hidden': 'true',
    });
    button.addEventListener('click', () => go(dir));
    return button;
  };

  block.replaceChildren(arrow(-1), viewport, arrow(1));
  // arrows only make sense while the cards overflow the viewport
  const update = () => block.classList.toggle('cards-carousel-static', viewport.scrollWidth <= viewport.clientWidth + 1);
  new ResizeObserver(update).observe(viewport);
}

export default async function decorate(block) {
  if (block.classList.contains('links')) {
    await decorateLinks(block);
  } else if (block.classList.contains('bento')) {
    decorateBento(block);
  } else {
    decorateDefault(block);
    if (block.classList.contains('carousel')) decorateCarousel(block);
  }
}
