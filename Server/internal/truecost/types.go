package truecost

type AgentStateEdge struct {
	From string `json:"from"`
	To   string `json:"to"`
}

type GuardrailStatus struct {
	InputValidated      bool `json:"inputValidated"`
	ProcessingValidated bool `json:"processingValidated"`
	OutputValidated     bool `json:"outputValidated"`
}

type AnalysisPayload struct {
	AdvertisedRent     float64          `json:"advertisedRent"`
	TrueCost           float64          `json:"trueCost"`
	TotalMandatoryFees float64          `json:"totalMandatoryFees"`
	DealScore          float64          `json:"dealScore"`
	EstimateType       string           `json:"estimateType"`
	FeeDisclosure      string           `json:"feeDisclosure"`
	LegalDisclaimers   []string         `json:"legalDisclaimers"`
	Guardrails         GuardrailStatus  `json:"guardrails"`
	AgentStateGraph    []AgentStateEdge `json:"agentStateGraph,omitempty"`
}
