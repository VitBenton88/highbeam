import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { Highbeam } from '../../src/index';

let root: HTMLElement;

beforeEach(() => {
  root = document.createElement('div');
  root.innerHTML = '<p>a fox in the light</p>';
  document.body.appendChild(root);
});

afterEach(() => {
  root.remove();
  CSS.highlights.clear();
});

function attach(parent: ParentNode, html: string): ShadowRoot {
  const el = document.createElement('div');
  parent.append(el);
  const shadow = el.attachShadow({ mode: 'open' });
  shadow.innerHTML = html;
  return shadow;
}

describe('shadow DOM in a real browser', () => {
  test('registers real ranges that live inside the shadow tree', () => {
    const shadow = attach(root, '<p>a fox in the shadow</p>');
    const beam = new Highbeam(root, { shadow: true, name: 'sd' });
    expect(beam.mark('fox')).toBe(2);

    const group = CSS.highlights.get('sd')!;
    expect(group.size).toBe(2);
    const roots = [...group].map((r) => (r as Range).startContainer.getRootNode());
    expect(roots).toContain(document);
    expect(roots).toContain(shadow);
    for (const range of group) {
      expect((range as Range).toString()).toBe('fox');
      // a Range silently collapses if its boundaries are in different trees
      expect((range as Range).collapsed).toBe(false);
    }
  });

  test('live mode follows changes inside a shadow root', async () => {
    const shadow = attach(root, '<p>one fox</p>');
    const beam = new Highbeam(root, { shadow: true, live: true, name: 'sd' });
    expect(beam.mark('fox')).toBe(2);
    shadow.querySelector('p')!.textContent = 'fox fox fox';
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    expect(CSS.highlights.get('sd')!.size).toBe(4); // 1 light + 3 shadow
  });
});
