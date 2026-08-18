import { describe, expect, test } from 'vitest';
import { buildIndex } from '../../src/indexer';
import { findMatches } from '../../src/matcher';

function container(html: string): HTMLElement {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el;
}

describe('diacritics folding', () => {
  test('folds accented Latin letters by default', () => {
    const index = buildIndex(container('<p>café naïve Ünter çedilla</p>'));
    expect(index.text).toBe('cafe naive Unter cedilla');
  });

  test('leaves letters that have no decomposition alone', () => {
    // these need expansions (ß→ss, æ→ae), which would break the run invariant
    const index = buildIndex(container('<p>straße æon œuvre ø ð</p>'));
    expect(index.text).toBe('straße æon œuvre ø ð');
  });

  test('leaves Hangul, CJK and Cyrillic untouched', () => {
    const index = buildIndex(container('<p>한글 東京 Жизнь</p>'));
    expect(index.text).toBe('한글 東京 Жизнь');
  });

  test('drops combining marks from decomposed text', () => {
    const index = buildIndex(container('<p>café</p>'));
    expect(index.text).toBe('cafe');
  });

  test('a skipped combining mark breaks the run, like other skipped characters', () => {
    const index = buildIndex(container('<p>caféx</p>'));
    expect(index.text).toBe('cafex');
    expect(index.runs).toHaveLength(2);
    expect(index.runs[1]).toMatchObject({ textStart: 4, nodeStart: 5, length: 1 });
  });

  test('diacritics: false keeps the text exactly as authored', () => {
    const index = buildIndex(container('<p>café</p>'), { diacritics: false });
    expect(index.text).toBe('café');
  });

  test('an unaccented query matches accented text', () => {
    const index = buildIndex(container('<p>un café au lait</p>'));
    expect(findMatches(index, 'cafe')).toHaveLength(1);
  });

  test('an accented query matches unaccented text', () => {
    const index = buildIndex(container('<p>un cafe au lait</p>'));
    expect(findMatches(index, 'café')).toHaveLength(1);
  });

  test('an accented query matches accented text', () => {
    const index = buildIndex(container('<p>un café au lait</p>'));
    expect(findMatches(index, 'café')).toHaveLength(1);
  });

  test('the match maps back to the accented source characters', () => {
    const root = container('<p>café</p>');
    const text = root.firstChild!.firstChild as Text;
    const index = buildIndex(root);
    expect(findMatches(index, 'cafe')).toEqual([
      { start: { node: text, offset: 0 }, end: { node: text, offset: 4 } },
    ]);
  });

  test('folding can be turned off on both sides', () => {
    const index = buildIndex(container('<p>café</p>'), { diacritics: false });
    expect(findMatches(index, 'cafe', { diacritics: false })).toHaveLength(0);
    expect(findMatches(index, 'café', { diacritics: false })).toHaveLength(1);
  });

  test('RegExp queries run against the folded text', () => {
    const index = buildIndex(container('<p>café</p>'));
    expect(findMatches(index, /cafe/)).toHaveLength(1);
    expect(findMatches(index, /café/)).toHaveLength(0);
  });
});
