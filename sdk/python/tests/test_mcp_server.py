import asyncio
import json
import sys

import pytest
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from mcp.server.fastmcp.exceptions import ToolError

from memorynode import mcp_server


DEFAULT_TOOLS = [
    "memory_propose",
    "memory_search",
    "memory_get",
    "memory_explain",
    "memory_list",
    "memory_feedback",
]


def run(coro):
    return asyncio.run(coro)


async def session_call(name=None, arguments=None, env=None, op="tools"):
    params = StdioServerParameters(
        command=sys.executable,
        args=["-m", "memorynode"],
        env=env,
    )
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            if op == "resources":
                return await session.list_resources()
            if op == "templates":
                return await session.list_resource_templates()
            if op == "schema":
                return await session.read_resource("memorynode://schema")
            if name is None:
                return await session.list_tools()
            return await session.call_tool(name, arguments or {})


def test_tool_discovery_default_policy_and_clean_stdio(tmp_path):
    tools = run(session_call(env={"MEMORYNODE_HOME": str(tmp_path)})).tools
    assert [tool.name for tool in tools] == DEFAULT_TOOLS


def test_tool_discovery_single_governance_authorization(tmp_path):
    config = tmp_path / "config"
    config.mkdir(parents=True)
    (config / "config.toml").write_text('[governance]\nallow_agent_reject = true\n', encoding="utf-8")
    tools = run(session_call(env={"MEMORYNODE_HOME": str(tmp_path)})).tools
    assert [tool.name for tool in tools] == DEFAULT_TOOLS + ["proposal_reject"]


def test_resources_and_templates_are_discoverable(tmp_path):
    env = {"MEMORYNODE_HOME": str(tmp_path)}
    resources = run(session_call(env=env, op="resources")).resources
    templates = run(session_call(env=env, op="templates")).resourceTemplates
    assert {str(item.uri) for item in resources} >= {"memorynode://audit/recent", "memorynode://status", "memorynode://schema"}
    assert {item.uriTemplate for item in templates} >= {
        "memorynode://memories/{memory_id}",
        "memorynode://proposals/{proposal_id}",
        "memorynode://sources/{source_id}",
        "memorynode://events/{event_id}",
    }
    schema = json.loads(run(session_call(env=env, op="schema")).contents[0].text)
    assert schema["default_tools"] == DEFAULT_TOOLS
    assert schema["semantics"]["feedback"].startswith("writes")


@pytest.mark.parametrize(
    ("function", "kwargs", "field"),
    [
        (mcp_server.memory_propose, {"content": " ", "actor_id": "actor", "project_id": "project"}, "content"),
        (mcp_server.memory_search, {"query": ""}, "query"),
        (mcp_server.memory_get, {"memory_id": "\t"}, "memory_id"),
        (mcp_server.memory_feedback, {"memory_id": "mem", "feedback": "useful", "actor_id": ""}, "actor_id"),
    ],
)
def test_empty_inputs(function, kwargs, field):
    with pytest.raises(ToolError, match=field):
        function(**kwargs)


def test_governance_direct_call_requires_policy_confirm_actor_reason_key(tmp_path, monkeypatch):
    monkeypatch.setenv("MEMORYNODE_HOME", str(tmp_path))
    with pytest.raises(ToolError, match="not enabled"):
        mcp_server.proposal_reject("proposal_1", "reviewer", "no", "key", True)
    config = tmp_path / "config"
    config.mkdir(parents=True)
    (config / "config.toml").write_text('[governance]\nallow_agent_reject = true\n', encoding="utf-8")
    for kwargs, field in (
        ({"proposal_id": "proposal_1", "actor_id": "", "reason": "no", "idempotency_key": "key", "confirm": True}, "actor_id"),
        ({"proposal_id": "proposal_1", "actor_id": "reviewer", "reason": "", "idempotency_key": "key", "confirm": True}, "reason"),
        ({"proposal_id": "proposal_1", "actor_id": "reviewer", "reason": "no", "idempotency_key": "", "confirm": True}, "idempotency_key"),
        ({"proposal_id": "proposal_1", "actor_id": "reviewer", "reason": "no", "idempotency_key": "key", "confirm": False}, "confirm"),
    ):
        with pytest.raises(ToolError, match=field):
            mcp_server.proposal_reject(**kwargs)


def test_api_unavailable_is_actionable_sanitized_and_traced(tmp_path):
    result = run(
        session_call(
            "memory_search",
            {"query": "secret-query"},
            {"MEMORYNODE_API_URL": "http://127.0.0.1:1", "MEMORYNODE_HOME": str(tmp_path)},
        )
    )
    assert result.isError
    text = result.content[0].text
    assert "start FastAPI" in text
    assert "Traceback" not in text
    log = (tmp_path / "logs" / "mcp.log").read_text(encoding="utf-8")
    rows = [json.loads(line) for line in log.splitlines()]
    assert rows[-1]["outcome"] == "error"
    assert rows[-1]["capability"] == "memory_search"
    assert "secret-query" not in log and "content" not in log and "raw_text" not in log
