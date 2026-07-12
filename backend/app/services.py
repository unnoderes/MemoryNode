import re
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import or_
from sqlalchemy.orm import Session
from sqlalchemy.sql import text

from .qwen import extract_memory_proposals
from . import models, schemas


def not_found(name: str):
    raise HTTPException(status_code=404, detail=f"{name} not found")


def conflict(message: str):
    raise HTTPException(status_code=409, detail=message)


def bad_request(message: str):
    raise HTTPException(status_code=400, detail=message)


def source_dict(source):
    return {
        "id": source.id,
        "actor_id": source.actor_id,
        "project_id": source.project_id,
        "raw_text": source.raw_text,
        "created_at": utc_datetime(source.created_at),
    }


def proposal_dict(proposal):
    return {
        "id": proposal.id,
        "source_id": proposal.source_id,
        "content": proposal.content,
        "type": proposal.type,
        "confidence": proposal.confidence,
        "source_quote": proposal.source_quote,
        "reason": proposal.reason,
        "status": proposal.status,
        "created_at": utc_datetime(proposal.created_at),
        "decided_at": utc_datetime(proposal.decided_at) if proposal.decided_at is not None else None,
    }


def memory_dict(memory, score: Optional[float] = None):
    data = {
        "id": memory.id,
        "proposal_id": memory.proposal_id,
        "supersedes_memory_id": memory.supersedes_memory_id,
        "content": memory.content,
        "type": memory.type,
        "status": memory.status,
        "expires_at": utc_datetime(memory.expires_at) if memory.expires_at is not None else None,
        "created_at": utc_datetime(memory.created_at),
        "updated_at": utc_datetime(memory.updated_at),
    }
    if score is not None:
        data["score"] = score
    return data


def event_dict(event):
    return {
        "id": event.id,
        "memory_id": event.memory_id,
        "proposal_id": event.proposal_id,
        "event_type": event.event_type,
        "actor_id": event.actor_id,
        "note": event.note,
        "created_at": utc_datetime(event.created_at),
    }


def get_proposal(db: Session, proposal_id: str):
    proposal = db.query(models.MemoryProposal).get(proposal_id)
    if proposal is None:
        not_found("proposal")
    return proposal


def get_memory(db: Session, memory_id: str):
    expire_due_memories(db)
    memory = db.query(models.Memory).get(memory_id)
    if memory is None:
        not_found("memory")
    return memory


def create_proposal(db: Session, payload: schemas.ProposalCreate):
    source_quote = payload.source_quote or payload.content
    source_id = models.new_id("src")
    source = models.MemorySource(
        id=source_id,
        actor_id=payload.actor_id,
        project_id=payload.project_id,
        raw_text=payload.raw_text or source_quote,
    )
    proposal = models.MemoryProposal(
        source_id=source_id,
        content=payload.content,
        type=payload.type,
        confidence=payload.confidence,
        source_quote=source_quote,
        reason=payload.reason,
    )
    db.add_all([source, proposal])
    db.commit()
    db.refresh(proposal)
    return proposal


def raw_text_from_messages(messages: List[schemas.ExtractMessage]) -> str:
    return "\n".join(f"{message.role}: {message.content}" for message in messages)


def model_data(model):
    return model.model_dump() if hasattr(model, "model_dump") else model.dict()


def validate_extracted_proposals(items):
    try:
        return [schemas.ExtractedProposal(**item) for item in items]
    except (TypeError, ValidationError) as exc:
        raise HTTPException(status_code=502, detail="Qwen returned malformed proposals") from exc


def extract_proposals(db: Session, payload: schemas.ProposalExtractRequest):
    if not payload.messages:
        bad_request("messages must not be empty")

    try:
        extracted = extract_memory_proposals(
            actor_id=payload.actor_id,
            project_id=payload.project_id,
            messages=[model_data(message) for message in payload.messages],
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=getattr(exc, "status_code", 502),
            detail=str(exc) or "Qwen extraction failed",
        ) from exc

    proposals = validate_extracted_proposals(extracted)
    source_id = models.new_id("src")
    source = models.MemorySource(
        id=source_id,
        actor_id=payload.actor_id,
        project_id=payload.project_id,
        raw_text=raw_text_from_messages(payload.messages),
    )
    rows = [
        models.MemoryProposal(
            source_id=source_id,
            content=item.content,
            type=item.type,
            confidence=item.confidence,
            source_quote=item.source_quote,
            reason=item.reason,
        )
        for item in proposals
    ]
    db.add(source)
    db.add_all(rows)
    db.commit()
    for proposal in rows:
        db.refresh(proposal)
    return source_id, rows


