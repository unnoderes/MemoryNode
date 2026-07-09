import json
import os
from typing import List

import httpx


__all__ = ["extract_memory_proposals"]

_ALLOWED_TYPES = {
    "user_preference",
    "project_constraint",
    "project_decision",
    "recurring_workflow",
    "known_pitfall",
    "fact",
}


class _QwenError(Exception):
    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code


def _config():
    api_key = os.getenv("QWEN_API_KEY")
    base_url = os.getenv("QWEN_BASE_URL")
    model = os.getenv("QWEN_MODEL")
    if not api_key or not base_url or not model:
        raise _QwenError(503, "Qwen config missing: set QWEN_API_KEY, QWEN_BASE_URL, QWEN_MODEL")
    return api_key, base_url.rstrip("/"), model


def _chat_url(base_url: str) -> str:
    if base_url.endswith("/chat/completions"):
        return base_url
    return f"{base_url}/chat/completions"


def _validate(data):
    items = data.get("proposals") if isinstance(data, dict) else None
    if not isinstance(items, list):
        raise ValueError("missing proposals list")
    for item in items:
        if not isinstance(item, dict):
            raise ValueError("proposal must be an object")
        for field in ("content", "type", "confidence", "source_quote", "reason"):
            if field not in item:
                raise ValueError(f"missing {field}")
        if item["type"] not in _ALLOWED_TYPES:
            raise ValueError("invalid type")
        if not isinstance(item["confidence"], (int, float)) or not 0 <= item["confidence"] <= 1:
            raise ValueError("invalid confidence")
    return items


def extract_memory_proposals(actor_id: str, project_id: str, messages: List[dict]):
    api_key, base_url, model = _config()
    prompt = (
        "Extract candidate long-term memories from the messages. "
        "Return strict JSON only: {\"proposals\":[{\"content\":\"...\",\"type\":\"fact\","
        "\"confidence\":0.0,\"source_quote\":\"...\",\"reason\":\"...\"}]}. "
        "Allowed type values: user_preference, project_constraint, project_decision, "
        "recurring_workflow, known_pitfall, fact. Return an empty proposals array if none."
    )
    body = {
        "model": model,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": prompt},
            {
                "role": "user",
                "content": json.dumps(
                    {"actor_id": actor_id, "project_id": project_id, "messages": messages},
                    ensure_ascii=False,
                ),
            },
        ],
    }
    try:
        response = httpx.post(
            _chat_url(base_url),
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=body,
            timeout=30,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
    except (httpx.HTTPError, KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
        raise _QwenError(502, "Qwen request failed") from exc

    try:
        return _validate(json.loads(content))
    except (TypeError, json.JSONDecodeError, ValueError) as exc:
        raise _QwenError(502, "Qwen returned malformed JSON") from exc
