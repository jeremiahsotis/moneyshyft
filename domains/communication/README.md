# Communication Domain

This directory is the authoritative home for shared communication logic used across modules.

Belongs here:
- phone normalization and formatting
- communication traits
- message / channel domain rules
- bridge session orchestration
- reliability / idempotency rules
- communication audit behavior

Does not belong here:
- UI components
- provider-specific Telnyx code
- app-local view helpers
- framework-specific rendering concerns

Rules:
- Anything reusable across ConnectShyft, ProgramShyft, CaseShyft, or People Core should start here.
- App code may consume this domain but must not redefine its canonical behavior locally.
- Consumers should import shared communication APIs from `/Users/jeremiahotis/projects/connectshyft/domains/communication/index.ts`, not deep paths such as `domains/communication/phone/*`.
- Phone normalization is caller-configured through `PhoneNormalizationContext`; lane code owns env/config resolution while the shared domain stays deterministic and side-effect free.
