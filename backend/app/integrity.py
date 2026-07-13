from __future__ import annotations

import sqlite3
from pathlib import Path


CURRENT_SCHEMA_VERSION = 2

REQUIRED = {
    "memory_sources": {"id", "actor_id", "project_id", "raw_text", "created_at"},
    "memory_proposals": {"id", "source_id", "content", "type", "confidence", "source_quote", "status", "created_at"},
    "memories": {"id", "proposal_id", "supersedes_memory_id", "content", "type", "status", "created_at", "updated_at"},
    "memory_events": {"id", "memory_id", "proposal_id", "event_type", "actor_id", "created_at", "idempotency_key", "request_fingerprint"},
}


def connect_readonly(path: Path):
    uri = f"file:{Path(path).resolve().as_posix()}?mode=ro"
    conn = sqlite3.connect(uri, uri=True)
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA busy_timeout=5000")
    return conn


def check_database(path, *, require_current=True):
    path = Path(path)
    checks = []
    if not path.is_file():
        return {"ok": False, "schema_version": None, "checks": [{"name": "database_file", "ok": False, "message": "missing"}]}
    try:
        with connect_readonly(path) as conn:
            version = int(conn.execute("PRAGMA user_version").fetchone()[0])
            _add(checks, "schema_version", (version == CURRENT_SCHEMA_VERSION) if require_current else (version <= CURRENT_SCHEMA_VERSION), str(version))
            quick = conn.execute("PRAGMA quick_check").fetchone()[0]
            _add(checks, "quick_check", quick == "ok", "ok" if quick == "ok" else "failed")
            fk_rows = conn.execute("PRAGMA foreign_key_check").fetchall()
            _add(checks, "foreign_key_check", not fk_rows, "ok" if not fk_rows else f"{len(fk_rows)} violation(s)")
            tables = {row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type IN ('table','virtual table')")}
            for table, columns in REQUIRED.items():
                exists = table in tables
                _add(checks, f"table:{table}", exists, "ok" if exists else "missing")
                if exists:
                    present = {row[1] for row in conn.execute(f"PRAGMA table_info({table})")}
                    missing = columns - present
                    _add(checks, f"columns:{table}", not missing, "ok" if not missing else "missing required column(s)")
            indexes = {row[1] for row in conn.execute("PRAGMA index_list(memory_events)")} if "memory_events" in tables else set()
            _add(checks, "index:idempotency_key", "ix_memory_events_idempotency_key" in indexes, "ok")
            _add(checks, "fts:exists", "memory_fts" in tables, "ok" if "memory_fts" in tables else "missing")
            if "memory_fts" in tables and "memories" in tables:
                missing = conn.execute(
                    "SELECT COUNT(*) FROM memories m LEFT JOIN memory_fts f ON f.memory_id=m.id WHERE f.memory_id IS NULL"
                ).fetchone()[0]
                orphan = conn.execute(
                    "SELECT COUNT(*) FROM memory_fts f LEFT JOIN memories m ON m.id=f.memory_id WHERE m.id IS NULL"
                ).fetchone()[0]
                _add(checks, "fts:memory_ids", missing == 0 and orphan == 0, "ok" if missing == 0 and orphan == 0 else "mismatch")
            return {"ok": all(item["ok"] for item in checks), "schema_version": version, "checks": checks}
    except sqlite3.Error as exc:
        return {"ok": False, "schema_version": None, "checks": [{"name": "open", "ok": False, "message": exc.__class__.__name__}]}


def _add(checks, name, ok, message):
    checks.append({"name": name, "ok": bool(ok), "message": message})
