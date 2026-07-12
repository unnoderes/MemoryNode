# MemoryNode Python SDK

Synchronous typed access to the existing MemoryNode FastAPI service, plus the
Phase 1 stdio MCP server. The SDK and MCP process never access SQLite or start
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
- `proposals.create/extract/list/related_memories/approve/reject()`
- `memories.search/get/explain/revoke()`

Every method accepts `timeout=` and `request_id=`. The SDK sends a generated
`X-Request-ID` by default and retains it in errors for client-side correlation;
the current server does not provide end-to-end request tracing. Unknown response
fields are accepted, while missing or invalid required fields raise
`MemoryNodeResponseError`. Server failures and suspicious details are redacted.

Phase 1 compatibility methods `health()`, `extract_proposals()`,
`search_memories()`, and `explain_memory()` still return JSON-compatible dicts.
The MCP entry point remains `memorynode-mcp` (or `python -m memorynode`) and
still exposes only `memory_propose`, `memory_search`, and `memory_explain`.

Development:

```powershell
py -3.13 -m pip install -e ".[test]"
python -m pytest -q
python -m build
```

Related memories remain reviewer-facing candidates, not automatic conflict
decisions. Expiration remains request-driven.
