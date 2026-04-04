package canonical

import (
	"testing"
	"time"
)

func TestValidateDocument_Pass(t *testing.T) {
	now := time.Now().UTC()
	doc := PropertyDocument{
		DocumentID:    "prop_123",
		SchemaVersion: "1.0.0",
		Source: Source{
			Name:          "apartments_com",
			ListingKey:    "9vsvv74",
			PropertyURL:   "https://example.com/property",
			RawPayloadRef: "raw://apartments_com/2026/04/04/9vsvv74.json",
		},
		CollectedAt: now,
		Property: PropertyCore{
			Name: "Abberly CenterPointe Apartment Homes",
			Type: "multifamily",
		},
		Geo: Geo{
			AddressLine1: "1900 Abberly Cir",
			City:         "Midlothian",
			State:        "VA",
			PostalCode:   "23114",
			Country:      "US",
			Location: Location{
				Latitude:  37.46362,
				Longitude: -77.66522,
			},
		},
		Pricing: Pricing{
			BaseRentMin: 1646,
			BaseRentMax: 4683,
			Currency:    "USD",
		},
		Units: Units{
			HasAvailabilities: true,
			Rollups: []UnitRollup{
				{Beds: 1, HasAvailabilities: true},
			},
		},
		Compliance: Compliance{
			IsInFeeDisclosureState: true,
			RequiresFeeDisclosure:  true,
			LegalDisclaimers:       []string{"Sample legal disclosure"},
		},
		Provenance: Provenance{
			RawPayloadHash: "sha256:abc",
			ParserVersion:  "normalizer-1.0.0",
			NormalizedAt:   now,
		},
	}

	res := ValidateDocument(doc)
	if res.Status != ValidationPass {
		t.Fatalf("expected validation status %q, got %q", ValidationPass, res.Status)
	}
}

func TestValidateDocument_FailMissingRequired(t *testing.T) {
	res := ValidateDocument(PropertyDocument{})
	if res.Status != ValidationFail {
		t.Fatalf("expected validation status %q, got %q", ValidationFail, res.Status)
	}

	if len(res.Issues) == 0 {
		t.Fatalf("expected validation issues for empty document")
	}
}

func TestValidateDocument_PassWithWarnings(t *testing.T) {
	now := time.Now().UTC()
	doc := PropertyDocument{
		DocumentID:    "prop_123",
		SchemaVersion: "1.0.0",
		Source: Source{
			Name:       "apartments_com",
			ListingKey: "9vsvv74",
		},
		CollectedAt: now,
		Property: PropertyCore{
			Name: "Abberly CenterPointe Apartment Homes",
			Type: "multifamily",
		},
		Geo: Geo{
			AddressLine1: "1900 Abberly Cir",
			City:         "Midlothian",
			State:        "VA",
			PostalCode:   "23114",
			Country:      "US",
			Location: Location{
				Latitude:  37.46362,
				Longitude: -77.66522,
			},
		},
		Pricing: Pricing{
			BaseRentMin: 1646,
			BaseRentMax: 4683,
			Currency:    "USD",
		},
		Units: Units{
			HasAvailabilities: true,
			Rollups:           []UnitRollup{},
		},
		Compliance: Compliance{
			IsInFeeDisclosureState: true,
			RequiresFeeDisclosure:  true,
			LegalDisclaimers:       []string{},
		},
		Provenance: Provenance{
			RawPayloadHash: "sha256:abc",
			ParserVersion:  "normalizer-1.0.0",
			NormalizedAt:   now,
		},
	}

	res := ValidateDocument(doc)
	if res.Status != ValidationPassWithWarnings {
		t.Fatalf("expected validation status %q, got %q", ValidationPassWithWarnings, res.Status)
	}
}
