import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { Highbeam } from '../../src/index';

let root: HTMLElement;

beforeEach(() => {
  root = document.createElement('div');
  document.body.appendChild(root);
});

afterEach(() => {
  root.remove();
  CSS.highlights.clear();
});

describe('diacritics in a real browser', () => {
  test('an unaccented query paints the accented source text', () => {
    root.innerHTML = '<p>un café au lait</p>';
    const beam = new Highbeam(root, { name: 'd' });
    expect(beam.mark('cafe')).toBe(1);
    const [range] = CSS.highlights.get('d')!;
    // the range covers the source characters, accent included
    expect((range as Range).toString()).toBe('café');
  });

  test('folding spans element boundaries like any other match', () => {
    root.innerHTML = '<p>un ca<b>fé</b> au lait</p>';
    const beam = new Highbeam(root, { name: 'd' });
    expect(beam.mark('cafe')).toBe(1);
    const [range] = CSS.highlights.get('d')!;
    expect((range as Range).toString()).toBe('café');
  });

  test('diacritics: false matches only what was authored', () => {
    root.innerHTML = '<p>café and cafe</p>';
    const beam = new Highbeam(root, { name: 'd', diacritics: false });
    expect(beam.mark('cafe')).toBe(1);
    const [range] = CSS.highlights.get('d')!;
    expect((range as Range).toString()).toBe('cafe');
  });
});
