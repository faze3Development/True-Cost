# True-Cost Property Data Architecture

## Purpose
This document set defines how True-Cost should store and retrieve large volumes of property data for:
- Transactional product APIs
- Analytics and auditing
- LLM retrieval using Retrieval-Augmented Generation (RAG)

The design is hybrid by default:
- Relational data for operational workflows
- Canonical property documents for source-rich records
- Chunked vector-friendly documents for semantic retrieval

## Why This Design
Aggregator payloads are deep, inconsistent, and fast-changing. A single database schema cannot safely optimize for all of:
- Source fidelity
- Product performance
- LLM retrieval quality

This architecture separates concerns while preserving traceability end-to-end.

## Document Map
1. [01-Canonical Property Document](01-Canonical-Property-Document.md)
2. [02-Ingestion and Normalization Pipeline](02-Ingestion-and-Normalization-Pipeline.md)
3. [03-RAG Chunking and Retrieval](03-RAG-Chunking-and-Retrieval.md)
4. [04-Storage, Indexing, and Operations](04-Storage-Indexing-and-Operations.md)
5. [GCP Blueprint/00-Overview](GCP%20Blueprint/00-Overview.md)

## Core Principles
1. Preserve raw source data unchanged for reprocessing and audits.
2. Normalize into a stable canonical schema with schema versioning.
3. Generate retrieval chunks with rich metadata for filter-first semantic retrieval.
4. Keep legal disclosure and fee transparency fields first-class.
5. Require source attribution and freshness constraints in every retrieval path.

## System Layers
1. Raw Layer
- Untouched aggregator payloads.
- Immutable, append-only storage.

2. Canonical Layer
- Stable property document model.
- Field-level normalization and confidence signals.

3. Retrieval Layer
- Purpose-built chunks with embeddings.
- Chunk metadata aligned with product and legal requirements.

See details in [01-Canonical Property Document](01-Canonical-Property-Document.md) and [03-RAG Chunking and Retrieval](03-RAG-Chunking-and-Retrieval.md).

## Expected Outcomes
1. Faster onboarding of new aggregators.
2. Better LLM answer quality with explicit provenance.
3. Reduced migration risk through schema versioning.
4. Clear separation between app data and retrieval artifacts.

## Scope Boundaries
In scope:
- Property/listing source ingestion and normalization
- RAG storage and retrieval patterns
- Governance, freshness, and legal-safe retrieval

Out of scope:
- UI design for retrieval controls
- Vendor-specific embedding model decisions
- Detailed infra-as-code deployment steps

See rollout sequence in [04-Storage, Indexing, and Operations](04-Storage-Indexing-and-Operations.md).

For optional managed retrieval on Google Cloud with feature-flag and budget controls, see [GCP Blueprint/00-Overview](GCP%20Blueprint/00-Overview.md).
