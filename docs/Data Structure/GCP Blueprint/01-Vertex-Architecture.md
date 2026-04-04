# Vertex Architecture

## Purpose
Define a production-ready architecture for optional GCP retrieval integration.

Related docs:
1. [00-Overview](00-Overview.md)
2. [02-Cost-Control-and-Feature-Flags](02-Cost-Control-and-Feature-Flags.md)
3. [03-Operations-and-Rollout](03-Operations-and-Rollout.md)
4. [../01-Canonical Property Document](../01-Canonical-Property-Document.md)
5. [../03-RAG-Chunking-and-Retrieval](../03-RAG-Chunking-and-Retrieval.md)

## Reference Components
1. Ingestion pipeline
- Writes raw payloads and canonical documents

2. Chunk generator
- Emits retrieval chunks with metadata

3. GCP ingestion adapter
- Pushes chunks to Vertex AI Search data store

4. Retrieval gateway in API
- Applies filter-first contract
- Routes to local or GCP provider by mode

5. Policy layer
- Enforces disclosure and attribution requirements

## Data Stores
1. Canonical source of truth
- Cloud Storage or BigQuery for canonical and raw artifacts

2. Retrieval index
- Vertex AI Search data store for chunk retrieval

3. Operational metadata
- Existing relational DB for mode flags, stats, and audit trails

## Retrieval Path
1. User query enters backend retrieval gateway.
2. Gateway parses hard filters and soft semantic intent.
3. Gateway sends filter-constrained query to configured provider.
4. Provider returns candidate chunks with metadata.
5. Gateway applies policy checks for freshness and attribution.
6. LLM context package is assembled and returned upstream.

## Required Metadata in Vertex
1. documentId
2. chunkId
3. chunkType
4. city
5. state
6. postalCode
7. rentMin
8. rentMax
9. bedsMin
10. bedsMax
11. hasAvailabilities
12. sourceName
13. sourceListingKey
14. sourceURL
15. sourceUpdatedAt
16. collectedAt
17. schemaVersion
18. parserVersion
19. complianceFlags

## Security and Governance
1. Service account least-privilege access.
2. Signed write path from ingestion to indexer.
3. Retrieval logs with query ID and returned chunk IDs.
4. Redaction policy for sensitive fields before indexing.

## Failure Isolation
1. Index write failures do not block canonical publish.
2. Retrieval timeout on GCP path automatically fails over to local path.
3. Circuit breaker can disable GCP provider by config.
