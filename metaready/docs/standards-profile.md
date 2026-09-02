# Standards profile

## External reference reviewed

- **Standard:** DCAT-AP-NO — Standard for describing datasets, data services and data catalogs.
- **Publisher:** Digitaliseringsdirektoratet.
- **Version recorded during implementation:** **v3.0.7**.
- **Status recorded:** effective from 2025-01-01; official page updated 2026-03-20.
- **Canonical source:** `https://data.norge.no/specification/dcat-ap-no`

## Implementation claim

MetaReady does **not** claim full DCAT-AP-NO conformity.

The deployed application uses a limited internal demonstration profile named `INTERNAL_ASSET_MINIMUM_V1`. It applies broadly to datasets, services, documents, models, terms, code lists and reports. DCAT-AP-NO itself is specifically intended for descriptions of datasets, data services and catalogs.

## Demonstrated mapping

| MetaReady concept | Related DCAT / Dublin Core idea | Coverage |
|---|---|---|
| Stable asset identifier | `dct:identifier` and persistent resource identity | Demonstrated as local stable ID |
| Title and description | `dct:title`, `dct:description` | Demonstrated |
| Publisher / accountable owner | `dct:publisher`, agent concepts | Simplified internal role |
| Contact / steward | `dcat:contactPoint` | Simplified internal role |
| Access rights | `dct:accessRights` | Demonstrated as governed narrative |
| Update frequency | `dct:accrualPeriodicity` | Demonstrated as plain text |
| Provenance | `dct:provenance` / source concepts | Demonstrated as narrative evidence |
| Related resources | DCAT and Dublin Core relationship properties | Internal typed relationship model with evidence and confidence |

## Deliberately not implemented

- Complete class and property coverage.
- RDF graph production and ingestion.
- Controlled-vocabulary validation.
- SHACL validation.
- Catalog and catalog-record conformance behavior.
- Full distribution and data-service cardinality rules.
- Receiving-application conformance.
- Formal JSON-LD or Turtle export.

## Internal profile rules

`INTERNAL_ASSET_MINIMUM_V1` checks:

1. accountable owner;
2. operational steward;
3. purpose and scope;
4. sensitivity classification;
5. access conditions;
6. provenance;
7. lifecycle rule;
8. review currency;
9. stable identifier;
10. machine usability;
11. terminology coverage; and
12. relationship evidence.

Rules 1–10 are required in the demonstration profile. Rules 11–12 are recommendations. Each finding contains the rule, severity, observed evidence, why it matters and how to remediate it.
