# MemoryNode MVP Development Plan

## 1. Stack

Backend:

```text
Python 3.12
FastAPI
Uvicorn
Pydantic
SQLAlchemy
SQLite
SQLite FTS5
```

Frontend:

```text
Next.js
React
Tailwind
Radix or shadcn/ui
lucide-react
```

LLM:

```text
Qwen Cloud chat API
```

Later, not MVP:

```text
Postgres + pgvector
MCP adapter
Codex / Claude Code hooks
TypeScript SDK
```

## 2. Architecture

```text
Dashboard / SDK / future adapters
            |
            v
      FastAPI HTTP API
            |
   +--------+---------+
   |                  |
   v                  v
Memory service    Qwen extractor
   |
   v
SQLite + FTS5
```

Only the HTTP API owns product behavior. Dashboard and future adapters stay thin.

## 3. Suggested Directory Shape

Create this when implementation starts:

```text
MemoryNode/
  backend/
    app/
      main.py
      db.py
      models.py
      schemas.py
      services.py
      qwen.py
    tests/
      test_memory_lifecycle.py
  frontend/
    app/
    components/
    lib/
  sdk/
    python/
      memorynode.py
  docs/
```

Do not split backend into repository/interface/factory layers for MVP.

## 4. Implementation Phases

### Phase 0: Skeleton

Goal: boot both apps with empty pages and health checks.

Tasks:

- Create backend FastAPI app.
- Add `/health`.
- Create SQLite connection and tables.
- Create frontend app with routes for proposals and memories.

Done when:

- Backend returns `{"ok": true}`.
- Frontend loads without API data.

### Phase 1: Storage And Lifecycle

Goal: implement memory state transitions without Qwen.

Tasks:

- Add SQLAlchemy models or direct SQL for the four MVP tables.
- Add proposal creation with manually supplied content.
- Add approve, reject, revoke.
- Add memory events.
- Add guard clauses for invalid transitions.
- Add one backend test for approve -> search -> revoke.

Done when:

- A proposal can become an active memory.
- Revoked memory is excluded from default search.
- Invalid transition returns 409.

### Phase 2: Search

Goal: make approved memories retrievable.

Tasks:

- Add SQLite FTS5 index.
- Add `/v1/memories/search`.
- Filter out revoked and expired memories by default.
- Add simple status filters for dashboard.

Done when:

- Searching for "Qwen Cloud" returns the approved project constraint.
- Revoked memories do not appear unless explicitly requested.

### Phase 3: Qwen Extraction

Goal: turn raw transcripts into proposals.

Tasks:

- Add Qwen client wrapper.
- Add extractor prompt that returns strict JSON.
- Validate model output with Pydantic.
- Store raw source text and extracted proposals.
- Return useful errors on malformed model output.

Done when:

- A transcript creates pending proposals.
- Each proposal has content, type, confidence, source quote, and reason.

### Phase 4: Dashboard

Goal: make the lifecycle visible.

Tasks:

- `/proposals`: list pending proposals, approve, reject.
- `/memories`: search and status filter.
- `/memories/:id`: explain view with source, reason, events, revoke.

Done when:

- The full demo can be performed from the browser.

### Phase 5: Thin Python SDK

Goal: show this is infrastructure, not only a web app.

Tasks:

- Add a tiny `MemoryNodeClient`.
- Methods: `extract`, `search`, `approve`, `reject`, `revoke`.
- Include one example script.

Done when:

- A Python script can extract and search memories through the HTTP API.

## 5. Demo Script

Demo transcript:

```text
This project must use Qwen Cloud instead of OpenAI APIs.
Keep answers concise.
We already decided to use FastAPI, SQLite, and Next.js for MVP.
```

Expected demo:

```text
1. Paste transcript into extractor.
2. Dashboard shows three proposals.
3. Approve "use Qwen Cloud" and "FastAPI/SQLite/Next.js".
4. Reject "keep answers concise" if treating it as user preference outside project scope.
5. Search "what stack should this project use?"
6. Explain approved memory and show source quote.
7. Revoke the Qwen Cloud memory.
8. Search again and show it is gone from default results.
```

## 6. Test Plan

Backend minimum checks:

- approving pending proposal creates active memory
- approving approved proposal returns 409
- rejecting approved proposal returns 409
- revoked memory is excluded from search
- explain returns source and events
- extractor rejects malformed Qwen JSON

Frontend manual checks:

- proposals page handles empty and non-empty states
- approve/reject buttons update the list
- search page handles no results
- detail page shows source quote and event history
- revoke action updates status

## 7. Environment Variables

Backend:

```text
MEMORYNODE_DB_PATH=./memorynode.db
QWEN_API_KEY=
QWEN_BASE_URL=
QWEN_MODEL=
```

Frontend:

```text
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Qwen endpoint details should be verified during implementation. Keep the wrapper isolated in `qwen.py` so provider changes do not touch business logic.

## 8. Migration Path After MVP

Only add these after the browser demo works:

- Replace SQLite with Postgres.
- Add pgvector or Qwen embeddings.
- Add MCP adapter as a thin HTTP wrapper.
- Add Codex/Claude hook examples.
- Add TypeScript SDK.
- Add auth if deploying publicly.

## 9. First Build Order

Use this exact order:

```text
1. backend tables
2. proposal approve/reject/revoke APIs
3. search API
4. Qwen extraction
5. dashboard
6. Python SDK
```

Do not start with frontend polish, vector search, or adapter work.
