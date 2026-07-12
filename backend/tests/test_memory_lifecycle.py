import os
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

os.environ["MEMORYNODE_DB_PATH"] = str(Path(tempfile.mkdtemp()) / "test.db")

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text

from app.db import init_db, session_local
from app.main import app
from app import models
from app.qwen import extract_memory_proposals
from app.services import utc_datetime


def assert_utc(value):
    assert value.endswith("+00:00")


def test_api_timestamps_are_explicit_utc():
    with TestClient(app) as client:
        pending = create_proposal(
            client, "UTC contract pending.",
            actor_id="utc-actor", project_id="utc-project", type="fact",
        )
        assert_utc(pending["created_at"])
        assert pending["decided_at"] is None

        expires_at = (models.now() + timedelta(days=1)).isoformat()
        memory = client.post(
            f"/v1/proposals/{pending['id']}/approve",
            json={"expires_at": expires_at},
        ).json()
        for field in ("expires_at", "created_at", "updated_at"):
            assert_utc(memory[field])

        approved = next(
            item for item in client.get("/v1/proposals", params={"status": "approved"}).json()["proposals"]
            if item["id"] == pending["id"]
        )
        assert_utc(approved["created_at"])
        assert_utc(approved["decided_at"])

        assert_utc(client.get(f"/v1/memories/{memory['id']}").json()["created_at"])
        search_memory = client.get("/v1/memories/search", params={"q": "contract"}).json()["memories"][0]
        assert_utc(search_memory["updated_at"])

        related_proposal = create_proposal(
            client, "UTC contract replacement.",
            actor_id="utc-actor", project_id="utc-project", type="fact",
        )
        related = client.get(f"/v1/proposals/{related_proposal['id']}/related-memories").json()["memories"]
        assert_utc(related[0]["created_at"])

        explanation = client.get(f"/v1/memories/{memory['id']}/explain").json()
        assert_utc(explanation["source"]["created_at"])
        assert all(event["created_at"].endswith("+00:00") for event in explanation["events"])

        no_expiry = create_proposal(
            client, "UTC contract without expiry.",
            actor_id="utc-no-expiry", project_id="utc-project", type="fact",
        )
        no_expiry_memory = client.post(f"/v1/proposals/{no_expiry['id']}/approve").json()
        assert no_expiry_memory["expires_at"] is None

    non_utc = datetime(2026, 7, 12, 20, tzinfo=timezone(timedelta(hours=8)))
    assert utc_datetime(non_utc) == datetime(2026, 7, 12, 12, tzinfo=timezone.utc)


def test_proposal_approve_search_revoke_lifecycle():
    with TestClient(app) as client:
        proposal_response = client.post(
            "/v1/proposals",
            json={
                "actor_id": "demo-user",
                "project_id": "memorynode-demo",
                "raw_text": "This project must use Qwen Cloud, not OpenAI APIs.",
                "content": "This project must use Qwen Cloud instead of OpenAI APIs.",
                "type": "project_constraint",
                "confidence": 0.94,
                "source_quote": "This project must use Qwen Cloud, not OpenAI APIs.",
                "reason": "Project technology constraint.",
            },
        )
        assert proposal_response.status_code == 200
        proposal = proposal_response.json()
        assert proposal["status"] == "pending"

        approve_response = client.post(f"/v1/proposals/{proposal['id']}/approve")
        assert approve_response.status_code == 200
        memory = approve_response.json()
        assert memory["status"] == "active"

        search_response = client.get("/v1/memories/search", params={"q": "Qwen Cloud"})
        assert search_response.status_code == 200
        assert [item["id"] for item in search_response.json()["memories"]] == [memory["id"]]

        repeat_response = client.post(f"/v1/proposals/{proposal['id']}/approve")
        assert repeat_response.status_code == 409

        revoke_response = client.post(f"/v1/memories/{memory['id']}/revoke")
        assert revoke_response.status_code == 200
        assert revoke_response.json()["status"] == "revoked"

        missing_response = client.get("/v1/memories/search", params={"q": "Qwen Cloud"})
        assert missing_response.status_code == 200
        assert missing_response.json()["memories"] == []


