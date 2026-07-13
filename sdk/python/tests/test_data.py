import hashlib
import json
import sqlite3
from contextlib import closing
from pathlib import Path

import pytest

from memorynode import data
from memorynode.config import Paths
from memorynode import cli

FINGERPRINT = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"


def make_db(path, content="Unicode 记忆 roundtrip"):
    if path.exists():
        with closing(data.connect(path)) as conn:
            for table in reversed(data.TABLES):
                conn.execute(f"DELETE FROM {table}")
            conn.execute("DELETE FROM memory_fts")
            conn.commit()
    else:
        data.create_empty_database(path)
    with closing(data.connect(path)) as conn:
        conn.execute("INSERT INTO memory_sources VALUES (?,?,?,?,?)", ("src_1", "actor", "project", content, "2026-07-13T00:00:00+00:00"))
        conn.execute("INSERT INTO memory_proposals VALUES (?,?,?,?,?,?,?,?,?,?)", ("proposal_1", "src_1", content, "fact", 1.0, content, "reason", "approved", "2026-07-13T00:00:00+00:00", "2026-07-13T00:00:00+00:00"))
        conn.execute("INSERT INTO memories VALUES (?,?,?,?,?,?,?,?,?)", ("mem_1", "proposal_1", None, content, "fact", "active", None, "2026-07-13T00:00:00+00:00", "2026-07-13T00:00:00+00:00"))
        conn.execute("INSERT INTO memory_events VALUES (?,?,?,?,?,?,?,?,?)", ("evt_1", "mem_1", "proposal_1", "approve", "reviewer", "ok", "2026-07-13T00:00:00+00:00", "key", FINGERPRINT))
        data.rebuild_fts(conn)
        conn.commit()


def test_backup_export_import_restore_roundtrip(tmp_path):
    source = tmp_path / "source.db"
    make_db(source)

    backup = data.backup_database(source, tmp_path / "backup.db")
    with pytest.raises(ValueError, match="already exists"):
        data.backup_database(source, backup)
    exported = data.export_jsonl(source, tmp_path / "export.jsonl")
    assert data.check_database(backup)["ok"]
    lines = exported.read_text(encoding="utf-8").splitlines()
    assert json.loads(lines[0])["schema_version"] == data.CURRENT_SCHEMA_VERSION
    assert {json.loads(line)["table"] for line in lines[1:]} == set(data.TABLES)
    assert "memory_fts" not in exported.read_text(encoding="utf-8")
    assert json.loads(lines[1])["data"]["created_at"].endswith("+00:00")

    imported = tmp_path / "imported.db"
    report = data.import_jsonl(imported, exported)
    assert report == {"inserted": 4, "skipped": 0, "conflicts": 0}
    assert data.import_jsonl(imported, exported) == {"inserted": 0, "skipped": 4, "conflicts": 0}
    with closing(data.connect(imported)) as conn:
        assert conn.execute("SELECT memory_id FROM memory_fts WHERE memory_fts MATCH 'roundtrip'").fetchone()[0] == "mem_1"

    make_db(source, "changed content")
    data.restore_database(source, backup)
    with closing(data.connect(source)) as conn:
        assert conn.execute("SELECT content FROM memories WHERE id='mem_1'").fetchone()[0].endswith("roundtrip")


def test_import_conflict_and_invalid_inputs_roll_back(tmp_path):
    db = tmp_path / "db.db"
    make_db(db)
    exported = data.export_jsonl(db, tmp_path / "export.jsonl")
    before_rows = row_counts(db)
    before_hash = file_hash(db)
    rows = exported.read_text(encoding="utf-8").splitlines()
    changed = json.loads(rows[1])
    changed["data"]["raw_text"] = "different"
    rows[1] = json.dumps(changed)
    bad = tmp_path / "bad.jsonl"
    bad.write_text("\n".join(rows) + "\n", encoding="utf-8")
    with pytest.raises(ValueError, match="conflict"):
        data.import_jsonl(db, bad)
    assert file_hash(db) == before_hash
    assert row_counts(db) == before_rows
    with closing(data.connect(db)) as conn:
        assert conn.execute("SELECT raw_text FROM memory_sources WHERE id='src_1'").fetchone()[0] != "different"

    huge = tmp_path / "huge.jsonl"
    huge.write_bytes(b"x" * (data.MAX_IMPORT_BYTES + 1))
    with pytest.raises(ValueError, match="100 MiB"):
        data.import_jsonl(tmp_path / "new.db", huge)


