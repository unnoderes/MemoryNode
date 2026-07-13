from __future__ import annotations

import gc
import hashlib
import json
import os
import re
import shutil
import sqlite3
import sys
import time
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path


CURRENT_SCHEMA_VERSION = 2
TABLES = ("memory_sources", "memory_proposals", "memories", "memory_events")
MAX_IMPORT_BYTES = 100 * 1024 * 1024

TABLE_COLUMNS = {
    "memory_sources": ("id", "actor_id", "project_id", "raw_text", "created_at"),
    "memory_proposals": ("id", "source_id", "content", "type", "confidence", "source_quote", "reason", "status", "created_at", "decided_at"),
    "memories": ("id", "proposal_id", "supersedes_memory_id", "content", "type", "status", "expires_at", "created_at", "updated_at"),
    "memory_events": ("id", "memory_id", "proposal_id", "event_type", "actor_id", "note", "created_at", "idempotency_key", "request_fingerprint"),
}
OPTIONAL_FIELDS = {
    "memory_proposals": {"reason", "decided_at"},
    "memories": {"supersedes_memory_id", "expires_at"},
    "memory_events": {"memory_id", "proposal_id", "note", "idempotency_key", "request_fingerprint"},
}
DATETIME_FIELDS = {
    "memory_sources": {"created_at"},
    "memory_proposals": {"created_at", "decided_at"},
    "memories": {"expires_at", "created_at", "updated_at"},
    "memory_events": {"created_at"},
}
MEMORY_TYPES = {"user_preference", "project_constraint", "project_decision", "recurring_workflow", "known_pitfall", "fact"}
PROPOSAL_STATUSES = {"pending", "approved", "rejected"}
MEMORY_STATUSES = {"active", "revoked", "expired"}
FINGERPRINT_RE = re.compile(r"^[0-9a-fA-F]{64}$")


SCHEMA = [
    "CREATE TABLE IF NOT EXISTS memory_sources (id VARCHAR PRIMARY KEY, actor_id VARCHAR NOT NULL, project_id VARCHAR NOT NULL, raw_text TEXT NOT NULL, created_at DATETIME NOT NULL)",
    "CREATE TABLE IF NOT EXISTS memory_proposals (id VARCHAR PRIMARY KEY, source_id VARCHAR NOT NULL REFERENCES memory_sources(id), content TEXT NOT NULL, type VARCHAR NOT NULL, confidence FLOAT NOT NULL, source_quote TEXT NOT NULL, reason TEXT, status VARCHAR NOT NULL CHECK (status in ('pending', 'approved', 'rejected')), created_at DATETIME NOT NULL, decided_at DATETIME)",
    "CREATE TABLE IF NOT EXISTS memories (id VARCHAR PRIMARY KEY, proposal_id VARCHAR NOT NULL REFERENCES memory_proposals(id), supersedes_memory_id VARCHAR REFERENCES memories(id), content TEXT NOT NULL, type VARCHAR NOT NULL, status VARCHAR NOT NULL CHECK (status in ('active', 'revoked', 'expired')), expires_at DATETIME, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL)",
    "CREATE TABLE IF NOT EXISTS memory_events (id VARCHAR PRIMARY KEY, memory_id VARCHAR REFERENCES memories(id), proposal_id VARCHAR REFERENCES memory_proposals(id), event_type VARCHAR NOT NULL, actor_id VARCHAR NOT NULL, note TEXT, created_at DATETIME NOT NULL, idempotency_key VARCHAR, request_fingerprint VARCHAR)",
    "CREATE UNIQUE INDEX IF NOT EXISTS ix_memory_events_idempotency_key ON memory_events(idempotency_key) WHERE idempotency_key IS NOT NULL",
    "CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(memory_id UNINDEXED, content)",
]


