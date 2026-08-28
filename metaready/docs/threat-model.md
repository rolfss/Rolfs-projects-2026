# Threat model

## Assets to protect

- Integrity of metadata and ownership decisions.
- Accuracy of authority, sensitivity and lifecycle claims.
- Audit history and workflow decisions.
- Exported governance reports.
- User trust in readiness conclusions.

## Main threats and current controls

| Threat | Static-demo control | Production requirement |
|---|---|---|
| Unauthorized metadata change | Role-based UI guards | Server-enforced authorization and enterprise identity |
| False authority claim | Authority remains an explicit field; no automatic inference | Approval evidence, accountable owner and separation of duties |
| Prompt injection in descriptions | No LLM is called; text is escaped before rendering | Treat source text as untrusted data and isolate model instructions |
| Sensitive-data leakage | Synthetic data only; no external calls | Classification, field-level access, logging controls and DLP |
| Spreadsheet formula injection | CSV cells are quoted and dangerous leading characters are neutralized | Central export service and security tests |
| Cross-site scripting | User-entered values are escaped before HTML insertion | Framework-level escaping, CSP and security testing |
| Audit tampering | Events are append-oriented in UI behavior | Immutable server-side event store and retention controls |
| Supply-chain compromise | No runtime dependencies in the deployed app | Locked dependencies, SBOM, scanning and update policy |
| Misleading readiness score | Evidence and blockers remain visible | Independent review, calibrated thresholds and monitored outcomes |

## Trust boundaries

The browser and localStorage are controlled by the user. They are not a trusted system of record. Downloaded files leave the application boundary and must be handled according to organizational controls.

## Security disclosure

See [SECURITY.md](../SECURITY.md).
