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
    wire_api = os.getenv("QWEN_WIRE_API", "chat").strip().lower()
    if wire_api not in {"chat", "responses"}:
        raise _QwenError(503, "QWEN_WIRE_API must be chat or responses")
    reasoning_effort = os.getenv("QWEN_REASONING_EFFORT", "medium").strip()
    return api_key, base_url.rstrip("/"), model, wire_api, reasoning_effort


def _chat_url(base_url: str) -> str:
    if base_url.endswith("/chat/completions"):
        return base_url
    if base_url.endswith("/v1"):
        return f"{base_url}/chat/completions"
    return f"{base_url}/v1/chat/completions"


def _responses_url(base_url: str) -> str:
    if base_url.endswith("/responses"):
        return base_url
    if base_url.endswith("/v1"):
        return f"{base_url}/responses"
    return f"{base_url}/v1/responses"


def _response_text(data):
    if isinstance(data.get("output_text"), str):
        return data["output_text"]
    for item in data.get("output", []):
        for part in item.get("content", []):
            if part.get("type") in {"output_text", "text"} and isinstance(part.get("text"), str):
                return part["text"]
    raise KeyError("output_text")


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
    api_key, base_url, model, wire_api, reasoning_effort = _config()
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
    if wire_api == "responses":
        body = {
            "model": model,
            "input": [
                {"role": "system", "content": prompt},
                {
                    "role": "user",
                    "content": json.dumps(
                        {"actor_id": actor_id, "project_id": project_id, "messages": messages},
                        ensure_ascii=False,
                    ),
                },
            ],
            "text": {"format": {"type": "json_object"}},
        }
        if reasoning_effort:
            body["reasoning"] = {"effort": reasoning_effort}
    try:
        response = httpx.post(
            _responses_url(base_url) if wire_api == "responses" else _chat_url(base_url),
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=body,
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
        content = _response_text(data) if wire_api == "responses" else data["choices"][0]["message"]["content"]
    except (httpx.HTTPError, KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
        raise _QwenError(502, "Qwen request failed") from exc

    try:
        return _validate(json.loads(content))
    except (TypeError, json.JSONDecodeError, ValueError) as exc:
        raise _QwenError(502, "Qwen returned malformed JSON") from exc
