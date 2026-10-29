/* eslint-disable */
/* global WebImporter */

/**
 * Parser for the faq block.
 *
 * Local blocks/faq: two-cell rows are authored question | answer pairs (answer keeps rich
 * content such as links); one-cell rows are category filters for /faq-index.json.
 *
 * Source instance: .accordion (cmp-accordion). Each item has a button.cmp-accordion__item-button
 * (question) whose aria-controls points at the collapsed answer panel; panels are hidden on
 * the live page but present in the DOM, so all answers are read from there.
 */

function cleanText(text) {
  return (text || '').replace(/[‎‏]/g, '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

function appendInline(document, src, target) {
  src.childNodes.forEach((node) => {
    if (node.nodeType === 3) {
      target.append(node.textContent.replace(/ /g, ' ').replace(/\s+/g, ' '));
    } else if (node.nodeType === 1 && node.tagName === 'A' && node.getAttribute('href')) {
      const a = document.createElement('a');
      a.href = node.getAttribute('href');
      a.textContent = cleanText(node.textContent);
      target.append(a);
    } else if (node.nodeType === 1 && /^(STRONG|B|EM|I)$/.test(node.tagName)) {
      const n = document.createElement(node.tagName === 'B' ? 'strong' : node.tagName === 'I' ? 'em' : node.tagName.toLowerCase());
      appendInline(document, node, n);
      if (cleanText(n.textContent)) target.append(n);
      else target.append(' ');
    } else if (node.nodeType === 1) {
      appendInline(document, node, target);
    }
  });
}

function trimEdges(el) {
  el.normalize();
  if (el.firstChild && el.firstChild.nodeType === 3) el.firstChild.textContent = el.firstChild.textContent.trimStart();
  if (el.lastChild && el.lastChild.nodeType === 3) el.lastChild.textContent = el.lastChild.textContent.trimEnd();
  return el;
}

/** Answer blocks (paragraphs, lists) with text + links. */
function answerContent(document, panel) {
  const out = [];
  const nodes = [...panel.querySelectorAll('p, ul, ol, h3, h4, h5, h6')]
    .filter((n) => !n.parentElement.closest('p, ul, ol'));
  nodes.forEach((n) => {
    if (!cleanText(n.textContent)) return;
    if (n.tagName === 'UL' || n.tagName === 'OL') {
      const list = document.createElement(n.tagName.toLowerCase());
      n.querySelectorAll(':scope > li').forEach((li) => {
        const item = document.createElement('li');
        appendInline(document, li, item);
        list.append(trimEdges(item));
      });
      out.push(list);
    } else {
      const p = document.createElement('p');
      appendInline(document, n, p);
      out.push(trimEdges(p));
    }
  });
  if (!out.length && cleanText(panel.textContent)) {
    const p = document.createElement('p');
    p.textContent = cleanText(panel.textContent);
    out.push(p);
  }
  return out;
}

export default function parse(element, { document }) {
  const cells = [];
  element.querySelectorAll('.cmp-accordion__item').forEach((item) => {
    const button = item.querySelector('.cmp-accordion__item-button, [aria-controls]');
    const question = cleanText(button && (button.querySelector('.cmp-accordion__title') || button).textContent);
    if (!question) return;
    const panelId = button.getAttribute('aria-controls');
    const panel = (panelId && [...item.querySelectorAll('[id]')].find((n) => n.id === panelId))
      || item.querySelector('.cmp-accordion__item-content, [role="region"]');
    const answer = panel ? answerContent(document, panel) : [];
    cells.push([question, answer]);
  });

  if (!cells.length) {
    element.remove();
    return;
  }
  const block = WebImporter.Blocks.createBlock(document, { name: 'FAQ', cells });
  element.replaceWith(block);
}
