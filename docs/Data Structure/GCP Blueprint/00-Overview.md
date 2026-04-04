# GCP Retrieval Blueprint (Optional Mode)

## Purpose
This blueprint defines an optional Google Cloud retrieval path for True-Cost using Vertex AI Search and related managed services.

This mode is designed to be:
1. Enabled by feature flags
2. Degradable to local retrieval mode
3. Disabled quickly if spend exceeds budget

Related docs:
1. [01-Vertex-Architecture](01-Vertex-Architecture.md)
2. [02-Cost-Control-and-Feature-Flags](02-Cost-Control-and-Feature-Flags.md)
3. [03-Operations-and-Rollout](03-Operations-and-Rollout.md)
4. [../03-RAG-Chunking-and-Retrieval](../03-RAG-Chunking-and-Retrieval.md)
5. [../04-Storage, Indexing, and Operations](../04-Storage-Indexing-and-Operations.md)

## Decision Summary
Recommended app type for your use case:
1. Custom search (general)

Not recommended as primary mode for your pipeline:
1. Site search with AI mode (best for web crawling workflows)

## Operating Modes
1. local_only
- Use internal retrieval stack only

2. hybrid_shadow
- Local retrieval is authoritative
- GCP retrieval runs in shadow mode for quality and cost comparison

3. hybrid_assist
- Local retrieval first
- GCP retrieval used for fallback and re-ranking

4. google_cloud_primary
- GCP retrieval is primary
- Local retrieval remains emergency fallback

## Success Criteria
1. Retrieval quality improves versus local baseline.
2. Source attribution and freshness controls remain enforced.
3. Spend remains under configured budget thresholds.
4. Mode can be switched without deployment.
