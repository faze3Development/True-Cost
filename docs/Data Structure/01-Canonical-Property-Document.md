# Canonical Property Document

## Purpose
Define a source-agnostic property document model that can absorb aggregator payloads without losing legal, pricing, or provenance context.

Related docs:
- [00-Overview](00-Overview.md)
- [02-Ingestion and Normalization Pipeline](02-Ingestion-and-Normalization-Pipeline.md)
- [03-RAG Chunking and Retrieval](03-RAG-Chunking-and-Retrieval.md)

## Top-Level Contract
Each canonical property document contains:
1. Identity and versioning
2. Property core details
3. Pricing and fee transparency
4. Unit rollups and availability
5. Amenities and media
6. Compliance and legal disclosures
7. Management and contact metadata
8. Provenance and parser metadata

## Required Top-Level Fields
| Field | Type | Required | Notes |
|---|---|---|---|
| documentId | string | yes | Internal unique ID |
| schemaVersion | string | yes | Canonical schema version |
| source | object | yes | Aggregator and source identity |
| collectedAt | string (ISO8601) | yes | Ingestion timestamp |
| property | object | yes | Core property identity |
| geo | object | yes | Address and coordinates |
| pricing | object | yes | Rent and fee transparency |
| units | object | yes | Unit rollups |
| amenities | object | no | Tagged and free-form amenities |
| media | object | no | Photos, videos, tours |
| compliance | object | yes | Legal and disclosure fields |
| management | object | no | Management company and contacts |
| provenance | object | yes | Traceability and parser lifecycle |

## Normalized Field Groups

### 1) Source
| Field | Type | Notes |
|---|---|---|
| source.name | string | Example: apartments_com |
| source.listingKey | string | External listing key |
| source.propertyURL | string | Canonical listing URL |
| source.rawPayloadRef | string | Pointer to immutable raw payload |

### 2) Property
| Field | Type | Notes |
|---|---|---|
| property.name | string | Display-safe title |
| property.type | string | multifamily, single_family, mixed |
| property.unitCount | integer | Total units when known |
| property.isPetFriendly | Boolean | Derived from source fields |

### 3) Geo
| Field | Type | Notes |
|---|---|---|
| geo.addressLine1 | string | Delivery address |
| geo.city | string | City |
| geo.state | string | State |
| geo.postalCode | string | Zip/postal code |
| geo.country | string | Country code |
| geo.location.latitude | number | Latitude |
| geo.location.longitude | number | Longitude |
| geo.submarket | string | Optional submarket |

### 4) Pricing and Fees
| Field | Type | Notes |
|---|---|---|
| pricing.baseRentMin | number | Lowest observed base rent |
| pricing.baseRentMax | number | Highest observed base rent |
| pricing.totalMonthlyMin | number | Optional all-in low total |
| pricing.totalMonthlyMax | number | Optional all-in high total |
| pricing.feeDisclosureText | string | Human-readable fee disclosure |
| pricing.monthlyFeesIncluded | Boolean | Explicitly normalized |
| pricing.feeFlags | array<string> | Examples: plus_fees, includes_required_fees |
| pricing.currency | string | Default USD |

### 5) Units
| Field | Type | Notes |
|---|---|---|
| units.hasAvailabilities | Boolean | Property-level availability signal |
| units.rollups | array<object> | Bed/bath/size/price groupings |

Unit rollup fields:
- beds
- minBaths
- maxBaths
- minSize
- maxSize
- lowDisplay
- highDisplay
- minTotalMonthlyPrice
- maxTotalMonthlyPrice
- firstAvailabilityDate
- hasAvailabilities

### 6) Amenities and Media
Amenities:
- amenities.list: array<string>
- amenities.encodedFlagsRaw: optional integer/string for source parity

Media:
- media.primaryPhotoURL
- media.carouselCount
- media.videoURL
- media.virtualTourURL
- media.attachments[]

### 7) Compliance
| Field | Type | Notes |
|---|---|---|
| compliance.isInFeeDisclosureState | Boolean | Source-informed compliance field |
| compliance.requiresFeeDisclosure | Boolean | Derived policy flag |
| compliance.legalDisclaimers | array<string> | Required disclosure text |
| compliance.algorithmicEstimateNotice | string | Model/legal notice |

### 8) Provenance
| Field | Type | Notes |
|---|---|---|
| provenance.rawPayloadHash | string | Integrity and dedupe |
| provenance.parserVersion | string | Normalizer/parser build version |
| provenance.sourceCapturedAt | string | Source timestamp |
| provenance.sourceUpdatedAt | string | Provider update timestamp |
| provenance.normalizedAt | string | Canonical generation timestamp |
| provenance.confidence | object | Field confidence map |

## Canonical Example (Condensed)
```json
{
  "documentId": "prop_01JY...",
  "schemaVersion": "1.0.0",
  "source": {
    "name": "apartments_com",
    "listingKey": "9vsvv74",
    "propertyUrl": "https://www.apartments.com/...",
    "rawPayloadRef": "raw://apartments_com/2026/04/04/9vsvv74.json"
  },
  "property": {
    "name": "Abberly CenterPointe Apartment Homes",
    "type": "multifamily",
    "unitCount": 271,
    "isPetFriendly": true
  },
  "geo": {
    "addressLine1": "1900 Abberly Cir",
    "city": "Midlothian",
    "state": "VA",
    "postalCode": "23114",
    "country": "US",
    "location": { "lat": 37.46362, "lon": -77.66522 }
  },
  "pricing": {
    "baseRentMin": 1646,
    "baseRentMax": 4683,
    "feeDisclosureText": "Prices include all required monthly fees.",
    "monthlyFeesIncluded": false,
    "feeFlags": ["plus_fees", "fee_disclosure_state"],
    "currency": "USD"
  },
  "compliance": {
    "isInFeeDisclosureState": true,
    "requiresFeeDisclosure": true,
    "legalDisclaimers": ["..."],
    "algorithmicEstimateNotice": "True Cost outputs are algorithmic estimates."
  },
  "provenance": {
    "rawPayloadHash": "sha256:...",
    "parserVersion": "normalizer-1.0.0",
    "normalizedAt": "2026-04-04T05:26:28Z"
  }
}
```

## Schema Versioning Rules
1. Use semantic versioning for schemaVersion.
2. Minor versions may add optional fields.
3. Major versions may rename or remove fields.
4. Canonical document writers must emit schemaVersion explicitly.

## Validation Requirements
1. Hard validation failures for missing required top-level fields.
2. Soft validation warnings for partial optional groups.
3. Field-level confidence scores for uncertain mappings.

Validation flow is defined in [02-Ingestion and Normalization Pipeline](02-Ingestion-and-Normalization-Pipeline.md).
