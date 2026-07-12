import json
import os
import subprocess
import sys
import time

import psutil

from memorynode.processes import atomic_write, identity, record, stop_tree


def sleeper(tmp_path):
    return subprocess.Popen([sys.executable, "-c", "import time; time.sleep(60)", "memorynode-test"], cwd=tmp_path)


def test_atomic_record_identity_stale_reuse_cmdline_and_cwd(tmp_path):
    process = sleeper(tmp_path)
    try:
        item = record(process, "memorynode-test", tmp_path, 1234)
        path = tmp_path / "processes.json"
        atomic_write(path, {"api": item})
        assert json.loads(path.read_text())["api"]["pid"] == process.pid
        assert identity(item)[0] == "running"
        assert identity({**item, "create_time": item["create_time"] - 10})[0] == "foreign"
        assert identity({**item, "command_marker": "not-the-command"})[0] == "foreign"
        assert identity({**item, "cwd": str(tmp_path / "other")})[0] == "foreign"
    finally:
        stop_tree(psutil.Process(process.pid), timeout=.2)
    assert identity(item)[0] == "stale"


def test_stop_tree_terminates_descendants(tmp_path):
    code = "import subprocess,sys,time; subprocess.Popen([sys.executable,'-c','import time;time.sleep(60)']); time.sleep(60)"
    parent = subprocess.Popen([sys.executable, "-c", code], cwd=tmp_path)
    root = psutil.Process(parent.pid)
    for _ in range(20):
        children = root.children()
        if children: break
        time.sleep(.05)
    child_pid = children[0].pid
    stop_tree(root, timeout=.2)
    assert not psutil.pid_exists(parent.pid) and not psutil.pid_exists(child_pid)
