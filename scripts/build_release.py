from __future__ import annotations

import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"
SDK = ROOT / "sdk" / "python"
DIST = ROOT / "dist"
SENTINEL = "memorynode-console-0.6.0.txt"
IGNORED = shutil.ignore_patterns(".venv", "dist", "__pycache__", "*.pyc", ".pytest_cache", ".ruff_cache", "*.egg-info")
BANNED_PARTS = {".env", ".next", "node_modules", "__pycache__", "backups", "exports", "logs"}


def run(*command, cwd=None):
    subprocess.run(command, cwd=cwd, check=True)


def members(path):
    if path.suffix == ".whl":
        with zipfile.ZipFile(path) as archive:
            return [(item.filename, archive.read(item)) for item in archive.infolist() if not item.is_dir()]
    with tarfile.open(path, "r:gz") as archive:
        return [(item.name, archive.extractfile(item).read()) for item in archive.getmembers() if item.isfile()]


def audit(path):
    entries = members(path)
    names = {name.replace("\\", "/") for name, _ in entries}
    for name in names:
        parts = {part.lower() for part in Path(name).parts}
        lower = name.lower()
        if parts & BANNED_PARTS or lower.endswith((".pyc", ".db", ".sqlite", ".log")) or lower.endswith("processes.json"):
            raise RuntimeError(f"forbidden artifact member: {name}")
    required = ("memorynode/backend/main.py", f"memorynode/console_assets/{SENTINEL}")
    for suffix in required:
        if not any(name.endswith(suffix) for name in names):
            raise RuntimeError(f"artifact missing {suffix}: {path.name}")
    needles = {
        str(ROOT).encode(),
        str(ROOT).replace("\\", "/").encode(),
        str(Path.home()).encode(),
        str(Path.home()).replace("\\", "/").encode(),
    }
    drive_path = re.compile(rb"[A-Za-z]:[\\/](?:Users|home)[\\/]")
    for name, payload in entries:
        if any(needle and needle in payload for needle in needles) or drive_path.search(payload):
            raise RuntimeError(f"local absolute path in artifact member: {name}")


def safe_extract(sdist, target):
    with tarfile.open(sdist, "r:gz") as archive:
        for item in archive.getmembers():
            path = Path(item.name)
            if path.is_absolute() or ".." in path.parts:
                raise RuntimeError("unsafe sdist member")
        archive.extractall(target)


def main():
    npm = shutil.which("npm")
    uv = shutil.which("uv")
    if not npm or not uv:
        raise RuntimeError("release build requires npm and uv")
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()
    output = FRONTEND / "out"
    try:
        run(npm, "ci", cwd=FRONTEND)
        run(npm, "run", "build", cwd=FRONTEND)
        if not (output / "proposals" / "index.html").is_file() or not (output / "memories" / "detail" / "index.html").is_file():
            raise RuntimeError("static console export is incomplete")
        with tempfile.TemporaryDirectory(prefix="memorynode-release-") as temporary:
            temp = Path(temporary)
            stage = temp / "stage"
            shutil.copytree(SDK, stage, ignore=IGNORED)
            shutil.copytree(ROOT / "backend" / "app", stage / "src" / "memorynode" / "backend", ignore=IGNORED)
            shutil.copytree(output, stage / "src" / "memorynode" / "console_assets")
            (stage / "src" / "memorynode" / "console_assets" / SENTINEL).write_text("MemoryNode console 0.6.0\n", encoding="utf-8")
            sdist_dir = temp / "sdist"
            run(uv, "build", "--sdist", "--out-dir", str(sdist_dir), str(stage))
            sdist = next(sdist_dir.glob("*.tar.gz"))
            unpacked = temp / "unpacked"
            unpacked.mkdir()
            safe_extract(sdist, unpacked)
            source = next(path for path in unpacked.iterdir() if path.is_dir())
            wheel_dir = temp / "wheel"
            run(uv, "build", "--wheel", "--out-dir", str(wheel_dir), str(source))
            artifacts = [sdist, next(wheel_dir.glob("*.whl"))]
            for artifact in artifacts:
                target = DIST / artifact.name
                shutil.copy2(artifact, target)
                audit(target)
                print(f"{target.name}: {target.stat().st_size} bytes")
    finally:
        if output.exists():
            shutil.rmtree(output)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"release build failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
