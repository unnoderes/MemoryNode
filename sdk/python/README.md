# MemoryNode Python SDK

Synchronous typed access to the existing MemoryNode FastAPI service, plus stdio
and local shared Streamable HTTP MCP. The SDK and MCP process never access
SQLite or start the API.

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
`doctor`, `mcp`, data commands, and `version`. The 0.7.1 wheel includes the
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

`memorynode mcp` remains the stdio default. For a shared local endpoint, first
run `memorynode init` and store the bearer token printed once, then run:

```powershell
memorynode start
memorynode mcp --transport http --host 127.0.0.1 --port 8765
```

Connect MCP clients to `http://127.0.0.1:8765/mcp` using
`Authorization: Bearer <token>`. HTTP accepts only `127.0.0.1`; it rejects a
missing or invalid token before MCP handling. Existing configurations can create
a replacement token with `--print-token-once`. Only a token hash is persisted,
and `mcp.log` records sanitized connection/call metadata, never tokens,
headers, content, queries, parameters, or responses. The static console does
not yet include an MCP overview because it cannot safely read local log files.

For install/uninstall, data handling, backup/restore/import/export, governance,
and troubleshooting guidance, see the repository [README](../../README.md),
[SECURITY.md](../../SECURITY.md), and [TROUBLESHOOTING.md](../../TROUBLESHOOTING.md).
