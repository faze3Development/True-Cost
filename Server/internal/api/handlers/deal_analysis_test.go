package handlers

import (
	"testing"

	"github.com/faze3Development/true-cost/Server/internal/models"
	"github.com/faze3Development/true-cost/Server/internal/truecost"
)

func TestBuildDealAnalysis_AppendsDisclaimersAndFeeDisclosure(t *testing.T) {
	record := models.PriceRecord{
		AdvertisedRent: 2000,
		EffectiveRent:  1800,
		ConcessionText: "1 month free",
	}
	fees := models.FeeStructure{
		TrashFee:   50,
		AmenityFee: 75,
		PackageFee: 25,
		ParkingFee: 100,
	}

	payload := truecost.BuildDealAnalysis(record, fees)
	if payload.TotalMandatoryFees != 250 {
		t.Fatalf("expected total mandatory fees 250, got %v", payload.TotalMandatoryFees)
	}
	if payload.TrueCost != 2050 {
		t.Fatalf("expected true cost 2050, got %v", payload.TrueCost)
	}
	if len(payload.LegalDisclaimers) < 3 {
		t.Fatalf("expected required legal disclaimers to be appended")
	}
	if payload.FeeDisclosure == "" {
		t.Fatalf("expected fee disclosure to be populated")
	}
	if !payload.Guardrails.InputValidated || !payload.Guardrails.OutputValidated {
		t.Fatalf("expected guardrail checks to pass")
	}
}

func TestBuildDealAnalysis_HardBlocksInvalidInput(t *testing.T) {
	record := models.PriceRecord{
		AdvertisedRent: 1000,
		EffectiveRent:  1200, // invalid: exceeds advertised
	}
	fees := models.FeeStructure{
		TrashFee: 10,
	}

	payload := truecost.BuildDealAnalysis(record, fees)
	if payload.Guardrails.InputValidated {
		t.Fatalf("expected input validation to fail")
	}
	if payload.Guardrails.ProcessingValidated || payload.Guardrails.OutputValidated {
		t.Fatalf("expected downstream guardrails to remain false on hard block")
	}
}
