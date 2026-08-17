import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { Highbeam, isSupported } from '../../src/index';

let root: HTMLElement;

beforeEach(() => {
  root = document.createElement('div');
  root.innerHTML = '<p>The quick <b>bro</b>wn fox jumps over the lazy dog</p>';
  document.body.appendChild(root);
});

afterEach(() => {
  root.remove();
  CSS.highlights.clear();
});

describe('highbeam in a real browser', () => {
  test('the CSS Custom Highlight API is supported', () => {
    expect(isSupported()).toBe(true);
  });

  test('mark() registers real ranges in CSS.highlights', () => {
    const beam = new Highbeam(root, { name: 'search' });
    const count = beam.mark('quick');
    expect(count).toBe(1);
    const group = CSS.highlights.get('search');
    expect(group).toBeInstanceOf(Highlight);
    expect(group!.size).toBe(1);
    const [range] = group!;
    expect((range as Range).toString()).toBe('quick');
  });

  test('marks matches spanning element boundaries without touching the DOM', () => {
    const before = root.innerHTML;
    const beam = new Highbeam(root);
    const count = beam.mark('brown fox');
    expect(count).toBe(1);
    expect(root.innerHTML).toBe(before);
    const [range] = CSS.highlights.get('highbeam')!;
    expect((range as Range).toString()).toBe('brown fox');
  });

  test('remark replaces ranges and destroy unregisters the group', () => {
    const beam = new Highbeam(root, { name: 'g' });
    beam.mark('the');
    expect(CSS.highlights.get('g')!.size).toBe(2);
    beam.mark('fox');
    expect(CSS.highlights.get('g')!.size).toBe(1);
    beam.destroy();
    expect(CSS.highlights.has('g')).toBe(false);
  });

  test('multiple named groups coexist', () => {
    new Highbeam(root, { name: 'one' }).mark('quick');
    new Highbeam(root, { name: 'two' }).mark(/lazy|dog/);
    expect(CSS.highlights.get('one')!.size).toBe(1);
    expect(CSS.highlights.get('two')!.size).toBe(2);
  });
});
