const VIDEO_LINK = 'a[href*=".mp4"]';

/**
 * Turns an authored video link in an image row into a muted, looping background
 * video layered over the picture (which stays as the poster and LCP image).
 * The link text is reused as the accessible name of the pause toggle.
 * @param {Element} row The image row containing a picture and a video link
 */
function decorateVideo(row) {
  const link = row.querySelector(VIDEO_LINK);
  const picture = row.querySelector('picture');
  if (!link || !picture) return;

  const label = link.textContent.trim();
  (link.closest('p') || link).remove();

  const video = document.createElement('video');
  video.className = 'hero-video';
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'none';
  video.setAttribute('aria-hidden', 'true');
  const img = picture.querySelector('img');
  if (img) video.poster = img.currentSrc || img.src;
  const source = document.createElement('source');
  source.src = link.href;
  source.type = 'video/mp4';
  video.append(source);
  picture.after(video);

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'hero-video-toggle';
  toggle.setAttribute('aria-label', label);
  toggle.setAttribute('aria-pressed', 'false');
  row.append(toggle);

  const play = () => video.play().catch(() => toggle.setAttribute('aria-pressed', 'true'));
  video.addEventListener('playing', () => {
    row.classList.add('hero-video-playing');
    toggle.setAttribute('aria-pressed', 'false');
  });
  video.addEventListener('pause', () => toggle.setAttribute('aria-pressed', 'true'));
  toggle.addEventListener('click', () => {
    if (video.paused) play();
    else video.pause();
  });

  // respect reduced motion: keep the poster still until the visitor presses play
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    toggle.setAttribute('aria-pressed', 'true');
    return;
  }
  // start after the page (and its LCP poster image) has loaded
  const start = () => {
    video.preload = 'auto';
    play();
  };
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
}

/** @param {Element} block The hero block element */
export default function decorate(block) {
  const pictures = block.querySelectorAll('picture');

  if (pictures.length >= 2) {
    // Dual-image hero: first = light, second = dark
    const lightDiv = pictures[0].closest('.hero > div');
    const darkDiv = pictures[1].closest('.hero > div');
    if (lightDiv) lightDiv.classList.add('hero-img-light');
    if (darkDiv) darkDiv.classList.add('hero-img-dark');

    // In dark mode, move the dark image first so waitForFirstImage
    // eager-loads the visible (LCP) image rather than the hidden one.
    const isDark = document.body.classList.contains('dark-scheme');
    if (isDark && darkDiv && lightDiv) {
      lightDiv.parentElement.insertBefore(darkDiv, lightDiv);
    }
  } else if (pictures.length < 1) {
    block.classList.add('no-image');
  }

  pictures.forEach((picture) => {
    // authored pictures may sit in a paragraph (e.g. next to a video link); unwrap for sizing
    const wrapper = picture.parentElement;
    if (wrapper.tagName === 'P' && wrapper.children.length === 1) wrapper.replaceWith(picture);
    picture.closest('.hero > div')?.classList.add('hero-image');
  });
  block.querySelectorAll(':scope > .hero-image').forEach(decorateVideo);

  const heading = block.querySelector('h1, h2, h3, h4, h5, h6');
  if (!heading) return;

  // A hero without the page title (H1) is a secondary, in-page banner
  if (heading.tagName !== 'H1') block.classList.add('hero-banner');

  // Find the first <p> that appears before the heading in the DOM and mark it as a tagline
  const contentDiv = heading.closest('div');
  if (!contentDiv) return;

  const textDiv = contentDiv.parentElement;
  if (textDiv) textDiv.classList.add('hero-text');

  const children = [...contentDiv.children];
  const headingIndex = children.indexOf(heading);

  for (let i = 0; i < headingIndex; i += 1) {
    if (children[i].tagName === 'P' && !children[i].classList.contains('button-container')) {
      children[i].classList.add('hero-tagline');
      break;
    }
  }
}
