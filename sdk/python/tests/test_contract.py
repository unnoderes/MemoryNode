import os
import sys
import tempfile
from pathlib import Path

import httpx
from fastapi.testclient import TestClient

from memorynode import MemoryNodeClient


ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "backend"))
os.environ["MEMORYNODE_DB_PATH"] = str(Path(tempfile.mkdtemp()) / "contract.db")

from app import services  # noqa: E402
from app.main import app  # noqa: E402


def test_openapi_and_real_responses_match_every_sdk_resource():
    expected = {
        ("GET", "/health"), ("POST", "/v1/proposals"),
        ("POST", "/v1/proposals/extract"), ("GET", "/v1/proposals"),
        ("GET", "/v1/proposals/{proposal_id}"),
        ("GET", "/v1/proposals/{proposal_id}/related-memories"),
        ("POST", "/v1/proposals/{proposal_id}/approve"),
        ("POST", "/v1/proposals/{proposal_id}/reject"),
        ("GET", "/v1/sources/{source_id}"), ("GET", "/v1/events"),
        ("GET", "/v1/events/{event_id}"), ("GET", "/v1/memories"),
        ("GET", "/v1/memories/search"), ("GET", "/v1/memories/{memory_id}"),
        ("GET", "/v1/memories/{memory_id}/explain"),
        ("POST", "/v1/memories/{memory_id}/revoke"),
        ("POST", "/v1/memories/{memory_id}/feedback"),
        ("POST", "/v1/memories/{memory_id}/expiry"),
    }
    actual = {(method.upper(), path) for path, item in app.openapi()["paths"].items() for method in item}
    assert expected <= actual

    services.extract_memory_proposals = lambda **kwargs: [{
        "content": kwargs["messages"][0]["content"], "type": "fact",
        "confidence": .9, "source_quote": kwargs["messages"][0]["content"],
        "reason": "Explicit statement.",
    }]
    with TestClient(app) as server:
        def handler(request):
            result = server.request(request.method, request.url.raw_path.decode(), content=request.content, headers={"content-type": request.headers.get("content-type", "application/json")})
            return httpx.Response(result.status_code, content=result.content, headers=result.headers)

        with MemoryNodeClient(transport=httpx.MockTransport(handler)) as sdk:
            assert sdk.status.check().ok
            manual = sdk.proposals.create("manual contract", actor_id="a", project_id="p")
            extracted = sdk.proposals.extract(actor_id="a", project_id="p", content="typed contract")
            assert sdk.proposals.get(manual.id).id == manual.id
            assert sdk.sources.get(manual.source_id).raw_text == "manual contract"
            assert sdk.proposals.list("pending").proposals
            assert sdk.proposals.related_memories(extracted.proposals[0].id).memories == []
            rejected = sdk.proposals.reject(manual.id)
            assert rejected.status == "rejected"
            approved = sdk.proposals.approve(extracted.proposals[0].id)
            assert sdk.memories.list().memories
            assert sdk.memories.search("typed").memories[0].score is not None
            assert sdk.memories.get(approved.id).id == approved.id
            explanation = sdk.memories.explain(approved.id)
            assert explanation.source.raw_text.endswith("typed contract")
            assert sdk.events.get(explanation.events[0].id).event_type == "approve"
            assert sdk.events.list_recent().events
            assert sdk.memories.feedback(approved.id, feedback="useful", actor_id="agent").event_type == "feedback_useful"
            assert sdk.memories.revoke(approved.id).status == "revoked"
