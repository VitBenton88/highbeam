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

/** Code-unit form of {@link INVISIBLE_CHARS}, for scanning without allocating. */
export function isInvisibleCode(code: number): boolean {
  return code === 0xad || (code >= 0x200b && code <= 0x200d) || code === 0xfeff;
}

/** Matches exactly the characters JavaScript's `\s` matches. */
export function isSpaceCode(code: number): boolean {
  if (code === 0x20 || (code >= 0x09 && code <= 0x0d)) return true;
  if (code < 0xa0) return false;
  return (
    code === 0xa0 ||
    code === 0x1680 ||
    (code >= 0x2000 && code <= 0x200a) ||
    code === 0x2028 ||
    code === 0x2029 ||
    code === 0x202f ||
    code === 0x205f ||
    code === 0x3000 ||
    code === 0xfeff
  );
}

export function buildIndex(root: Node, options: IndexOptions = {}): TextIndex {
  const { filter } = options;
  let text = '';
  const runs: TextRun[] = [];
  let open: TextRun | null = null;

  /** Append a span of source text, extending the open run when contiguous. */
  const emit = (chunk: string, node: Text, offset: number): void => {
    if (open && open.node === node && open.nodeStart + open.length === offset) {
      open.length += chunk.length;
    } else {
      open = { node, textStart: text.length, nodeStart: offset, length: chunk.length };
      runs.push(open);
    }
    text += chunk;
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
  for (let walked = walker.nextNode(); walked; walked = walker.nextNode()) {
    const node = walked as Text;
    const { data } = node;
    const length = data.length;
    // Classify by code unit and copy whole spans, so scanning allocates no
    // per-character strings.
    let chunkStart = -1;
    for (let i = 0; i < length; i++) {
      const code = data.charCodeAt(i);
      const invisible = isInvisibleCode(code);
      const space = !invisible && isSpaceCode(code);
      if (invisible || space) {
        if (chunkStart >= 0) {
          emit(data.slice(chunkStart, i), node, chunkStart);
          chunkStart = -1;
        }
        if (space) pendingSpace ??= { node, offset: i };
        continue;
      }
      if (pendingSpace) {
        if (text.length > 0) emit(' ', pendingSpace.node, pendingSpace.offset);
        pendingSpace = null;
      }
      if (chunkStart < 0) chunkStart = i;
    }
    if (chunkStart >= 0) emit(data.slice(chunkStart, length), node, chunkStart);
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
