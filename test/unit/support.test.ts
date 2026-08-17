import { afterEach, describe, expect, test, vi } from 'vitest';
import { isSupported } from '../../src/support';

describe('isSupported', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('is false when the CSS Custom Highlight API is missing (jsdom default)', () => {
    expect(isSupported()).toBe(false);
  });

  test('is true when Highlight and CSS.highlights exist', () => {
    vi.stubGlobal('Highlight', class {});
    vi.stubGlobal('CSS', { highlights: new Map() });
    expect(isSupported()).toBe(true);
  });
});
