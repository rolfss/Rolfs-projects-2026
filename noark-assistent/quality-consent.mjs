// Keep this policy in sync with the disclosure and the server's REVIEW_POLICY.
export const QUALITY_POLICY = '2026-09-review-v1';

export function supportsQualityConsent(backend) {
  const log = backend?.questionLogging;
  return backend?.configured === true && log?.enabled === true &&
    log.policy === QUALITY_POLICY && log.text === 'opt-in' && log.retentionDays === 30;
}

export function qualityConsentView(backend, useLuna, checked) {
  const supported = supportsQualityConsent(backend);
  const enabled = supported && useLuna === true;
  let message;
  if (!backend) {
    message = 'Kontrollerer om frivillig tekstlagring er tilgjengelig.';
  } else if (backend.configured !== true) {
    message = 'Lagringsstatus kunne ikke bekreftes. Samtykke til tekstlagring er utilgjengelig. Lokalt søk fungerer fortsatt.';
  } else if (backend.questionLogging?.enabled !== true) {
    message = 'Forbedringsloggen er ikke aktiv på serveren. Derfor er samtykke utilgjengelig. Du kan fortsatt bruke Luna uten tekstlagring i forbedringsloggen.';
  } else if (!supported) {
    message = 'Serveren bekrefter ikke vilkårene om frivillig tekstlagring i opptil 30 dager. Samtykke er derfor utilgjengelig.';
  } else if (!enabled) {
    message = 'Frivillig tekstlagring er tilgjengelig når du slår på «Bruk Luna». Lokale søk sendes ikke til forbedringsloggen.';
  } else if (checked === true) {
    message = 'Samtykke er på. En redigert kopi av nye spørsmål sendt med Luna kan lagres i opptil 30 dager. Fjern avkrysningen for å stoppe tekstlagring av nye spørsmål.';
  } else {
    message = 'Samtykke er av. Spørsmålstekst lagres ikke i forbedringsloggen. Godkjente Luna-forespørsler kan fortsatt gi diagnostikk uten spørsmålstekst.';
  }
  return { enabled, granted: enabled && checked === true, retry: Boolean(backend) && !supported, message };
}

// Native checkbox/label semantics provide mouse, touch and keyboard interaction.
// The choice is deliberately never saved to browser storage.
export function bindQualityConsent({ checkbox, status, lunaToggle, retryButton, loadStatus }) {
  let backend = null;
  let pending = false;
  const label = checkbox.closest('label');
  checkbox.checked = false; // Do not reuse browser-restored form consent.
  checkbox.setAttribute('autocomplete', 'off');
  checkbox.setAttribute('aria-describedby', status.id);
  status.setAttribute('aria-atomic', 'true');
  retryButton.type = 'button';
  retryButton.textContent = 'Kontroller lagringsstatus på nytt';

  function render() {
    const view = qualityConsentView(pending ? null : backend, lunaToggle.checked, checkbox.checked);
    checkbox.disabled = !view.enabled;
    if (!view.enabled) checkbox.checked = false;
    label.hidden = !view.enabled; // Do not offer a dead checkbox when consent cannot apply.
    status.textContent = view.message;
    retryButton.hidden = !pending && !view.retry;
    retryButton.disabled = pending;
  }

  async function refresh() {
    if (pending) return;
    pending = true;
    render(); // Rechecking always clears consent; a successful retry never opts in.
    try { backend = await loadStatus(); }
    catch { backend = { configured: false }; }
    finally { pending = false; render(); }
  }

  function clear() { checkbox.checked = false; render(); }
  checkbox.addEventListener('change', render);
  lunaToggle.addEventListener('change', render);
  retryButton.addEventListener('click', refresh);
  render();
  return {
    refresh, render, clear,
    granted: () => !pending && !checkbox.disabled && qualityConsentView(backend, lunaToggle.checked, checkbox.checked).granted,
  };
}
