import os
import tempfile
from pathlib import Path

os.environ["MEMORYNODE_DB_PATH"] = str(Path(tempfile.mkdtemp()) / "test.db")

from fastapi.testclient import TestClient
from sqlalchemy import text

from app.db import init_db, session_local
from app.main import app
from app import models
from app.qwen import extract_memory_proposals


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
