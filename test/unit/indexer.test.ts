import { describe, expect, test } from 'vitest';
import { buildIndex } from '../../src/indexer';

function container(html: string): HTMLElement {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el;
}

describe('buildIndex', () => {
  test('indexes the text of a single text node', () => {
    const root = container('<p>Hello world</p>');
    const index = buildIndex(root);
    expect(index.text).toBe('Hello world');
  });

  test('concatenates text across inline element boundaries', () => {
    const root = container('<p>A <b>wor</b>d here</p>');
    const index = buildIndex(root);
    expect(index.text).toBe('A word here');
  });

  test('maps each character back to its source node and offset', () => {
    const root = container('<p><b>ab</b>cd</p>');
    const index = buildIndex(root);
    const b = root.querySelector('b')!.firstChild as Text;
    const cd = b.parentNode!.nextSibling as Text;
    expect(index.map[1]).toEqual({ node: b, offset: 1 });
    expect(index.map[2]).toEqual({ node: cd, offset: 0 });
  });

  test('collapses whitespace runs (newlines, tabs, multiple spaces) to a single space', () => {
    const root = container('<p>hello\n\t   world</p>');
    const index = buildIndex(root);
    expect(index.text).toBe('hello world');
  });

  test('collapses whitespace runs that span node boundaries', () => {
    const root = container('<p>hello </p>\n  <p> world</p>');
    const index = buildIndex(root);
    expect(index.text).toBe('hello world');
  });

  test('drops leading and trailing whitespace of the indexed subtree', () => {
    const root = container('\n  <p>hi</p>\n');
    const index = buildIndex(root);
    expect(index.text).toBe('hi');
  });

  test('skips text inside script, style, and noscript elements', () => {
    const root = container(
      '<p>visible</p><script>var hidden = 1;</script><style>.x{}</style><noscript>off</noscript>',
    );
    const index = buildIndex(root);
    expect(index.text).toBe('visible');
  });

  test('excludes text nodes rejected by a custom filter', () => {
    const root = container('<p>keep</p><p class="skip">drop</p>');
    const index = buildIndex(root, {
      filter: (node) => !(node.parentElement?.classList.contains('skip') ?? false),
    });
    expect(index.text).toBe('keep');
  });
});
