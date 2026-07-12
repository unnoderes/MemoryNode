import asyncio
import sys

import pytest
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from mcp.server.fastmcp.exceptions import ToolError

from memorynode import mcp_server


def run(coro):
    return asyncio.run(coro)


async def session_call(name=None, arguments=None, env=None):
    params = StdioServerParameters(
        command=sys.executable,
        args=["-m", "memorynode"],
        env=env,
    )
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            if name is None:
                return await session.list_tools()
            return await session.call_tool(name, arguments or {})


def test_tool_discovery_and_clean_stdio():
    tools = run(session_call()).tools
    assert [tool.name for tool in tools] == [
        "memory_propose",
        "memory_search",
        "memory_explain",
    ]


@pytest.mark.parametrize(
    ("function", "args", "field"),
    [
        (mcp_server.memory_propose, (" ", "actor", "project"), "content"),
        (mcp_server.memory_search, ("",), "query"),
        (mcp_server.memory_explain, ("\t",), "memory_id"),
    ],
)
def test_empty_inputs(function, args, field):
    with pytest.raises(ToolError, match=field):
        function(*args)


def test_api_unavailable_is_actionable_and_sanitized():
    result = run(
        session_call(
            "memory_search",
            {"query": "anything"},
            {"MEMORYNODE_API_URL": "http://127.0.0.1:1"},
        )
    )
    assert result.isError
    text = result.content[0].text
    assert "start FastAPI" in text
    assert "Traceback" not in text
