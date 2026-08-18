# Changelog

## Unreleased (0.5.0)

- **Match navigation.** `next()`, `previous()` and `goTo(index)` activate a
  match, scroll it into view, and return its index; `count` and `current`
  report where you are. Stepping past either end wraps, and stepping back
  from nothing lands on the last match, like find-in-page.
  - The active match joins a second, higher-priority highlight group
    (`` `${name}-current` `` by default), so one CSS rule tints every match
    and another makes the current one stand out. Verified in Chromium that
    `Highlight.priority` arbitrates overlapping groups and that a single
    `Range` can belong to both.
  - Scrolling moves the containing element with
    `scrollIntoView({ block: 'center' })` — respecting nested scroll
    containers and `scroll-margin` — then nudges the page when the match is
    still off screen inside a tall block. `scroll: false` disables it. The
    usual approach of inserting a marker element to scroll to would mutate the
    DOM, which the library exists not to do, so it measures the range instead.
- **Diacritics folding**, on by default. `'cafe'` matches `café` and `'café'`
  matches `cafe` — the page text and the query are folded through the same
  per-code-unit function, so the two can't disagree. Pass
  `diacritics: false` to match exactly what was authored.
  - Folding is 1:1 by design: `é→e`, `ñ→n`, and combining marks in decomposed
    text are dropped. Letters needing an _expansion_ (`ß→ss`, `æ→ae`) are left
    alone, because a run maps text positions onto node offsets one for one.
  - A decomposition is only folded when everything after the base is a
    combining mark. That guard is what keeps Hangul syllables from folding to
    their initial jamo — `한` stays `한`, and CJK and Cyrillic are untouched.
  - No lookup table: folding rides on `normalize('NFD')` and Unicode property
    escapes, cached per code unit, with everything below U+00C0 short-circuited
    so ASCII text barely notices (measured 4.3 → 4.6 ms on a 333,000-character
    page).
  - **RegExp queries are not folded** — they run against the folded text, so
    write `/cafe/` rather than `/café/`. Documented in Limitations.
- Bundle is now ~2.1 kB brotli / ~2.4 kB gzip; budget and size claims updated.
  Indexing speed is unchanged (4.6 ms on a 333,000-character page).

## 0.4.1 — 2026-08-18

Docs and tests only — no library code changed.

- **Corrected a false limitation.** The README claimed exact-indentation
  queries can't match inside `<pre>`. They can, and always could: the index
  and string queries collapse whitespace identically, so they agree even
  though the index diverges from the rendered text. Verified in Chromium —
  `'    return 1;'`, a phrase spanning a newline, and a multi-space query in a
  `white-space: pre-wrap` block all match.
- The real caveat is now documented in its place: **RegExp** queries run
  against the collapsed text, so `/\n/` and `/\s{4}/` can't match whitespace
  that was collapsed away.
- Tests lock all of the above, including the regex caveat, so the claim can't
  drift again.
- `white-space`-aware indexing is dropped from the roadmap: it would fix only
  the narrow regex case, at the cost of a `getComputedStyle` per text-bearing
  element (measured ~1.2 ms per index on a 5,000-element page) and a change to
  string-matching semantics.

## 0.4.0 — 2026-08-18

- **Shadow DOM support.** `new Highbeam(root, { shadow: true })` indexes the
  root plus every open shadow root beneath it, nested ones included, so text
  inside web components can be highlighted. Opt-in — default behavior is
  unchanged, and nobody pays for the extra element walk unless they ask for it.
  - One document-level `::highlight()` rule still styles everything: highlight
    pseudo-elements inherit across shadow boundaries (verified in Chromium
    before building the feature).
  - Each tree is indexed separately, because a `Range` whose ends are in
    different trees silently collapses to nothing. Matches therefore never
    span a shadow boundary, and closed shadow roots stay unreachable — both
    documented rather than left to be discovered.
  - Live mode observes every shadow root too, and picks up roots attached
    later on the next re-mark.
- Bundle is now ~1.6 kB brotli / ~1.8 kB gzip; budget and size claims updated
  to measured values.

## 0.3.1 — 2026-08-17

### Performance

- **Code-unit scanning.** Indexing used to pull each character out as a
  one-character string and test it against two regexes. It now classifies by
  `charCodeAt` and copies whole spans with `slice`, so scanning allocates
  nothing per character. On the same 333,000-character document:

  |                       | 0.2.1   | 0.3.0   | 0.3.1       |
  | --------------------- | ------- | ------- | ----------- |
  | time per `mark()`     | 14.8 ms | 11.2 ms | **4.3 ms**  |
  | heap churn / 20 marks | 45.8 MB | 25.1 MB | **19.9 MB** |

  A full re-index of a large page now fits comfortably inside one animation
  frame, which is what live mode needs.

