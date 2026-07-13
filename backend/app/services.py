import hashlib
import json
import re
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError
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


def _normalized_key(idempotency_key: Optional[str]) -> Optional[str]:
    if idempotency_key is None:
        return None
    value = idempotency_key.strip()
    if not value or len(value) > 128 or any(ord(char) < 32 or ord(char) == 127 for char in value):
        bad_request("idempotency_key must be 1-128 characters without control characters")
    return value


def _idempotent_event_id(idempotency_key: Optional[str]) -> Optional[str]:
    value = _normalized_key(idempotency_key)
    if value is None:
        return None
    return f"event_idem_{hashlib.sha256(value.encode('utf-8')).hexdigest()}"


def _fingerprint(payload: dict) -> str:
    def clean(value):
        if isinstance(value, datetime):
            return utc_datetime(value).isoformat()
        if isinstance(value, dict):
            return {key: clean(value[key]) for key in sorted(value)}
        if isinstance(value, (list, tuple)):
            return [clean(item) for item in value]
        return value
    canonical = json.dumps(clean(payload), sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _event_id_kwargs(idempotency_key: Optional[str], request_fingerprint: Optional[str]):
    key = _normalized_key(idempotency_key)
    if key is None:
        return {}
    return {
        "id": _idempotent_event_id(key),
        "idempotency_key": key,
        "request_fingerprint": request_fingerprint,
    }


def _receipt(db: Session, idempotency_key: Optional[str]):
    key = _normalized_key(idempotency_key)
    if key is None:
        return (None, None)
    event = db.query(models.MemoryEvent).filter(models.MemoryEvent.idempotency_key == key).first()
    if event is None:
        event = db.query(models.MemoryEvent).get(_idempotent_event_id(key))
    return (key, event)


def _check_receipt(event, event_type: str, *, proposal_id: Optional[str] = None, memory_id: Optional[str] = None, supersede_memory_id: Optional[str] = None):
    if event.event_type != event_type:
        conflict("idempotency key conflicts with a different action")
    if proposal_id is not None and event.proposal_id != proposal_id:
        conflict("idempotency key conflicts with a different proposal")
    if memory_id is not None and event.memory_id != memory_id:
        conflict("idempotency key conflicts with a different memory")
    if event_type == "approve" and proposal_id is not None:
        memory = event.memory_id and event._sa_instance_state.session.query(models.Memory).get(event.memory_id)
        if memory is not None and memory.supersedes_memory_id != supersede_memory_id:
            conflict("idempotency key conflicts with a different supersession target")


def _read_receipt(db: Session, idempotency_key: Optional[str], event_type: str, *, request_fingerprint: Optional[str] = None, **target):
    _, event = _receipt(db, idempotency_key)
    if event is None:
        return None
    if event.request_fingerprint is not None and request_fingerprint is not None and event.request_fingerprint != request_fingerprint:
        conflict("idempotency key conflicts with a different payload")
    _check_receipt(event, event_type, **target)
    return event


def get_proposal(db: Session, proposal_id: str):
    proposal = db.query(models.MemoryProposal).get(proposal_id)
    if proposal is None:
        not_found("proposal")
    return proposal


def get_source(db: Session, source_id: str):
    source = db.query(models.MemorySource).get(source_id)
    if source is None:
        not_found("source")
    return source


def get_event(db: Session, event_id: str):
    event = db.query(models.MemoryEvent).get(event_id)
    if event is None:
        not_found("event")
    return event


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
    db.add(source)
    db.flush()
    db.add(proposal)
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
    db.flush()
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


def list_recent_events(db: Session, limit: int = 50):
    return db.query(models.MemoryEvent).order_by(models.MemoryEvent.created_at.desc()).limit(limit).all()


def validate_datetime_filter(value: Optional[datetime], name: str):
    if value is None:
        return None
    if value.tzinfo is None or value.utcoffset() is None:
        bad_request(f"{name} must include a timezone")
    return value


def list_memories(
    db: Session,
    *,
    actor_id: Optional[str] = None,
    project_id: Optional[str] = None,
    status: str = "active",
    type: Optional[str] = None,
    source_id: Optional[str] = None,
    created_after: Optional[datetime] = None,
    created_before: Optional[datetime] = None,
    limit: int = 50,
    offset: int = 0,
):
    expire_due_memories(db)
    created_after = validate_datetime_filter(created_after, "created_after")
    created_before = validate_datetime_filter(created_before, "created_before")
    query = (
        db.query(models.Memory)
        .join(models.MemoryProposal, models.Memory.proposal_id == models.MemoryProposal.id)
        .join(models.MemorySource, models.MemoryProposal.source_id == models.MemorySource.id)
    )
    if status:
        query = query.filter(models.Memory.status == status)
    if type:
        query = query.filter(models.Memory.type == type)
    if source_id:
        query = query.filter(models.MemoryProposal.source_id == source_id)
    if actor_id:
        query = query.filter(models.MemorySource.actor_id == actor_id)
    if project_id:
        query = query.filter(models.MemorySource.project_id == project_id)
    if created_after:
        query = query.filter(models.Memory.created_at >= created_after)
    if created_before:
        query = query.filter(models.Memory.created_at <= created_before)
    return query.order_by(models.Memory.created_at.desc()).offset(offset).limit(limit).all()


def approve_proposal(
    db: Session,
    proposal_id: str,
    actor_id: str,
    note: Optional[str],
    supersede_memory_id: Optional[str] = None,
    expires_at: Optional[datetime] = None,
    idempotency_key: Optional[str] = None,
):
    expire_due_memories(db)
    validate_expires_at(expires_at)
    request_fingerprint = _fingerprint({
        "action": "approve",
        "targets": {"proposal_id": proposal_id, "supersede_memory_id": supersede_memory_id},
        "actor_id": actor_id,
        "note": note,
        "expires_at": expires_at,
    })
    receipt = _read_receipt(
        db,
        idempotency_key,
        "approve",
        request_fingerprint=request_fingerprint,
        proposal_id=proposal_id,
        supersede_memory_id=supersede_memory_id,
    )
    if receipt is not None:
        memory = db.query(models.Memory).get(receipt.memory_id)
        if memory is None:
            not_found("memory")
        return memory
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
        **_event_id_kwargs(idempotency_key, request_fingerprint),
        memory_id=memory_id,
        proposal_id=proposal.id,
        event_type="approve",
        actor_id=actor_id,
        note=note,
    )
    db.add(memory)
    db.flush()
    changes = [event]
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
    except IntegrityError:
        db.rollback()
        receipt = _read_receipt(
            db,
            idempotency_key,
            "approve",
            request_fingerprint=request_fingerprint,
            proposal_id=proposal_id,
            supersede_memory_id=supersede_memory_id,
        )
        if receipt is None:
            raise
        return db.query(models.Memory).get(receipt.memory_id)
    except Exception:
        db.rollback()
        raise
    db.refresh(memory)
    return memory


