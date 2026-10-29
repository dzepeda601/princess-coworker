/* eslint-disable */
/* global WebImporter */

import heroParser from "./parsers/hero.js";
import cardsParser from "./parsers/cards.js";
import columnsParser from "./parsers/columns.js";
import formParser from "./parsers/form.js";
import princessCleanupTransformer from "./transformers/princess-cleanup.js";
import princessSectionsTransformer from "./transformers/princess-sections.js";
import loadLivePrices from "./utils/live-prices.js";

const PAGE_TEMPLATE = {
  "name": "home",
  "urls": [
    "https://www.princess.com/"
  ],
  "representativeUrl": "https://www.princess.com/",
  "description": "Princess Cruises homepage: hero, promo card carousels, two-column promos, newsletter sign-up, destination grid, feature cards",
  "blocks": [
    {
      "name": "hero",
      "instances": [
        "div.ve-hero-banner",
        ".banner"
      ]
    },
    {
      "name": "cards",
      "instances": [
        ".grid-container.cmp-grid-container--carousel",
        ".destination-grid",
        ".microsite-carousel-two"
      ]
    },
    {
      "name": "columns",
      "instances": [
        ".column-container",
        ".grid-container.cmp-grid-microsite-container--two-col-right-wider"
      ]
    },
    {
      "name": "form",
      "instances": [
        ".microsites-sign-up-form"
      ]
    }
  ],
  "urlPattern": "/",
  "sections": [
    {
      "id": "rc4",
      "name": "Hero - Early Booking Bonus",
      "selector": [
        "#main-content div.ve-hero-banner",
        "#main-content > div.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.ve-hero-banner.cmp-ve-hero-banner--large.cmp-ve-hero-banner--background-color-primary-white.cmp-ve-hero-banner--center-left.cmp-ve-hero-banner--vertical-align--center.cmp-ve-hero-banner--alignment-left.cmp-ve-hero-banner__content-background-color--blurred.cmp-ve-hero-banner__content-background-color-mobile--blurred.cmp-ve-hero-banner--no-transition.cmp-ve-hero-banner--aspectratio-2-3.cmp-ve-hero-banner--mobile-center.aem-GridColumn.aem-GridColumn--default--12"
      ],
      "style": null,
      "blocks": [
        "hero"
      ],
      "defaultContent": [
        "[class*=\"capsule_block_values\"]"
      ]
    },
    {
      "id": "rc6",
      "name": "2028 savings - destination deals",
      "selector": [
        "#main-content > div.aem-Grid > div.microsites-section:not(.aem-GridColumn--default--hide):has(.cmp-title-subtitle-block__headline):has(.dynamic-pricing a[href*=\"promos=KHS\"])",
        "#main-content > div.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.microsites-section.cmp-section--padding-top-0.aem-GridColumn.aem-GridColumn--default--12:nth-of-type(9)"
      ],
      "style": "cream",
      "blocks": [
        "cards"
      ],
      "defaultContent": [
        ".title-subtitle-block .cmp-title-subtitle-block__headline"
      ]
    },
    {
      "id": "rc8",
      "name": "New at Princess - Royal Princess Sanctuary Collection",
      "selector": [
        "div.microsites-section.cmp-section--rounded-top-left-edge-large",
        "#main-content > div.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.microsites-section.cmp-section--background-color-princess-white.cmp-section--rounded-top-left-edge-large.aem-GridColumn.aem-GridColumn--default--12"
      ],
      "style": null,
      "blocks": [
        "columns",
        "cards"
      ],
      "defaultContent": []
    },
    {
      "id": "rc9",
      "name": "Exclusive offers",
      "selector": [
        "#main-content > div.aem-Grid > div.microsites-section:not(.aem-GridColumn--default--hide):has(.teaser.cmp-teaser--image-ratio-4x5)",
        "#main-content > div.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.microsites-section.cmp-section--background-color-princess-white.cmp-section--padding-top-0.aem-GridColumn.aem-GridColumn--default--12:nth-of-type(13)"
      ],
      "style": null,
      "blocks": [
        "cards"
      ],
      "defaultContent": [
        ".text"
      ]
    },
    {
      "id": "rc10",
      "name": "Secure your 2028 cruise promo",
      "selector": [
        "#main-content > div.aem-Grid > div.microsites-section:not(.aem-GridColumn--default--hide):has(.cmp-grid-microsite-container--two-col-right-wider)",
        "#main-content > div.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.microsites-section.cmp-section--background-color-princess-white.aem-GridColumn.aem-GridColumn--default--12:nth-of-type(14)"
      ],
      "style": "dark-blue",
      "blocks": [
        "columns"
      ],
      "defaultContent": []
    },
    {
      "id": "rc11",
      "name": "Find cruises near you",
      "selector": [
        "div.microsites-section.cmp-section--padding-bottom-mobile-small",
        "#main-content > div.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.microsites-section.cmp-section--background-color-princess-white.cmp-section--padding-top-0.cmp-section--padding-bottom-0.cmp-section--padding-bottom-mobile-small.aem-GridColumn.aem-GridColumn--default--12"
      ],
      "style": null,
      "blocks": [
        "cards"
      ],
      "defaultContent": [
        ".text"
      ]
    },
    {
      "id": "rc12",
      "name": "Newsletter sign-up",
      "selector": [
        "div.microsites-section:has(.cmp-experiencefragment--sign-up)",
        "#main-content > div.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.microsites-section.cmp-section--background-color-princess-white.cmp-section--padding-top-0.cmp-section--padding-bottom-0.cmp-section--padding-bottom-mobile-0.aem-GridColumn.aem-GridColumn--default--12"
      ],
      "style": "light-blue",
      "blocks": [
        "form"
      ],
      "defaultContent": [
        ".cmp-ve-sign-up-form__title",
        ".cmp-ve-sign-up-form__footnote"
      ]
    },
    {
      "id": "rc13",
      "name": "Princess Plus and Premier packages banner",
      "selector": [
        "#main-content > div.aem-Grid > div.microsites-section:not(.aem-GridColumn--default--hide):has(.banner a[href*=\"plus-premier\"])",
        "#main-content > div.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.microsites-section.aem-GridColumn.aem-GridColumn--default--12:nth-of-type(17)"
      ],
      "style": null,
      "blocks": [
        "hero"
      ],
      "defaultContent": []
    },
    {
      "id": "rc14",
      "name": "Your perfect cruise ship awaits",
      "selector": [
        "#main-content > div.aem-Grid > div.microsites-section:not(.aem-GridColumn--default--hide):has(.dynamic-pricing a[href*=\"duration=7_7\"])",
        "#main-content > div.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.microsites-section.aem-GridColumn.aem-GridColumn--default--12:nth-of-type(18)"
      ],
      "style": "cream",
      "blocks": [
        "cards"
      ],
      "defaultContent": [
        ".title-subtitle-block .cmp-title-subtitle-block__headline"
      ]
    },
    {
      "id": "rc15",
      "name": "Sail away to 330+ destinations",
      "selector": [
        "div.microsites-section:has(.destination-grid)",
        "#main-content > div.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.microsites-section.cmp-section--background-color-princess-white.aem-GridColumn.aem-GridColumn--default--12:nth-of-type(19)"
      ],
      "style": null,
      "blocks": [
        "cards"
      ],
      "defaultContent": [
        ".cmp-destination-grid__title"
      ]
    },
    {
      "id": "rc16",
      "name": "The Princess difference",
      "selector": [
        "div.microsites-section.cmp-section--background-color-princess-sand",
        "#main-content > div.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.microsites-section.cmp-section--background-color-princess-sand.aem-GridColumn.aem-GridColumn--default--12"
      ],
      "style": "sand",
      "blocks": [
        "cards"
      ],
      "defaultContent": [
        ".cmp-title-subtitle-block__content",
        ".accolades-v2-html-comp"
      ]
    },
    {
      "id": "rc17",
      "name": "Plan your cruise services",
      "selector": [
        "#main-content > div.aem-Grid > div.cmp-section--background-color-princess-sand ~ div.microsites-section:has(.microsite-carousel-two)",
        "#main-content > div.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.microsites-section.cmp-section--background-color-princess-white.aem-GridColumn.aem-GridColumn--default--12:nth-of-type(21)"
      ],
      "style": null,
      "blocks": [
        "cards"
      ],
      "defaultContent": []
    },
    {
      "id": "rc19",
      "name": "Promotions terms note",
      "selector": [
        "#main-content > div.aem-Grid > div:has(.cmp-modal__trigger-text)",
        "#main-content div.section.cmp-section--alignment-left",
        "#main-content > div.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.section.cmp-section--alignment-left.cmp-section--background-color-white.aem-GridColumn.aem-GridColumn--default--12"
      ],
      "style": null,
      "blocks": [],
      "defaultContent": [
        ".modal"
      ]
    }
  ]
};