def list_proposals(db: Session, status: Optional[str] = None):
    query = db.query(models.MemoryProposal).order_by(models.MemoryProposal.created_at.desc())
    if status:
        query = query.filter(models.MemoryProposal.status == status)
    return query.all()


def approve_proposal(
    db: Session,
    proposal_id: str,
    actor_id: str,
    note: Optional[str],
    supersede_memory_id: Optional[str] = None,
    expires_at: Optional[datetime] = None,
):
    expire_due_memories(db)
    validate_expires_at(expires_at)
    proposal = get_proposal(db, proposal_id)
    if proposal.status != "pending":
        conflict("only pending proposals can be approved")

    previous = None
    if supersede_memory_id:
        previous = db.query(models.Memory).get(supersede_memory_id)
        if previous is None or previous.status != "active":
            conflict("supersession target must be an active memory")
        source = db.query(models.MemorySource).get(proposal.source_id)
        previous_proposal = get_proposal(db, previous.proposal_id)
        previous_source = db.query(models.MemorySource).get(previous_proposal.source_id)
        if source is None or previous_source is None:
            not_found("source")
        if (
            source.actor_id != previous_source.actor_id
            or source.project_id != previous_source.project_id
            or proposal.type != previous.type
        ):
            conflict("supersession target must match proposal actor, project, and type")

    proposal.status = "approved"
    proposal.decided_at = models.now()
    memory_id = models.new_id("mem")
    memory = models.Memory(
        id=memory_id,
        proposal_id=proposal.id,
        content=proposal.content,
        type=proposal.type,
        supersedes_memory_id=supersede_memory_id,
        expires_at=expires_at,
    )
    event = models.MemoryEvent(
        memory_id=memory_id,
        proposal_id=proposal.id,
        event_type="approve",
        actor_id=actor_id,
        note=note,
    )
    changes = [memory, event]
    if previous:
        previous.status = "revoked"
        previous.updated_at = models.now()
        changes.extend(
            [
                models.MemoryEvent(
                    memory_id=memory_id,
                    proposal_id=proposal.id,
                    event_type="supersede",
                    actor_id=actor_id,
                    note=note,
                ),
                models.MemoryEvent(
                    memory_id=previous.id,
                    proposal_id=previous.proposal_id,
                    event_type="superseded",
                    actor_id=actor_id,
                    note=note,
                ),
            ]
        )
    db.add_all(changes)
    sync_memory_fts(db, memory_id, memory.content)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(memory)
    return memory


def reject_proposal(db: Session, proposal_id: str, actor_id: str, note: Optional[str]):
    proposal = get_proposal(db, proposal_id)
    if proposal.status != "pending":
        conflict("only pending proposals can be rejected")

    proposal.status = "rejected"
    proposal.decided_at = models.now()
    event = models.MemoryEvent(
        proposal_id=proposal.id,
        event_type="reject",
        actor_id=actor_id,
        note=note,
    )
    db.add(event)
    db.commit()
    db.refresh(proposal)
    return proposal


def sync_memory_fts(db: Session, memory_id: str, content: str):
    db.execute(
        text("INSERT INTO memory_fts(memory_id, content) VALUES (:memory_id, :content)"),
        {"memory_id": memory_id, "content": content},
    )


def fts_query(q: str):
    tokens = re.findall(r"\w+", q)
    if not tokens:
        bad_request("q must not be empty")
    return " ".join(tokens)


