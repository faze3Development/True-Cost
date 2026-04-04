package canonical

import "regexp"

type ValidationStatus string

const (
	ValidationPass             ValidationStatus = "pass"
	ValidationPassWithWarnings ValidationStatus = "pass_with_warnings"
	ValidationFail             ValidationStatus = "fail"
)

type IssueSeverity string

const (
	IssueError   IssueSeverity = "error"
	IssueWarning IssueSeverity = "warning"
)

type ValidationIssue struct {
	Field    string        `json:"field"`
	Code     string        `json:"code"`
	Message  string        `json:"message"`
	Severity IssueSeverity `json:"severity"`
}

type ValidationResult struct {
	Status ValidationStatus  `json:"status"`
	Issues []ValidationIssue `json:"issues,omitempty"`
}

var schemaVersionRE = regexp.MustCompile(`^\d+\.\d+\.\d+$`)

func ValidateDocument(doc PropertyDocument) ValidationResult {
	issues := make([]ValidationIssue, 0)

	if doc.DocumentID == "" {
		issues = append(issues, errIssue("documentId", "required", "documentId is required"))
	}

	if doc.SchemaVersion == "" {
		issues = append(issues, errIssue("schemaVersion", "required", "schemaVersion is required"))
	} else if !schemaVersionRE.MatchString(doc.SchemaVersion) {
		issues = append(issues, errIssue("schemaVersion", "invalid_format", "schemaVersion must use semantic version format (x.y.z)"))
	}

	if doc.CollectedAt.IsZero() {
		issues = append(issues, errIssue("collectedAt", "required", "collectedAt is required"))
	}

	if doc.Source.Name == "" {
		issues = append(issues, errIssue("source.name", "required", "source.name is required"))
	}

	if doc.Source.ListingKey == "" {
		issues = append(issues, errIssue("source.listingKey", "required", "source.listingKey is required"))
	}

	if doc.Source.PropertyURL == "" {
		issues = append(issues, warnIssue("source.propertyURL", "recommended", "source.propertyURL should be provided for source attribution"))
	}

	if doc.Property.Name == "" {
		issues = append(issues, errIssue("property.name", "required", "property.name is required"))
	}

	if doc.Geo.City == "" {
		issues = append(issues, errIssue("geo.city", "required", "geo.city is required"))
	}

	if doc.Geo.State == "" {
		issues = append(issues, errIssue("geo.state", "required", "geo.state is required"))
	}

	if doc.Geo.Country == "" {
		issues = append(issues, errIssue("geo.country", "required", "geo.country is required"))
	}

	if doc.Geo.Location.Latitude < -90 || doc.Geo.Location.Latitude > 90 {
		issues = append(issues, errIssue("geo.location.latitude", "invalid_range", "latitude must be between -90 and 90"))
	}

	if doc.Geo.Location.Longitude < -180 || doc.Geo.Location.Longitude > 180 {
		issues = append(issues, errIssue("geo.location.longitude", "invalid_range", "longitude must be between -180 and 180"))
	}

	if doc.Pricing.Currency == "" {
		issues = append(issues, errIssue("pricing.currency", "required", "pricing.currency is required"))
	}

	if doc.Pricing.BaseRentMin < 0 || doc.Pricing.BaseRentMax < 0 {
		issues = append(issues, errIssue("pricing", "invalid_range", "pricing rent values must be non-negative"))
	}

	if doc.Pricing.BaseRentMax > 0 && doc.Pricing.BaseRentMin > doc.Pricing.BaseRentMax {
		issues = append(issues, errIssue("pricing", "invalid_range", "baseRentMin cannot exceed baseRentMax"))
	}

	if len(doc.Units.Rollups) == 0 {
		issues = append(issues, warnIssue("units.rollups", "recommended", "units.rollups should include at least one bed/bath/price grouping"))
	}

	if len(doc.Compliance.LegalDisclaimers) == 0 {
		issues = append(issues, warnIssue("compliance.legalDisclaimers", "recommended", "legal disclaimers should be included for compliant retrieval responses"))
	}

	if doc.Provenance.RawPayloadHash == "" {
		issues = append(issues, errIssue("provenance.rawPayloadHash", "required", "provenance.rawPayloadHash is required"))
	}

	if doc.Provenance.ParserVersion == "" {
		issues = append(issues, errIssue("provenance.parserVersion", "required", "provenance.parserVersion is required"))
	}

	if doc.Provenance.NormalizedAt.IsZero() {
		issues = append(issues, errIssue("provenance.normalizedAt", "required", "provenance.normalizedAt is required"))
	}

	status := ValidationPass
	if hasSeverity(issues, IssueError) {
		status = ValidationFail
	} else if hasSeverity(issues, IssueWarning) {
		status = ValidationPassWithWarnings
	}

	return ValidationResult{Status: status, Issues: issues}
}

func hasSeverity(issues []ValidationIssue, sev IssueSeverity) bool {
	for _, issue := range issues {
		if issue.Severity == sev {
			return true
		}
	}
	return false
}

func errIssue(field, code, message string) ValidationIssue {
	return ValidationIssue{Field: field, Code: code, Message: message, Severity: IssueError}
}

func warnIssue(field, code, message string) ValidationIssue {
	return ValidationIssue{Field: field, Code: code, Message: message, Severity: IssueWarning}
}
