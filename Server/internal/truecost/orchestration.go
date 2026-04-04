package truecost

import "math"

func orchestratorConsensusScore(financialScore, spatialScore, econometricScore, marketTimingScore float64) (float64, bool) {
	if math.Abs(financialScore-econometricScore) > maxDealScoreCrossValDiff {
		return 0, false
	}
	consensus := (financialScore + spatialScore + econometricScore + marketTimingScore) / 4
	return consensus, true
}

func defaultAgentStateGraph() []AgentStateEdge {
	return []AgentStateEdge{
		{From: agentNodeDataIngestion, To: agentNodeFinancial},
		{From: agentNodeDataIngestion, To: agentNodeSpatial},
		{From: agentNodeDataIngestion, To: agentNodeEconometric},
		{From: agentNodeDataIngestion, To: agentNodeMarketTiming},
		{From: agentNodeFinancial, To: agentNodeOrchestrator},
		{From: agentNodeSpatial, To: agentNodeOrchestrator},
		{From: agentNodeEconometric, To: agentNodeOrchestrator},
		{From: agentNodeMarketTiming, To: agentNodeOrchestrator},
	}
}
