# Final Competition Capture Evidence

Captured on 2026-07-11 from the local production build with an isolated SQLite database and synthetic demo content. No `.env` values, API keys, or user data are included.

## Screenshots

- `mobile-390-01-proposals.jpg`, `mobile-390-02-search.jpg`, `mobile-390-03-detail.jpg`: 390x844 viewport captures.
- `desktop-1280-01-proposals.jpg`, `desktop-1280-02-search.jpg`, `desktop-1280-03-detail.jpg`: 1280x844 viewport captures; the detail artifact includes the full audit content.

Each route was checked before capture for horizontal document overflow. The proposal queue, approved Qwen Cloud search result, source evidence, approval reason, and audit event were present in the corresponding captures.

## Recording

`approved-demo-flow.mp4` is a silent 20-second H.264 recording assembled from five observed 1280x720 browser states:

1. pending proposal;
2. approved memory in default search;
3. explain and audit detail;
4. revoked detail state;
5. no matching memory in default search after revocation.

FFprobe validation: H.264, 1280x720, 20 seconds, 600 frames.

## Final Release Check

- Backend: `12 passed in 3.52s`.
- Frontend: Next.js 16.2.10 production build passed and generated all four routes.
- Browser: the approved lifecycle completed against isolated data; the revoked memory disappeared from default search.
- Judgment: `release-ready`; no release blocker observed.
