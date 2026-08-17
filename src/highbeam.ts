import { buildIndex } from './indexer';
import { findMatches, type Query } from './matcher';
import { isSupported } from './support';

export interface HighbeamOptions {
  /** Highlight group name, styled in CSS via ::highlight(<name>). Defaults to 'highbeam'. */
  name?: string;
  /** Match strings exactly by case. Defaults to false. Ignored for RegExp queries. */
  caseSensitive?: boolean;
  /** Return false to exclude a text node from matching. */
  filter?: (node: Text) => boolean;
}

export class Highbeam {
  readonly name: string;
  #root: Node;
  #options: HighbeamOptions;
  #highlight: Highlight | null = null;

  constructor(root?: Node, options: HighbeamOptions = {}) {
    this.#root = root ?? globalThis.document;
    this.#options = options;
    this.name = options.name ?? 'highbeam';
  }

  /**
   * Highlight every match of `query` under the root, replacing this
   * instance's previous marks. Returns the number of matches.
   */
  mark(query: Query): number {
    if (!isSupported()) return 0;
    const index = buildIndex(this.#root, { filter: this.#options.filter });
    const matches = findMatches(index, query, { caseSensitive: this.#options.caseSensitive });
    const doc = this.#root.ownerDocument ?? (this.#root as Document);
    if (!this.#highlight) {
      this.#highlight = new Highlight();
      CSS.highlights.set(this.name, this.#highlight);
    }
    this.#highlight.clear();
    for (const match of matches) {
      const range = doc.createRange();
      range.setStart(match.start.node, match.start.offset);
      range.setEnd(match.end.node, match.end.offset);
      this.#highlight.add(range);
    }
    return matches.length;
  }

  /** Remove this instance's highlights. The group stays registered. */
  clear(): void {
    this.#highlight?.clear();
  }

  /** Remove highlights and unregister the group from CSS.highlights. */
  destroy(): void {
    if (!this.#highlight) return;
    this.#highlight.clear();
    if (CSS.highlights.get(this.name) === this.#highlight) {
      CSS.highlights.delete(this.name);
    }
    this.#highlight = null;
  }
}
