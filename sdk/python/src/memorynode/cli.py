import argparse
import importlib.util
import os
import subprocess
import sys
import time
import webbrowser
from pathlib import Path
from urllib.parse import urlsplit

from ._version import __version__ as VERSION
from .config import Paths, initialize, load_config, load_mcp_http_config, rotate_mcp_http_token
from .data import backup_database, check_database, default_backup_path, default_export_path, export_jsonl, import_jsonl, restore_database
from .processes import atomic_write, identity, port_free, read_records, record, stop_tree, wait_http

def _backend_available():
    try: return importlib.util.find_spec("memorynode.backend.main") is not None
    except (ImportError, ModuleNotFoundError, ValueError): return False


def parser():
    result = argparse.ArgumentParser(prog="memorynode")
    commands = result.add_subparsers(dest="command", required=True)
    init = commands.add_parser("init", help="initialize local configuration")
    init.add_argument("--source-root")
    for name in ("start", "restart"):
        command = commands.add_parser(name, help=f"{name} API and console")
        for option, kind in (("source-root", str), ("api-host", str), ("api-port", int), ("console-host", str), ("console-port", int)):
            command.add_argument(f"--{option}", type=kind)
    commands.add_parser("stop", help="stop managed processes")
    commands.add_parser("status", help="show managed process status")
    commands.add_parser("doctor", help="diagnose local installation")
    backup = commands.add_parser("backup", help="create a SQLite snapshot backup")
    backup.add_argument("--output")
    restore = commands.add_parser("restore", help="replace the local database from a backup")
    restore.add_argument("backup")
    restore.add_argument("--confirm", action="store_true")
    export = commands.add_parser("export", help="export database facts as JSONL")
    export.add_argument("--output")
    import_cmd = commands.add_parser("import", help="import database facts from JSONL")
    import_cmd.add_argument("file")
    import_cmd.add_argument("--confirm", action="store_true")
    mcp = commands.add_parser("mcp", help="run the stdio or local Streamable HTTP MCP server")
    mcp.add_argument("--transport", choices=("stdio", "http"), default="stdio")
    mcp.add_argument("--host")
    mcp.add_argument("--port", type=int)
    mcp.add_argument("--print-token-once", action="store_true", help="rotate and print the HTTP bearer token once")
    mcp.add_argument("--ensure-api", action="store_true", help="for stdio only, safely ensure the local API and console are available")
    mcp.add_argument("--open-console", action="store_true", help="for stdio bootstrap only, open the managed governance console after it starts")
    commands.add_parser("version", help="show package version")
    return result


