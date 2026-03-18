# Two-Step Bootstrap Prompts - Texting Preference

## Bootstrap Prompt A - discovery

```text
Trace prefers_texting through the current ConnectShyft runtime host.

Read first:
- specs/connectshyft-texting-preference/spec.md
- architecture/connectshyft/runtime-host-reality-contract.md
- architecture/connectshyft/neighbor-texting-preference-contract.md

Important runtime reality:
ConnectShyft runtime currently lives under apps/moneyshyft-api.

Start from:
- apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts
- apps/moneyshyft-api/src/modules/connectshyft/neighbors.ts
- any related ConnectShyft serializers or frontend display paths

Identify:
1. DB read/write path for prefers_texting
2. create/update request mapping
3. response serialization
4. UI display mapping
5. exact point where YES becomes UNKNOWN, if it does

Constraints:
- do not modify code yet
- do not perform lane-convergence refactors
- do not move code into apps/connectshyft-api

Output:
- dependency map
- file list
- exact break point
```

## Bootstrap Prompt B - minimal fix design

```text
Design the minimal fix for ConnectShyft texting preference persistence and display.

Read first:
- specs/connectshyft-texting-preference/spec.md
- architecture/connectshyft/runtime-host-reality-contract.md
- architecture/connectshyft/neighbor-texting-preference-contract.md

Runtime host:
apps/moneyshyft-api

Requirements:
- default = YES
- persisted enum remains YES | NO | UNKNOWN
- API returns correct enum
- UI displays correct label
- no lane refactor
- no module relocation

Output:
- minimal patch set
- exact file/function boundaries
- validation strategy
- test cases
```
