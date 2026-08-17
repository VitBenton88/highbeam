/**
 * Whether the CSS Custom Highlight API is available. Checked at call time so
 * late-loaded polyfills are honored.
 */
export function isSupported(): boolean {
  return (
    typeof Highlight !== 'undefined' &&
    typeof CSS !== 'undefined' &&
    typeof CSS.highlights !== 'undefined'
  );
}
