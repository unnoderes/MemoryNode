import uuid
from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, Column, DateTime, Float, ForeignKey, String, Text

from .db import Base


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex}"


def now() -> datetime:
    return datetime.now(timezone.utc)


class MemorySource(Base):
    __tablename__ = "memory_sources"

    id = Column(String, primary_key=True, default=lambda: new_id("src"))
    actor_id = Column(String, nullable=False)
    project_id = Column(String, nullable=False)
    raw_text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=now)


class MemoryProposal(Base):
    __tablename__ = "memory_proposals"
    __table_args__ = (
        CheckConstraint("status in ('pending', 'approved', 'rejected')"),
    )

    id = Column(String, primary_key=True, default=lambda: new_id("proposal"))
    source_id = Column(String, ForeignKey("memory_sources.id"), nullable=False)
    content = Column(Text, nullable=False)
    type = Column(String, nullable=False)
    confidence = Column(Float, nullable=False)
    source_quote = Column(Text, nullable=False)
    reason = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="pending")
    created_at = Column(DateTime(timezone=True), nullable=False, default=now)
    decided_at = Column(DateTime(timezone=True), nullable=True)


class Memory(Base):
    __tablename__ = "memories"
    __table_args__ = (
        CheckConstraint("status in ('active', 'revoked', 'expired')"),
    )

    id = Column(String, primary_key=True, default=lambda: new_id("mem"))
    proposal_id = Column(String, ForeignKey("memory_proposals.id"), nullable=False)
    supersedes_memory_id = Column(String, ForeignKey("memories.id"), nullable=True)
    content = Column(Text, nullable=False)
    type = Column(String, nullable=False)
    status = Column(String, nullable=False, default="active")
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=now)


class MemoryEvent(Base):
    __tablename__ = "memory_events"

    id = Column(String, primary_key=True, default=lambda: new_id("evt"))
    memory_id = Column(String, ForeignKey("memories.id"), nullable=True)
    proposal_id = Column(String, ForeignKey("memory_proposals.id"), nullable=True)
    event_type = Column(String, nullable=False)
    actor_id = Column(String, nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=now)
    idempotency_key = Column(String, nullable=True)
    request_fingerprint = Column(String, nullable=True)
