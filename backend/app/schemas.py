from typing import List, Literal, Optional

from pydantic import BaseModel, Field


MemoryType = Literal[
    "user_preference",
    "project_constraint",
    "project_decision",
    "recurring_workflow",
    "known_pitfall",
    "fact",
]


class ProposalCreate(BaseModel):
    content: str
    type: MemoryType = "fact"
    actor_id: str = "demo-user"
    project_id: str = "memorynode-demo"
    raw_text: Optional[str] = None
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    source_quote: Optional[str] = None
    reason: Optional[str] = None


class ExtractMessage(BaseModel):
    role: str
    content: str


class ProposalExtractRequest(BaseModel):
    actor_id: str
    project_id: str
    messages: List[ExtractMessage]


class ExtractedProposal(BaseModel):
    content: str
    type: MemoryType
    confidence: float = Field(ge=0.0, le=1.0)
    source_quote: str
    reason: str


class DecisionRequest(BaseModel):
    actor_id: str = "reviewer"
    note: Optional[str] = None
