package hidden_test

import (
	"testing"

	fixture "benchfixture"
)

func TestParsePort(t *testing.T) {
	for input, want := range map[string]int{" 443 ": 443, "1": 1, "65535": 65535} {
		got, err := fixture.ParsePort(input)
		if err != nil || got != want { t.Fatalf("ParsePort(%q) = %d, %v", input, got, err) }
	}
	for _, input := range []string{"", "0", "65536", "abc", "1.5"} {
		if _, err := fixture.ParsePort(input); err == nil { t.Fatalf("ParsePort(%q) returned no error", input) }
	}
}
