import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { Highbeam } from '../../src/index';

let root: HTMLElement;

beforeEach(() => {
  root = document.createElement('div');
  root.innerHTML = '<p>a fox in the road</p>';
  document.body.appendChild(root);
});

afterEach(() => {
  root.remove();
  CSS.highlights.clear();
});

function flushLive(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

describe('live mode in a real browser', () => {
  test('editing text updates the painted ranges automatically', async () => {
    const beam = new Highbeam(root, { live: true, name: 'live' });
    expect(beam.mark('fox')).toBe(1);
    root.querySelector('p')!.textContent = 'a fox chasing a fox';
    await flushLive();
    const group = CSS.highlights.get('live')!;
    expect(group.size).toBe(2);
    for (const range of group) {
      expect((range as Range).toString()).toBe('fox');
    }
  });

  test('streamed-in nodes get highlighted without any user code', async () => {
    const beam = new Highbeam(root, { live: true, name: 'live' });
    beam.mark('fox');
    const late = document.createElement('p');
    late.textContent = 'late-arriving fox';
    root.appendChild(late);
    await flushLive();
    expect(CSS.highlights.get('live')!.size).toBe(2);
  });

  test('destroy() stops observing and unregisters', async () => {
    const beam = new Highbeam(root, { live: true, name: 'live' });
    beam.mark('fox');
    beam.destroy();
    root.querySelector('p')!.textContent = 'fox fox fox';
    await flushLive();
    expect(CSS.highlights.has('live')).toBe(false);
  });
});
