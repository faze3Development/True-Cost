# Cost Control and Feature Flags

## Purpose
Define how to operate GCP retrieval as an optional capability with budget-aware controls.

Related docs:
1. [00-Overview](00-Overview.md)
2. [01-Vertex-Architecture](01-Vertex-Architecture.md)
3. [03-Operations-and-Rollout](03-Operations-and-Rollout.md)

## Feature Flags
Recommended runtime flags:
1. retrieval.provider.mode
- Values: local_only, hybrid_shadow, hybrid_assist, google_cloud_primary

2. retrieval.provider.google_cloud.enabled
- Boolean hard gate for GCP retrieval path

3. retrieval.provider.google_cloud.shadowPercent
- Integer 0 to 100 for shadow traffic allocation

4. retrieval.provider.google_cloud.maxRequestsPerMinute
- Rate cap for GCP query calls

5. retrieval.provider.google_cloud.maxDailyRequests
- Daily quota cap

6. retrieval.provider.google_cloud.maxMonthlySpendUSD
- Budget cap that triggers automatic fallback

## Budget Guardrail Policy
1. Warning threshold at 60 percent monthly budget.
2. Elevated warning at 80 percent.
3. Auto-switch to local_only at 100 percent.
4. Manual override requires elevated role and audit reason.

## Kill Switches
1. Emergency switch
- retrieval.provider.google_cloud.enabled = false

2. Soft switch
- retrieval.provider.mode = local_only

3. Query cap switch
- retrieval.provider.google_cloud.maxRequestsPerMinute = 0

## Cost Observability
Track these metrics by day and environment:
1. GCP retrieval request count
2. GCP retrieval request errors
3. Average result count
4. Retrieval latency p50, p95, p99
5. Estimated spend to date
6. Cost per 1k queries
7. Share of queries served by each mode

## Quality vs Cost Policy
Mode transitions should be data-driven:
1. Promote to hybrid_assist only if quality lift is meaningful.
2. Promote to google_cloud_primary only if quality lift justifies cost at target volume.
3. Revert to local_only automatically on budget breach or unstable latency.

## Recommended Defaults
1. Start in hybrid_shadow for 2 weeks.
2. Shadow 10 percent of eligible retrieval traffic.
3. Cap daily requests and monthly spend conservatively.
4. Review quality and cost weekly.

## Audit Requirements
Every mode change should log:
1. changedBy
2. previousMode
3. nextMode
4. reason
5. ticket or incident reference
6. timestamp
