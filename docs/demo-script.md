# MemoryNode 3 Minute Demo Script

## 0:00-0:15 Problem

AI agents can remember useful context, but memory is often opaque. Users cannot
see why a memory exists, temporary statements can become durable facts, and bad
memories are hard to revoke cleanly.

## 0:15-0:45 Product Idea

MemoryNode is a governed memory layer for agents. It turns raw interactions into
reviewable memory proposals, requires a human approve or reject decision, and
keeps every approved memory searchable, explainable, and revocable.

The MVP workflow is:

```text
extract -> approve/reject -> search -> explain -> revoke
```

## 0:45-2:15 Live Demo Steps

1. Open the dashboard at `/proposals`.
2. Use the default transcript:

   ```text
   This project must use Qwen Cloud instead of OpenAI APIs.
   We decided to use FastAPI, SQLite, and Next.js for the MVP.
   Keep approved memories auditable and revocable.
   ```

3. Click Extract and show pending proposals. Explain that extraction creates
   proposals only; it does not approve memories.
4. Approve at least one useful proposal, such as the Qwen Cloud constraint.
5. Open `/memories`.
6. Search for `Qwen Cloud` and show the approved memory in results.
7. Open the memory detail page.
8. Show content, status, type, source quote, reason, and events.
9. Click Revoke.
10. Return to `/memories`, search again, and show the revoked memory no longer
    appears in default search.

## 2:15-2:45 Architecture

The dashboard is a thin Next.js client. It calls the FastAPI backend, which owns
the lifecycle rules and audit trail. Qwen extraction proposes candidate memories,
but SQLite remains the source of truth. SQLite FTS5 powers MVP search without a
vector database.

## 2:45-3:00 Closing

MemoryNode makes agent memory auditable: every durable memory has source
evidence, a review decision, search visibility, explanation, and revocation.
Next steps are a thin Python SDK and a stronger hosted demo configuration.
