# Releasing MemoryNode

MemoryNode releases are built from a clean, synchronized `main`. Confirm the
version is identical in `pyproject.toml`, the Python package, CLI, MCP server,
console sentinel, and visible console footer. Do not add license metadata until
the project owner has selected a license.

```powershell
git status --short --branch
git fetch origin
git rev-list --left-right --count main...origin/main
python scripts/build_release.py
```

The build runs `npm ci`, performs the static export, stages `backend/app` once
under `memorynode.backend`, stages console assets, builds the sdist, builds the
wheel only from the unpacked sdist, and audits both artifacts. Inspect `dist/`
and repeat the standard venv, local-wheel `uvx`, isolated `uv tool`, and
temporary `pipx` matrix with separate `MEMORYNODE_HOME`, database, logs, and
ports. Hide Node/npm from `PATH` for installed-wheel lifecycle checks.

Before publication, rerun tests and `git diff --check`. Recheck that the PyPI
name and exact version are available. Authentication must use an approved
secure mechanism; never print, read into diagnostics, or commit a token.
Uploading to PyPI, creating a tag, and creating a GitHub Release each require
explicit owner authorization plus a license decision. If upload fails, inspect
the response before retrying; never overwrite an existing version. After a
successful authorized upload, reinstall from PyPI with uvx, uv tool, and pipx,
then create the matching tag and release notes only if separately authorized.
