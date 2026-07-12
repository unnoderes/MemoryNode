# MemoryNode Python client and stdio MCP server

Phase 1 provides a synchronous HTTP client and three stdio MCP tools. FastAPI
must already be running; the MCP process never starts it or accesses SQLite.

```powershell
python -m pip install dist\memorynode-0.1.0-py3-none-any.whl
$env:MEMORYNODE_API_URL = "http://127.0.0.1:8000" # optional
memorynode-mcp
```

MCP client configuration:

```json
{
  "mcpServers": {
    "memorynode": {
      "command": "memorynode-mcp",
      "env": {"MEMORYNODE_API_URL": "http://127.0.0.1:8000"}
    }
  }
}
```

The actual Phase 1 entry points are `memorynode-mcp` and
`python -m memorynode`. The unified `memorynode mcp` CLI belongs to Phase 3.

Tools:

- `memory_propose(content, actor_id, project_id)` calls only
  `/v1/proposals/extract` and creates pending proposals.
- `memory_search(query)` returns the API's default effective-memory search.
- `memory_explain(memory_id)` preserves source, proposal, memory, events, and
  supersession relationships.

Related memories are review candidates, not automatic semantic conflict
decisions. Expiration remains request-driven; there is no background scheduler.
