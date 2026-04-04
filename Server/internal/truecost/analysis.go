package truecost

import "github.com/faze3Development/true-cost/Server/internal/models"

func BuildDealAnalysis(record models.PriceRecord, fees models.FeeStructure) AnalysisPayload {
	totalMandatoryFees := MandatoryFeeTotal(fees)

	payload := AnalysisPayload{
		AdvertisedRent:     record.AdvertisedRent,
		TrueCost:           ComputeTrueCostWithFees(record.EffectiveRent, totalMandatoryFees),
		TotalMandatoryFees: totalMandatoryFees,
		DealScore:          0,
		EstimateType:       estimateTypeAlgorithmic,
		FeeDisclosure:      feeDisclosure(totalMandatoryFees),
		LegalDisclaimers:   append([]string(nil), requiredLegalDisclaimers...),
		Guardrails: GuardrailStatus{
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
