# BUG-20260710-01: Mobile Dashboard Overflows Horizontally

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

Yes. This blocks competition-demo recording and release readiness.

## Next One-Click Prompt

```text
Read AGENTS.md and docs/undone-development-plan/bugtriage-20260710-01-mobile-layout.md.
Fix only BUG-20260710-01 in frontend/app/layout.jsx. Do not change product APIs,
dependencies, .env, databases, or unrelated styling. Run backend pytest, frontend
build, and browser QA at 390px and 1280px with isolated data. Commit and push the
focused fix, then hand off to QA regression.
```
