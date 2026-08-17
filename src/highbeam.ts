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

export type HighbeamRoot = Element | Document | DocumentFragment;

export class Highbeam {
  readonly name: string;
  #root: HighbeamRoot | undefined;
  #options: HighbeamOptions;
  /**
   * Same-named instances share one registered Highlight; each instance only
   * ever adds and removes its own ranges from it.
   */
  #ranges: Range[] = [];

  constructor(root?: HighbeamRoot, options: HighbeamOptions = {}) {
    if (root === null) {
      throw new TypeError(
        'highbeam: root is null — pass an element (is your ref set yet?) or omit the argument',
      );
    }
    this.#root = root ?? globalThis.document?.body ?? globalThis.document;
    this.#options = options;
    this.name = options.name ?? 'highbeam';
  }

  /**
   * Highlight every match of `query` under the root, replacing this
   * instance's previous marks. Returns the number of matches.
   */
  mark(query: Query): number {
    if (!isSupported() || !this.#root) return 0;
    const index = buildIndex(this.#root, { filter: this.#options.filter });
    const matches = findMatches(index, query, { caseSensitive: this.#options.caseSensitive });
    const doc = this.#root.ownerDocument ?? (this.#root as Document);
    let highlight = CSS.highlights.get(this.name);
    if (!highlight) {
      highlight = new Highlight();
      CSS.highlights.set(this.name, highlight);
    }
    for (const range of this.#ranges) highlight.delete(range);
    this.#ranges = matches.map((match) => {
      const range = doc.createRange();
      range.setStart(match.start.node, match.start.offset);
      range.setEnd(match.end.node, match.end.offset);
      highlight.add(range);
      return range;
    });
    return matches.length;
  }

  /** Remove this instance's highlights. The group stays registered. */
  clear(): void {
    if (!isSupported()) return;
    const highlight = CSS.highlights.get(this.name);
    if (highlight) {
      for (const range of this.#ranges) highlight.delete(range);
    }
    this.#ranges = [];
  }

  /**
   * Remove this instance's highlights, and unregister the group once no
   * other instance's ranges remain in it.
   */
  destroy(): void {
    if (!isSupported()) return;
    this.clear();
    const highlight = CSS.highlights.get(this.name);
    if (highlight && highlight.size === 0) {
      CSS.highlights.delete(this.name);
    }
  }
}
