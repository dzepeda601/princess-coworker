/* eslint-disable */
/* global WebImporter */

/**
 * Princess Cruises cleanup transformer.
 *
 * beforeTransform:
 *  - marks the mapped top-level sections (page-templates.json selectors) with
 *    data-excat-section and removes every other top-level #main-content grid child
 *    (hidden/personalized variants, Recently viewed, Rewards Visa, stray modals,
 *    custom-html, empty sections)
 *  - removes global header/footer, cookie banner, svg library, tracking pixels
 *  - replaces the hero cruise search widget with a "Quick searches" list of the
 *    capsule links, placed right after the hero
 *  - removes non-authorable widgets (video controls, countdowns, wave dividers,
 *    carousel controls/status/clones, spacers, sign-up close/success/loading)
 *
 * afterTransform:
 *  - final removal of scripts/styles/iframes/links and temporary markers.
 *  Never removes HTML comments.
 */

const MAIN_GRID_SELECTOR = '#main-content > div.aem-Grid';

function removeAll(root, selectors) {
  selectors.forEach((sel) => {
    let nodes = [];
    try {
      nodes = [...root.querySelectorAll(sel)];
    } catch (e) {
      nodes = [];
    }
    nodes.forEach((n) => n.remove());
  });
}

function queryAllSafe(root, sel) {
  try {
    return [...root.querySelectorAll(sel)];
  } catch (e) {
    return [];
  }
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

const SEARCH_RESULTS = 'https://www.princess.com/cruise-search/results/';
// search widget select -> results query parameter (as used by princess.com result links)
const SEARCH_PARAMS = [
  ['.destination-field', 'trade'],
  ['.port-field', 'ports'],
  ['.date-field', 'date'],
];

/**
 * The "Fall savings sale" strip is an A/B-injected SVG banner on the source, so its
 * copy is authored here as text (eyebrow heading, offer line, CTA).
 */
function buildPromoStrip(document) {
  const wrapper = document.createElement('div');
  const h2 = document.createElement('h2');
  h2.textContent = 'Fall savings sale';
  const offer = document.createElement('p');
  offer.textContent = 'Up to 45%* off + up to $450 instant savings';
  const cta = document.createElement('p');
  const strong = document.createElement('strong');
  const a = document.createElement('a');
  a.href = `${SEARCH_RESULTS}?promos=KLS`;
  a.textContent = 'Book now';
  strong.append(a);
  cta.append(strong);
  const meta = WebImporter.Blocks.createBlock(document, {
    name: 'Section Metadata',
    cells: { style: 'dark-blue, promo-strip' },
  });
  wrapper.append(h2, offer, cta, meta);
  return wrapper;
}

/** Cruise Search block: one row per select (label | option links) plus the search link. */
function buildCruiseSearch(document, widget) {
  const fields = widget.querySelector('.widget-fields');
  if (!fields) return null;
  const cells = [];
  SEARCH_PARAMS.forEach(([selector, param]) => {
    const field = fields.querySelector(selector);
    const select = field && field.querySelector('select');
    if (!select) return;
    const label = (field.querySelector('label') || {}).textContent || '';
    const ul = document.createElement('ul');
    [...select.options].forEach((o) => {
      const li = document.createElement('li');
      const text = o.textContent.trim();
      if (o.value) {
        const a = document.createElement('a');
        a.href = `${SEARCH_RESULTS}?${param}=${encodeURIComponent(o.value)}`;
        a.textContent = text;
        li.append(a);
      } else {
        li.textContent = text; // the "Any ..." placeholder option
      }
      ul.append(li);
    });
    cells.push([label.trim(), ul]);
  });
  if (!cells.length) return null;
  const submit = widget.querySelector('#search-widget-submit a[href], a.search-cruises-btn[href]');
  const link = document.createElement('a');
  link.href = submit ? new URL(submit.getAttribute('href'), 'https://www.princess.com').href : SEARCH_RESULTS;
  link.textContent = 'Search cruises';
  cells.push([link]);
  return WebImporter.Blocks.createBlock(document, { name: 'Cruise Search', cells });
}

function buildQuickSearches(document, element) {
  const widget = element.querySelector('.cmp-ve-hero-banner__search--widget--container');
  if (!widget) return;
  const capsules = widget.querySelector('[class*="capsule_block_values"]');
  const links = capsules ? [...capsules.querySelectorAll('a[href]')] : [];
  const hero = widget.closest('div.ve-hero-banner');

  if (hero && hero.parentElement) {
    const sectionId = hero.getAttribute('data-excat-section');
    const mark = (el, suffix) => {
      // keep generated wrappers inside the hero section's bounds
      if (sectionId) el.setAttribute('data-excat-section', `${sectionId}-${suffix}`);
      return el;
    };
    const wrapper = mark(document.createElement('div'), 'quick-searches');
    const search = buildCruiseSearch(document, widget);
    if (search) wrapper.append(search);
    if (links.length) {
      const label = document.createElement('p');
      label.textContent = 'Quick searches';
      wrapper.append(label);
      const ul = document.createElement('ul');
      links.forEach((a) => {
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.href = a.getAttribute('href');
        link.textContent = a.textContent.trim();
        li.append(link);
        ul.append(li);
      });
      wrapper.append(ul);
    }
    // hero | promo strip | search + quick searches, each its own section
    hero.after(
      document.createElement('hr'),
      mark(buildPromoStrip(document), 'promo-strip'),
      document.createElement('hr'),
      wrapper,
    );
  }
  widget.remove();
}

export default function transform(hookName, element, payload) {
  const document = element.ownerDocument || element;

  if (hookName === 'beforeTransform') {
    // 1. Keep only the mapped top-level sections.
    const grid = element.querySelector(MAIN_GRID_SELECTOR);
    const sections = payload && payload.template && payload.template.sections;
    if (grid && Array.isArray(sections) && sections.length) {
      markMappedSections(element, grid, sections);
      const marked = grid.querySelectorAll(':scope > [data-excat-section]');
      if (marked.length) {
        [...grid.children].forEach((child) => {
          if (!child.hasAttribute('data-excat-section')) child.remove();
        });
      }
    }

    // 2. Global chrome and overlays.
    removeAll(element, [
      '.experiencefragment:has(> #external-header)',
      '#external-header',
      'footer.footer.aem-GridColumn',
      '#external-footer',
      '#osano-nam-template',
      '.osano-cm-window',
      '.osano-visually-hidden',
      '[id^="osano-cm"]',
      'body > div.svg-library-wrapper',
      '.svg-library-wrapper',
      '#pcl-podcast-announcer',
      '#st-injected-content',
      '#arttrk-lead',
      '#linkedinPixel',
      '[id^="batBeacon"]',
      'img.ywa-10000',
      '#modalOverlay',
      '#skinnyBannerCTA',
      '.aem-GridColumn--default--hide',
    ]);
    // empty body-level wrappers left over from injected overlays
    queryAllSafe(element, 'body > div:not(.root)').forEach((div) => {
      if (!div.textContent.trim() && !div.querySelector('img, picture')) div.remove();
    });

    // 3. Hero search widget -> "Quick searches" default content.
    buildQuickSearches(document, element);

    // 4a. Video heroes: keep the desktop poster as a visible still image before videos are removed
    // (the backdrop <img> fallbacks are display:none on the live page and get dropped).
    queryAllSafe(element, 'video.cmp-video-dam__video--desktop[poster]').forEach((video) => {
      const img = document.createElement('img');
      img.className = 'cmp-video-dam__backdrop--desktop';
      img.src = video.getAttribute('poster');
      img.alt = '';
      // keep the clip so the parser can author it as a video link next to the poster
      const source = video.querySelector('source[data-src], source[src]');
      const clip = source && (source.getAttribute('data-src') || source.getAttribute('src'));
      if (clip) img.setAttribute('data-video-src', new URL(clip, 'https://www.princess.com').href);
      video.replaceWith(img);
    });

    // 4. Modal text triggers -> plain links to the modal's source content.
    queryAllSafe(element, 'button.cmp-modal__trigger[data-modal-source-url]').forEach((btn) => {
      const a = document.createElement('a');
      a.href = new URL(btn.getAttribute('data-modal-source-url'), 'https://www.princess.com').href;
      a.textContent = btn.textContent.trim();
      btn.replaceWith(a);
    });

    // 5. Non-authorable widgets.
    removeAll(element, [
      '.cmp-modal__modal-container',
      '.cmp-video-dam__controls',
      'video',
      '.cmp-ve-hero-banner__countdown-container',
      '.cmp-column-container__countdown-container',
      '.countdown',
      '.cmp-ve-hero-banner__wave-divider',
      '.cmp-grid-container--carousel__controls-container',
      '[id^="carousel-status"].sr-only',
      '.is-clone',
      '.spacer',
      '.cmp-ve-sign-up-form__close',
      '.cmp-ve-sign-up-form__close-btn',
      '.cmp-ve-sign-up-form__success-message-container',
      '.cmp-ve-sign-up-form__success-message',
      '.cmp-ve-sign-up-form__loading',
    ]);

    // 6. Scripts, styles and embeds.
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
    // the consent manager re-renders its hidden aria/text nodes straight into <body>:
    // drop every body-level node that is not the page content wrapper
    if (element.querySelector('#main-content')) {
      [...element.childNodes].forEach((node) => {
        if (node.nodeType === 1 && node.querySelector('#main-content')) return;
        if (node.nodeType === 1 && node.id === 'main-content') return;
        node.remove();
      });
    }
    queryAllSafe(element, '[data-excat-section]').forEach((el) => el.removeAttribute('data-excat-section'));
  }
}
