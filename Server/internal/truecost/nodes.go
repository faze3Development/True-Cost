package truecost

import (
	"strings"

	"github.com/faze3Development/true-cost/Server/internal/models"
)

func financialNodeScore(record models.PriceRecord, totalMandatoryFees float64) float64 {
	baseline := record.AdvertisedRent + totalMandatoryFees
	if baseline == 0 {
		return 0
	}
	trueCost := ComputeTrueCostWithFees(record.EffectiveRent, totalMandatoryFees)
	return ((baseline - trueCost) / baseline) * 100
}

func spatialNodeScore() float64 {
	return 0
}

func econometricNodeScore(record models.PriceRecord, totalMandatoryFees float64) float64 {
	// Fee-aware econometric residual blends concession effect with fee burden.
	if record.AdvertisedRent == 0 {
		return 0
	}
	concessionRate := ((record.AdvertisedRent - record.EffectiveRent) / record.AdvertisedRent) * 100
	feeBurdenRate := (totalMandatoryFees / record.AdvertisedRent) * 100
	return concessionRate - (feeBurdenRate * feeBurdenPenaltyWeight)
}

func marketTimingNodeScore(concessionText string) float64 {
	normalized := strings.ToLower(strings.TrimSpace(concessionText))
	if normalized == "" {
		return 0
	}
	if strings.Contains(normalized, "free") || strings.Contains(normalized, "concession") {
		return marketTimingConcessionBoost
	}
	return 0
}
