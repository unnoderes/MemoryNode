# MemoryNode

MemoryNode is a governed memory layer for AI agents.

Current phase: Phase 3. The backend supports manual proposal review, memory
lifecycle transitions, SQLite storage, SQLite FTS5 search, and Qwen-backed
proposal extraction.

## Structure

- `backend/` - FastAPI backend
- `frontend/` - frontend app skeleton
- `sdk/python/` - Python SDK placeholder directory
- `docs/` - project documents

## Implemented

- `GET /health`
- `POST /v1/proposals/extract` for Qwen candidate extraction
- `POST /v1/proposals` for manual proposal creation
- `GET /v1/proposals?status=pending`
- `POST /v1/proposals/{id}/approve`
- `POST /v1/proposals/{id}/reject`
- `POST /v1/memories/{id}/revoke`
- `GET /v1/memories/search?q=...` using SQLite FTS5
- `GET /v1/memories/{id}`
- `GET /v1/memories/{id}/explain`

Not implemented yet:

- SDK, MCP, hooks, auth, Docker

## Qwen Extraction

`POST /v1/proposals/extract` accepts:

```json
{
  "actor_id": "demo-user",
  "project_id": "memorynode-demo",
  "messages": [
    {"role": "user", "content": "This project must use Qwen Cloud."}
  ]
}
```

It creates one `memory_sources` row and pending `memory_proposals`; it does not
approve proposals or create memories.

Real Qwen calls require:

```bash
QWEN_API_KEY=...
QWEN_BASE_URL=...
QWEN_MODEL=...
```

## Start

Backend:

```bash
cd backend
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Test

```bash
cd backend
python -m pytest -q
```
