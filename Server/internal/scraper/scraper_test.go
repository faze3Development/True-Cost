package scraper

import "testing"

func TestNormalizeImageURL(t *testing.T) {
	base := "https://example.com/listings/123"

	tests := []struct {
		name string
		in   string
		want string
	}{
		{
			name: "empty",
			in:   "",
			want: "",
		},
		{
			name: "relative root",
			in:   "/assets/hero-bg.jpg",
			want: "https://example.com/assets/hero-bg.jpg",
		},
		{
			name: "relative path",
			in:   "images/hero.jpg",
			want: "https://example.com/listings/images/hero.jpg",
		},
		{
			name: "protocol relative",
			in:   "//cdn.example.org/hero.jpg",
			want: "https://cdn.example.org/hero.jpg",
		},
		{
			name: "absolute https",
			in:   "https://img.example.org/hero.jpg?x=1",
			want: "https://img.example.org/hero.jpg?x=1",
		},
		{
			name: "absolute http",
			in:   "http://img.example.org/hero.jpg",
			want: "http://img.example.org/hero.jpg",
		},
		{
			name: "data uri ignored",
			in:   "data:image/png;base64,AAAA",
			want: "",
		},
		{
			name: "blob uri ignored",
			in:   "blob:https://example.com/abcd",
			want: "",
		},
		{
			name: "javascript uri ignored",
			in:   "javascript:void(0)",
			want: "",
		},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			got := normalizeImageURL(base, tt.in)
			if got != tt.want {
				t.Fatalf("normalizeImageURL() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestScoreListingPayload_ReportStylePreferred(t *testing.T) {
	reportPayload := `{"data":[{"subject":{"building_name":"The Main Building","street_address":"123 Main St","number_units":314,"year_built":2020},"comparable_addresses":[{}],"property_edits":[{}],"view_preferences":[{}],"email_schedule":{"cron_expression":"0 9 1 * *"},"access_users":[{}],"organization_visibility":"editor"}]}`
	listingPayload := `{"Listing":{"ListingKey":"abc"},"RentFormat":{"Rents":"$2,020"},"PropertyName":"Example","PropertyUrl":"https://example.com","RentRollups":[{}]}`

	reportScore := scoreListingPayload(reportPayload, "https://api.example.com/property_reports/1024")
	listingScore := scoreListingPayload(listingPayload, "https://www.example.com/listing/abc")

	if reportScore <= 0 {
		t.Fatalf("expected report payload to receive positive score, got %d", reportScore)
	}

	if listingScore <= 0 {
		t.Fatalf("expected listing payload to receive positive score, got %d", listingScore)
	}
}

func TestScoreListingPayload_TinyJSONPenalty(t *testing.T) {
	tiny := `{"ok":true}`
	rich := `{"data":[{"subject":{"building_name":"A"},"property_edits":[{"admin_fee":600}],"access_users":[{"email":"a@b.com"}]}],"organization_visibility":"editor"}`

	tinyScore := scoreListingPayload(tiny, "https://api.example.com/status")
	richScore := scoreListingPayload(rich, "https://api.example.com/reports/1")

	if richScore <= tinyScore {
		t.Fatalf("expected rich payload score (%d) to be greater than tiny payload score (%d)", richScore, tinyScore)
	}
}
