# Two-Step Bootstrap Prompts - Master Debugging

## Bootstrap Prompt A - discovery map

```text
Build a cross-issue dependency map for the current ConnectShyft debugging sequence.

Read first:
- specs/connectshyft-master-debugging/spec.md
- architecture/connectshyft/runtime-host-reality-contract.md
- architecture/connectshyft/neighbor-texting-preference-contract.md
- architecture/connectshyft/refusal-rendering-contract.md
- architecture/connectshyft/sms-target-resolution-architecture.md
- architecture/connectshyft/response-envelope-note.md
- architecture/connectshyft/non-regression-rules.md
- architecture/connectshyft/issue-sequencing-note.md

Identify:
1. runtime/UI paths for texting preference persistence/display
2. runtime/UI paths for refusal rendering
3. runtime/API paths for SMS target resolution
4. shared helpers or serializers touched by more than one issue
5. risk points where one issue could regress another

Constraints:
- do not modify code yet
- do not perform lane-convergence refactors
- do not combine all three issues into one patch

Output:
- cross-issue dependency map
- file overlap map
- recommended patch boundaries
```

## Bootstrap Prompt B - phased implementation design

```text
Design the phased implementation plan for the ConnectShyft debugging sequence.

Read first:
- specs/connectshyft-master-debugging/spec.md
- architecture/connectshyft/runtime-host-reality-contract.md
- architecture/connectshyft/neighbor-texting-preference-contract.md
- architecture/connectshyft/refusal-rendering-contract.md
- architecture/connectshyft/sms-target-resolution-architecture.md
- architecture/connectshyft/non-regression-rules.md
- architecture/connectshyft/issue-sequencing-note.md

Requirements:
- keep three separate implementation patches
- preserve issue order:
  1. texting preference
  2. refusal rendering
  3. SMS target resolution
- define cross-issue regression checks
- define exact file/function boundaries for each phase
- do not redesign providers
- do not redesign the API envelope
- do not perform lane-convergence refactors

Output:
- phased patch plan
- regression checkpoints
- per-issue boundaries
- recommended test order
```
