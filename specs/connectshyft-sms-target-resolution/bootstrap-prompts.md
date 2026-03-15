# Two-Step Bootstrap Prompts - SMS Target Resolution

## Bootstrap Prompt A - discovery

```text
Explore ConnectShyft outbound SMS dispatch in the current runtime host.

Read first:
- specs/connectshyft-sms-target-resolution/spec.md
- architecture/connectshyft/runtime-host-reality-contract.md
- architecture/connectshyft/sms-target-resolution-architecture.md
- architecture/connectshyft/refusal-and-dispatch-requirements.md
- architecture/connectshyft/neighbor-texting-preference-contract.md

Important runtime reality:
ConnectShyft runtime currently lives under apps/moneyshyft-api.

Start from:
- apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts
- outbound thread-message route
- provider registry dispatch path
- neighbor / SMS helper paths in apps/moneyshyft-api/src/modules/connectshyft/

Identify:
1. where targetPhone is currently required
2. where targetPhone should be resolved
3. whether neighbor phone lookup utilities already exist
4. where prefers_texting is checked
5. where refusal classification occurs

Constraints:
- do not modify code yet
- do not perform lane-convergence refactors
- do not move code into apps/connectshyft-api

Output:
- dependency map of SMS send path
- file list
- exact insertion point for deterministic target resolution
```

## Bootstrap Prompt B - minimal fix design

```text
Design deterministic SMS target resolution for the current runtime host.

Read first:
- specs/connectshyft-sms-target-resolution/spec.md
- architecture/connectshyft/runtime-host-reality-contract.md
- architecture/connectshyft/sms-target-resolution-architecture.md
- architecture/connectshyft/refusal-and-dispatch-requirements.md
- architecture/connectshyft/neighbor-texting-preference-contract.md

Runtime host:
apps/moneyshyft-api

Rules:
- explicit thread SMS target wins if present
- otherwise resolve from linked neighbor phones
- require prefers_texting = YES
- allow only deterministic resolution
- multiple valid phones must trigger explicit refusal
- do not redesign provider adapters
- do not move code into apps/connectshyft-api

Output:
- updated dispatch flow
- exact function boundaries
- minimal patch set
- explicit refusal codes/messages
- test cases
```
