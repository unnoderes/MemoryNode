import os

from sqlalchemy import create_engine
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
        _engine_path = path
    return _engine


def init_db():
    from . import models  # noqa: F401

    Base.metadata.create_all(bind=engine())
    rebuild_fts()


def rebuild_fts():
    with engine().begin() as conn:
        conn.execute(
            text(
                "CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts "
                "USING fts5(memory_id UNINDEXED, content)"
            )
        )
        conn.execute(text("DELETE FROM memory_fts"))
        conn.execute(
            text(
                "INSERT INTO memory_fts(memory_id, content) "
                "SELECT id, content FROM memories"
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
