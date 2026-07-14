from datetime import timedelta

from fastapi.testclient import TestClient
import pytest

from app.main import app, console_origin
from app import models
from app.db import session_local


def create(client, content, **changes):
    payload = {
        "actor_id": "phase4",
        "project_id": "mcp",
        "content": content,
        "type": "fact",
    }
    payload.update(changes)
    response = client.post("/v1/proposals", json=payload)
    assert response.status_code == 200
    return response.json()


def test_cors_allows_only_configured_console_origin(monkeypatch):
    with TestClient(app) as client:
        allowed = client.options("/health", headers={"Origin": "http://127.0.0.1:3000", "Access-Control-Request-Method": "GET"})
        denied = client.options("/health", headers={"Origin": "http://127.0.0.1:3001", "Access-Control-Request-Method": "GET"})
    assert allowed.headers["access-control-allow-origin"] == "http://127.0.0.1:3000"
    assert "access-control-allow-origin" not in denied.headers
    monkeypatch.setenv("MEMORYNODE_CONSOLE_ORIGIN", "http://0.0.0.0:3000")
    with pytest.raises(RuntimeError, match="127.0.0.1"):
        console_origin()


def approve(client, proposal, **payload):
    response = client.post(f"/v1/proposals/{proposal['id']}/approve", json=payload)
    assert response.status_code == 200
    return response.json()


def event_count():
    db = session_local()
    try:
        return db.query(models.MemoryEvent).count()
    finally:
        db.close()


def set_expired(memory_id):
    db = session_local()
    try:
        row = db.query(models.Memory).get(memory_id)
        row.expires_at = models.now() - timedelta(seconds=1)
        db.commit()
    finally:
        db.close()


def test_get_resources_recent_events_and_memory_list_filters():
    with TestClient(app) as client:
        proposal = create(client, "phase4 list active", source_quote="phase4 list active")
        memory = approve(client, proposal)
        expired = approve(client, create(client, "phase4 list expired"))
        set_expired(expired["id"])

        assert client.get(f"/v1/proposals/{proposal['id']}").json()["id"] == proposal["id"]
        assert client.get(f"/v1/sources/{proposal['source_id']}").json()["id"] == proposal["source_id"]
        event = client.get(f"/v1/memories/{memory['id']}/explain").json()["events"][0]
        assert client.get(f"/v1/events/{event['id']}").json()["id"] == event["id"]
        assert client.get("/v1/events", params={"limit": 2}).status_code == 200

        default_ids = [item["id"] for item in client.get("/v1/memories").json()["memories"]]
        assert memory["id"] in default_ids and expired["id"] not in default_ids
        expired_ids = [item["id"] for item in client.get("/v1/memories", params={"status": "expired"}).json()["memories"]]
        assert expired["id"] in expired_ids
        filtered = client.get("/v1/memories", params={"actor_id": "phase4", "project_id": "mcp", "type": "fact", "source_id": proposal["source_id"]}).json()["memories"]
        assert [item["id"] for item in filtered] == [memory["id"]]


def test_feedback_types_replay_and_memory_status_unchanged():
    with TestClient(app) as client:
        memory = approve(client, create(client, "phase4 feedback"))
        before = event_count()
        for name in ("useful", "not_useful", "possibly_stale"):
            response = client.post(f"/v1/memories/{memory['id']}/feedback", json={"feedback": name, "actor_id": "agent", "note": "short"})
            assert response.status_code == 200
            assert response.json()["event_type"] == f"feedback_{name}"
        assert client.get(f"/v1/memories/{memory['id']}").json()["status"] == "active"

        payload = {"feedback": "useful", "actor_id": "agent", "idempotency_key": "feedback-key"}
        first = client.post(f"/v1/memories/{memory['id']}/feedback", json=payload).json()
        second = client.post(f"/v1/memories/{memory['id']}/feedback", json=payload).json()
        assert first["id"] == second["id"]
        assert event_count() == before + 4


def test_expiry_replay_and_key_conflict():
    with TestClient(app) as client:
        memory = approve(client, create(client, "phase4 expiry"))
        payload = {
            "actor_id": "reviewer",
            "note": "review window",
            "expires_at": (models.now() + timedelta(days=1)).isoformat(),
            "idempotency_key": "expiry-key",
        }
        first = client.post(f"/v1/memories/{memory['id']}/expiry", json=payload)
        assert first.status_code == 200
        second = client.post(f"/v1/memories/{memory['id']}/expiry", json=payload)
        assert second.status_code == 200 and second.json()["expires_at"] == first.json()["expires_at"]
        other = approve(client, create(client, "phase4 expiry other"))
        conflict = client.post(f"/v1/memories/{other['id']}/expiry", json=payload)
        assert conflict.status_code == 409
        changed = dict(payload, expires_at=(models.now() + timedelta(days=2)).isoformat())
        assert client.post(f"/v1/memories/{memory['id']}/expiry", json=changed).status_code == 409


