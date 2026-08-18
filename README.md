# highbeam

**Highlight anything on the page — without touching the DOM.**

**[Live demo →](https://vitbenton88.github.io/highbeam/)** — search the page,
then watch React wipe mark.js's highlights while highbeam's survive.

A tiny (~2.1 kB brotli / ~2.4 kB gzip), dependency-free, framework-agnostic
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
| Size (min + brotli)             | ~2.1 kB                   | ~9 kB                      |
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
- `options.shadow` — also index open shadow roots beneath the root. Defaults
  to `false`. See [Shadow DOM](#shadow-dom).
- `options.diacritics` — fold accented letters so `'cafe'` matches `café`.
  Defaults to `true`. See [Diacritics](#diacritics).
- `options.currentName` — group name for the active match. Defaults to
  `` `${name}-current` ``. See [Navigating matches](#navigating-matches).
- `options.scroll` — `ScrollIntoViewOptions` used when activating a match, or
  `false` to never scroll. Defaults to `{ block: 'center' }`.

### `beam.mark(query): number`

Highlights every match under the root and returns the match count. Each call
replaces the instance's previous marks.

- `beam.mark('needle')` — case-insensitive by default. Whitespace runs in both
  the query and the page collapse, so `'hello world'` matches text split across
  lines, indentation, and inline tags like `hel<b>lo wor</b>ld`.
- `beam.mark(['foo', 'bar'])` — every occurrence of every term.
- `beam.mark(/colou?r/gi)` — regex over the page's collapsed text.

### `beam.next()` · `beam.previous()` · `beam.goTo(index)`

Activate a match, scroll it into view, and return its index (`-1` when there
are no matches). See [Navigating matches](#navigating-matches).

### `beam.count` · `beam.current`

The number of matches from the last `mark()`, and the active match's index
(`-1` when none is active).

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

## Navigating matches

```ts
const beam = new Highbeam(article, { name: 'search' });
beam.mark('fox'); // → 5

next.onclick = () => beam.next(); // wraps at the end
prev.onclick = () => beam.previous(); // wraps at the start
label.textContent = `${beam.current + 1} of ${beam.count}`;
```

```css
::highlight(search) {
  background-color: #fff067;
}
::highlight(search-current) {
  background-color: #ff9ad5;
} /* the active one */
```

The active match joins a second highlight group — `` `${name}-current` `` by
default — which carries a higher priority, so it paints over the main group.
That's the find-in-page pattern: every match tinted, the current one
standing out.

Activating a match scrolls it into view. highbeam scrolls the _containing
element_ with `scrollIntoView({ block: 'center' })`, which respects nested
scroll containers and `scroll-margin`, then nudges the page if the match
itself is still off screen inside a very tall block. Pass
`scroll: { behavior: 'smooth' }` to customize, or `scroll: false` to move the
active match without touching the viewport.

The usual trick for scrolling to a text range — inserting a marker element —
would mutate the DOM, so highbeam measures the range instead.

## Diacritics

```ts
beam.mark('cafe'); // matches café, and 'café' matches cafe
```

Accented letters are folded to their base form on both sides — the page text
and your query — so searches work regardless of which form the user types.
Pass `diacritics: false` to match exactly what was authored.

Folding is deliberately 1:1: `é→e`, `ñ→n`, `ç→c`, and combining marks in
decomposed text are dropped. Letters that would need to _expand_ are left
alone — `ß` does not match `ss`, `æ` does not match `ae` — because a matched
range maps text positions onto DOM offsets one for one, and an expansion
would break that. Scripts whose decomposition isn't a base plus marks are
untouched too, so Hangul syllables stay whole rather than folding to jamo.

Two things worth knowing: **RegExp queries aren't folded** (they run against
the folded text, so write `/cafe/`, not `/café/`), and with decomposed text a
trailing combining mark can fall just outside the painted range.

## Shadow DOM

```ts
const beam = new Highbeam(appEl, { shadow: true });
beam.mark('fox'); // finds matches inside open shadow roots too
```

Web components keep their text behind a shadow root, where an ordinary tree
walk can't reach. With `shadow: true`, highbeam indexes the root plus every
open shadow root beneath it, nested ones included.

Styling stays simple: highlight pseudo-elements inherit across shadow
boundaries, so one document-level `::highlight(name)` rule paints matches
inside components too — no need to inject styles into each root.

Two limits come from the platform rather than from highbeam:

- **Matches never span a shadow boundary.** A `Range` with ends in different
  trees silently collapses to nothing, so each tree is indexed on its own.
  Text that looks continuous across a component boundary won't match as one
  phrase.
- **Closed shadow roots stay unreachable.** `element.shadowRoot` is `null` for
  them by design; nothing outside the component can read that text.

With `live: true`, every shadow root is observed as well, and roots attached
later are picked up on the next re-mark.

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
- **Shadow DOM is opt-in.** Pass `shadow: true` to reach open shadow roots;
  closed ones are unreachable and matches can't span a boundary (see
  [Shadow DOM](#shadow-dom)).
- **RegExp queries run against whitespace-collapsed text.** `/\n/` or
  `/\s{4}/` won't find whitespace the index collapsed away. String queries are
  unaffected: they're normalized the same way the index is, so `'a b'` matches
  `a    b` and text split across lines — inside `<pre>` too.
- **Diacritic folding is 1:1 only.** `ß`/`æ`/`œ` are not expanded to `ss`/`ae`/`oe`
  (see [Diacritics](#diacritics)), and RegExp queries run against the folded
  text.
- **Form controls don't paint.** `<textarea>`/`<input>` values can't show CSS
  highlights, so their content is excluded from matching.
- **Sticky (`y`) regexes** get a `g` flag added and behave surprisingly —
  don't use them here.

## Roadmap

Nothing planned — open an issue if something's missing.

## License

MIT © Vit Benton