const parsers = {
  hero: heroParser,
  cards: cardsParser,
  columns: columnsParser,
  form: formParser,
};

// cleanup must run before sections: it removes unmapped siblings that would shift :nth-of-type selectors
const transformers = [princessCleanupTransformer, princessSectionsTransformer];

function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((fn) => {
    try { fn(hookName, element, enhancedPayload); }
    catch (e) { console.error(`Transformer failed at ${hookName}:`, e); }
  });
}

function findBlocksOnPage(root, template) {
  const pageBlocks = [];
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      root.querySelectorAll(selector).forEach((element) => {
        pageBlocks.push({ name: blockDef.name, selector, element });
      });
    });
  });
  return pageBlocks;
}

export default {
  onLoad: async ({ document }) => {
    try { await loadLivePrices(document); } catch (e) { console.error('Price preload failed:', e); }
  },

  transform: (payload) => {
    const { document, url, params } = payload;
    // work on a detached copy: the live page's consent manager (lit) keeps re-rendering
    // hidden text into <body> while the importer serializes it
    const main = document.body.cloneNode(true);

    executeTransformers("beforeTransform", main, payload);

    const pageBlocks = findBlocksOnPage(main, PAGE_TEMPLATE);
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (!parser) return;
      try { parser(block.element, { document, url, params }); }
      catch (e) { console.error(`Failed to parse ${block.name} (${block.selector}):`, e); }
    });

    executeTransformers("afterTransform", main, payload);

    main.appendChild(document.createElement("hr"));
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, "")
      .replace(/\.html?$/, "");
    const path = WebImporter.FileUtils.sanitizePath(rawPath === "" ? "/index" : rawPath);

    return [{
      element: main,
      path,
      report: { title: document.title, template: PAGE_TEMPLATE.name, blocks: pageBlocks.map((b) => b.name) },
    }];
  },
};
