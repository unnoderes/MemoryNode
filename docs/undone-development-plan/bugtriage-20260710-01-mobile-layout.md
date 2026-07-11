# BUG-20260710-01: Mobile Dashboard Overflows Horizontally

- Status: resolved
- Fixed by: `a53e6e5` (`fix: stack mobile dashboard layout`)
- Verified: 2026-07-11

- Severity: P1
- Type: responsive UI
- Baseline: `c7393f7ee73f83d60f514c3d1271815c0a818727`
- Impact: at a 390px viewport, the dashboard sidebar and main content remain in
  a horizontal flex row. Proposal review content, controls, related-memory
  candidates, and audit detail are not fully visible on a mobile screen.

## Reproduction

1. Start the backend and frontend with the documented default ports.
2. Open `/proposals` in a 390px-wide viewport.
3. Repeat on `/memories` and `/memories/<id>`.

## Expected Result

The navigation and main content use a mobile layout without horizontal overflow
or overlapping text and controls. Proposal, search, related-memory, expiry, and
timeline content remain reachable.

## Actual Result

At 390x844, the sidebar occupies the left portion of the viewport while the
main content begins to its right and is clipped. The navigation footer and
content column overlap the available horizontal space.

## Evidence

- QA-09 visual check on 2026-07-10 in an isolated local frontend at 390x844.
- `frontend/app/layout.jsx:125` keeps `.app-container` as a flex row.
- The mobile rule at `frontend/app/layout.jsx:510` changes `.sidebar` width to
  `100%` but does not change the parent flex direction, producing the overflow.

## Suggested Fix Scope

Adjust only the shared mobile layout rules in `frontend/app/layout.jsx`, then
verify proposal, search, and detail pages at 390px and 1280px. Preserve the
existing desktop information architecture and API contracts.

## Forbidden Actions

- Do not change backend lifecycle behavior or API contracts.
- Do not add dependencies, SDKs, MCP, hooks, auth, Docker, or a redesign.
- Do not alter `.env`, user databases, or Git history.

## Acceptance Criteria

- At 390px, no horizontal page overflow occurs on `/proposals`, `/memories`, or
  `/memories/<id>`.
- Navigation, proposal actions, related-memory candidates, expiry input, and
  event timeline are readable and operable.
- At 1280px, the existing desktop layout remains intact.

## Regression Requirement

Run `cd backend; python -m pytest -q`, `cd frontend; npm.cmd run build`, and
browser checks at 390px and 1280px using isolated QA data.

## Release Blocking Decision

No. Regression passed after `a53e6e5`.

## Resolution Evidence

- Backend regression: `12 passed in 2.05s`.
- Frontend production build: Next.js 16.2.10 compiled, type-checked, and generated all 4 routes.
- Isolated browser data on `/proposals`, `/memories`, and `/memories/<id>` at 390x844 and 1280x844 produced no horizontal document overflow or offscreen elements.
- At 390x844, proposal actions, the related-memory candidate radio, native expiry input, search controls, revoke action, source detail, and the one-event audit timeline remained visible and within the viewport.
- Desktop layout and controls remained within the 1280px viewport.

## Next One-Click Prompt

```text
Read AGENTS.md, docs/demo-script.md, and
docs/undone-development-plan/qa-20260710-01-competition-demo-readiness.md.
Do not add features or change product code. Capture final competition screenshots
at 390px and 1280px with isolated demo data, record the approved demo flow, and run
the final release-check. Do not expose or commit .env, API keys, databases, caches,
node_modules, or .next. Record only observed evidence and stop if any release blocker appears.
```
