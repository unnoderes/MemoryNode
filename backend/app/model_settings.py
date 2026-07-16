"""Local, redacted model-provider configuration for the single-user runtime."""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

try:
    import tomllib
except ImportError:  # pragma: no cover - Python 3.10 fallback
    import tomli as tomllib


class ModelConfigError(Exception):
    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code


@dataclass(frozen=True)
class ModelConfig:
    api_key: str
    base_url: str
    model: str
    wire_api: str = "chat"
    reasoning_effort: str = "medium"
    source: str = "local"


def model_config_path() -> Path:
    """Return a local config path without exposing it through API responses."""
    override = os.getenv("MEMORYNODE_MODEL_CONFIG_PATH")
    if override:
        return Path(override).expanduser().resolve()
    if home := os.getenv("MEMORYNODE_HOME"):
        return Path(home).expanduser().resolve() / "config" / "model.toml"
    if sys.platform == "win32":
        root = Path(os.getenv("APPDATA", Path.home() / "AppData" / "Roaming"))
    elif sys.platform == "darwin":
        root = Path.home() / "Library" / "Application Support"
    else:
        root = Path(os.getenv("XDG_CONFIG_HOME", Path.home() / ".config"))
    return root / "MemoryNode" / "model.toml"


def _clean_base_url(value: object) -> str:
    base_url = str(value or "").strip().rstrip("/")
    parsed = urlsplit(base_url)
    if (
        parsed.scheme not in {"http", "https"}
        or not parsed.hostname
        or parsed.username
        or parsed.password
        or parsed.fragment
        or parsed.query
    ):
        raise ModelConfigError(422, "Base URL must be an http or https URL without credentials, query, or fragment.")
    return urlunsplit((parsed.scheme, parsed.netloc, parsed.path, "", "")).rstrip("/")


def _clean_model(value: object) -> str:
    model = str(value or "").strip()
    if not model or len(model) > 200:
        raise ModelConfigError(422, "Model must be between 1 and 200 characters.")
    return model


def _clean_wire_api(value: object) -> str:
    wire_api = str(value or "chat").strip().lower()
    if wire_api not in {"chat", "responses"}:
        raise ModelConfigError(422, "Wire API must be chat or responses.")
    return wire_api


def _clean_reasoning_effort(value: object) -> str:
    reasoning_effort = str(value if value is not None else "medium").strip()
    if len(reasoning_effort) > 50:
        raise ModelConfigError(422, "Reasoning effort must be 50 characters or fewer.")
    return reasoning_effort


def validate_model_config(payload: dict, *, source: str = "local") -> ModelConfig:
    api_key = str(payload.get("api_key") or "").strip()
    if not api_key:
        raise ModelConfigError(422, "API key is required.")
    return ModelConfig(
        api_key=api_key,
        base_url=_clean_base_url(payload.get("base_url")),
        model=_clean_model(payload.get("model")),
        wire_api=_clean_wire_api(payload.get("wire_api")),
        reasoning_effort=_clean_reasoning_effort(payload.get("reasoning_effort")),
        source=source,
    )


def _toml_string(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")


def _write_restrictive(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        os.chmod(path.parent, 0o700)
    except OSError:
        pass
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(text, encoding="utf-8")
    try:
        os.chmod(temporary, 0o600)
    except OSError:
        pass
    temporary.replace(path)
    try:
        os.chmod(path, 0o600)
    except OSError:
        pass


def load_local_model_config() -> ModelConfig | None:
    path = model_config_path()
    if not path.is_file():
        return None
    try:
        with path.open("rb") as stream:
            raw = tomllib.load(stream)
        model = raw.get("model", {})
        if not isinstance(model, dict) or model.get("provider") != "qwen_compatible":
            raise ValueError("invalid provider")
        return validate_model_config(model, source="local")
    except (OSError, ValueError, TypeError, tomllib.TOMLDecodeError, ModelConfigError) as exc:
        raise ModelConfigError(503, "Saved model configuration is invalid. Update it in Model Settings.") from exc


def save_local_model_config(payload: dict, *, keep_existing_api_key: bool = False) -> ModelConfig:
    saved = load_local_model_config() if keep_existing_api_key else None
    candidate = dict(payload)
    if keep_existing_api_key:
        if saved is None:
            raise ModelConfigError(422, "No saved API key is available to keep.")
        candidate["api_key"] = saved.api_key
    config = validate_model_config(candidate, source="local")
    text = "\n".join(
        [
            "[model]",
            'provider = "qwen_compatible"',
            f'base_url = "{_toml_string(config.base_url)}"',
            f'model = "{_toml_string(config.model)}"',
            f'wire_api = "{_toml_string(config.wire_api)}"',
            f'reasoning_effort = "{_toml_string(config.reasoning_effort)}"',
            f'api_key = "{_toml_string(config.api_key)}"',
            "",
        ]
    )
    _write_restrictive(model_config_path(), text)
    return config


def delete_local_model_config() -> None:
    try:
        model_config_path().unlink(missing_ok=True)
    except OSError as exc:
        raise ModelConfigError(500, "Saved model configuration could not be deleted.") from exc


def environment_model_config() -> ModelConfig | None:
    values = {name: os.getenv(name) for name in ("QWEN_API_KEY", "QWEN_BASE_URL", "QWEN_MODEL")}
    if not all(values.values()):
        return None
    try:
        return validate_model_config(
            {
                "api_key": values["QWEN_API_KEY"],
                "base_url": values["QWEN_BASE_URL"],
                "model": values["QWEN_MODEL"],
                "wire_api": os.getenv("QWEN_WIRE_API", "chat"),
                "reasoning_effort": os.getenv("QWEN_REASONING_EFFORT", "medium"),
            },
            source="environment",
        )
    except ModelConfigError as exc:
        raise ModelConfigError(503, "Qwen environment configuration is invalid.") from exc


def resolve_model_config() -> ModelConfig:
    environment = environment_model_config()
    if environment is not None:
        return environment
    local = load_local_model_config()
    if local is not None:
        return local
    raise ModelConfigError(
        503,
        "Model extraction is not configured. Set QWEN environment variables or configure a model in Settings.",
    )


def redact_model_config(config: ModelConfig | None = None) -> dict:
    if config is None:
        try:
            config = resolve_model_config()
        except ModelConfigError:
            return {"configured": False, "source": "missing", "api_key_set": False, "api_key_hint": None, "env_override": False}
    return {
        "configured": True,
        "source": config.source,
        "base_url": config.base_url,
        "model": config.model,
        "wire_api": config.wire_api,
        "reasoning_effort": config.reasoning_effort,
        "api_key_set": True,
        "api_key_hint": None if config.source == "environment" else f"****{config.api_key[-4:]}",
        "env_override": config.source == "environment",
    }
