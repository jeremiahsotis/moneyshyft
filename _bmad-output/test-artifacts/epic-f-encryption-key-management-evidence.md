# Epic F Encryption and Key-Management Evidence

- Generated at: 2026-03-02T13:31:46.092Z
- NFR12: Data in transit shall be encrypted; sensitive stored credentials/secrets shall not be persisted in plaintext.
- NFR12a: Secrets shall be stored in environment/secret manager; refresh tokens in persistence are stored only as salted hashes.

| Control | Result |
| --- | --- |
| Secrets fail-closed via env/secret manager | pass |
| Refresh token stored as hash at rest | pass |
| Hashing/redaction security tests pass | pass |
| Security scan gate pass | pass |
| Overall encryption/key-management evidence complete | yes |

## Key Sources

- `src/src/utils/jwt.ts`
- `src/src/config/database.ts`
- `src/src/knexfile.ts`
- `src/src/platform/sessions/PlatformSessionStore.ts`
- `src/src/platform/audit/redaction.ts`
- `_bmad-output/test-artifacts/epic-f-security-scan-evidence.json`
- `_bmad-output/test-artifacts/epic-f-sast-security-tests.txt`

