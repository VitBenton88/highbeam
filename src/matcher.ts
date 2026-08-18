import { FOLD_SKIP, INVISIBLE_CHARS, foldCode, positionAt, type TextIndex } from './indexer';

export interface MatchPoint {
  node: Text;
  offset: number;
}

export interface MatchRange {
  start: MatchPoint;
  /** Exclusive end position. */
  end: MatchPoint;
}

export type Query = string | string[] | RegExp;

export interface MatchOptions {
  /** Match strings exactly by case. Defaults to false. Ignored for RegExp queries. */
  caseSensitive?: boolean | undefined;
  /**
   * Fold accented letters in the query, matching how the index was built.
   * Defaults to true. RegExp queries are never folded — they run against the
   * folded text as written.
   */
  diacritics?: boolean | undefined;
}

export function findMatches(
  index: TextIndex,
  query: Query,
  options: MatchOptions = {},
): MatchRange[] {
  const spans: [number, number][] = [];
  for (const re of toRegExps(query, options)) {
    for (const found of index.text.matchAll(re)) {
      if (found[0].length === 0) continue;
      spans.push([found.index, found.index + found[0].length]);
    }
  }
  spans.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const unique = spans.filter(
    (span, i) => i === 0 || span[0] !== spans[i - 1]![0] || span[1] !== spans[i - 1]![1],
  );
  return unique.map(([start, end]) => toRange(index, start, end));
}

function toRegExps(query: Query, options: MatchOptions): RegExp[] {
  if (query instanceof RegExp) {
    const flags = query.flags.includes('g') ? query.flags : query.flags + 'g';
    return [new RegExp(query.source, flags)];
  }
  const terms = Array.isArray(query) ? query : [query];
  const flags = options.caseSensitive ? 'g' : 'gi';
  const fold = options.diacritics !== false;
  return terms
    .map((term) => (fold ? foldTerm(term) : term))
    .map((term) => term.replace(new RegExp(INVISIBLE_CHARS, 'g'), '').replace(/\s+/g, ' '))
    .filter((term) => term.length > 0 && term !== ' ')
    .map((term) => new RegExp(escapeRegExp(term), flags));
}

/** Fold a query the same way the index was folded, code unit by code unit. */
function foldTerm(term: string): string {
  let out = '';
  for (let i = 0; i < term.length; i++) {
    const folded = foldCode(term.charCodeAt(i));
    if (folded !== FOLD_SKIP) out += String.fromCharCode(folded);
  }
  return out;
}

function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toRange(index: TextIndex, start: number, end: number): MatchRange {
  const last = positionAt(index, end - 1);
  return {
    start: positionAt(index, start),
    end: { node: last.node, offset: last.offset + 1 },
  };
}
