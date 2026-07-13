# MemoryNode Python SDK

Synchronous typed access to the existing MemoryNode FastAPI service, plus the
Phase 4 stdio MCP server. The SDK and MCP process never access SQLite or start
the API.

```python
from memorynode import MemoryNodeClient

with MemoryNodeClient("http://127.0.0.1:8000", timeout=10) as client:
    assert client.status.check().ok
    result = client.proposals.extract(
        actor_id="demo-user",
        project_id="memorynode-demo",
        content="以后回答使用中文",
    )
    memories = client.memories.search("语言偏好")
```

Resources:

- `status.check()`
- `sources.get()`
- `proposals.create/extract/list/get/related_memories/approve/reject()`
- `events.get/list_recent()`
- `memories.search/list/get/explain/revoke/feedback/set_expiry()`

Every method accepts `timeout=` and `request_id=`. The SDK sends a generated
`X-Request-ID` by default and retains it in errors for client-side correlation;
the current server does not provide end-to-end request tracing. Unknown response
fields are accepted, while missing or invalid required fields raise
`MemoryNodeResponseError`. Server failures and suspicious details are redacted.

Phase 1 compatibility methods `health()`, `extract_proposals()`,
`search_memories()`, and `explain_memory()` still return JSON-compatible dicts.
The MCP entry point remains `memorynode-mcp` (or `python -m memorynode`). Default
discovery exposes `memory_propose`, `memory_search`, `memory_get`,
`memory_explain`, `memory_list`, and `memory_feedback`. Governance tools are
hidden unless true TOML booleans in local `config.toml` enable them.

The `memorynode` CLI provides `init`, `start`, `stop`, `restart`, `status`,
`doctor`, `mcp`, and `version`. Phase 3 requires a local source checkout because
the wheel does not yet bundle the backend or built frontend:

```powershell
memorynode init --source-root C:\path\to\MemoryNode
memorynode start
memorynode status
memorynode stop
```

Phase 3 only accepts API port `8000` and console port `3000`: the current
Next.js API URL and FastAPI CORS allowlist are fixed to those endpoints.
Configurable ports are deferred to Phase 6.

Development:

```powershell
py -3.13 -m pip install -e ".[test]"
python -m pytest -q
python -m build
```

Related memories remain reviewer-facing candidates, not automatic conflict
decisions. Expiration remains request-driven.
