package truecost

const (
	agentNodeDataIngestion      = "data_ingestion"
	agentNodeFinancial          = "financial_analyst"
	agentNodeSpatial            = "spatial_economist"
	agentNodeEconometric        = "econometrician"
	agentNodeMarketTiming       = "market_timing"
	agentNodeOrchestrator       = "senior_orchestrator"
	estimateTypeAlgorithmic     = "algorithmic_estimate"
	maxDealScoreCrossValDiff    = 15.0
	marketTimingConcessionBoost = 1.0
	feeBurdenPenaltyWeight      = 0.5
)

var requiredLegalDisclaimers = []string{
	"All information provided is deemed reliable but is not guaranteed. Prices and estimated True Costs are subject to change at any point and should be independently reviewed and verified for accuracy",
	"Information is provided exclusively for the consumer's personal, non-commercial use, and may not be used for any purpose other than to identify prospective properties",
	"True Cost and Deal Score outputs are algorithmic estimates and are not binding financial, legal, or real estate advice.",
}
