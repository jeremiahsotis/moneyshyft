# Repo Constraints

Existing structure:

apps:
- moneyshyft-web

services:
- moneyshyft-api

Other runtime components:
- admin-api
- connectshyft-api

## Important constraints

- existing users must not lose access
- authentication behavior must remain stable
- mobile browser compatibility must be preserved
- no breaking API changes allowed

## Migration constraints

No database migrations required for PWA release.