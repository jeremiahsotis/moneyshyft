# Data Contract Context

## Domain objects used

The PWA layer does not introduce new business objects.

It consumes existing API models:

- Budget
- Transaction
- Category
- Account

## State considerations

Important client states:

- authenticated
- unauthenticated
- installing
- installed
- offline
- syncing

## API interaction

The PWA continues to call existing endpoints in moneyshyft-api.

No new domain endpoints are required for MVP.