from datetime import timedelta

from fastapi.testclient import TestClient

from app.main import app
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
