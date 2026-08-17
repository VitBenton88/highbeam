import { Highbeam } from 'highbeam';
import { mountCompare } from './react-compare';

// The wordmark's "beam" is painted by the library itself.
new Highbeam(document.getElementById('beam-mark')!, { name: 'logo' }).mark('beam');

// On load, sweep the tagline phrase like a hand dragging a marker.
const phrase = 'without touching the DOM';
const swipe = new Highbeam(document.getElementById('swipe-target')!, { name: 'swipe' });
if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
  swipe.mark(phrase);
} else {
  let chars = 0;
  const sweep = () => {
    chars += 1;
    swipe.mark(phrase.slice(0, chars));
    if (chars < phrase.length) setTimeout(sweep, 22);
  };
  setTimeout(sweep, 500);
}

// Live page search: the whole page is the demo.
const pageRoot = document.querySelector('.page')!;
const queryInput = document.getElementById('query') as HTMLInputElement;
const regexToggle = document.getElementById('opt-regex') as HTMLInputElement;
const caseToggle = document.getElementById('opt-case') as HTMLInputElement;
const countLine = document.getElementById('count')!;

let pageBeam = makePageBeam();

function makePageBeam(): Highbeam {
  return new Highbeam(pageRoot, {
    name: 'page-search',
    caseSensitive: caseToggle.checked,
  });
}

function runSearch(): void {
  const raw = queryInput.value;
  if (raw.trim() === '') {
    pageBeam.clear();
    countLine.textContent = ' ';
    return;
  }
  let query: string | RegExp = raw;
  if (regexToggle.checked) {
    try {
      query = new RegExp(raw, caseToggle.checked ? 'g' : 'gi');
    } catch {
      countLine.textContent = 'invalid regex';
      pageBeam.clear();
      return;
    }
  }
  const count = pageBeam.mark(query);
  countLine.textContent = count === 1 ? '1 match' : `${count} matches`;
}

queryInput.addEventListener('input', runSearch);
regexToggle.addEventListener('change', runSearch);
caseToggle.addEventListener('change', () => {
  pageBeam.destroy();
  pageBeam = makePageBeam();
  runSearch();
});

// Copy button
const copyButton = document.getElementById('copy-install') as HTMLButtonElement;
copyButton.addEventListener('click', async () => {
  await navigator.clipboard.writeText('npm install highbeam');
  copyButton.textContent = 'copied';
  setTimeout(() => (copyButton.textContent = 'copy'), 1500);
});

// React comparison
mountCompare(document.getElementById('compare-root')!);
