/* eslint-disable */
/* global WebImporter */

/**
 * Princess Cruises sections transformer.
 *
 * beforeTransform: walks template sections in reverse and inserts <hr> before every
 * non-first section (while the source section elements still exist). Styled
 * sections get a temporary data-excat-section-id marker on their <hr>; a styled
 * first section gets a temporary marked <hr> that is removed in afterTransform.
 *
 * afterTransform: walks sections in reverse and inserts a Section Metadata block
 * (style) after each marker, then removes the markers.
 *
 * Sections are resolved first via the data-excat-section attribute set by
 * princess-cleanup.js (needed because cleanup removes unmapped siblings, which
 * invalidates the :nth-of-type selectors), then via the template selectors in order.
 */

const MARKER = 'data-excat-section-id';
const FIRST_MARKER = 'data-excat-section-first';

function findSectionElement(root, section) {
  try {
    const marked = root.querySelector(`[data-excat-section="${section.id}"]`);
    if (marked) return marked;
  } catch (e) {
    // ignore
  }
  const selectors = Array.isArray(section.selector) ? section.selector : [section.selector];
  for (let i = 0; i < selectors.length; i += 1) {
    const sel = selectors[i];
    if (!sel) continue;
    try {
      const el = root.querySelector(sel);
      if (el) return el;
    } catch (e) {
      // unsupported selector (e.g. :has) - try the next one
    }
  }
  return null;
}

export default function transform(hookName, element, payload) {
  const template = payload && payload.template;
  const sections = template && Array.isArray(template.sections) ? template.sections : [];
  if (sections.length < 2) return;
  const document = element.ownerDocument || element;

  if (hookName === 'beforeTransform') {
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      const el = findSectionElement(element, section);
      if (!el || !el.parentNode) continue;
      if (i > 0) {
        const hr = document.createElement('hr');
        if (section.style) hr.setAttribute(MARKER, section.id);
        el.parentNode.insertBefore(hr, el);
      } else if (section.style) {
        const hr = document.createElement('hr');
        hr.setAttribute(MARKER, section.id);
        hr.setAttribute(FIRST_MARKER, 'true');
        el.parentNode.insertBefore(hr, el);
      }
    }
  }

  if (hookName === 'afterTransform') {
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (!section.style) continue;
      const hr = element.querySelector(`hr[${MARKER}="${section.id}"]`);
      const anchor = hr || findSectionElement(element, section);
      if (!anchor || !anchor.parentNode) continue;
      const metadata = WebImporter.Blocks.createBlock(document, {
        name: 'Section Metadata',
        cells: { style: section.style },
      });
      if (hr) {
        hr.after(metadata);
        if (hr.hasAttribute(FIRST_MARKER)) {
          hr.remove();
        } else {
          hr.removeAttribute(MARKER);
        }
      } else {
        anchor.after(metadata);
      }
    }
    // clean up any leftover temporary markers
    element.querySelectorAll(`hr[${FIRST_MARKER}]`).forEach((hr) => hr.remove());
    element.querySelectorAll(`[${MARKER}]`).forEach((el) => el.removeAttribute(MARKER));
  }
}
