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
`doctor`, `mcp`, data commands, and `version`. The 0.5.0 wheel includes the
FastAPI backend and static governance console:

```powershell
memorynode init
memorynode start
memorynode status
memorynode stop
```

No source checkout or Node.js runtime is required. API and console default to
`127.0.0.1:8000` and `127.0.0.1:3000`; their distinct ports are configurable by
CLI, environment, or TOML. The console receives only the API origin from its
runtime config endpoint, and CORS allows only the configured console origin.

Development:

```powershell
py -3.13 -m pip install -e ".[test]"
python -m pytest -q
python ../../scripts/build_release.py
```

Related memories remain reviewer-facing candidates, not automatic conflict
decisions. Expiration remains request-driven.
