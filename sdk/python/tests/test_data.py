import json

import pytest

from memorynode import data
from memorynode.config import Paths
from memorynode import cli


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
        conn.execute("INSERT INTO memory_events VALUES (?,?,?,?,?,?,?,?,?)", ("evt_1", "mem_1", "proposal_1", "approve", "reviewer", "ok", "2026-07-13T00:00:00+00:00", "key", "hash"))
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
    rows = exported.read_text(encoding="utf-8").splitlines()
    changed = json.loads(rows[1])
    changed["data"]["raw_text"] = "different"
    rows[1] = json.dumps(changed)
    bad = tmp_path / "bad.jsonl"
    bad.write_text("\n".join(rows) + "\n", encoding="utf-8")
    with pytest.raises(ValueError, match="conflict"):
        data.import_jsonl(db, bad)
    with data.connect(db) as conn:
        assert conn.execute("SELECT raw_text FROM memory_sources WHERE id='src_1'").fetchone()[0] != "different"

    huge = tmp_path / "huge.jsonl"
    huge.write_bytes(b"x" * (data.MAX_IMPORT_BYTES + 1))
    with pytest.raises(ValueError, match="100 MiB"):
        data.import_jsonl(tmp_path / "new.db", huge)


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
