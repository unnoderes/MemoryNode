# MemoryNode Agent Notes

## Current Stage

MemoryNode is moving from a runnable MVP skeleton toward a competition-grade prototype.

The MVP backend and dashboard are working, but the product is still visually and experientially rough. Do not treat the current UI as final. The next engineering phase should improve product quality, dashboard information architecture, visual polish, and the trustworthy-memory narrative.

## Implemented So Far

- FastAPI backend with `/health`.
- Manual proposal creation.
- Qwen-compatible proposal extraction via `POST /v1/proposals/extract`.
- OpenAI-compatible Responses API relay support through `QWEN_WIRE_API=responses`.
- SQLite storage for sources, proposals, memories, and events.
- SQLite FTS5 search for active memories.
- Memory lifecycle:
  - extract proposal
  - approve or reject proposal
  - search approved memory
  - explain memory with source and events
  - revoke memory
- Basic Next.js dashboard, now translated to Chinese.
- Submission docs:
  - `docs/architecture.md`
  - `docs/demo-script.md`

## Known Gaps

- The dashboard is functional but too plain for a competitive submission.
- No conflict detection yet.
- No memory expiration UI yet.
- No SDK, MCP adapter, hooks, auth, Docker, or deployment story yet.
- Qwen Cloud quota is not approved yet; local testing currently uses a relay configured in `.env`.

## Local Secrets

- `.env` is ignored and may contain a real API key.
- Never commit `.env`, real API keys, local databases, cache folders, or `node_modules`.
- Keep `.env.example` as placeholders only.

## Version Control

- Repository: `https://github.com/unnoderes/MemoryNode`
- Branch: `main`
- Remote visibility is currently private.
- Worktree should stay clean after each task.
- Commit each coherent task with a short imperative message.
- Push `main` after each completed task.
- Do not rewrite history unless explicitly requested.

## Verification

Before committing code changes, run:

```bash
cd backend
python -m pytest -q
```

For frontend changes, also run:

```bash
cd frontend
npm run build
```

## Development Style

- Keep changes small and direct.
- Do not add SDK, MCP, hooks, Docker, auth, or vector databases unless the current task explicitly asks for them.
- Reuse the existing FastAPI, SQLite, and Next.js structure.
- Prefer improving the product surface over adding speculative infrastructure.
