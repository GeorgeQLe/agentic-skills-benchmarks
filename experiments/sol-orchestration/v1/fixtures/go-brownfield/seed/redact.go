package benchfixture

import "strings"

func RedactTokens(value string) string {
	return strings.ReplaceAll(value, "Bearer ", "Bearer [REDACTED]")
}
