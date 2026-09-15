import { PROFILE_REVISION } from './interview.js?v=20260915-cv-professional';
export const BACKEND_ORIGIN = 'https://second-rolf-api.rolfsselas.workers.dev';
export async function getStatus() {
  try {
    const response = await fetch(`${BACKEND_ORIGIN}/api/second-rolf/health`, { cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(6000) });
    if (!response.ok) return { available: false };
    const data = await response.json();
    return { ...data, available: data.configured === true && data.available === true && data.mode === 'local-model' && data.localOnly === true && data.profileRevision === PROFILE_REVISION };
  } catch { return { available: false }; }
}
export function watchStatus(callback) {
  let pending = false;
  const check = async () => {
    if (pending || document.hidden) return;
    pending = true;
    try { callback(await getStatus()); } finally { pending = false; }
  };
  void check();
  const interval = setInterval(check, 15_000);
  document.addEventListener('visibilitychange', check);
  window.addEventListener('online', check);
  return () => { clearInterval(interval); document.removeEventListener('visibilitychange', check); window.removeEventListener('online', check); };
}
