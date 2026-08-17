# Changelog

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
