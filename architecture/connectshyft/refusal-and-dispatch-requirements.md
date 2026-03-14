# Refusal and Dispatch Requirements

Status: Supporting requirements note

## Requirement

Known pre-provider validation failures must be surfaced as explicit business refusals.

## Applies to

- missing SMS target phone
- multiple SMS target candidates
- texting preference not allowing SMS

## Not acceptable

Returning only:

`CONNECTSHYFT_PROVIDER_DISPATCH_FAILED`

when the failure is deterministically known before provider dispatch.

## Preferred refusal codes

- `CONNECTSHYFT_SMS_TARGET_PHONE_NOT_AVAILABLE`
- `CONNECTSHYFT_SMS_MULTIPLE_TARGET_PHONES`
- `CONNECTSHYFT_SMS_TEXTING_NOT_PERMITTED`

Exact naming may vary if the runtime already has a refusal taxonomy, but the behavior must remain explicit and non-generic.
