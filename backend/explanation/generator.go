package explanation

import "fmt"

// Generate produces a human-readable explanation for a detected behavioral pattern.
// n is seconds for hesitation, visit count for navigation-loop, and unused for abandonment.
func Generate(patternType, page string, n int, severity string) string {
	switch patternType {
	case "hesitation":
		return fmt.Sprintf(
			"User paused for %d seconds on %s without taking action.",
			n, page,
		)
	case "navigation-loop":
		return fmt.Sprintf(
			"User navigated to %s %d times within 2 minutes, suggesting confusion or indecision.",
			page, n,
		)
	case "abandonment":
		return fmt.Sprintf(
			"User entered the checkout flow on %s but did not complete the transaction within 60 seconds.",
			page,
		)
	default:
		return fmt.Sprintf("Behavioral anomaly detected on %s.", page)
	}
}
