import type { TextIndex } from './indexer';

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
  return spans.map(([start, end]) => toRange(index, start, end));
}

function toRegExps(query: Query, options: MatchOptions): RegExp[] {
  if (query instanceof RegExp) {
    const flags = query.flags.includes('g') ? query.flags : query.flags + 'g';
    return [new RegExp(query.source, flags)];
  }
  const terms = Array.isArray(query) ? query : [query];
  const flags = options.caseSensitive ? 'g' : 'gi';
  return terms
    .map((term) => term.replace(/\s+/g, ' '))
    .filter((term) => term.length > 0 && term !== ' ')
    .map((term) => new RegExp(escapeRegExp(term), flags));
}

function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toRange(index: TextIndex, start: number, end: number): MatchRange {
  const first = index.map[start]!;
  const last = index.map[end - 1]!;
  return {
    start: { node: first.node, offset: first.offset },
    end: { node: last.node, offset: last.offset + 1 },
  };
}
