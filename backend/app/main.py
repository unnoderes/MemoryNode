from contextlib import asynccontextmanager
from typing import Optional

from fastapi import Depends, FastAPI, Query
from sqlalchemy.orm import Session

from .db import get_db, init_db
from .schemas import DecisionRequest, ProposalCreate, ProposalExtractRequest
from .services import (
    approve_proposal,
    create_proposal,
    explain_memory,
    extract_proposals,
    get_memory,
    list_proposals,
    memory_dict,
    proposal_dict,
    reject_proposal,
    revoke_memory,
    search_memories,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="MemoryNode", lifespan=lifespan)


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


@app.post("/v1/proposals/{proposal_id}/approve")
def post_approve(
    proposal_id: str,
    payload: Optional[DecisionRequest] = None,
    db: Session = Depends(get_db),
):
    payload = payload or DecisionRequest()
    return memory_dict(approve_proposal(db, proposal_id, payload.actor_id, payload.note))


@app.post("/v1/proposals/{proposal_id}/reject")
def post_reject(
    proposal_id: str,
    payload: Optional[DecisionRequest] = None,
    db: Session = Depends(get_db),
):
    payload = payload or DecisionRequest()
    return proposal_dict(reject_proposal(db, proposal_id, payload.actor_id, payload.note))


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
    return memory_dict(revoke_memory(db, memory_id, payload.actor_id, payload.note))
