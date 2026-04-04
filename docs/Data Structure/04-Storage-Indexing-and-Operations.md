# Storage, Indexing, and Operations

## Purpose
Define where each data layer lives, how indexes are managed, and how to roll out safely at scale.

Related docs:
- [00-Overview](00-Overview.md)
- [01-Canonical Property Document](01-Canonical-Property-Document.md)
- [02-Ingestion and Normalization Pipeline](02-Ingestion-and-Normalization-Pipeline.md)
- [03-RAG Chunking and Retrieval](03-RAG-Chunking-and-Retrieval.md)

## Storage Model

### 1) Raw Layer
Recommended store:
- Object storage or append-only document store

Format:
- JSONL or partitioned JSON by source/date

Keying pattern:
- raw/{source}/{year}/{month}/{day}/{sourceListingKey}/{captureTs}.JSON

### 2) Canonical Layer
Recommended store:
- Document storage in object store plus metadata row in relational DB

Canonical metadata table should include:
- documentId
- sourceName
- sourceListingKey
- schemaVersion
- parserVersion
- collectedAt
- sourceUpdatedAt
- canonicalPath
- status

### 3) Retrieval Layer
Recommended store:
- Vector index plus metadata index

Option A (near-term):
- PostgreSQL with a vector extension for embeddings
- GIN/BTREE indexes for metadata filters

Option B (later):
- Dedicated vector DB with external metadata service

## Indexing Strategy
1. Metadata filter indexes
- city
- state
- postalCode
- rentMin/rentMax
- bedsMin/bedsMax
- hasAvailabilities
- sourceUpdatedAt

2. Vector index
- One embedding per chunk
- Versioned by embeddingVersion

3. Lexical fallback index
- Optional full-text index on chunk content

## Governance and Compliance
1. Keep source attribution attached to all chunks.
2. Keep legal disclosure text retrievable as independent chunk type.
3. Log retrieval events with document and chunk IDs for auditability.
4. Respect source licensing and retention constraints.

## Data Retention and Lifecycle
Raw:
- Retain per legal and source policy windows

Canonical:
- Retain latest plus configurable historical versions

Chunks:
- Regenerate on schemaVersion, parserVersion, or embeddingVersion changes
- Keep superseded chunks for short rollback window

## Rollout Plan

### Phase 1: Foundation
1. Adopt canonical schema from [01-Canonical Property Document](01-Canonical-Property-Document.md).
2. Persist raw payloads immutably.
3. Produce canonical docs and metadata table.

### Phase 2: Retrieval Readiness
1. Implement chunk generator from [03-RAG Chunking and Retrieval](03-RAG-Chunking-and-Retrieval.md).
2. Index chunks with metadata filters and embeddings.
3. Add retrieval service contract.

### Phase 3: LLM Integration
1. Enforce filter-first retrieval policy.
2. Enforce source and freshness grounding contract.
3. Monitor retrieval quality and legal-safe output behavior.

### Phase 4: Scale and Optimization
1. Tune partitioning and index maintenance.
2. Add source-specific normalizers with confidence metrics.
3. Add automated schema migration checks.

## Operational Metrics
1. Ingestion throughput per source/hour
2. Normalize success and warning rates
3. Canonical publish lag
4. Chunk generation lag
5. Retrieval latency p50/p95/p99
6. Citation coverage rate for generated responses
7. Freshness compliance rate

## Suggested Next Build Tasks
1. Create canonical structs and normalizer interfaces in Server/internal modules.
2. Add chunk generator package with chunk templates.
3. Add retrieval service abstraction with filter-first query contract.
4. Add integration tests with representative aggregator fixtures.