def utc_datetime(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def validate_expires_at(expires_at: Optional[datetime]):
    if expires_at is None:
        return
    if expires_at.tzinfo is None or expires_at.utcoffset() is None:
        bad_request("expires_at must include a timezone")
    if expires_at <= models.now():
        bad_request("expires_at must be in the future")


def expire_due_memories(db: Session):
    # ponytail: expires on relevant requests; add a scheduled worker only when prompt expiry is required.
    now = models.now()
    due_memories = [
        memory
        for memory in db.query(models.Memory)
        .filter(
            models.Memory.status == "active",
            models.Memory.expires_at.isnot(None),
        )
        .all()
        if utc_datetime(memory.expires_at) <= now
    ]
    if not due_memories:
        return
    for memory in due_memories:
        memory.status = "expired"
        memory.updated_at = now
        db.add(
            models.MemoryEvent(
                memory_id=memory.id,
                proposal_id=memory.proposal_id,
                event_type="expire",
                actor_id="system",
            )
        )
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise


def memory_is_visible(memory, now):
    if memory.status != "active":
        return False
    if memory.expires_at is None:
        return True
    return utc_datetime(memory.expires_at) > now


def search_memories(db: Session, q: str, include_inactive: bool = False):
    expire_due_memories(db)
    rows = db.execute(
        text(
            "SELECT memory_id, bm25(memory_fts) AS score "
            "FROM memory_fts WHERE memory_fts MATCH :q ORDER BY score"
        ),
        {"q": fts_query(q)},
    ).fetchall()
    results = []
    now = models.now()
    for memory_id, score in rows:
        memory = db.query(models.Memory).get(memory_id)
        if memory is None:
            continue
        is_visible = memory_is_visible(memory, now)
        if include_inactive or is_visible:
            results.append((memory, score))
    return results


def related_memories(db: Session, proposal_id: str):
    expire_due_memories(db)
    proposal = get_proposal(db, proposal_id)
    source = db.query(models.MemorySource).get(proposal.source_id)
    if source is None:
        not_found("source")
    # ponytail: scans active project memories; add ranked retrieval only when memory volume needs it.
    return (
        db.query(models.Memory)
        .join(models.MemoryProposal, models.Memory.proposal_id == models.MemoryProposal.id)
        .join(models.MemorySource, models.MemoryProposal.source_id == models.MemorySource.id)
        .filter(
            models.Memory.status == "active",
            models.Memory.type == proposal.type,
            models.MemorySource.actor_id == source.actor_id,
            models.MemorySource.project_id == source.project_id,
        )
        .order_by(models.Memory.created_at.desc())
        .all()
    )


def revoke_memory(db: Session, memory_id: str, actor_id: str, note: Optional[str]):
    memory = get_memory(db, memory_id)
    if memory.status != "active":
        conflict("only active memories can be revoked")

    memory.status = "revoked"
    memory.updated_at = models.now()
    event = models.MemoryEvent(
        memory_id=memory.id,
        proposal_id=memory.proposal_id,
        event_type="revoke",
        actor_id=actor_id,
        note=note,
    )
    db.add(event)
    db.commit()
    db.refresh(memory)
    return memory


def explain_memory(db: Session, memory_id: str):
    memory = get_memory(db, memory_id)
    proposal = get_proposal(db, memory.proposal_id)
    source = db.query(models.MemorySource).get(proposal.source_id)
    if source is None:
        not_found("source")
    events = (
        db.query(models.MemoryEvent)
        .filter(
            or_(
                models.MemoryEvent.memory_id == memory.id,
                models.MemoryEvent.proposal_id == proposal.id,
            )
        )
        .order_by(models.MemoryEvent.created_at.asc())
        .all()
    )
    supersedes = (
        db.query(models.Memory).get(memory.supersedes_memory_id)
        if memory.supersedes_memory_id
        else None
    )
    superseded_by = (
        db.query(models.Memory)
        .filter(models.Memory.supersedes_memory_id == memory.id)
        .first()
    )
    return {
        "source": source_dict(source),
        "proposal": proposal_dict(proposal),
        "memory": memory_dict(memory),
        "events": [event_dict(event) for event in events],
        "supersedes": memory_dict(supersedes) if supersedes else None,
        "superseded_by": memory_dict(superseded_by) if superseded_by else None,
    }
