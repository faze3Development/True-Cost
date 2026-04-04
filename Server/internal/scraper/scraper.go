// Package scraper provides a chromedp-based web scraper for extracting rental
// pricing data from property websites.
package scraper

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/chromedp/cdproto/network"
	"github.com/chromedp/chromedp"
	"go.uber.org/zap"
)

const extractionVersion = "dom-v2"

// UnitData is the pricing payload returned for a single unit by the scraper.
type UnitData struct {
	UnitNumber      string  `json:"unit_number"`
	FloorplanName   string  `json:"floorplan_name"`
	Bedrooms        float64 `json:"bedrooms"`
	Bathrooms       float64 `json:"bathrooms"`
	SquareFeet      int     `json:"square_feet"`
	AdvertisedRent  float64 `json:"advertised_rent"`
	ConcessionText  string  `json:"concession_text"`
	EffectiveRent   float64 `json:"effective_rent"`
	IsAvailable     bool    `json:"is_available"`
	ConfidenceScore int     `json:"confidence_score"`
}

// ScrapedUnit represents the raw data pulled directly from the DOM before
// normalization. Prices stay stringly until parsed to reduce brittle parsing
// logic inside the injected JavaScript.
type ScrapedUnit struct {
	UnitNumber       string `json:"unitNumber"`
	FloorplanName    string `json:"floorplanName"`
	Price            string `json:"price"`
	Beds             string `json:"beds"`
	Baths            string `json:"baths"`
	SquareFeet       string `json:"squareFeet"`
	Concessions      string `json:"concessions"`
	FeeDetail        string `json:"feeDetail"`
	MonthlyFees      string `json:"monthlyFees"`
	AvailabilityText string `json:"availabilityText"`
	IsAvailable      bool   `json:"isAvailable"`
}

// ExtractionMetadata carries raw scrape context for downstream normalization
// and canonical document pipelines.
type ExtractionMetadata struct {
	TargetURL           string    `json:"target_url"`
	PageTitle           string    `json:"page_title,omitempty"`
	ScrapedAt           time.Time `json:"scraped_at"`
	ExtractionVersion   string    `json:"extraction_version"`
	RawUnitsJSON        string    `json:"raw_units_json,omitempty"`
	RawListingJSON      string    `json:"raw_listing_json,omitempty"`
	RawListingURL       string    `json:"raw_listing_url,omitempty"`
	RawNetworkJSONCount int       `json:"raw_network_json_count,omitempty"`
	RawCardCount        int       `json:"raw_card_count,omitempty"`
	ParsedUnitCount     int       `json:"parsed_unit_count,omitempty"`
	RawImageURL         string    `json:"raw_image_url,omitempty"`
	NormalizedImageURL  string    `json:"normalized_image_url,omitempty"`
}

// ExtractionResult is the richer scrape output contract for future canonical
// ingestion and retrieval pipelines.
type ExtractionResult struct {
	Units    []UnitData         `json:"units"`
	ImageURL string             `json:"image_url,omitempty"`
	Metadata ExtractionMetadata `json:"metadata"`
}

type capturedNetworkJSON struct {
	RequestID network.RequestID
	URL       string
	MimeType  string
}

// getRandomUserAgent helps avoid basic bot-fingerprinting.
func getRandomUserAgent() string {
	pool := []string{
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
	}
	if len(pool) == 0 {
		return "Mozilla/5.0 (compatible; TrueCostBot/1.0)"
	}
	rand.Seed(time.Now().UnixNano())
	return pool[rand.Intn(len(pool))]
}

