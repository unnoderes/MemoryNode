from datetime import datetime, timezone
import json

import httpx
import pytest

from memorynode import *


NOW = "2026-07-12T10:00:00+00:00"


def proposal(**changes):
    value = {"id": "proposal_1", "source_id": "src_1", "content": "text", "type": "fact", "confidence": .9, "source_quote": "text", "reason": None, "status": "pending", "created_at": NOW, "decided_at": None}
    value.update(changes); return value


def memory(**changes):
    value = {"id": "mem_1", "proposal_id": "proposal_1", "supersedes_memory_id": None, "content": "text", "type": "fact", "status": "active", "expires_at": None, "created_at": NOW, "updated_at": NOW}
    value.update(changes); return value


def source(**changes):
    value = {"id": "src_1", "actor_id": "a", "project_id": "p", "raw_text": "text", "created_at": NOW}
    value.update(changes); return value


def event(**changes):
    value = {"id": "evt_1", "memory_id": "mem_1", "proposal_id": "proposal_1", "event_type": "approve", "actor_id": "reviewer", "note": None, "created_at": NOW}
    value.update(changes); return value


def explanation():
    return {"source": source(), "proposal": proposal(), "memory": memory(), "events": [event()], "supersedes": None, "superseded_by": None}


def response(path, method="GET"):
    if path == "/health": return {"ok": True, "service": "memorynode"}
    if path.endswith("/extract"): return {"source_id": "src_1", "proposals": [proposal()]}
    if path.endswith("/related-memories") or path.endswith("/search") or path == "/v1/memories": return {"memories": [memory(score=-1.2)]}
    if path.endswith("/explain"): return explanation()
    if path.startswith("/v1/sources/"): return source()
    if path == "/v1/events": return {"events": [event()]}
    if path.startswith("/v1/events/"): return event()
    if path.endswith("/feedback"): return event(event_type="feedback_useful")
    if path == "/v1/proposals": return {"proposals": [proposal()]} if method == "GET" else proposal()
    if "/proposals/" in path and path.endswith("/approve"): return memory()
    if "/proposals/" in path and path.endswith("/reject"): return proposal(status="rejected", decided_at=NOW)
    if path.startswith("/v1/proposals"): return proposal()
    return memory(status="revoked" if path.endswith("/revoke") else "active")


def test_all_resource_shapes_types_paths_timeout_and_request_id():
    requests = []
    def handler(request): requests.append(request); return httpx.Response(200, json=response(request.url.path, request.method))
    with MemoryNodeClient(timeout=7, transport=httpx.MockTransport(handler)) as api:
        assert isinstance(api.status.check(request_id="safe-1", timeout=2), Health)
        assert isinstance(api.proposals.create("text", raw_text="raw"), Proposal)
        assert isinstance(api.proposals.extract(actor_id="a", project_id="p", content="中文"), ProposalExtraction)
        assert isinstance(api.proposals.extract(actor_id="a", project_id="p", messages=[{"role": "system", "content": "one"}, {"role": "user", "content": "two"}]), ProposalExtraction)
        assert isinstance(api.proposals.list("pending"), ProposalList)
        assert isinstance(api.proposals.get("proposal_1"), Proposal)
        assert isinstance(api.proposals.related_memories("proposal/中文"), MemoryList)
        assert isinstance(api.proposals.approve("proposal/中文", note="ok", supersede_memory_id="mem_0", expires_at=datetime(2099, 1, 1, tzinfo=timezone.utc), idempotency_key="approve-key"), Memory)
        assert isinstance(api.proposals.reject("proposal_2", note="no", idempotency_key="reject-key"), Proposal)
        assert isinstance(api.sources.get("src_1"), Source)
        assert isinstance(api.events.get("evt_1"), MemoryEvent)
        assert isinstance(api.events.list_recent(), MemoryEventList)
        assert isinstance(api.memories.search("中文 preference", include_inactive=True), MemoryList)
        assert isinstance(api.memories.list(actor_id="a", limit=10), MemoryList)
        assert isinstance(api.memories.get("mem/中文"), Memory)
        assert isinstance(api.memories.explain("mem/中文"), MemoryExplanation)
        assert isinstance(api.memories.revoke("mem/中文", note="bad", idempotency_key="revoke-key"), Memory)
        assert isinstance(api.memories.feedback("mem_1", feedback="useful", actor_id="agent", idempotency_key="feedback-key"), MemoryEvent)
        assert isinstance(api.memories.set_expiry("mem_1", actor_id="reviewer", note="why", expires_at=datetime(2099, 1, 1, tzinfo=timezone.utc), idempotency_key="expiry-key"), Memory)
    assert requests[0].headers["X-Request-ID"] == "safe-1"
    assert set(requests[0].extensions["timeout"].values()) == {2}
    assert set(requests[1].extensions["timeout"].values()) == {7}
    assert len(requests[1].headers["X-Request-ID"]) == 32
    assert requests[6].url.raw_path.startswith(b"/v1/proposals/proposal%2F")
    assert dict(requests[12].url.params) == {"q": "中文 preference", "include_inactive": "true"}
    assert json.loads(requests[2].content)["messages"] == [{"role": "user", "content": "中文"}]
    assert json.loads(requests[3].content)["messages"][0]["role"] == "system"
    assert json.loads(requests[7].content)["expires_at"].endswith("+00:00")
    assert json.loads(requests[7].content)["idempotency_key"] == "approve-key"