def test_fts_search_empty_query_and_rebuild():
    with TestClient(app) as client:
        proposal_response = client.post(
            "/v1/proposals",
            json={"content": "FastAPI SQLite Next.js is the selected MVP stack."},
        )
        memory = client.post(
            f"/v1/proposals/{proposal_response.json()['id']}/approve"
        ).json()

        search_response = client.get("/v1/memories/search", params={"q": "SQLite"})
        assert search_response.status_code == 200
        assert search_response.json()["memories"][0]["id"] == memory["id"]
        assert "score" in search_response.json()["memories"][0]

        empty_response = client.get("/v1/memories/search", params={"q": "   "})
        assert empty_response.status_code == 400

        db = session_local()
        try:
            fts_tables = db.execute(
                text("SELECT name FROM sqlite_master WHERE name = 'memory_fts'")
            ).fetchall()
            assert fts_tables
            db.execute(text("DELETE FROM memory_fts"))
            db.commit()
        finally:
            db.close()

        assert client.get("/v1/memories/search", params={"q": "SQLite"}).json()[
            "memories"
        ] == []

        init_db()
        rebuilt_response = client.get("/v1/memories/search", params={"q": "SQLite"})
        assert [item["id"] for item in rebuilt_response.json()["memories"]] == [
            memory["id"]
        ]


