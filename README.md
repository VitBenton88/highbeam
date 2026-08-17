# highbeam

**Highlight anything on the page — without touching the DOM.**

**[Live demo →](https://vitbenton88.github.io/highbeam/)** — search the page,
then watch React wipe mark.js's highlights while highbeam's survive.

A tiny (~1.3 kB brotli / ~1.5 kB gzip), dependency-free, framework-agnostic
text marker built on the
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
| Size (min + brotli)             | ~1.3 kB                   | ~9 kB                      |
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
- `options.live` — watch the root with a `MutationObserver` and re-run the
  last `mark()` automatically whenever the DOM under it changes. Defaults to
  `false`. See [Live mode](#live-mode).

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

## Live mode

```ts
const beam = new Highbeam(chatEl, { live: true });
beam.mark('fox'); // every fox that ever appears in chatEl stays painted
```

With `live: true`, highlighting stops being a snapshot: chat messages,
streamed rows, and re-rendered lists get painted as they appear, with no
framework wiring. Mutations are coalesced into one re-scan per animation
frame, applied before paint — no stale-highlight flicker. `clear()` pauses
observing; the next `mark()` re-arms it; `destroy()` disconnects.

This is a feature only a zero-mutation highlighter can ship: watching the DOM
is loop-proof precisely because highbeam never writes to it. A span-injection
library observing the page would trigger itself.

In background tabs the browser pauses animation frames, so live re-marking
defers until the tab is visible again — mutations keep being collected, no
work is wasted on a page nobody can see, and the repaint lands before the
first visible frame.

## Using with frameworks

The simplest option is `live: true` — construct once, mark once, and let the
observer follow your framework's re-renders, Suspense boundaries, and streamed
content automatically.

If you'd rather control re-marking explicitly (or want zero observer
overhead), re-mark after render. Since highbeam never mutates the DOM, the
framework never fights back.

**React**

```tsx
const ref = useRef<HTMLElement>(null);

// useLayoutEffect, not useEffect: it runs before paint, so the user never
// sees a frame where new text carries stale highlight ranges.
useLayoutEffect(() => {
  if (!ref.current) return; // not rendered yet — nothing to mark
  const beam = new Highbeam(ref.current, { name: 'search' });
  beam.mark(query);
  return () => beam.destroy();
}, [query, items]); // re-mark whenever the rendered content changes
```

Instances are safe to share a `name`: each manages only its own ranges inside
the group, so two `<SearchableList>`s on one page can both use `'search'` and
one plain `::highlight(search)` rule styles them all.

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

Two React caveats worth knowing: with the manual recipe, content revealed by
an independently resolving `<Suspense>`/streaming boundary won't re-trigger an
ancestor's effect — use `live: true` for streamed content, which observes the
DOM itself and needs no effect at all. And content rendered through a portal
lives outside the ref'd subtree in the real DOM, so a ref-scoped instance
won't see it — give the portal its own instance.

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

## Limitations

Known edges, stated plainly so you don't discover them in production:

- **Without `live: true`, marks are a snapshot.** If the DOM under the root
  changes, call `mark()` again (see the framework recipes) — or turn on live
  mode.
- **Shadow DOM isn't traversed.** Text inside a web component's shadow root is
  invisible to a light-DOM-rooted instance; create an instance per shadow root
  if you need it.
- **`<pre>` whitespace collapses like normal text.** Exact-indentation queries
  inside code blocks won't match yet; a `white-space`-aware mode is planned.
- **No Unicode normalization.** NFC page text won't match an NFD query for the
  same visible characters (rare outside copy-pasted decomposed text).
- **Form controls don't paint.** `<textarea>`/`<input>` values can't show CSS
  highlights, so their content is excluded from matching.
- **Sticky (`y`) regexes** get a `g` flag added and behave surprisingly —
  don't use them here.

## Roadmap

Diacritics-insensitive matching · `white-space`-aware indexing ·
scroll-to-match helpers · incremental re-indexing for very large live roots ·
code-unit scanning to cut the remaining per-character allocation.

## License

MIT © Vit Benton
