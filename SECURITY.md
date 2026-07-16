# Security and privacy

MemoryNode is a local, single-user-oriented product. Its FastAPI API, console,
and Streamable HTTP MCP server bind only to `127.0.0.1`. Do not expose them
through a LAN address, reverse proxy, tunnel, or shared host.

`memorynode init` prints an HTTP MCP bearer token once. Store it in a local
secret manager or another access-controlled location. MemoryNode persists only
its SHA-256 hash in `config.toml`; status, doctor, MCP responses, and logs do
not reveal the token. Rotating a token invalidates prior clients.

The console is served from the configured exact loopback origin. The API's CORS
policy permits only that origin, and static-console paths reject traversal.
Stdio reserves stdout for MCP protocol frames; operational output and safe
warnings use stderr or local files.

`memorynode mcp --ensure-api` is an explicit stdio-only bootstrap. An explicit
`MEMORYNODE_API_URL` must be the exact local `http://127.0.0.1:<port>` origin;
it is reused only when its `/health` response identifies MemoryNode, otherwise
bootstrap safely refuses without fallback or process changes. Without an
override, it verifies the configured loopback endpoint before reuse, otherwise
uses the managed lifecycle preflight and refuses occupied ports or unsafe
process records. It never starts HTTP MCP or creates an HTTP token. Do not put
model-provider keys, HTTP MCP tokens, or other credentials in MCP client JSON,
command arguments, diagnostics, or logs.

Local databases, backups, and JSONL exports can contain raw source text,
proposals, memories, reviewer notes, and audit events. Treat each as sensitive:
use a private filesystem location, do not commit or sync them unintentionally,
and secure or delete them according to your own retention requirements.

`mcp.log` is intentionally limited to sanitized connection and call summaries:
operation names, outcomes, timing, request IDs, and token fingerprints. It must
not contain a bearer token, authorization header, memory content, query, note,
raw source text, parameters, or a full response. `memorynode doctor` reports
only whether model-related environment variables are configured, never values.

Repository `.env` files are not loaded by the installed runtime. Pass model
credentials using your environment or an approved local secret mechanism; never
place real credentials in repository files, diagnostics, or release artifacts.

The local governance console can save a Qwen/OpenAI-compatible model key for a
single user. That key is written only to local sensitive model configuration for
the backend process, with best-effort restrictive permissions; it is not placed
in browser storage, URLs, SQLite, logs, MCP responses, status, or doctor output.
`GET /v1/settings/model` returns only redacted state and a local key hint. Fully
configured `QWEN_*` environment variables take precedence over saved settings.
