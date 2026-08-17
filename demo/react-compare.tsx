import { StrictMode, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Mark from 'mark.js';
import { Highbeam } from 'highbeam';

const sightings = (tick: number) => [
  `A fox crossed the road ${4 + tick} minutes ago`,
  `Fog is thickening near the bridge (report #${tick})`,
  `The fox came back for a closer look`,
];

type Status = { text: string; tone: 'neutral' | 'good' | 'bad' };

const waiting: Status = { text: 'waiting — highlight “fox” first', tone: 'neutral' };
const unsupported: Status = {
  text: 'this browser doesn’t support the CSS Custom Highlight API',
  tone: 'bad',
};

function CompareDemo({ supported }: { supported: boolean }) {
  const [tick, setTick] = useState(0);
  const [highlighted, setHighlighted] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [spanStatus, setSpanStatus] = useState<Status>(waiting);
  const [beamStatus, setBeamStatus] = useState<Status>(supported ? waiting : unsupported);

  const spanList = useRef<HTMLUListElement>(null);
  const beamList = useRef<HTMLUListElement>(null);
  const beam = useRef<Highbeam | null>(null);

  const highlight = () => {
    new Mark(spanList.current!).mark('fox');
    beam.current ??= new Highbeam(beamList.current!, { name: 'react-demo' });
    const count = beam.current.mark('fox');
    setHighlighted(true);
    setSpanStatus({ text: 'highlighted by injecting <mark> elements', tone: 'good' });
    setBeamStatus({ text: `${count} matches painted — zero nodes touched`, tone: 'good' });
  };

  const reset = () => {
    beam.current?.destroy();
    beam.current = null;
    setHighlighted(false);
    setSpanStatus(waiting);
    setBeamStatus(supported ? waiting : unsupported);
    setTick(0);
    setGeneration((g) => g + 1); // remount both lists with fresh DOM
  };

  // Re-mark after every content-changing render, before paint — the
  // documented highbeam pattern for framework-managed DOM. The DOM
  // inspection of the mark.js panel below is diagnostic plumbing for this
  // comparison, not a pattern to copy into application code.
  useLayoutEffect(() => {
    if (!highlighted) return;
    const count = beam.current!.mark('fox');
    setBeamStatus({
      text: `render #${tick}: highlights intact, DOM matches state (${count} matches)`,
      tone: 'good',
    });

    const rows = Array.from(spanList.current!.querySelectorAll('li'));
    const expected = sightings(tick);
    const stale = rows.filter((li, i) => li.textContent !== expected[i]).length;
    const expectedMarks = expected.join(' ').match(/fox/gi)?.length ?? 0;
    const surviving = spanList.current!.querySelectorAll('mark').length;
    if (stale > 0) {
      setSpanStatus({
        text: `render #${tick}: ${stale} of ${expected.length} rows show mangled text — React updated nodes mark.js had replaced`,
        tone: 'bad',
      });
    } else if (surviving < expectedMarks) {
      setSpanStatus({
        text: `render #${tick}: React re-rendered the changed rows and silently wiped ${expectedMarks - surviving} of ${expectedMarks} injected highlights`,
        tone: 'bad',
      });
    }
  }, [tick, highlighted]);

  return (
    <>
      <div className="panel" key={`span-${generation}`}>
        <h3>
          span injection <small>mark.js</small>
        </h3>
        <ul ref={spanList}>
          {sightings(tick).map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
        <p className={`status ${spanStatus.tone === 'neutral' ? '' : spanStatus.tone}`}>
          {spanStatus.text}
        </p>
      </div>

      <div className="panel" key={`beam-${generation}`}>
        <h3>
          highlight ranges <small>highbeam</small>
        </h3>
        <ul ref={beamList}>
          {sightings(tick).map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
        <p className={`status ${beamStatus.tone === 'neutral' ? '' : beamStatus.tone}`}>
          {beamStatus.text}
        </p>
      </div>

      <div className="compare-actions">
        <button type="button" onClick={highlight} disabled={!supported}>
          Highlight “fox”
        </button>
        <button type="button" onClick={() => setTick((t) => t + 1)} disabled={!highlighted}>
          Update React state
        </button>
        <button type="button" onClick={reset}>
          Reset
        </button>
      </div>
    </>
  );
}

export function mountCompare(rootEl: HTMLElement, supported: boolean): void {
  createRoot(rootEl).render(
    <StrictMode>
      <CompareDemo supported={supported} />
    </StrictMode>,
  );
}
