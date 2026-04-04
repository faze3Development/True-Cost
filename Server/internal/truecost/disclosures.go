package truecost

import "fmt"

func feeDisclosure(totalMandatoryFees float64) string {
	return fmt.Sprintf(
		"Total monthly mandatory fees included in True Cost: $%.2f (trash, amenity, package, parking).",
		totalMandatoryFees,
	)
}
