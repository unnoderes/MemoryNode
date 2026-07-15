from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
import tempfile
import venv
from pathlib import Path


WHEEL_PATTERN = re.compile(r"^memorynode-(?P<version>.+)-py3-none-any\.whl$")


def run(*command: str, cwd: Path, env: dict[str, str]) -> str:
    result = subprocess.run(
        command, cwd=cwd, env=env, check=True, text=True, capture_output=True
    )
    if result.stdout:
        print(result.stdout.rstrip())
    if result.stderr:
        print(result.stderr.rstrip(), file=sys.stderr)
    return result.stdout.strip()


def artifacts(directory: Path) -> tuple[Path, Path, str]:
    wheels = list(directory.glob("memorynode-*.whl"))
    sdists = list(directory.glob("memorynode-*.tar.gz"))
    if len(wheels) != 1 or len(sdists) != 1:
        raise RuntimeError(
            f"expected one wheel and one sdist in {directory}, found {len(wheels)} wheel(s) and {len(sdists)} sdist(s)"
        )
    match = WHEEL_PATTERN.fullmatch(wheels[0].name)
    if not match:
        raise RuntimeError(f"unexpected wheel filename: {wheels[0].name}")
    version = match.group("version")
    if sdists[0].name != f"memorynode-{version}.tar.gz":
        raise RuntimeError(f"sdist version does not match wheel: {sdists[0].name}")
    return wheels[0].resolve(), sdists[0].resolve(), version


def venv_python(environment: Path) -> Path:
    return environment / ("Scripts/python.exe" if os.name == "nt" else "bin/python")


def smoke(directory: Path) -> None:
    wheel, sdist, version = artifacts(directory)
    print(f"validating {wheel.name} and {sdist.name}")
    with tempfile.TemporaryDirectory(prefix="memorynode-wheel-smoke-") as temporary:
        root = Path(temporary)
        environment = root / "venv"
        work = root / "outside-repository"
        work.mkdir()
        venv.EnvBuilder(with_pip=True, clear=True).create(environment)
        python = venv_python(environment)
        clean_env = os.environ.copy()
        clean_env.pop("PYTHONPATH", None)
        clean_env["PYTHONDONTWRITEBYTECODE"] = "1"
        run(
            str(python),
            "-m",
            "pip",
            "install",
            "--disable-pip-version-check",
            str(wheel),
            cwd=work,
            env=clean_env,
        )
        probe = (
            "import importlib.metadata as metadata; "
            "import memorynode; "
            "import memorynode.backend.main; "
            "from memorynode.console import assets_available; "
            f"assert metadata.version('memorynode') == memorynode.__version__ == {version!r}; "
            "assert assets_available(); "
            "print(memorynode.__version__)"
        )
        output = run(str(python), "-c", probe, cwd=work, env=clean_env)
        if output.splitlines()[-1] != version:
            raise RuntimeError(
                f"installed package reported {output!r}, expected {version!r}"
            )
        cli_output = run(
            str(python),
            "-c",
            "from memorynode.cli import main; raise SystemExit(main(['version']))",
            cwd=work,
            env=clean_env,
        )
        if not cli_output or cli_output.splitlines()[-1] != version:
            raise RuntimeError(f"CLI reported {cli_output!r}, expected {version!r}")
    print(f"isolated wheel smoke passed for memorynode {version}")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Install and smoke-test a built MemoryNode wheel"
    )
    parser.add_argument("directory", type=Path, nargs="?", default=Path("dist"))
    args = parser.parse_args()
    try:
        smoke(args.directory.resolve())
    except Exception as exc:
        print(f"release smoke failed: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
