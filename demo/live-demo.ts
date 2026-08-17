import { Highbeam } from 'highbeam';

const MESSAGES = [
  'Fox spotted at the roadside, holding very still',
  'High beams on — the whole stretch lights up',
  'Fog rolling in past the old barn',
  'Two foxes now, trading glances across the lane',
  'Nothing but asphalt and night for a mile',
  'The fox darts left, vanishes into the ditch',
  'Low beams again through the village',
  'A firefox? No — just a fox, backlit by taillights',
];

const MAX_VISIBLE = 8;

export function mountLiveDemo(): void {
  const log = document.getElementById('live-log') as HTMLUListElement;
  const termInput = document.getElementById('live-term') as HTMLInputElement;
  const toggle = document.getElementById('live-toggle') as HTMLButtonElement;

  // The entire live-mode integration is these two lines.
  const beam = new Highbeam(log, { live: true, name: 'live-chat' });
  beam.mark(termInput.value);

  termInput.addEventListener('input', () => beam.mark(termInput.value));

  let next = 0;
  let timer: ReturnType<typeof setInterval> | undefined;

  const append = () => {
    const li = document.createElement('li');
    li.textContent = MESSAGES[next % MESSAGES.length]!;
    next += 1;
    log.appendChild(li);
    while (log.children.length > MAX_VISIBLE) log.firstElementChild!.remove();
  };

  const start = () => {
    timer = setInterval(append, 1200);
    toggle.textContent = 'pause';
  };
  const stop = () => {
    clearInterval(timer);
    timer = undefined;
    toggle.textContent = 'resume';
  };

  toggle.addEventListener('click', () => (timer ? stop() : start()));

  append(); // never show an empty panel
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    stop();
  } else {
    start();
  }
}
