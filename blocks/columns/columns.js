/**
 * Groups consecutive button paragraphs in a cell into one row and styles
 * every button after the first as a tertiary (text + arrow) link.
 * @param {Element} col
 */
function decorateButtonGroups(col) {
  const groups = [];
  let current = [];
  [...col.children].forEach((child) => {
    if (child.matches('p.button-container')) {
      current.push(child);
    } else {
      if (current.length > 1) groups.push(current);
      current = [];
    }
  });
  if (current.length > 1) groups.push(current);

  groups.forEach((group) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'columns-buttons';
    group[0].before(wrapper);
    group.forEach((container, i) => {
      if (i > 0) {
        const link = container.querySelector('a.button');
        if (link && !link.classList.contains('primary')) {
          link.classList.remove('secondary');
          link.classList.add('tertiary');
        }
      }
      wrapper.append(container);
    });
  });
}

export default function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-${cols.length}-cols`);

  // setup image columns
  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      const pic = col.querySelector('picture');
      if (pic) {
        const picWrapper = pic.closest('div');
        if (picWrapper && picWrapper.children.length === 1) {
          // picture is only content in column
          picWrapper.classList.add('columns-img-col');
        }
      }

      // several images in one image column: lift them out of the paragraph
      // EDS wraps them in, so they can sit side by side
      if (col.classList.contains('columns-img-col')) {
        const pics = col.querySelectorAll('picture');
        const onlyPics = [...col.children].every((el) => el.matches('picture, p'))
          && [...col.querySelectorAll(':scope > p')].every((p) => !p.textContent.trim());
        if (pics.length > 1 && onlyPics) {
          col.replaceChildren(...pics);
          col.classList.add('columns-img-group');
        }
      }

      // short line of text directly above a heading
      const first = col.firstElementChild;
      if (first?.tagName === 'P' && !first.querySelector('picture, a.button')
        && first.nextElementSibling?.matches('h1, h2, h3, h4, h5, h6')) {
        first.classList.add('columns-eyebrow');
      }

      decorateButtonGroups(col);
    });
  });
}