@pytest.mark.parametrize("mutator", [
    lambda items: items[0].update({"extra": True}),
    lambda items: items[1].update({"extra": True}),
    lambda items: items[1]["data"].update({"extra": True}),
    lambda items: items[1]["data"].update({"created_at": "2026-07-13T00:00:00"}),
    lambda items: items[2]["data"].update({"type": "unknown"}),
    lambda items: items[2]["data"].update({"status": "done"}),
    lambda items: items[2]["data"].update({"confidence": 1.5}),
    lambda items: items[3]["data"].update({"status": "pending"}),
    lambda items: items[4]["data"].update({"request_fingerprint": "hash"}),
    lambda items: items[4]["data"].update({"idempotency_key": " key"}),
    lambda items: items.__setitem__(slice(2, 4), [items[3], items[2]]),
])
def test_import_contract_rejects_invalid_header_rows_and_fields(tmp_path, mutator):
    db = tmp_path / "source.db"
    make_db(db)
    exported = data.export_jsonl(db, tmp_path / "export.jsonl")
    bad = mutate_export(exported, tmp_path / "bad.jsonl", mutator)
    target = tmp_path / "target.db"
    with pytest.raises(ValueError):
        data.import_jsonl(target, bad)
    assert not target.exists()


@pytest.mark.parametrize("failure", ["insert", "fts", "replace", "post_check_existing", "post_check_missing"])
def test_import_failure_injection_preserves_target(tmp_path, monkeypatch, failure):
    source = tmp_path / "source.db"
    make_db(source)
    exported = data.export_jsonl(source, tmp_path / "export.jsonl")
    target = tmp_path / "target.db"
    if failure != "post_check_missing":
        data.create_empty_database(target)
        before_rows = row_counts(target)
        before_hash = file_hash(target)
    else:
        before_hash = before_rows = None

    import_file = exported
    if failure == "insert":
        import_file = mutate_export(exported, tmp_path / "bad-fk.jsonl", lambda items: items[3]["data"].update({"proposal_id": "missing"}))
    elif failure == "fts":
        monkeypatch.setattr(data, "rebuild_fts", lambda _conn: (_ for _ in ()).throw(RuntimeError("fts failed")))
    elif failure == "replace":
        real_replace = data._replace
        monkeypatch.setattr(data, "_replace", lambda source, dest: (_ for _ in ()).throw(PermissionError("replace failed")) if Path(dest) == target else real_replace(source, dest))
    elif failure in {"post_check_existing", "post_check_missing"}:
        real_check = data.check_database
        calls = {"target": 0}

        def fake_check(path, *args, **kwargs):
            if Path(path) == target:
                calls["target"] += 1
                if (failure == "post_check_existing" and calls["target"] >= 2) or failure == "post_check_missing":
                    return {"ok": False, "schema_version": data.CURRENT_SCHEMA_VERSION, "checks": [{"name": "injected", "ok": False, "message": "fail"}]}
            return real_check(path, *args, **kwargs)

        monkeypatch.setattr(data, "check_database", fake_check)

    expected = sqlite3.IntegrityError if failure == "insert" else (ValueError, RuntimeError, PermissionError)
    with pytest.raises(expected):
        data.import_jsonl(target, import_file)
    if failure == "post_check_missing":
        assert not target.exists()
    else:
        assert file_hash(target) == before_hash
        assert row_counts(target) == before_rows
    assert_no_target_artifacts(target)


def test_check_and_create_release_sqlite_files(tmp_path):
    database = tmp_path / "database.db"
    data.create_empty_database(database)
    assert data.check_database(database)["ok"]
    renamed = database.with_suffix(".renamed")
    database.rename(renamed)
    renamed.unlink()


