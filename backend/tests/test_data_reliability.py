import sqlite3
import sys
from pathlib import Path

import pytest
from sqlalchemy import create_engine, text

from app import models  # noqa: F401
from app.db import Base
from app.integrity import check_database
from app.migrations import ensure_schema

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "sdk/python/src"))
from memorynode import data as cli_data


def create_v0(path):
    engine = create_engine(f"sqlite:///{path}")
    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE memory_sources (id VARCHAR PRIMARY KEY, actor_id VARCHAR NOT NULL, project_id VARCHAR NOT NULL, raw_text TEXT NOT NULL, created_at DATETIME NOT NULL)"))
        conn.execute(text("CREATE TABLE memory_proposals (id VARCHAR PRIMARY KEY, source_id VARCHAR NOT NULL, content TEXT NOT NULL, type VARCHAR NOT NULL, confidence FLOAT NOT NULL, source_quote TEXT NOT NULL, reason TEXT, status VARCHAR NOT NULL, created_at DATETIME NOT NULL, decided_at DATETIME)"))
        conn.execute(text("CREATE TABLE memories (id VARCHAR PRIMARY KEY, proposal_id VARCHAR NOT NULL, content TEXT NOT NULL, type VARCHAR NOT NULL, status VARCHAR NOT NULL, expires_at DATETIME, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL)"))
        conn.execute(text("CREATE TABLE memory_events (id VARCHAR PRIMARY KEY, memory_id VARCHAR, proposal_id VARCHAR, event_type VARCHAR NOT NULL, actor_id VARCHAR NOT NULL, note TEXT, created_at DATETIME NOT NULL)"))
        conn.execute(text("INSERT INTO memory_sources VALUES ('src_1','actor','project','raw','2026-07-13T00:00:00+00:00')"))
        conn.execute(text("INSERT INTO memory_proposals VALUES ('proposal_1','src_1','content','fact',1.0,'content',NULL,'approved','2026-07-13T00:00:00+00:00','2026-07-13T00:00:00+00:00')"))
        conn.execute(text("INSERT INTO memories VALUES ('mem_1','proposal_1','content','fact','active',NULL,'2026-07-13T00:00:00+00:00','2026-07-13T00:00:00+00:00')"))


def test_new_database_is_schema_v2_with_pragmas_and_integrity(tmp_path):
    db = tmp_path / "new.db"
    ensure_schema(create_engine(f"sqlite:///{db}", connect_args={"check_same_thread": False}), Base.metadata, str(db))
    with sqlite3.connect(db) as conn:
        assert conn.execute("PRAGMA user_version").fetchone()[0] == 2
        assert conn.execute("SELECT name FROM sqlite_master WHERE name='ix_memory_events_idempotency_key'").fetchone()
    assert check_database(db)["ok"]


def test_v0_migrates_with_backup_and_preserves_rows(tmp_path, monkeypatch):
    db = tmp_path / "legacy.db"
    backups = tmp_path / "backups"
    create_v0(db)
    monkeypatch.setenv("MEMORYNODE_BACKUP_DIR", str(backups))
    ensure_schema(create_engine(f"sqlite:///{db}", connect_args={"check_same_thread": False}), Base.metadata, str(db))
    assert list(backups.glob("memorynode-pre-migration-v0-*.db"))
    with sqlite3.connect(db) as conn:
        assert conn.execute("PRAGMA user_version").fetchone()[0] == 2
        columns = {row[1] for row in conn.execute("PRAGMA table_info(memory_events)")}
        assert {"idempotency_key", "request_fingerprint"} <= columns
        assert conn.execute("SELECT content FROM memories WHERE id='mem_1'").fetchone()[0] == "content"
    assert check_database(db)["ok"]


def test_newer_and_malformed_database_are_refused(tmp_path):
    newer = tmp_path / "newer.db"
    with sqlite3.connect(newer) as conn:
        conn.execute("PRAGMA user_version=999")
    with pytest.raises(RuntimeError, match="newer"):
        ensure_schema(create_engine(f"sqlite:///{newer}", connect_args={"check_same_thread": False}), Base.metadata, str(newer))

    malformed = tmp_path / "bad.db"
    with sqlite3.connect(malformed) as conn:
        conn.execute("CREATE TABLE memories (id VARCHAR PRIMARY KEY)")
    with pytest.raises(RuntimeError, match="missing required tables|integrity"):
        ensure_schema(create_engine(f"sqlite:///{malformed}", connect_args={"check_same_thread": False}), Base.metadata, str(malformed))


def test_integrity_detects_fts_mismatch(tmp_path):
    db = tmp_path / "fts.db"
    create_v0(db)
    ensure_schema(create_engine(f"sqlite:///{db}", connect_args={"check_same_thread": False}), Base.metadata, str(db))
    with sqlite3.connect(db) as conn:
        conn.execute("DELETE FROM memory_fts")
        conn.commit()
    result = check_database(db)
    assert not result["ok"]
    assert any(item["name"] == "fts:memory_ids" and not item["ok"] for item in result["checks"])


