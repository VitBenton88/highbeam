import { Highbeam, isSupported } from 'highbeam';
import { mountCompare } from './react-compare';

const supported = isSupported();
if (!supported) {
  document.getElementById('unsupported')!.hidden = false;
}

// The wordmark's "beam" is painted by the library itself.
new Highbeam(document.getElementById('beam-mark')!, { name: 'logo' }).mark('beam');

// On load, sweep the tagline phrase like a hand dragging a marker. Wait for
// webfonts so a late swap can't reflow the line mid-sweep.
const phrase = 'without touching the DOM';
const swipe = new Highbeam(document.getElementById('swipe-target')!, { name: 'swipe' });
if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
  swipe.mark(phrase);
} else {
  document.fonts.ready.then(() => {
    let chars = 0;
    const sweep = () => {
      chars += 1;
      swipe.mark(phrase.slice(0, chars));
      if (chars < phrase.length) setTimeout(sweep, 22);
    };
    setTimeout(sweep, 300);
  });
}

// Live page search: the whole page is the demo.
const pageRoot = document.querySelector('.page') as HTMLElement;
const queryInput = document.getElementById('query') as HTMLInputElement;
const regexToggle = document.getElementById('opt-regex') as HTMLInputElement;
const caseToggle = document.getElementById('opt-case') as HTMLInputElement;
const countLine = document.getElementById('count')!;

let pageBeam = makePageBeam();

function makePageBeam(): Highbeam {
  return new Highbeam(pageRoot, {
    name: 'page-search',
    caseSensitive: caseToggle.checked,
    // The count line talks about the search; letting the search match it
    // would count phantom hits that vanish when the line is rewritten.
    filter: (node) => !countLine.contains(node),
  });
}

// Highlights repaint on every keystroke; the role="status" line waits for a
// pause so screen readers aren't flooded mid-word.
let countTimer: ReturnType<typeof setTimeout> | undefined;
function announceCount(text: string): void {
  clearTimeout(countTimer);
  countTimer = setTimeout(() => {
    countLine.textContent = text;
  }, 350);
}

function runSearch(): void {
  const raw = queryInput.value;
  if (raw.trim() === '') {
    pageBeam.clear();
    announceCount(' ');
    return;
  }
  let query: string | RegExp = raw;
  if (regexToggle.checked) {
    try {
      query = new RegExp(raw, caseToggle.checked ? 'g' : 'gi');
    } catch {
      announceCount('invalid regex');
      pageBeam.clear();
      return;
    }
  }
  const count = pageBeam.mark(query);
  announceCount(count === 1 ? '1 match' : `${count} matches`);
}

queryInput.addEventListener('input', runSearch);
regexToggle.addEventListener('change', runSearch);
caseToggle.addEventListener('change', () => {
  pageBeam.destroy();
  pageBeam = makePageBeam();
  runSearch();
});

// Copy button: report success or failure both visibly and to the live region.
const copyButton = document.getElementById('copy-install') as HTMLButtonElement;
const copyStatus = document.getElementById('copy-status')!;
copyButton.addEventListener('click', async () => {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('no clipboard API');
    await navigator.clipboard.writeText('npm install highbeam');
    copyButton.textContent = 'copied';
    copyStatus.textContent = 'Install command copied to clipboard';
  } catch {
    copyButton.textContent = 'select it manually';
    copyStatus.textContent = 'Copying failed — select the command manually';
  }
  setTimeout(() => {
    copyButton.textContent = 'copy';
    copyStatus.textContent = '';
  }, 2000);
});

// React comparison
mountCompare(document.getElementById('compare-root')!, supported);