// extractionJS injects a compact DOM-scrape routine. Map these selectors per
// provider (Yardi/RealPage/Entrata) as you expand coverage.
const extractionJS = `
(() => {
	let results = [];
	let cards = document.querySelectorAll('.unit-card-container, .floorplan-card, .unit-card, .floorplan, [class*="floorplan-card"], [class*="unit-card"]');

	const textFrom = (root, selectors) => {
		for (const selector of selectors) {
			const el = root.querySelector(selector);
			if (!el) continue;
			const txt = (el.innerText || el.textContent || '').trim();
			if (txt) return txt;
		}
		return '';
	};

	const firstGroup = (text, regex) => {
		if (!text) return '';
		const m = text.match(regex);
		return m && m[1] ? m[1].trim() : '';
	};

	cards.forEach((card, index) => {
		const blockText = (card.innerText || '').trim();

		let unit = textFrom(card, ['.unit-number', '[data-testid*="unit"]', '[class*="unitNumber"]']);
		let floorplan = textFrom(card, ['.floorplan-name', '.plan-name', '.floorplan-title', '[data-testid*="floorplan"]', 'h2', 'h3']);
		let price = textFrom(card, ['.rent-price', '.pricing', '.price-range', '[class*="rent" i]']);
		let beds = textFrom(card, ['.beds', '.bedrooms', '[class*="bed" i]']) || firstGroup(blockText, /(\d+(?:\.\d+)?)\s*(?:bed|br)s?/i);
		let baths = textFrom(card, ['.baths', '.bathrooms', '[class*="bath" i]']) || firstGroup(blockText, /(\d+(?:\.\d+)?)\s*(?:bath|ba)s?/i);
		let sqft = textFrom(card, ['.sqft', '.square-feet', '[class*="sqft" i]']) || firstGroup(blockText, /(\d{2,5})\s*(?:sq\.?\s*ft|square\s*feet|sf)/i);
		let promo = textFrom(card, ['.special-offer', '.concession-banner', '[class*="concession" i]']) || 'None';
		let feeDetail = textFrom(card, ['.detail', '.fee-detail', '.fee-disclosure', '[class*="fee" i]']);
		let monthlyFees = textFrom(card, ['.monthly-fees', '.total-monthly-price', '[class*="monthly" i]']);
		let availability = textFrom(card, ['.availability-status', '[class*="availability" i]']);

		if (!price) {
			price = firstGroup(blockText, /(\$\s*[\d,]+(?:\s*-\s*\$?\s*[\d,]+)?)/i);
		}

		if (!unit && floorplan) {
			unit = floorplan;
		}

		if (!unit) {
			unit = ` + "`" + `card-${index + 1}` + "`" + `;
		}

		if (price) {
			results.push({
				unitNumber: unit,
				floorplanName: floorplan,
				price: price,
				beds: beds,
				baths: baths,
				squareFeet: sqft,
				concessions: promo,
				feeDetail: feeDetail,
				monthlyFees: monthlyFees,
				availabilityText: availability,
				isAvailable: !availability.toLowerCase().includes("unavailable")
			});
		}
	});
	return JSON.stringify(results);
})();
`

// imageExtractionJS attempts to extract a representative property image URL
// without downloading the image. Prefer OpenGraph/Twitter metadata, then
// fall back to common “hero” <img> patterns.
const imageExtractionJS = `
(() => {
	function metaContent(selector) {
		const el = document.querySelector(selector);
		if (!el) return "";
		const content = el.getAttribute('content') || "";
		return content.trim();
	}

	let url =
		metaContent('meta[property="og:image"]') ||
		metaContent('meta[name="og:image"]') ||
		metaContent('meta[name="twitter:image"]') ||
		metaContent('meta[property="twitter:image"]');

	if (!url) {
		const img = document.querySelector(
			'img[src], picture img[src], .hero img[src], .hero-image img[src], .carousel img[src], .carousel-item img[src]'
		);
		if (img) url = (img.getAttribute('src') || "").trim();
	}

	if (!url) {
		const hero = document.querySelector('[style*="background-image"]');
		if (hero) {
			const style = hero.getAttribute('style') || "";
			const match = style.match(/background-image\s*:\s*url\((['"]?)(.*?)\1\)/i);
			if (match && match[2]) url = (match[2] || "").trim();
		}
	}

	return (url || "").trim();
})();
`

