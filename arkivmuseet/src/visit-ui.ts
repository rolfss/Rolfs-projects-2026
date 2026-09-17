import './visit-ui.css';

/** Navigation is not a second game: progress still belongs to Journey. */
export function visitHud(): string {
  return `<section class="journey-hud" aria-label="Besøksplan">
    <div class="visit-dock">
      <button id="visit-toggle" aria-expanded="false" aria-controls="visit-details"><span>Besøksplan</span><span class="visit-chevron" aria-hidden="true">⌃</span></button>
      <button id="continue-journey" class="primary">Første rom →</button>
      <div id="near-card" hidden>
        <span class="sr-only" id="near-wing"></span><h2 class="sr-only" id="near-title"></h2>
        <button id="exhibit-open" class="primary" aria-describedby="near-title">Utforsk rommet →</button>
      </div>
    </div>
    <div id="visit-details" hidden>
      <p class="visit-eyebrow">DITT MUSEUMSBESØK</p>
      <h2>Se sporene. Prøv valgene. Ta noe med videre.</h2>
      <ol class="visit-route">
        <li><strong>Utforsk</strong><span>Fem virkelige saker, med kilder og tydelige avgrensninger.</span></li>
        <li><strong>Prøv selv</strong><span>En valgfri lederøvelse ved hver utstilling.</span></li>
        <li><strong>Ta med videre</strong><span>Samle ett eller flere tiltak i Lederens rom.</span></li>
      </ol>
      <p id="journey-status">0 av 5 lederøvelser gjennomført</p>
      <progress id="journey-progress" max="5" value="0" aria-label="Lederøvelser gjennomført"></progress>
      <p class="visit-note">Du velger rom og rekkefølge. Ingen tidsfrist eller krav om å løse oppgaver.</p>
      <div class="visit-controls">
        <button id="home">Hovedhall</button>
        <button id="tour-toggle">Start omvisning</button>
        <button id="audio-toggle" aria-pressed="false">Lyd av</button>
      </div>
      <div id="visit-optional" class="visit-optional">
        <p class="visit-eyebrow">VALGFRI FORDYPNING</p>
        <p>Det manglende grunnlaget: undersøk ti fiktive spor fra prosjekt Aurora. Egen fremdrift, uavhengig av lederøvelsene.</p>
      </div>
    </div>
  </section>`;
}

/** A non-modal disclosure. Closed content is removed from the tab order by hidden. */
export class VisitUI {
  private readonly panel = document.querySelector<HTMLElement>('#visit-details')!;
  private readonly toggle = document.querySelector<HTMLButtonElement>('#visit-toggle')!;
  private readonly hud = document.querySelector<HTMLElement>('.journey-hud')!;
  private readonly events = new AbortController();
  private idle: ReturnType<typeof setTimeout> | undefined;
  private arrival: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    const options = {signal: this.events.signal};
    this.toggle.addEventListener('click', () => this.setOpen(this.panel.hidden), options);
    // Dismiss the plan before walking; there is no invisible overlay over the scene.
    document.querySelector('#world')!.addEventListener('pointerdown', () => this.collapse(false), options);
    const controls = document.querySelector<HTMLElement>('#touch-controls')!;
    const wake = () => {
      controls.classList.add('is-active');
      clearTimeout(this.idle);
      this.idle = setTimeout(() => controls.classList.remove('is-active'), 3500);
    };
    controls.addEventListener('pointerdown', wake, options);
    controls.addEventListener('focusin', wake, options);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        clearTimeout(this.idle);
        controls.classList.remove('is-active');
      }
    }, options);
  }

  get expanded(): boolean {return !this.panel.hidden;}

  private setOpen(open: boolean) {
    this.panel.hidden = !open;
    this.toggle.setAttribute('aria-expanded', String(open));
    this.hud.classList.toggle('is-expanded', open);
    document.querySelector<HTMLElement>('#touch-controls')!.inert = open;
    this.toggle.setAttribute('aria-label', open ? 'Lukk besøksplanen' : 'Åpne besøksplanen');
    if (open) this.panel.scrollTop = 0;
  }

  collapse(restoreFocus = true) {
    const focusInside = this.panel.contains(document.activeElement);
    this.setOpen(false);
    if (restoreFocus && focusInside) this.toggle.focus({preventScroll: true});
  }

  enter(reduced: boolean) {
    this.collapse(false);
    document.body.classList.toggle('reduced-motion', reduced);
    if (reduced) return;
    // One small, non-blocking reveal; never fly the camera or turn on audio here.
    document.body.classList.add('visit-arrival');
    clearTimeout(this.arrival);
    this.arrival = setTimeout(() => document.body.classList.remove('visit-arrival'), 1600);
  }

  destroy() {
    this.events.abort();
    clearTimeout(this.idle);
    clearTimeout(this.arrival);
    document.body.classList.remove('visit-arrival');
  }
}
