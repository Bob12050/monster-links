# v8.6-A.16 PWA Cache Audit

## Purpose

Confirm that frequent Monster Links releases do not leave players on stale
HTML, CSS, JavaScript, or an obsolete application cache.

## Checks

- Service Worker registration and activation on a 390 x 844 mobile viewport
- A single current cache named `monster-links-8.6-A.16`
- Automatic removal of a simulated obsolete `monster-links-*` cache
- Versioned requests for the stylesheet and all indexed JavaScript files
- Offline launch through the manifest `start_url`
- Recovery to the current version after returning online
- Manifest `standalone` display mode and required icon sizes

## Cache Policy

- Same-origin game requests use network-first delivery.
- Fresh network requests bypass the browser HTTP cache with `cache: "no-store"`.
- Versioned CSS and JavaScript URLs change on every release.
- A new Service Worker is activated only after every required core file is
  available, avoiding partial-release installation.
- Activation removes every older `monster-links-*` cache.
- Offline fallback uses only the current version cache.

See `audit-results.json` and the paired online/offline screenshots for the
recorded result.
