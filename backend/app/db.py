import os

from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.sql import text


Base = declarative_base()

_engine = None
_engine_path = None


def db_path() -> str:
    return os.getenv("MEMORYNODE_DB_PATH", "./memorynode.db")


def engine():
    global _engine, _engine_path
    path = db_path()
    if _engine is None or _engine_path != path:
        _engine = create_engine(
            f"sqlite:///{path}",
            connect_args={"check_same_thread": False},
        )
        event.listen(_engine, "connect", _set_sqlite_pragmas)
        _engine_path = path
    return _engine


def _set_sqlite_pragmas(dbapi_connection, _connection_record):
    cursor = dbapi_connection.cursor()
    for statement in (
        "PRAGMA foreign_keys=ON",
        "PRAGMA busy_timeout=5000",
        "PRAGMA journal_mode=WAL",
        "PRAGMA synchronous=NORMAL",
    ):
        cursor.execute(statement)
    cursor.close()


def init_db():
    from . import models  # noqa: F401
    from .migrations import ensure_schema

    ensure_schema(engine(), Base.metadata, db_path())


def rebuild_fts():
    with engine().begin() as conn:
        ensure_fts(conn)
        conn.execute(text("DELETE FROM memory_fts"))
        conn.execute(
            text(
                "INSERT INTO memory_fts(memory_id, content) "
                "SELECT id, content FROM memories"
            )
        )


def ensure_fts(conn):
        conn.execute(
            text(
                "CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts "
                "USING fts5(memory_id UNINDEXED, content)"
            )
        )


def session_local():
    return sessionmaker(bind=engine(), autoflush=False, autocommit=False)()


def get_db():
    db = session_local()
    try:
        yield db
    finally:
        db.close()
