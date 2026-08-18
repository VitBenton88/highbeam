import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { Highbeam } from '../../src/index';

let root: HTMLElement;

beforeEach(() => {
  root = document.createElement('div');
  root.innerHTML = Array.from(
    { length: 40 },
    (_, i) => `<p style="height:120px">row ${i} ${i % 10 === 0 ? 'fox' : 'filler'}</p>`,
  ).join('');
  document.body.appendChild(root);
  window.scrollTo(0, 0);
});

afterEach(() => {
  root.remove();
  CSS.highlights.clear();
  window.scrollTo(0, 0);
});

const inViewport = (range: Range) => {
  const rect = range.getBoundingClientRect();
  return rect.top >= 0 && rect.bottom <= window.innerHeight;
};

describe('navigation in a real browser', () => {
  test('next() scrolls the active match into view', () => {
    const beam = new Highbeam(root, { name: 'nav', scroll: { block: 'center' } });
    expect(beam.mark('fox')).toBe(4);

    beam.next(); // first match is already near the top
    beam.next(); // second is well below the fold
    expect(window.scrollY).toBeGreaterThan(0);

    const [active] = CSS.highlights.get('nav-current')!;
    expect(inViewport(active as Range)).toBe(true);
  });

  test('the active match is painted by its own group, on top of the main one', () => {
    const beam = new Highbeam(root, { name: 'nav' });
    beam.mark('fox');
    beam.goTo(2);
    const main = CSS.highlights.get('nav')!;
    const current = CSS.highlights.get('nav-current')!;
    expect(main.size).toBe(4);
    expect(current.size).toBe(1);
    expect(current.priority).toBeGreaterThan(main.priority);
    const [active] = current;
    expect((active as Range).toString()).toBe('fox');
  });

  test('scroll: false leaves the viewport alone', () => {
    const beam = new Highbeam(root, { name: 'nav', scroll: false });
    beam.mark('fox');
    beam.goTo(3);
    expect(window.scrollY).toBe(0);
    expect(CSS.highlights.get('nav-current')!.size).toBe(1);
  });
});