def create_v2(path):
    ensure_schema(create_engine(f"sqlite:///{path}", connect_args={"check_same_thread": False}), Base.metadata, str(path))
    with sqlite3.connect(path) as conn:
        conn.execute("INSERT INTO memory_sources VALUES ('src_1','actor','project','raw','2026-07-13 00:00:00.000000')")
        conn.execute("INSERT INTO memory_proposals VALUES ('proposal_1','src_1','content','fact',1.0,'content','reason','approved','2026-07-13 00:00:00.000000','2026-07-13 00:00:00.000000')")
        conn.execute("INSERT INTO memories VALUES ('mem_1','proposal_1',NULL,'content','fact','active',NULL,'2026-07-13 00:00:00.000000','2026-07-13 00:00:00.000000')")
        conn.execute("INSERT INTO memory_events VALUES ('evt_1','mem_1','proposal_1','approve','reviewer','ok','2026-07-13 00:00:00.000000','key','0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef')")
        conn.execute("DELETE FROM memory_fts")
        conn.execute("INSERT INTO memory_fts(memory_id, content) SELECT id, content FROM memories")
        conn.commit()


def malformed_v2_missing_column(path):
    with sqlite3.connect(path) as conn:
        conn.execute("CREATE TABLE memory_sources (id VARCHAR PRIMARY KEY, actor_id VARCHAR NOT NULL, project_id VARCHAR NOT NULL, raw_text TEXT NOT NULL, created_at DATETIME NOT NULL)")
        conn.execute("CREATE TABLE memory_proposals (id VARCHAR PRIMARY KEY, source_id VARCHAR NOT NULL REFERENCES memory_sources(id), content TEXT NOT NULL, type VARCHAR NOT NULL, confidence FLOAT NOT NULL, source_quote TEXT NOT NULL, reason TEXT, status VARCHAR NOT NULL, created_at DATETIME NOT NULL, decided_at DATETIME)")
        conn.execute("CREATE TABLE memories (id VARCHAR PRIMARY KEY, proposal_id VARCHAR NOT NULL REFERENCES memory_proposals(id), supersedes_memory_id VARCHAR REFERENCES memories(id), content TEXT NOT NULL, type VARCHAR NOT NULL, status VARCHAR NOT NULL, expires_at DATETIME, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL)")
        conn.execute("CREATE TABLE memory_events (id VARCHAR PRIMARY KEY, memory_id VARCHAR REFERENCES memories(id), proposal_id VARCHAR REFERENCES memory_proposals(id), event_type VARCHAR NOT NULL, actor_id VARCHAR NOT NULL, note TEXT, created_at DATETIME NOT NULL, idempotency_key VARCHAR)")
        conn.execute("CREATE UNIQUE INDEX ix_memory_events_idempotency_key ON memory_events(idempotency_key) WHERE idempotency_key IS NOT NULL")
        conn.execute("CREATE VIRTUAL TABLE memory_fts USING fts5(memory_id UNINDEXED, content)")
        conn.execute("PRAGMA user_version=2")


@pytest.mark.parametrize("damage", ["missing_column", "missing_index", "wrong_index", "missing_fts", "fts_mismatch", "fk_violation"])
def test_backend_and_cli_integrity_parity_on_malformed_v2(tmp_path, damage):
    db = tmp_path / f"{damage}.db"
    if damage == "missing_column":
        malformed_v2_missing_column(db)
    else:
        create_v2(db)
        with sqlite3.connect(db) as conn:
            if damage == "missing_index":
                conn.execute("DROP INDEX ix_memory_events_idempotency_key")
            elif damage == "wrong_index":
                conn.execute("DROP INDEX ix_memory_events_idempotency_key")
                conn.execute("CREATE INDEX ix_memory_events_idempotency_key ON memory_events(idempotency_key)")
            elif damage == "missing_fts":
                conn.execute("DROP TABLE memory_fts")
            elif damage == "fts_mismatch":
                conn.execute("DELETE FROM memory_fts")
            elif damage == "fk_violation":
                conn.execute("PRAGMA foreign_keys=OFF")
                conn.execute("INSERT INTO memory_proposals VALUES ('proposal_bad','missing','bad','fact',1.0,'bad',NULL,'pending','2026-07-13 00:00:00.000000',NULL)")
            conn.commit()
    backend = check_database(db)
    cli = cli_data.check_database(db)
    assert backend["ok"] is cli["ok"] is False
    assert {item["name"]: item["ok"] for item in backend["checks"]} == {item["name"]: item["ok"] for item in cli["checks"]}


def test_current_v2_malformed_startup_fails_without_mutation(tmp_path):
    db = tmp_path / "bad-v2.db"
    create_v2(db)
    with sqlite3.connect(db) as conn:
        conn.execute("DROP INDEX ix_memory_events_idempotency_key")
        conn.commit()
    before = db.read_bytes()
    with pytest.raises(RuntimeError, match="integrity"):
        ensure_schema(create_engine(f"sqlite:///{db}", connect_args={"check_same_thread": False}), Base.metadata, str(db))
    assert db.read_bytes() == before
    with sqlite3.connect(db) as conn:
        assert not conn.execute("SELECT name FROM sqlite_master WHERE name='ix_memory_events_idempotency_key'").fetchone()
