import { SceneRenderer as BaseSceneRenderer } from './renderer-base.js';

const VISUAL_SAFETY_STYLE_ID = 'brukerstottejakten-no-blink';
const VISUAL_SAFETY_CSS = `
/* Accessibility: keep gameplay feedback visible without repetitive blinking. */
.radar-blip,
.flow-track.is-ready,
.weapon-rig.is-flow .gun-core,
.weapon-rig.is-overload .gun-screen,
.game-board.is-overload,
.gun-capacitor i,
.gun-energy-line {
  animation: none !important;
}
.radar-blip { opacity: 1 !important; transform: none !important; }
.weapon-rig.is-overload .gun-screen { filter: none !important; }
`;

function installVisualSafetyStyles() {
  if (typeof document === 'undefined' || document.getElementById(VISUAL_SAFETY_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = VISUAL_SAFETY_STYLE_ID;
  style.textContent = VISUAL_SAFETY_CSS;
  document.head.append(style);
}

export class SceneRenderer extends BaseSceneRenderer {
  constructor(...args) {
    super(...args);
    installVisualSafetyStyles();
    this.levelPulse = 0;
    this.impactFlash = 0;
  }

  pulseLevel() {
    // Deliberately no full-screen luminance pulse.
    this.levelPulse = 0;
  }

  pulseImpact(target, options) {
    // Preserve particles, shockwaves and recoil while suppressing white flashes.
    super.pulseImpact(target, options);
    this.impactFlash = 0;
    if (target) target.flash = 0;
  }

  drawSky(theme, _time, level) {
    // Freeze star luminance so stars never twinkle/blink.
    super.drawSky(theme, 0, level);
  }

  drawWeather(time, level, theme) {
    // Render moving weather normally, but replace overload pulsing with a static tint.
    const overload = this.overload;
    this.overload = false;
    super.drawWeather(time, level, theme);
    this.overload = overload;

    if (!overload) return;
    const context = this.context;
    context.save();
    context.fillStyle = 'rgba(255,83,107,0.035)';
    context.fillRect(0, 0, this.width, this.height);
    context.strokeStyle = 'rgba(255,111,104,0.17)';
    context.lineWidth = 2;
    context.strokeRect(5, 5, this.width - 10, this.height - 10);
    context.restore();
  }

  drawTarget(target, _time) {
    // Keep target glows steady instead of oscillating in brightness.
    if (target) target.flash = 0;
    super.drawTarget(target, 0);
  }

  drawPost(theme) {
    // Defensive guard: no level pulse or impact flash may reach the full canvas.
    this.levelPulse = 0;
    this.impactFlash = 0;
    super.drawPost(theme);
  }

  render(frame = {}) {
    this.levelPulse = 0;
    this.impactFlash = 0;
    for (const target of frame.targets || []) target.flash = 0;
    return super.render(frame);
  }
}
