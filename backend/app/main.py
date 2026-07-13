from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional

from fastapi import Depends, FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from sqlalchemy.orm import Session

load_dotenv()

from .db import get_db, init_db
from .schemas import DecisionRequest, ExpiryRequest, FeedbackRequest, ProposalCreate, ProposalExtractRequest
from .services import (
    approve_proposal,
    create_proposal,
    event_dict,
    explain_memory,
    extract_proposals,
    get_event,
    get_memory,
    get_proposal,
    get_source,
    list_memories,
    list_proposals,
    list_recent_events,
    memory_feedback,
    memory_dict,
    proposal_dict,
    related_memories,
    reject_proposal,
    revoke_memory,
    search_memories,
    set_memory_expiry,
    source_dict,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="MemoryNode", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"ok": True, "service": "memorynode"}


@app.post("/v1/proposals")
def post_proposal(payload: ProposalCreate, db: Session = Depends(get_db)):
    return proposal_dict(create_proposal(db, payload))


@app.post("/v1/proposals/extract")
def post_proposal_extract(
    payload: ProposalExtractRequest,
    db: Session = Depends(get_db),
):
    source_id, proposals = extract_proposals(db, payload)
    return {"source_id": source_id, "proposals": [proposal_dict(item) for item in proposals]}


@app.get("/v1/proposals")
def get_proposals(
    status: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    return {"proposals": [proposal_dict(item) for item in list_proposals(db, status)]}


@app.get("/v1/proposals/{proposal_id}")
def get_proposal_detail(proposal_id: str, db: Session = Depends(get_db)):
    return proposal_dict(get_proposal(db, proposal_id))


@app.get("/v1/proposals/{proposal_id}/related-memories")
def get_related_memories(proposal_id: str, db: Session = Depends(get_db)):
    return {"memories": [memory_dict(item) for item in related_memories(db, proposal_id)]}


@app.post("/v1/proposals/{proposal_id}/approve")
def post_approve(
    proposal_id: str,
    payload: Optional[DecisionRequest] = None,
    db: Session = Depends(get_db),
):
    payload = payload or DecisionRequest()
    return memory_dict(
        approve_proposal(
            db,
            proposal_id,
            payload.actor_id,
            payload.note,
            payload.supersede_memory_id,
            payload.expires_at,
            payload.idempotency_key,
        )
    )


@app.post("/v1/proposals/{proposal_id}/reject")
def post_reject(
    proposal_id: str,
    payload: Optional[DecisionRequest] = None,
    db: Session = Depends(get_db),
):
    payload = payload or DecisionRequest()
    return proposal_dict(reject_proposal(db, proposal_id, payload.actor_id, payload.note, payload.idempotency_key))


@app.get("/v1/sources/{source_id}")
def get_source_detail(source_id: str, db: Session = Depends(get_db)):
    return source_dict(get_source(db, source_id))


@app.get("/v1/events")
def get_recent_events(limit: int = Query(default=50, ge=1, le=100), db: Session = Depends(get_db)):
    return {"events": [event_dict(item) for item in list_recent_events(db, limit)]}


@app.get("/v1/events/{event_id}")
def get_event_detail(event_id: str, db: Session = Depends(get_db)):
    return event_dict(get_event(db, event_id))


@app.get("/v1/memories")
def get_memories(
    actor_id: Optional[str] = Query(default=None),
    project_id: Optional[str] = Query(default=None),
    status: str = Query(default="active"),
    type: Optional[str] = Query(default=None),
    source_id: Optional[str] = Query(default=None),
    created_after: Optional[datetime] = Query(default=None),
    created_before: Optional[datetime] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    return {
        "memories": [
            memory_dict(item)
            for item in list_memories(
                db,
                actor_id=actor_id,
                project_id=project_id,
                status=status,
                type=type,
                source_id=source_id,
                created_after=created_after,
                created_before=created_before,
                limit=limit,
                offset=offset,
            )
        ]
    }


@app.get("/v1/memories/search")
def get_memory_search(
    q: str,
    include_inactive: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    return {
        "memories": [
            memory_dict(memory, score=score)
            for memory, score in search_memories(db, q, include_inactive)
        ]
    }


@app.get("/v1/memories/{memory_id}")
def get_memory_detail(memory_id: str, db: Session = Depends(get_db)):
    return memory_dict(get_memory(db, memory_id))


@app.get("/v1/memories/{memory_id}/explain")
def get_memory_explain(memory_id: str, db: Session = Depends(get_db)):
    return explain_memory(db, memory_id)


@app.post("/v1/memories/{memory_id}/revoke")
def post_revoke(
    memory_id: str,
    payload: Optional[DecisionRequest] = None,
    db: Session = Depends(get_db),
):
    payload = payload or DecisionRequest()
    return memory_dict(revoke_memory(db, memory_id, payload.actor_id, payload.note, payload.idempotency_key))


@app.post("/v1/memories/{memory_id}/feedback")
def post_memory_feedback(memory_id: str, payload: FeedbackRequest, db: Session = Depends(get_db)):
    event = memory_feedback(db, memory_id, payload.feedback, payload.actor_id, payload.note, payload.idempotency_key)
    return event_dict(event)


@app.post("/v1/memories/{memory_id}/expiry")
def post_memory_expiry(memory_id: str, payload: ExpiryRequest, db: Session = Depends(get_db)):
    return memory_dict(set_memory_expiry(db, memory_id, payload.actor_id, payload.note, payload.expires_at, payload.idempotency_key))
