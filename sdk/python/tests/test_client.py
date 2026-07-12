import httpx
import pytest

from memorynode import (
    MemoryNodeClient,
    MemoryNodeConnectionError,
    MemoryNodeHTTPError,
    MemoryNodeTimeoutError,
)


def client(handler):
    return MemoryNodeClient(transport=httpx.MockTransport(handler))


def test_request_shapes_and_unicode_encoding():
    requests = []

    def handler(request):
        requests.append(request)
        if request.url.path.endswith("/search"):
            return httpx.Response(200, json={"memories": []})
        return httpx.Response(200, json={"ok": True})

    api = client(handler)
    with api:
        assert api.health() == {"ok": True}
        api.extract_proposals("用户", "中文 项目", "以后回答使用中文")
        assert api.search_memories("语言 偏好") == {"memories": []}
        api.explain_memory("mem/中文")
    assert api._client.is_closed

    assert requests[1].method == "POST"
    assert requests[1].read().decode() == (
        '{"actor_id":"用户","project_id":"中文 项目","messages":'
        '[{"role":"user","content":"以后回答使用中文"}]}'
    )
    assert requests[2].url.params["q"] == "语言 偏好"
    assert requests[3].url.path == "/v1/memories/mem/中文/explain"
    assert requests[3].url.raw_path == b"/v1/memories/mem%2F%E4%B8%AD%E6%96%87/explain"


@pytest.mark.parametrize(
    ("status", "detail", "expected"),
    [
        (400, "bad input", "bad input"),
        (404, "memory not found", "memory not found"),
        (409, "only active memories", "only active memories"),
        (422, "invalid value", "invalid value"),
        (502, "traceback API_KEY=secret", "server or model service failure"),
    ],
)
def test_http_error_mapping_is_sanitized(status, detail, expected):
    with client(lambda _: httpx.Response(status, json={"detail": detail})) as api:
        with pytest.raises(MemoryNodeHTTPError) as caught:
            api.health()
    assert caught.value.status_code == status
    assert expected in str(caught.value)
    assert "secret" not in str(caught.value)


def test_connection_and_timeout_mapping():
    def unavailable(request):
        raise httpx.ConnectError("secret host", request=request)

    with client(unavailable) as api:
        with pytest.raises(MemoryNodeConnectionError, match="start FastAPI"):
            api.health()

    def timeout(request):
        raise httpx.ReadTimeout("secret timeout", request=request)

    with client(timeout) as api:
        with pytest.raises(MemoryNodeTimeoutError, match="timed out"):
            api.health()
