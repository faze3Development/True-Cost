# Operations and Rollout

## Purpose
Provide an implementation sequence and runbook for introducing optional Vertex retrieval safely.

Related docs:
1. [00-Overview](00-Overview.md)
2. [01-Vertex-Architecture](01-Vertex-Architecture.md)
3. [02-Cost-Control-and-Feature-Flags](02-Cost-Control-and-Feature-Flags.md)
4. [../02-Ingestion-and-Normalization-Pipeline](../02-Ingestion-and-Normalization-Pipeline.md)

## Phase Plan

### Phase 1: Plumbing
1. Add retrieval provider abstraction in backend.
2. Keep local provider as default.
3. Add mode and budget flags.

Exit criteria:
1. Local provider path unchanged.
2. Flags are runtime-configurable.

### Phase 2: GCP Index Path
1. Implement chunk-to-Vertex indexing adapter.
2. Push only a small representative dataset.
3. Validate filter behavior and metadata fidelity.

Exit criteria:
1. Indexed chunks pass sampling audits.
2. Required metadata is available for querying.

### Phase 3: Shadow Evaluation
1. Enable hybrid_shadow mode for limited traffic.
2. Compare quality and latency versus local baseline.
3. Record spend daily.

Exit criteria:
1. Citation quality equal or better than local path.
2. Latency within target SLO.
3. Spend within planned envelope.

### Phase 4: Assist Mode
1. Enable hybrid_assist for fallback and re-rank support.
2. Keep local as authoritative path initially.

Exit criteria:
1. Assist mode improves answer quality in target intents.
2. No policy regressions on disclosure/attribution.

### Phase 5: Optional Primary
1. Move to google_cloud_primary only if approved by quality and cost review.
2. Keep local fallback and kill switches active.

Exit criteria:
1. Stable operational performance for 30 days.
2. Budget and quality targets consistently met.

## Backend Contracts

### Retrieval Request Contract
1. queryText
2. hardFilters
3. freshnessPolicy
4. compliancePolicy
5. providerModeOverride optional

### Retrieval Response Contract
1. providerUsed
2. chunkResults
3. sourceAttributions
4. freshnessStatus
5. policyChecks

## Incident Playbook
1. Budget spike
- Switch mode to local_only
- Open incident and attach spend dashboard

2. Latency degradation
- Reduce GCP request rate
- Switch to hybrid_shadow or local_only

3. Retrieval quality regression
- Disable assist behavior
- Keep shadow on for diagnostics only

## Weekly Review Template
1. Quality metrics
- citation coverage
- relevance score
- disclosure compliance rate

2. Performance metrics
- p50 and p95 retrieval latency
- timeout rate

3. Cost metrics
- daily spend
- projected monthly spend
- cost per 1k queries

4. Decision
- keep mode
- increase traffic
- reduce traffic
- disable GCP path
