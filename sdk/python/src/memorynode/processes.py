import json
import os
import socket
import time
from pathlib import Path

import psutil


def port_free(host, port):
    with socket.socket() as sock:
        try: sock.bind((host, port))
        except OSError: return False
    return True


def atomic_write(path, records):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(records, indent=2), encoding="utf-8")
    os.replace(temporary, path)


def read_records(path):
    try: return json.loads(Path(path).read_text(encoding="utf-8"))
    except FileNotFoundError: return {}
    except (OSError, ValueError, TypeError): return {"_invalid": True}


def record(process, marker, cwd, port):
    return {"pid": process.pid, "create_time": psutil.Process(process.pid).create_time(),
            "command_marker": marker, "cwd": str(Path(cwd).resolve()), "port": port}


def identity(item):
    try:
        process = psutil.Process(int(item["pid"]))
        if abs(process.create_time() - float(item["create_time"])) > 0.01: return "foreign", None
        cmdline = " ".join(process.cmdline()).casefold()
        cwd = os.path.normcase(os.path.realpath(process.cwd()))
        expected = os.path.normcase(os.path.realpath(item["cwd"]))
        if item["command_marker"].casefold() not in cmdline or cwd != expected: return "foreign", None
        return "running", process
    except psutil.NoSuchProcess: return "stale", None
    except (psutil.Error, KeyError, TypeError, ValueError, OSError): return "foreign", None


def stop_tree(process, timeout=5):
    tree = process.children(recursive=True) + [process]
    for item in reversed(tree):
        try: item.terminate()
        except psutil.NoSuchProcess: pass
    _, alive = psutil.wait_procs(tree, timeout=timeout)
    for item in alive:
        try: item.kill()
        except psutil.NoSuchProcess: pass
    if alive: psutil.wait_procs(alive, timeout=timeout)


def wait_http(url, timeout=20):
    import httpx
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            if httpx.get(url, timeout=1, trust_env=False).status_code < 500: return True
        except httpx.HTTPError: pass
        time.sleep(0.2)
    return False
