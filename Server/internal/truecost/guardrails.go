package truecost

import "github.com/faze3Development/true-cost/Server/internal/models"

func validateInputLayer(record models.PriceRecord, fees models.FeeStructure) bool {
	if record.AdvertisedRent <= 0 || record.EffectiveRent < 0 {
		return false
	}
	if record.EffectiveRent > record.AdvertisedRent {
		return false
	}
	return fees.TrashFee >= 0 && fees.AmenityFee >= 0 && fees.PackageFee >= 0 && fees.ParkingFee >= 0
}

func validateOutputLayer(payload AnalysisPayload) bool {
	if payload.TrueCost < 0 || payload.TotalMandatoryFees < 0 {
		return false
	}
	if payload.EstimateType != estimateTypeAlgorithmic {
		return false
	}
	return len(payload.LegalDisclaimers) >= 3
}
