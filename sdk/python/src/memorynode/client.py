from urllib.parse import quote

import httpx

from .errors import (
    MemoryNodeConnectionError,
    MemoryNodeHTTPError,
    MemoryNodeTimeoutError,
)


class MemoryNodeClient:
    def __init__(
        self,
        base_url: str = "http://127.0.0.1:8000",
        timeout: float = 10.0,
        *,
        transport: httpx.BaseTransport | None = None,
    ):
        self._client = httpx.Client(
            base_url=base_url.rstrip("/"),
            timeout=timeout,
            transport=transport,
            trust_env=False,
        )

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()

    def close(self):
        self._client.close()

    def health(self) -> dict:
        return self._request("GET", "/health")

    def extract_proposals(self, actor_id: str, project_id: str, content: str) -> dict:
        return self._request(
            "POST",
            "/v1/proposals/extract",
            json={
                "actor_id": actor_id,
                "project_id": project_id,
                "messages": [{"role": "user", "content": content}],
            },
        )

    def search_memories(self, query: str) -> dict:
        return self._request("GET", "/v1/memories/search", params={"q": query})

    def explain_memory(self, memory_id: str) -> dict:
        return self._request(
            "GET", f"/v1/memories/{quote(memory_id, safe='')}/explain"
        )

    def _request(self, method: str, path: str, **kwargs) -> dict:
        try:
            response = self._client.request(method, path, **kwargs)
        except httpx.TimeoutException as exc:
            raise MemoryNodeTimeoutError(
                "MemoryNode API request timed out; retry after checking the local API."
            ) from exc
        except httpx.RequestError as exc:
            raise MemoryNodeConnectionError(
                "MemoryNode API is unavailable; start FastAPI on the configured base URL."
            ) from exc
        if response.is_error:
            detail = self._safe_detail(response)
            raise MemoryNodeHTTPError(
                response.status_code,
                f"MemoryNode API returned HTTP {response.status_code}: {detail}",
            )
        return response.json()

    @staticmethod
    def _safe_detail(response: httpx.Response) -> str:
        if response.status_code >= 500:
            return "server or model service failure"
        try:
            detail = response.json().get("detail")
        except (ValueError, AttributeError):
            detail = None
        if not isinstance(detail, str) or any(
            token in detail.lower()
            for token in ("api_key", "authorization", ".env", "traceback", "database")
        ):
            return "request failed"
        return detail
