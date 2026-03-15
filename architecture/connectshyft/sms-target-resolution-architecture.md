# SMS Target Resolution Architecture

Status: Governing architecture note

Outbound SMS fails on VOICE-origin threads because provider dispatch requires `targetPhone`, but thread state does not always carry an explicit SMS target.

Resolution order for `channel = sms`:

1. explicit thread SMS target metadata, if present
2. linked neighbor primary active valid phone
3. linked neighbor only active valid phone, if exactly one exists
4. otherwise refuse

Automatic resolution is allowed only when the target is deterministic.

SMS send is allowed only when:

`prefers_texting = YES`
