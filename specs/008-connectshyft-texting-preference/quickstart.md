# Quickstart

## Goal

Verify that the current ConnectShyft runtime host persists, returns, and displays canonical texting preferences without degrading `YES` to `UNKNOWN`.

## Automated Checks

### Backend module tests

From repo root:

```bash
cd apps/moneyshyft-api && npm test -- --runInBand src/modules/connectshyft/__tests__/neighbors.test.ts
```

### Backend route tests

From repo root:

```bash
cd apps/moneyshyft-api && npm test -- --runInBand src/routes/api/v1/__tests__/connectshyft.neighbors.test.ts
```

## Manual Verification

### 1. Create default path

1. Open the ConnectShyft add-neighbor view.
2. Leave the texting-preference selector at its default.
3. Create a neighbor with a valid phone number.
4. Confirm the API response returns `prefersTexting: "YES"`.
5. Confirm inbox or thread-detail snapshot displays `Prefers Texting`.

### 2. Explicit `NO`

1. Create a neighbor with texting preference set to `NO`.
2. Confirm the API response returns `prefersTexting: "NO"`.
3. Confirm the snapshot displays `Prefers Calls Only`.

### 3. Explicit `UNKNOWN`

1. Create or update a neighbor with texting preference set to `UNKNOWN`.
2. Confirm the API response returns `prefersTexting: "UNKNOWN"`.
3. Confirm the snapshot displays `Texting Preference Unknown`.

### 4. Update round-trip

1. Open an existing neighbor profile.
2. Change the texting preference from `UNKNOWN` to `YES`.
3. Save the profile.
4. Confirm the update response returns `prefersTexting: "YES"`.
5. Confirm the inbox/thread snapshot now displays `Prefers Texting`.

## Regression Notes

- No route ownership, deployment topology, or lane isolation behavior should change.
- SMS preference resolution should continue reading the stored canonical enum from the same neighbor record.
