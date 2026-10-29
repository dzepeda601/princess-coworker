/* eslint-disable */
/* global WebImporter */

/**
 * Princess Cruises cleanup transformer for destination landing pages
 * (template "cruise-destinations", e.g. /cruise-destinations/mediterranean-cruises).
 *
 * beforeTransform:
 *  - marks the mapped top-level sections (template selectors) with data-excat-section and
 *    removes every other top-level #main-content grid child (sticky sub-nav, custom-html,
 *    spacers, hidden/personalized "saved cruises" section)
 *  - removes global header/footer, cookie banner, svg library, tracking pixels, the
 *    Optimizely browse-banner injected into the hero
 *  - video hero: desktop video -> poster <img> that keeps the clip as data-video-src
 *  - content shaping for the shared parsers (data-excat-* hints, heading levels)
 *  - root-relative princess.com links -> absolute https://www.princess.com/... links
 *  - removes non-authorable widget chrome (video/carousel controls, clones, toggles, ...)
 *
 * afterTransform: final removal of scripts/styles/consent-manager nodes and temporary markers.
 * Never removes HTML comments.
 */

const MAIN_GRID_SELECTOR = '#main-content > div.aem-Grid';
const ORIGIN = 'https://www.princess.com';
// newsletter variant with first/last name fields (definition authored separately)
const SIGN_UP_FORM = '/forms/newsletter-signup-name.json';

function queryAllSafe(root, sel) {
  try {
    return [...root.querySelectorAll(sel)];
  } catch (e) {
    return [];
  }
}

function removeAll(root, selectors) {
  selectors.forEach((sel) => queryAllSafe(root, sel).forEach((n) => n.remove()));
}

/** Return the direct child of `grid` that contains `el` (or null). */
function topLevelChild(grid, el) {
  let cur = el;
  while (cur && cur.parentElement !== grid) cur = cur.parentElement;
  return cur;
}

function markMappedSections(element, grid, sections) {
  sections.forEach((section) => {
    const selectors = Array.isArray(section.selector) ? section.selector : [section.selector];
    for (let i = 0; i < selectors.length; i += 1) {
      const sel = selectors[i];
      if (!sel) continue;
      const match = queryAllSafe(element, sel)
        .map((el) => topLevelChild(grid, el))
        .find((el) => el && !el.hasAttribute('data-excat-section'));
      if (match) {
        match.setAttribute('data-excat-section', section.id);
        break;
      }
    }
  });
}

/** Replace `el` with a new element of `tag`, keeping its children. */
function retag(document, el, tag) {
  const n = document.createElement(tag);
  while (el.firstChild) n.append(el.firstChild);
  el.replaceWith(n);
  return n;
}

