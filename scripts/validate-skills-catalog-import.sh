#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
FILES=(
  "data/skills-catalog/v1/catalog.json"
  "data/skills-catalog/v1/proof.json"
  "data/skills-catalog/v1/manifest.json"
  "data/skills-catalog/v1/import-source.json"
)

fingerprint() {
  (cd "$ROOT_DIR" && shasum -a 256 "${FILES[@]}" 2>/dev/null || true)
}

before="$(fingerprint)"
(cd "$ROOT_DIR" && node scripts/import-skills-catalog.mjs)
after="$(fingerprint)"

if [[ "$before" != "$after" ]]; then
  echo "Skills catalog import artifacts were stale. Regenerated files:" >&2
  printf '%s\n' "${FILES[@]}" >&2
  exit 1
fi

echo "Skills catalog import artifacts are fresh."
