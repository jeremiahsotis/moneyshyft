# Acceptance Criteria

## Installability

- manifest.json is present and valid
- install prompt appears on supported devices
- app installs successfully

## Launch behavior

- app launches in standalone display mode
- splash behavior works correctly
- navigation works after cold launch

## Service worker

- service worker registers successfully
- core application shell caches correctly
- stale cache does not break navigation

## Reliability

- refresh does not break login state
- interrupted network does not crash the UI
- major mobile UX bugs resolved

## Performance

- initial launch time significantly improved after install