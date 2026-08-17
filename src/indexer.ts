export interface TextIndex {
  /** Searchable text for the indexed subtree, with whitespace runs collapsed. */
  text: string;
  /** For each character of `text`, the source Text node and the offset within it. */
  map: { node: Text; offset: number }[];
}

export interface IndexOptions {
  /** Return false to exclude a text node from indexing. */
  filter?: ((node: Text) => boolean) | undefined;
}

const SKIPPED_PARENTS = /^(SCRIPT|STYLE|NOSCRIPT)$/;

export function buildIndex(root: Node, options: IndexOptions = {}): TextIndex {
  const { filter } = options;
  const text: string[] = [];
  const map: TextIndex['map'] = [];
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
      if (/\s/.test(char)) {
        pendingSpace ??= { node: node as Text, offset: i };
        continue;
      }
      if (pendingSpace) {
        if (text.length > 0) {
          text.push(' ');
          map.push(pendingSpace);
        }
        pendingSpace = null;
      }
      text.push(char);
      map.push({ node: node as Text, offset: i });
    }
  }
  return { text: text.join(''), map };
}
