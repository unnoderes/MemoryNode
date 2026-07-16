import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.qwen import extract_memory_proposals


SECRET = "sk-memorynode-test-secret"


@pytest.fixture(autouse=True)
def isolated_model_config(tmp_path, monkeypatch):
    monkeypatch.setenv("MEMORYNODE_MODEL_CONFIG_PATH", str(tmp_path / "model.toml"))
    for name in ("QWEN_API_KEY", "QWEN_BASE_URL", "QWEN_MODEL", "QWEN_WIRE_API", "QWEN_REASONING_EFFORT"):
        monkeypatch.delenv(name, raising=False)


def payload(**overrides):
    value = {
        "provider": "qwen_compatible",
        "base_url": "https://example.com/compatible-mode/",
        "model": "qwen-plus",
        "wire_api": "chat",
        "reasoning_effort": "medium",
        "api_key": SECRET,
    }
    value.update(overrides)
    return value


def test_missing_config_returns_sanitized_actionable_503():
    with TestClient(app) as client:
        response = client.post(
            "/v1/proposals/extract",
            json={"actor_id": "actor", "project_id": "project", "messages": [{"role": "user", "content": "Remember this."}]},
        )
    assert response.status_code == 503
    assert "Settings" in response.json()["detail"]
    assert SECRET not in response.text


def test_save_read_delete_settings_redacts_key():
    with TestClient(app) as client:
        saved = client.put("/v1/settings/model", json=payload())
        assert saved.status_code == 200
        assert saved.json()["api_key_hint"] == "****cret"
        assert SECRET not in saved.text

        loaded = client.get("/v1/settings/model")
        assert loaded.json()["source"] == "local"
        assert loaded.json()["api_key_set"] is True
        assert SECRET not in loaded.text

        deleted = client.delete("/v1/settings/model")
        assert deleted.status_code == 200
        assert deleted.json()["source"] == "missing"


def test_environment_wins_over_local_settings(monkeypatch):
    with TestClient(app) as client:
        assert client.put("/v1/settings/model", json=payload(model="local-model")).status_code == 200
        monkeypatch.setenv("QWEN_API_KEY", "env-key")
        monkeypatch.setenv("QWEN_BASE_URL", "https://env.example")
        monkeypatch.setenv("QWEN_MODEL", "env-model")
        settings = client.get("/v1/settings/model").json()
    assert settings["source"] == "environment"
    assert settings["model"] == "env-model"
    assert settings["env_override"] is True
    assert settings["api_key_hint"] is None
    assert "env-key" not in str(settings)


@pytest.mark.parametrize(
    "changes",
    [
        {"base_url": "ftp://example.com"},
        {"base_url": "https://user:pass@example.com"},
        {"base_url": "https://example.com/#fragment"},
        {"model": "   "},
        {"wire_api": "invalid"},
    ],
)
def test_invalid_settings_are_rejected(changes):
    with TestClient(app) as client:
        response = client.put("/v1/settings/model", json=payload(**changes))
    assert response.status_code == 422
    assert SECRET not in response.text


def test_connection_test_success_and_failure_are_sanitized(monkeypatch):
    calls = []

    def success(url, api_key, body):
        calls.append((url, api_key, body))
        return {"choices": [{"message": {"content": '{"proposals": []}'}}]}

    monkeypatch.setattr("app.qwen._post_json", success)
    with TestClient(app) as client:
        response = client.post("/v1/settings/model/test", json=payload())
    assert response.status_code == 200
    assert response.json()["ok"] is True
    assert calls and calls[0][1] == SECRET
    assert SECRET not in response.text

    def failure(*_args):
        raise RuntimeError(f"Authorization: Bearer {SECRET}")

    monkeypatch.setattr("app.qwen._post_json", failure)
    with TestClient(app) as client:
        response = client.post("/v1/settings/model/test", json=payload())
    assert response.status_code == 200
    assert response.json() == {"ok": False, "error": "Model request failed. Check Base URL, model, key, and wire API."}
    assert SECRET not in response.text


def test_extraction_uses_saved_local_config_without_environment(monkeypatch):
    calls = []

    def fake_post(url, api_key, body):
        calls.append((url, api_key, body))
        return {
            "choices": [{"message": {"content": '{"proposals":[{"content":"Remember local config.","type":"fact","confidence":0.9,"source_quote":"local","reason":"test"}]}'}}]
        }

    monkeypatch.setattr("app.qwen._post_json", fake_post)
    with TestClient(app) as client:
        assert client.put("/v1/settings/model", json=payload()).status_code == 200
    proposals = extract_memory_proposals("actor", "project", [{"role": "user", "content": "Remember local config."}])
    assert proposals[0]["content"] == "Remember local config."
    assert calls[0][0] == "https://example.com/compatible-mode/v1/chat/completions"
    assert calls[0][1] == SECRET


def test_local_config_file_is_not_created_in_repository():
    with TestClient(app) as client:
        assert client.put("/v1/settings/model", json=payload()).status_code == 200
    configured_path = Path(os.environ["MEMORYNODE_MODEL_CONFIG_PATH"])
    assert configured_path.name == "model.toml"
    assert configured_path.exists()
