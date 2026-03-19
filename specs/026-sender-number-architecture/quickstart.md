# Quickstart: Sender Number Architecture

## Objective

Implement the centralized sender-number resolver in small backend-only slices, prove deterministic same-thread sender reuse, and verify that inbound and outbound SMS stay aligned without synthetic identifiers or fallback sender assignment.

## Slice order

1. Build the centralized resolver and thread-alignment semantics.
2. Integrate outbound SMS and inbound SMS correlation or persistence.
3. Apply the same contract to the partial voice flow and run final regression checks.

## Commands

### Baseline context

```bash
cd /Users/jeremiahotis/projects/connectshyft
git branch --show-current
sed -n '1,220p' /Users/jeremiahotis/projects/connectshyft/specs/026-sender-number-architecture/spec.md
sed -n '1,260p' /Users/jeremiahotis/projects/connectshyft/specs/026-sender-number-architecture/plan.md
```

### Slice 1 verification

```bash
cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api
npm run build
npx jest --runInBand \
  src/modules/connectshyft/__tests__/threads.test.ts \
  src/modules/connectshyft/__tests__/threads.contract.test.ts \
  src/modules/connectshyft/__tests__/readContracts.test.ts \
  src/modules/connectshyft/__tests__/numberMappings.test.ts
```

### Slice 2 verification

```bash
cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api
npm run build
npx jest --runInBand \
  src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts \
  src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts \
  src/routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts \
  src/modules/connectshyft/__tests__/inboundSms.test.ts
```

### Slice 3 verification

```bash
cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api
npm run build
npx jest --runInBand \
  src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts \
  src/modules/connectshyft/__tests__/bridgeSessions.test.ts \
  src/modules/connectshyft/__tests__/inboundVoice.test.ts \
  src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts \
  src/routes/api/v1/__tests__/connectshyft.provider-registry.dispatch-events.test.ts
```

### Local CI parity

```bash
cd /Users/jeremiahotis/projects/connectshyft
npm run policy:check
bash scripts/verify-connectshyft-route-ownership.sh
bash scripts/lint-or-discovery.sh
bash scripts/ci-run-playwright-stack.sh bash scripts/backend-jest-ci.sh
bash scripts/ci-run-playwright-stack.sh bash scripts/test-changed.sh origin/codex/dev
bash scripts/ci-run-playwright-stack.sh bash scripts/burn-in.sh 3 origin/codex/dev
bash scripts/quality-gates.sh
```

### Backend burn-in for this feature

```bash
cd /Users/jeremiahotis/projects/connectshyft
for i in 1 2 3; do
  bash scripts/ci-run-playwright-stack.sh bash scripts/backend-jest-ci.sh || exit 1
done
```

### Static regression checks

```bash
rg -n "sms-inbound:|sms-outbound:|resolveDeterministicThreadIdForNumberMapping|single_active_org_unit_mapping" \
  /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src

rg -n "127\\.0\\.0\\.1:3002|connect_api|/api/v1/auth|/api/v1/platform/admin|host-managed|host\\.docker\\.internal|migrate:latest:prod" \
  /Users/jeremiahotis/projects/connectshyft/docs/PRODUCTION_DEPLOYMENT_GUIDE.md \
  /Users/jeremiahotis/projects/connectshyft/nginx/nginx.conf \
  /Users/jeremiahotis/projects/connectshyft/docker-compose.example.yml \
  /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/Dockerfile.production \
  /Users/jeremiahotis/projects/connectshyft/apps/admin-api/knexfile.js
```

## Manual verification checklist

- Send two outbound SMS messages from the same thread and verify both use the same sender number.
- Process an inbound SMS on a mapped provider number and verify the ensured thread stores the same sender number future outbound sends reuse.
- Remove or deactivate the mapped sender number for a thread and verify outbound dispatch refuses before provider invocation.
- Exercise a voice path that selects an outbound ConnectShyft line and verify it either uses the centralized sender decision or refuses without inventing a fallback sender.

## Rollback guidance

- Preferred rollback is to revert the sender-number architecture feature as one unit.
- Do not keep a normal-path synthetic fallback active after rollback; any emergency exception would need to be explicit and time-bounded outside the forward design.
