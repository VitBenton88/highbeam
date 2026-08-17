export interface TextRun {
  /** Source text node for this run. */
  node: Text;
  /** Position in `text` where the run starts. */
  textStart: number;
  /** Offset within `node` where the run starts. */
  nodeStart: number;
  /** Number of characters the run covers. */
  length: number;
}

export interface TextIndex {
  /** Searchable text for the indexed subtree, with whitespace runs collapsed. */
  text: string;
  /**
   * Maps `text` back to the DOM as contiguous spans — one entry per run of
   * consecutive characters from one node, not one per character. Resolve a
   * position with `positionAt`.
   */
  runs: TextRun[];
}

export interface IndexOptions {
  /** Return false to exclude a text node from indexing. */
  filter?: ((node: Text) => boolean) | undefined;
}

const SKIPPED_PARENTS = /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|TITLE)$/;

/**
 * Soft hyphens and zero-width characters render invisibly, so they are
 * dropped from the searchable text (and from string queries) to keep
 * visually plain words matchable.
 */
export const INVISIBLE_CHARS = /[\u00AD\u200B-\u200D\uFEFF]/;

export function buildIndex(root: Node, options: IndexOptions = {}): TextIndex {
  const { filter } = options;
  let text = '';
  const runs: TextRun[] = [];
  let open: TextRun | null = null;

  /** Append one character, extending the open run when the source is contiguous. */
  const emit = (char: string, node: Text, offset: number): void => {
    if (open && open.node === node && open.nodeStart + open.length === offset) {
      open.length += 1;
    } else {
      open = { node, textStart: text.length, nodeStart: offset, length: 1 };
      runs.push(open);
    }
    text += char;
  };

  const doc = root.ownerDocument ?? (root as Document);
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      if (parent && SKIPPED_PARENTS.test(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (filter && !filter(node as Text)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let pendingSpace: { node: Text; offset: number } | null = null;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const data = (node as Text).data;
    for (let i = 0; i < data.length; i++) {
      const char = data[i]!;
      if (INVISIBLE_CHARS.test(char)) continue;
      if (/\s/.test(char)) {
        pendingSpace ??= { node: node as Text, offset: i };
        continue;
      }
      if (pendingSpace) {
        if (text.length > 0) emit(' ', pendingSpace.node, pendingSpace.offset);
        pendingSpace = null;
      }
      emit(char, node as Text, i);
    }
  }
  return { text, runs };
}

/** Resolve a position in `index.text` to its source node and offset. */
export function positionAt(index: TextIndex, position: number): { node: Text; offset: number } {
  const { runs } = index;
  let low = 0;
  let high = runs.length - 1;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (runs[mid]!.textStart <= position) low = mid;
    else high = mid - 1;
  }
  const run = runs[low]!;
  return { node: run.node, offset: run.nodeStart + (position - run.textStart) };
}
