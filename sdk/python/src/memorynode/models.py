from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator


MemoryType = Literal[
    "user_preference", "project_constraint", "project_decision",
    "recurring_workflow", "known_pitfall", "fact",
]
ProposalStatus = Literal["pending", "approved", "rejected"]
MemoryStatus = Literal["active", "revoked", "expired"]


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
    reason: str | None
    status: ProposalStatus
    created_at: datetime
    decided_at: datetime | None


class Memory(Model):
    id: str
    proposal_id: str
    supersedes_memory_id: str | None
    content: str
    type: MemoryType
    status: MemoryStatus
    expires_at: datetime | None
    created_at: datetime
    updated_at: datetime
    score: float | None = None


class MemoryEvent(Model):
    id: str
    memory_id: str | None
    proposal_id: str | None
    event_type: str
    actor_id: str
    note: str | None
    created_at: datetime


class ProposalExtraction(Model):
    source_id: str
    proposals: list[Proposal]


class ProposalList(Model):
    proposals: list[Proposal]


class MemoryList(Model):
    memories: list[Memory]


class MemoryExplanation(Model):
    source: Source
    proposal: Proposal
    memory: Memory
    events: list[MemoryEvent]
    supersedes: Memory | None
    superseded_by: Memory | None
