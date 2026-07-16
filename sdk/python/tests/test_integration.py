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
from mcp.client.streamable_http import streamable_http_client
from memorynode import mcp_server
from memorynode.config import mcp_http_token_hash


ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "backend"))
os.environ["MEMORYNODE_DB_PATH"] = str(Path(tempfile.mkdtemp()) / "mcp-test.db")

from app import models, services  # noqa: E402
from app.db import session_local  # noqa: E402
from app.main import app  # noqa: E402


DEFAULT_TOOLS = [
    "memory_propose",
    "memory_search",
    "memory_get",
    "memory_explain",
    "memory_list",
    "memory_feedback",
]


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
    server = uvicorn.Server(uvicorn.Config(app, host="127.0.0.1", port=port, log_level="error"))
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


async def session(api_url, op, *, name=None, arguments=None, uri=None, env=None):
    environment = {"MEMORYNODE_API_URL": api_url}
    environment.update(env or {})
    params = StdioServerParameters(command=sys.executable, args=["-m", "memorynode"], env=environment)
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as client:
            await client.initialize()
            if op == "tool":
                result = await client.call_tool(name, arguments or {})
                assert not result.isError
                return json.loads(result.content[0].text)
            if op == "resource":
                result = await client.read_resource(uri)
                return json.loads(result.contents[0].text)
            if op == "tools":
                return [tool.name for tool in (await client.list_tools()).tools]
            raise AssertionError(op)


def call(api_url, name, arguments, env=None):
    return asyncio.run(session(api_url, "tool", name=name, arguments=arguments, env=env))


def read(api_url, uri, env=None):
    return asyncio.run(session(api_url, "resource", uri=uri, env=env))


def discover(api_url, env=None):
    return asyncio.run(session(api_url, "tools", env=env))


def approve(api_url, proposal_id, **payload):
    response = httpx.post(f"{api_url}/v1/proposals/{proposal_id}/approve", json=payload, timeout=5, trust_env=False)
    assert response.status_code == 200
    return response.json()


def propose(api_url, text):
    return call(api_url, "memory_propose", {"content": text, "actor_id": "matrix", "project_id": "matrix"})["proposals"][0]


def test_full_mcp_governance_loop_unicode_resources_and_feedback(api_url):
    content = "以后回答使用中文。" + "长文本 " * 150 + "MCP闭环标记"
    proposed = call(api_url, "memory_propose", {"content": content, "actor_id": "中文用户", "project_id": "MemoryNode项目"})
    proposal = proposed["proposals"][0]
    assert proposal["status"] == "pending"
    assert httpx.get(f"{api_url}/v1/memories/search", params={"q": "MCP闭环标记"}, trust_env=False).json()["memories"] == []

    memory = approve(api_url, proposal["id"])
    found = call(api_url, "memory_search", {"query": "MCP闭环标记"})
    assert [item["id"] for item in found["memories"]] == [memory["id"]]
    partial = call(api_url, "memory_search", {"query": "\u95ed\u73af"})
    assert [item["id"] for item in partial["memories"]] == [memory["id"]]
    assert call(api_url, "memory_get", {"memory_id": memory["id"]})["id"] == memory["id"]
    assert call(api_url, "memory_list", {"actor_id": "中文用户"})["memories"][0]["id"] == memory["id"]
    feedback = call(api_url, "memory_feedback", {"memory_id": memory["id"], "feedback": "possibly_stale", "actor_id": "agent", "note": "check later", "idempotency_key": "mcp-feedback"})
    assert feedback["event"]["event_type"] == "feedback_possibly_stale"
    assert feedback["memory_status_changed"] is False

    explained = call(api_url, "memory_explain", {"memory_id": memory["id"]})
    assert explained["source"]["raw_text"].endswith("MCP闭环标记")
    assert explained["proposal"]["status"] == "approved"
    assert explained["events"][0]["event_type"] == "approve"
    assert read(api_url, f"memorynode://memories/{memory['id']}")["memory"]["id"] == memory["id"]
    assert read(api_url, f"memorynode://proposals/{proposal['id']}")["id"] == proposal["id"]
    assert read(api_url, f"memorynode://sources/{proposal['source_id']}")["raw_text"].endswith("MCP闭环标记")
    assert read(api_url, f"memorynode://events/{explained['events'][0]['id']}")["event_type"] == "approve"
    assert "raw_text" not in json.dumps(read(api_url, "memorynode://audit/recent"), ensure_ascii=False)
    assert read(api_url, "memorynode://schema")["semantics"]["expiry"].startswith("request-driven")


def test_reject_revoke_expire_and_supersede_are_hidden_from_default_search(api_url):
    rejected = propose(api_url, "rejecttoken decision")
    assert httpx.post(f"{api_url}/v1/proposals/{rejected['id']}/reject", trust_env=False).status_code == 200
    assert call(api_url, "memory_search", {"query": "rejecttoken"})["memories"] == []

    revoked = approve(api_url, propose(api_url, "revoketoken decision")["id"])
    assert httpx.post(f"{api_url}/v1/memories/{revoked['id']}/revoke", trust_env=False).status_code == 200
    assert call(api_url, "memory_search", {"query": "revoketoken"})["memories"] == []

    expiring = approve(api_url, propose(api_url, "expiretoken decision")["id"], expires_at=(models.now() + timedelta(days=1)).isoformat())
    db = session_local()
    try:
        row = db.query(models.Memory).get(expiring["id"])
        row.expires_at = models.now() - timedelta(seconds=1)
        db.commit()
    finally:
        db.close()
    assert call(api_url, "memory_search", {"query": "expiretoken"})["memories"] == []

    old = approve(api_url, propose(api_url, "supersedetoken old")["id"])
    new = approve(api_url, propose(api_url, "supersedetoken new")["id"], supersede_memory_id=old["id"])
    assert [item["id"] for item in call(api_url, "memory_search", {"query": "supersedetoken"})["memories"]] == [new["id"]]
    assert call(api_url, "memory_explain", {"memory_id": new["id"]})["supersedes"]["id"] == old["id"]


