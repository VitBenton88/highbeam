import { describe, expect, test } from 'vitest';
import { buildIndex, positionAt } from '../../src/indexer';

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

  test('positionAt maps a text position back to its source node and offset', () => {
    const root = container('<p><b>ab</b>cd</p>');
    const index = buildIndex(root);
    const b = root.querySelector('b')!.firstChild as Text;
    const cd = b.parentNode!.nextSibling as Text;
    expect(positionAt(index, 1)).toEqual({ node: b, offset: 1 });
    expect(positionAt(index, 2)).toEqual({ node: cd, offset: 0 });
  });

  test('positionAt resolves the first and last characters', () => {
    const root = container('<p>ab</p><p>cd</p>');
    const index = buildIndex(root);
    const first = root.firstChild!.firstChild as Text;
    const second = root.lastChild!.firstChild as Text;
    expect(positionAt(index, 0)).toEqual({ node: first, offset: 0 });
    expect(positionAt(index, index.text.length - 1)).toEqual({ node: second, offset: 1 });
  });

  test('stores contiguous characters from one node as a single run', () => {
    const root = container('<p>Hello world</p>');
    const index = buildIndex(root);
    expect(index.text).toBe('Hello world');
    expect(index.runs).toHaveLength(1);
    expect(index.runs[0]).toMatchObject({ textStart: 0, nodeStart: 0, length: 11 });
  });

  test('starts a new run at each node boundary', () => {
    const root = container('<p><b>ab</b>cd</p>');
    expect(buildIndex(root).runs).toHaveLength(2);
  });

  test('starts a new run where source characters were skipped', () => {
    // the collapsed whitespace run leaves a gap in node offsets
    const root = container('<p>hello\n\t   world</p>');
    const index = buildIndex(root);
    expect(index.text).toBe('hello world');
    expect(index.runs).toHaveLength(2);
    expect(index.runs[1]).toMatchObject({ textStart: 6, nodeStart: 10, length: 5 });
  });

  test('positionAt resolves correctly across many runs', () => {
    const root = container(Array.from({ length: 50 }, (_, i) => `<p>row${i}x</p>`).join(''));
    const index = buildIndex(root);
    for (const i of [0, 7, 23, 49]) {
      const marker = `row${i}x`;
      const position = positionAt(index, index.text.indexOf(marker));
      expect(position.node.data).toBe(marker);
      expect(position.offset).toBe(0);
    }
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

  test('skips soft hyphens so visually plain words stay searchable', () => {
    const root = container('<p>sign­posts ahead</p>');
    const index = buildIndex(root);
    expect(index.text).toBe('signposts ahead');
  });

  test('skips zero-width characters', () => {
    const root = container('<p>zero​width‌‍join﻿er</p>');
    const index = buildIndex(root);
    expect(index.text).toBe('zerowidthjoiner');
  });

  test('skips text inside textarea and title elements', () => {
    const root = container('<p>visible</p>');
    const textarea = document.createElement('textarea');
    textarea.textContent = 'typed draft';
    const title = document.createElement('title');
    title.textContent = 'page title';
    root.append(textarea, title);
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