def test_extract_creates_source_and_pending_proposals(monkeypatch):
    def fake_extract(**kwargs):
        return [
            {
                "content": "This project must use Qwen Cloud.",
                "type": "project_constraint",
                "confidence": 0.95,
                "source_quote": "This project must use Qwen Cloud.",
                "reason": "The user stated a project constraint.",
            },
            {
                "content": "FastAPI and SQLite are the MVP backend stack.",
                "type": "project_decision",
                "confidence": 0.9,
                "source_quote": "Use FastAPI and SQLite for MVP.",
                "reason": "The user stated a stack decision.",
            },
        ]

    monkeypatch.setattr("app.services.extract_memory_proposals", fake_extract)
    with TestClient(app) as client:
        response = client.post(
            "/v1/proposals/extract",
            json={
                "actor_id": "demo-user",
                "project_id": "memorynode-demo",
                "messages": [
                    {"role": "user", "content": "This project must use Qwen Cloud."},
                    {"role": "user", "content": "Use FastAPI and SQLite for MVP."},
                ],
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert len(body["proposals"]) == 2
    assert {item["status"] for item in body["proposals"]} == {"pending"}
    assert {item["source_id"] for item in body["proposals"]} == {body["source_id"]}

    db = session_local()
    try:
        source = db.query(models.MemorySource).get(body["source_id"])
        assert source is not None
        proposal_ids = [item["id"] for item in body["proposals"]]
        assert (
            db.query(models.Memory)
            .filter(models.Memory.proposal_id.in_(proposal_ids))
            .count()
            == 0
        )
    finally:
        db.close()


def test_extract_empty_messages_returns_400(monkeypatch):
    def fake_extract(**kwargs):
        raise AssertionError("extractor should not be called")

    monkeypatch.setattr("app.services.extract_memory_proposals", fake_extract)
    with TestClient(app) as client:
        response = client.post(
            "/v1/proposals/extract",
            json={
                "actor_id": "demo-user",
                "project_id": "memorynode-demo",
                "messages": [],
            },
        )

    assert response.status_code == 400


def test_extract_malformed_model_output_returns_502(monkeypatch):
    monkeypatch.setattr(
        "app.services.extract_memory_proposals",
        lambda **kwargs: [{"content": "missing required fields"}],
    )
    with TestClient(app) as client:
        response = client.post(
            "/v1/proposals/extract",
            json={
                "actor_id": "demo-user",
                "project_id": "memorynode-demo",
                "messages": [{"role": "user", "content": "Remember this."}],
            },
        )

    assert response.status_code == 502


def test_qwen_responses_wire_parses_output_text(monkeypatch):
    calls = []

    def fake_post_json(url, api_key, body):
        calls.append({"url": url, "api_key": api_key, "body": body})
        return {
            "output_text": (
                '{"proposals":[{"content":"Use Qwen Cloud.","type":"project_constraint",'
                '"confidence":0.9,"source_quote":"Use Qwen Cloud.","reason":"Project constraint."}]}'
            )
        }

    monkeypatch.setenv("QWEN_API_KEY", "test-key")
    monkeypatch.setenv("QWEN_BASE_URL", "https://example.com")
    monkeypatch.setenv("QWEN_MODEL", "gpt-5.5")
    monkeypatch.setenv("QWEN_WIRE_API", "responses")
    monkeypatch.setenv("QWEN_REASONING_EFFORT", "medium")
    monkeypatch.setattr("app.qwen._post_json", fake_post_json)

    proposals = extract_memory_proposals(
        actor_id="demo-user",
        project_id="memorynode-demo",
        messages=[{"role": "user", "content": "Use Qwen Cloud."}],
    )

    assert calls[0]["url"] == "https://example.com/v1/responses"
    assert calls[0]["api_key"] == "test-key"
    assert calls[0]["body"]["model"] == "gpt-5.5"
    assert calls[0]["body"]["reasoning"] == {"effort": "medium"}
    assert proposals[0]["content"] == "Use Qwen Cloud."


def create_proposal(client, content, **overrides):
    payload = {
        "actor_id": "demo-user",
        "project_id": "memorynode-demo",
        "content": content,
        "type": "project_decision",
    }
    payload.update(overrides)
    response = client.post("/v1/proposals", json=payload)
    assert response.status_code == 200
    return response.json()


def test_related_memories_and_supervised_supersession():
    with TestClient(app) as client:
        previous_proposal = create_proposal(client, "The MVP backend uses SQLite.")
        previous = client.post(f"/v1/proposals/{previous_proposal['id']}/approve").json()
        replacement_proposal = create_proposal(client, "The MVP backend uses PostgreSQL.")

        related = client.get(
            f"/v1/proposals/{replacement_proposal['id']}/related-memories"
        )
        assert related.status_code == 200
        assert [item["id"] for item in related.json()["memories"]] == [previous["id"]]

        replacement = client.post(
            f"/v1/proposals/{replacement_proposal['id']}/approve",
            json={"actor_id": "reviewer", "note": "Database decision updated.", "supersede_memory_id": previous["id"]},
        )
        assert replacement.status_code == 200
        assert replacement.json()["status"] == "active"
        assert replacement.json()["supersedes_memory_id"] == previous["id"]

        search = client.get("/v1/memories/search", params={"q": "backend"})
        assert [item["id"] for item in search.json()["memories"]] == [replacement.json()["id"]]

        new_detail = client.get(f"/v1/memories/{replacement.json()['id']}/explain").json()
        old_detail = client.get(f"/v1/memories/{previous['id']}/explain").json()
        assert new_detail["supersedes"]["id"] == previous["id"]
        assert old_detail["superseded_by"]["id"] == replacement.json()["id"]
        assert {event["event_type"] for event in new_detail["events"]} == {"approve", "supersede"}
        assert old_detail["memory"]["status"] == "revoked"
        assert [event["event_type"] for event in old_detail["events"]] == ["approve", "superseded"]


def test_supersession_rejects_invalid_targets_and_normal_approval_has_no_relation():
    with TestClient(app) as client:
        normal_proposal = create_proposal(client, "A normal decision.")
        normal = client.post(f"/v1/proposals/{normal_proposal['id']}/approve")
        assert normal.status_code == 200
        assert normal.json()["supersedes_memory_id"] is None

        proposal = create_proposal(client, "A replacement decision.")
        actor_target = create_proposal(client, "Other actor.", actor_id="other")
        project_target = create_proposal(client, "Other project.", project_id="other-project")
        type_target = create_proposal(client, "Other type.", type="fact")
        inactive_target = create_proposal(client, "Inactive target.")
        targets = [
            client.post(f"/v1/proposals/{actor_target['id']}/approve").json(),
            client.post(f"/v1/proposals/{project_target['id']}/approve").json(),
            client.post(f"/v1/proposals/{type_target['id']}/approve").json(),
            client.post(f"/v1/proposals/{inactive_target['id']}/approve").json(),
            {"id": "mem_missing"},
        ]
        client.post(f"/v1/memories/{targets[3]['id']}/revoke")

        for target in targets:
            response = client.post(
                f"/v1/proposals/{proposal['id']}/approve",
                json={"supersede_memory_id": target["id"]},
            )
            assert response.status_code == 409


def test_init_db_adds_supersedes_column_to_existing_database(monkeypatch, tmp_path):
    old_db = tmp_path / "old.db"
    old_engine = create_engine(f"sqlite:///{old_db}")
    with old_engine.begin() as conn:
        conn.execute(
            text(
                "CREATE TABLE memories ("
                "id VARCHAR PRIMARY KEY, proposal_id VARCHAR NOT NULL, content TEXT NOT NULL, "
                "type VARCHAR NOT NULL, status VARCHAR NOT NULL, expires_at DATETIME, "
                "created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL)"
            )
        )

    monkeypatch.setenv("MEMORYNODE_DB_PATH", str(old_db))
    init_db()
    db = session_local()
    try:
        columns = {row[1] for row in db.execute(text("PRAGMA table_info(memories)"))}
        assert "supersedes_memory_id" in columns
    finally:
        db.close()


def set_memory_expiry(memory_id, expires_at):
    db = session_local()
    try:
        memory = db.query(models.Memory).get(memory_id)
        memory.expires_at = expires_at
        db.commit()
    finally:
        db.close()


def test_approval_validates_and_persists_optional_expiry():
    with TestClient(app) as client:
        proposal = create_proposal(client, "This decision needs a quarterly review.")
        expires_at = (models.now() + timedelta(days=1)).isoformat()
        approved = client.post(
            f"/v1/proposals/{proposal['id']}/approve",
            json={"expires_at": expires_at},
        )
        assert approved.status_code == 200
        assert approved.json()["expires_at"] is not None

        normal = create_proposal(client, "This decision has no expiry.")
        assert client.post(f"/v1/proposals/{normal['id']}/approve").json()["expires_at"] is None

        for invalid_expiry in ("2020-01-01T00:00:00Z", models.now().isoformat(), "2099-01-01T00:00:00"):
            invalid = create_proposal(client, f"Invalid expiry {invalid_expiry}.")
            response = client.post(
                f"/v1/proposals/{invalid['id']}/approve",
                json={"expires_at": invalid_expiry},
            )
            assert response.status_code == 400


def test_due_memory_expires_once_and_is_auditable():
    with TestClient(app) as client:
        proposal = create_proposal(client, "An expiring deployment decision.")
        memory = client.post(
            f"/v1/proposals/{proposal['id']}/approve",
            json={"expires_at": (models.now() + timedelta(days=1)).isoformat()},
        ).json()
        set_memory_expiry(memory["id"], models.now() - timedelta(seconds=1))

        assert client.get("/v1/memories/search", params={"q": "deployment"}).json()["memories"] == []
        inactive = client.get(
            "/v1/memories/search",
            params={"q": "deployment", "include_inactive": "true"},
        ).json()["memories"]
        assert inactive[0]["status"] == "expired"

        detail = client.get(f"/v1/memories/{memory['id']}/explain").json()
        assert detail["memory"]["status"] == "expired"
        assert [event["event_type"] for event in detail["events"]].count("expire") == 1


def test_expiry_never_reactivates_or_supersedes_inactive_memory():
    with TestClient(app) as client:
        revoked_proposal = create_proposal(client, "A revoked expiring decision.")
        revoked = client.post(
            f"/v1/proposals/{revoked_proposal['id']}/approve",
            json={"expires_at": (models.now() + timedelta(days=1)).isoformat()},
        ).json()
        client.post(f"/v1/memories/{revoked['id']}/revoke")
        set_memory_expiry(revoked["id"], models.now() - timedelta(seconds=1))
        revoked_detail = client.get(f"/v1/memories/{revoked['id']}/explain").json()
        assert [event["event_type"] for event in revoked_detail["events"]].count("expire") == 0

        target_proposal = create_proposal(client, "An expired supersession target.")
        target = client.post(
            f"/v1/proposals/{target_proposal['id']}/approve",
            json={"expires_at": (models.now() + timedelta(days=1)).isoformat()},
        ).json()
        set_memory_expiry(target["id"], models.now() - timedelta(seconds=1))
        replacement = create_proposal(client, "A replacement for expired target.")
        response = client.post(
            f"/v1/proposals/{replacement['id']}/approve",
            json={"supersede_memory_id": target["id"]},
        )
        assert response.status_code == 409
        detail = client.get(f"/v1/memories/{target['id']}/explain").json()
        assert detail["memory"]["status"] == "expired"
        assert [event["event_type"] for event in detail["events"]].count("expire") == 1
