import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Highbeam } from '../../src/highbeam';

class FakeHighlight {
  ranges = new Set<Range>();
  addCalls = 0;
  add(range: Range) {
    this.addCalls += 1;
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

beforeEach(() => {
  registry = new Map();
  vi.stubGlobal('Highlight', FakeHighlight);
  vi.stubGlobal('CSS', { highlights: registry });
  root = document.createElement('div');
  root.innerHTML = '<p>fox</p>';
  document.body.appendChild(root);
});

afterEach(() => {
  root.remove();
  vi.unstubAllGlobals();
});

/** Wait for the MutationObserver microtask and the coalescing rAF to run. */
function flushLive(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

describe('live mode', () => {
  test('re-marks when observed text changes', async () => {
    const beam = new Highbeam(root, { live: true });
    expect(beam.mark('fox')).toBe(1);
    root.querySelector('p')!.textContent = 'fox and fox';
    await flushLive();
    expect(registry.get('highbeam')!.size).toBe(2);
  });

  test('picks up nodes added after mark()', async () => {
    const beam = new Highbeam(root, { live: true });
    beam.mark('fox');
    const extra = document.createElement('p');
    extra.textContent = 'another fox';
    root.appendChild(extra);
    await flushLive();
    expect(registry.get('highbeam')!.size).toBe(2);
  });

  test('coalesces a burst of mutations into one re-mark', async () => {
    const beam = new Highbeam(root, { live: true });
    beam.mark('fox');
    const group = registry.get('highbeam')!;
    group.addCalls = 0;
    for (let i = 0; i < 5; i++) {
      const p = document.createElement('p');
      p.textContent = 'fox';
      root.appendChild(p);
    }
    await flushLive();
    // one re-mark adds the 6 current matches once; five separate re-marks
    // would show many more add calls
    expect(group.size).toBe(6);
    expect(group.addCalls).toBe(6);
  });

  test('clear() stops observing until the next mark()', async () => {
    const beam = new Highbeam(root, { live: true });
    beam.mark('fox');
    beam.clear();
    root.querySelector('p')!.textContent = 'fox fox';
    await flushLive();
    expect(registry.get('highbeam')!.size).toBe(0);
    beam.mark('fox'); // re-arms
    root.querySelector('p')!.textContent = 'fox fox fox';
    await flushLive();
    expect(registry.get('highbeam')!.size).toBe(3);
  });

  test('destroy() disconnects for good', async () => {
    const beam = new Highbeam(root, { live: true });
    beam.mark('fox');
    beam.destroy();
    root.querySelector('p')!.textContent = 'fox fox';
    await flushLive();
    expect(registry.has('highbeam')).toBe(false);
  });

  test('non-live instances never observe', async () => {
    const beam = new Highbeam(root);
    beam.mark('fox');
    root.querySelector('p')!.textContent = 'fox and fox';
    await flushLive();
    expect(registry.get('highbeam')!.size).toBe(1);
  });
});
