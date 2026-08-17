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
  /**
   * Watch the root with a MutationObserver and automatically re-run the last
   * mark() when the DOM under it changes. Safe from feedback loops because
   * highbeam never mutates the DOM. Defaults to false.
   */
  live?: boolean;
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
  #observer: MutationObserver | null = null;
  #lastQuery: Query | null = null;
  #rafId: number | null = null;

  constructor(root?: HighbeamRoot, options: HighbeamOptions = {}) {
    if (root === null) {
      throw new TypeError('highbeam: root is null — is your ref set yet?');
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
    this.#lastQuery = query;
    if (this.#options.live) this.#observe();
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

  #observe(): void {
    if (this.#observer) return;
    this.#observer = new MutationObserver(() => this.#schedule());
    this.#observer.observe(this.#root as Node, {
      subtree: true,
      childList: true,
      characterData: true,
    });
  }

  /**
   * Coalesce mutation bursts into one re-mark per animation frame; rAF runs
   * before paint, so the corrected highlights land in the same frame.
   */
  #schedule(): void {
    if (this.#rafId !== null) return;
    this.#rafId = requestAnimationFrame(() => {
      this.#rafId = null;
      if (this.#lastQuery !== null) this.mark(this.#lastQuery);
    });
  }

  #disconnect(): void {
    this.#observer?.disconnect();
    this.#observer = null;
    if (this.#rafId !== null) {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = null;
    }
    this.#lastQuery = null;
  }

  /**
   * Remove this instance's highlights and stop live observing (the next
   * mark() re-arms it). The group stays registered.
   */
  clear(): void {
    this.#disconnect();
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
