package canonical

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"regexp"
	"strconv"
	"strings"
	"time"
)

const genericParserVersion = "canonical-normalizer-v1"

var tokenSanitizeRE = regexp.MustCompile(`[^a-zA-Z0-9]+`)
var htmlTagRE = regexp.MustCompile(`<[^>]*>`)

// GenericNormalizer maps known raw payload shapes into the canonical property
// document schema.
type GenericNormalizer struct{}

func NewGenericNormalizer() Normalizer {
	return &GenericNormalizer{}
}

func (n *GenericNormalizer) Normalize(_ context.Context, raw RawEnvelope) (PropertyDocument, ValidationResult, error) {
	if len(raw.Payload) == 0 {
		return PropertyDocument{}, ValidationResult{}, errors.New("empty payload")
	}

	root, err := parseRootMap(raw.Payload)
	if err != nil {
		return PropertyDocument{}, ValidationResult{}, fmt.Errorf("parse payload: %w", err)
	}

	var doc PropertyDocument
	if isReportStylePayload(root) {
		doc = normalizeReportPayload(raw, root)
	} else {
		doc = normalizeListingPayload(raw, root)
	}

	validation := ValidateDocument(doc)
	return doc, validation, nil
}

func parseRootMap(payload []byte) (map[string]any, error) {
	var root map[string]any
	if err := jsonUnmarshal(payload, &root); err != nil {
		return nil, err
	}
	if len(root) == 0 {
		return nil, errors.New("payload must be a non-empty object")
	}
	return root, nil
}

// jsonUnmarshal is extracted for testability without exposing internals.
var jsonUnmarshal = func(payload []byte, out any) error {
	return json.Unmarshal(payload, out)
}

func isReportStylePayload(root map[string]any) bool {
	data := asSlice(root["data"])
	if len(data) == 0 {
		return false
	}
	first := asMap(data[0])
	return len(first) > 0 && (len(asMap(first["subject"])) > 0 || first["property_edits"] != nil)
}

func normalizeListingPayload(raw RawEnvelope, root map[string]any) PropertyDocument {
	listing := asMap(root["Listing"])
	rentFormat := asMap(root["RentFormat"])
	address := asMap(listing["Address"])
	location := asMap(address["Location"])
	rawRollups := asSlice(listing["RentRollups"])

	listingKey := firstNonEmpty(raw.SourceListingKey, asString(listing["ListingKey"]))
	collectedAt := normalizeCapturedAt(raw.CapturedAt)

	doc := NewBaseDocument(normalizeSourceName(raw.SourceName), listingKey, collectedAt)
	doc.DocumentID = buildDocumentID(doc.Source.Name, listingKey, raw.PayloadHash)
	doc.Source.PropertyURL = firstNonEmpty(asString(root["PropertyUrl"]), asString(root["PropertyURL"]))
	doc.Source.RawPayloadRef = buildRawPayloadRef(raw, listingKey)

	doc.Property.Name = firstNonEmpty(asString(root["PropertyName"]), asString(listing["Name"]), asString(address["DeliveryAddress"]))
	doc.Property.Type = "apartments"
	doc.Property.UnitCount = intPtrFromAny(listing["UnitCount"])

	doc.Geo.AddressLine1 = firstNonEmpty(asString(address["DeliveryAddress"]), asString(address["StreetAddress"]))
	doc.Geo.City = asString(address["City"])
	doc.Geo.State = asString(address["State"])
	doc.Geo.PostalCode = asString(address["PostalCode"])
	doc.Geo.Country = firstNonEmpty(asString(address["Country"]), "US")
	doc.Geo.Submarket = asString(address["Submarket"])
	doc.Geo.Location = Location{
		Latitude:  asFloat(location["Latitude"]),
		Longitude: asFloat(location["Longitude"]),
	}

	baseRent := parseMoneyLike(firstNonEmpty(asString(rentFormat["BaseRent"]), asString(rentFormat["Rents"])))
	doc.Pricing.BaseRentMin = baseRent
	doc.Pricing.BaseRentMax = baseRent
	doc.Pricing.FeeDisclosureText = stripHTML(firstNonEmpty(asString(rentFormat["FeeDetail"]), asString(rentFormat["Fees"])))
	doc.Pricing.MonthlyFeesIncluded = boolPtrFromAny(listing["IsMonthlyFeesIncludedInRent"])
	doc.Pricing.FeeFlags = buildFeeFlags(listing)

	for _, rr := range rawRollups {
		rollup := asMap(rr)
		if len(rollup) == 0 {
			continue
		}
		doc.Units.Rollups = append(doc.Units.Rollups, UnitRollup{
			Beds:                  asFloat(rollup["Beds"]),
			MinBaths:              floatPtrFromAny(rollup["MinBaths"]),
			MaxBaths:              floatPtrFromAny(rollup["MaxBaths"]),
			MinSize:               intPtrFromAny(rollup["MinSize"]),
			MaxSize:               intPtrFromAny(rollup["MaxSize"]),
			LowDisplay:            floatPtrFromAny(rollup["LowDisplay"]),
			HighDisplay:           floatPtrFromAny(rollup["HighDisplay"]),
			MinTotalMonthlyPrice:  floatPtrFromAny(rollup["MinTotalMonthlyPrice"]),
			MaxTotalMonthlyPrice:  floatPtrFromAny(rollup["MaxTotalMonthlyPrice"]),
			FirstAvailabilityDate: timePtrFromAny(rollup["FirstAvailabilityDate"]),
			HasAvailabilities:     asBool(rollup["HasAvailabilities"]),
		})
	}

	if len(doc.Units.Rollups) > 0 {
		doc.Pricing.BaseRentMin, doc.Pricing.BaseRentMax = minMaxFromRollups(doc.Units.Rollups, doc.Pricing.BaseRentMin, doc.Pricing.BaseRentMax)
		doc.Pricing.TotalMonthlyMin, doc.Pricing.TotalMonthlyMax = minMaxTotalFromRollups(doc.Units.Rollups)
	}

	doc.Units.HasAvailabilities = asBool(listing["HasAvailabilities"])
	if !doc.Units.HasAvailabilities && len(doc.Units.Rollups) > 0 {
		doc.Units.HasAvailabilities = true
	}

	doc.Media = &MediaGroup{PrimaryPhotoURL: firstNonEmpty(asString(root["PropertyPhotoUrl"]), asString(root["PropertyPhotoURL"]))}
	doc.Compliance.IsInFeeDisclosureState = asBool(listing["IsInFeeDisclosureState"])
	doc.Compliance.RequiresFeeDisclosure = doc.Compliance.IsInFeeDisclosureState
	if text := strings.TrimSpace(doc.Pricing.FeeDisclosureText); text != "" {
		doc.Compliance.LegalDisclaimers = append(doc.Compliance.LegalDisclaimers, "Fee disclosure text is source-provided and should be shown with pricing claims.")
	}

	normalizedAt := time.Now().UTC()
	doc.Provenance.RawPayloadHash = raw.PayloadHash
	doc.Provenance.ParserVersion = genericParserVersion
	doc.Provenance.SourceCapturedAt = timeValuePtr(collectedAt)
	doc.Provenance.NormalizedAt = normalizedAt
	doc.Provenance.Confidence["schema_match"] = 0.93
	doc.Provenance.Confidence["pricing"] = 0.88

	return doc
}

