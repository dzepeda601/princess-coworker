/* eslint-disable */
/* global WebImporter */

/**
 * Parser for the tabs block.
 *
 * NOTE: the project's blocks/tabs/tabs.js is section-driven (it differs from the Block
 * Collection "label | content" rows): a Tabs block marks the host section and every
 * following section with Section Metadata `tab-id` / `tab-title` becomes a tab panel
 * (collection stops at the first section without tab-id). So the parser emits:
 *
 *   [Tabs block] <hr> panel 1 content [Section Metadata tab-id|tab-title] <hr> panel 2 ...
 *
 * Source instance: .tabs-v2 (destination "ports of call"): li[role=tab] labels whose
 * aria-controls point at div[role=tabpanel] panels. All panels are read, including the
 * hidden ones. Panel content (.cmp-card): image, optional caption, description, links.
 */

function cleanText(text) {
  return (text || '').replace(/[‎‏]/g, '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

function slug(text) {
  return cleanText(text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function usableSrc(img) {
  if (!img) return '';
  const candidates = [
    img.getAttribute('data-lazy-src'),
    img.getAttribute('src'),
    img.getAttribute('data-src'),
  ];
  const holder = img.closest('[data-src]');
  if (holder && holder !== img) {
    let s = holder.getAttribute('data-src');
    if (s && /%7B|\{/.test(s)) s = s.split('?')[0];
    candidates.push(s);
  }
  return candidates.find((s) => s && !s.startsWith('data:') && !s.startsWith('blob:')) || '';
}

function appendInline(document, src, target) {
  src.childNodes.forEach((node) => {
    if (node.nodeType === 3) {
      target.append(node.textContent.replace(/ /g, ' ').replace(/\s+/g, ' '));
    } else if (node.nodeType === 1 && node.tagName === 'A' && node.getAttribute('href')) {
      const a = document.createElement('a');
      a.href = node.getAttribute('href');
      a.textContent = cleanText(node.textContent);
      target.append(a);
    } else if (node.nodeType === 1) {
      appendInline(document, node, target);
    }
  });
}

function paragraph(document, p) {
  const out = document.createElement('p');
  if (!p.querySelector('a[href]')) {
    out.textContent = cleanText(p.textContent);
    return out;
  }
  appendInline(document, p, out);
  out.normalize();
  if (out.firstChild && out.firstChild.nodeType === 3) out.firstChild.textContent = out.firstChild.textContent.trimStart();
  if (out.lastChild && out.lastChild.nodeType === 3) out.lastChild.textContent = out.lastChild.textContent.trimEnd();
  return out;
}

function panelContent(document, panel) {
  const out = [];
  const captionEl = panel.querySelector('.cmp-card__imageContainer--copyrights');
  const caption = captionEl ? cleanText(captionEl.textContent) : '';
  const imgEl = [...panel.querySelectorAll('img')].find((i) => usableSrc(i));
  if (imgEl) {
    const img = document.createElement('img');
    img.src = usableSrc(imgEl);
    img.alt = cleanText(imgEl.getAttribute('alt')) || caption;
    out.push(img);
  }
  if (caption) {
    const p = document.createElement('p');
    p.textContent = caption;
    out.push(p);
  }
  const body = panel.querySelector('.cmp-card__contentContainer') || panel;
  body.querySelectorAll('h1, h2, h3, h4, h5, h6, p, ul, ol').forEach((n) => {
    if (n.closest('.cmp-card__imageContainer') || n.parentElement.closest('ul, ol, p')) return;
    if (!cleanText(n.textContent)) return;
    if (n.tagName === 'P') {
      out.push(paragraph(document, n));
    } else if (/^H\d$/.test(n.tagName)) {
      const h = document.createElement('h3');
      h.textContent = cleanText(n.textContent);
      out.push(h);
    } else {
      out.push(n.cloneNode(true));
    }
  });
  panel.querySelectorAll('a.cmp-button-v2[href]').forEach((a) => {
    const label = cleanText(a.textContent);
    if (!label) return;
    const p = document.createElement('p');
    const link = document.createElement('a');
    link.href = a.getAttribute('href');
    link.textContent = label;
    p.append(link);
    out.push(p);
  });
  return out;
}

export default function parse(element, { document }) {
  const panels = [...element.querySelectorAll('[role="tabpanel"]')];
  const used = new Set();
  const items = [];
  [...element.querySelectorAll('[role="tab"]')].forEach((tab, i) => {
    const title = cleanText(tab.textContent);
    const panelId = tab.getAttribute('aria-controls');
    const panel = (panelId && panels.find((p) => p.id === panelId)) || panels[i] || null;
    if (!title || !panel || used.has(panel)) return;
    used.add(panel);
    let id = slug(title) || `tab-${i + 1}`;
    while (items.some((it) => it.id === id)) id = `${id}-${i + 1}`;
    items.push({ id, title, content: panelContent(document, panel) });
  });

  if (!items.length) {
    element.remove();
    return;
  }

  const out = [WebImporter.Blocks.createBlock(document, { name: 'Tabs', cells: [['']] })];
  items.forEach((item) => {
    out.push(document.createElement('hr'));
    out.push(...item.content);
    out.push(WebImporter.Blocks.createBlock(document, {
      name: 'Section Metadata',
      cells: { 'tab-id': item.id, 'tab-title': item.title },
    }));
  });
  element.replaceWith(...out);
}
