package truecost

import "github.com/faze3Development/true-cost/Server/internal/models"

func MandatoryFeeTotal(fees models.FeeStructure) float64 {
	return fees.TrashFee + fees.AmenityFee + fees.PackageFee + fees.ParkingFee
}

func ComputeTrueCost(effectiveRent float64, fees models.FeeStructure) float64 {
	return ComputeTrueCostWithFees(effectiveRent, MandatoryFeeTotal(fees))
}

func ComputeTrueCostWithFees(effectiveRent, totalMandatoryFees float64) float64 {
	return effectiveRent + totalMandatoryFees
}
