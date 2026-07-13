from __future__ import annotations

import json
import os
import shutil
import sqlite3
import gc
import time
from datetime import datetime, timezone
from pathlib import Path


CURRENT_SCHEMA_VERSION = 2
TABLES = ("memory_sources", "memory_proposals", "memories", "memory_events")
MAX_IMPORT_BYTES = 100 * 1024 * 1024


SCHEMA = [
    "CREATE TABLE IF NOT EXISTS memory_sources (id VARCHAR PRIMARY KEY, actor_id VARCHAR NOT NULL, project_id VARCHAR NOT NULL, raw_text TEXT NOT NULL, created_at DATETIME NOT NULL)",
    "CREATE TABLE IF NOT EXISTS memory_proposals (id VARCHAR PRIMARY KEY, source_id VARCHAR NOT NULL REFERENCES memory_sources(id), content TEXT NOT NULL, type VARCHAR NOT NULL, confidence FLOAT NOT NULL, source_quote TEXT NOT NULL, reason TEXT, status VARCHAR NOT NULL, created_at DATETIME NOT NULL, decided_at DATETIME)",
    "CREATE TABLE IF NOT EXISTS memories (id VARCHAR PRIMARY KEY, proposal_id VARCHAR NOT NULL REFERENCES memory_proposals(id), supersedes_memory_id VARCHAR REFERENCES memories(id), content TEXT NOT NULL, type VARCHAR NOT NULL, status VARCHAR NOT NULL, expires_at DATETIME, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL)",
    "CREATE TABLE IF NOT EXISTS memory_events (id VARCHAR PRIMARY KEY, memory_id VARCHAR REFERENCES memories(id), proposal_id VARCHAR REFERENCES memory_proposals(id), event_type VARCHAR NOT NULL, actor_id VARCHAR NOT NULL, note TEXT, created_at DATETIME NOT NULL, idempotency_key VARCHAR, request_fingerprint VARCHAR)",
    "CREATE UNIQUE INDEX IF NOT EXISTS ix_memory_events_idempotency_key ON memory_events(idempotency_key) WHERE idempotency_key IS NOT NULL",
    "CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(memory_id UNINDEXED, content)",
]


def connect(path):
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    for statement in ("PRAGMA foreign_keys=ON", "PRAGMA busy_timeout=5000", "PRAGMA journal_mode=WAL", "PRAGMA synchronous=NORMAL"):
        conn.execute(statement)
    return conn


def create_empty_database(path):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with connect(path) as conn:
        for statement in SCHEMA:
            conn.execute(statement)
        conn.execute(f"PRAGMA user_version={CURRENT_SCHEMA_VERSION}")
        conn.commit()


def rebuild_fts(conn):
    conn.execute("DELETE FROM memory_fts")
    conn.execute("INSERT INTO memory_fts(memory_id, content) SELECT id, content FROM memories")


def check_database(path, *, require_current=True):
    path = Path(path)
    checks = []
    if not path.is_file():
        return {"ok": False, "schema_version": None, "checks": [{"name": "database_file", "ok": False, "message": "missing"}]}
    try:
        uri = f"file:{path.resolve().as_posix()}?mode=ro"
        conn = sqlite3.connect(uri, uri=True)
        conn.row_factory = sqlite3.Row
        cursor = conn.execute("PRAGMA user_version")
        version = int(cursor.fetchone()[0])
        cursor.close()
        _add(checks, "schema_version", version == CURRENT_SCHEMA_VERSION if require_current else version <= CURRENT_SCHEMA_VERSION, str(version))
        cursor = conn.execute("PRAGMA quick_check")
        quick_ok = cursor.fetchone()[0] == "ok"
        cursor.close()
        _add(checks, "quick_check", quick_ok, "ok")
        cursor = conn.execute("PRAGMA foreign_key_check")
        fk = cursor.fetchall()
        cursor.close()
        _add(checks, "foreign_key_check", not fk, "ok" if not fk else f"{len(fk)} violation(s)")
        cursor = conn.execute("SELECT name FROM sqlite_master WHERE type IN ('table','virtual table')")
        tables = {row[0] for row in cursor}
        cursor.close()
        for table in TABLES:
            _add(checks, f"table:{table}", table in tables, "ok" if table in tables else "missing")
        _add(checks, "fts:exists", "memory_fts" in tables, "ok" if "memory_fts" in tables else "missing")
        if "memory_fts" in tables and "memories" in tables:
            cursor = conn.execute("SELECT COUNT(*) FROM memories m LEFT JOIN memory_fts f ON f.memory_id=m.id WHERE f.memory_id IS NULL")
            missing = cursor.fetchone()[0]
            cursor.close()
            cursor = conn.execute("SELECT COUNT(*) FROM memory_fts f LEFT JOIN memories m ON m.id=f.memory_id WHERE m.id IS NULL")
            orphan = cursor.fetchone()[0]
            cursor.close()
            _add(checks, "fts:memory_ids", missing == 0 and orphan == 0, "ok" if missing == 0 and orphan == 0 else "mismatch")
        conn.close()
    except sqlite3.Error as exc:
        return {"ok": False, "schema_version": None, "checks": [{"name": "open", "ok": False, "message": exc.__class__.__name__}]}
    return {"ok": all(item["ok"] for item in checks), "schema_version": version, "checks": checks}


def backup_database(database, output):
    database, output = Path(database), Path(output)
    if not database.is_file():
        raise ValueError("database does not exist")
    if output.exists():
        raise ValueError("output already exists")
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_name(output.name + ".tmp")
    source = connect(database)
    target = sqlite3.connect(temporary)
    try:
        source.backup(target)
        target.commit()
        target.close()
        source.close()
        result = check_database(temporary)
        if not result["ok"]:
            raise ValueError("backup integrity check failed")
        _replace(temporary, output)
        return output
    finally:
        try: source.close()
        except Exception: pass
        try: target.close()
        except Exception: pass
        temporary.unlink(missing_ok=True)