func normalizeReportPayload(raw RawEnvelope, root map[string]any) PropertyDocument {
	data := asSlice(root["data"])
	entry := asMap(nil)
	if len(data) > 0 {
		entry = asMap(data[0])
	}
	subject := asMap(entry["subject"])
	propertyEdits := asSlice(entry["property_edits"])
	firstEdit := asMap(nil)
	if len(propertyEdits) > 0 {
		firstEdit = asMap(propertyEdits[0])
	}

	listingKey := firstNonEmpty(raw.SourceListingKey, asString(entry["public_id"]), asString(entry["id"]))
	collectedAt := normalizeCapturedAt(raw.CapturedAt)

	doc := NewBaseDocument(normalizeSourceName(raw.SourceName), listingKey, collectedAt)
	doc.DocumentID = buildDocumentID(doc.Source.Name, listingKey, raw.PayloadHash)
	doc.Source.PropertyURL = firstNonEmpty(asString(firstEdit["building_website"]), asString(root["url"]))
	doc.Source.RawPayloadRef = buildRawPayloadRef(raw, listingKey)

	doc.Property.Name = firstNonEmpty(asString(subject["building_name"]), asString(entry["name"]))
	doc.Property.Type = inferPropertyType(asSlice(entry["tags"]))
	doc.Property.UnitCount = intPtrFromAny(subject["number_units"])

	doc.Geo.AddressLine1 = asString(subject["street_address"])
	doc.Geo.City = asString(subject["city"])
	doc.Geo.State = asString(subject["state"])
	doc.Geo.PostalCode = asString(subject["zip_code"])
	doc.Geo.Country = "US"
	doc.Geo.Location = Location{
		Latitude:  asFloat(subject["lat"]),
		Longitude: asFloat(subject["lon"]),
	}

	doc.Pricing.BaseRentMin = 0
	doc.Pricing.BaseRentMax = 0
	doc.Pricing.FeeDisclosureText = buildReportFeeText(firstEdit)
	monthlyIncluded := false
	doc.Pricing.MonthlyFeesIncluded = &monthlyIncluded
	doc.Pricing.FeeFlags = []string{"report_payload", "user_override_fields"}

	doc.Units.HasAvailabilities = derefIntPtr(doc.Property.UnitCount) > 0
	doc.Compliance.IsInFeeDisclosureState = false
	doc.Compliance.RequiresFeeDisclosure = true
	doc.Compliance.LegalDisclaimers = append(doc.Compliance.LegalDisclaimers,
		"Derived from report payload; some listing-level pricing fields may be unavailable.")

	mediaURL := firstNonEmpty(asString(firstEdit["street_view_url"]), asString(firstEdit["building_website"]))
	doc.Media = &MediaGroup{PrimaryPhotoURL: mediaURL}

	if company := strings.TrimSpace(asString(firstEdit["management_company"])); company != "" {
		doc.Management = &Management{CompanyName: company}
	}

	normalizedAt := time.Now().UTC()
	doc.Provenance.RawPayloadHash = raw.PayloadHash
	doc.Provenance.ParserVersion = genericParserVersion
	doc.Provenance.SourceCapturedAt = timeValuePtr(collectedAt)
	doc.Provenance.NormalizedAt = normalizedAt
	doc.Provenance.Confidence["schema_match"] = 0.86
	doc.Provenance.Confidence["pricing"] = 0.42

	return doc
}

