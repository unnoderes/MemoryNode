from argparse import Namespace
import json
import sys
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock

import pytest

import memorynode
from memorynode import cli, mcp_server
from memorynode.config import Config, Paths


def paths(tmp_path): return Paths(*(tmp_path / name for name in ("config", "data", "logs", "run")))


def args(command, **kwargs):
    defaults = dict(source_root=None, api_host=None, api_port=None, console_host=None, console_port=None, transport="stdio", ensure_api=False, host=None, port=None, print_token_once=False)
    defaults.update(kwargs)
    return Namespace(command=command, **defaults)


def test_help_version_and_status_text_codes(tmp_path, capsys):
    with pytest.raises(SystemExit) as caught: cli.parser().parse_args(["--help"])
    assert caught.value.code == 0
    assert cli.dispatch(args("version"), paths(tmp_path)) == 0
    assert cli.status(paths(tmp_path)) == 1
    output = capsys.readouterr().out
    assert memorynode.__version__ in output and "overall: stopped" in output


def test_public_versions_and_mcp_status_match(monkeypatch):
    policy = SimpleNamespace(
        allow_agent_approval=False,
        allow_agent_reject=False,
        allow_agent_revoke=False,
        allow_agent_supersede=False,
        allow_agent_set_expiry=False,
    )
    monkeypatch.setattr(mcp_server, "_call", lambda _function: {"status": "ok"})
    monkeypatch.setattr(mcp_server, "_policy", lambda: policy)
    assert memorynode.__version__ == cli.VERSION == mcp_server.VERSION
    assert json.loads(mcp_server.status_resource())["mcp_version"] == memorynode.__version__


def test_status_stale_foreign_partial_and_stop_never_kills(tmp_path, monkeypatch, capsys):
    home = paths(tmp_path); home.create(); home.process_file.write_text('{"api": {}, "console": {}}')
    monkeypatch.setattr(cli, "identity", lambda item: (("stale", None) if item is home else ("foreign", None)))
    states = iter([("stale", None), ("foreign", None)])
    monkeypatch.setattr(cli, "identity", lambda _item: next(states))
    assert cli.status(home) == 1
    states = iter([("stale", None), ("foreign", None)])
    monkeypatch.setattr(cli, "identity", lambda _item: next(states))
    assert cli.stop(home) == 2 and home.process_file.exists()
    assert "nothing terminated" in capsys.readouterr().err


def test_repeated_start_port_conflict_partial_and_failed_console_rolls_back(tmp_path, monkeypatch):
    home = paths(tmp_path); home.create(); config = Config()
    monkeypatch.setattr(cli, "load_config", lambda *_args, **_kwargs: config)
    monkeypatch.setattr(cli, "_backend_available", lambda: True)
    monkeypatch.setattr("memorynode.console.assets_available", lambda: True)
    monkeypatch.setattr(cli, "wait_http", lambda *_args, **_kwargs: True)
    monkeypatch.setattr(cli, "_memorynode_api_healthy", lambda *_args, **_kwargs: True)
    monkeypatch.setattr(cli, "_states", lambda _paths: ({}, {"api": "running", "console": "running"}))
    assert cli.start(args("start"), home) == 0
    monkeypatch.setattr(cli, "_states", lambda _paths: ({}, {"api": "running", "console": "stopped"}))
    with pytest.raises(ValueError, match="partial"): cli.start(args("start"), home)
    monkeypatch.setattr(cli, "_states", lambda _paths: ({}, {"api": "stopped", "console": "stopped"}))
    monkeypatch.setattr(cli, "port_free", lambda *_: False)
    with pytest.raises(ValueError, match="already in use"): cli.start(args("start"), home)
    monkeypatch.setattr(cli, "port_free", lambda *_: True)
    created = [Mock(pid=100, poll=lambda: None), Mock(pid=101, poll=lambda: 1)]
    monkeypatch.setattr(cli.subprocess, "Popen", lambda *_a, **_k: created.pop(0))
    healthy = iter([True, False]); monkeypatch.setattr(cli, "_wait_memorynode_api", lambda *_a, **_k: next(healthy))
    stopped = []; monkeypatch.setattr(cli, "stop_tree", lambda process: stopped.append(process.pid))
    class Process:
        def __init__(self, pid): self.pid = pid
    monkeypatch.setattr("psutil.Process", Process)
    with pytest.raises(ValueError, match="rolled back"): cli.start(args("start"), home)
    assert stopped == [101, 100] and not home.process_file.exists()


