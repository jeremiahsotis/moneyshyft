#!/usr/bin/env bash
set -euo pipefail

base_ref="${1:-origin/production}"

is_truthy() {
  local value
  value="$(echo "${1:-}" | tr '[:upper:]' '[:lower:]')"
  [[ "$value" == "1" || "$value" == "true" || "$value" == "yes" || "$value" == "on" ]]
}

resolve_burn_in_fallback_specs() {
  local configured="${BURN_IN_FALLBACK_SPECS:-}"
  local fallback_specs=()

  if [[ -n "$configured" ]]; then
    # Intentional word-splitting: this env var is a whitespace-delimited spec list.
    # shellcheck disable=SC2206
    fallback_specs=($configured)
  else
    fallback_specs=(
      "tests/api/platform/2-1-commitment-domain-model-and-transition-rules.atdd.api.spec.ts"
      "tests/e2e/platform/2-1-commitment-domain-model-and-transition-rules.atdd.spec.ts"
    )
  fi

  printf '%s\n' "${fallback_specs[@]}"
}

if ! git rev-parse --verify "$base_ref" >/dev/null 2>&1; then
  echo "Base ref '$base_ref' not found locally, attempting fetch"
  git fetch --no-tags origin "${base_ref#origin/}:${base_ref}" || true
fi

changed_specs=()
while IFS= read -r line; do
  changed_specs+=("$line")
done < <(git diff --name-only "$base_ref"...HEAD | grep -E '^tests/.*\.spec\.(ts|js)$' || true)

if [[ ${#changed_specs[@]} -eq 0 ]]; then
  if is_truthy "${BURN_IN_REQUIRE_TESTS:-false}"; then
    fallback_specs=()
    while IFS= read -r spec; do
      [[ -n "$spec" ]] || continue
      fallback_specs+=("$spec")
    done < <(resolve_burn_in_fallback_specs)

    if [[ ${#fallback_specs[@]} -eq 0 ]]; then
      echo "No changed spec files detected and no burn-in fallback suite configured."
      echo "Set BURN_IN_FALLBACK_SPECS to a whitespace-delimited list of spec paths."
      exit 1
    fi

    echo "No changed spec files detected against $base_ref. Running burn-in fallback spec suite."
    printf ' - %s\n' "${fallback_specs[@]}"
    npm run test:e2e -- "${fallback_specs[@]}"
    exit 0
  fi

  echo "No changed spec files detected against $base_ref. Skipping test run."
  exit 0
fi

echo "Running changed specs (${#changed_specs[@]}) against $base_ref"
printf ' - %s\n' "${changed_specs[@]}"

npm run test:e2e -- "${changed_specs[@]}"
