# Intended vs Actual Authority

## Authority Alignment Table

| Subsystem | Actual runtime authority | Intended authority | Alignment status | Evidence basis |
| --- | --- | --- | --- | --- |
| Auth API | `admin-api` | `admin-api` | Aligned | Constitution, nginx delegation, `admin-api` route registration |
| Platform-admin API | `admin-api` | `admin-api` | Aligned | Constitution, nginx delegation, `admin-api` route registration |
| Money domain API | `money-api` | `money-api` | Aligned | Money lane nginx `/api` ownership and money route registration |
| Money UI | `moneyshyft-web` | `moneyshyft-web` | Aligned | Money lane nginx root and router map |
| Embedded admin/auth code in money lane | Mounted in `money-api` and `moneyshyft-web` | `admin-api` and `admin-web` | Misaligned but delegated | Public ingress delegates away from the money lane even though the code remains mounted and shipped |
| Connect-lane ingress | `connect-api` | `connect-api` | Aligned | Connect lane nginx `/api` ownership and app mount |
| ConnectShyft backend implementation as a whole | Split across `money-api` and `connect-api` | `connect-api` | Misaligned and unresolved | Public connect ingress points to `connect-api`, but runtime-host contract still names `money-api` and both hosts remain live |
| Production migration authority | `shared/database/migrations` | `shared/database/migrations` | Aligned | Shared migration source plus admin packaging path |
| Production migration runner | `admin-api` | `admin-api` for current phase | Aligned for current phase | Deploy guide and `admin-api` knex packaging |
| Dedicated migration runner | Implemented but inactive | Future runner | Transitional, pending cutover | Dedicated image exists, but no deploy contract has adopted it |

## Intended-vs-Actual Decisions

- Use actual ingress plus runtime mount evidence to determine where fixes can land now.
- Keep intended authority visible when it differs from runtime reality so convergence work can be sequenced safely.
- Treat the ConnectShyft backend split as the main intended-vs-actual conflict in scope.
- Treat money-lane admin mirrors as delegated runtime baggage, not alternative intended authorities.
