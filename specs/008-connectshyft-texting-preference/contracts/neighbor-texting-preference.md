# Neighbor Texting Preference Contract

## Scope

Current ConnectShyft runtime host only:
- `apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/moneyshyft-api/src/modules/connectshyft/neighbors.ts`

Current UI submission and display surfaces only:
- `apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftNeighborCreateView.vue`
- `apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftNeighborProfileView.vue`
- `apps/connectshyft-web/src/features/connectshyft/presentation.ts`

## Canonical Enum

Canonical API/UI field: `prefersTexting`

Compatibility request alias at the current route boundary: `prefers_texting`

Accepted values for either request field are:
- `YES`
- `NO`
- `UNKNOWN`

## Request Contracts

### POST `/api/v1/connectshyft/neighbors`

**Accepted request body**

```json
{
  "orgUnitId": "22222222-2222-4222-8222-222222222222",
  "firstName": "Mina",
  "lastName": "Lopez",
  "phones": [
    {
      "label": "mobile",
      "value": "+12605550199"
    }
  ],
  "prefersTexting": "YES"
}
```

**Behavior**
- If `prefersTexting` is omitted, runtime persists `YES`
- If `prefersTexting` is provided as a canonical enum, runtime persists that exact value
- If an incoming value is not canonical, the current runtime surface treats it as omitted
- The route may accept `prefers_texting` as a compatibility alias, but the canonical response field remains `prefersTexting`

### PUT `/api/v1/connectshyft/neighbors/:neighborId`

**Accepted request body**

```json
{
  "orgUnitId": "22222222-2222-4222-8222-222222222222",
  "firstName": "Mina",
  "lastName": "Lopez",
  "phones": [
    {
      "label": "mobile",
      "value": "+12605550199",
      "isShared": false
    }
  ],
  "prefersTexting": "NO"
}
```

**Behavior**
- If `prefersTexting` is provided, runtime persists the canonical value
- If omitted, runtime preserves the existing stored value
- If an incoming value is not canonical, the current runtime surface treats it as omitted and preserves the existing stored value

## Response Contract

### Neighbor envelope payload

```json
{
  "ok": true,
  "code": "CONNECTSHYFT_NEIGHBOR_RESOLVED",
  "data": {
    "neighbor": {
      "neighborId": "neighbor-123",
      "tenantId": "tenant-123",
      "orgUnitId": "org-123",
      "firstName": "Mina",
      "lastName": "Lopez",
      "prefersTexting": "YES",
      "phones": []
    }
  }
}
```

**Rules**
- API responses MUST return the persisted canonical enum
- Responses MUST NOT degrade `YES` to `UNKNOWN`
- Any fallback to `UNKNOWN` is allowed only when the stored value is truly absent or invalid

## UI Display Contract

**Display labels**
- `YES` -> `Prefers Texting`
- `NO` -> `Prefers Calls Only`
- `UNKNOWN` -> `Texting Preference Unknown`

**Display surfaces**
- Inbox snapshot
- Thread detail snapshot
- Any future current-lane neighbor preference chip or badge

**Rules**
- UI labels must be derived from canonical enum values only
- UI copy must match the contract strings exactly