def test_governance_idempotency_for_approve_reject_revoke_and_supersede():
    with TestClient(app) as client:
        approved = create(client, "phase4 approve idem")
        first = approve(client, approved, idempotency_key="approve-key")
        second = approve(client, approved, idempotency_key="approve-key")
        assert first["id"] == second["id"]
        assert client.post(f"/v1/proposals/{create(client, 'phase4 approve conflict')['id']}/approve", json={"idempotency_key": "approve-key"}).status_code == 409

        rejected = create(client, "phase4 reject idem")
        payload = {"actor_id": "reviewer", "note": "no", "idempotency_key": "reject-key"}
        assert client.post(f"/v1/proposals/{rejected['id']}/reject", json=payload).status_code == 200
        assert client.post(f"/v1/proposals/{rejected['id']}/reject", json=payload).status_code == 200

        revoked = approve(client, create(client, "phase4 revoke idem"))
        payload = {"actor_id": "reviewer", "note": "bad", "idempotency_key": "revoke-key"}
        assert client.post(f"/v1/memories/{revoked['id']}/revoke", json=payload).status_code == 200
        assert client.post(f"/v1/memories/{revoked['id']}/revoke", json=payload).status_code == 200

        old = approve(client, create(client, "phase4 supersede old", type="project_decision"))
        proposal = create(client, "phase4 supersede new", type="project_decision")
        payload = {"supersede_memory_id": old["id"], "idempotency_key": "supersede-key"}
        replacement = approve(client, proposal, **payload)
        replay = approve(client, proposal, **payload)
        assert replacement["id"] == replay["id"] and replacement["supersedes_memory_id"] == old["id"]


def test_idempotency_key_rejects_same_target_different_payloads():
    with TestClient(app) as client:
        approved = create(client, "phase5 approve fingerprint")
        payload = {"actor_id": "reviewer", "note": "ok", "idempotency_key": "approve-fingerprint"}
        assert client.post(f"/v1/proposals/{approved['id']}/approve", json=payload).status_code == 200
        assert client.post(f"/v1/proposals/{approved['id']}/approve", json={**payload, "note": "changed"}).status_code == 409

        rejected = create(client, "phase5 reject fingerprint")
        payload = {"actor_id": "reviewer", "note": "no", "idempotency_key": "reject-fingerprint"}
        assert client.post(f"/v1/proposals/{rejected['id']}/reject", json=payload).status_code == 200
        assert client.post(f"/v1/proposals/{rejected['id']}/reject", json={**payload, "actor_id": "other"}).status_code == 409

        revoked = approve(client, create(client, "phase5 revoke fingerprint"))
        payload = {"actor_id": "reviewer", "note": "bad", "idempotency_key": "revoke-fingerprint"}
        assert client.post(f"/v1/memories/{revoked['id']}/revoke", json=payload).status_code == 200
        assert client.post(f"/v1/memories/{revoked['id']}/revoke", json={**payload, "note": "worse"}).status_code == 409

        feedback = approve(client, create(client, "phase5 feedback fingerprint"))
        payload = {"feedback": "useful", "actor_id": "agent", "note": "ok", "idempotency_key": "feedback-fingerprint"}
        assert client.post(f"/v1/memories/{feedback['id']}/feedback", json=payload).status_code == 200
        assert client.post(f"/v1/memories/{feedback['id']}/feedback", json={**payload, "feedback": "not_useful"}).status_code == 409

        old = approve(client, create(client, "phase5 supersede old", type="project_decision"))
        other = approve(client, create(client, "phase5 supersede other", type="project_decision"))
        proposal = create(client, "phase5 supersede new", type="project_decision")
        payload = {"supersede_memory_id": old["id"], "idempotency_key": "supersede-fingerprint"}
        assert client.post(f"/v1/proposals/{proposal['id']}/approve", json=payload).status_code == 200
        assert client.post(f"/v1/proposals/{proposal['id']}/approve", json={**payload, "supersede_memory_id": other["id"]}).status_code == 409