@pytest.mark.parametrize("failure", ["partial", "commit", "close", "check", "replace"])
def test_import_working_snapshot_failures_preserve_target(tmp_path, monkeypatch, failure):
    source = tmp_path / "source.db"
    target = tmp_path / "target.db"
    make_db(source)
    data.create_empty_database(target)
    exported = data.export_jsonl(source, tmp_path / "export.jsonl")
    before_rows = row_counts(target)
    before_hash = file_hash(target)

    if failure == "partial":
        real_connect = data._connect_readonly

        class PartialSource:
            def __init__(self, conn):
                self.conn = conn

            def backup(self, dst):
                dst.execute("CREATE TABLE partial_snapshot (id)")
                dst.commit()
                raise RuntimeError("partial backup failed")

            def close(self):
                self.conn.close()

        def fake_connect(path):
            conn = real_connect(path)
            return PartialSource(conn) if Path(path) == target else conn

        monkeypatch.setattr(data, "_connect_readonly", fake_connect)
    elif failure == "commit":
        monkeypatch.setattr(data, "_commit", lambda _conn: (_ for _ in ()).throw(RuntimeError("commit failed")))
    elif failure == "close":
        real_close = data._close

        def fake_close(resource):
            files = [row[2] for row in resource.execute("PRAGMA database_list")] if isinstance(resource, sqlite3.Connection) else []
            real_close(resource)
            if any(".import-" in name and ".snapshot-" in name for name in files):
                raise RuntimeError("close failed")

        monkeypatch.setattr(data, "_close", fake_close)
    elif failure == "check":
        real_check = data.check_database

        def fake_check(path, *args, **kwargs):
            if ".import-" in Path(path).name and ".snapshot-" in Path(path).name:
                return failed_check()
            return real_check(path, *args, **kwargs)

        monkeypatch.setattr(data, "check_database", fake_check)
    elif failure == "replace":
        real_replace = data._replace

        def fake_replace(source_path, dest_path):
            if ".import-" in Path(dest_path).name:
                raise PermissionError("snapshot publish failed")
            return real_replace(source_path, dest_path)

        monkeypatch.setattr(data, "_replace", fake_replace)

    with pytest.raises((RuntimeError, PermissionError, ValueError)):
        data.import_jsonl(target, exported)
    assert file_hash(target) == before_hash
    assert row_counts(target) == before_rows
    assert_no_target_artifacts(target)


@pytest.mark.parametrize("failure", ["copy", "flush", "fsync", "close", "integrity", "hash", "replace"])
def test_import_rollback_creation_failures_preserve_target(tmp_path, monkeypatch, failure):
    source = tmp_path / "source.db"
    target = tmp_path / "target.db"
    make_db(source)
    data.create_empty_database(target)
    exported = data.export_jsonl(source, tmp_path / "export.jsonl")
    before_rows = row_counts(target)
    before_hash = file_hash(target)

    if failure == "copy":
        def partial_copy(source_stream, target_stream):
            target_stream.write(source_stream.read(64))
            raise RuntimeError("copy failed")
        monkeypatch.setattr(data.shutil, "copyfileobj", partial_copy)
    elif failure == "flush":
        monkeypatch.setattr(data, "_flush", lambda _stream: (_ for _ in ()).throw(OSError("flush failed")))
    elif failure == "fsync":
        monkeypatch.setattr(data, "_fsync", lambda _stream: (_ for _ in ()).throw(OSError("fsync failed")))
    elif failure == "close":
        real_close = data._close
        def fake_close(resource):
            name = str(getattr(resource, "name", ""))
            real_close(resource)
            if ".rollback-" in name:
                raise OSError("close failed")
        monkeypatch.setattr(data, "_close", fake_close)
    elif failure == "integrity":
        real_check = data.check_database
        monkeypatch.setattr(data, "check_database", lambda path, *args, **kwargs: failed_check() if ".rollback-" in Path(path).name and ".snapshot-" in Path(path).name else real_check(path, *args, **kwargs))
    elif failure == "hash":
        real_hash = data._file_hash
        monkeypatch.setattr(data, "_file_hash", lambda path: "0" * 64 if ".rollback-" in Path(path).name and ".snapshot-" in Path(path).name else real_hash(path))
    elif failure == "replace":
        real_replace = data._replace
        monkeypatch.setattr(data, "_replace", lambda source_path, dest_path: (_ for _ in ()).throw(PermissionError("publish failed")) if ".rollback-" in Path(dest_path).name else real_replace(source_path, dest_path))

    with pytest.raises((RuntimeError, OSError, ValueError)):
        data.import_jsonl(target, exported)
    assert file_hash(target) == before_hash
    assert row_counts(target) == before_rows
    assert_no_target_artifacts(target)


