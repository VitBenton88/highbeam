# highbeam

**Highlight anything on the page — without touching the DOM.**

**[Live demo →](https://vitbenton88.github.io/highbeam/)** — search the page,
then watch React wipe mark.js's highlights while highbeam's survive.

A ~1 kB, dependency-free, framework-agnostic text marker built on the
[CSS Custom Highlight API](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API).
It finds your matches — strings, arrays of terms, or regexes, even when they span
element boundaries — and paints them with real browser highlights. No `<span>`
injection. No framework fights. Styled with plain CSS.

```bash
npm install highbeam
```

```ts
import { Highbeam } from 'highbeam';

const beam = new Highbeam(document.body, { name: 'search' });
beam.mark('beam of light'); // → number of matches
```

```css
::highlight(search) {
  background-color: #fff067;
  color: #16130e;
}
```

## Why not mark.js?

Span-injection libraries (mark.js, react-highlight-words) rewrite your DOM to
highlight it. That mutates nodes your framework believes it owns: on the next
React/Vue render, highlights are silently wiped on changed rows, text can end up
mangled or duplicated, and the extra elements break CSS selectors like
`p > text`, `:first-child`, and exact-match snapshots.

highbeam never writes to the DOM. It reads text, builds `Range` objects, and
registers them with `CSS.highlights` — the browser paints them the way it paints
find-in-page results.

|                                 | highbeam                  | mark.js                    |
| ------------------------------- | ------------------------- | -------------------------- |
| DOM mutation                    | none                      | wraps matches in spans     |
| Safe under React/Vue re-renders | yes (re-mark, 1 line)     | highlights wiped/mangled   |
| Matches across element bounds   | yes                       | partial (`acrossElements`) |
| Whitespace-tolerant matching    | yes (collapses runs)      | limited                    |
| Styling                         | plain CSS `::highlight()` | inline styles / classes    |
| Size (min + brotli)             | ~0.9 kB                   | ~9 kB                      |
| Maintained                      | yes                       | last release 2018          |

## API

### `new Highbeam(root?, options?)`

- `root` — the element (or document) to search under. Defaults to `document`.
- `options.name` — highlight group name, styled via `::highlight(<name>)`.
  Defaults to `'highbeam'`. Instances with different names paint independently.
- `options.caseSensitive` — exact-case string matching. Defaults to `false`.
  Ignored for RegExp queries (the regex's own flags decide).
- `options.filter` — `(node: Text) => boolean`; return `false` to exclude a
  text node. `<script>`, `<style>`, and `<noscript>` content is always excluded.

### `beam.mark(query): number`

Highlights every match under the root and returns the match count. Each call
replaces the instance's previous marks.

- `beam.mark('needle')` — case-insensitive by default. Whitespace runs in both
  the query and the page collapse, so `'hello world'` matches text split across
  lines, indentation, and inline tags like `hel<b>lo wor</b>ld`.
- `beam.mark(['foo', 'bar'])` — every occurrence of every term.
- `beam.mark(/colou?r/gi)` — regex over the page's collapsed text.

### `beam.clear()`

Removes this instance's highlights (the group stays registered).

### `beam.destroy()`

Removes highlights and unregisters the group from `CSS.highlights`.

### `isSupported(): boolean`

`true` when the browser implements the CSS Custom Highlight API. When it
doesn't, `mark()` quietly does nothing and returns `0` — highlighting degrades
progressively and your page keeps working.

## Using with frameworks

Frameworks replace text nodes when state changes, which collapses any live
ranges. The fix is one line: re-mark after render. Since highbeam never mutates
the DOM, the framework never fights back.

**React**

```tsx
const ref = useRef<HTMLElement>(null);

useEffect(() => {
  const b = new Highbeam(ref.current!, { name: 'search' });
  b.mark(query);
  return () => b.destroy();
}, [query, items]); // re-mark whenever the rendered content changes
```

**Vue**

```ts
watchPostEffect(() => {
  beam.mark(query.value); // runs after the DOM updates
});
```

**Vanilla**

```ts
input.addEventListener('input', () => beam.mark(input.value));
```

## Styling notes

`::highlight()` pseudo-elements accept a deliberate subset of CSS:
`color`, `background-color`, `text-decoration` (and its longhands),
`text-shadow`, and `-webkit-text-stroke`. Layout-affecting properties don't
apply — highlights can never cause reflow, which is part of why they're fast.

```css
::highlight(search) {
  background-color: gold;
}
::highlight(errors) {
  text-decoration: red wavy underline; /* spell-check squiggles */
}
```

## Browser support

| Chrome / Edge | Safari       | Firefox     |
| ------------- | ------------ | ----------- |
| 105+ (2022)   | 17.2+ (2023) | 140+ (2025) |

Older browsers: `isSupported()` returns `false` and `mark()` is a no-op.

## Notes & roadmap

- Marks are a snapshot: if the DOM under the root changes, call `mark()` again
  (see framework recipes above). A `MutationObserver`-based live mode is planned.
- Planned: diacritics-insensitive matching, scroll-to-match helpers.

## License

MIT © Vit Benton