func buildReportFeeText(firstEdit map[string]any) string {
	if len(firstEdit) == 0 {
		return ""
	}

	parts := make([]string, 0)
	for _, key := range []string{"admin_fee", "application_fee", "storage_fee", "parking_covered", "parking_garage", "parking_surface_lot"} {
		if value, ok := asFloatOK(firstEdit[key]); ok {
			parts = append(parts, fmt.Sprintf("%s=%.2f", key, value))
		}
	}

	fees := asSlice(firstEdit["fees"])
	for _, fee := range fees {
		fm := asMap(fee)
		label := asString(fm["label"])
		amount := asFloat(fm["amount"])
		freq := asString(fm["frequency"])
		if label != "" {
			parts = append(parts, fmt.Sprintf("%s=%.2f/%s", label, amount, firstNonEmpty(freq, "period")))
		}
	}

	return strings.Join(parts, "; ")
}

func buildFeeFlags(listing map[string]any) []string {
	flags := make([]string, 0)
	if asBool(listing["IsInFeeDisclosureState"]) {
		flags = append(flags, "fee_disclosure_state")
	}
	if asBool(listing["IsMonthlyFeesIncludedInRent"]) {
		flags = append(flags, "monthly_fees_included")
	}
	if asBool(listing["HasUnitSpecial"]) {
		flags = append(flags, "unit_special")
	}
	if asBool(listing["IsForRentByOwner"]) {
		flags = append(flags, "for_rent_by_owner")
	}
	return flags
}

func inferPropertyType(tags []any) string {
	for _, t := range tags {
		tag := strings.ToLower(asString(t))
		switch {
		case strings.Contains(tag, "office"):
			return "office"
		case strings.Contains(tag, "industrial"):
			return "industrial"
		case strings.Contains(tag, "retail"):
			return "retail"
		}
	}
	return "apartments"
}

func buildRawPayloadRef(raw RawEnvelope, listingKey string) string {
	if raw.Metadata != nil {
		if ref := strings.TrimSpace(raw.Metadata["rawPayloadRef"]); ref != "" {
			return ref
		}
	}
	capturedAt := normalizeCapturedAt(raw.CapturedAt)
	return fmt.Sprintf("raw://%s/%s/%s/%s.json",
		normalizeSourceName(raw.SourceName),
		capturedAt.Format("2006/01/02"),
		sanitizeToken(firstNonEmpty(listingKey, "unknown")),
		sanitizeToken(strings.TrimPrefix(raw.PayloadHash, "sha256:")),
	)
}

func buildDocumentID(sourceName, listingKey, payloadHash string) string {
	h := sanitizeToken(strings.TrimPrefix(payloadHash, "sha256:"))
	if len(h) > 12 {
		h = h[:12]
	}
	if h == "" {
		h = strconv.FormatInt(time.Now().UTC().Unix(), 10)
	}
	return fmt.Sprintf("prop_%s_%s_%s", sanitizeToken(sourceName), sanitizeToken(firstNonEmpty(listingKey, "unknown")), h)
}

func normalizeSourceName(source string) string {
	value := sanitizeToken(strings.ToLower(strings.TrimSpace(source)))
	if value == "" {
		return "unknown_source"
	}
	return value
}

func sanitizeToken(value string) string {
	sanitized := tokenSanitizeRE.ReplaceAllString(value, "_")
	sanitized = strings.Trim(sanitized, "_")
	if sanitized == "" {
		return "unknown"
	}
	if len(sanitized) > 64 {
		return sanitized[:64]
	}
	return sanitized
}

