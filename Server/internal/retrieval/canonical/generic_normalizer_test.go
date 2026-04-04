package canonical

import (
	"context"
	"encoding/json"
	"testing"
	"time"
)

func TestGenericNormalizer_ListingPayload(t *testing.T) {
	n := NewGenericNormalizer()

	payload := map[string]any{
		"PropertyName":     "18308 Streamside Drive",
		"PropertyUrl":      "https://www.apartments.com/18308-streamside-drive-gaithersburg-md-unit-103/b5mb9d9/",
		"PropertyPhotoUrl": "https://images1.apartments.com/photo.jpg",
		"RentFormat": map[string]any{
			"Rents":     "$2,020",
			"BaseRent":  "$2,020",
			"FeeDetail": "<div class=\"detail\"><span>Prices include all required monthly fees.</span></div>",
		},
		"Listing": map[string]any{
			"ListingKey":                  "b5mb9d9",
			"UnitCount":                   1,
			"HasAvailabilities":           true,
			"IsInFeeDisclosureState":      true,
			"IsMonthlyFeesIncludedInRent": false,
			"Address": map[string]any{
				"DeliveryAddress": "18308 Streamside Drive",
				"City":            "Gaithersburg",
				"State":           "MD",
				"PostalCode":      "20879",
				"Country":         "US",
				"Location": map[string]any{
					"Latitude":  39.15537,
					"Longitude": -77.16913,
				},
			},
			"RentRollups": []any{
				map[string]any{
					"Beds":                 2,
					"MinBaths":             2.0,
					"MaxBaths":             2.0,
					"LowDisplay":           2020,
					"HighDisplay":          2020,
					"MinTotalMonthlyPrice": 2020,
					"MaxTotalMonthlyPrice": 2020,
					"HasAvailabilities":    true,
				},
			},
		},
	}

	rawBytes, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}

	raw := RawEnvelope{
		SourceName:       "apartments_com",
		SourceListingKey: "b5mb9d9",
		CapturedAt:       time.Now().UTC(),
		PayloadHash:      "sha256:testhash",
		Payload:          rawBytes,
	}

	doc, validation, err := n.Normalize(context.Background(), raw)
	if err != nil {
		t.Fatalf("Normalize() error = %v", err)
	}

	if doc.Property.Name != "18308 Streamside Drive" {
		t.Fatalf("expected property name to map, got %q", doc.Property.Name)
	}
	if doc.Geo.City != "Gaithersburg" {
		t.Fatalf("expected city to map, got %q", doc.Geo.City)
	}
	if doc.Pricing.BaseRentMin != 2020 {
		t.Fatalf("expected BaseRentMin 2020, got %v", doc.Pricing.BaseRentMin)
	}
	if doc.Source.ListingKey == "" {
		t.Fatalf("expected source listing key to be populated")
	}
	if validation.Status == ValidationFail {
		t.Fatalf("expected non-fail validation status, got %s", validation.Status)
	}
}

func TestGenericNormalizer_ReportPayload(t *testing.T) {
	n := NewGenericNormalizer()

	payload := map[string]any{
		"data": []any{
			map[string]any{
				"id":        1024.5,
				"public_id": "public-1024-5",
				"name":      "Downtown Office Complex Report",
				"tags":      []any{"office", "downtown"},
				"subject": map[string]any{
					"building_name":  "The Main Building",
					"street_address": "123 Main St",
					"city":           "San Francisco",
					"state":          "CA",
					"zip_code":       "94103",
					"lat":            40.7128,
					"lon":            -74.006,
					"number_units":   314,
				},
				"property_edits": []any{
					map[string]any{
						"management_company": "The Bozzuto Group",
						"building_website":   "https://www.mainbuilding.com",
						"street_view_url":    "https://www.mainbuilding.com/image.jpg",
						"admin_fee":          600,
						"fees": []any{
							map[string]any{"label": "Service Charge", "amount": 150, "frequency": "month"},
						},
					},
				},
			},
		},
	}

	rawBytes, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}

	raw := RawEnvelope{
		SourceName:       "reporting_api",
		SourceListingKey: "",
		CapturedAt:       time.Now().UTC(),
		PayloadHash:      "sha256:reporthash",
		Payload:          rawBytes,
	}

	doc, validation, err := n.Normalize(context.Background(), raw)
	if err != nil {
		t.Fatalf("Normalize() error = %v", err)
	}

	if doc.Property.Name != "The Main Building" {
		t.Fatalf("expected report subject building_name to map, got %q", doc.Property.Name)
	}
	if doc.Property.Type != "office" {
		t.Fatalf("expected inferred type office, got %q", doc.Property.Type)
	}
	if doc.Management == nil || doc.Management.CompanyName != "The Bozzuto Group" {
		t.Fatalf("expected management company mapping")
	}
	if validation.Status == ValidationFail {
		t.Fatalf("expected non-fail validation status, got %s", validation.Status)
	}
}

func TestGenericNormalizer_InvalidPayload(t *testing.T) {
	n := NewGenericNormalizer()
	raw := RawEnvelope{
		SourceName:       "x",
		SourceListingKey: "y",
		CapturedAt:       time.Now().UTC(),
		PayloadHash:      "sha256:bad",
		Payload:          []byte(`[]`),
	}

	_, _, err := n.Normalize(context.Background(), raw)
	if err == nil {
		t.Fatal("expected error for invalid payload root")
	}
}
