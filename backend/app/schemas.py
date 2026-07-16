from datetime import datetime
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


class ModelSettingsRequest(BaseModel):
    provider: str = "qwen_compatible"
    base_url: str
    model: str
    wire_api: str = "chat"
    reasoning_effort: Optional[str] = "medium"
    api_key: Optional[str] = None
    keep_existing_api_key: bool = False


class ModelSettingsTestRequest(BaseModel):
    use_saved: bool = False
    provider: Optional[str] = None
    base_url: Optional[str] = None
    model: Optional[str] = None
    wire_api: Optional[str] = None
    reasoning_effort: Optional[str] = None
    api_key: Optional[str] = None


class ExtractedProposal(BaseModel):
    content: str
    type: MemoryType
    confidence: float = Field(ge=0.0, le=1.0)
    source_quote: str
    reason: str


class DecisionRequest(BaseModel):
    actor_id: str = "reviewer"
    note: Optional[str] = None
    supersede_memory_id: Optional[str] = None
    expires_at: Optional[datetime] = None
    idempotency_key: Optional[str] = None


FeedbackType = Literal["useful", "not_useful", "possibly_stale"]


class FeedbackRequest(BaseModel):
    feedback: FeedbackType
    actor_id: str
    note: Optional[str] = Field(default=None, max_length=1000)
    idempotency_key: Optional[str] = None


class ExpiryRequest(BaseModel):
    actor_id: str
    note: str = Field(min_length=1, max_length=1000)
    expires_at: datetime
    idempotency_key: Optional[str] = None
