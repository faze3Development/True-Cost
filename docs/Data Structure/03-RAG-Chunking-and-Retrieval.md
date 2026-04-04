# RAG Chunking and Retrieval

## Purpose
Define how canonical property documents are converted into retrieval artifacts for LLM use, with strict provenance, filtering, and freshness controls.

Related docs:
- [00-Overview](00-Overview.md)
- [01-Canonical Property Document](01-Canonical-Property-Document.md)
- [02-Ingestion and Normalization Pipeline](02-Ingestion-and-Normalization-Pipeline.md)
- [04-Storage, Indexing, and Operations](04-Storage-Indexing-and-Operations.md)
- [GCP Blueprint/00-Overview](GCP%20Blueprint/00-Overview.md)

## Retrieval Design
Use filter-first hybrid retrieval:
1. Structured filter preselection
2. Semantic vector retrieval
3. Optional lexical re-rank
4. Final grounding package with sources

This avoids semantic-only drift and supports strict constraints (beds, rent, state, freshness, fee disclosures).

## Chunk Types
Generate these chunk types per canonical property document.

1. property_summary
- Name, location, property type, management summary

2. pricing_fees
- Base rent ranges, total monthly ranges, fee disclosure text, fee flags

3. unit_rollup_{beds}
- One chunk per bed group with size, baths, pricing, availability

4. amenities_lifestyle
- Amenities and relevant quality-of-life fields

5. compliance_disclosures
- Required legal notices, fee disclosure state, algorithmic estimate notice

6. media_access
- Primary photo, video, virtual tour availability

7. provenance_trace
- Source identity, source URL, source update timestamps, parser version

## Chunk Schema
Each chunk should contain:

| Field | Type | Required | Notes |
|---|---|---|---|
| chunkId | string | yes | Unique chunk ID |
| documentId | string | yes | Canonical parent ID |
| chunkType | string | yes | One of defined chunk types |
| content | string | yes | LLM-facing text body |
| metadata | object | yes | Filter and governance metadata |
| createdAt | string | yes | Chunk generation time |
| embeddingVersion | string | yes | Embedding model/version |

## Required Metadata Fields
- sourceName
- sourceListingKey
- sourceURL
- city
- state
- postalCode
- latitude
- longitude
- rentMin
- rentMax
- bedsMin
- bedsMax
- hasAvailabilities
- collectedAt
- sourceUpdatedAt
- schemaVersion
- parserVersion
- complianceFlags

## Example Chunk (pricing_fees)
```json
{
  "chunkId": "chunk_...",
  "documentId": "prop_...",
  "chunkType": "pricing_fees",
  "content": "Base rent ranges from 1646 to 4683 USD. Listing indicates plus fees and fee disclosure state handling. Fee detail: Prices include all required monthly fees.",
  "metadata": {
    "sourceName": "apartments_com",
    "sourceListingKey": "9vsvv74",
    "city": "Midlothian",
    "state": "VA",
    "rentMin": 1646,
    "rentMax": 4683,
    "hasAvailabilities": true,
    "sourceUpdatedAt": "2026-04-03T15:34:22.98-07:00",
    "complianceFlags": ["fee_disclosure_state", "algorithmic_notice_required"]
  },
  "createdAt": "2026-04-04T05:27:20Z",
  "embeddingVersion": "text-embedding-v1"
}
```

## Retrieval Query Flow
1. Parse user intent into:
- hard filters
- soft semantic intent

2. Apply hard filters first:
- state/city
- rent range
- beds range
- availability true
- freshness window (for example last 7 days)

3. Run semantic retrieval only against filtered candidate chunks.

4. Build grounded context package with:
- top chunk texts
- source URLs
- timestamps and confidence labels

## Freshness and Trust Rules
1. Reject stale chunks beyond policy window unless explicitly requested.
2. Always include sourceUpdatedAt in context package.
3. Always include source URL and source name.
4. For pricing answers, prefer pricing_fees and unit_rollup chunks over summary chunks.

## Answer Grounding Contract
Before the LLM answers:
1. Inject required disclaimer snippets when algorithmic scoring is discussed.
2. Include fee disclosure text where available.
3. Attach at least one source citation per major claim.

## Performance Targets
1. Retrieval p95 under 300ms for filtered query stage.
2. End-to-end retrieval plus re-rank p95 under 800ms.
3. Chunk index freshness lag under 5 minutes after canonical publish.

## Optional Provider Blueprint
For a managed Google Cloud implementation with cost-aware feature flags and an emergency off switch, see [GCP Blueprint/00-Overview](GCP%20Blueprint/00-Overview.md).
