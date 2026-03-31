// Package scraper provides a chromedp-based web scraper for extracting rental
// pricing data from property websites.
package scraper

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/chromedp/chromedp"
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

// scraperConfig holds placeholder values for proxy rotation and user-agent
// spoofing.  Replace the Proxies slice with real proxy URLs before deploying.
var scraperConfig = struct {
	// Proxies is a list of HTTP(S) proxy URLs for rotation.
	// Format: "http://user:pass@host:port"
	Proxies []string
	// UserAgents is a pool of User-Agent strings to cycle through.
	UserAgents []string
}{
	Proxies: []string{
		// TODO: populate with real residential proxy URLs
		// "http://proxy1.example.com:8080",
		// "http://proxy2.example.com:8080",
	},
	UserAgents: []string{
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
		"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
	},
}

// extractJS is the JavaScript injected into the page to collect unit/pricing
// data.  It attempts to read common DOM patterns and returns a JSON string.
// Customize the selectors to match the target property website structure.
const extractJS = `
(function() {
  var units = [];
  // Generic selector — override per-property as needed.
  var rows = document.querySelectorAll('[data-unit], .unit-row, .floorplan-card');
  rows.forEach(function(el) {
    units.push({
      unit_number:     (el.dataset.unit     || el.querySelector('.unit-number')?.textContent  || '').trim(),
      floorplan_name:  (el.dataset.floorplan || el.querySelector('.floorplan-name')?.textContent || '').trim(),
      bedrooms:        parseFloat(el.dataset.beds   || el.querySelector('.beds')?.textContent   || '0'),
      bathrooms:       parseFloat(el.dataset.baths  || el.querySelector('.baths')?.textContent  || '0'),
      square_feet:     parseInt(  el.dataset.sqft   || el.querySelector('.sqft')?.textContent   || '0', 10),
      advertised_rent: parseFloat((el.querySelector('.rent, .price')?.textContent || '0').replace(/[^0-9.]/g, '')),
      concession_text: (el.querySelector('.concession, .special')?.textContent || '').trim(),
      effective_rent:  parseFloat((el.querySelector('.effective-rent, .net-rent')?.textContent || '0').replace(/[^0-9.]/g, '')),
      is_available:    !el.classList.contains('unavailable'),
      confidence_score: 80
    });
  });
  return JSON.stringify(units);
})();
`

// ExtractPricing navigates to targetURL using a headless Chrome instance,
// injects JavaScript to extract unit and pricing data from the DOM, and
// returns a slice of UnitData.
//
// The function enforces a 45-second context deadline for the entire browser
// session so that stalled pages do not block the Asynq worker indefinitely.
func ExtractPricing(targetURL string) ([]UnitData, error) {
	// Build chromedp allocator options.
	opts := append(
		chromedp.DefaultExecAllocatorOptions[:],
		// Required for Cloud Run (no user namespace / sandbox).
		chromedp.Flag("no-sandbox", true),
		chromedp.Flag("disable-setuid-sandbox", true),
		// Headless mode.
		chromedp.Flag("headless", true),
		chromedp.Flag("disable-gpu", true),
		// Reduce fingerprinting surface.
		chromedp.Flag("disable-blink-features", "AutomationControlled"),
		// Placeholder: proxy rotation (set via scraperConfig.Proxies when ready).
		// chromedp.Flag("proxy-server", pickProxy()),
		// User-agent spoofing.
		chromedp.UserAgent(pickUserAgent()),
	)

	allocCtx, allocCancel := chromedp.NewExecAllocator(context.Background(), opts...)
	defer allocCancel()

	// 45-second hard deadline for the entire scrape session.
	ctx, cancel := context.WithTimeout(allocCtx, 45*time.Second)
	defer cancel()

	browserCtx, browserCancel := chromedp.NewContext(ctx)
	defer browserCancel()

	var jsonResult string
	err := chromedp.Run(browserCtx,
		chromedp.Navigate(targetURL),
		// Wait for at least one unit element to appear; fall through after 10 s.
		chromedp.Sleep(3*time.Second),
		chromedp.Evaluate(extractJS, &jsonResult),
	)
	if err != nil {
		return nil, fmt.Errorf("chromedp run: %w", err)
	}

	var units []UnitData
	if err := json.Unmarshal([]byte(jsonResult), &units); err != nil {
		return nil, fmt.Errorf("unmarshal scraped json: %w", err)
	}

	// Post-process: if effective_rent is zero, fall back to advertised_rent.
	for i := range units {
		if units[i].EffectiveRent == 0 {
			units[i].EffectiveRent = units[i].AdvertisedRent
		}
	}

	slog.Info("scraper: extracted units",
		slog.String("url", targetURL),
		slog.Int("count", len(units)),
	)

	return units, nil
}

// pickUserAgent returns a user-agent string from the rotation pool.
// It falls back to a default value when the pool is empty.
func pickUserAgent() string {
	if len(scraperConfig.UserAgents) == 0 {
		return "Mozilla/5.0 (compatible; TrueCostBot/1.0)"
	}
	// Rotate deterministically by time (minute bucket) for simplicity.
	idx := int(time.Now().Unix()/60) % len(scraperConfig.UserAgents)
	return scraperConfig.UserAgents[idx]
}
