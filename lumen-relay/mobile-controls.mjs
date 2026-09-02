const DEFAULT_DEAD_ZONE = 0.26;

export function keysForStick(x, y, deadZone = DEFAULT_DEAD_ZONE) {
  const safeX = Number.isFinite(x) ? x : 0;
  const safeY = Number.isFinite(y) ? y : 0;
  const safeDeadZone = Number.isFinite(deadZone)
    ? Math.max(0, Math.min(0.95, deadZone))
    : DEFAULT_DEAD_ZONE;
  const keys = new Set();

  if (safeY < -safeDeadZone) keys.add('w');
  if (safeY > safeDeadZone) keys.add('s');
  if (safeX < -safeDeadZone) keys.add('a');
  if (safeX > safeDeadZone) keys.add('d');

  return keys;
}

function setupMobileControls() {
  const controls = document.querySelector('#mobileControls');
  const movePad = document.querySelector('#movePad');
  const moveKnob = document.querySelector('#moveKnob');
  const dashButton = document.querySelector('#dashButton');
  const primaryButton = document.querySelector('#primaryButton');
  const overlay = document.querySelector('#gameOverlay');
  const frame = document.querySelector('.game-frame');

  if (!controls || !movePad || !moveKnob || !dashButton || !overlay || !frame) return;

  const coarsePointer = window.matchMedia('(pointer: coarse)');
  let activePointerId = null;
  let pressedKeys = new Set();

  function mobileInputWanted() {
    return coarsePointer.matches || navigator.maxTouchPoints > 0 || window.innerWidth <= 760;
  }

  function emitKey(type, key) {
    document.dispatchEvent(new KeyboardEvent(type, {
      key,
      bubbles: true,
      cancelable: true,
    }));
  }

  function setPressedKeys(nextKeys) {
    for (const key of pressedKeys) {
      if (!nextKeys.has(key)) emitKey('keyup', key);
    }
    for (const key of nextKeys) {
      if (!pressedKeys.has(key)) emitKey('keydown', key);
    }
    pressedKeys = new Set(nextKeys);
  }

  function resetKnob() {
    movePad.classList.remove('is-active');
    moveKnob.style.setProperty('--stick-x', '0px');
    moveKnob.style.setProperty('--stick-y', '0px');
  }

  function releaseInput() {
    activePointerId = null;
    setPressedKeys(new Set());
    resetKnob();
  }

  function updateStick(event) {
    const rect = movePad.getBoundingClientRect();
    const offsetX = event.clientX - (rect.left + rect.width / 2);
    const offsetY = event.clientY - (rect.top + rect.height / 2);
    const limit = Math.max(1, Math.min(rect.width, rect.height) * 0.31);
    const distance = Math.hypot(offsetX, offsetY);
    const scale = distance > limit ? limit / distance : 1;
    const visualX = offsetX * scale;
    const visualY = offsetY * scale;

    moveKnob.style.setProperty('--stick-x', `${visualX.toFixed(1)}px`);
    moveKnob.style.setProperty('--stick-y', `${visualY.toFixed(1)}px`);
    setPressedKeys(keysForStick(visualX / limit, visualY / limit));
  }

  function beginStick(event) {
    if (activePointerId !== null || controls.classList.contains('is-suspended')) return;
    activePointerId = event.pointerId;
    movePad.classList.add('is-active');
    try {
      movePad.setPointerCapture?.(event.pointerId);
    } catch {
      // Pointer capture is optional; window-level release handlers still clear input.
    }
    updateStick(event);
    event.preventDefault();
    event.stopPropagation();
  }

  function moveStick(event) {
    if (event.pointerId !== activePointerId) return;
    updateStick(event);
    event.preventDefault();
    event.stopPropagation();
  }

  function endStick(event) {
    if (activePointerId === null || event.pointerId !== activePointerId) return;
    releaseInput();
    event.preventDefault();
    event.stopPropagation();
  }

  function syncSuspendedState() {
    const suspended = overlay.classList.contains('is-visible') || document.hidden;
    controls.classList.toggle('is-suspended', suspended);
    controls.setAttribute('aria-hidden', String(suspended));
    if (suspended) releaseInput();
  }

  function syncControlAvailability() {
    const enabled = mobileInputWanted();
    controls.hidden = !enabled;
    document.documentElement.classList.toggle('mobile-input-ready', enabled);
    frame.classList.toggle('mobile-input-ready', enabled);
    if (!enabled) releaseInput();
    syncSuspendedState();
  }

  movePad.addEventListener('pointerdown', beginStick);
  movePad.addEventListener('pointermove', moveStick);
  movePad.addEventListener('pointerup', endStick);
  movePad.addEventListener('pointercancel', endStick);
  movePad.addEventListener('lostpointercapture', releaseInput);
  movePad.addEventListener('contextmenu', (event) => event.preventDefault());

  dashButton.addEventListener('pointerdown', () => {
    if (navigator.vibrate) navigator.vibrate(8);
  }, { passive: true });

  primaryButton?.addEventListener('click', () => {
    if (!mobileInputWanted()) return;
    requestAnimationFrame(() => frame.scrollIntoView({ block: 'start', behavior: 'smooth' }));
  });

  new MutationObserver(syncSuspendedState).observe(overlay, {
    attributes: true,
    attributeFilter: ['class'],
  });

  function handleViewportChange() {
    releaseInput();
    syncControlAvailability();
  }

  window.addEventListener('pointerup', endStick);
  window.addEventListener('pointercancel', endStick);
  window.addEventListener('blur', releaseInput);
  window.addEventListener('resize', handleViewportChange, { passive: true });
  window.addEventListener('orientationchange', handleViewportChange, { passive: true });
  document.addEventListener('visibilitychange', syncSuspendedState);
  coarsePointer.addEventListener?.('change', syncControlAvailability);

  syncControlAvailability();
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  setupMobileControls();
}
