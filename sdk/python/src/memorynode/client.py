from __future__ import annotations

from datetime import datetime
from typing import Any
from urllib.parse import quote
from uuid import uuid4

import httpx
from pydantic import ValidationError

from .errors import (
    MemoryNodeConflictError, MemoryNodeConnectionError, MemoryNodeHTTPError,
    MemoryNodeNotFoundError, MemoryNodeResponseError, MemoryNodeServerError,
    MemoryNodeTimeoutError, MemoryNodeValidationError,
)
from .models import Health, Memory, MemoryEvent, MemoryEventList, MemoryExplanation, MemoryList, Proposal, ProposalExtraction, ProposalList, Source


def _path(value: str) -> str:
    return quote(value, safe="")


def _params(values: dict) -> dict:
    return {key: value for key, value in values.items() if value is not None}


class StatusResource:
    def __init__(self, client): self._client = client
    def check(self, **options) -> Health: return self._client._request("GET", "/health", Health, **options)


class ProposalsResource:
    def __init__(self, client): self._client = client

    def create(self, content: str, *, type: str = "fact", actor_id: str = "demo-user", project_id: str = "memorynode-demo", raw_text: str | None = None, confidence: float = 1.0, source_quote: str | None = None, reason: str | None = None, **options) -> Proposal:
        return self._client._request("POST", "/v1/proposals", Proposal, json={"content": content, "type": type, "actor_id": actor_id, "project_id": project_id, "raw_text": raw_text, "confidence": confidence, "source_quote": source_quote, "reason": reason}, **options)

    def extract(self, *, actor_id: str, project_id: str, content: str | None = None, messages: list[dict[str, str]] | None = None, **options) -> ProposalExtraction:
        if (content is None) == (messages is None):
            raise ValueError("provide exactly one of content or messages")
        messages = [{"role": "user", "content": content}] if content is not None else messages
        return self._client._request("POST", "/v1/proposals/extract", ProposalExtraction, json={"actor_id": actor_id, "project_id": project_id, "messages": messages}, **options)

    def list(self, status: str | None = None, **options) -> ProposalList:
        return self._client._request("GET", "/v1/proposals", ProposalList, params={"status": status} if status is not None else None, **options)

    def get(self, proposal_id: str, **options) -> Proposal:
        return self._client._request("GET", f"/v1/proposals/{_path(proposal_id)}", Proposal, **options)

    def related_memories(self, proposal_id: str, **options) -> MemoryList:
        return self._client._request("GET", f"/v1/proposals/{_path(proposal_id)}/related-memories", MemoryList, **options)

    def approve(self, proposal_id: str, *, actor_id: str = "reviewer", note: str | None = None, supersede_memory_id: str | None = None, expires_at: datetime | str | None = None, idempotency_key: str | None = None, **options) -> Memory:
        if isinstance(expires_at, datetime): expires_at = expires_at.isoformat()
        return self._client._request("POST", f"/v1/proposals/{_path(proposal_id)}/approve", Memory, json={"actor_id": actor_id, "note": note, "supersede_memory_id": supersede_memory_id, "expires_at": expires_at, "idempotency_key": idempotency_key}, **options)

    def reject(self, proposal_id: str, *, actor_id: str = "reviewer", note: str | None = None, idempotency_key: str | None = None, **options) -> Proposal:
        return self._client._request("POST", f"/v1/proposals/{_path(proposal_id)}/reject", Proposal, json={"actor_id": actor_id, "note": note, "idempotency_key": idempotency_key}, **options)


class SourcesResource:
    def __init__(self, client): self._client = client
    def get(self, source_id: str, **options) -> Source: return self._client._request("GET", f"/v1/sources/{_path(source_id)}", Source, **options)


class EventsResource:
    def __init__(self, client): self._client = client
    def get(self, event_id: str, **options) -> MemoryEvent: return self._client._request("GET", f"/v1/events/{_path(event_id)}", MemoryEvent, **options)
    def list_recent(self, limit: int = 50, **options) -> MemoryEventList: return self._client._request("GET", "/v1/events", MemoryEventList, params={"limit": limit}, **options)