export default function transform(hookName, element, payload) {
  const document = element.ownerDocument || element;

  if (hookName === 'beforeTransform') {
    // 1. Keep only the mapped top-level sections.
    const grid = element.querySelector(MAIN_GRID_SELECTOR);
    const sections = payload && payload.template && payload.template.sections;
    // hidden / personalized variants never count as a mapped section
    removeAll(element, ['#main-content .aem-GridColumn--default--hide', '#saved-cruises-container-section-root-container']);
    if (grid && Array.isArray(sections) && sections.length) {
      markMappedSections(element, grid, sections);
      if (grid.querySelector(':scope > [data-excat-section]')) {
        [...grid.children].forEach((child) => {
          if (!child.hasAttribute('data-excat-section')) child.remove();
        });
      }
    }

    // 2. Global chrome, overlays and injected third-party content.
    removeAll(element, [
      '.experiencefragment:has(> #external-header)',
      '#external-header',
      'footer.footer.aem-GridColumn',
      '#external-footer',
      '#osano-nam-template',
      '.osano-cm-window',
      '.osano-visually-hidden',
      '[id^="osano-cm"]',
      '.svg-library-wrapper',
      '#st-injected-content',
      '#arttrk-lead',
      '#linkedinPixel',
      '[id^="batBeacon"]',
      'img.ywa-10000',
      '#modalOverlay',
      '#skinnyBannerCTA',
      '.browse-banner',
      '.browser-banner-btn',
    ]);
    queryAllSafe(element, 'body > div:not(.root)').forEach((div) => {
      if (!div.textContent.trim() && !div.querySelector('img, picture')) div.remove();
    });

    // 3. Video hero: keep the desktop poster as a visible still and remember the clip
    // (hero parser authors it as a video link next to the poster).
    queryAllSafe(element, 'video.cmp-video-dam-v2__video--desktop[poster], video.cmp-video-dam__video--desktop[poster]').forEach((video) => {
      const img = document.createElement('img');
      img.className = 'cmp-video-dam__backdrop--desktop';
      img.src = new URL(video.getAttribute('poster'), ORIGIN).href;
      img.alt = '';
      const source = video.querySelector('source[data-src], source[src]');
      const clip = source && (source.getAttribute('data-src') || source.getAttribute('src'));
      if (clip) img.setAttribute('data-video-src', new URL(clip, ORIGIN).href);
      video.replaceWith(img);
    });

    // 4. Hints for the shared parsers.
    // desktop sliders (microsite carousels) author as the cards "carousel" option
    queryAllSafe(element, '.microsite-carousel-two').forEach((el) => el.setAttribute('data-excat-block-options', 'carousel'));
    // this template's sign-up form collects email + first/last name
    queryAllSafe(element, '.microsites-sign-up-form').forEach((el) => el.setAttribute('data-excat-form', SIGN_UP_FORM));
    // panel titles typed as styled <p> below a section H2 are sub-headings
    queryAllSafe(element, '.microsites-section .microsites-section .cmp-column-container__item__title > p')
      .forEach((p) => retag(document, p, 'h3'));
    // section titles authored as H3 on the source are section headings (H2)
    queryAllSafe(element, '.cmp-ve-sign-up-form__title > h3, h3.cmp-title-subtitle-block__headline')
      .forEach((h) => retag(document, h, 'h2'));

    // 5. princess.com links stay absolute.
    queryAllSafe(element, 'a[href^="/"]:not([href^="//"])').forEach((a) => {
      a.setAttribute('href', `${ORIGIN}${a.getAttribute('href')}`);
    });

    // 6. Non-authorable widgets.
    removeAll(element, [
      '.cmp-video-dam-v2__controls',
      '.cmp-video-dam__controls',
      'video',
      '.cmp-video-dam-v2__backdrop--mobile',
      '.cmp-grid-container--carousel__controls-container',
      '[class*="cmp-microsite-carousel-two__content__slider-controls"]',
      '[id^="carousel-status"].sr-only',
      '.is-clone',
      '.spacer',
      '.cmp-destination-grid__show-less-more-container',
      '.cmp-destination-grid__placeholder',
      '.cmp-tabs-v2__accordion-button',
      '.cmp-ve-sign-up-form__close',
      '.cmp-ve-sign-up-form__close-btn',
      '.cmp-ve-sign-up-form__success-message-container',
      '.cmp-ve-sign-up-form__loading',
      '.cmp-modal__modal-container',
    ]);

    // 7. Scripts, styles and embeds.
    removeAll(element, ['script', 'style', 'noscript', 'iframe', 'link']);
  }

  if (hookName === 'afterTransform') {
    removeAll(element, [
      '#external-header',
      '#external-footer',
      'footer',
      'header',
      'nav',
      '#osano-nam-template',
      '.osano-cm-window',
      '.osano-visually-hidden',
      '[id^="osano-cm"]',
      'script',
      'style',
      'noscript',
      'iframe',
      'link',
    ]);
    // the consent manager re-renders hidden text straight into <body>: keep only the content wrapper
    if (element.querySelector('#main-content')) {
      [...element.childNodes].forEach((node) => {
        if (node.nodeType === 1 && (node.id === 'main-content' || node.querySelector('#main-content'))) return;
        node.remove();
      });
    }
    queryAllSafe(element, '[data-excat-section]').forEach((el) => el.removeAttribute('data-excat-section'));
  }
}
