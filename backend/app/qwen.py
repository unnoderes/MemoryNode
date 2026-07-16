import json
from typing import List, Optional
from urllib.request import Request, urlopen


from .model_settings import ModelConfig, ModelConfigError, resolve_model_config


__all__ = ["extract_memory_proposals", "test_model_config"]

_ALLOWED_TYPES = {
    "user_preference",
    "project_constraint",
    "project_decision",
    "recurring_workflow",
    "known_pitfall",
    "fact",
}


_QwenError = ModelConfigError


def _config():
    config = resolve_model_config()
    return config.api_key, config.base_url, config.model, config.wire_api, config.reasoning_effort


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


def _post_json(url: str, api_key: str, body: dict):
    request = Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    with urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


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


def _extract_with_config(config: ModelConfig, actor_id: str, project_id: str, messages: List[dict]):
    api_key, base_url, model, wire_api, reasoning_effort = (
        config.api_key,
        config.base_url,
        config.model,
        config.wire_api,
        config.reasoning_effort,
    )
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
        data = _post_json(
            _responses_url(base_url) if wire_api == "responses" else _chat_url(base_url),
            api_key,
            body,
        )
        content = _response_text(data) if wire_api == "responses" else data["choices"][0]["message"]["content"]
    except Exception as exc:
        raise _QwenError(502, "Qwen request failed") from exc

    try:
        return _validate(json.loads(content))
    except (TypeError, json.JSONDecodeError, ValueError) as exc:
        raise _QwenError(502, "Qwen returned malformed JSON") from exc


def extract_memory_proposals(actor_id: str, project_id: str, messages: List[dict]):
    return _extract_with_config(resolve_model_config(), actor_id, project_id, messages)


def test_model_config(config: Optional[ModelConfig] = None) -> None:
    config = config or resolve_model_config()
    _extract_with_config(
        config,
        actor_id="model-settings-test",
        project_id="model-settings-test",
        messages=[{"role": "user", "content": "Return no long-term memories."}],
    )
