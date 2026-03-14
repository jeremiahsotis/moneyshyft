# Research: CS-003 Telnyx Outbound Adapter

## Decision 1

- **Decision**: Define the provider-neutral telephony contract in `domains/communication/telephony` and export it from `domains/communication/index.ts`.
- **Rationale**: The ADR and execution packet explicitly place shared telephony contracts in the communication domain and forbid provider logic in `apps/`. Moving the contract there eliminates the current ConnectShyft-local adapter interface and creates the reusable boundary required for later modules.
- **Alternatives considered**: Keep the adapter interface inside `apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts`. Rejected because it leaves the canonical telephony boundary trapped inside ConnectShyft-local code.

## Decision 2

- **Decision**: Keep Telnyx implementation code in `infrastructure/communications/telnyx` and treat it as the only location that knows Telnyx request/response shapes.
- **Rationale**: This matches both the ADR and the repository boundary documents. It also lets ConnectShyft continue to own provider resolution and rollout policy without embedding Telnyx transport code in routes or modules.
- **Alternatives considered**: Put Telnyx request logic directly in `providerRegistry.ts` or route handlers. Rejected because it violates the issue guardrails and would make provider replacement harder.

## Decision 3

- **Decision**: Use direct HTTPS/JSON calls inside the Telnyx adapter for the CS-003 outbound surface instead of introducing a Telnyx SDK dependency at plan time.
- **Rationale**: CS-003 only needs a small provider surface: outbound SMS, outbound call initiation, webhook verification compatibility, and provider event translation. Keeping the adapter on explicit HTTP requests minimizes dependency spread, keeps provider-specific types out of app code, and is straightforward to mock in infrastructure tests. Official Telnyx docs confirm the needed outbound message and call-control endpoints and the Ed25519 webhook-signature model.
- **Alternatives considered**: Adopt the official Telnyx Node SDK immediately. Rejected for CS-003 planning because it increases runtime/package coupling without changing the required domain boundary or the small outbound surface needed for this issue.

## Decision 4

- **Decision**: Keep provider rollout gating, requested-provider resolution, and no-side-effect refusal behavior in the ConnectShyft provider registry, but refactor that registry to depend on the shared telephony contract instead of owning a ConnectShyft-local adapter type.
- **Rationale**: The current registry already owns policy-heavy behavior such as rollout allow-list enforcement, disabled-provider refusals, and webhook signature guardrails. Those are application concerns layered on top of the provider boundary. Reusing that layer avoids needless route churn while still moving the actual telephony contract to the shared domain.
- **Alternatives considered**: Move provider resolution entirely into infrastructure. Rejected because rollout/allowlist policy is application behavior, not provider transport behavior.

## Decision 5

- **Decision**: Reuse the existing ConnectShyft provider correlation and webhook receipt persistence (`connectshyft.cs_provider_identifier_mappings` and `connectshyft.cs_webhook_receipts`) for CS-003 rather than introducing `bridge_session` or new call-session tables in this issue.
- **Rationale**: The repo already contains correlation and replay-safe webhook persistence that align with the canonical `telephony_provider_reference` and `communication_webhook_receipt` concepts. CS-003 is limited to outbound SMS and outbound call initiation; full bridge-session persistence belongs to CS-004.
- **Alternatives considered**: Introduce bridge-session or call-session tables now. Rejected because bridge orchestration is explicitly out of scope for CS-003 and would collapse the execution-order boundary between CS-003 and CS-004.

## Decision 6

- **Decision**: Treat outbound voice in CS-003 as real provider-backed call initiation that returns truthful provider leg/call identifiers, while reserving multi-leg bridge state transitions for CS-004.
- **Rationale**: The issue outcome requires outbound voice initiation, but the issue non-goals exclude call bridging logic. A real outbound call-leg initiation adapter satisfies CS-003 without inventing a partial bridge-session model inside the wrong issue.
- **Alternatives considered**: Keep synthetic outbound call results until CS-004. Rejected because CS-003 exists specifically to replace fake provider behavior with a real adapter.

## Decision 7

- **Decision**: Plan validation around Jest unit/integration tests plus documented Telnyx sandbox verification steps in feature quickstart documentation.
- **Rationale**: The issue requires sandbox integration evidence and adapter interface documentation. Existing ConnectShyft provider-registry and outbound route tests provide the right harness for automated coverage, while sandbox validation belongs in repeatable quickstart/runbook steps.
- **Alternatives considered**: Rely only on mocked tests. Rejected because the issue explicitly requires Telnyx sandbox evidence.
