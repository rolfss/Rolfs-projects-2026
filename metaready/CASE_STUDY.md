# Case study: making information trustworthy before AI reuse

## Situation

A fictional public directorate, CivicWorks, wants better enterprise search, analytical reporting and knowledge-assistant capabilities. Its information is distributed across datasets, APIs, policy collections, information models, terms, code lists and reports.

The immediate risk is not model selection. It is weak information control: missing ownership, unclear authority, stale review dates, broken lineage and undocumented access or retention behavior.

## Product hypothesis

A governance product creates value when it:

1. makes the information estate discoverable;
2. explains what is wrong using evidence;
3. evaluates fitness for a concrete use case;
4. turns findings into owned, prioritized work; and
5. records the decision trail.

## Design process

The product was organized around four end-to-end journeys:

- register and govern a new information asset;
- diagnose and repair metadata quality;
- assess one asset for a specific AI use case;
- trace impact and export a governance brief.

The catalog includes deliberately strong and weak assets. The weak legacy procedure archive demonstrates why generic “AI ready” labels are insufficient: it lacks clear authority, provenance, access, lifecycle and retrieval evidence.

## Product decisions

- **Use-case-specific readiness:** A document collection is assessed differently for RAG than a dataset is for analytical reporting.
- **No opaque score:** Every dimension retains evidence, confidence, assumptions, recommended action and accountable role.
- **Deterministic fallback:** All functionality works without a language model.
- **Operational workflow:** Remediation changes versions and appends audit events rather than merely changing a visual score.
- **Accessible lineage:** The graph is supported by a complete relationship table.
- **Honest standards claims:** A limited internal profile references current standards but never claims full conformity.

## Implemented evidence

- 24 synthetic assets across seven types.
- 20 relationships with direction, evidence and confidence.
- 12 versioned validation rules.
- 10 quality dimensions.
- 13 AI-readiness dimensions.
- Five demo roles and guarded actions.
- Local workflow, versioning, audit, export and reset.
- Eight automated engine tests.

## Trade-offs

The public demonstration favors zero-dependency reliability over a deployed backend. Consequently, permissions and audit durability are illustrative. A production pilot would enforce authorization server-side and store immutable events in a database.

The standards profile is intentionally partial. Implementing the full DCAT-AP-NO model and conformance behavior would be a separate workstream with formal test fixtures and RDF validation.

## Outcome

The application demonstrates a concrete operating model for connecting information architecture, records-aware governance and responsible AI enablement. It shifts the question from “Can we connect this source to an AI tool?” to “What evidence makes this source trustworthy for this use?”
