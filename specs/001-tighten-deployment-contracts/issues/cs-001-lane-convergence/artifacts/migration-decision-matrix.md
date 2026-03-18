# Migration Decision Matrix (CS-001)

| Artifact Group | Source | Action | Target | Notes |
|---|---|---|---|---|
| ConnectShyft UI components | `apps/moneyshyft-web/src/components/connectshyft/*` | Migrate then delete source | `apps/connectshyft-web/src/components/connectshyft/*` | Maintain parity and single lane ownership |
| ConnectShyft views | `apps/moneyshyft-web/src/views/ConnectShyft/*` | Migrate needed views then delete source | `apps/connectshyft-web/src/views/ConnectShyft/*` | Directory view is migrated |
| ConnectShyft feature helpers | `apps/moneyshyft-web/src/features/connectshyft/*` | Migrate needed helper(s), delete source | `apps/connectshyft-web/src/features/connectshyft/*` | `settingsAccess.ts` migrated |
| ConnectShyft routes | money router | Remove | connect router only | `/app/connectshyft/*` single owner |
| ConnectShyft CI startup target | scripts/workflows | Retarget | connect frontend startup | Playwright stack uses connect lane |
