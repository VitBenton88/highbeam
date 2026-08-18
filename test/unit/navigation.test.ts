import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Highbeam } from '../../src/highbeam';

class FakeHighlight {
  ranges = new Set<Range>();
  priority = 0;
  add(range: Range) {
    this.ranges.add(range);
  }
  delete(range: Range) {
    this.ranges.delete(range);
  }
  clear() {
    this.ranges.clear();
  }
  get size() {
    return this.ranges.size;
  }
}

let registry: Map<string, FakeHighlight>;
let root: HTMLElement;
let scrollSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  registry = new Map();
  vi.stubGlobal('Highlight', FakeHighlight);
  vi.stubGlobal('CSS', { highlights: registry });
  scrollSpy = vi.fn();
  Element.prototype.scrollIntoView = scrollSpy as unknown as Element['scrollIntoView'];
  root = document.createElement('div');
  root.innerHTML = '<p>fox one</p><p>fox two</p><p>fox three</p>';
  document.body.appendChild(root);
});

afterEach(() => {
  root.remove();
  vi.unstubAllGlobals();
});

describe('match navigation', () => {
  test('count reflects the matches and current starts unset', () => {
    const beam = new Highbeam(root);
    expect(beam.count).toBe(0);
    expect(beam.current).toBe(-1);
    beam.mark('fox');
    expect(beam.count).toBe(3);
    expect(beam.current).toBe(-1);
  });

  test('next() walks forward and wraps at the end', () => {
    const beam = new Highbeam(root);
    beam.mark('fox');
    expect(beam.next()).toBe(0);
    expect(beam.next()).toBe(1);
    expect(beam.next()).toBe(2);
    expect(beam.next()).toBe(0);
    expect(beam.current).toBe(0);
  });

  test('previous() walks backward and wraps at the start', () => {
    const beam = new Highbeam(root);
    beam.mark('fox');
    expect(beam.previous()).toBe(2);
    expect(beam.previous()).toBe(1);
  });

  test('goTo() jumps to an index and wraps out-of-range values', () => {
    const beam = new Highbeam(root);
    beam.mark('fox');
    expect(beam.goTo(1)).toBe(1);
    expect(beam.goTo(4)).toBe(1);
    expect(beam.goTo(-1)).toBe(2);
  });

  test('navigation is a no-op when there are no matches', () => {
    const beam = new Highbeam(root);
    beam.mark('nothing here');
    expect(beam.next()).toBe(-1);
    expect(beam.current).toBe(-1);
    expect(scrollSpy).not.toHaveBeenCalled();
  });

  test('the active match gets its own higher-priority group', () => {
    const beam = new Highbeam(root, { name: 'search' });
    beam.mark('fox');
    beam.next();
    const current = registry.get('search-current')!;
    expect(current.size).toBe(1);
    expect(current.priority).toBeGreaterThan(0);
    // the active range stays in the main group too
    expect(registry.get('search')!.size).toBe(3);
    const [active] = current.ranges;
    expect(active!.toString()).toBe('fox');
  });

  test('moving on replaces the active range rather than accumulating', () => {
    const beam = new Highbeam(root);
    beam.mark('fox');
    beam.next();
    beam.next();
    expect(registry.get('highbeam-current')!.size).toBe(1);
  });

  test('re-marking resets the active match', () => {
    const beam = new Highbeam(root);
    beam.mark('fox');
    beam.next();
    beam.mark('one');
    expect(beam.current).toBe(-1);
    expect(registry.get('highbeam-current')!.size).toBe(0);
  });

  test('scrolls the containing element into view by default', () => {
    const beam = new Highbeam(root);
    beam.mark('fox');
    beam.next();
    expect(scrollSpy).toHaveBeenCalledTimes(1);
    expect(scrollSpy.mock.calls[0]![0]).toMatchObject({ block: 'center' });
  });

  test('scroll: false moves the active match without scrolling', () => {
    const beam = new Highbeam(root, { scroll: false });
    beam.mark('fox');
    expect(beam.next()).toBe(0);
    expect(scrollSpy).not.toHaveBeenCalled();
  });

  test('clear() and destroy() drop the active group too', () => {
    const beam = new Highbeam(root, { name: 'g' });
    beam.mark('fox');
    beam.next();
    beam.clear();
    expect(beam.current).toBe(-1);
    expect(registry.get('g-current')!.size).toBe(0);
    beam.mark('fox');
    beam.next();
    beam.destroy();
    expect(registry.has('g-current')).toBe(false);
    expect(registry.has('g')).toBe(false);
  });
});
