# MetaReady

**Information Governance & AI-Readiness Workbench**

MetaReady is a working static demonstration of how an organization can make information ownership, metadata quality, provenance, access, lifecycle controls, lineage and AI readiness visible and actionable.

The fictional organization and all catalog content are synthetic. The application works without an API key, backend or paid service.

## The problem

Organizations often launch search, analytics and AI initiatives before they can answer basic questions about the information involved:

- What is this asset, and what does it mean?
- Who owns and maintains it?
- Is it current, authoritative and traceable?
- Who may access it, and how should it be retained or deleted?
- Which systems, reports and services depend on it?
- Is it suitable for this specific AI use case?

MetaReady turns those questions into an operational workflow rather than a policy document.

## Working capabilities

- Searchable catalog with **24 connected synthetic information assets** across seven asset types.
- Versioned, deterministic metadata profile with **12 explainable rules**.
- Separate quality dimensions with formulas, evidence and confidence.
- Use-case-specific AI-readiness assessment across **13 dimensions**.
- Register, validate, review, approve and publish workflow.
- Deterministic remediation that creates a new asset version and audit event.
- Relationship graph plus an accessible tabular alternative.
- Impact analysis for downstream assets.
- Prioritized remediation backlog with a visible formula.
- Markdown governance brief and CSV backlog export.
- Demo role model for viewer, steward, information architect, approver and administrator.
- Local persistence and one-click reset.
- Automated tests for validation, scoring, versioning, metrics and exports.

## Run locally

```bash
cd metaready
python -m http.server 8080
```

Open `http://localhost:8080`.

Run the deterministic engine tests:

```bash
npm test
```

No installation is required beyond Node.js 20+ for tests.

## Architecture

The deployed version is a dependency-free static application:

- `index.html` — semantic application shell and registration dialog.
- `styles.css` — responsive Nordic enterprise interface.
- `data.mjs` — deterministic synthetic catalog, relationships, backlog and audit seed.
- `engine.mjs` — validation, quality, AI readiness, prioritization, versioning and export logic.
- `views.mjs` — pure templates for the six workspaces.
- `app.mjs` — state, role guards, interactions, local persistence and exports.
- `tests/` — Node test runner coverage of core deterministic behavior.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for design details and Mermaid diagrams.

## Standards profile

MetaReady records DCAT-AP-NO **v3.0.7** as the current external reference reviewed during implementation. The application implements only a deliberately limited internal demonstration profile. It does **not** claim full DCAT-AP-NO conformity or compliance certification.

See [docs/standards-profile.md](./docs/standards-profile.md).

## Main demonstration path

1. Open **Informasjonskatalog**.
2. Select **Legacy procedure archive**.
3. Open its governance view and inspect missing ownership, provenance, review, access and lifecycle evidence.
4. Apply a demonstrated remediation and observe version and audit updates.
5. Open **AI-beredskap**, select **Retrieval-augmented assistant**, and inspect evidence by dimension.
6. Create remediation items from blockers.
7. Open **Linjer og konsekvens**, trace relationships, and export a governance brief.

See [docs/demo-script.md](./docs/demo-script.md) for 90-second and five-minute scripts.

## Security and privacy

- Synthetic content only.
- No external API calls.
- No authentication claims: the role selector demonstrates authorization concepts in static mode.
- No personal data processing.
- Export values are escaped to reduce spreadsheet formula injection risk.
- User-entered text is escaped before rendering.

See [SECURITY.md](./SECURITY.md) and [docs/threat-model.md](./docs/threat-model.md).

## Limitations

- Static-mode permissions are a UX simulation, not server-side authorization.
- LocalStorage is suitable for a portfolio demonstration, not regulated production records.
- The relationship graph supports direct relationships, not full graph traversal or graph persistence.
- Standards mapping is partial and illustrative.
- Readiness results are governance triage, not legal approval, security accreditation or model certification.
- PDF-ready output is represented by print-friendly HTML and Markdown export; no server-side PDF renderer is included.

## Roadmap

A production pilot would add a FastAPI service, PostgreSQL, enterprise identity, server-enforced roles, append-only audit storage, imports with mapping preview, JSON-LD/RDF export, full profile configuration, richer version comparison and integration tests.

## Documentation

- [Architecture](./ARCHITECTURE.md)
- [Case study](./CASE_STUDY.md)
- [AI-readiness model](./docs/ai-readiness-model.md)
- [Standards profile](./docs/standards-profile.md)
- [Threat model](./docs/threat-model.md)
- [Demo script](./docs/demo-script.md)
- [Evidence-based CV bullets](./CV_BULLETS.md)

## License

MIT. See [LICENSE](./LICENSE).
