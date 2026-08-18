import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Highbeam } from '../../src/highbeam';

class FakeHighlight {
  ranges = new Set<Range>();
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

beforeEach(() => {
  registry = new Map();
  vi.stubGlobal('Highlight', FakeHighlight);
  vi.stubGlobal('CSS', { highlights: registry });
  root = document.createElement('div');
  document.body.appendChild(root);
});

afterEach(() => {
  root.remove();
  vi.unstubAllGlobals();
});

function host(parent: ParentNode, html: string, mode: ShadowRootMode = 'open'): ShadowRoot {
  const el = document.createElement('div');
  parent.append(el);
  const shadow = el.attachShadow({ mode });
  shadow.innerHTML = html;
  return shadow;
}

function flushLive(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

describe('shadow DOM', () => {
  test('ignores shadow content unless the option is set', () => {
    root.innerHTML = '<p>fox in the light</p>';
    host(root, '<p>fox in the shadow</p>');
    expect(new Highbeam(root).mark('fox')).toBe(1);
  });

  test('indexes open shadow roots when enabled', () => {
    root.innerHTML = '<p>fox in the light</p>';
    host(root, '<p>fox in the shadow</p>');
    expect(new Highbeam(root, { shadow: true }).mark('fox')).toBe(2);
  });

  test('indexes shadow roots nested inside shadow roots', () => {
    const outer = host(root, '<p>fox one</p>');
    host(outer, '<p>fox two</p>');
    expect(new Highbeam(root, { shadow: true }).mark('fox')).toBe(2);
  });

  test('skips closed shadow roots', () => {
    root.innerHTML = '<p>fox visible</p>';
    host(root, '<p>fox hidden</p>', 'closed');
    expect(new Highbeam(root, { shadow: true }).mark('fox')).toBe(1);
  });

  test('never builds a range that spans a shadow boundary', () => {
    root.innerHTML = '<p>hello</p>';
    host(root, '<p>world</p>');
    const beam = new Highbeam(root, { shadow: true });
    expect(beam.mark('hello world')).toBe(0);
    beam.mark('hello');
    for (const range of registry.get('highbeam')!.ranges) {
      expect(range.startContainer.getRootNode()).toBe(range.endContainer.getRootNode());
    }
  });

  test('live mode re-marks when shadow content changes', async () => {
    const shadow = host(root, '<p>one fox</p>');
    const beam = new Highbeam(root, { shadow: true, live: true });
    expect(beam.mark('fox')).toBe(1);
    shadow.querySelector('p')!.textContent = 'fox and fox';
    await flushLive();
    expect(registry.get('highbeam')!.size).toBe(2);
  });

  test('live mode picks up a shadow root attached after the first mark', async () => {
    root.innerHTML = '<p>fox</p>';
    const beam = new Highbeam(root, { shadow: true, live: true });
    expect(beam.mark('fox')).toBe(1);
    host(root, '<p>a later fox</p>');
    await flushLive();
    expect(registry.get('highbeam')!.size).toBe(2);
  });
});
