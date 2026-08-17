import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Highbeam } from '../../src/highbeam';

class FakeHighlight {
  ranges: Set<Range>;
  constructor(...ranges: Range[]) {
    this.ranges = new Set(ranges);
  }
  add(range: Range) {
    this.ranges.add(range);
  }
  clear() {
    this.ranges.clear();
  }
  get size() {
    return this.ranges.size;
  }
}

let registry: Map<string, FakeHighlight>;

beforeEach(() => {
  registry = new Map();
  vi.stubGlobal('Highlight', FakeHighlight);
  vi.stubGlobal('CSS', { highlights: registry });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function container(html: string): HTMLElement {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el;
}

describe('Highbeam', () => {
  test('mark() returns 0 and registers nothing when the API is unsupported', () => {
    vi.unstubAllGlobals();
    const beam = new Highbeam(container('<p>hello</p>'));
    expect(beam.mark('hello')).toBe(0);
    expect(() => beam.clear()).not.toThrow();
    expect(() => beam.destroy()).not.toThrow();
  });

  test('mark() registers a highlight group holding one range per match', () => {
    const beam = new Highbeam(container('<p>the cat and the hat</p>'), { name: 'search' });
    const count = beam.mark('the');
    expect(count).toBe(2);
    const group = registry.get('search')!;
    expect(group).toBeInstanceOf(FakeHighlight);
    expect(group.size).toBe(2);
    const [first] = group.ranges;
    expect(first!.toString()).toBe('the');
  });

  test('mark() replaces the previous marks of the same instance', () => {
    const beam = new Highbeam(container('<p>aaa bbb</p>'));
    beam.mark('aaa');
    const count = beam.mark('bbb');
    expect(count).toBe(1);
    const group = registry.get('highbeam')!;
    expect(group.size).toBe(1);
    const [only] = group.ranges;
    expect(only!.toString()).toBe('bbb');
  });

  test('clear() empties the group but keeps it registered', () => {
    const beam = new Highbeam(container('<p>hello</p>'));
    beam.mark('hello');
    beam.clear();
    expect(registry.get('highbeam')!.size).toBe(0);
    expect(registry.has('highbeam')).toBe(true);
  });

  test('destroy() unregisters the group', () => {
    const beam = new Highbeam(container('<p>hello</p>'));
    beam.mark('hello');
    beam.destroy();
    expect(registry.has('highbeam')).toBe(false);
  });

  test('destroy() leaves the group alone when another instance took over the name', () => {
    const first = new Highbeam(container('<p>one</p>'), { name: 'shared' });
    const second = new Highbeam(container('<p>two</p>'), { name: 'shared' });
    first.mark('one');
    second.mark('two');
    first.destroy();
    expect(registry.get('shared')!.size).toBe(1);
  });

  test('independent instances register independent groups', () => {
    const root = container('<p>alpha beta</p>');
    new Highbeam(root, { name: 'a' }).mark('alpha');
    new Highbeam(root, { name: 'b' }).mark('beta');
    expect(registry.get('a')!.size).toBe(1);
    expect(registry.get('b')!.size).toBe(1);
  });

  test('passes caseSensitive and filter options through to matching', () => {
    const root = container('<p>Word word</p><p class="skip">word</p>');
    const beam = new Highbeam(root, {
      caseSensitive: true,
      filter: (node) => !(node.parentElement?.classList.contains('skip') ?? false),
    });
    expect(beam.mark('word')).toBe(1);
  });
});