// ExtractPricing navigates to the property URL, executes the frontend's pricing
// JavaScript, and returns normalized unit pricing data using the specified timeout
// settings.
func ExtractPricing(targetURL string, scraperTimeout time.Duration, scraperSleep time.Duration, confidenceScore int) ([]UnitData, string, error) {
	result, err := ExtractPricingDetailed(targetURL, scraperTimeout, scraperSleep, confidenceScore)
	if err != nil {
		return nil, "", err
	}

	return result.Units, result.ImageURL, nil
}

// ExtractPricingDetailed performs the same scrape as ExtractPricing and returns
// additional metadata needed for canonical property-document pipelines.
func ExtractPricingDetailed(targetURL string, scraperTimeout time.Duration, scraperSleep time.Duration, confidenceScore int) (ExtractionResult, error) {
	zap.L().Info("Starting scrape job", zap.String("url", targetURL))

	opts := append(chromedp.DefaultExecAllocatorOptions[:],
		chromedp.Flag("disable-gpu", true),
		chromedp.Flag("no-sandbox", true), // Required on Cloud Run
		chromedp.Flag("disable-dev-shm-usage", true),
		chromedp.Flag("disable-blink-features", "AutomationControlled"),
		chromedp.UserAgent(getRandomUserAgent()),
	)

	allocCtx, cancelAlloc := chromedp.NewExecAllocator(context.Background(), opts...)
	defer cancelAlloc()

	ctx, cancelCtx := chromedp.NewContext(allocCtx)
	defer cancelCtx()

	ctx, cancelTimeout := context.WithTimeout(ctx, scraperTimeout)
	defer cancelTimeout()

	var candidates []capturedNetworkJSON
	var candidatesMu sync.Mutex
	chromedp.ListenTarget(ctx, func(ev interface{}) {
		resp, ok := ev.(*network.EventResponseReceived)
		if !ok {
			return
		}

		if resp.Type != network.ResourceTypeXHR && resp.Type != network.ResourceTypeFetch {
			return
		}

		mime := strings.ToLower(strings.TrimSpace(resp.Response.MimeType))
		if !strings.Contains(mime, "json") {
			return
		}

		candidatesMu.Lock()
		candidates = append(candidates, capturedNetworkJSON{
			RequestID: resp.RequestID,
			URL:       resp.Response.URL,
			MimeType:  resp.Response.MimeType,
		})
		candidatesMu.Unlock()
	})

	var rawJSON string
	var pageTitle string

	err := chromedp.Run(ctx,
		network.Enable(),
		chromedp.Navigate(targetURL),
		chromedp.WaitVisible(`.unit-card-container, .floorplan-card`, chromedp.ByQuery),
		chromedp.Sleep(scraperSleep),
		chromedp.Title(&pageTitle),
		chromedp.Evaluate(extractionJS, &rawJSON),
	)
	if err != nil {
		zap.L().Error("Chromedp execution failed", zap.String("url", targetURL), zap.Error(err))
		return ExtractionResult{}, fmt.Errorf("scraping failed: %w", err)
	}

	// Best-effort: image URL extraction should never fail the pricing scrape.
	var rawImageURL string
	if err := chromedp.Run(ctx, chromedp.Evaluate(imageExtractionJS, &rawImageURL)); err != nil {
		zap.L().Debug("Image extraction failed", zap.String("url", targetURL), zap.Error(err))
		rawImageURL = ""
	}
	imageURL := normalizeImageURL(targetURL, rawImageURL)

	candidatesMu.Lock()
	candidateCopy := append([]capturedNetworkJSON(nil), candidates...)
	candidatesMu.Unlock()

	rawListingJSON, rawListingURL, rawNetworkJSONCount := extractBestNetworkJSON(ctx, candidateCopy)

	var scraped []ScrapedUnit
	if err := json.Unmarshal([]byte(rawJSON), &scraped); err != nil {
		zap.L().Error("Failed to parse scraped JSON", zap.String("data", rawJSON), zap.Error(err))
		return ExtractionResult{}, fmt.Errorf("json unmarshal failed: %w", err)
	}

	units := make([]UnitData, 0, len(scraped))
	for _, su := range scraped {
		price := parseMoney(su.Price)
		effective := price
		if effective == 0 {
			effective = price
		}

		concessionText := strings.TrimSpace(su.Concessions)
		if feeDetail := strings.TrimSpace(su.FeeDetail); feeDetail != "" {
			if concessionText == "" || strings.EqualFold(concessionText, "none") {
				concessionText = feeDetail
			} else {
				concessionText = concessionText + " | Fees: " + feeDetail
			}
		}

		if monthlyFees := strings.TrimSpace(su.MonthlyFees); monthlyFees != "" {
			if concessionText == "" || strings.EqualFold(concessionText, "none") {
				concessionText = "Monthly Fees: " + monthlyFees
			} else {
				concessionText = concessionText + " | Monthly Fees: " + monthlyFees
			}
		}

		if availability := strings.TrimSpace(su.AvailabilityText); availability != "" {
			if concessionText == "" || strings.EqualFold(concessionText, "none") {
				concessionText = "Availability: " + availability
			} else {
				concessionText = concessionText + " | Availability: " + availability
			}
		}

		if concessionText == "" {
			concessionText = "None"
		}

		units = append(units, UnitData{
			UnitNumber:      su.UnitNumber,
			FloorplanName:   strings.TrimSpace(su.FloorplanName),
			Bedrooms:        parseFirstFloat(su.Beds),
			Bathrooms:       parseFirstFloat(su.Baths),
			SquareFeet:      parseFirstInt(su.SquareFeet),
			AdvertisedRent:  price,
			ConcessionText:  concessionText,
			EffectiveRent:   effective,
			IsAvailable:     su.IsAvailable,
			ConfidenceScore: confidenceScore,
		})
	}

	zap.L().Info("Scrape successful", zap.String("url", targetURL), zap.Int("units_found", len(units)))

	return ExtractionResult{
		Units:    units,
		ImageURL: imageURL,
		Metadata: ExtractionMetadata{
			TargetURL:           targetURL,
			PageTitle:           pageTitle,
			ScrapedAt:           time.Now().UTC(),
			ExtractionVersion:   extractionVersion,
			RawUnitsJSON:        rawJSON,
			RawListingJSON:      rawListingJSON,
			RawListingURL:       rawListingURL,
			RawNetworkJSONCount: rawNetworkJSONCount,
			RawCardCount:        len(scraped),
			ParsedUnitCount:     len(units),
			RawImageURL:         rawImageURL,
			NormalizedImageURL:  imageURL,
		},
	}, nil
}

