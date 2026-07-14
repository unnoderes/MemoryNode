from argparse import Namespace
from pathlib import Path

import pytest

from memorynode.config import Paths, initialize, load_config, load_governance_policy


def source(tmp_path):
    (tmp_path / "backend/app").mkdir(parents=True)
    (tmp_path / "backend/app/main.py").touch()
    (tmp_path / "frontend").mkdir()
    (tmp_path / "frontend/package.json").touch()
    return tmp_path


def test_init_is_idempotent_without_source_and_rejects_explicit_invalid_source(tmp_path):
    paths = Paths(*(tmp_path / name for name in ("config", "data", "logs", "run")))
    assert initialize(paths=paths)
    original = paths.config_file.read_text()
    assert "allow_agent_set_expiry = false" in original
    assert not load_governance_policy(paths).allow_agent_revoke
    assert "[source]" not in original
    assert not initialize(paths=paths) and paths.config_file.read_text() == original
    with pytest.raises(ValueError): initialize(tmp_path / "missing", paths)
    assert not (tmp_path / ".env").exists()


def test_config_precedence_validation_and_home_override(tmp_path, monkeypatch):
    paths = Paths(*(tmp_path / name for name in ("config", "data", "logs", "run")))
    initialize(source(tmp_path / "repo"), paths)
    args = Namespace(source_root=str(tmp_path / "cli"), api_host=None, api_port=8000, console_host=None, console_port=None)
    config = load_config(args, paths, {"MEMORYNODE_API_PORT": "9000", "MEMORYNODE_CONSOLE_PORT": "3000"})
    assert config.api_port == 8000 and config.console_port == 3000 and config.source_root == tmp_path / "cli"
    for bad in (
        Namespace(source_root=None, api_host="0.0.0.0", api_port=None, console_host=None, console_port=None),
        Namespace(source_root=None, api_host=None, api_port=0, console_host=None, console_port=None),
        Namespace(source_root=None, api_host=None, api_port=9000, console_host=None, console_port=9000),
    ):
        with pytest.raises(ValueError): load_config(bad, paths, {})
    monkeypatch.setenv("MEMORYNODE_HOME", str(tmp_path / "home"))
    assert Paths.current().config == (tmp_path / "home/config").resolve()


@pytest.mark.parametrize("args,environ,ports", [
    (Namespace(source_root=None, api_host=None, api_port=8001, console_host=None, console_port=None), {}, (8001, 3000)),
    (Namespace(source_root=None, api_host=None, api_port=None, console_host=None, console_port=None), {"MEMORYNODE_API_PORT": "8001"}, (8001, 3000)),
    (Namespace(source_root=None, api_host=None, api_port=None, console_host=None, console_port=3001), {}, (8000, 3001)),
    (Namespace(source_root=None, api_host=None, api_port=None, console_host=None, console_port=None), {"MEMORYNODE_CONSOLE_PORT": "3001"}, (8000, 3001)),
])
def test_configurable_ports(tmp_path, args, environ, ports):
    paths = Paths(*(tmp_path / name for name in ("config", "data", "logs", "run")))
    initialize(source(tmp_path / "repo"), paths)
    config = load_config(args, paths, environ)
    assert (config.api_port, config.console_port) == ports


def test_toml_ports_and_legacy_source_are_compatible(tmp_path):
    paths = Paths(*(tmp_path / name for name in ("config", "data", "logs", "run")))
    initialize(source(tmp_path / "repo"), paths)
    paths.config_file.write_text(paths.config_file.read_text().replace("port = 8000", "port = 9000"))
    config = load_config(paths=paths, environ={})
    assert config.api_port == 9000 and config.source_root is not None


def test_old_config_is_never_overwritten(tmp_path):
    paths = Paths(*(tmp_path / name for name in ("config", "data", "logs", "run")))
    paths.create()
    old = '[server]\nport=8123\n[source]\nroot="C:/old/repository"\n[governance]\nallow_agent_revoke=true\n'
    paths.config_file.write_text(old)
    assert not initialize(paths=paths)
    assert paths.config_file.read_text() == old
    config = load_config(paths=paths, environ={})
    assert config.api_port == 8123 and config.governance.allow_agent_revoke


def test_governance_policy_requires_real_toml_booleans(tmp_path):
    paths = Paths(*(tmp_path / name for name in ("config", "data", "logs", "run")))
    initialize(source(tmp_path / "repo"), paths)
    text = paths.config_file.read_text().replace("allow_agent_reject = false", "allow_agent_reject = true")
    paths.config_file.write_text(text)
    assert load_governance_policy(paths).allow_agent_reject
    paths.config_file.write_text(text.replace("allow_agent_reject = true", 'allow_agent_reject = "true"'))
    with pytest.raises(ValueError, match="TOML boolean"):
        load_governance_policy(paths)


@pytest.mark.parametrize("system", ["Windows", "Darwin", "Linux"])
def test_platformdirs_are_used_for_each_platform(monkeypatch, tmp_path, system):
    class Dirs:
        user_config_path = tmp_path / system / "config"
        user_data_path = tmp_path / system / "data"
        user_log_path = tmp_path / system / "logs"
        user_runtime_path = tmp_path / system / "run"
    monkeypatch.delenv("MEMORYNODE_HOME", raising=False)
    monkeypatch.setattr("memorynode.config.PlatformDirs", lambda *_args, **_kwargs: Dirs())
    assert Paths.current().run == tmp_path / system / "run"
