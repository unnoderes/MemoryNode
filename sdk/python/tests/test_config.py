from argparse import Namespace
from pathlib import Path

import pytest

from memorynode.config import Paths, initialize, load_config


def source(tmp_path):
    (tmp_path / "backend/app").mkdir(parents=True)
    (tmp_path / "backend/app/main.py").touch()
    (tmp_path / "frontend").mkdir()
    (tmp_path / "frontend/package.json").touch()
    return tmp_path


def test_init_is_idempotent_and_rejects_invalid_source(tmp_path):
    paths = Paths(*(tmp_path / name for name in ("config", "data", "logs", "run")))
    root = source(tmp_path / "repo")
    assert initialize(root, paths)
    original = paths.config_file.read_text()
    assert not initialize(root, paths) and paths.config_file.read_text() == original
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


@pytest.mark.parametrize("args,environ", [
    (Namespace(source_root=None, api_host=None, api_port=8001, console_host=None, console_port=None), {}),
    (Namespace(source_root=None, api_host=None, api_port=None, console_host=None, console_port=None), {"MEMORYNODE_API_PORT": "8001"}),
    (Namespace(source_root=None, api_host=None, api_port=None, console_host=None, console_port=3001), {}),
    (Namespace(source_root=None, api_host=None, api_port=None, console_host=None, console_port=None), {"MEMORYNODE_CONSOLE_PORT": "3001"}),
])
def test_phase3_rejects_configurable_ports(tmp_path, args, environ):
    paths = Paths(*(tmp_path / name for name in ("config", "data", "logs", "run")))
    initialize(source(tmp_path / "repo"), paths)
    with pytest.raises(ValueError, match="deferred to Phase 6"):
        load_config(args, paths, environ)


def test_phase3_rejects_toml_ports(tmp_path):
    paths = Paths(*(tmp_path / name for name in ("config", "data", "logs", "run")))
    initialize(source(tmp_path / "repo"), paths)
    paths.config_file.write_text(paths.config_file.read_text().replace("port = 8000", "port = 9000"))
    with pytest.raises(ValueError, match="API port 8000 and console port 3000"):
        load_config(paths=paths, environ={})


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
