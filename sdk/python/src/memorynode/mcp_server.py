from __future__ import annotations

import json
import os
import sys
import time
from functools import wraps
from uuid import uuid4

from mcp.server.fastmcp import FastMCP
from mcp.server.fastmcp.exceptions import ToolError

from .client import MemoryNodeClient
from .config import Paths, load_governance_policy
from .errors import MemoryNodeError


VERSION = "0.4.3"
JSON_MIME = "application/json"
INSTRUCTIONS = (
    "New information must be submitted with memory_propose; proposals are pending until reviewed. "
    "Search or list memories before answering when durable facts matter, and use memory_explain when "
    "evidence is insufficient. Respect revoked, expired, and superseded memory states. Related memories "
    "are reviewer candidates, not automatic conflict decisions. Feedback records an audit event and does "
    "not change memory state. High-risk governance tools appear only when a local administrator explicitly "
    "enables them in config.toml."
)


def _api_url():
    return os.getenv("MEMORYNODE_API_URL", "http://127.0.0.1:8000")


def _json(data):
    return json.dumps(data, ensure_ascii=False, separators=(",", ":"))


def _required(value: str, name: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ToolError(f"{name} must not be empty")
    return value


def _key(value: str) -> str:
    value = _required(value, "idempotency_key").strip()
    if len(value) > 128 or any(ord(char) < 32 or ord(char) == 127 for char in value):
        raise ToolError("idempotency_key must be 1-128 characters without control characters")
    return value


def _confirm(value: bool):
    if value is not True:
        raise ToolError("confirm must be true")


def _call(operation):
    try:
        with MemoryNodeClient(base_url=_api_url()) as client:
            result = operation(client)
            return result.dump() if hasattr(result, "dump") else result
    except MemoryNodeError as exc:
        raise ToolError(str(exc)) from None


def _trace(kind, name, operation):
    request_id = uuid4().hex
    started = time.perf_counter()
    outcome, category = "success", None
    try:
        return operation()
    except ToolError as exc:
        outcome = "denied" if "must" in str(exc) or "confirm" in str(exc) or "not enabled" in str(exc) else "error"
        category = "validation" if outcome == "denied" else "tool"
        raise
    except Exception as exc:
        outcome, category = "error", exc.__class__.__name__
        raise
    finally:
        _write_trace({
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "request_id": request_id,
            "capability": name,
            "kind": kind,
            "duration_ms": round((time.perf_counter() - started) * 1000, 3),
            "outcome": outcome,
            **({"error_category": category} if category else {}),
        })


def _write_trace(item):
    try:
        paths = Paths.current()
        paths.logs.mkdir(parents=True, exist_ok=True)
        with (paths.logs / "mcp.log").open("a", encoding="utf-8") as stream:
            stream.write(json.dumps(item, separators=(",", ":")) + "\n")
    except Exception:
        print("WARN: MCP trace write failed", file=sys.stderr)


def _tool(name):
    def outer(func):
        @wraps(func)
        def inner(*args, **kwargs):
            return _trace("tool", name, lambda: func(*args, **kwargs))
        return inner
    return outer


def _resource(name):
    def outer(func):
        @wraps(func)
        def inner(*args, **kwargs):
            return _trace("resource", name, lambda: func(*args, **kwargs))
        return inner
    return outer


def _policy():
    return load_governance_policy()


def _governance_allowed(flag: str):
    if not getattr(_policy(), flag):
        raise ToolError(f"{flag} is not enabled in config.toml")


def _restricted(flag: str, actor_id: str, reason: str, idempotency_key: str, confirm: bool):
    _governance_allowed(flag)
    _required(actor_id, "actor_id")
    _required(reason, "reason")
    _key(idempotency_key)
    _confirm(confirm)


@_tool("memory_propose")
def memory_propose(content: str, actor_id: str, project_id: str) -> dict:
    """Create pending memory proposals from content; never approves them."""
    return _call(lambda client: client.proposals.extract(
        actor_id=_required(actor_id, "actor_id"),
        project_id=_required(project_id, "project_id"),
        content=_required(content, "content"),
    ))


@_tool("memory_search")
def memory_search(query: str) -> dict:
    """Search currently effective memories; an empty result is successful."""
    return _call(lambda client: client.memories.search(_required(query, "query")))


@_tool("memory_get")
def memory_get(memory_id: str) -> dict:
    """Get one memory by ID, preserving its current lifecycle status."""
    return _call(lambda client: client.memories.get(_required(memory_id, "memory_id")))


@_tool("memory_explain")
def memory_explain(memory_id: str) -> dict:
    """Return source, proposal, memory, events, and replacement relationships."""
    return _call(lambda client: client.memories.explain(_required(memory_id, "memory_id")))


@_tool("memory_list")
def memory_list(
    actor_id: str | None = None,
    project_id: str | None = None,
    status: str = "active",
    type: str | None = None,
    source_id: str | None = None,
    created_after: str | None = None,
    created_before: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict:
    """List memories with explicit filters; defaults to active, non-expired memories."""
    return _call(lambda client: client.memories.list(
        actor_id=actor_id,
        project_id=project_id,
        status=status,
        type=type,
        source_id=source_id,
        created_after=created_after,
        created_before=created_before,
        limit=limit,
        offset=offset,
    ))


@_tool("memory_feedback")
def memory_feedback(memory_id: str, feedback: str, actor_id: str, note: str | None = None, idempotency_key: str | None = None) -> dict:
    """Record useful/not_useful/possibly_stale feedback without changing memory state."""
    event = _call(lambda client: client.memories.feedback(
        _required(memory_id, "memory_id"),
        feedback=_required(feedback, "feedback"),
        actor_id=_required(actor_id, "actor_id"),
        note=note,
        idempotency_key=idempotency_key,
    ))
    return {"event": event, "memory_status_changed": False}


@_tool("proposal_approve")
def proposal_approve(proposal_id: str, actor_id: str, reason: str, idempotency_key: str, confirm: bool, expires_at: str | None = None) -> dict:
    """Governance tool: approve one pending proposal when explicitly enabled."""
    _restricted("allow_agent_approval", actor_id, reason, idempotency_key, confirm)
    return _call(lambda client: client.proposals.approve(
        _required(proposal_id, "proposal_id"),
        actor_id=actor_id,
        note=reason,
        expires_at=expires_at,
        idempotency_key=idempotency_key,
    ))


@_tool("proposal_reject")
def proposal_reject(proposal_id: str, actor_id: str, reason: str, idempotency_key: str, confirm: bool) -> dict:
    """Governance tool: reject one pending proposal when explicitly enabled."""
    _restricted("allow_agent_reject", actor_id, reason, idempotency_key, confirm)
    return _call(lambda client: client.proposals.reject(
        _required(proposal_id, "proposal_id"),
        actor_id=actor_id,
        note=reason,
        idempotency_key=idempotency_key,
    ))


@_tool("memory_revoke")
def memory_revoke(memory_id: str, actor_id: str, reason: str, idempotency_key: str, confirm: bool) -> dict:
    """Governance tool: revoke one active memory when explicitly enabled."""
    _restricted("allow_agent_revoke", actor_id, reason, idempotency_key, confirm)
    return _call(lambda client: client.memories.revoke(
        _required(memory_id, "memory_id"),
        actor_id=actor_id,
        note=reason,
        idempotency_key=idempotency_key,
    ))


@_tool("memory_supersede")
def memory_supersede(proposal_id: str, supersede_memory_id: str, actor_id: str, reason: str, idempotency_key: str, confirm: bool, expires_at: str | None = None) -> dict:
    """Governance tool: approve a proposal as a supervised replacement."""
    _restricted("allow_agent_supersede", actor_id, reason, idempotency_key, confirm)
    return _call(lambda client: client.proposals.approve(
        _required(proposal_id, "proposal_id"),
        actor_id=actor_id,
        note=reason,
        supersede_memory_id=_required(supersede_memory_id, "supersede_memory_id"),
        expires_at=expires_at,
        idempotency_key=idempotency_key,
    ))


@_tool("memory_set_expiry")
def memory_set_expiry(memory_id: str, actor_id: str, reason: str, expires_at: str, idempotency_key: str, confirm: bool) -> dict:
    """Governance tool: set a future expiry on one active memory."""
    _restricted("allow_agent_set_expiry", actor_id, reason, idempotency_key, confirm)
    return _call(lambda client: client.memories.set_expiry(
        _required(memory_id, "memory_id"),
        actor_id=actor_id,
        note=reason,
        expires_at=_required(expires_at, "expires_at"),
        idempotency_key=idempotency_key,
    ))


@_resource("memorynode://memories/{memory_id}")
def memory_resource(memory_id: str) -> str:
    return _json(_call(lambda client: client.memories.explain(_required(memory_id, "memory_id"))))


@_resource("memorynode://proposals/{proposal_id}")
def proposal_resource(proposal_id: str) -> str:
    return _json(_call(lambda client: client.proposals.get(_required(proposal_id, "proposal_id"))))


@_resource("memorynode://sources/{source_id}")
def source_resource(source_id: str) -> str:
    return _json(_call(lambda client: client.sources.get(_required(source_id, "source_id"))))


@_resource("memorynode://events/{event_id}")
def event_resource(event_id: str) -> str:
    return _json(_call(lambda client: client.events.get(_required(event_id, "event_id"))))


@_resource("memorynode://audit/recent")
def audit_recent_resource() -> str:
    return _json(_call(lambda client: client.events.list_recent(50)))


@_resource("memorynode://status")
def status_resource() -> str:
    policy = _policy()
    return _json({
        "health": _call(lambda client: client.status.check()),
        "mcp_version": VERSION,
        "enabled_governance": {
            "proposal_approve": policy.allow_agent_approval,
            "proposal_reject": policy.allow_agent_reject,
            "memory_revoke": policy.allow_agent_revoke,
            "memory_supersede": policy.allow_agent_supersede,
            "memory_set_expiry": policy.allow_agent_set_expiry,
        },
    })


@_resource("memorynode://schema")
def schema_resource() -> str:
    return _json({
        "default_tools": ["memory_propose", "memory_search", "memory_get", "memory_explain", "memory_list", "memory_feedback"],
        "governance_tools": ["proposal_approve", "proposal_reject", "memory_revoke", "memory_supersede", "memory_set_expiry"],
        "resources": [
            "memorynode://memories/{memory_id}",
            "memorynode://proposals/{proposal_id}",
            "memorynode://sources/{source_id}",
            "memorynode://events/{event_id}",
            "memorynode://audit/recent",
            "memorynode://status",
            "memorynode://schema",
        ],
        "semantics": {
            "propose": "creates pending proposals only",
            "related_memories": "reviewer candidates, not automatic conflict decisions",
            "expiry": "request-driven; no scheduler",
            "feedback": "writes an audit event and does not change memory status",
        },
    })


def build_mcp(policy=None):
    policy = policy or _policy()
    server = FastMCP("MemoryNode", instructions=INSTRUCTIONS, log_level="WARNING")
    for function in (memory_propose, memory_search, memory_get, memory_explain, memory_list, memory_feedback):
        server.tool()(function)
    if policy.allow_agent_approval:
        server.tool()(proposal_approve)
    if policy.allow_agent_reject:
        server.tool()(proposal_reject)
    if policy.allow_agent_revoke:
        server.tool()(memory_revoke)
    if policy.allow_agent_supersede:
        server.tool()(memory_supersede)
    if policy.allow_agent_set_expiry:
        server.tool()(memory_set_expiry)
    for uri, function in (
        ("memorynode://memories/{memory_id}", memory_resource),
        ("memorynode://proposals/{proposal_id}", proposal_resource),
        ("memorynode://sources/{source_id}", source_resource),
        ("memorynode://events/{event_id}", event_resource),
        ("memorynode://audit/recent", audit_recent_resource),
        ("memorynode://status", status_resource),
        ("memorynode://schema", schema_resource),
    ):
        server.resource(uri, mime_type=JSON_MIME)(function)
    return server


mcp = build_mcp()


def main():
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
