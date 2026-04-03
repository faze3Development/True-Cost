package handlers

import (
	"fmt"
	"math"
	"strings"

	"github.com/faze3Development/true-cost/Server/internal/models"
)

const (
	agentNodeDataIngestion   = "data_ingestion"
	agentNodeFinancial       = "financial_analyst"
	agentNodeSpatial         = "spatial_economist"
	agentNodeEconometric     = "econometrician"
	agentNodeMarketTiming    = "market_timing"
	agentNodeOrchestrator    = "senior_orchestrator"
	estimateTypeAlgorithmic  = "algorithmic_estimate"
	maxDealScoreCrossValDiff = 15.0
)

var requiredLegalDisclaimers = []string{
	"All information provided is deemed reliable but is not guaranteed. Prices and estimated True Costs are subject to change at any point and should be independently reviewed and verified for accuracy",
	"Information is provided exclusively for the consumer's personal, non-commercial use, and may not be used for any purpose other than to identify prospective properties",
	"True Cost and Deal Score outputs are algorithmic estimates of market value and true cost, and are not binding financial, legal, or real estate advice.",
}

type agentStateEdge struct {
	From string `json:"from"`
	To   string `json:"to"`
}

type guardrailStatus struct {
	InputValidated      bool `json:"inputValidated"`
	ProcessingValidated bool `json:"processingValidated"`
	OutputValidated     bool `json:"outputValidated"`
}

type dealAnalysisPayload struct {
	AdvertisedRent     float64          `json:"advertisedRent"`
	TrueCost           float64          `json:"trueCost"`
	TotalMandatoryFees float64          `json:"totalMandatoryFees"`
	DealScore          float64          `json:"dealScore"`
	EstimateType       string           `json:"estimateType"`
	FeeDisclosure      string           `json:"feeDisclosure"`
	LegalDisclaimers   []string         `json:"legalDisclaimers"`
	Guardrails         guardrailStatus  `json:"guardrails"`
	AgentStateGraph    []agentStateEdge `json:"agentStateGraph,omitempty"`
}

func buildDealAnalysis(record models.PriceRecord, fees models.FeeStructure) dealAnalysisPayload {
	totalMandatoryFees := mandatoryFeeTotal(fees)

	payload := dealAnalysisPayload{
		AdvertisedRent:     record.AdvertisedRent,
		TrueCost:           record.EffectiveRent + totalMandatoryFees,
		TotalMandatoryFees: totalMandatoryFees,
		DealScore:          0,
		EstimateType:       estimateTypeAlgorithmic,
		FeeDisclosure:      feeDisclosure(totalMandatoryFees),
		LegalDisclaimers:   requiredLegalDisclaimers,
		Guardrails: guardrailStatus{
			InputValidated:      false,
			ProcessingValidated: false,
			OutputValidated:     false,
		},
		AgentStateGraph: defaultAgentStateGraph(),
	}

	if !validateInputLayer(record, fees) {
		return payload
	}
	payload.Guardrails.InputValidated = true

	// Specialized node calculations grounded in structured DB fields only.
	financialScore := financialNodeScore(record, totalMandatoryFees)
	spatialScore := spatialNodeScore() // No commute input yet; scaffolded as explicit zero-weight node.
	econometricScore := econometricNodeScore(record, totalMandatoryFees)
	marketTimingScore := marketTimingNodeScore(record.ConcessionText)

	consensusScore, processingValid := orchestratorConsensusScore(financialScore, spatialScore, econometricScore, marketTimingScore)
	if !processingValid {
		return payload
	}

	payload.Guardrails.ProcessingValidated = true
	payload.DealScore = consensusScore
	payload.Guardrails.OutputValidated = validateOutputLayer(payload)
	if !payload.Guardrails.OutputValidated {
		payload.DealScore = 0
	}

	return payload
}

func mandatoryFeeTotal(fees models.FeeStructure) float64 {
	return fees.TrashFee + fees.AmenityFee + fees.PackageFee + fees.ParkingFee
}

func feeDisclosure(totalMandatoryFees float64) string {
	return fmt.Sprintf(
		"Total monthly mandatory fees included in True Cost: $%.2f (trash, amenity, package, parking).",
		totalMandatoryFees,
	)
}

func validateInputLayer(record models.PriceRecord, fees models.FeeStructure) bool {
	if record.AdvertisedRent <= 0 || record.EffectiveRent < 0 {
		return false
	}
	if record.EffectiveRent > record.AdvertisedRent {
		return false
	}
	return fees.TrashFee >= 0 && fees.AmenityFee >= 0 && fees.PackageFee >= 0 && fees.ParkingFee >= 0
}

func validateOutputLayer(payload dealAnalysisPayload) bool {
	if payload.TrueCost < 0 || payload.TotalMandatoryFees < 0 {
		return false
	}
	if payload.EstimateType != estimateTypeAlgorithmic {
		return false
	}
	return len(payload.LegalDisclaimers) >= 3
}

func financialNodeScore(record models.PriceRecord, totalMandatoryFees float64) float64 {
	// Base financial score rewards lower total true cost than advertised+fees.
	baseline := record.AdvertisedRent + totalMandatoryFees
	if baseline == 0 {
		return 0
	}
	trueCost := record.EffectiveRent + totalMandatoryFees
	return ((baseline - trueCost) / baseline) * 100
}

func spatialNodeScore() float64 {
	// Commute/travel cost inputs are not yet available in this endpoint.
	return 0
}

func econometricNodeScore(record models.PriceRecord, totalMandatoryFees float64) float64 {
	// Placeholder residual: concession-implied discount from advertised level.
	if record.AdvertisedRent == 0 {
		return 0
	}
	return ((record.AdvertisedRent - record.EffectiveRent) / (record.AdvertisedRent + totalMandatoryFees)) * 100
}

func marketTimingNodeScore(concessionText string) float64 {
	normalized := strings.ToLower(strings.TrimSpace(concessionText))
	if normalized == "" {
		return 0
	}
	if strings.Contains(normalized, "free") || strings.Contains(normalized, "concession") {
		return 1
	}
	return 0
}

func orchestratorConsensusScore(financialScore, spatialScore, econometricScore, marketTimingScore float64) (float64, bool) {
	if math.Abs(financialScore-econometricScore) > maxDealScoreCrossValDiff {
		return 0, false
	}
	consensus := (financialScore + spatialScore + econometricScore + marketTimingScore) / 4
	return consensus, true
}

func defaultAgentStateGraph() []agentStateEdge {
	return []agentStateEdge{
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