- The whitespace and invisible-character classifiers are numeric predicates
  covering exactly the code points their regexes matched; a test asserts that
  equivalence across every code point up to U+3100 so the two can't drift.
- Bundle grew ~150 B (now ~1.5 kB brotli / ~1.6 kB gzip) — size claims and the
  budget updated to measured values.

## 0.3.0 — 2026-08-17

### Performance

- **Run-length index.** The text index used to keep one `{node, offset}`
  record per character; it now keeps one per _run_ of consecutive characters
  from the same text node, resolved by binary search. A page has thousands of
  characters per text node, so the table shrinks by orders of magnitude.
  Measured on a 333,000-character document: `mark()` went from **14.8 ms to
  11.2 ms**, and heap churn across 20 marks from **45.8 MB to 25.1 MB**. This
  matters most in live mode, which re-indexes on DOM changes rather than once.
- Bundle grew ~120 B (now ~1.3 kB brotli / ~1.5 kB gzip); the size budget and
  every size claim in the README and demo were updated to measured values.

### Types

- `TextIndex.map` is replaced by `TextIndex.runs`, with a new exported
  `TextRun` type. The functions that produce and consume an index remain
  internal, so no runtime API changed.

## 0.2.1 — 2026-08-17

Docs and demo only — no library code changed since 0.2.0.

- Demo: a live-mode showcase where messages stream into a log and stay
  highlighted automatically, with a retargetable query and pause control.
- README: documents that live re-marking defers while a tab is in the
  background (animation frames are paused there) and repaints before the
  first visible frame.

## 0.2.0 — 2026-08-17

- **Live mode**: `new Highbeam(root, { live: true })` re-runs the last
  `mark()` automatically whenever the DOM under the root changes, via a
  `MutationObserver`. Mutation bursts coalesce into one re-scan per animation
  frame, applied before paint. `clear()` pauses observing; `mark()` re-arms;
  `destroy()` disconnects. Loop-proof by construction — highbeam never mutates
  the DOM, so it can never trigger itself.

## 0.1.2 — 2026-08-17

No library changes. First release published automatically via npm trusted
publishing (GitHub Actions OIDC) — releases now carry provenance attestations.

## 0.1.1 — 2026-08-17

Fixes from a three-way expert review (library internals, React integration,
demo accessibility). No breaking API changes.

### Library

- **Fixed: same-named instances silently orphaning each other's highlights.**
  Instances sharing a `name` now share one registered `Highlight` and each
  manages only its own ranges — multiple components can safely use the same
  group name (and one `::highlight()` rule styles them all). Previously, a
  second instance overwrote the registry entry and the first kept painting
  into an unregistered object: correct return values, nothing on screen.
- **Fixed: `new Highbeam(null)` silently highlighting the whole page.** An
  explicit `null` root (e.g. an unset React ref with `!`) now throws a
  `TypeError` instead of falling back to `document`. The default root is now
  `document.body` (was `document`, which also indexed `<head>`/`<title>`).
- **Fixed: soft hyphens and zero-width characters breaking search.**
  `U+00AD`, `U+200B`–`U+200D`, and `U+FEFF` are now dropped from both indexed
  text and string queries, so visually plain words match their on-screen form.
- Fixed: duplicate terms in an array query producing duplicate ranges and
  inflated counts.
- `<textarea>` and `<title>` content is now excluded from matching (replaced
  form controls never paint `::highlight()`, so matches there were invisible).
- `root` parameter type narrowed to `Element | Document | DocumentFragment`
  (text/comment nodes were silently unwalkable).

### Docs

- React recipe rewritten: `useLayoutEffect` (paints before the frame, no
  stale-highlight flash), explicit ref guard, shared-name guidance,
  Suspense/streaming and portal caveats.
- New Limitations section: shadow DOM, `<pre>` whitespace, Unicode
  normalization, sticky regexes.
- Size figures corrected to measured values (~1 kB brotli / ~1.2 kB gzip),
  with the CI size budget tightened to match.

### Demo

- Unsupported browsers now see an explanatory banner instead of a comparison
  panel that reported "0 matches painted" as success.
- Accessibility: copy button announces success/failure via a live region,
  match-count announcements debounced, focus indicators and link underlines
  raised from 1.9:1 to 5:1 contrast.
- Fixed the match count including phantom hits inside its own status line.
- The tagline sweep now waits for webfonts (no mid-animation reflow), the
  clipboard call has a failure fallback, and the comparison runs under React
  `StrictMode`.

## 0.1.0 — 2026-08-17

Initial release.
