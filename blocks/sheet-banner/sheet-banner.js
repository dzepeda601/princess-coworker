/*
 * Sheet Banner block
 * Reads one row from the DA sheet published at /cruise-destinations/app-banners.json
 * and renders it as a hero banner. Same origin as the site, so no CORS is involved.
 *
 * Author usage in DA: a table with the header "Sheet Banner" and one cell containing
 * the row id, for example: alaska-early-booking. Leave the cell empty to use the first row.
 */
 
const SHEET_PATH = '/cruise-destinations/app-banners.json';
 
function safeUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim(), window.location.origin);
    return url.protocol === 'https:' ? url.href : null;
  } catch (e) {
    return null;
  }
}
 
function rowsOf(payload) {
  if (!payload) return [];
  if (Array.isArray(payload.data)) return payload.data;
  const names = Array.isArray(payload[':names']) ? payload[':names'] : [];
  for (let i = 0; i < names.length; i += 1) {
    const sheet = payload[names[i]];
    if (sheet && Array.isArray(sheet.data)) return sheet.data;
  }
  return [];
}
 
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text; // textContent only, never innerHTML
  return node;
}
 
export default async function decorate(block) {
  const wanted = block.textContent.trim().toLowerCase();
  block.textContent = '';
 
  let row;
  try {
    const resp = await fetch(SHEET_PATH);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const rows = rowsOf(await resp.json());
    row = rows.find((r) => r && String(r.id).toLowerCase() === wanted) || rows[0];
  } catch (e) {
    block.append(el('p', 'sheet-banner-error', 'Banner content is unavailable right now.'));
    return;
  }
  if (!row) {
    block.append(el('p', 'sheet-banner-error', 'No banner row found in the sheet.'));
    return;
  }
 
  const media = el('div', 'sheet-banner-media');
  const imageSrc = safeUrl(row.image);
  if (imageSrc) {
    const img = document.createElement('img');
    img.alt = row.imageAlt || '';
    img.loading = 'lazy';
    img.src = imageSrc;
    img.addEventListener('error', () => img.remove());
    media.append(img);
  }
 
  const body = el('div', 'sheet-banner-body');
  body.append(el('p', 'sheet-banner-brand', 'PRINCESS CRUISES'));
  if (row.eyebrow) body.append(el('p', 'sheet-banner-eyebrow', row.eyebrow));
  if (row.title) body.append(el('h2', 'sheet-banner-title', row.title));
  if (row.subtitle) body.append(el('p', 'sheet-banner-subtitle', row.subtitle));
 
  const href = safeUrl(row.ctaUrl);
  if (href && row.ctaLabel) {
    const cta = el('a', 'sheet-banner-cta', row.ctaLabel);
    cta.href = href;
    cta.rel = 'noopener noreferrer';
    body.append(cta);
  }
  if (row.disclaimer) body.append(el('p', 'sheet-banner-disclaimer', row.disclaimer));
 
  block.append(media, body);
}
 