def reject_proposal(db: Session, proposal_id: str, actor_id: str, note: Optional[str], idempotency_key: Optional[str] = None):
    request_fingerprint = _fingerprint({
        "action": "reject",
        "targets": {"proposal_id": proposal_id},
        "actor_id": actor_id,
        "note": note,
    })
    receipt = _read_receipt(db, idempotency_key, "reject", request_fingerprint=request_fingerprint, proposal_id=proposal_id)
    if receipt is not None:
        return get_proposal(db, proposal_id)
    proposal = get_proposal(db, proposal_id)
    if proposal.status != "pending":
        conflict("only pending proposals can be rejected")

    proposal.status = "rejected"
    proposal.decided_at = models.now()
    event = models.MemoryEvent(
        **_event_id_kwargs(idempotency_key, request_fingerprint),
        proposal_id=proposal.id,
        event_type="reject",
        actor_id=actor_id,
        note=note,
    )
    db.add(event)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        if _read_receipt(db, idempotency_key, "reject", request_fingerprint=request_fingerprint, proposal_id=proposal_id) is None:
            raise
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


def revoke_memory(db: Session, memory_id: str, actor_id: str, note: Optional[str], idempotency_key: Optional[str] = None):
    request_fingerprint = _fingerprint({
        "action": "revoke",
        "targets": {"memory_id": memory_id},
        "actor_id": actor_id,
        "note": note,
    })
    receipt = _read_receipt(db, idempotency_key, "revoke", request_fingerprint=request_fingerprint, memory_id=memory_id)
    if receipt is not None:
        return db.query(models.Memory).get(memory_id)
    memory = get_memory(db, memory_id)
    if memory.status != "active":
        conflict("only active memories can be revoked")

    memory.status = "revoked"
    memory.updated_at = models.now()
    event = models.MemoryEvent(
        **_event_id_kwargs(idempotency_key, request_fingerprint),
        memory_id=memory.id,
        proposal_id=memory.proposal_id,
        event_type="revoke",
        actor_id=actor_id,
        note=note,
    )
    db.add(event)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        if _read_receipt(db, idempotency_key, "revoke", request_fingerprint=request_fingerprint, memory_id=memory_id) is None:
            raise
    db.refresh(memory)
    return memory


