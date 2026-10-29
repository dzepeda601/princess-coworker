import { createTag } from '../../scripts/shared.js';
import { extendSchema } from '../../scripts/schema.js';

const FAQ_INDEX_PATH = '/faq-index.json';

async function fetchFaqs() {
  const resp = await fetch(FAQ_INDEX_PATH);
  if (!resp.ok) return [];
  const json = await resp.json();
  return json?.data || [];
}

function toggleItem(button) {
  const expanded = button.getAttribute('aria-expanded') === 'true';
  button.setAttribute('aria-expanded', String(!expanded));
  const panel = button.nextElementSibling;
  panel.hidden = expanded;
}

function buildFaqItem(faq) {
  const item = createTag('div', { class: 'faq-item' });

  const button = createTag('button', {
    class: 'faq-question',
    'aria-expanded': 'false',
    type: 'button',
  }, faq.question);

  const panel = createTag('div', {
    class: 'faq-answer',
    role: 'region',
    hidden: true,
  });
  if (faq.answerNodes) panel.append(...faq.answerNodes);
  else panel.append(createTag('p', {}, faq.answer));

  button.addEventListener('click', () => toggleItem(button));

  item.append(button, panel);
  return item;
}

function buildCategoryGroup(category, faqs) {
  const group = createTag('div', { class: 'faq-category' });
  group.append(createTag('h3', { class: 'faq-category-heading' }, category));
  faqs.forEach((faq) => group.append(buildFaqItem(faq)));
  return group;
}

/**
 * Rows with two cells are authored question | answer pairs (answers keep their
 * rich content, e.g. links); one-cell rows are category filters for /faq-index.json.
 * @param {Element} block FAQ block
 */
export default async function decorate(block) {
  const rows = [...block.children];
  const authored = rows
    .filter((row) => row.children.length >= 2 && row.children[0].textContent.trim())
    .map((row) => {
      const [q, a] = row.children;
      return {
        question: q.textContent.trim(),
        answer: a.textContent.trim(),
        answerNodes: [...a.childNodes],
      };
    });
  const categories = rows
    .filter((row) => row.children.length < 2)
    .map((row) => row.textContent.trim())
    .filter(Boolean);

  block.textContent = '';

  let filtered = authored;
  const grouped = {};
  if (authored.length) {
    authored.forEach((faq) => block.append(buildFaqItem(faq)));
  }

  if (!authored.length || categories.length) {
    const allFaqs = await fetchFaqs();
    const indexed = categories.length
      ? allFaqs.filter((faq) => categories.includes(faq.category))
      : allFaqs;
    if (!indexed.length && !authored.length) {
      block.append(createTag('p', { class: 'faq-empty' }, allFaqs.length ? 'No FAQs found for the selected categories.' : 'No FAQs available.'));
      return;
    }
    indexed.forEach((faq) => {
      if (!grouped[faq.category]) grouped[faq.category] = [];
      grouped[faq.category].push(faq);
    });
    Object.keys(grouped).forEach((category) => {
      block.append(buildCategoryGroup(category, grouped[category]));
    });
    filtered = [...authored, ...indexed];
  }

  extendSchema('WebPage', {
    '@type': 'FAQPage',
    mainEntity: filtered.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  });
}
