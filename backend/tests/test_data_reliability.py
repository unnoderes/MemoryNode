import sqlite3

import pytest
from sqlalchemy import create_engine, text

from app.db import Base
from app.integrity import check_database
from app.migrations import ensure_schema


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
    with pytest.raises(RuntimeError, match="missing required tables"):
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
