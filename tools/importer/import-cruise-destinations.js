/* eslint-disable */
/* global WebImporter */

import heroParser from "./parsers/hero.js";
import cardsParser from "./parsers/cards.js";
import columnsParser from "./parsers/columns.js";
import formParser from "./parsers/form.js";
import tabsParser from "./parsers/tabs.js";
import faqParser from "./parsers/faq.js";
// princess-cleanup.js is homepage-specific (it builds the promo strip + cruise search from the
// home hero widget), so this template only uses its own cleanup plus the template-driven sections.
import princessDestinationCleanupTransformer from "./transformers/princess-destination-cleanup.js";
import princessSectionsTransformer from "./transformers/princess-sections.js";
import loadLivePrices from "./utils/live-prices.js";

const PAGE_TEMPLATE = {
  "name": "cruise-destinations",
  "urls": [
    "https://www.princess.com/cruise-destinations/mediterranean-cruises"
  ],
  "representativeUrl": "https://www.princess.com/cruise-destinations/mediterranean-cruises",
  "description": "Princess Cruises destination landing pages: video hero, deal and feature card carousels, newsletter sign-up, text + image-pair columns, destination tiles, banner, port-of-call tabs, FAQ accordion, blog cards",
  "blocks": [
    {
      "name": "hero",
      "instances": [
        "div.hero-composite",
        ".banner"
      ]
    },
    {
      "name": "cards",
      "instances": [
        ".grid-container.cmp-grid-container--carousel",
        ".destination-grid",
        ".microsite-carousel-two",
        ".grid-container.cmp-grid-container--3col-4"
      ]
    },
    {
      "name": "columns",
      "instances": [
        ".column-container",
        ".grid-container.cmp-grid-container--2col-5-6"
      ]
    },
    {
      "name": "form",
      "instances": [
        ".microsites-sign-up-form"
      ]
    },
    {
      "name": "tabs",
      "instances": [
        ".tabs-v2"
      ]
    },
    {
      "name": "faq",
      "instances": [
        ".accordion"
      ]
    }
  ],
  "urlPattern": "/cruise-destinations/*",
  "sections": [
    {
      "id": "rc4",
      "name": "Hero - Mediterranean Cruises for 2026, 2027 & 2028",
      "selector": [
        "#main-content > div.aem-Grid > div.hero-composite",
        "#main-content div.hero-composite"
      ],
      "style": null,
      "blocks": [
        "hero"
      ],
      "defaultContent": []
    },
    {
      "id": "rc9",
      "name": "Book your Mediterranean adventure (deal carousel)",
      "selector": [
        "#main-content > div.aem-Grid > div.microsites-section:has(.grid-container.cmp-grid-container--carousel .dynamic-pricing)"
      ],
      "style": "cream",
      "blocks": [
        "cards"
      ],
      "defaultContent": [
        ".title-subtitle-block .cmp-title-subtitle-block__content",
        ".text .cmp-text"
      ]
    },
    {
      "id": "rc10",
      "name": "Sign up for $50 onboard credit",
      "selector": [
        "#main-content > div.aem-Grid > div.experiencefragment:has(.cmp-experiencefragment--sign-up)",
        "#main-content > div.aem-Grid > div:has(.microsites-sign-up-form)"
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
      "id": "rc11",
      "name": "Experience the cuisine and culture",
      "selector": [
        "#main-content > div.aem-Grid > div.microsites-section:has(> .cmp-section > .cmp-section__container > div > .column-container)"
      ],
      "style": "cream",
      "blocks": [
        "columns"
      ],
      "defaultContent": []
    },
    {
      "id": "rc12",
      "name": "Cruise destinations you'll love",
      "selector": [
        "#main-content > div.aem-Grid > div.microsites-section:has(.destination-grid)"
      ],
      "style": "cream",
      "blocks": [
        "cards"
      ],
      "defaultContent": [
        ".cmp-destination-grid__title"
      ]
    },
    {
      "id": "rc13",
      "name": "Now Booking: 2028 Europe Voyages banner",
      "selector": [
        "#main-content > div.aem-Grid > div.microsites-section:has(.banner)",
        "#main-content > div.aem-Grid > div.microsites-section.cmp-section--background-color-princess-sand-2"
      ],
      "style": null,
      "blocks": [
        "hero"
      ],
      "defaultContent": []
    },
    {
      "id": "rc14",
      "name": "Best Mediterranean cruise options",
      "selector": [
        "#main-content > div.aem-Grid > div.microsites-section:has(.cmp-microsite-carousel-two__container__small-non-alternating):not(:has(.experiencefragment))"
      ],
      "style": "cream",
      "blocks": [
        "cards"
      ],
      "defaultContent": [
        ".cmp-microsite-carousel-two__wrapper__content"
      ]
    },
    {
      "id": "rc15",
      "name": "Mediterranean cruise ports of call",
      "selector": [
        "#main-content > div.aem-Grid > div.microsites-section:has(.tabs-v2)"
      ],
      "style": "cream",
      "blocks": [
        "tabs"
      ],
      "defaultContent": [
        ".title-subtitle-block .cmp-title-subtitle-block__content"
      ]
    },
    {
      "id": "rc16",
      "name": "Why cruise the Mediterranean",
      "selector": [
        "#main-content > div.aem-Grid > div.microsites-section.cmp-section--background-color-princess-blue:has(.column-container)"
      ],
      "style": "dark-blue",
      "blocks": [
        "cards",
        "columns"
      ],
      "defaultContent": [
        ".title-subtitle-block .cmp-title-subtitle-block__content"
      ]
    },
    {
      "id": "rc17",
      "name": "Why cruise with Princess",
      "selector": [
        "#main-content > div.aem-Grid > div.microsites-section.cmp-section--background-color-princess-blue:not(:has(.column-container))"
      ],
      "style": "dark-blue",
      "blocks": [
        "cards"
      ],
      "defaultContent": [
        ".title-subtitle-block .cmp-title-subtitle-block__content"
      ]
    },
    {
      "id": "rc18",
      "name": "All you need to know about Europe",
      "selector": [
        "#main-content > div.aem-Grid > div.microsites-section.cmp-section--background-color-princess-white:has(.microsite-carousel-two)"
      ],
      "style": null,
      "blocks": [
        "cards"
      ],
      "defaultContent": [
        ".cmp-microsite-carousel-two__wrapper__content"
      ]
    },
    {
      "id": "rc19",
      "name": "Cruises to the Mediterranean FAQs",
      "selector": [
        "#main-content > div.aem-Grid > div.microsites-section:has(.accordion)"
      ],
      "style": "cream",
      "blocks": [
        "faq"
      ],
      "defaultContent": [
        ".cmp-title-subtitle-block__headline"
      ]
    },
    {
      "id": "rc20",
      "name": "Let Princess get you there",
      "selector": [
        "#main-content > div.aem-Grid > div.microsites-section:has(.experiencefragment .microsite-carousel-two)"
      ],
      "style": "cream",
      "blocks": [
        "cards"
      ],
      "defaultContent": [
        ".cmp-microsite-carousel-two__wrapper__content"
      ]
    },
    {
      "id": "rc21",
      "name": "Princess Rewards Visa Card",
      "selector": [
        "#main-content > div.aem-Grid > div.microsites-section:has(.cmp-content-block)"
      ],
      "style": "cream",
      "blocks": [
        "columns"
      ],
      "defaultContent": []
    },
    {
      "id": "rc22",
      "name": "Cruise deals and promotions",
      "selector": [
        "#main-content > div.aem-Grid > div.microsites-section.cmp-section--background-color-princess-sand:has(.column-container)"
      ],
      "style": "sand",
      "blocks": [
        "columns",
        "cards"
      ],
      "defaultContent": [
        ".title-subtitle-block .cmp-title-subtitle-block__headline"
      ]
    }
  ]
};

const parsers = {
  hero: heroParser,
  cards: cardsParser,
  columns: columnsParser,
  form: formParser,
  tabs: tabsParser,
  faq: faqParser,
};

// cleanup must run before sections: it marks the mapped sections and removes unmapped siblings
const transformers = [princessDestinationCleanupTransformer, princessSectionsTransformer];

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
