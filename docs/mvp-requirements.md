# MemoryNode MVP Requirements

## 1. Product Boundary

MemoryNode is a governed memory layer for AI agents.

The MVP is not a chat app, agent framework, vector database, or plugin marketplace. It is a small service that turns raw agent interactions into reviewable memory proposals, lets a human approve or reject them, and exposes approved memories through search and explanation APIs.

## 2. Problem

Current agents can remember useful context, but memory behavior is often opaque:

- Users cannot easily inspect why a memory exists.
- Agents may store temporary statements as durable facts.
- Old or wrong memories are hard to revoke cleanly.
- Memory use is rarely auditable.
- Product teams need a reusable memory service instead of one-off prompt hacks.

MemoryNode solves the MVP slice of this problem: every durable memory must have source evidence, an approval decision, and a revocation path.

## 3. Target Users

- AI application developers building agent products.
- Hackathon judges evaluating memory-agent behavior.
- Power users of coding agents who want controlled long-term project memory.

## 4. MVP Value Proposition

MemoryNode provides trusted memory contracts:

```text
raw interaction -> candidate memory -> approve/reject -> searchable memory -> explain/revoke
```

Each approved memory has:

- content
- type
- source excerpt
- confidence
- status
- event history
- optional expiration date

## 5. Main Workflow

Human workflow:

```text
Developer submits an interaction transcript.
MemoryNode extracts candidate memories with Qwen.
Reviewer sees proposals in the dashboard.
Reviewer approves or rejects proposals.
Approved memories become searchable.
Agent or developer searches active memories before a future task.
Reviewer can explain or revoke a memory later.
```

Compressed main path:

```text
extract -> review -> approve -> search -> explain -> revoke
```

## 6. Verbs And Nouns

Verbs:

- extract proposals
- list proposals
- approve proposal
- reject proposal
- search memories
- explain memory
- revoke memory
- expire memory
- log event

Nouns:

- interaction
- memory proposal
- memory
- source
- memory event
- reviewer
- memory type
- memory status

## 7. Minimal End-To-End I/O

Input:

```json
{
  "actor_id": "demo-user",
  "project_id": "memorynode-demo",
  "messages": [
    {"role": "user", "content": "This project must use Qwen Cloud, not OpenAI APIs."}
  ]
}
```

Output:

```json
{
  "proposals": [
    {
      "id": "proposal_123",
      "content": "This project must use Qwen Cloud instead of OpenAI APIs.",
      "type": "project_constraint",
      "confidence": 0.94,
      "source_quote": "This project must use Qwen Cloud, not OpenAI APIs.",
      "status": "pending"
    }
  ]
}
```

After approval, search output:

```json
{
  "memories": [
    {
      "id": "mem_123",
      "content": "This project must use Qwen Cloud instead of OpenAI APIs.",
      "type": "project_constraint",
      "status": "active",
      "score": 0.87
    }
  ]
}
```

## 8. Memory Types

MVP memory types:

- `user_preference`
- `project_constraint`
- `project_decision`
- `recurring_workflow`
- `known_pitfall`
- `fact`

No custom type system in MVP. Add custom types only after real users need them.

## 9. State Model

Proposal states:

```text
pending -> approved
pending -> rejected
```

Memory states:

```text
active -> revoked
active -> expired
```

State rules:

- Only `pending` proposals can be approved or rejected.
- Approving a proposal creates one active memory.
- Rejecting a proposal never creates a memory.
- Revoked memories are retained for audit but excluded from default search.
- Expired memories are retained for audit but excluded from default search.

## 10. Transition Tables

Proposal:

| Current state | Action | Condition | Next state | Result |
|---|---|---|---|---|
| pending | approve | reviewer provided | approved | create active memory and event |
| pending | reject | reviewer provided | rejected | create reject event |
| approved | approve | any | invalid | return 409 |
| rejected | reject | any | invalid | return 409 |

Memory:

| Current state | Action | Condition | Next state | Result |
|---|---|---|---|---|
| active | revoke | reviewer provided | revoked | exclude from search |
| active | expire | expiration date reached | expired | exclude from search |
| revoked | revoke | any | invalid | return 409 |
| expired | revoke | any | invalid | return 409 |

## 11. MVP API

```text
POST /v1/proposals/extract
GET  /v1/proposals?status=pending
POST /v1/proposals/{id}/approve
POST /v1/proposals/{id}/reject

GET  /v1/memories/search?q=...
GET  /v1/memories/{id}
GET  /v1/memories/{id}/explain
POST /v1/memories/{id}/revoke
```

## 12. Dashboard Pages

MVP pages:

- `/proposals`: pending proposals with approve and reject actions.
- `/memories`: searchable active memories with status filters.
- `/memories/:id`: source excerpt, reason, confidence, event history, revoke action.

Skip login for local MVP. Add auth when deploying beyond demo.

## 13. Data Model

Tables:

```text
memory_sources
  id
  actor_id
  project_id
  raw_text
  created_at

memory_proposals
  id
  source_id
  content
  type
  confidence
  source_quote
  reason
  status
  created_at
  decided_at

memories
  id
  proposal_id
  content
  type
  status
  expires_at
  created_at
  updated_at

memory_events
  id
  memory_id
  proposal_id
  event_type
  actor_id
  note
  created_at
```

Search index:

```text
SQLite FTS5 on memories.content for MVP.
```

## 14. Qwen Responsibilities

Qwen is used for:

- extracting candidate memories
- classifying memory type
- assigning confidence
- producing a short reason
- optionally comparing a new proposal with similar existing memories

Qwen is not the source of truth. Database state is the source of truth.

## 15. Non-Functional Requirements

- Local demo starts with two commands: one backend command, one frontend command.
- API responses are JSON.
- All write operations create an audit event.
- Search excludes revoked and expired memories by default.
- Failed Qwen extraction returns a clear 502-style API error.
- The app must run without a vector database in MVP.

## 16. Out Of Scope For MVP

- Multi-tenant organizations
- Billing
- Full auth and RBAC
- MCP server
- Claude Code or Codex hooks
- TypeScript SDK
- Vector database
- Graph database
- Automatic approval
- Team sharing
- Browser extension

## 17. MVP Acceptance Criteria

- A transcript can produce at least one pending proposal.
- Pending proposals can be approved or rejected from the dashboard.
- Approved memories appear in search.
- Rejected proposals do not appear in search.
- A memory detail page shows source quote, reason, confidence, and event history.
- Revoked memories disappear from default search.
- Invalid state transitions return a conflict error.
- One small automated backend check covers proposal approval and revocation.