def test_failed_api_start_rolls_back_only_api(tmp_path, monkeypatch):
    home = paths(tmp_path); home.create()
    monkeypatch.setattr(cli, "load_config", lambda *_args, **_kwargs: Config())
    monkeypatch.setattr(cli, "_backend_available", lambda: True)
    monkeypatch.setattr("memorynode.console.assets_available", lambda: True)
    monkeypatch.setattr(cli, "_states", lambda _paths: ({}, {"api": "stopped", "console": "stopped"}))
    monkeypatch.setattr(cli, "port_free", lambda *_args: True)
    process = Mock(pid=100, poll=lambda: 1)
    monkeypatch.setattr(cli.subprocess, "Popen", lambda *_args, **_kwargs: process)
    monkeypatch.setattr(cli, "_wait_memorynode_api", lambda *_args, **_kwargs: False)
    stopped = []
    monkeypatch.setattr(cli, "stop_tree", lambda item: stopped.append(item.pid))
    monkeypatch.setattr("psutil.Process", lambda pid: Mock(pid=pid))
    with pytest.raises(ValueError, match="rolled back"):
        cli.start(args("start"), home)
    assert stopped == [100] and not home.process_file.exists()


def test_restart_stops_before_start_and_doctor_redacts_values(tmp_path, monkeypatch, capsys):
    home = paths(tmp_path); home.create(); calls = []
    monkeypatch.setattr(cli, "stop", lambda _paths: calls.append("stop") or 0)
    monkeypatch.setattr(cli, "start", lambda _args, _paths: calls.append("start") or 0)
    assert cli.dispatch(args("restart"), home) == 0 and calls == ["stop", "start"]
    monkeypatch.setenv("QWEN_API_KEY", "never-print-this")
    cli.doctor(home)
    output = capsys.readouterr().out
    assert "configured" in output and "never-print-this" not in output


def test_doctor_uses_safe_defaults_when_config_is_missing(tmp_path, capsys):
    assert cli.doctor(paths(tmp_path)) == 1
    output = capsys.readouterr().out
    assert "config invalid" not in output and "writable directory" in output


def test_mcp_reuses_server_and_configured_url(tmp_path, monkeypatch):
    home = paths(tmp_path); called = []
    monkeypatch.setattr(cli, "load_config", lambda *_a, **_k: Config(Path.cwd()))
    monkeypatch.setattr("memorynode.mcp_server.main", lambda: called.append(True))
    monkeypatch.delenv("MEMORYNODE_API_URL", raising=False)
    assert cli.dispatch(args("mcp"), home) == 0
    assert called and cli.os.environ["MEMORYNODE_API_URL"] == "http://127.0.0.1:8000"


def test_mcp_ensure_api_parser_and_http_rejection(tmp_path, monkeypatch):
    parsed = cli.parser().parse_args(["mcp", "--ensure-api"])
    assert parsed.ensure_api and parsed.transport == "stdio"
    called = []
    monkeypatch.setattr(cli, "start", lambda *_args, **_kwargs: called.append(True))
    with pytest.raises(ValueError, match="stdio"):
        cli.dispatch(cli.parser().parse_args(["mcp", "--transport", "http", "--ensure-api"]), paths(tmp_path))
    assert called == []


def test_mcp_ensure_api_health_requires_memorynode_identity(monkeypatch):
    class Response:
        status_code = 200
        def __init__(self, payload): self.payload = payload
        def json(self): return self.payload

    monkeypatch.setitem(sys.modules, "httpx", SimpleNamespace(get=lambda *_a, **_k: Response({"ok": True, "service": "other"})))
    assert not cli._memorynode_api_healthy("http://127.0.0.1:18000")
    monkeypatch.setitem(sys.modules, "httpx", SimpleNamespace(get=lambda *_a, **_k: Response({"ok": True, "service": "memorynode", "version": "test"})))
    assert cli._memorynode_api_healthy("http://127.0.0.1:18000")