def main(argv=None):
    args = parser().parse_args(argv)
    try: code = dispatch(args)
    except (ValueError, OSError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        code = 2
    if argv is None: raise SystemExit(code)
    return code


def dispatch(args, paths=None):
    paths = paths or Paths.current()
    if args.command == "init":
        created = initialize(args.source_root, paths)
        print(f"MemoryNode {'initialized' if created else 'already initialized'}: {paths.config_file}")
        if created:
            token = rotate_mcp_http_token(paths)
            print(f"MCP HTTP bearer token (shown once; store it securely): {token}", file=sys.stderr)
        return 0
    if args.command == "version": print(VERSION); return 0
    if args.command == "mcp":
        if getattr(args, "ensure_api", False) and getattr(args, "transport", "stdio") != "stdio":
            raise ValueError("--ensure-api is available only with the stdio MCP transport")
        if getattr(args, "open_console", False) and getattr(args, "transport", "stdio") != "stdio":
            raise ValueError("--open-console is available only with the stdio MCP transport")
        if getattr(args, "open_console", False) and not getattr(args, "ensure_api", False):
            raise ValueError("--open-console requires --ensure-api")
        config = load_config(args, paths)
        if getattr(args, "transport", "stdio") == "stdio":
            endpoint = f"http://{config.api_host}:{config.api_port}"
            if getattr(args, "ensure_api", False):
                endpoint, explicit_override = ensure_api(args, paths, config, open_console=getattr(args, "open_console", False))
                if not explicit_override:
                    os.environ["MEMORYNODE_API_URL"] = endpoint
            else:
                os.environ.setdefault("MEMORYNODE_API_URL", endpoint)
            from .mcp_server import main as mcp_main
            mcp_main(); return 0
        http_config = load_mcp_http_config(args, paths)
        if getattr(args, "print_token_once", False):
            token = rotate_mcp_http_token(paths)
            print(f"MCP HTTP bearer token (shown once; store it securely): {token}", file=sys.stderr)
            http_config = load_mcp_http_config(args, paths)
        if not http_config.token_hash:
            raise ValueError("MCP HTTP token is not configured; run memorynode mcp --transport http --print-token-once")
        if not port_free(http_config.host, http_config.port):
            raise ValueError(f"MCP HTTP port {http_config.port} is already in use")
        from .mcp_server import run_http
        run_http(http_config.host, http_config.port, http_config.token_hash); return 0
    if args.command == "doctor": return doctor(paths)
    if args.command == "backup": return backup_cmd(args, paths)
    if args.command == "restore": return restore_cmd(args, paths)
    if args.command == "export": return export_cmd(args, paths)
    if args.command == "import": return import_cmd(args, paths)
    if args.command == "status": return status(paths)
    if args.command == "stop": return stop(paths)
    if args.command == "restart":
        code = stop(paths)
        return code or start(args, paths)
    return start(args, paths)


def _states(paths):
    records = read_records(paths.process_file)
    if records.get("_invalid"): return records, {"api": "foreign", "console": "foreign"}
    return records, {name: identity(records[name])[0] if name in records else "stopped" for name in ("api", "console")}


def _memorynode_api_healthy(url):
    """Return true only for the expected loopback MemoryNode health response."""
    try:
        import httpx
        response = httpx.get(url + "/health", timeout=.5, trust_env=False)
        payload = response.json()
    except (ImportError, ValueError, OSError):
        return False
    except Exception as exc:
        if exc.__class__.__module__.startswith("httpx"):
            return False
        raise
    return response.status_code == 200 and isinstance(payload, dict) and payload.get("ok") is True and payload.get("service") == "memorynode"


def _wait_memorynode_api(url, timeout=20):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if _memorynode_api_healthy(url):
            return True
        time.sleep(.2)
    return False


def _resolve_ensure_api_endpoint(config, environ=None):
    """Return the bootstrap endpoint and whether it is an explicit override."""
    environ = os.environ if environ is None else environ
    if "MEMORYNODE_API_URL" not in environ:
        return f"http://{config.api_host}:{config.api_port}", False

    endpoint = environ["MEMORYNODE_API_URL"]
    try:
        parsed = urlsplit(endpoint)
        port = parsed.port
    except (TypeError, ValueError):
        port = None
        parsed = None
    if (
        not isinstance(endpoint, str)
        or parsed is None
        or parsed.scheme != "http"
        or parsed.hostname != "127.0.0.1"
        or not port
        or parsed.netloc != f"127.0.0.1:{port}"
        or parsed.path
        or parsed.query
        or parsed.fragment
        or parsed.username is not None
        or parsed.password is not None
    ):
        raise ValueError("explicit MemoryNode API override is not a safe local HTTP endpoint")
    return endpoint, True


def _open_console(url):
    try:
        opened = webbrowser.open(url, new=2)
    except Exception:
        opened = False
    if opened:
        print(f"Opened MemoryNode governance console: {url}", file=sys.stderr)
    else:
        print(f"MemoryNode governance console is ready at {url}; open it in a browser if needed.", file=sys.stderr)


def ensure_api(args, paths=None, config=None, open_console=False):
    """Safely resolve the configured API before stdio MCP writes protocol frames."""
    paths = paths or Paths.current()
    config = config or load_config(args, paths)
    endpoint, explicit_override = _resolve_ensure_api_endpoint(config)
    if explicit_override:
        if not _memorynode_api_healthy(endpoint):
            raise ValueError("explicit MemoryNode API override could not be verified")
        print("Explicit MemoryNode API override verified; starting stdio MCP.", file=sys.stderr)
        return endpoint, True
    if _memorynode_api_healthy(endpoint):
        print("MemoryNode API verified; starting stdio MCP.", file=sys.stderr)
        return endpoint, False
    start(args, paths, output=sys.stderr)
    if not _memorynode_api_healthy(endpoint):
        raise ValueError("managed MemoryNode API did not pass its identity check")
    if open_console:
        _open_console(f"http://{config.console_host}:{config.console_port}/")
    print("MemoryNode API and governance console are ready; starting stdio MCP.", file=sys.stderr)
    return endpoint, False


def status(paths=None):
    paths = paths or Paths.current(); records, states = _states(paths)
    health = {}
    for name in ("api", "console"):
        item = records.get(name, {})
        health[name] = states[name] == "running" and wait_http(f"http://127.0.0.1:{item['port']}{'/health' if name == 'api' else ''}", .5)
        print(f"{name}: {states[name]} pid={item.get('pid', '-')} port={item.get('port', '-')} healthy={'yes' if health[name] else 'no'}")
    overall = "running" if set(states.values()) == {"running"} and all(health.values()) else "stopped" if set(states.values()) == {"stopped"} else "unhealthy"
    print(f"overall: {overall}")
    return 0 if overall == "running" else 1


def _preflight(config, paths):
    if sys.version_info < (3, 10): raise ValueError("Python 3.10 or newer is required")
    if not _backend_available():
        raise ValueError("packaged FastAPI backend is missing; reinstall memorynode")
    from .console import assets_available
    if not assets_available(): raise ValueError("packaged console assets are missing; reinstall memorynode")
    paths.create()
    records, states = _states(paths)
    if set(states.values()) == {"running"}:
        if not _memorynode_api_healthy(f"http://{config.api_host}:{config.api_port}") or not wait_http(f"http://{config.console_host}:{config.console_port}", .5):
            raise ValueError("managed processes exist but failed health checks; run restart")
        return True
    if set(states.values()) != {"stopped"}:
        raise ValueError(f"managed process state is partial/stale/foreign: {states}; run status, then stop only after verification")
    for host, port, name in ((config.api_host, config.api_port, "API"), (config.console_host, config.console_port, "console")):
        if not port_free(host, port): raise ValueError(f"{name} port {port} is already in use")
    return False


def start(args, paths=None, output=None):
    paths = paths or Paths.current(); config = load_config(args, paths)
    output = output or sys.stdout
    running = _preflight(config, paths)
    if running: print("MemoryNode is already running", file=output); return 0
    environment = os.environ.copy()
    environment["MEMORYNODE_DB_PATH"] = str(paths.database)
    environment["MEMORYNODE_MODEL_CONFIG_PATH"] = str(paths.config / "model.toml")
    environment["MEMORYNODE_BACKUP_DIR"] = str(paths.backups)
    environment["MEMORYNODE_CONSOLE_ORIGIN"] = f"http://{config.console_host}:{config.console_port}"
    creationflags = subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0
    processes, logs = [], []
    try:
        api_log = (paths.logs / "api.log").open("ab"); logs.append(api_log)
        api = subprocess.Popen([sys.executable, "-m", "uvicorn", "memorynode.backend.main:app", "--host", config.api_host, "--port", str(config.api_port)], cwd=paths.run, env=environment, stdout=api_log, stderr=subprocess.STDOUT, creationflags=creationflags)
        processes.append(api)
        if not _wait_memorynode_api(f"http://{config.api_host}:{config.api_port}") or api.poll() is not None: raise RuntimeError("API failed its /health startup check")
        console_log = (paths.logs / "console.log").open("ab"); logs.append(console_log)
        console = subprocess.Popen([sys.executable, "-m", "memorynode.console", "--host", config.console_host, "--port", str(config.console_port), "--api-port", str(config.api_port)], cwd=paths.run, env=environment, stdout=console_log, stderr=subprocess.STDOUT, creationflags=creationflags)
        processes.append(console)
        if not wait_http(f"http://{config.console_host}:{config.console_port}") or console.poll() is not None: raise RuntimeError("console failed its startup check")
        atomic_write(paths.process_file, {
            "api": record(api, "uvicorn memorynode.backend.main:app", paths.run, config.api_port),
            "console": record(console, "-m memorynode.console", paths.run, config.console_port),
        })
        print(f"MemoryNode running: API {config.api_port}, console {config.console_port}", file=output); return 0
    except Exception as exc:
        for process in reversed(processes):
            try: stop_tree(__import__("psutil").Process(process.pid))
            except __import__("psutil").Error: pass
        raise ValueError(f"start failed and was rolled back: {exc}") from None
    finally:
        for log in logs: log.close()


def stop(paths=None):
    paths = paths or Paths.current(); records, states = _states(paths)
    if not records: print("MemoryNode is already stopped"); return 0
    if any(state == "foreign" for state in states.values()):
        print(f"ERROR: foreign process identity; nothing terminated: {states}", file=sys.stderr); return 2
    checked = {name: identity(records[name]) for name in ("api", "console") if name in records}
    if any(state == "foreign" for state, _ in checked.values()):
        print("ERROR: foreign process identity; nothing terminated", file=sys.stderr); return 2
    for name in ("console", "api"):
        if name in checked and checked[name][0] == "running": stop_tree(checked[name][1])
    paths.process_file.unlink(missing_ok=True)
    print("MemoryNode stopped"); return 0


def doctor(paths=None):
    paths = paths or Paths.current(); failures = 0
    def check(ok, message, fix=""):
        nonlocal failures
        level = "PASS" if ok else "FAIL"; failures += not ok
        print(f"{level}: {message}{'; ' + fix if fix and not ok else ''}")
    check(sys.version_info >= (3, 10), f"Python {sys.version_info.major}.{sys.version_info.minor} ({sys.executable})", "install Python 3.10+")
    try: config = load_config(paths=paths); configured = True
    except (OSError, ValueError, KeyError) as exc: config = None; configured = False; print(f"FAIL: config invalid: {exc}; run memorynode init"); failures += 1
    check(_backend_available(), "packaged FastAPI backend", "reinstall memorynode")
    try:
        from .console import assets_available
        console_available = assets_available()
    except (ImportError, OSError):
        console_available = False
    check(console_available, "packaged console assets", "reinstall memorynode")
    for path in (paths.config, paths.data, paths.logs, paths.run, paths.backups, paths.exports):
        check(path.exists() and os.access(path, os.W_OK), f"writable directory {path}", "run memorynode init")
    if config:
        records, states = _states(paths)
        check(not records.get("_invalid") and all(s != "foreign" for s in states.values()), f"process identity {states}", "inspect status and process record")
        print(f"{'PASS' if wait_http(f'http://{config.api_host}:{config.api_port}/health', .5) else 'WARN'}: API health")
    check(paths.data.exists() and os.access(paths.data, os.W_OK), "database parent writable", "fix directory permissions")
    if paths.database.exists():
        result = check_database(paths.database)
        for item in result["checks"]:
            check(item["ok"], f"database {item['name']} {item['message']}", "run backup/restore or inspect the database")
    else:
        print("WARN: database not created yet")
    for name in ("QWEN_API_KEY", "QWEN_BASE_URL", "QWEN_MODEL"):
        print(f"WARN: {name} {'configured' if os.getenv(name) else 'unconfigured'}")
    try: from .mcp_server import mcp; available = mcp is not None
    except (ImportError, ValueError): available = False
    check(available, "MCP entry point importable", "reinstall memorynode")
    return 1 if failures else 0


def _offline(paths):
    records, states = _states(paths)
    if records.get("_invalid") or any(state == "foreign" for state in states.values()):
        raise ValueError(f"managed process identity is not safe for data operation: {states}")
    if any(state == "running" for state in states.values()):
        raise ValueError("stop MemoryNode before restore/import")
    config = load_config(paths=paths)
    if not port_free(config.api_host, config.api_port) or not port_free(config.console_host, config.console_port):
        raise ValueError("configured API/console port is in use by an unmanaged process")


def backup_cmd(args, paths):
    paths.create()
    output = Path(args.output).expanduser().resolve() if args.output else default_backup_path(paths)
    backup_database(paths.database, output)
    print(f"Backup created: {output}")
    print("WARNING: backup may contain sensitive memories.")
    return 0


def restore_cmd(args, paths):
    if not args.confirm:
        raise ValueError("restore requires --confirm")
    _offline(paths)
    restore_database(paths.database, Path(args.backup).expanduser().resolve())
    print("Restore complete")
    return 0


def export_cmd(args, paths):
    paths.create()
    output = Path(args.output).expanduser().resolve() if args.output else default_export_path(paths)
    export_jsonl(paths.database, output)
    print(f"Export created: {output}")
    print("WARNING: export may contain sensitive memories.")
    return 0


def import_cmd(args, paths):
    if not args.confirm:
        raise ValueError("import requires --confirm")
    _offline(paths)
    paths.create()
    backup_database(paths.database, default_backup_path(paths)) if paths.database.exists() else None
    report = import_jsonl(paths.database, Path(args.file).expanduser().resolve())
    print(f"Import complete: inserted={report['inserted']} skipped={report['skipped']} conflicts={report['conflicts']}")
    return 0
