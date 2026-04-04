package canonical

import "time"

const CurrentSchemaVersion = "1.0.0"

type PropertyDocument struct {
	DocumentID    string        `json:"documentId"`
	SchemaVersion string        `json:"schemaVersion"`
	Source        Source        `json:"source"`
	CollectedAt   time.Time     `json:"collectedAt"`
	Property      PropertyCore  `json:"property"`
	Geo           Geo           `json:"geo"`
	Pricing       Pricing       `json:"pricing"`
	Units         Units         `json:"units"`
	Amenities     *AmenityGroup `json:"amenities,omitempty"`
	Media         *MediaGroup   `json:"media,omitempty"`
	Compliance    Compliance    `json:"compliance"`
	Management    *Management   `json:"management,omitempty"`
	Provenance    Provenance    `json:"provenance"`
}

type Source struct {
	Name          string `json:"name"`
	ListingKey    string `json:"listingKey"`
	PropertyURL   string `json:"propertyURL"`
	RawPayloadRef string `json:"rawPayloadRef"`
}

type PropertyCore struct {
	Name          string `json:"name"`
	Type          string `json:"type"`
	UnitCount     *int   `json:"unitCount,omitempty"`
	IsPetFriendly *bool  `json:"isPetFriendly,omitempty"`
}

type Geo struct {
	AddressLine1 string   `json:"addressLine1"`
	City         string   `json:"city"`
	State        string   `json:"state"`
	PostalCode   string   `json:"postalCode"`
	Country      string   `json:"country"`
	Location     Location `json:"location"`
	Submarket    string   `json:"submarket,omitempty"`
}

type Location struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

type Pricing struct {
	BaseRentMin         float64  `json:"baseRentMin"`
	BaseRentMax         float64  `json:"baseRentMax"`
	TotalMonthlyMin     *float64 `json:"totalMonthlyMin,omitempty"`
	TotalMonthlyMax     *float64 `json:"totalMonthlyMax,omitempty"`
	FeeDisclosureText   string   `json:"feeDisclosureText,omitempty"`
	MonthlyFeesIncluded *bool    `json:"monthlyFeesIncluded,omitempty"`
	FeeFlags            []string `json:"feeFlags,omitempty"`
	Currency            string   `json:"currency"`
}

type Units struct {
	HasAvailabilities bool         `json:"hasAvailabilities"`
	Rollups           []UnitRollup `json:"rollups"`
}

type UnitRollup struct {
	Beds                  float64    `json:"beds"`
	MinBaths              *float64   `json:"minBaths,omitempty"`
	MaxBaths              *float64   `json:"maxBaths,omitempty"`
	MinSize               *int       `json:"minSize,omitempty"`
	MaxSize               *int       `json:"maxSize,omitempty"`
	LowDisplay            *float64   `json:"lowDisplay,omitempty"`
	HighDisplay           *float64   `json:"highDisplay,omitempty"`
	MinTotalMonthlyPrice  *float64   `json:"minTotalMonthlyPrice,omitempty"`
	MaxTotalMonthlyPrice  *float64   `json:"maxTotalMonthlyPrice,omitempty"`
	FirstAvailabilityDate *time.Time `json:"firstAvailabilityDate,omitempty"`
	HasAvailabilities     bool       `json:"hasAvailabilities"`
}

type AmenityGroup struct {
	List            []string `json:"list,omitempty"`
	EncodedFlagsRaw string   `json:"encodedFlagsRaw,omitempty"`
}

type MediaGroup struct {
	PrimaryPhotoURL string            `json:"primaryPhotoURL,omitempty"`
	CarouselCount   *int              `json:"carouselCount,omitempty"`
	VideoURL        string            `json:"videoURL,omitempty"`
	VirtualTourURL  string            `json:"virtualTourURL,omitempty"`
	Attachments     []MediaAttachment `json:"attachments,omitempty"`
}

type MediaAttachment struct {
	URI         string `json:"uri,omitempty"`
	Description string `json:"description,omitempty"`
	ContentType string `json:"contentType,omitempty"`
	SortIndex   *int   `json:"sortIndex,omitempty"`
}

type Compliance struct {
	IsInFeeDisclosureState    bool     `json:"isInFeeDisclosureState"`
	RequiresFeeDisclosure     bool     `json:"requiresFeeDisclosure"`
	LegalDisclaimers          []string `json:"legalDisclaimers"`
	AlgorithmicEstimateNotice string   `json:"algorithmicEstimateNotice,omitempty"`
}

type Management struct {
	CompanyName string  `json:"companyName,omitempty"`
	CompanyKey  string  `json:"companyKey,omitempty"`
	Phones      []Phone `json:"phones,omitempty"`
}

type Phone struct {
	PhoneNumber string `json:"phoneNumber"`
	PhoneType   string `json:"phoneType,omitempty"`
}

type Provenance struct {
	RawPayloadHash   string             `json:"rawPayloadHash"`
	ParserVersion    string             `json:"parserVersion"`
	SourceCapturedAt *time.Time         `json:"sourceCapturedAt,omitempty"`
	SourceUpdatedAt  *time.Time         `json:"sourceUpdatedAt,omitempty"`
	NormalizedAt     time.Time          `json:"normalizedAt"`
	Confidence       map[string]float64 `json:"confidence,omitempty"`
}

func NewBaseDocument(sourceName, listingKey string, collectedAt time.Time) PropertyDocument {
	return PropertyDocument{
		SchemaVersion: CurrentSchemaVersion,
		Source: Source{
			Name:       sourceName,
			ListingKey: listingKey,
		},
		CollectedAt: collectedAt,
		Pricing: Pricing{
			Currency: "USD",
		},
		Units: Units{
			Rollups: make([]UnitRollup, 0),
		},
		Compliance: Compliance{
			LegalDisclaimers: make([]string, 0),
		},
		Provenance: Provenance{
			Confidence: make(map[string]float64),
		},
	}
}
