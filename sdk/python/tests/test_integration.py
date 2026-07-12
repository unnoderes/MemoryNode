import asyncio
import json
import os
import socket
import sys
import tempfile
import threading
from datetime import timedelta
from pathlib import Path

import httpx
import pytest
import uvicorn
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "backend"))
os.environ["MEMORYNODE_DB_PATH"] = str(Path(tempfile.mkdtemp()) / "mcp-test.db")

from app import models, services  # noqa: E402
from app.db import session_local  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(scope="module")
def api_url():
    def fake_extract(**kwargs):
        content = kwargs["messages"][0]["content"]
        return [{
            "content": content,
            "type": "project_decision",
            "confidence": 0.9,
            "source_quote": content,
            "reason": "Explicit user statement.",
        }]

    services.extract_memory_proposals = fake_extract
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    server = uvicorn.Server(
        uvicorn.Config(app, host="127.0.0.1", port=port, log_level="error")
    )
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()
    url = f"http://127.0.0.1:{port}"
    for _ in range(100):
        try:
            if httpx.get(f"{url}/health", timeout=0.1, trust_env=False).status_code == 200:
                break
        except httpx.HTTPError:
            threading.Event().wait(0.02)
    else:
        pytest.fail(f"test API did not start (thread_alive={thread.is_alive()})")
    yield url
    server.should_exit = True
    thread.join(timeout=5)
    assert not thread.is_alive()


async def tool(api_url, name, arguments):
    params = StdioServerParameters(
        command=sys.executable,
        args=["-m", "memorynode"],
        env={"MEMORYNODE_API_URL": api_url},
    )
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            result = await session.call_tool(name, arguments)
            assert not result.isError
            return json.loads(result.content[0].text)


def call(api_url, name, arguments):
    return asyncio.run(tool(api_url, name, arguments))


def approve(api_url, proposal_id, **payload):
    response = httpx.post(
        f"{api_url}/v1/proposals/{proposal_id}/approve",
        json=payload,
        timeout=5,
        trust_env=False,
    )
    assert response.status_code == 200
    return response.json()


def test_full_mcp_governance_loop_and_unicode(api_url):
    content = "以后回答使用中文。" + "长期文本 " * 150 + "MCP闭环标记"
    proposed = call(api_url, "memory_propose", {
        "content": content,
        "actor_id": "中文用户",
        "project_id": "MemoryNode项目",
    })
    proposal = proposed["proposals"][0]
    assert proposal["status"] == "pending"
    assert httpx.get(
        f"{api_url}/v1/memories/search",
        params={"q": "MCP闭环标记"},
        trust_env=False,
    ).json()["memories"] == []

    memory = approve(api_url, proposal["id"])
    found = call(api_url, "memory_search", {"query": "MCP闭环标记"})
    assert [item["id"] for item in found["memories"]] == [memory["id"]]

    explained = call(api_url, "memory_explain", {"memory_id": memory["id"]})
    assert {"source", "proposal", "memory", "events", "supersedes", "superseded_by"} <= explained.keys()
    assert explained["source"]["raw_text"].endswith("MCP闭环标记")
    assert explained["proposal"]["status"] == "approved"
    assert explained["events"][0]["event_type"] == "approve"


def propose(api_url, text):
    return call(api_url, "memory_propose", {
        "content": text, "actor_id": "matrix", "project_id": "matrix"
    })["proposals"][0]


def test_reject_revoke_expire_and_supersede_are_hidden(api_url):
    rejected = propose(api_url, "rejecttoken decision")
    assert httpx.post(
        f"{api_url}/v1/proposals/{rejected['id']}/reject", trust_env=False
    ).status_code == 200
    assert call(api_url, "memory_search", {"query": "rejecttoken"})["memories"] == []

    revoked = approve(api_url, propose(api_url, "revoketoken decision")["id"])
    assert httpx.post(
        f"{api_url}/v1/memories/{revoked['id']}/revoke", trust_env=False
    ).status_code == 200
    assert call(api_url, "memory_search", {"query": "revoketoken"})["memories"] == []

    expiring = approve(
        api_url,
        propose(api_url, "expiretoken decision")["id"],
        expires_at=(models.now() + timedelta(days=1)).isoformat(),
    )
    db = session_local()
    try:
        row = db.query(models.Memory).get(expiring["id"])
        row.expires_at = models.now() - timedelta(seconds=1)
        db.commit()
    finally:
        db.close()
    assert call(api_url, "memory_search", {"query": "expiretoken"})["memories"] == []

    old = approve(api_url, propose(api_url, "supersedetoken old")["id"])
    new = approve(
        api_url,
        propose(api_url, "supersedetoken new")["id"],
        supersede_memory_id=old["id"],
    )
    results = call(api_url, "memory_search", {"query": "supersedetoken"})["memories"]
    assert [item["id"] for item in results] == [new["id"]]
    explanation = call(api_url, "memory_explain", {"memory_id": new["id"]})
    assert explanation["supersedes"]["id"] == old["id"]
