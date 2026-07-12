import os

from mcp.server.fastmcp import FastMCP
from mcp.server.fastmcp.exceptions import ToolError

from .client import MemoryNodeClient
from .errors import MemoryNodeError


mcp = FastMCP(
    "MemoryNode",
    instructions=(
        "Submit new information as pending proposals. Search returns only currently "
        "effective memories. Related memories are candidates, not automatic conflict decisions; "
        "expiration is request-driven."
    ),
    log_level="WARNING",
)


def _call(method: str, *args):
    try:
        with MemoryNodeClient(
            base_url=os.getenv("MEMORYNODE_API_URL", "http://127.0.0.1:8000")
        ) as client:
            return getattr(client, method)(*args)
    except MemoryNodeError as exc:
        raise ToolError(str(exc)) from None


def _required(value: str, name: str) -> str:
    if not value.strip():
        raise ToolError(f"{name} must not be empty")
    return value


@mcp.tool()
def memory_propose(content: str, actor_id: str, project_id: str) -> dict:
    """Create pending memory proposals from content; never approves them."""
    return _call(
        "extract_proposals",
        _required(actor_id, "actor_id"),
        _required(project_id, "project_id"),
        _required(content, "content"),
    )


@mcp.tool()
def memory_search(query: str) -> dict:
    """Search currently effective memories; an empty result is successful."""
    return _call("search_memories", _required(query, "query"))


@mcp.tool()
def memory_explain(memory_id: str) -> dict:
    """Return source, proposal, memory, events, and replacement relationships."""
    return _call("explain_memory", _required(memory_id, "memory_id"))


def main():
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
