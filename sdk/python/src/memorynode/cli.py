import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path

from .config import Paths, initialize, load_config, valid_source_root
from .processes import atomic_write, identity, port_free, read_records, record, stop_tree, wait_http

VERSION = "0.2.0"


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
    commands.add_parser("mcp", help="run the stdio MCP server")
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
        return 0
    if args.command == "version": print(VERSION); return 0
    if args.command == "mcp":
        config = load_config(args, paths)
        os.environ.setdefault("MEMORYNODE_API_URL", f"http://{config.api_host}:{config.api_port}")
        from .mcp_server import main as mcp_main
        mcp_main(); return 0
    if args.command == "doctor": return doctor(paths)
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
    root = valid_source_root(config.source_root)
    if not root: raise ValueError("Phase 3 requires a valid source root; run memorynode init --source-root <repository>")
    if sys.version_info < (3, 10): raise ValueError("Python 3.10 or newer is required")
    if not shutil.which("npm"): raise ValueError("npm is required")
    if not (root / "frontend/.next").is_dir(): raise ValueError("frontend build missing; run npm run build in frontend")
    paths.create()
    records, states = _states(paths)
    if set(states.values()) == {"running"}:
        if not wait_http(f"http://{config.api_host}:{config.api_port}/health", .5) or not wait_http(f"http://{config.console_host}:{config.console_port}", .5):
            raise ValueError("managed processes exist but failed health checks; run restart")
        return root, True
    if set(states.values()) != {"stopped"}:
        raise ValueError(f"managed process state is partial/stale/foreign: {states}; run status, then stop only after verification")
    for host, port, name in ((config.api_host, config.api_port, "API"), (config.console_host, config.console_port, "console")):
        if not port_free(host, port): raise ValueError(f"{name} port {port} is already in use")
    return root, False


def start(args, paths=None):
    paths = paths or Paths.current(); config = load_config(args, paths)
    root, running = _preflight(config, paths)
    if running: print("MemoryNode is already running"); return 0
    environment = os.environ.copy()
    environment["MEMORYNODE_DB_PATH"] = str(paths.database)
    creationflags = subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0
    processes, logs = [], []
    try:
        api_log = (paths.logs / "api.log").open("ab"); logs.append(api_log)
        api = subprocess.Popen([sys.executable, "-m", "uvicorn", "app.main:app", "--host", config.api_host, "--port", str(config.api_port)], cwd=root / "backend", env=environment, stdout=api_log, stderr=subprocess.STDOUT, creationflags=creationflags)
        processes.append(api)
        if not wait_http(f"http://{config.api_host}:{config.api_port}/health") or api.poll() is not None: raise RuntimeError("API failed its /health startup check")
        console_log = (paths.logs / "console.log").open("ab"); logs.append(console_log)
        console = subprocess.Popen([shutil.which("npm"), "run", "start", "--", "--hostname", config.console_host, "--port", str(config.console_port)], cwd=root / "frontend", env=environment, stdout=console_log, stderr=subprocess.STDOUT, creationflags=creationflags)
        processes.append(console)
        if not wait_http(f"http://{config.console_host}:{config.console_port}") or console.poll() is not None: raise RuntimeError("console failed its startup check")
        atomic_write(paths.process_file, {
            "api": record(api, "uvicorn app.main:app", root / "backend", config.api_port),
            "console": record(console, "run start", root / "frontend", config.console_port),
        })
        print(f"MemoryNode running: API {config.api_port}, console {config.console_port}"); return 0
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
    except (OSError, ValueError, KeyError) as exc: config = None; configured = False; print(f"FAIL: config invalid: {exc}; run memorynode init --source-root <repository>"); failures += 1
    check(configured and bool(valid_source_root(config.source_root)), "source root", "run memorynode init --source-root <repository>")
    check(bool(shutil.which("npm")), "npm available", "install Node.js/npm")
    check(bool(config and (config.source_root / "frontend/.next").is_dir()), "frontend production build", "run npm run build in frontend")
    for path in (paths.config, paths.data, paths.logs, paths.run):
        check(path.exists() and os.access(path, os.W_OK), f"writable directory {path}", "run memorynode init")
    if config:
        records, states = _states(paths)
        check(not records.get("_invalid") and all(s != "foreign" for s in states.values()), f"process identity {states}", "inspect status and process record")
        print(f"{'PASS' if wait_http(f'http://{config.api_host}:{config.api_port}/health', .5) else 'WARN'}: API health")
    check(paths.data.exists() and os.access(paths.data, os.W_OK), "database parent writable", "fix directory permissions")
    for name in ("QWEN_API_KEY", "QWEN_BASE_URL", "QWEN_MODEL"):
        print(f"WARN: {name} {'configured' if os.getenv(name) else 'unconfigured'}")
    try: from .mcp_server import mcp; available = mcp is not None
    except ImportError: available = False
    check(available, "MCP entry point importable", "reinstall memorynode")
    return 1 if failures else 0
