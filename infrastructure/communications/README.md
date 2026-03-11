# Communications Infrastructure

This directory contains provider-specific and transport-specific communication integrations.

Belongs here:
- Telnyx adapter
- webhook verification
- provider event translation
- provider persistence / reconciliation support

Does not belong here:
- canonical phone parsing
- business workflow rules
- bridge domain ownership
- UI logic

Rules:
- Provider integrations must stay behind infrastructure boundaries.
- Upstream code should call provider-neutral interfaces whenever possible.
