from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, field_validator


MemoryType = Literal[
    "user_preference", "project_constraint", "project_decision",
    "recurring_workflow", "known_pitfall", "fact",
]
ProposalStatus = Literal["pending", "approved", "rejected"]
MemoryStatus = Literal["active", "revoked", "expired"]
FeedbackType = Literal["useful", "not_useful", "possibly_stale"]


class Model(BaseModel):
    model_config = ConfigDict(extra="allow")

    @field_validator("*", mode="after")
    @classmethod
    def timezone_required(cls, value):
        if isinstance(value, datetime) and (value.tzinfo is None or value.utcoffset() is None):
            raise ValueError("datetime must include a timezone")
        return value

    def dump(self) -> dict:
        return self.model_dump(mode="json", exclude_unset=True)


class Health(Model):
    ok: bool
    service: str


class Source(Model):
    id: str
    actor_id: str
    project_id: str
    raw_text: str
    created_at: datetime


class Proposal(Model):
    id: str
    source_id: str
    content: str
    type: MemoryType
    confidence: float
    source_quote: str
    reason: Optional[str]
    status: ProposalStatus
    created_at: datetime
    decided_at: Optional[datetime]


class Memory(Model):
    id: str
    proposal_id: str
    supersedes_memory_id: Optional[str]
    content: str
    type: MemoryType
    status: MemoryStatus
    expires_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    score: Optional[float] = None


class MemoryEvent(Model):
    id: str
    memory_id: Optional[str]
    proposal_id: Optional[str]
    event_type: str
    actor_id: str
    note: Optional[str]
    created_at: datetime


class ProposalExtraction(Model):
    source_id: str
    proposals: List[Proposal]


class ProposalList(Model):
    proposals: List[Proposal]


class MemoryList(Model):
    memories: List[Memory]


class MemoryEventList(Model):
    events: List[MemoryEvent]


class MemoryExplanation(Model):
    source: Source
    proposal: Proposal
    memory: Memory
    events: List[MemoryEvent]
    supersedes: Optional[Memory]
    superseded_by: Optional[Memory]
