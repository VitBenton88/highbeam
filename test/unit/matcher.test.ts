import { describe, expect, test } from 'vitest';
import { buildIndex } from '../../src/indexer';
import { findMatches } from '../../src/matcher';

function container(html: string): HTMLElement {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el;
}

describe('findMatches', () => {
  test('finds every occurrence of a string within a single text node', () => {
    const root = container('<p>the cat and the hat</p>');
    const text = root.firstChild!.firstChild as Text;
    const matches = findMatches(buildIndex(root), 'the');
    expect(matches).toEqual([
      { start: { node: text, offset: 0 }, end: { node: text, offset: 3 } },
      { start: { node: text, offset: 12 }, end: { node: text, offset: 15 } },
    ]);
  });

  test('matches case-insensitively by default', () => {
    const root = container('<p>Hello HELLO hello</p>');
    const matches = findMatches(buildIndex(root), 'hello');
    expect(matches).toHaveLength(3);
  });

  test('honors the caseSensitive option', () => {
    const root = container('<p>Hello HELLO hello</p>');
    const matches = findMatches(buildIndex(root), 'hello', { caseSensitive: true });
    expect(matches).toHaveLength(1);
  });

  test('returns precise node offsets for a match spanning element boundaries', () => {
    const root = container('<p>a <b>wor</b>d here</p>');
    const bold = root.querySelector('b')!.firstChild as Text;
    const tail = root.querySelector('b')!.nextSibling as Text;
    const matches = findMatches(buildIndex(root), 'word');
    expect(matches).toEqual([{ start: { node: bold, offset: 0 }, end: { node: tail, offset: 1 } }]);
  });

  test('matches a single-spaced query against whitespace-mangled DOM text', () => {
    const root = container('<p>hello\n      <em>world</em></p>');
    const matches = findMatches(buildIndex(root), 'hello world');
    expect(matches).toHaveLength(1);
  });

  test('normalizes whitespace runs inside the query itself', () => {
    const root = container('<p>hello world</p>');
    const matches = findMatches(buildIndex(root), 'hello \n  world');
    expect(matches).toHaveLength(1);
  });

  test('finds occurrences of every term in an array, ordered by position', () => {
    const root = container('<p>red fish blue fish</p>');
    const matches = findMatches(buildIndex(root), ['blue', 'red']);
    const text = root.firstChild!.firstChild as Text;
    expect(matches).toEqual([
      { start: { node: text, offset: 0 }, end: { node: text, offset: 3 } },
      { start: { node: text, offset: 9 }, end: { node: text, offset: 13 } },
    ]);
  });

  test('ignores empty queries and empty terms', () => {
    const root = container('<p>anything</p>');
    expect(findMatches(buildIndex(root), '')).toEqual([]);
    expect(findMatches(buildIndex(root), ['', 'thing'])).toHaveLength(1);
  });

  test('supports RegExp queries', () => {
    const root = container('<p>color and colour</p>');
    const matches = findMatches(buildIndex(root), /colou?r/g);
    expect(matches).toHaveLength(2);
  });

  test('applies a non-global RegExp to every occurrence', () => {
    const root = container('<p>ha ha ha</p>');
    const matches = findMatches(buildIndex(root), /ha/);
    expect(matches).toHaveLength(3);
  });

  test('skips zero-length RegExp matches instead of looping forever', () => {
    const root = container('<p>abc</p>');
    const matches = findMatches(buildIndex(root), /x*/g);
    expect(matches).toEqual([]);
  });
});