def default_backup_path(paths):
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    return paths.backups / f"memorynode-backup-v{CURRENT_SCHEMA_VERSION}-{stamp}.db"


def default_export_path(paths):
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    return paths.exports / f"memorynode-export-{stamp}.jsonl"


def export_jsonl(database, output):
    database, output = Path(database), Path(output)
    if output.exists():
        raise ValueError("output already exists")
    if not check_database(database)["ok"]:
        raise ValueError("database integrity check failed")
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_name(output.name + ".tmp")
    conn = connect(database)
    try:
        with temporary.open("w", encoding="utf-8", newline="\n") as stream:
            stream.write(json.dumps({"kind": "memorynode_export", "format_version": 1, "schema_version": CURRENT_SCHEMA_VERSION, "exported_at": _now()}, ensure_ascii=False) + "\n")
            conn.execute("BEGIN")
            for table in TABLES:
                for row in conn.execute(f"SELECT * FROM {table} ORDER BY id"):
                    stream.write(json.dumps({"table": table, "data": dict(row)}, ensure_ascii=False, sort_keys=True) + "\n")
            conn.rollback()
            stream.flush()
            os.fsync(stream.fileno())
        _replace(temporary, output)
        return output
    finally:
        conn.close()
        temporary.unlink(missing_ok=True)


def import_jsonl(database, source):
    database, source = Path(database), Path(source)
    if not source.is_file():
        raise ValueError("import file does not exist")
    if source.stat().st_size > MAX_IMPORT_BYTES:
        raise ValueError("import file exceeds 100 MiB")
    if not database.exists():
        create_empty_database(database)
    result = check_database(database)
    if not result["ok"]:
        raise ValueError("database integrity check failed before import")
    rows = _read_export(source)
    conn = connect(database)
    report = {"inserted": 0, "skipped": 0, "conflicts": 0}
    try:
        conn.execute("BEGIN")
        columns = {table: [row[1] for row in conn.execute(f"PRAGMA table_info({table})")] for table in TABLES}
        for table, data in rows:
            if set(data) != set(columns[table]):
                raise ValueError("import record has invalid fields")
            existing = conn.execute(f"SELECT * FROM {table} WHERE id=?", (data["id"],)).fetchone()
            if existing:
                if dict(existing) == data:
                    report["skipped"] += 1
                    continue
                report["conflicts"] += 1
                raise ValueError("import conflict")
            values = [data[column] for column in columns[table]]
            conn.execute(f"INSERT INTO {table} ({','.join(columns[table])}) VALUES ({','.join('?' for _ in columns[table])})", values)
            report["inserted"] += 1
        rebuild_fts(conn)
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
    if not check_database(database)["ok"]:
        raise ValueError("database integrity check failed after import")
    return report


def restore_database(database, backup):
    database, backup = Path(database), Path(backup)
    if not backup.is_file():
        raise ValueError("backup file does not exist")
    if check_database(backup).get("schema_version") != CURRENT_SCHEMA_VERSION or not check_database(backup)["ok"]:
        raise ValueError("backup must be current schema v2 and pass integrity checks")
    database.parent.mkdir(parents=True, exist_ok=True)
    pre_restore = None
    if database.exists():
        pre_restore = database.with_name(database.name + ".pre-restore")
        if pre_restore.exists():
            pre_restore.unlink()
        backup_database(database, pre_restore)
    temporary = database.with_name(database.name + ".restore.tmp")
    try:
        shutil.copyfile(backup, temporary)
        if not check_database(temporary)["ok"]:
            raise ValueError("restored copy failed integrity check")
        _release_sqlite(database)
        _replace(temporary, database)
        for suffix in ("-wal", "-shm"):
            database.with_name(database.name + suffix).unlink(missing_ok=True)
        if not check_database(database)["ok"]:
            raise ValueError("restored database failed integrity check")
    except Exception:
        if pre_restore and pre_restore.exists():
            _release_sqlite(database)
            _replace(pre_restore, database)
        raise
    finally:
        temporary.unlink(missing_ok=True)
        if pre_restore and pre_restore.exists():
            pre_restore.unlink()
    return database


def _read_export(path):
    rows = []
    expected_index = 0
    with Path(path).open("r", encoding="utf-8") as stream:
        header = json.loads(stream.readline())
        if header.get("kind") != "memorynode_export" or header.get("format_version") != 1 or header.get("schema_version") != CURRENT_SCHEMA_VERSION:
            raise ValueError("invalid export header")
        for line in stream:
            item = json.loads(line)
            table = item.get("table")
            if table not in TABLES or "data" not in item or set(item) != {"table", "data"}:
                raise ValueError("invalid export record")
            index = TABLES.index(table)
            if index < expected_index:
                raise ValueError("export records are out of order")
            expected_index = index
            rows.append((table, item["data"]))
    return rows


def _now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _add(checks, name, ok, message):
    checks.append({"name": name, "ok": bool(ok), "message": message})


def _release_sqlite(path):
    if not Path(path).exists():
        return
    try:
        conn = sqlite3.connect(path)
        conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
        conn.close()
    except sqlite3.Error:
        pass
    gc.collect()


def _replace(source, target):
    for attempt in range(10):
        try:
            os.replace(source, target)
            return
        except PermissionError:
            if attempt == 9:
                raise
            gc.collect()
            time.sleep(0.05)