@pytest.mark.parametrize("failure", ["working_replace", "final_check"])
def test_ready_rollback_restores_exact_target(tmp_path, monkeypatch, failure):
    source = tmp_path / "source.db"
    target = tmp_path / "target.db"
    make_db(source)
    data.create_empty_database(target)
    exported = data.export_jsonl(source, tmp_path / "export.jsonl")
    before_rows = row_counts(target)
    before_hash = file_hash(target)
    real_replace = data._replace
    real_check = data.check_database
    installed = {"working": False}

    def fake_replace(source_path, dest_path):
        if Path(dest_path) == target and ".import-" in Path(source_path).name:
            if failure == "working_replace":
                raise PermissionError("working replace failed")
            result = real_replace(source_path, dest_path)
            installed["working"] = True
            return result
        return real_replace(source_path, dest_path)

    def fake_check(path, *args, **kwargs):
        if failure == "final_check" and Path(path) == target and installed["working"]:
            return failed_check()
        return real_check(path, *args, **kwargs)

    monkeypatch.setattr(data, "_replace", fake_replace)
    monkeypatch.setattr(data, "check_database", fake_check)
    with pytest.raises((PermissionError, ValueError)):
        data.import_jsonl(target, exported)
    assert file_hash(target) == before_hash
    assert row_counts(target) == before_rows
    assert real_check(target)["ok"]
    assert_no_target_artifacts(target)


@pytest.mark.parametrize("restore_failure", ["replace", "release"])
def test_restore_failure_retains_verified_rollback_for_manual_recovery(tmp_path, monkeypatch, restore_failure):
    source = tmp_path / "source.db"
    target = tmp_path / "target.db"
    make_db(source)
    data.create_empty_database(target)
    exported = data.export_jsonl(source, tmp_path / "export.jsonl")
    before_rows = row_counts(target)
    before_hash = file_hash(target)
    real_replace = data._replace
    real_check = data.check_database
    real_release = data._release_sqlite
    working_installed = {"value": False}

    def fail_restore(source_path, dest_path):
        if Path(dest_path) == target and ".import-" in Path(source_path).name:
            result = real_replace(source_path, dest_path)
            working_installed["value"] = True
            return result
        if restore_failure == "replace" and Path(dest_path) == target and ".rollback-" in Path(source_path).name:
            raise PermissionError("restore blocked")
        return real_replace(source_path, dest_path)

    def fail_release(path):
        if restore_failure == "release" and Path(path) == target and working_installed["value"]:
            raise RuntimeError("release blocked")
        return real_release(path)

    def fail_final_check(path, *args, **kwargs):
        if Path(path) == target and working_installed["value"]:
            return failed_check()
        return real_check(path, *args, **kwargs)

    monkeypatch.setattr(data, "_replace", fail_restore)
    monkeypatch.setattr(data, "check_database", fail_final_check)
    monkeypatch.setattr(data, "_release_sqlite", fail_release)
    with pytest.raises(ValueError, match="verified rollback") as caught:
        data.import_jsonl(target, exported)
    monkeypatch.setattr(data, "_release_sqlite", real_release)

    rollbacks = list(tmp_path.glob(f"{target.name}.rollback-*.tmp"))
    assert len(rollbacks) == 1
    rollback = rollbacks[0]
    assert str(rollback.resolve()) in str(caught.value)
    assert "Traceback" not in str(caught.value) and "Unicode" not in str(caught.value)
    assert isinstance(caught.value.__cause__, PermissionError if restore_failure == "replace" else RuntimeError)
    assert "after import" in str(caught.value.__cause__.__context__)
    assert data._file_hash(rollback) == before_hash
    assert real_check(rollback)["ok"]
    data._remove_sqlite_sidecars(rollback)
    assert_target_artifacts(target, {rollback.name})

    real_release(target)
    real_replace(rollback, target)
    data._remove_sqlite_sidecars(target)
    assert file_hash(target) == before_hash
    assert row_counts(target) == before_rows
    assert real_check(target)["ok"]
    assert_no_target_artifacts(target)


