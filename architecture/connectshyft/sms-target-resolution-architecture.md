# SMS Target Resolution Architecture Note

Status: Supporting architecture note

## Problem

Outbound SMS currently fails on VOICE-origin threads because provider dispatch requires `targetPhone`, but thread state does not always carry an explicit SMS target.

## Resolution order

When `channel = sms`, resolve target phone in this order:

1. explicit thread SMS target metadata, if present
2. linked neighbor's primary active valid phone
3. linked neighbor's only active valid phone, if exactly one exists
4. otherwise refuse

## Determinism rule

Automatic resolution is allowed only when the chosen phone is deterministic.

If multiple active valid neighbor phones exist, the system must refuse with a specific message rather than guess.

## Texting preference gate

SMS send is allowed only when:

`prefers_texting = YES`

## Refusal requirements

Use specific refusal categories/messages for:

- no target phone available
- multiple possible phones
- texting not permitted

Do not collapse these into generic provider dispatch failure when the problem is known before provider call.
