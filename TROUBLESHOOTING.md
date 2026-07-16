# Troubleshooting and recovery

Run `memorynode doctor` first. It is read-only and reports Python, packaged
backend/console, writable local directories, process identity, database
integrity, API reachability, MCP availability, and whether model variables are
configured—without printing secret values.

If `start` reports a port conflict, choose distinct unused loopback API and
console ports with `--api-port` and `--console-port` (or the matching
`MEMORYNODE_*_PORT` variables). Do not bind a non-loopback host. If startup
fails, it rolls back processes it started; use `status` to inspect the result.

If `stop` reports a foreign process identity, it deliberately does not terminate
anything. Verify the PID, command, working directory, and port owner manually;
only then resolve the process record or port conflict. `restart` stops verified
managed processes before starting again.

For HTTP MCP, rerun `memorynode mcp --transport http --print-token-once` to
rotate a lost token, update the client `Authorization: Bearer <token>` header,
then start the loopback endpoint again. Missing or invalid tokens return 401
before MCP tools or resources run. For stdio MCP, configure only
`memorynode mcp`; any non-protocol text on stdout indicates an environment or
wrapper problem.

Before restore or import, stop MemoryNode. Create a backup with
`memorynode backup`, then use `memorynode restore BACKUP --confirm`. Use
`memorynode export` to create a JSONL transfer file and
`memorynode import FILE --confirm` to load it. Import validates the transfer and
rejects conflicts without partial writes. Backups and exports can contain
sensitive memory content; secure them before opening or moving them.

If the local database check fails, preserve the database and relevant safe
diagnostics, create or locate a verified backup, and restore into the stopped
installation. Do not edit SQLite directly through the SDK or MCP server; all
lifecycle changes must use the FastAPI `/v1` boundary.

Known limitations: no cloud service, remote accounts, LAN exposure, Docker,
system service, automatic approval, automatic conflict arbitration, vector
database, background expiry scheduler, or high-throughput multi-user guarantee.
Expiry is request-driven and related memories remain reviewer candidates only.

If extraction says model configuration is missing, open the proposals page and
expand **Model extraction** to enter a local Qwen/OpenAI-compatible Base URL,
model, wire API, reasoning effort, and API key, then use **Test connection**.
Alternatively set `QWEN_API_KEY`, `QWEN_BASE_URL`, and `QWEN_MODEL` (plus the
optional wire API and reasoning variables). Complete environment configuration
takes precedence over saved local settings. Settings reads and diagnostics never
show a full API key; manual proposal creation works without a model.
