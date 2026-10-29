/* eslint-disable */
/* global WebImporter */

/**
 * Parser for the hero block.
 *
 * Block rows (local blocks/hero): [single background image] then [text content].
 * Only ONE picture is emitted: hero.js treats two pictures as a light/dark pair.
 *
 * Source instances:
 *  - div.ve-hero-banner (rc4): video hero. Background = desktop video poster /
 *    .cmp-video-dam__backdrop--desktop image. The headline/offer lockup is an image;
 *    its alt text is typed out as real text (eyebrow, H1, offer line, perks list).
 *    CTA = a#hero.
 *  - .banner (rc13): .cmp-banner image, H2 heading, paragraph(s), CTA link(s).
 */

function cleanText(text) {
  return (text || '').replace(/[‎‏ ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function usableSrc(img) {
  if (!img) return '';
  // live page lazy-loads with data-lazy-src / data-src-* and a data: GIF placeholder in src
  const candidates = [
    img.getAttribute('src'),
    img.getAttribute('data-lazy-src'),
    img.getAttribute('data-src'),
    img.getAttribute('data-src-large'),
    img.getAttribute('data-src-medium'),
    img.getAttribute('data-src-small'),
    img.getAttribute('data-lazy'),
    // video hero backdrops keep their still frame here until the video is paused
    img.getAttribute('data-backdrop-src'),
  ];
  const picture = img.closest('picture');
  if (picture) {
    picture.querySelectorAll('source').forEach((s) => {
      const set = s.getAttribute('srcset') || s.getAttribute('data-srcset');
      if (set) candidates.push(set.split(',')[0].trim().split(/\s+/)[0]);
    });
  }
  return candidates.find((s) => s && !s.startsWith('data:') && !s.startsWith('blob:')) || '';
}

function makeImg(document, src, alt) {
  const img = document.createElement('img');
  img.src = src;
  img.alt = alt || '';
  return img;
}

function sentenceCase(text) {
  const t = cleanText(text);
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}

function titleCase(text) {
  return cleanText(text).replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

function fixProperNouns(text) {
  return text.replace(/captain's circle/gi, "Captain's Circle");
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

/** Turn the promo lockup alt text into eyebrow / H1 / offer / perks elements. */
function lockupToText(document, alt) {
  const out = [];
  const segments = cleanText(alt).split(/\s+-\s+/).filter(Boolean);
  if (!segments.length) return out;

  let eyebrow = '';
  let title = '';
  let rest = '';
  if (segments.length >= 3) {
    [eyebrow, title] = segments;
    rest = segments.slice(2).join(' - ');
  } else if (segments.length === 2) {
    [title, rest] = segments;
  } else {
    [title] = segments;
  }

  if (eyebrow) {
    const p = document.createElement('p');
    p.textContent = sentenceCase(eyebrow);
    out.push(p);
  }
  if (title) {
    const h1 = document.createElement('h1');
    h1.textContent = titleCase(title);
    out.push(h1);
  }
  if (rest) {
    const parts = rest.split(/\s+\+\s+/).map(cleanText).filter(Boolean);
    const offerParts = parts.slice(0, 2);
    const perks = parts.slice(2);
    if (offerParts.length) {
      const p = document.createElement('p');
      p.textContent = fixProperNouns(sentenceCase(offerParts.join(' + ')));
      out.push(p);
    }
    if (perks.length) {
      const ul = document.createElement('ul');
      perks.forEach((perk) => {
        const li = document.createElement('li');
        li.textContent = fixProperNouns(sentenceCase(perk));
        ul.append(li);
      });
      out.push(ul);
    }
  }
  return out;
}

function parseVeHero(element, document) {
  // Background: desktop video poster, else the desktop backdrop image.
  let bg = null;
  let videoLink = null;
  const video = element.querySelector('video[poster]');
  if (video) bg = makeImg(document, video.getAttribute('poster'), '');
  // cleanup turns the desktop video into its poster image and keeps the clip URL
  const clipSrc = element.querySelector('[data-video-src]')?.getAttribute('data-video-src');
  if (clipSrc) {
    videoLink = document.createElement('p');
    const a = document.createElement('a');
    a.href = clipSrc;
    // the link text becomes the accessible name of the hero's pause control
    a.textContent = 'Pause background video';
    videoLink.append(a);
  }
  if (!bg) {
    const backdrop = element.querySelector('.cmp-video-dam__backdrop--desktop')
      || element.querySelector('.cmp-ve-hero-banner__img-container img')
      || element.querySelector('.cmp-video-dam img');
    const src = usableSrc(backdrop);
    if (src) bg = makeImg(document, src, backdrop.getAttribute('alt') || '');
  }

  const text = [];
  const lockup = element.querySelector('.cmp-ve-hero-banner__backdrop--desktop')
    || element.querySelector('.promo-banner-container img');
  const lockupAlt = lockup ? lockup.getAttribute('alt') : '';
  if (lockupAlt) {
    text.push(...lockupToText(document, lockupAlt));
  } else {
    // fall back to any real text in the content panel
    const content = element.querySelector('.cmp-ve-hero-banner__content-wrapper') || element;
    content.querySelectorAll('h1, h2, h3, p').forEach((el) => {
      const t = cleanText(el.textContent);
      if (!t || el.closest('.cmp-ve-hero-banner__cta-wrapper')) return;
      const n = document.createElement(/^H\d$/.test(el.tagName) ? 'h1' : 'p');
      n.textContent = t;
      text.push(n);
    });
  }

  const ctas = element.querySelectorAll('a#hero, .cmp-ve-hero-banner__cta-wrapper a[href]');
  const seen = new Set();
  ctas.forEach((a) => {
    if (seen.has(a)) return;
    seen.add(a);
    const cta = makeCta(document, a);
    if (cta) text.push(cta);
  });

  return { bg, text, videoLink };
}

function parseBanner(element, document) {
  const imgEl = element.querySelector('.cmp-banner__img img') || element.querySelector('.cmp-banner img');
  const src = usableSrc(imgEl);
  const bg = src ? makeImg(document, src, imgEl.getAttribute('alt') || '') : null;

  const text = [];
  const content = element.querySelector('.cmp-banner__contentWrapper') || element;
  content.querySelectorAll('h1, h2, h3, h4, h5, h6, p').forEach((el) => {
    const t = cleanText(el.textContent);
    if (!t) return;
    if (/^H\d$/.test(el.tagName)) {
      const h2 = document.createElement('h2');
      h2.textContent = t;
      text.push(h2);
    } else {
      const p = document.createElement('p');
      p.textContent = t;
      text.push(p);
    }
  });

  element.querySelectorAll('.cmp-banner__buttonWrapper a[href]').forEach((a) => {
    const cta = makeCta(document, a);
    if (cta) text.push(cta);
  });

  return { bg, text };
}

function makeVideoLink(document, clipSrc) {
  if (!clipSrc) return null;
  const p = document.createElement('p');
  const a = document.createElement('a');
  a.href = clipSrc;
  // the link text becomes the accessible name of the hero's pause control
  a.textContent = 'Pause background video';
  p.append(a);
  return p;
}

/**
 * Destination page hero (.hero-composite): video (poster + clip, prepared by cleanup) or
 * still image, H1 and CTA(s). Primary-style CTAs are authored bold.
 */
function parseHeroComposite(element, document) {
  const still = element.querySelector('[data-video-src]')
    || element.querySelector('.cmp-hero-composite__img-container img:not(.cmp-video-dam-v2__backdrop--mobile)');
  const src = usableSrc(still);
  const bg = src ? makeImg(document, src, still.getAttribute('alt') || '') : null;
  const videoLink = makeVideoLink(document, still && still.getAttribute('data-video-src'));

  const text = [];
  const content = element.querySelector('.cmp-hero-composite__content') || element;
  content.querySelectorAll('h1, h2, h3, h4, h5, h6, p').forEach((el) => {
    const t = cleanText(el.textContent);
    if (!t || el.closest('.cmp-hero-composite__cta')) return;
    const n = document.createElement(/^H\d$/.test(el.tagName) ? 'h1' : 'p');
    n.textContent = t;
    text.push(n);
  });
  content.querySelectorAll('.cmp-hero-composite__cta a[href]').forEach((a) => {
    const cta = makeCta(document, a);
    if (!cta) return;
    if (a.closest('.cmp-button-v2--style-primary')) {
      const link = cta.querySelector('a');
      const strong = document.createElement('strong');
      link.replaceWith(strong);
      strong.append(link);
    }
    text.push(cta);
  });

  return { bg, text, videoLink };
}

export default function parse(element, { document }) {
  const isComposite = element.matches('.hero-composite') || !!element.querySelector('.cmp-hero-composite');
  const isVeHero = element.matches('.ve-hero-banner') || !!element.querySelector('.cmp-ve-hero-banner');
  let result;
  if (isComposite) result = parseHeroComposite(element, document);
  else if (isVeHero) result = parseVeHero(element, document);
  else result = parseBanner(element, document);
  const { bg, text, videoLink } = result;

  const cells = [];
  cells.push([videoLink ? [bg, videoLink].filter(Boolean) : (bg || '')]);
  cells.push([text]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero', cells });
  element.replaceWith(block);
}