def connect(path):
    conn = sqlite3.connect(path)
    try:
        conn.row_factory = sqlite3.Row
        for statement in ("PRAGMA foreign_keys=ON", "PRAGMA busy_timeout=5000", "PRAGMA journal_mode=WAL", "PRAGMA synchronous=NORMAL"):
            conn.execute(statement)
        return conn
    except Exception:
        conn.close()
        raise


def create_empty_database(path):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with closing(connect(path)) as conn:
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
        with closing(sqlite3.connect(uri, uri=True)) as conn:
            version = int(conn.execute("PRAGMA user_version").fetchone()[0])
            _add(checks, "schema_version", version == CURRENT_SCHEMA_VERSION if require_current else version <= CURRENT_SCHEMA_VERSION, str(version))
            quick = conn.execute("PRAGMA quick_check").fetchone()[0]
            _add(checks, "quick_check", quick == "ok", "ok" if quick == "ok" else "failed")
            fk = conn.execute("PRAGMA foreign_key_check").fetchall()
            _add(checks, "foreign_key_check", not fk, "ok" if not fk else f"{len(fk)} violation(s)")
            tables = {row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type IN ('table','virtual table')")}
            for table, columns in TABLE_COLUMNS.items():
                exists = table in tables
                _add(checks, f"table:{table}", exists, "ok" if exists else "missing")
                if exists:
                    present = {row[1] for row in conn.execute(f"PRAGMA table_info({table})")}
                    missing = set(columns) - present
                    _add(checks, f"columns:{table}", not missing, "ok" if not missing else "missing required column(s)")
            _add(checks, "index:idempotency_key", _has_idempotency_index(conn) if "memory_events" in tables else False, "ok")
            _add(checks, "fts:exists", "memory_fts" in tables, "ok" if "memory_fts" in tables else "missing")
            if "memory_fts" in tables and "memories" in tables:
                missing = conn.execute("SELECT COUNT(*) FROM memories m LEFT JOIN memory_fts f ON f.memory_id=m.id WHERE f.memory_id IS NULL").fetchone()[0]
                orphan = conn.execute("SELECT COUNT(*) FROM memory_fts f LEFT JOIN memories m ON m.id=f.memory_id WHERE m.id IS NULL").fetchone()[0]
                _add(checks, "fts:memory_ids", missing == 0 and orphan == 0, "ok" if missing == 0 and orphan == 0 else "mismatch")
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
    _sqlite_backup(database, output)
    return output


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
                    stream.write(json.dumps({"table": table, "data": _export_row(table, dict(row))}, ensure_ascii=False) + "\n")
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
    _validate_import_paths(database, source)
    rows = _read_export(source)
    target_existed = database.exists()
    database.parent.mkdir(parents=True, exist_ok=True)
    working = _working_path(database)
    rollback = _working_path(database, ".rollback")
    rollback_ready = False
    rollback_hash = None
    report = {"inserted": 0, "skipped": 0, "conflicts": 0}
    try:
        if target_existed:
            if not check_database(database)["ok"]:
                raise ValueError("database integrity check failed before import")
            _sqlite_backup(database, working)
        else:
            create_empty_database(working)
        report = _merge_import_rows(working, rows)
        _release_sqlite(working)
        if not check_database(working)["ok"]:
            raise ValueError("database integrity check failed before replace")
        if target_existed:
            rollback_hash = _rollback_snapshot(database, rollback)
            rollback_ready = True
        _release_sqlite(database)
        _replace(working, database)
        _remove_sqlite_sidecars(database)
        if not check_database(database)["ok"]:
            raise ValueError("database integrity check failed after import")
        return report
    except Exception as exc:
        if target_existed and rollback_ready and rollback.exists():
            if not check_database(rollback)["ok"] or _file_hash(rollback) != rollback_hash:
                raise ValueError("rollback snapshot failed integrity check; refusing unsafe restore") from exc
            _release_sqlite(database)
            _replace(rollback, database)
            _remove_sqlite_sidecars(database)
            if not check_database(database)["ok"] or _file_hash(database) != rollback_hash:
                raise ValueError("rollback restore verification failed") from exc
        elif not target_existed:
            database.unlink(missing_ok=True)
            _remove_sqlite_sidecars(database)
        raise
    finally:
        preserve_error = sys.exc_info()[0] is not None
        cleanup_error = None
        for path in (working, rollback):
            try:
                path.unlink(missing_ok=True)
                _remove_sqlite_sidecars(path)
            except OSError as cleanup_exc:
                cleanup_error = cleanup_error or cleanup_exc
        if cleanup_error is not None and not preserve_error:
            raise cleanup_error


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
        _remove_sqlite_sidecars(database)
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
    try:
        with Path(path).open("r", encoding="utf-8") as stream:
            first = stream.readline()
            if not first:
                raise ValueError("invalid export header")
            header = json.loads(first)
            _validate_header(header)
            for line in stream:
                if not line.strip():
                    raise ValueError("invalid export record")
                item = json.loads(line)
                if set(item) != {"table", "data"}:
                    raise ValueError("invalid export record")
                table = item["table"]
                if table not in TABLES:
                    raise ValueError("invalid export table")
                index = TABLES.index(table)
                if index < expected_index:
                    raise ValueError("export records are out of order")
                expected_index = index
                rows.append((table, _validate_import_row(table, item["data"])))
    except json.JSONDecodeError as exc:
        raise ValueError("invalid export json") from exc
    return rows


def _validate_header(header):
    if set(header) != {"kind", "format_version", "schema_version", "exported_at"}:
        raise ValueError("invalid export header")
    if header["kind"] != "memorynode_export" or header["format_version"] != 1 or header["schema_version"] != CURRENT_SCHEMA_VERSION:
        raise ValueError("invalid export header")
    _parse_aware_datetime(header["exported_at"])


def _validate_import_row(table, data):
    if not isinstance(data, dict) or tuple(data.keys()) != TABLE_COLUMNS[table]:
        raise ValueError("import record has invalid fields")
    normalized = {}
    for column in TABLE_COLUMNS[table]:
        value = data[column]
        if column in OPTIONAL_FIELDS.get(table, set()) and value is None:
            normalized[column] = None
            continue
        if column in DATETIME_FIELDS.get(table, set()):
            normalized[column] = _sqlite_datetime(_parse_aware_datetime(value))
        elif column == "confidence":
            if isinstance(value, bool) or not isinstance(value, (int, float)) or not 0 <= value <= 1:
                raise ValueError("invalid confidence")
            normalized[column] = float(value)
        elif column == "type" and table in {"memory_proposals", "memories"}:
            normalized[column] = _required_string(value)
            if normalized[column] not in MEMORY_TYPES:
                raise ValueError("invalid memory type")
        elif column == "status" and table == "memory_proposals":
            normalized[column] = _required_string(value)
            if normalized[column] not in PROPOSAL_STATUSES:
                raise ValueError("invalid proposal status")
        elif column == "status" and table == "memories":
            normalized[column] = _required_string(value)
            if normalized[column] not in MEMORY_STATUSES:
                raise ValueError("invalid memory status")
        elif column == "request_fingerprint":
            normalized[column] = _fingerprint(value)
        elif column == "idempotency_key":
            normalized[column] = _idempotency_key(value)
        elif column == "id" or column.endswith("_id"):
            normalized[column] = _required_string(value)
        elif column in OPTIONAL_FIELDS.get(table, set()):
            normalized[column] = _optional_string(value)
        else:
            normalized[column] = _required_string(value)
    return normalized


def _merge_import_rows(database, rows):
    report = {"inserted": 0, "skipped": 0, "conflicts": 0}
    conn = connect(database)
    try:
        conn.execute("BEGIN")
        for table, data in rows:
            columns = TABLE_COLUMNS[table]
            existing = conn.execute(f"SELECT * FROM {table} WHERE id=?", (data["id"],)).fetchone()
            if existing:
                if _canonical_existing(table, dict(existing)) == data:
                    report["skipped"] += 1
                    continue
                report["conflicts"] += 1
                raise ValueError("import conflict")
            conn.execute(
                f"INSERT INTO {table} ({','.join(columns)}) VALUES ({','.join('?' for _ in columns)})",
                [data[column] for column in columns],
            )
            report["inserted"] += 1
        rebuild_fts(conn)
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
    return report


def _canonical_existing(table, row):
    normalized = dict(row)
    for column in DATETIME_FIELDS.get(table, set()):
        if normalized.get(column) is not None:
            normalized[column] = _sqlite_datetime(_parse_datetime_as_utc(normalized[column]))
    if table == "memory_events" and normalized.get("request_fingerprint") is not None:
        normalized["request_fingerprint"] = normalized["request_fingerprint"].lower()
    if "confidence" in normalized and normalized["confidence"] is not None:
        normalized["confidence"] = float(normalized["confidence"])
    return normalized


def _export_row(table, row):
    exported = dict(row)
    for column in DATETIME_FIELDS.get(table, set()):
        if exported.get(column) is not None:
            exported[column] = _parse_datetime_as_utc(exported[column]).isoformat()
    return exported


def _validate_import_paths(database, source):
    if source.is_symlink() or database.is_symlink():
        raise ValueError("import paths must not be symlinks")
    if source.is_dir() or database.is_dir():
        raise ValueError("import paths must not be directories")
    if not source.is_file():
        raise ValueError("import file does not exist")
    if database.exists() and not database.is_file():
        raise ValueError("target database path is not a file")
    if source.stat().st_size > MAX_IMPORT_BYTES:
        raise ValueError("import file exceeds 100 MiB")
    if source.resolve(strict=True) == database.resolve(strict=False):
        raise ValueError("import source and target must be different paths")


def _has_idempotency_index(conn):
    for row in conn.execute("PRAGMA index_list(memory_events)"):
        name = row[1]
        unique = bool(row[2])
        partial = bool(row[4]) if len(row) > 4 else False
        if name != "ix_memory_events_idempotency_key":
            continue
        columns = [item[2] for item in conn.execute(f"PRAGMA index_info({name})")]
        sql_row = conn.execute("SELECT sql FROM sqlite_master WHERE type='index' AND name=?", (name,)).fetchone()
        sql = (sql_row[0] or "").upper() if sql_row else ""
        return unique and partial and columns == ["idempotency_key"] and "WHERE IDEMPOTENCY_KEY IS NOT NULL" in sql
    return False


def _parse_aware_datetime(value):
    if not isinstance(value, str):
        raise ValueError("invalid datetime")
    parsed = _parse_iso_datetime(value)
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError("datetime must include timezone")
    return parsed.astimezone(timezone.utc)


def _parse_datetime_as_utc(value):
    if not isinstance(value, str):
        raise ValueError("invalid datetime")
    parsed = _parse_iso_datetime(value)
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _parse_iso_datetime(value):
    text = value[:-1] + "+00:00" if value.endswith("Z") else value
    return datetime.fromisoformat(text)


def _sqlite_datetime(value):
    return value.astimezone(timezone.utc).replace(tzinfo=None).isoformat(sep=" ", timespec="microseconds")


def _required_string(value):
    if not isinstance(value, str) or value == "":
        raise ValueError("invalid string")
    return value


def _optional_string(value):
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError("invalid string")
    return value


def _fingerprint(value):
    if value is None:
        return None
    if not isinstance(value, str) or not FINGERPRINT_RE.match(value):
        raise ValueError("invalid request fingerprint")
    return value.lower()


def _idempotency_key(value):
    if value is None:
        return None
    if not isinstance(value, str) or not 1 <= len(value) <= 128 or value != value.strip() or any(ord(ch) < 32 for ch in value):
        raise ValueError("invalid idempotency key")
    return value


def _now():
    return datetime.now(timezone.utc).isoformat()


def _add(checks, name, ok, message):
    checks.append({"name": name, "ok": bool(ok), "message": message})


def _release_sqlite(path):
    if not Path(path).exists():
        return
    conn = None
    try:
        conn = sqlite3.connect(path)
        conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
    except sqlite3.Error:
        pass
    finally:
        if conn is not None:
            conn.close()
    gc.collect()


def _remove_sqlite_sidecars(path):
    path = Path(path)
    for suffix in ("-wal", "-shm"):
        path.with_name(path.name + suffix).unlink(missing_ok=True)


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


def _connect_readonly(path):
    uri = f"file:{Path(path).resolve().as_posix()}?mode=ro"
    conn = sqlite3.connect(uri, uri=True)
    try:
        conn.execute("PRAGMA busy_timeout=5000")
        return conn
    except Exception:
        conn.close()
        raise


def _sqlite_backup(source, target):
    source, target = Path(source), Path(target)
    if target.exists():
        raise ValueError("backup target already exists")
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = _working_path(target, ".snapshot")
    src = dst = None
    active_error = None
    try:
        try:
            src = _connect_readonly(source)
            dst = sqlite3.connect(temporary)
            src.backup(dst)
            _commit(dst)
        except Exception as exc:
            active_error = exc
            raise
        finally:
            close_error = None
            for conn in (dst, src):
                if conn is None:
                    continue
                try:
                    _close(conn)
                except Exception as exc:
                    close_error = close_error or exc
            if active_error is None and close_error is not None:
                raise close_error
        if not check_database(temporary)["ok"]:
            raise ValueError("backup integrity check failed")
        _replace(temporary, target)
        return target
    finally:
        preserve_error = sys.exc_info()[0] is not None
        try:
            temporary.unlink(missing_ok=True)
            _remove_sqlite_sidecars(temporary)
        except OSError:
            if not preserve_error:
                raise


def _rollback_snapshot(source, target):
    source, target = Path(source), Path(target)
    if target.exists():
        raise ValueError("rollback target already exists")
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = _working_path(target, ".snapshot")
    try:
        _release_sqlite(source)
        expected_hash = _file_hash(source)
        _copy_database_file(source, temporary)
        if not check_database(temporary)["ok"]:
            raise ValueError("rollback snapshot failed integrity check")
        if _file_hash(temporary) != expected_hash:
            raise ValueError("rollback snapshot hash mismatch")
        _replace(temporary, target)
        return expected_hash
    finally:
        preserve_error = sys.exc_info()[0] is not None
        try:
            temporary.unlink(missing_ok=True)
            _remove_sqlite_sidecars(temporary)
        except OSError:
            if not preserve_error:
                raise


def _copy_database_file(source, target):
    source_stream = target_stream = None
    active_error = None
    try:
        source_stream = Path(source).open("rb")
        target_stream = Path(target).open("xb")
        shutil.copyfileobj(source_stream, target_stream)
        _flush(target_stream)
        _fsync(target_stream)
    except Exception as exc:
        active_error = exc
        raise
    finally:
        close_error = None
        for stream in (target_stream, source_stream):
            if stream is None:
                continue
            try:
                _close(stream)
            except Exception as exc:
                close_error = close_error or exc
        if active_error is None and close_error is not None:
            raise close_error


def _file_hash(path):
    digest = hashlib.sha256()
    with Path(path).open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _commit(conn):
    conn.commit()


def _close(conn):
    conn.close()


def _flush(stream):
    stream.flush()


def _fsync(stream):
    os.fsync(stream.fileno())


def _working_path(database, suffix=".import"):
    return database.with_name(f"{database.name}{suffix}-{os.getpid()}-{time.time_ns()}.tmp")
