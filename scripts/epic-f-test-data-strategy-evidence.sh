#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARTIFACT_DIR="$ROOT_DIR/_bmad-output/test-artifacts"
JSON_ARTIFACT="$ARTIFACT_DIR/epic-f-test-data-strategy-evidence.json"
MD_ARTIFACT="$ARTIFACT_DIR/epic-f-test-data-strategy-evidence.md"
STRESS_ARTIFACT="$ARTIFACT_DIR/epic-f-stress-resource-evidence.json"

mkdir -p "$ARTIFACT_DIR"

count_matches() {
  local pattern="$1"
  shift
  (rg -n "$pattern" "$@" || true) | wc -l | tr -d ' '
}

json_bool() {
  if [[ "$1" == "true" ]]; then
    echo "true"
  else
    echo "false"
  fi
}

tenant_scope_factory_count="$(count_matches "createTenantScopeHeaders\\(" \
  "$ROOT_DIR/tests/support/factories/connectShyftStoryF1Factory.ts" \
  "$ROOT_DIR/tests/support/factories/connectShyftStoryF2Factory.ts" \
  "$ROOT_DIR/tests/support/factories/connectShyftStoryF3Factory.ts")"

tenant_scope_assertion_count="$(count_matches "tenantId|orgUnitId|x-test-connectshyft-orgunit-memberships" \
  "$ROOT_DIR/tests/api/platform/f-1-provider-adapter-interface-and-provider-registry.automate.api.spec.ts" \
  "$ROOT_DIR/tests/api/platform/f-2-canonical-comms-event-model-and-event-store.automate.api.spec.ts" \
  "$ROOT_DIR/tests/api/platform/f-2-canonical-comms-event-model-and-event-store.automate.read-model.api.spec.ts" \
  "$ROOT_DIR/tests/api/platform/f-3-provider-leg-message-correlation-fallback-mapping.atdd.api.spec.ts" \
  "$ROOT_DIR/tests/api/platform/f-4-telnyx-adapter-implementation-and-cutover-guardrails.automate.api.spec.ts" \
  "$ROOT_DIR/tests/e2e/platform/f-1-provider-adapter-interface-and-provider-registry.automate.spec.ts" \
  "$ROOT_DIR/tests/e2e/platform/f-2-canonical-comms-event-model-and-event-store.automate.spec.ts" \
  "$ROOT_DIR/tests/e2e/platform/f-2-canonical-comms-event-model-and-event-store.automate.read-model.spec.ts" \
  "$ROOT_DIR/tests/e2e/platform/f-3-provider-leg-message-correlation-fallback-mapping.atdd.spec.ts" \
  "$ROOT_DIR/tests/e2e/platform/f-4-telnyx-adapter-implementation-and-cutover-guardrails.automate.spec.ts")"

synthetic_uuid_usage_count="$(count_matches "randomUUID\\(" \
  "$ROOT_DIR/tests/support/factories/connectShyftStoryF1Factory.ts" \
  "$ROOT_DIR/tests/support/factories/connectShyftStoryF2Factory.ts" \
  "$ROOT_DIR/tests/support/factories/connectShyftStoryF3Factory.ts" \
  "$ROOT_DIR/tests/support/fixtures/connectShyftStoryF2.fixture.ts" \
  "$ROOT_DIR/tests/api/platform/f-epic-nfr-evidence.api.spec.ts" \
  "$ROOT_DIR/tests/e2e/platform/f-2-canonical-comms-event-model-and-event-store.atdd.spec.ts" \
  "$ROOT_DIR/tests/e2e/platform/f-2-canonical-comms-event-model-and-event-store.atdd-read-model.spec.ts")"

faker_usage_count="$(count_matches "import \\{ faker \\}|faker\\." \
  "$ROOT_DIR/tests/support/fixtures/factories/userFactory.ts" \
  "$ROOT_DIR/tests/fixtures/data-factories.ts")"

prod_dump_reference_count="$(count_matches "prod(uction)?\\s*dump|snapshot of prod|real customer data|pii" \
  "$ROOT_DIR/tests/support/factories/connectShyftStoryF1Factory.ts" \
  "$ROOT_DIR/tests/support/factories/connectShyftStoryF2Factory.ts" \
  "$ROOT_DIR/tests/support/factories/connectShyftStoryF3Factory.ts" \
  "$ROOT_DIR/tests/support/fixtures/connectShyftStoryF1.fixture.ts" \
  "$ROOT_DIR/tests/support/fixtures/connectShyftStoryF2.fixture.ts" \
  "$ROOT_DIR/tests/support/fixtures/connectShyftStoryF3.fixture.ts" \
  "$ROOT_DIR/tests/api/platform/f-epic-nfr-evidence.api.spec.ts")"

cleanup_helper_usage_count="$(count_matches "deleteById\\(" "$ROOT_DIR/tests")"
fixture_cleanup_hook_count="$(count_matches "userFactory\\.cleanup\\(" "$ROOT_DIR/tests/support/fixtures/index.ts")"
dr_probe_cleanup_hook_count="$(count_matches "delete_probe_row\\(" "$ROOT_DIR/scripts/epic-f-dr-drill.sh")"

segregation_pass="false"
if (( tenant_scope_factory_count >= 3 )) && (( tenant_scope_assertion_count >= 20 )); then
  segregation_pass="true"
fi

generation_pass="false"
if (( synthetic_uuid_usage_count >= 8 )) && (( faker_usage_count >= 2 )) && (( prod_dump_reference_count == 0 )); then
  generation_pass="true"
fi

teardown_pass="false"
if (( cleanup_helper_usage_count >= 1 )) && (( fixture_cleanup_hook_count >= 1 )) && (( dr_probe_cleanup_hook_count >= 1 )); then
  teardown_pass="true"
fi

stress_profile_present="false"
stress_requests="0"
if [[ -f "$STRESS_ARTIFACT" ]]; then
  stress_profile_present="true"
  stress_requests="$(node -e "const fs=require('fs');const p=process.argv[1];const j=JSON.parse(fs.readFileSync(p,'utf8'));process.stdout.write(String(j?.stressProfile?.totalRequests ?? 0));" "$STRESS_ARTIFACT")"
fi

test_data_strategy_pass="false"
if [[ "$segregation_pass" == "true" ]] && [[ "$generation_pass" == "true" ]] && [[ "$teardown_pass" == "true" ]] && [[ "$stress_profile_present" == "true" ]]; then
  test_data_strategy_pass="true"
fi

generated_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

cat > "$JSON_ARTIFACT" <<JSON
{
  "generatedAt": "${generated_at}",
  "storyScope": "epic-f",
  "criteria": {
    "testDataStrategy_2_1_segregation": {
      "threshold": "Tenant/orgUnit scoped synthetic data contexts are enforced across Epic F tests",
      "tenantScopeFactoryCount": ${tenant_scope_factory_count},
      "tenantScopeAssertionCount": ${tenant_scope_assertion_count},
      "pass": $(json_bool "$segregation_pass")
    },
    "testDataStrategy_2_2_generation": {
      "threshold": "Synthetic data generation is used; no production dump references in Epic F test assets",
      "syntheticUuidUsageCount": ${synthetic_uuid_usage_count},
      "fakerUsageCount": ${faker_usage_count},
      "productionDumpReferenceCount": ${prod_dump_reference_count},
      "pass": $(json_bool "$generation_pass")
    },
    "testDataStrategy_2_3_teardown": {
      "threshold": "Automated cleanup/reset mechanisms are present for test-created entities and probes",
      "cleanupHelperUsageCount": ${cleanup_helper_usage_count},
      "fixtureCleanupHookCount": ${fixture_cleanup_hook_count},
      "drProbeCleanupHookCount": ${dr_probe_cleanup_hook_count},
      "pass": $(json_bool "$teardown_pass")
    }
  },
  "longWindowReadiness": {
    "stressProfileArtifactPresent": $(json_bool "$stress_profile_present"),
    "stressTotalRequests": ${stress_requests}
  },
  "gate": {
    "testDataStrategyEvidenceComplete": $(json_bool "$test_data_strategy_pass")
  },
  "evidenceSources": [
    "tests/support/factories/connectShyftStoryF1Factory.ts",
    "tests/support/factories/connectShyftStoryF2Factory.ts",
    "tests/support/factories/connectShyftStoryF3Factory.ts",
    "tests/support/fixtures/connectShyftStoryF1.fixture.ts",
    "tests/support/fixtures/connectShyftStoryF2.fixture.ts",
    "tests/support/fixtures/connectShyftStoryF3.fixture.ts",
    "tests/support/fixtures/index.ts",
    "tests/helpers/cleanup.ts",
    "scripts/epic-f-dr-drill.sh",
    "_bmad-output/test-artifacts/epic-f-stress-resource-evidence.json"
  ]
}
JSON

cat > "$MD_ARTIFACT" <<MD
# Epic F Test Data Strategy Evidence

- Generated at: ${generated_at}
- Story scope: Epic F

## ADR Checklist Mapping (Category 2)

| Criterion | Result | Evidence Snapshot |
| --- | --- | --- |
| 2.1 Segregation | ${segregation_pass} | tenant-scope factories: ${tenant_scope_factory_count}, tenant/orgUnit assertions: ${tenant_scope_assertion_count} |
| 2.2 Generation | ${generation_pass} | uuid-based synthetic generators: ${synthetic_uuid_usage_count}, faker usage: ${faker_usage_count}, prod-dump refs: ${prod_dump_reference_count} |
| 2.3 Teardown | ${teardown_pass} | cleanup helper usage: ${cleanup_helper_usage_count}, fixture cleanup hooks: ${fixture_cleanup_hook_count}, DR probe cleanup hooks: ${dr_probe_cleanup_hook_count} |

## Long-window readiness support

- Stress profile artifact present: ${stress_profile_present}
- Stress profile total requests: ${stress_requests}

## Gate

- testDataStrategyEvidenceComplete: ${test_data_strategy_pass}
MD

echo "Epic F test data strategy evidence generated:"
echo "  - $JSON_ARTIFACT"
echo "  - $MD_ARTIFACT"
