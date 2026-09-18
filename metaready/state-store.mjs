import { normalizeFilters } from './catalog-model.mjs';

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const strings = (value, keys) => record(value) && keys.every(key => typeof value[key] === 'string');
const assetStrings = ['owner', 'steward', 'unit', 'sensitivity', 'provenance', 'accessRights',
  'retention', 'updateFrequency', 'reviewDate', 'qualityEvidence', 'lawfulBasis', 'contact', 'documentationValue'];
const validAsset = a => strings(a, ['id', 'title', 'type', 'description', 'version', 'status']) && a.id &&
  assetStrings.every(key => a[key] == null || typeof a[key] === 'string') &&
  ['aiAllowed', 'machineReadable', 'identifiersStable'].every(key => a[key] == null || typeof a[key] === 'boolean') &&
  (a.glossaryCoverage == null || Number.isFinite(a.glossaryCoverage));
const validAction = a => strings(a, ['id', 'title', 'ownerRole', 'status', 'reason']) &&
  Array.isArray(a.assetIds) && a.assetIds.every(id => typeof id === 'string') &&
  ['impact', 'urgency', 'effort'].every(key => Number.isFinite(a[key])) &&
  Number.isFinite(a.riskReduction ?? a.risk);
const validAudit = a => strings(a, ['id', 'at', 'actor', 'action', 'subject', 'detail']) &&
  Number.isFinite(Date.parse(a.at));

/** Kontrollerer lagrede data før de når visningene. Ugyldig innhold overskrives ikke. */
export function restoreDemoState(fallback, saved) {
  if (!record(saved) || !Array.isArray(saved.assets) || !saved.assets.length ||
      !saved.assets.every(validAsset) || new Set(saved.assets.map(a => a.id)).size !== saved.assets.length ||
      !Array.isArray(saved.backlog) || !saved.backlog.every(validAction) ||
      !Array.isArray(saved.audit) || !saved.audit.every(validAudit)) return null;
  const restored = {...fallback, assets: saved.assets, backlog: saved.backlog, audit: saved.audit};
  const options = {
    role: ['viewer', 'steward', 'information_architect', 'approver', 'admin'],
    activeView: ['overview', 'catalog', 'readiness', 'lineage', 'backlog', 'audit'],
    useCaseId: ['enterprise_search', 'rag_assistant', 'analytical_reporting', 'classification_routing', 'agent_source']
  };
  for (const [key, allowed] of Object.entries(options)) {
    if (allowed.includes(saved[key])) restored[key] = saved[key];
  }
  for (const key of ['selectedAssetId', 'readinessAssetId', 'lineageAssetId']) {
    restored[key] = saved.assets.some(a => a.id === saved[key]) ? saved[key] : saved.assets[0].id;
  }
  restored.detailOpen = saved.detailOpen === true;
  restored.catalogFilters = normalizeFilters(saved.catalogFilters);
  return restored;
}

/** Lagring er valgfri: SecurityError og full kvote skal ikke stoppe en demohandling. */
export function createDemoStore(key, defaults, getStorage = () => globalThis.localStorage) {
  let invalid = false;
  return {
    read() {
      const fallback = defaults();
      try {
        const raw = getStorage().getItem(key);
        if (raw === null) return {state: fallback, problem: null};
        let restored;
        try { restored = restoreDemoState(fallback, JSON.parse(raw)); } catch { restored = null; }
        invalid = restored === null;
        return {state: restored || fallback, problem: invalid ? 'invalid' : null};
      } catch { return {state: fallback, problem: 'unavailable'}; }
    },
    write(state) {
      if (invalid) return 'invalid';
      try { getStorage().setItem(key, JSON.stringify(state)); return null; }
      catch { return 'unavailable'; }
    },
    clear() {
      try { getStorage().removeItem(key); invalid = false; return null; }
      catch { return 'unavailable'; }
    }
  };
}
