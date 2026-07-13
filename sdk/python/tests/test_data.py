import hashlib
import json
from pathlib import Path

import pytest

from memorynode import data
from memorynode.config import Paths
from memorynode import cli

FINGERPRINT = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"


def make_db(path, content="Unicode 记忆 roundtrip"):
    if path.exists():
        with data.connect(path) as conn:
            for table in reversed(data.TABLES):
                conn.execute(f"DELETE FROM {table}")
            conn.execute("DELETE FROM memory_fts")
            conn.commit()
    else:
        data.create_empty_database(path)
    with data.connect(path) as conn:
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
    with data.connect(imported) as conn:
        assert conn.execute("SELECT memory_id FROM memory_fts WHERE memory_fts MATCH 'roundtrip'").fetchone()[0] == "mem_1"

    make_db(source, "changed content")
    data.restore_database(source, backup)
    with data.connect(source) as conn:
        assert conn.execute("SELECT content FROM memories WHERE id='mem_1'").fetchone()[0].endswith("roundtrip")


def test_import_conflict_and_invalid_inputs_roll_back(tmp_path):
    db = tmp_path / "db.db"
    make_db(db)
    exported = data.export_jsonl(db, tmp_path / "export.jsonl")
    before_hash = file_hash(db)
    before_rows = row_counts(db)
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
    with data.connect(db) as conn:
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
        make_db(target, "existing content")
        before_hash = file_hash(target)
        before_rows = row_counts(target)
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

    with pytest.raises((ValueError, RuntimeError, PermissionError)):
        data.import_jsonl(target, import_file)
    if failure == "post_check_missing":
        assert not target.exists()
    else:
        assert file_hash(target) == before_hash
        assert row_counts(target) == before_rows


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
    with data.connect(db) as conn:
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
    with data.connect(path) as conn:
        return {table: conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0] for table in data.TABLES}


def mutate_export(source, target, mutator):
    items = [json.loads(line) for line in source.read_text(encoding="utf-8").splitlines()]
    mutator(items)
    target.write_text("\n".join(json.dumps(item, ensure_ascii=False) for item in items) + "\n", encoding="utf-8")
    return target