def test_import_refuses_damaged_ready_rollback_before_restore(tmp_path, monkeypatch):
    source = tmp_path / "source.db"
    target = tmp_path / "target.db"
    make_db(source)
    data.create_empty_database(target)
    exported = data.export_jsonl(source, tmp_path / "export.jsonl")
    before_rows = row_counts(target)
    before_hash = file_hash(target)
    real_snapshot = data._rollback_snapshot
    real_replace = data._replace
    real_remove_sidecars = data._remove_sqlite_sidecars

    def damaged_snapshot(source_path, target_path):
        digest = real_snapshot(source_path, target_path)
        Path(target_path).write_bytes(b"not a database")
        return digest

    def fail_working_replace(source_path, dest_path):
        if Path(dest_path) == target and ".import-" in Path(source_path).name:
            raise PermissionError("original replace failure")
        return real_replace(source_path, dest_path)

    def fail_cleanup(path):
        if ".rollback-" in Path(path).name and ".snapshot-" not in Path(path).name:
            raise PermissionError("cleanup failed")
        return real_remove_sidecars(path)

    monkeypatch.setattr(data, "_rollback_snapshot", damaged_snapshot)
    monkeypatch.setattr(data, "_replace", fail_working_replace)
    monkeypatch.setattr(data, "_remove_sqlite_sidecars", fail_cleanup)
    with pytest.raises(ValueError, match="rollback snapshot") as caught:
        data.import_jsonl(target, exported)
    assert isinstance(caught.value.__cause__, PermissionError)
    assert file_hash(target) == before_hash
    assert row_counts(target) == before_rows
    assert_no_target_artifacts(target)


def test_import_rejects_same_path_symlink_directory_and_device_like_targets(tmp_path):
    db = tmp_path / "db.db"
    make_db(db)
    exported = data.export_jsonl(db, tmp_path / "export.jsonl")
    with pytest.raises(ValueError, match="different paths"):
        data.import_jsonl(exported, exported)
    directory = tmp_path / "target-dir"
    directory.mkdir()
    with pytest.raises(ValueError, match="directories"):
        data.import_jsonl(directory, exported)
    link = tmp_path / "link.jsonl"
    try:
        link.symlink_to(exported)
    except OSError:
        return
    with pytest.raises(ValueError, match="symlinks"):
        data.import_jsonl(tmp_path / "target.db", link)


def test_integrity_detects_fts_damage(tmp_path):
    db = tmp_path / "db.db"
    make_db(db)
    with closing(data.connect(db)) as conn:
        conn.execute("DELETE FROM memory_fts")
        conn.commit()
    result = data.check_database(db)
    assert not result["ok"]
    assert any(item["name"] == "fts:memory_ids" and not item["ok"] for item in result["checks"])


def test_cli_data_commands_require_confirm_and_safe_ports(tmp_path, monkeypatch, capsys):
    paths = Paths(*(tmp_path / name for name in ("config", "data", "logs", "run")))
    paths.create()
    make_db(paths.database)
    assert cli.dispatch(cli.parser().parse_args(["backup"]), paths) == 0
    assert "sensitive memories" in capsys.readouterr().out
    with pytest.raises(ValueError, match="requires --confirm"):
        cli.dispatch(cli.parser().parse_args(["restore", str(paths.backups / "x.db")]), paths)
    with pytest.raises(ValueError, match="requires --confirm"):
        cli.dispatch(cli.parser().parse_args(["import", str(paths.exports / "x.jsonl")]), paths)


def file_hash(path):
    data._release_sqlite(path)
    return hashlib.sha256(path.read_bytes()).hexdigest()


def row_counts(path):
    with closing(data.connect(path)) as conn:
        return {table: conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0] for table in data.TABLES}


def assert_no_target_artifacts(target):
    assert_target_artifacts(target, set())


def assert_target_artifacts(target, expected_rollbacks):
    data._release_sqlite(target)
    names = {path.name for path in target.parent.iterdir() if path.name.startswith(target.name)}
    assert target.name + "-wal" not in names
    assert target.name + "-shm" not in names
    assert {name for name in names if ".rollback-" in name} == expected_rollbacks
    assert not any(".import-" in name or ".snapshot-" in name for name in names)


def failed_check():
    return {"ok": False, "schema_version": data.CURRENT_SCHEMA_VERSION, "checks": [{"name": "injected", "ok": False, "message": "fail"}]}


def mutate_export(source, target, mutator):
    items = [json.loads(line) for line in source.read_text(encoding="utf-8").splitlines()]
    mutator(items)
    target.write_text("\n".join(json.dumps(item, ensure_ascii=False) for item in items) + "\n", encoding="utf-8")
    return target
