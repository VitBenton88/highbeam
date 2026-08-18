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
   * Fold accented letters so 'cafe' matches 'café', on both the page and the
   * query. Defaults to true. RegExp queries run against the folded text.
   */
  diacritics?: boolean;
  /**
   * Watch the root with a MutationObserver and automatically re-run the last
   * mark() when the DOM under it changes. Safe from feedback loops because
   * highbeam never mutates the DOM. Defaults to false.
   */
  live?: boolean;
  /**
   * Also index open shadow roots beneath the root. Matches never span a
   * shadow boundary (a Range cannot), and closed shadow roots are
   * unreachable. Defaults to false.
   */
  shadow?: boolean;
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
    const roots = this.#collectRoots();
    if (this.#options.live) this.#observe(roots);
    let highlight = CSS.highlights.get(this.name);
    if (!highlight) {
      highlight = new Highlight();
      CSS.highlights.set(this.name, highlight);
    }
    for (const range of this.#ranges) highlight.delete(range);
    const ranges: Range[] = [];
    for (const root of roots) {
      const index = buildIndex(root, {
        filter: this.#options.filter,
        diacritics: this.#options.diacritics,
      });
      const matches = findMatches(index, query, {
        caseSensitive: this.#options.caseSensitive,
        diacritics: this.#options.diacritics,
      });
      const doc = root.ownerDocument ?? (root as Document);
      for (const match of matches) {
        const range = doc.createRange();
        range.setStart(match.start.node, match.start.offset);
        range.setEnd(match.end.node, match.end.offset);
        highlight.add(range);
        ranges.push(range);
      }
    }
    this.#ranges = ranges;
    return ranges.length;
  }

  /**
   * The root, plus every open shadow root beneath it when `shadow` is on.
   * Each tree is indexed separately, so no match can straddle a boundary.
   */
  #collectRoots(): HighbeamRoot[] {
    const roots: HighbeamRoot[] = [this.#root!];
    if (!this.#options.shadow) return roots;
    const doc = this.#root!.ownerDocument ?? (this.#root as Document);
    for (let i = 0; i < roots.length; i++) {
      const walker = doc.createTreeWalker(roots[i]!, NodeFilter.SHOW_ELEMENT);
      for (let el = walker.nextNode(); el; el = walker.nextNode()) {
        const shadow = (el as Element).shadowRoot;
        if (shadow) roots.push(shadow);
      }
    }
    return roots;
  }

  /** One observer watches every tree; re-observing a target is a no-op. */
  #observe(roots: HighbeamRoot[]): void {
    this.#observer ??= new MutationObserver(() => this.#schedule());
    for (const root of roots) {
      this.#observer.observe(root as Node, {
        subtree: true,
        childList: true,
        characterData: true,
      });
    }
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