def test_extract_requires_exactly_one_input_without_request():
    called = False
    def handler(_): nonlocal called; called = True
    with MemoryNodeClient(transport=httpx.MockTransport(handler)) as api:
        with pytest.raises(ValueError): api.proposals.extract(actor_id="a", project_id="p")
        with pytest.raises(ValueError): api.proposals.extract(actor_id="a", project_id="p", content="x", messages=[])
    assert not called


@pytest.mark.parametrize("status,error", [(400, MemoryNodeValidationError), (422, MemoryNodeValidationError), (404, MemoryNodeNotFoundError), (409, MemoryNodeConflictError), (418, MemoryNodeHTTPError), (500, MemoryNodeServerError), (502, MemoryNodeServerError)])
def test_http_errors_are_typed_sanitized(status, error):
    with MemoryNodeClient(transport=httpx.MockTransport(lambda _: httpx.Response(status, json={"detail": "traceback API_KEY=secret"}))) as api:
        with pytest.raises(error) as caught: api.status.check(request_id="error-1")
    assert caught.value.request_id == "error-1" and caught.value.status_code == status
    assert "secret" not in str(caught.value)


def test_connection_timeout_invalid_response_and_request_id():
    def unavailable(request): raise httpx.ConnectError("secret", request=request)
    with MemoryNodeClient(transport=httpx.MockTransport(unavailable)) as api:
        with pytest.raises(MemoryNodeConnectionError) as caught: api.status.check()
    assert caught.value.request_id
    def timeout(request): raise httpx.ReadTimeout("secret", request=request)
    with MemoryNodeClient(transport=httpx.MockTransport(timeout)) as api:
        with pytest.raises(MemoryNodeTimeoutError) as caught: api.status.check()
    assert caught.value.request_id
    for body in (b"not-json", b'{"ok":true}'):
        with MemoryNodeClient(transport=httpx.MockTransport(lambda _: httpx.Response(200, content=body))) as api:
            with pytest.raises(MemoryNodeResponseError): api.status.check()
    with MemoryNodeClient(transport=httpx.MockTransport(lambda _: pytest.fail("sent"))) as api:
        for value in ("", "has space", "line\nbreak", "x" * 129):
            with pytest.raises(ValueError): api.status.check(request_id=value)


def test_models_datetime_optional_score_relations_unknown_and_legacy_dicts():
    parsed = MemoryExplanation.model_validate({**explanation(), "future": 1, "supersedes": memory(id="mem_old")})
    assert parsed.memory.score is None and parsed.supersedes.id == "mem_old"
    assert parsed.source.created_at.tzinfo and parsed.model_extra == {"future": 1}
    assert isinstance(parsed.dump()["source"]["created_at"], str)
    assert "score" not in parsed.dump()["memory"]
    with pytest.raises(Exception): Memory.model_validate(memory(created_at="2026-01-01T00:00:00"))
    with pytest.raises(Exception): Memory.model_validate({"id": "missing"})
    def handler(request): return httpx.Response(200, json=response(request.url.path))
    with MemoryNodeClient(transport=httpx.MockTransport(handler)) as api:
        assert all(isinstance(item, dict) for item in (api.health(), api.extract_proposals("a", "p", "x"), api.search_memories("x"), api.explain_memory("mem_1")))
