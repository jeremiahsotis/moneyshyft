# Bootstrap Prompts - Migration Authority Convergence

## Bootstrap Prompt 1 - discovery

```text
You are implementing Migration Authority Convergence.

Read these first:
- architecture/database/shared-migration-authority-contract.md
- architecture/database/migration-reconciliation-model.md
- specs/migration-authority-convergence/spec.md
- specs/migration-authority-convergence/implementation-checklist.md
- specs/migration-authority-convergence/manual-hotfix-reconciliation.md

Goal:
Move to shared migration ownership with one authorized production runner.

Constraints:
- do not run production migrations
- do not modify public.knex_migrations
- do not apply production SQL
- do not redesign runtime features

First:
1. inventory migration sources in admin-api, money-api, connect-api
2. identify production-relevant migrations missing from shared authority
3. identify what the current authorized runner reads today
4. propose a minimal repo patch set
5. do not write code yet
```

## Bootstrap Prompt 2 - implementation

```text
Proceed with Migration Authority Convergence implementation using the approved plan.

Requirements:
- add shared migration authority folders
- add reconciliation script
- add manual hotfix override support
- update the authorized runner to read shared migration authority
- preserve migration filenames and order
- do not auto-run migrations
- do not auto-mark manual hotfixes as applied

Implementation order:
1. shared authority folder structure
2. overrides file
3. reconciliation script
4. promotion of current migration files into shared authority
5. authorized runner config update
6. docs and PR guardrails
```