class MemoriesResource:
    def __init__(self, client): self._client = client
    def search(self, query: str, *, include_inactive: bool = False, **options) -> MemoryList: return self._client._request("GET", "/v1/memories/search", MemoryList, params={"q": query, "include_inactive": include_inactive}, **options)
    def list(self, *, actor_id: str | None = None, project_id: str | None = None, status: str = "active", type: str | None = None, source_id: str | None = None, created_after: datetime | str | None = None, created_before: datetime | str | None = None, limit: int = 50, offset: int = 0, **options) -> MemoryList:
        if isinstance(created_after, datetime): created_after = created_after.isoformat()
        if isinstance(created_before, datetime): created_before = created_before.isoformat()
        return self._client._request("GET", "/v1/memories", MemoryList, params=_params({"actor_id": actor_id, "project_id": project_id, "status": status, "type": type, "source_id": source_id, "created_after": created_after, "created_before": created_before, "limit": limit, "offset": offset}), **options)
    def get(self, memory_id: str, **options) -> Memory: return self._client._request("GET", f"/v1/memories/{_path(memory_id)}", Memory, **options)
    def explain(self, memory_id: str, **options) -> MemoryExplanation: return self._client._request("GET", f"/v1/memories/{_path(memory_id)}/explain", MemoryExplanation, **options)
    def revoke(self, memory_id: str, *, actor_id: str = "reviewer", note: str | None = None, idempotency_key: str | None = None, **options) -> Memory: return self._client._request("POST", f"/v1/memories/{_path(memory_id)}/revoke", Memory, json={"actor_id": actor_id, "note": note, "idempotency_key": idempotency_key}, **options)
    def feedback(self, memory_id: str, *, feedback: str, actor_id: str, note: str | None = None, idempotency_key: str | None = None, **options) -> MemoryEvent: return self._client._request("POST", f"/v1/memories/{_path(memory_id)}/feedback", MemoryEvent, json={"feedback": feedback, "actor_id": actor_id, "note": note, "idempotency_key": idempotency_key}, **options)
    def set_expiry(self, memory_id: str, *, actor_id: str, note: str, expires_at: datetime | str, idempotency_key: str | None = None, **options) -> Memory:
        if isinstance(expires_at, datetime): expires_at = expires_at.isoformat()
        return self._client._request("POST", f"/v1/memories/{_path(memory_id)}/expiry", Memory, json={"actor_id": actor_id, "note": note, "expires_at": expires_at, "idempotency_key": idempotency_key}, **options)


class MemoryNodeClient:
    api_version = "v1"

    def __init__(self, base_url: str = "http://127.0.0.1:8000", timeout: float | httpx.Timeout = 10.0, *, transport: httpx.BaseTransport | None = None):
        self._client = httpx.Client(base_url=base_url.rstrip("/"), timeout=timeout, transport=transport, trust_env=False)
        self.status, self.sources, self.proposals, self.memories, self.events = StatusResource(self), SourcesResource(self), ProposalsResource(self), MemoriesResource(self), EventsResource(self)

    def __enter__(self): return self
    def __exit__(self, *_): self.close()
    def close(self): self._client.close()

    def health(self, **options) -> dict: return self.status.check(**options).dump()
    def extract_proposals(self, actor_id: str, project_id: str, content: str, **options) -> dict: return self.proposals.extract(actor_id=actor_id, project_id=project_id, content=content, **options).dump()
    def search_memories(self, query: str, **options) -> dict: return self.memories.search(query, **options).dump()
    def explain_memory(self, memory_id: str, **options) -> dict: return self.memories.explain(memory_id, **options).dump()

    def _request(self, method: str, path: str, model, *, timeout: float | httpx.Timeout | None = None, request_id: str | None = None, **kwargs):
        request_id = uuid4().hex if request_id is None else request_id
        if len(request_id) > 128 or not request_id or any(ord(c) < 33 or ord(c) > 126 for c in request_id):
            raise ValueError("request_id must be 1-128 printable ASCII characters without whitespace")
        try:
            response = self._client.request(method, path, headers={"X-Request-ID": request_id}, timeout=timeout if timeout is not None else self._client.timeout, **kwargs)
        except httpx.TimeoutException as exc:
            raise MemoryNodeTimeoutError("MemoryNode API request timed out; retry after checking the local API.", request_id=request_id) from exc
        except httpx.RequestError as exc:
            raise MemoryNodeConnectionError("MemoryNode API is unavailable; start FastAPI on the configured base URL.", request_id=request_id) from exc
        if response.is_error:
            detail = self._safe_detail(response)
            error = MemoryNodeServerError if response.status_code >= 500 else {400: MemoryNodeValidationError, 422: MemoryNodeValidationError, 404: MemoryNodeNotFoundError, 409: MemoryNodeConflictError}.get(response.status_code, MemoryNodeHTTPError)
            raise error(f"MemoryNode API returned HTTP {response.status_code}: {detail}", request_id=request_id, status_code=response.status_code, detail=detail)
        try:
            return model.model_validate(response.json())
        except (ValueError, TypeError, ValidationError) as exc:
            raise MemoryNodeResponseError("MemoryNode API returned an invalid success response.", request_id=request_id, status_code=response.status_code) from exc

    @staticmethod
    def _safe_detail(response: httpx.Response) -> str:
        if response.status_code >= 500: return "server or model service failure"
        try: detail: Any = response.json().get("detail")
        except (ValueError, AttributeError): detail = None
        if not isinstance(detail, str) or len(detail) > 500 or any(token in detail.lower() for token in ("api_key", "api key", "authorization", ".env", "traceback", "database", "secret", "token")): return "request failed"
        return detail