def memory_feedback(db: Session, memory_id: str, feedback: str, actor_id: str, note: Optional[str] = None, idempotency_key: Optional[str] = None):
    event_type = f"feedback_{feedback}"
    request_fingerprint = _fingerprint({
        "action": "feedback",
        "targets": {"memory_id": memory_id},
        "feedback": feedback,
        "actor_id": actor_id,
        "note": note,
    })
    receipt = _read_receipt(db, idempotency_key, event_type, request_fingerprint=request_fingerprint, memory_id=memory_id)
    if receipt is not None:
        return receipt
    memory = db.query(models.Memory).get(memory_id)
    if memory is None:
        not_found("memory")
    event = models.MemoryEvent(
        **_event_id_kwargs(idempotency_key, request_fingerprint),
        memory_id=memory.id,
        proposal_id=memory.proposal_id,
        event_type=event_type,
        actor_id=actor_id,
        note=note,
    )
    db.add(event)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        receipt = _read_receipt(db, idempotency_key, event_type, request_fingerprint=request_fingerprint, memory_id=memory_id)
        if receipt is None:
            raise
        return receipt
    db.refresh(event)
    return event


def set_memory_expiry(db: Session, memory_id: str, actor_id: str, note: str, expires_at: datetime, idempotency_key: Optional[str] = None):
    validate_expires_at(expires_at)
    request_fingerprint = _fingerprint({
        "action": "set_expiry",
        "targets": {"memory_id": memory_id},
        "actor_id": actor_id,
        "note": note,
        "expires_at": expires_at,
    })
    receipt = _read_receipt(db, idempotency_key, "set_expiry", request_fingerprint=request_fingerprint, memory_id=memory_id)
    if receipt is not None:
        memory = db.query(models.Memory).get(memory_id)
        if memory is None:
            not_found("memory")
        return memory
    memory = get_memory(db, memory_id)
    if memory.status != "active":
        conflict("only active memories can have expiry set")
    memory.expires_at = expires_at
    memory.updated_at = models.now()
    event = models.MemoryEvent(
        **_event_id_kwargs(idempotency_key, request_fingerprint),
        memory_id=memory.id,
        proposal_id=memory.proposal_id,
        event_type="set_expiry",
        actor_id=actor_id,
        note=note,
    )
    db.add(event)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        receipt = _read_receipt(db, idempotency_key, "set_expiry", request_fingerprint=request_fingerprint, memory_id=memory_id)
        if receipt is None:
            raise
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
