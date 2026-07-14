import asyncio
import json
import socket
import threading

import httpx
import pytest
import uvicorn
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client

from memorynode import mcp_server
from memorynode.config import McpHttpConfig, Paths, initialize, load_mcp_http_config, mcp_http_token_hash, rotate_mcp_http_token


DEFAULT_TOOLS = [
    "memory_propose",
    "memory_search",
    "memory_get",
    "memory_explain",
    "memory_list",
    "memory_feedback",
]


@pytest.fixture
def http_mcp(tmp_path, monkeypatch):
    monkeypatch.setenv("MEMORYNODE_HOME", str(tmp_path))
    monkeypatch.setattr(mcp_server, "_call", lambda operation: {"ok": True})
    token = "test-local-token-not-for-production"
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    server = uvicorn.Server(uvicorn.Config(mcp_server.make_http_app(mcp_http_token_hash(token)), host="127.0.0.1", port=port, log_level="error"))
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{port}"
    for _ in range(100):
        try:
            if httpx.post(f"{base}/mcp", json={}, timeout=.1, trust_env=False).status_code == 401:
                break
        except httpx.HTTPError:
            threading.Event().wait(.02)
    else:
        pytest.fail("HTTP MCP server did not start")
    yield base, token, tmp_path
    server.should_exit = True
    thread.join(timeout=5)
    assert not thread.is_alive()


async def discover(url, token):
    async with httpx.AsyncClient(headers={"Authorization": f"Bearer {token}"}, trust_env=False) as client:
        async with streamable_http_client(f"{url}/mcp", http_client=client) as (read, write, _session_id):
            async with ClientSession(read, write) as session:
                await session.initialize()
                tools = [tool.name for tool in (await session.list_tools()).tools]
                assert not (await session.call_tool("memory_search", {"query": "private query"})).isError
                return tools


async def discover_pair(url, token):
    return await asyncio.gather(discover(url, token), discover(url, token))


def test_http_requires_bearer_before_mcp_handling(http_mcp):
    base, token, home = http_mcp
    request = {"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "memory_search", "arguments": {"query": token}}}
    for header in ({}, {"Authorization": "Bearer wrong-token"}):
        response = httpx.post(f"{base}/mcp", json=request, headers=header, timeout=5, trust_env=False)
        assert response.status_code == 401 and token not in response.text
    rows = [json.loads(line) for line in (home / "logs" / "mcp.log").read_text(encoding="utf-8").splitlines()]
    assert all(row["event"] == "auth_denied" for row in rows)
    assert token not in json.dumps(rows)


def test_http_two_clients_share_tools_and_sanitize_audit(http_mcp):
    base, token, home = http_mcp
    tools = asyncio.run(discover_pair(base, token))
    assert tools == [DEFAULT_TOOLS, DEFAULT_TOOLS]
    rows = [json.loads(line) for line in (home / "logs" / "mcp.log").read_text(encoding="utf-8").splitlines()]
    assert sum(row["event"] == "connection_open" for row in rows) == 2
    assert sum(row["event"] == "tool_call" for row in rows) >= 2
    serialized = json.dumps(rows)
    assert token not in serialized and "Authorization" not in serialized and "parameters" not in serialized


def test_http_config_validation_and_one_time_hash_only(tmp_path):
    paths = Paths(*(tmp_path / name for name in ("config", "data", "logs", "run")))
    initialize(paths=paths)
    token = rotate_mcp_http_token(paths)
    config = load_mcp_http_config(paths=paths, environ={})
    assert config == McpHttpConfig(token_hash=mcp_http_token_hash(token))
    text = paths.config_file.read_text(encoding="utf-8")
    assert token not in text and config.token_hash in text
    with pytest.raises(ValueError, match="127.0.0.1"):
        load_mcp_http_config(type("Args", (), {"host": "0.0.0.0", "port": None})(), paths, {})
    with pytest.raises(ValueError, match="1-65535"):
        load_mcp_http_config(type("Args", (), {"host": None, "port": 0})(), paths, {})