def test_mcp_ensure_api_reuses_verified_api_without_stdout(tmp_path, monkeypatch, capsys):
    home, called = paths(tmp_path), []
    monkeypatch.setattr(cli, "load_config", lambda *_a, **_k: Config(api_port=18000, console_port=13000))
    monkeypatch.setattr(cli, "_memorynode_api_healthy", lambda _url: True)
    monkeypatch.setattr(cli, "start", lambda *_a, **_k: pytest.fail("must not start"))
    monkeypatch.setattr("memorynode.mcp_server.main", lambda: called.append(True))
    assert cli.dispatch(args("mcp", ensure_api=True), home) == 0
    captured = capsys.readouterr()
    assert called and captured.out == "" and "API verified" in captured.err
    assert cli.os.environ["MEMORYNODE_API_URL"] == "http://127.0.0.1:18000"


def test_mcp_ensure_api_starts_once_with_stderr_only_reporting(tmp_path, monkeypatch, capsys):
    home, called = paths(tmp_path), []
    monkeypatch.setattr(cli, "load_config", lambda *_a, **_k: Config(api_port=18001, console_port=13001))
    healthy = iter([False, True])
    monkeypatch.setattr(cli, "_memorynode_api_healthy", lambda _url: next(healthy))

    def fake_start(_args, _paths, output):
        assert output is cli.sys.stderr
        print("MemoryNode running: API 18001, console 13001", file=output)
        called.append("start")
        return 0

    monkeypatch.setattr(cli, "start", fake_start)
    monkeypatch.setattr("memorynode.mcp_server.main", lambda: called.append("mcp"))
    assert cli.dispatch(args("mcp", ensure_api=True), home) == 0
    captured = capsys.readouterr()
    assert called == ["start", "mcp"] and captured.out == "" and "governance console" in captured.err


@pytest.mark.parametrize("states", [
    {"api": "stale", "console": "stale"},
    {"api": "foreign", "console": "foreign"},
    {"api": "running", "console": "stale"},
])
def test_mcp_ensure_api_refuses_unsafe_records_without_starting(tmp_path, monkeypatch, states):
    home = paths(tmp_path); home.create()
    monkeypatch.setattr(cli, "load_config", lambda *_a, **_k: Config(api_port=18002, console_port=13002))
    monkeypatch.setattr(cli, "_memorynode_api_healthy", lambda _url: False)
    monkeypatch.setattr(cli, "_backend_available", lambda: True)
    monkeypatch.setattr("memorynode.console.assets_available", lambda: True)
    monkeypatch.setattr(cli, "_states", lambda _paths: ({"api": {}, "console": {}}, states))
    monkeypatch.setattr(cli.subprocess, "Popen", lambda *_a, **_k: pytest.fail("must not start"))
    with pytest.raises(ValueError, match="partial/stale/foreign"):
        cli.dispatch(args("mcp", ensure_api=True), home)


def test_mcp_ensure_api_refuses_occupied_ports_without_starting(tmp_path, monkeypatch):
    home = paths(tmp_path); home.create()
    monkeypatch.setattr(cli, "load_config", lambda *_a, **_k: Config(api_port=18003, console_port=13003))
    monkeypatch.setattr(cli, "_memorynode_api_healthy", lambda _url: False)
    monkeypatch.setattr(cli, "_backend_available", lambda: True)
    monkeypatch.setattr("memorynode.console.assets_available", lambda: True)
    monkeypatch.setattr(cli, "_states", lambda _paths: ({}, {"api": "stopped", "console": "stopped"}))
    monkeypatch.setattr(cli, "port_free", lambda *_args: False)
    monkeypatch.setattr(cli.subprocess, "Popen", lambda *_a, **_k: pytest.fail("must not start"))
    with pytest.raises(ValueError, match="already in use"):
        cli.dispatch(args("mcp", ensure_api=True), home)


