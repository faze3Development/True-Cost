// Package scraper provides a chromedp-based web scraper for extracting rental
// pricing data from property websites.
package scraper

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/chromedp/chromedp"
	"go.uber.org/zap"
)

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
	UnitNumber  string `json:"unitNumber"`
	Price       string `json:"price"`
	Concessions string `json:"concessions"`
	IsAvailable bool   `json:"isAvailable"`
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
	let cards = document.querySelectorAll('.unit-card-container, .floorplan-card');

	cards.forEach(card => {
		let unit = card.querySelector('.unit-number')?.innerText.trim() || "";
		let price = card.querySelector('.rent-price, .pricing')?.innerText.trim() || "";
		let promo = card.querySelector('.special-offer, .concession-banner')?.innerText.trim() || "None";
		let availability = card.querySelector('.availability-status')?.innerText.trim() || "";

		if (unit && price) {
			results.push({
				unitNumber: unit,
				price: price,
				concessions: promo,
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

	var rawJSON string

	err := chromedp.Run(ctx,
		chromedp.Navigate(targetURL),
		chromedp.WaitVisible(`.unit-card-container, .floorplan-card`, chromedp.ByQuery),
		chromedp.Sleep(scraperSleep),
		chromedp.Evaluate(extractionJS, &rawJSON),
	)
	if err != nil {
		zap.L().Error("Chromedp execution failed", zap.String("url", targetURL), zap.Error(err))
		return nil, "", fmt.Errorf("scraping failed: %w", err)
	}

	// Best-effort: image URL extraction should never fail the pricing scrape.
	var rawImageURL string
	if err := chromedp.Run(ctx, chromedp.Evaluate(imageExtractionJS, &rawImageURL)); err != nil {
		zap.L().Debug("Image extraction failed", zap.String("url", targetURL), zap.Error(err))
		rawImageURL = ""
	}
	imageURL := normalizeImageURL(targetURL, rawImageURL)

	var scraped []ScrapedUnit
	if err := json.Unmarshal([]byte(rawJSON), &scraped); err != nil {
		zap.L().Error("Failed to parse scraped JSON", zap.String("data", rawJSON), zap.Error(err))
		return nil, "", fmt.Errorf("json unmarshal failed: %w", err)
	}

	units := make([]UnitData, 0, len(scraped))
	for _, su := range scraped {
		price := parseMoney(su.Price)
		effective := price
		if effective == 0 {
			effective = price
		}

		units = append(units, UnitData{
			UnitNumber:      su.UnitNumber,
			FloorplanName:   "",
			Bedrooms:        0,
			Bathrooms:       0,
			SquareFeet:      0,
			AdvertisedRent:  price,
			ConcessionText:  su.Concessions,
			EffectiveRent:   effective,
			IsAvailable:     su.IsAvailable,
			ConfidenceScore: confidenceScore,
		})
	}

	zap.L().Info("Scrape successful", zap.String("url", targetURL), zap.Int("units_found", len(units)))
	return units, imageURL, nil
}

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
