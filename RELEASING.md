# Releasing MemoryNode

This checklist produces a locally verified candidate. Publication remains closed
until the owner explicitly authorizes each external action.

## Candidate checklist

- [ ] Start from a clean `main`, fetch `origin`, and confirm `main...origin/main`
  is `0 0`; do not pull, rebase, reset, stash, or rewrite history.
- [ ] Confirm no unknown MemoryNode process owns the chosen ports or data home.
- [ ] Confirm `0.7.0` is consistent in `pyproject.toml`, `memorynode.__version__`,
  CLI, MCP status/schema, console footer, and console sentinel/build script.
- [ ] Run backend pytest, SDK pytest, `npm ci`, frontend production build, and
  `git diff --check`.
- [ ] Run `python scripts/build_release.py`. It must build an sdist, build a
  wheel from the extracted sdist, and audit both artifacts.
- [ ] Inspect artifact names/sizes and confirm they contain the SDK, CLI, MCP,
  packaged backend, and console assets—never secrets, `.env`, databases, logs,
  PID files, backups, exports, cache, `node_modules`, `.next`, or local paths.
- [ ] Run the wheel outside the repository with separate temporary home, data,
  logs, run files, backup/export paths, and ports: standard venv, venv with
  Node/npm hidden from `PATH`, local-wheel `uvx`, isolated `uv tool`, and
  temporary `pipx` without global installation or user `PATH` mutation.
- [ ] In that matrix, check imports for the backend, console assets, and MCP;
  exercise init/start/status/doctor/stop, stdio MCP, and token HTTP MCP.
- [ ] Check start/stop three times, restart persistence, API and console startup
  rollback, foreign/stale PID safety, backup/restore, export/import, and an
  import conflict with zero writes.
- [ ] Check invalid HTTP token denial while a valid client remains usable, two
  concurrent HTTP sessions, reconnect after restart, Chinese and long text,
  actionable MCP errors, and stdio stdout protocol purity.
- [ ] Check loopback-only hosts, exact console CORS origin, static-path traversal,
  read-only doctor redaction, and sanitized `mcp.log` (no token, content, query,
  note, raw text, request parameters, or full response).
- [ ] On Windows run the full matrix. Do not claim macOS/Linux execution unless
  it occurred; retain platform-neutral process/path tests and document the
  remaining host coverage.

## Commands

```powershell
git status --short --branch
git fetch origin
git rev-list --left-right --count main...origin/main

cd backend; python -m pytest -q
cd ../frontend; npm ci; npm run build
cd ../sdk/python; .\.venv\Scripts\python.exe -m pytest -q
cd ../..; python scripts\build_release.py
git diff --check
```

## External release gate

Before any upload, separately record a PyPI name/exact-version availability
check, a license decision, approved secure authentication, and explicit owner
authorization for upload, tag creation, and GitHub Release. Never print, store,
or pass a token through diagnostics. Never overwrite an existing package
version. If an authorized upload fails, inspect the response before retrying.

After an authorized publication, reinstall the public package with uvx, uv tool,
and pipx, rerun the installed lifecycle/MCP smoke, then create the matching tag
and GitHub Release only when each is separately authorized. If a released
artifact is defective, halt further publication, preserve the local evidence,
publish a new authorized version rather than overwrite, and document recovery.
