/* eslint-disable */

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

/**
 * princess.com fetches deal prices only for carousel slides that come into view.
 * Before transforming, bring each visible deal carousel on screen, step through
 * its slides and wait until the loaded prices stop changing.
 */
export default async function loadLivePrices(document) {
  const win = document.defaultView;
  const priced = () => document.querySelectorAll('#main-content .dynamic-pricing .pricing-main').length;
  const carousels = [...document.querySelectorAll('#main-content .grid-container.cmp-grid-container--carousel')]
    .filter((g) => g.offsetParent !== null);
  for (const carousel of carousels) {
    carousel.scrollIntoView({ block: 'center' });
    await sleep(1500);
    const next = [...carousel.querySelectorAll('.cmp-grid-container--carousel__controls button')].pop();
    const slides = carousel.querySelectorAll('.dynamic-pricing, .teaser').length;
    for (let i = 0; next && i < Math.min(slides, 12); i += 1) {
      next.click();
      await sleep(400);
    }
  }
  // settle: stop once the priced count is stable for 3s (max ~15s)
  let last = -1;
  for (let i = 0; i < 15; i += 1) {
    const now = priced();
    if (now === last && i >= 3) break;
    last = now;
    await sleep(1000);
  }
  win.scrollTo(0, 0);
}