func extractBestNetworkJSON(ctx context.Context, candidates []capturedNetworkJSON) (string, string, int) {
	if len(candidates) == 0 {
		return "", "", 0
	}

	bestPayload := ""
	bestURL := ""
	bestScore := -1
	jsonCount := 0

	for i := len(candidates) - 1; i >= 0; i-- {
		body, err := network.GetResponseBody(candidates[i].RequestID).Do(ctx)
		if err != nil {
			continue
		}

		decoded := strings.TrimSpace(string(body))
		if !isJSONLike(decoded) {
			continue
		}

		jsonCount++
		score := scoreListingPayload(decoded, candidates[i].URL)
		if score > bestScore {
			bestScore = score
			bestPayload = decoded
			bestURL = candidates[i].URL
		}
	}

	if bestPayload == "" {
		return "", "", jsonCount
	}

	return truncateForStorage(bestPayload, 1_500_000), bestURL, jsonCount
}

func isJSONLike(input string) bool {
	trimmed := strings.TrimSpace(input)
	if trimmed == "" {
		return false
	}
	return strings.HasPrefix(trimmed, "{") || strings.HasPrefix(trimmed, "[")
}

func scoreListingPayload(payload string, sourceURL string) int {
	lower := strings.ToLower(payload)
	urlLower := strings.ToLower(sourceURL)
	score := 0

	if strings.Contains(lower, `"listing"`) {
		score += 4
	}
	if strings.Contains(lower, `"rentformat"`) {
		score += 4
	}
	if strings.Contains(lower, `"propertyname"`) {
		score += 2
	}
	if strings.Contains(lower, `"propertyurl"`) {
		score += 2
	}
	if strings.Contains(lower, `"rentrollups"`) {
		score += 2
	}

	// Alternate report-style schemas (top-level data[] with subject/comps/edits).
	if strings.Contains(lower, `"data"`) {
		score += 2
	}
	if strings.Contains(lower, `"subject"`) {
		score += 4
	}
	if strings.Contains(lower, `"comparable_addresses"`) {
		score += 3
	}
	if strings.Contains(lower, `"property_edits"`) {
		score += 3
	}
	if strings.Contains(lower, `"view_preferences"`) {
		score += 2
	}
	if strings.Contains(lower, `"email_schedule"`) {
		score += 2
	}
	if strings.Contains(lower, `"access_users"`) {
		score += 2
	}
	if strings.Contains(lower, `"organization_visibility"`) {
		score += 2
	}
	if strings.Contains(lower, `"building_name"`) {
		score += 2
	}
	if strings.Contains(lower, `"street_address"`) {
		score += 2
	}
	if strings.Contains(lower, `"number_units"`) {
		score += 2
	}
	if strings.Contains(lower, `"year_built"`) {
		score += 2
	}
	if strings.Contains(urlLower, "apartments.com") {
		score++
	}
	if strings.Contains(urlLower, "listing") || strings.Contains(urlLower, "placard") || strings.Contains(urlLower, "propertycard") {
		score++
	}
	if strings.Contains(urlLower, "report") || strings.Contains(urlLower, "property_reports") {
		score++
	}

	// Prefer richer payloads over tiny metadata wrappers.
	if len(lower) > 20_000 {
		score += 4
	} else if len(lower) > 8_000 {
		score += 3
	} else if len(lower) > 3_000 {
		score += 2
	} else if len(lower) > 1_000 {
		score += 1
	} else if len(lower) < 200 {
		score -= 2
	}

	return score
}

