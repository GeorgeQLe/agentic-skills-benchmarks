package benchfixture

import (
	"fmt"
	"strconv"
	"strings"
)

func ParsePort(raw string) (int, error) {
	value, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil || value < 1 || value > 65535 {
		return 0, fmt.Errorf("invalid port %q: expected an integer from 1 through 65535", raw)
	}
	return value, nil
}
