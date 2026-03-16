# Workflow Context

## Install workflow

1. User visits MoneyShyft in a mobile browser
2. Browser detects PWA capability
3. Install prompt becomes available
4. User installs the application
5. App appears on home screen
6. User launches the app directly

## Launch workflow

1. User taps the MoneyShyft icon
2. Application launches in standalone mode
3. User session is restored or login is requested
4. Budget dashboard loads

## Refresh workflow

1. User refreshes the app
2. Service worker ensures cached shell loads quickly
3. API data refresh occurs safely

## Offline/interrupted state

1. User temporarily loses connectivity
2. UI should not crash
3. App gracefully shows loading/retry state