def test_default_policy_and_single_authorized_governance_tool(api_url, tmp_path):
    assert discover(api_url, {"MEMORYNODE_HOME": str(tmp_path)}) == DEFAULT_TOOLS
    proposal = propose(api_url, "authorized reject decision")
    config = tmp_path / "config"
    config.mkdir(parents=True)
    (config / "config.toml").write_text('[governance]\nallow_agent_reject = true\n', encoding="utf-8")
    assert discover(api_url, {"MEMORYNODE_HOME": str(tmp_path)}) == DEFAULT_TOOLS + ["proposal_reject"]
    payload = {"proposal_id": proposal["id"], "actor_id": "reviewer", "reason": "not durable", "idempotency_key": "authorized-reject", "confirm": True}
    rejected = call(api_url, "proposal_reject", payload, {"MEMORYNODE_HOME": str(tmp_path)})
    replay = call(api_url, "proposal_reject", payload, {"MEMORYNODE_HOME": str(tmp_path)})
    assert rejected["status"] == replay["status"] == "rejected"


async def http_call(url, token, name, arguments=None, operation="tool"):
    async with httpx.AsyncClient(headers={"Authorization": f"Bearer {token}"}, trust_env=False) as client:
        async with streamable_http_client(f"{url}/mcp", http_client=client) as (read, write, _session_id):
            async with ClientSession(read, write) as session:
                await session.initialize()
                if operation == "tools":
                    return [tool.name for tool in (await session.list_tools()).tools]
                if operation == "resource":
                    response = await session.read_resource(arguments)
                    return json.loads(response.contents[0].text)
                response = await session.call_tool(name, arguments or {})
                assert not response.isError
                return json.loads(response.content[0].text)


async def two_http_proposals(url, token):
    return await asyncio.gather(
        http_call(url, token, "memory_propose", {"content": "http shared proposal alpha", "actor_id": "http-a", "project_id": "shared"}),
        http_call(url, token, "memory_propose", {"content": "http shared proposal beta", "actor_id": "http-b", "project_id": "shared"}),
    )


def test_streamable_http_shared_governance_loop_and_audit(api_url, tmp_path, monkeypatch):
    monkeypatch.setenv("MEMORYNODE_API_URL", api_url)
    monkeypatch.setenv("MEMORYNODE_HOME", str(tmp_path))
    token = "integration-local-bearer-token"
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    server = uvicorn.Server(uvicorn.Config(mcp_server.make_http_app(mcp_http_token_hash(token)), host="127.0.0.1", port=port, log_level="error"))
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()
    url = f"http://127.0.0.1:{port}"
    try:
        for _ in range(100):
            try:
                if httpx.post(f"{url}/mcp", json={}, timeout=.1, trust_env=False).status_code == 401:
                    break
            except httpx.HTTPError:
                threading.Event().wait(.02)
        else:
            pytest.fail("HTTP MCP server did not start")

        unauthorized = httpx.post(f"{url}/mcp", json={"jsonrpc": "2.0", "id": 1, "method": "tools/list"}, timeout=5, trust_env=False)
        assert unauthorized.status_code == 401
        created = asyncio.run(two_http_proposals(url, token))
        proposals = [item["proposals"][0] for item in created]
        assert [item["status"] for item in proposals] == ["pending", "pending"]
        assert httpx.get(f"{api_url}/v1/memories/search", params={"q": "http shared proposal"}, trust_env=False).json()["memories"] == []
        assert asyncio.run(http_call(url, token, operation="tools", name=None)) == DEFAULT_TOOLS

        memory = approve(api_url, proposals[0]["id"])
        search = asyncio.run(http_call(url, token, "memory_search", {"query": "http shared proposal alpha"}))
        assert [item["id"] for item in search["memories"]] == [memory["id"]]
        explained = asyncio.run(http_call(url, token, "memory_explain", {"memory_id": memory["id"]}))
        assert explained["memory"]["id"] == memory["id"]
        assert asyncio.run(http_call(url, token, operation="resource", name=None, arguments=f"memorynode://memories/{memory['id']}"))["memory"]["id"] == memory["id"]

        log = (tmp_path / "logs" / "mcp.log").read_text(encoding="utf-8")
        assert all(secret not in log for secret in (token, "http shared proposal alpha", "http shared proposal beta"))
        rows = [json.loads(line) for line in log.splitlines()]
        assert {"auth_denied", "connection_open", "tool_call", "resource_read"} <= {row["event"] for row in rows}
    finally:
        server.should_exit = True
        thread.join(timeout=5)
        assert not thread.is_alive()
