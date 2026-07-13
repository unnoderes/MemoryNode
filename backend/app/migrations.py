from __future__ import annotations

import os
import gc
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.sql import text

from .integrity import check_database


CURRENT_SCHEMA_VERSION = 2

CORE_TABLES = {"memory_sources", "memory_proposals", "memories", "memory_events"}


def ensure_schema(engine, metadata, database_path: str):
    path = Path(database_path)
    is_new = not path.exists() or path.stat().st_size == 0
    if is_new:
        path.parent.mkdir(parents=True, exist_ok=True)
        metadata.create_all(bind=engine)
        with engine.begin() as conn:
            _create_fts_sqlalchemy(conn)
            conn.execute(text(
                "CREATE UNIQUE INDEX IF NOT EXISTS ix_memory_events_idempotency_key "
                "ON memory_events(idempotency_key) WHERE idempotency_key IS NOT NULL"
            ))
            conn.execute(text(f"PRAGMA user_version={CURRENT_SCHEMA_VERSION}"))
        _require_ok(check_database(path))
        return

    with _connect(path) as conn:
        version = _user_version(conn)
        if version > CURRENT_SCHEMA_VERSION:
            raise RuntimeError(f"database schema version {version} is newer than supported {CURRENT_SCHEMA_VERSION}")
        if version < CURRENT_SCHEMA_VERSION:
            _backup_before_migration(path)
            _migrate(conn, version)
        else:
            _require_core_tables(conn)
            _migrate_v1_to_v2(conn)
            _create_fts_sqlite(conn)
    _require_ok(check_database(path))


def _require_ok(result):
    if not result["ok"]:
        raise RuntimeError("database integrity check failed")


def _connect(path: Path):
    conn = sqlite3.connect(path)
    for statement in (
        "PRAGMA foreign_keys=ON",
        "PRAGMA busy_timeout=5000",
        "PRAGMA journal_mode=WAL",
        "PRAGMA synchronous=NORMAL",
    ):
        conn.execute(statement)
    return conn


def _user_version(conn) -> int:
    return int(conn.execute("PRAGMA user_version").fetchone()[0])


def _columns(conn, table: str) -> set[str]:
    return {row[1] for row in conn.execute(f"PRAGMA table_info({table})")}


def _require_core_tables(conn):
    tables = {row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type IN ('table','virtual table')")}
    missing = CORE_TABLES - tables
    if missing:
        raise RuntimeError("database schema is missing required tables")


def _migrate(conn, version: int):
    _require_core_tables(conn)
    try:
        conn.execute("BEGIN")
        if version == 0:
            _migrate_v0_to_v1(conn)
            version = 1
        if version == 1:
            _migrate_v1_to_v2(conn)
        _create_fts_sqlite(conn)
        _rebuild_fts_sqlite(conn)
        conn.commit()
    except Exception:
        conn.rollback()
        raise


def _migrate_v0_to_v1(conn):
    if "supersedes_memory_id" not in _columns(conn, "memories"):
        conn.execute("ALTER TABLE memories ADD COLUMN supersedes_memory_id VARCHAR")
    conn.execute("PRAGMA user_version=1")


def _migrate_v1_to_v2(conn):
    event_columns = _columns(conn, "memory_events")
    if "idempotency_key" not in event_columns:
        conn.execute("ALTER TABLE memory_events ADD COLUMN idempotency_key VARCHAR")
    if "request_fingerprint" not in event_columns:
        conn.execute("ALTER TABLE memory_events ADD COLUMN request_fingerprint VARCHAR")
    conn.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_memory_events_idempotency_key "
        "ON memory_events(idempotency_key) WHERE idempotency_key IS NOT NULL"
    )
    conn.execute("PRAGMA user_version=2")


def _create_fts_sqlalchemy(conn):
    conn.execute(text("CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(memory_id UNINDEXED, content)"))


def _create_fts_sqlite(conn):
    conn.execute("CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(memory_id UNINDEXED, content)")


def _rebuild_fts_sqlite(conn):
    conn.execute("DELETE FROM memory_fts")
    conn.execute("INSERT INTO memory_fts(memory_id, content) SELECT id, content FROM memories")


def _backup_before_migration(path: Path):
    backup_dir = Path(os.getenv("MEMORYNODE_BACKUP_DIR") or path.parent / "backups")
    backup_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup_path = backup_dir / f"memorynode-pre-migration-v{_schema_version(path)}-{stamp}.db"
    _sqlite_backup(path, backup_path)


def _schema_version(path: Path) -> int:
    with sqlite3.connect(path) as conn:
        return _user_version(conn)


def _sqlite_backup(source: Path, target: Path):
    temporary = target.with_suffix(target.suffix + ".tmp")
    if target.exists():
        raise RuntimeError("migration backup already exists")
    source_conn = _connect(source)
    target_conn = sqlite3.connect(temporary)
    try:
        target_conn.execute("PRAGMA journal_mode=DELETE")
        source_conn.backup(target_conn)
        target_conn.commit()
        target_conn.close()
        source_conn.close()
        del target_conn
        del source_conn
        gc.collect()
        uri = f"file:{temporary.resolve().as_posix()}?mode=ro&immutable=1"
        check = sqlite3.connect(uri, uri=True)
        cursor = check.execute("PRAGMA quick_check")
        ok = cursor.fetchone()[0] == "ok"
        cursor.close()
        version = _user_version(check)
        check.close()
        del cursor
        del check
        gc.collect()
        if not ok or version > CURRENT_SCHEMA_VERSION:
            raise RuntimeError("migration backup integrity check failed")
        os.replace(temporary, target)
    finally:
        if "source_conn" in locals():
            source_conn.close()
        if "target_conn" in locals():
            try:
                target_conn.close()
            except sqlite3.Error:
                pass
        temporary.unlink(missing_ok=True)
