/* eslint-disable */
/* global WebImporter */

/**
 * Parser for the form block.
 *
 * Block rows (local blocks/form): one cell with a link to the form definition JSON
 * (optionally a second link to a submit endpoint). The newsletter sign-up fields
 * (email, first/last name, SIGN UP) are defined in /forms/newsletter-signup.json.
 *
 * Source instance: .microsites-sign-up-form (rc12).
 * The form title (.cmp-ve-sign-up-form__title) and footnote (.cmp-ve-sign-up-form__footnote,
 * which sits inside the <form>) are NOT part of the block: they are moved out next to the
 * block so they remain default content (title before, footnote after). Only the form
 * fields/submit area is replaced by the block.
 */

const FORM_DEFINITION = '/forms/newsletter-signup.json';

export default function parse(element, { document }) {
  const title = element.querySelector('.cmp-ve-sign-up-form__title');
  const footnote = element.querySelector('.cmp-ve-sign-up-form__footnote');

  // keep title + footnote as default content around the block
  if (title) {
    [...title.children].forEach((child) => element.before(child));
    if (!title.children.length && title.textContent.trim()) {
      const h = document.createElement('h3');
      h.textContent = title.textContent.trim();
      element.before(h);
    }
  }
  if (footnote) {
    [...footnote.children].reverse().forEach((child) => element.after(child));
  }

  const link = document.createElement('a');
  link.href = FORM_DEFINITION;
  link.textContent = FORM_DEFINITION;

  const cells = [];
  cells.push([link]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'form', cells });
  element.replaceWith(block);
}
