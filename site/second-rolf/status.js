import { PROFILE_REVISION } from './interview.js?v=20260915-technical-self-description';
export const BACKEND_ORIGIN = 'https://second-rolf-api.rolfsselas.workers.dev';
export const LOCAL_MODEL = 'ministral-3:14b';

// Model connectivity and permission to use the current public profile are different states.
// Never remove the revision guard: a legacy connector may still contain removed private data.
export function normalizeStatus(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { available: false, modelOnline: false, reason: 'invalid_health' };
  const localModel = data.model === LOCAL_MODEL && data.mode === 'local-model' && data.localOnly === true;
  const modelOnline = localModel && (data.modelOnline === true || data.available === true);
  let reason = data.reason || 'model_unavailable';
  if (data.configured !== true) reason = 'not_configured';
  else if (!localModel) reason = 'model_mismatch';
  else if (data.profileRevision !== PROFILE_REVISION) reason = 'backend_update_required';
  else if (data.available === true) reason = data.busy === true ? 'busy' : 'ready';
  const available = data.configured === true && localModel && data.profileRevision === PROFILE_REVISION && data.available === true;
  return { ...data, available, modelOnline, gpu: modelOnline && data.gpu === true, reason };
}

export function statusDescription(status) {
  const descriptions = {
    ready: 'Ministral 3 14B er tilkoblet med gjeldende offentlig kunnskapsbase. Vanlig chat og faglige spørsmål besvares av den lokale modellen.',
    busy: 'Ministral 3 14B svarer en annen besøkende. Prøv igjen om litt.',
    backend_update_required: 'PC-en kan være på og modellen tilkoblet, men Cloudflare-backenden må oppdateres før trygg live-chat kan brukes. Oppdater også PC-koblingen.',
    connector_update_required: 'PC-koblingen bruker en eldre kunnskapsversjon. Oppdater og start Second Rolf-koblingen på nytt; hele PC-en trenger ikke omstart.',
    pc_disconnected: 'Ingen aktiv forbindelse fra PC-en. Både Ollama og Second Rolf-koblingen må kjøre; det er ikke nok at PC-en er slått på.',
    heartbeat_expired: 'PC-koblingen har sluttet å sende status. Den kan være i hvilemodus eller ha mistet nettforbindelsen.',
    model_starting: 'PC-koblingen er oppe, men Ministral er ikke bekreftet klar ennå. Innlasting kan ta litt tid.',
    model_unavailable: 'Ministral har ikke bekreftet at den kan svare. Profilmodus gir bare innebygde profilsvar, ikke AI-chat.',
    not_configured: 'Cloudflare-backenden mangler nødvendig konfigurasjon for live-chat.',
    model_mismatch: 'Backenden bekrefter ikke den forventede lokale Ministral-modellen. Live-chat er sperret.',
    network_error: 'Nettleseren får ikke kontakt med statusendepunktet. Dette sier ikke om PC-en er av eller på.',
    invalid_health: 'Statusendepunktet ga et ugyldig svar. Live-chat er ikke bekreftet.'
  };
  return descriptions[status.reason] || descriptions.model_unavailable;
}

export async function getStatus() {
  try {
    const response = await fetch(`${BACKEND_ORIGIN}/api/second-rolf/health`, { cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(6000) });
    if (!response.ok) return { available: false, modelOnline: false, reason: 'network_error' };
    return normalizeStatus(await response.json());
  } catch { return { available: false, modelOnline: false, reason: 'network_error' }; }
}
export function watchStatus(callback) {
  let pending = false, stopped = false;
  const check = async () => {
    if (pending || stopped || document.hidden) return;
    pending = true;
    try { const status = await getStatus(); if (!stopped) callback(status); } finally { pending = false; }
  };
  void check();
  const interval = setInterval(check, 15_000);
  document.addEventListener('visibilitychange', check);
  window.addEventListener('online', check);
  return () => { stopped = true; clearInterval(interval); document.removeEventListener('visibilitychange', check); window.removeEventListener('online', check); };
}
