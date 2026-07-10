package benchfixture

import "regexp"

var bearerToken = regexp.MustCompile(`(?i)bearer\s+[^\s,;]+`)

func RedactTokens(value string) string {
	return bearerToken.ReplaceAllString(value, "Bearer [REDACTED]")
}
