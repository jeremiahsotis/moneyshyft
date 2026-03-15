# Bootstrap Prompts - Migration Runner

## Bootstrap Prompt 1 - discovery

```text
You are implementing the Dedicated Migration Runner.

Read these first:
- architecture/database/shared-migration-authority-contract.md
- architecture/database/migration-runner-architecture.md
- specs/007-migration-runner/spec.md
- specs/007-migration-runner/implementation-checklist.md

Constraints:
- do not redesign migration ownership
- do not allow runtime APIs to execute production migrations
- runner must use shared/database/migrations only
- no HTTP server

First:
1. propose the minimal app structure
2. propose the knex config path
3. propose the Dockerfile
4. propose the execution command
5. do not write code yet
```

## Bootstrap Prompt 2 - implementation

```text
Proceed with Dedicated Migration Runner implementation using the approved plan.

Requirements:
- add apps/migration-runner
- add package manifest
- add knexfile pointing only at shared/database/migrations
- add Dockerfile
- add minimal execution docs
- do not modify runtime APIs
- do not bypass the single authorized runner rule
```