func normalizeCapturedAt(capturedAt time.Time) time.Time {
	if capturedAt.IsZero() {
		return time.Now().UTC()
	}
	return capturedAt.UTC()
}

func minMaxFromRollups(rollups []UnitRollup, fallbackMin float64, fallbackMax float64) (float64, float64) {
	minVal := fallbackMin
	maxVal := fallbackMax
	found := false
	for _, r := range rollups {
		if r.LowDisplay != nil {
			if !found || *r.LowDisplay < minVal {
				minVal = *r.LowDisplay
			}
			found = true
		}
		if r.HighDisplay != nil {
			if !found || *r.HighDisplay > maxVal {
				maxVal = *r.HighDisplay
			}
			found = true
		}
	}
	if !found {
		return fallbackMin, fallbackMax
	}
	return minVal, maxVal
}

func minMaxTotalFromRollups(rollups []UnitRollup) (*float64, *float64) {
	var minVal *float64
	var maxVal *float64
	for _, r := range rollups {
		if r.MinTotalMonthlyPrice != nil {
			if minVal == nil || *r.MinTotalMonthlyPrice < *minVal {
				val := *r.MinTotalMonthlyPrice
				minVal = &val
			}
		}
		if r.MaxTotalMonthlyPrice != nil {
			if maxVal == nil || *r.MaxTotalMonthlyPrice > *maxVal {
				val := *r.MaxTotalMonthlyPrice
				maxVal = &val
			}
		}
	}
	return minVal, maxVal
}

func stripHTML(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	value = htmlTagRE.ReplaceAllString(value, " ")
	value = html.UnescapeString(value)
	return strings.Join(strings.Fields(value), " ")
}

func parseMoneyLike(value string) float64 {
	clean := strings.TrimSpace(value)
	if clean == "" {
		return 0
	}
	clean = strings.ReplaceAll(clean, "$", "")
	clean = strings.ReplaceAll(clean, ",", "")
	parts := strings.Fields(clean)
	if len(parts) == 0 {
		return 0
	}
	f, err := strconv.ParseFloat(parts[0], 64)
	if err != nil {
		return 0
	}
	return f
}

func asMap(value any) map[string]any {
	m, _ := value.(map[string]any)
	return m
}

func asSlice(value any) []any {
	s, _ := value.([]any)
	return s
}

func asString(value any) string {
	switch v := value.(type) {
	case string:
		return strings.TrimSpace(v)
	case float64:
		return strconv.FormatFloat(v, 'f', -1, 64)
	case int:
		return strconv.Itoa(v)
	case int64:
		return strconv.FormatInt(v, 10)
	case bool:
		if v {
			return "true"
		}
		return "false"
	default:
		return ""
	}
}

func asFloat(value any) float64 {
	f, _ := asFloatOK(value)
	return f
}

func asFloatOK(value any) (float64, bool) {
	switch v := value.(type) {
	case float64:
		return v, true
	case int:
		return float64(v), true
	case int64:
		return float64(v), true
	case string:
		parsed, err := strconv.ParseFloat(strings.TrimSpace(v), 64)
		if err == nil {
			return parsed, true
		}
	}
	return 0, false
}

func asBool(value any) bool {
	switch v := value.(type) {
	case bool:
		return v
	case string:
		parsed, _ := strconv.ParseBool(strings.TrimSpace(v))
		return parsed
	default:
		return false
	}
}

func intPtrFromAny(value any) *int {
	f, ok := asFloatOK(value)
	if !ok {
		return nil
	}
	i := int(f)
	return &i
}

func floatPtrFromAny(value any) *float64 {
	f, ok := asFloatOK(value)
	if !ok {
		return nil
	}
	return &f
}

func boolPtrFromAny(value any) *bool {
	switch v := value.(type) {
	case bool:
		b := v
		return &b
	case string:
		parsed, err := strconv.ParseBool(strings.TrimSpace(v))
		if err != nil {
			return nil
		}
		return &parsed
	default:
		return nil
	}
}

func timePtrFromAny(value any) *time.Time {
	t, ok := parseTimeAny(value)
	if !ok {
		return nil
	}
	return &t
}

func parseTimeAny(value any) (time.Time, bool) {
	raw := asString(value)
	if raw == "" {
		return time.Time{}, false
	}
	for _, layout := range []string{time.RFC3339, "2006-01-02", "2006-01-02T15:04:05"} {
		if t, err := time.Parse(layout, raw); err == nil {
			return t.UTC(), true
		}
	}
	return time.Time{}, false
}

func timeValuePtr(t time.Time) *time.Time {
	tc := t.UTC()
	return &tc
}

func derefIntPtr(v *int) int {
	if v == nil {
		return 0
	}
	return *v
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if trimmed := strings.TrimSpace(v); trimmed != "" {
			return trimmed
		}
	}
	return ""
}
