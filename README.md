# MemoryNode

MemoryNode is a governed memory layer for AI agents.

Current phase: Phase 4. The backend supports manual proposal review, memory
lifecycle transitions, SQLite storage, SQLite FTS5 search, and Qwen-backed
proposal extraction. The frontend dashboard is wired to the MVP memory APIs.

## Structure

- `backend/` - FastAPI backend
- `frontend/` - Next.js dashboard
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

## Dashboard

Start the backend first:

```bash
cd backend
uvicorn app.main:app --reload
```

Then start the frontend:

```bash
cd frontend
npm install
npm run dev
```

The dashboard uses `NEXT_PUBLIC_API_URL` and defaults to
`http://localhost:8000`.

Pages:

- `http://localhost:3000/proposals` - extract transcript proposals, then approve or reject pending proposals.
- `http://localhost:3000/memories` - search active memories.
- `http://localhost:3000/memories/<id>` - explain and revoke a memory.

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

Without those `QWEN_*` values, the extract step cannot call Qwen. Backend tests
still cover lifecycle behavior with mocked extraction.

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
