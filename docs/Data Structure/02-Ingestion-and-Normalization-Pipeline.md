# Ingestion and Normalization Pipeline

## Purpose
Define the end-to-end lifecycle from raw aggregator payload to canonical document and retrieval chunks.

Related docs:
- [00-Overview](00-Overview.md)
- [01-Canonical Property Document](01-Canonical-Property-Document.md)
- [03-RAG Chunking and Retrieval](03-RAG-Chunking-and-Retrieval.md)
- [04-Storage, Indexing, and Operations](04-Storage-Indexing-and-Operations.md)

## Pipeline Stages
1. Capture
2. Persist raw
3. Normalize
4. Validate
5. Enrich
6. Publish canonical
7. Generate retrieval chunks
8. Index chunks

## Detailed Flow

### 1) Capture
Input:
- HTTP response payloads from aggregators
- Crawl metadata (URL, status, request headers, timestamp)

Output:
- Structured envelope with payload + ingestion metadata

### 2) Persist Raw
Store immutable raw records before transformation.

Required metadata:
- sourceName
- sourceListingKey
- capturedAt
- payloadHash
- parserVersionCandidate

Behavior:
- Append-only writes
- Dedupe by payloadHash + sourceListingKey + date bucket

### 3) Normalize
Map raw fields into canonical schema from [01-Canonical Property Document](01-Canonical-Property-Document.md).

Rules:
1. Prefer explicit numeric fields over formatted string fields.
2. Keep source-derived text where precision is uncertain.
3. Track mapping confidence at field level.

### 4) Validate
Validation levels:
1. Hard failures
- Missing required top-level fields
- Invalid latitude/longitude range
- Invalid schemaVersion format

2. Soft failures
- Missing optional media
- Partial rollup data

Output:
- validationStatus: pass, pass_with_warnings, fail
- validationIssues: structured list

### 5) Enrich
Optional enrichments:
- Computed fee flags
- Location normalization (state casing, postal formats)
- Amenity normalization dictionary

Do not overwrite raw provenance fields.

### 6) Publish Canonical
Write canonical document with:
- documentId
- schemaVersion
- normalizedAt
- provenance block

### 7) Generate Retrieval Chunks
Split canonical doc into chunk templates described in [03-RAG Chunking and Retrieval](03-RAG-Chunking-and-Retrieval.md).

### 8) Index Chunks
Embed and index chunks using:
- Filter metadata index
- Vector index
- Optional lexical index for fallback

## Idempotency and Reprocessing
1. Every run should be idempotent by sourceListingKey + sourceUpdatedAt + parserVersion.
2. Reprocessing should regenerate canonical and chunks when parserVersion changes.
3. Keep prior canonical versions for audit windows.

## Failure Handling
1. Raw persist failure: fail fast and retry.
2. Normalize failure: mark record as dead-letter with issue details.
3. Index failure: canonical publish still succeeds, index job retries asynchronously.

## Suggested Job Contracts

Ingestion job output:
```json
{
  "rawRecordId": "raw_...",
  "source": "apartments_com",
  "sourceListingKey": "9vsvv74",
  "payloadHash": "sha256:...",
  "capturedAt": "2026-04-04T05:26:28Z"
}
```

Normalization job output:
```json
{
  "documentId": "prop_...",
  "schemaVersion": "1.0.0",
  "validationStatus": "pass_with_warnings",
  "issueCount": 2,
  "normalizedAt": "2026-04-04T05:27:11Z"
}
```

Index job output:
```json
{
  "documentId": "prop_...",
  "chunkCount": 7,
  "indexedAt": "2026-04-04T05:27:20Z"
}
```

## Data Quality SLAs
1. Normalization success rate >= 99.5% per source/day.
2. Index lag under 5 minutes for fresh listings.
3. Critical fields completeness:
- city/state/postalCode >= 99%
- baseRentMin/baseRentMax >= 98%
- source attribution fields = 100%