func truncateForStorage(input string, maxBytes int) string {
	if maxBytes <= 0 || len(input) <= maxBytes {
		return input
	}
	return input[:maxBytes]
}

var firstNumberRE = regexp.MustCompile(`[-+]?\d*\.?\d+`)

func normalizeImageURL(pageURL string, candidate string) string {
	candidate = strings.TrimSpace(candidate)
	if candidate == "" {
		return ""
	}

	u, err := url.Parse(candidate)
	if err != nil {
		return ""
	}

	// Ignore non-network URLs.
	switch strings.ToLower(u.Scheme) {
	case "data", "blob", "javascript":
		return ""
	}

	// Protocol-relative (e.g. //cdn.example.com/image.jpg)
	if u.Scheme == "" && u.Host != "" {
		scheme := "https"
		if base, err := url.Parse(pageURL); err == nil && base.Scheme != "" {
			scheme = base.Scheme
		}
		u.Scheme = scheme
		return u.String()
	}

	// Already absolute.
	if u.IsAbs() {
		if u.Scheme != "http" && u.Scheme != "https" {
			return ""
		}
		return u.String()
	}

	base, err := url.Parse(pageURL)
	if err != nil {
		return ""
	}

	abs := base.ResolveReference(u)
	if abs.Scheme != "http" && abs.Scheme != "https" {
		return ""
	}
	return abs.String()
}

func parseMoney(input string) float64 {
	cleaned := strings.TrimSpace(input)
	cleaned = strings.ReplaceAll(cleaned, ",", "")
	cleaned = strings.ReplaceAll(cleaned, "$", "")
	parts := strings.Fields(cleaned)
	if len(parts) > 0 {
		cleaned = parts[0]
	}
	val, err := strconv.ParseFloat(cleaned, 64)
	if err != nil {
		return 0
	}
	return val
}

func parseFirstFloat(input string) float64 {
	m := firstNumberRE.FindString(strings.TrimSpace(input))
	if m == "" {
		return 0
	}
	v, err := strconv.ParseFloat(m, 64)
	if err != nil {
		return 0
	}
	return v
}

func parseFirstInt(input string) int {
	v := parseFirstFloat(input)
	if v <= 0 {
		return 0
	}
	return int(v)
}
