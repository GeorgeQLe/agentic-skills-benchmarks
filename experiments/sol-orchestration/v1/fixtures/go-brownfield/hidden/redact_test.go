package hidden_test

import (
	"testing"

	fixture "benchfixture"
)

func TestRedactTokens(t *testing.T) {
	input := "request bearer abc123, retry BEARER XYZ-789; status ok"
	want := "request Bearer [REDACTED], retry Bearer [REDACTED]; status ok"
	if got := fixture.RedactTokens(input); got != want { t.Fatalf("got %q, want %q", got, want) }
	plain := "status ok without credentials"
	if got := fixture.RedactTokens(plain); got != plain { t.Fatalf("changed unrelated text: %q", got) }
}