def test_mcp_ensure_api_rejects_corrupt_record_without_starting(tmp_path, monkeypatch):
    home = paths(tmp_path); home.create(); home.process_file.write_text("not-json")
    monkeypatch.setattr(cli, "load_config", lambda *_a, **_k: Config(api_port=18004, console_port=13004))
    monkeypatch.setattr(cli, "_memorynode_api_healthy", lambda _url: False)
    monkeypatch.setattr(cli, "_backend_available", lambda: True)
    monkeypatch.setattr("memorynode.console.assets_available", lambda: True)
    monkeypatch.setattr(cli.subprocess, "Popen", lambda *_a, **_k: pytest.fail("must not start"))
    with pytest.raises(ValueError, match="partial/stale/foreign"):
        cli.dispatch(args("mcp", ensure_api=True), home)


@pytest.mark.parametrize("states", [
    {"api": "stale", "console": "stale"},
    {"api": "running", "console": "stale"},
])
def test_stop_cleans_stale_and_only_stops_verified_running(tmp_path, monkeypatch, states):
    home = paths(tmp_path); home.create(); home.process_file.write_text('{"api": {}, "console": {}}')
    process, records = Mock(pid=123), {"api": {}, "console": {}}
    monkeypatch.setattr(cli, "_states", lambda _paths: (records, states))
    monkeypatch.setattr(cli, "identity", lambda item: ("running", process) if item is records["api"] and states["api"] == "running" else ("stale", None))
    stopped = []; monkeypatch.setattr(cli, "stop_tree", lambda item: stopped.append(item.pid))
    assert cli.stop(home) == 0 and not home.process_file.exists()
    assert stopped == ([123] if states["api"] == "running" else [])


@pytest.mark.parametrize("states", [
    {"api": "foreign", "console": "stale"},
    {"api": "foreign", "console": "running"},
])
def test_stop_foreign_preserves_record_and_stops_nothing(tmp_path, monkeypatch, states):
    home = paths(tmp_path); home.create(); home.process_file.write_text('{"api": {}, "console": {}}')
    monkeypatch.setattr(cli, "_states", lambda _paths: ({"api": {}, "console": {}}, states))
    stopped = []; monkeypatch.setattr(cli, "stop_tree", stopped.append)
    assert cli.stop(home) == 2 and home.process_file.exists() and stopped == []


def test_stop_corrupt_record_is_foreign(tmp_path, monkeypatch):
    home = paths(tmp_path); home.create(); home.process_file.write_text('not-json')
    stopped = []; monkeypatch.setattr(cli, "stop_tree", stopped.append)
    assert cli.stop(home) == 2 and home.process_file.exists() and stopped == []


def test_restart_cleans_stale_then_rechecks_ports(tmp_path, monkeypatch):
    home = paths(tmp_path); home.create(); home.process_file.write_text('{"api": {}, "console": {}}')
    monkeypatch.setattr(cli, "load_config", lambda *_a, **_k: Config())
    monkeypatch.setattr(cli, "_backend_available", lambda: True)
    monkeypatch.setattr("memorynode.console.assets_available", lambda: True)
    monkeypatch.setattr(cli, "identity", lambda _item: ("stale", None))
    monkeypatch.setattr(cli, "_states", lambda _paths: (
        ({"api": {}, "console": {}}, {"api": "stale", "console": "stale"})
        if home.process_file.exists() else ({}, {"api": "stopped", "console": "stopped"})
    ))
    monkeypatch.setattr(cli, "port_free", lambda *_args: False)
    with pytest.raises(ValueError, match="already in use"):
        cli.dispatch(args("restart"), home)
    assert not home.process_file.exists()


def test_doctor_accepts_configurable_ports(tmp_path, monkeypatch, capsys):
    home = paths(tmp_path); home.create(); home.config_file.write_text('[server]\nport=8001\n[console]\nport=3001\n')
    monkeypatch.setattr(cli, "_backend_available", lambda: True)
    monkeypatch.setattr("memorynode.console.assets_available", lambda: True)
    cli.doctor(home)
    assert "config invalid" not in capsys.readouterr().out


def test_doctor_rejects_nonboolean_governance_without_crashing(tmp_path, capsys):
    home = paths(tmp_path); home.create()
    home.config_file.write_text('[governance]\nallow_agent_reject = "true"\n')
    assert cli.doctor(home) == 1
    assert "TOML boolean" in capsys.readouterr().out
