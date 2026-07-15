from __future__ import annotations

import argparse
import ast
import re
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "sdk" / "python"
VERSION_FILE = PACKAGE / "src" / "memorynode" / "_version.py"
PYPROJECT = PACKAGE / "pyproject.toml"
PROJECT_NAME = "memorynode"
VERSION_PATTERN = re.compile(r"^[0-9]+\.[0-9]+\.[0-9]+(?:[a-zA-Z0-9.-]+)?$")


def read_version() -> str:
    tree = ast.parse(
        VERSION_FILE.read_text(encoding="utf-8"), filename=str(VERSION_FILE)
    )
    for statement in tree.body:
        if not isinstance(statement, ast.Assign) or len(statement.targets) != 1:
            continue
        target = statement.targets[0]
        if isinstance(target, ast.Name) and target.id == "__version__":
            value = ast.literal_eval(statement.value)
            if isinstance(value, str) and VERSION_PATTERN.fullmatch(value):
                return value
    raise RuntimeError(f"valid __version__ assignment not found in {VERSION_FILE}")


def validate_configuration(version: str) -> None:
    pyproject = PYPROJECT.read_text(encoding="utf-8")
    if 'dynamic = ["version"]' not in pyproject:
        raise RuntimeError("pyproject.toml must declare version as dynamic")
    hatch_version = re.search(
        r"\[tool\.hatch\.version\](.*?)(?:\n\[|\Z)", pyproject, re.DOTALL
    )
    if (
        not hatch_version
        or 'path = "src/memorynode/_version.py"' not in hatch_version.group(1)
    ):
        raise RuntimeError("Hatch version source must be src/memorynode/_version.py")

    expected_references = {
        "sdk/python/src/memorynode/__init__.py": "from ._version import __version__",
        "sdk/python/src/memorynode/cli.py": "from ._version import __version__ as VERSION",
        "sdk/python/src/memorynode/mcp_server.py": "from ._version import __version__ as VERSION",
        "scripts/build_release.py": 'SENTINEL = f"memorynode-console-{VERSION}.txt"',
        "frontend/app/layout.jsx": "NEXT_PUBLIC_MEMORYNODE_VERSION",
    }
    for relative_path, expected in expected_references.items():
        contents = (ROOT / relative_path).read_text(encoding="utf-8")
        if expected not in contents:
            raise RuntimeError(
                f"{relative_path} is not wired to the central version: missing {expected!r}"
            )

    print(f"release configuration is consistent for {PROJECT_NAME} {version}")


def validate_tag(tag: str, version: str) -> None:
    expected = f"v{version}"
    if tag != expected:
        raise RuntimeError(
            f"release tag {tag!r} does not match package version; expected {expected!r}"
        )
    print(f"release tag matches package version: {tag}")


def require_version_available(version: str) -> None:
    url = f"https://pypi.org/pypi/{quote(PROJECT_NAME)}/{quote(version)}/json"
    request = Request(url, headers={"User-Agent": "MemoryNode release validation"})
    try:
        with urlopen(request, timeout=20):
            pass
    except HTTPError as exc:
        if exc.code == 404:
            print(f"PyPI version is available: {PROJECT_NAME} {version}")
            return
        raise RuntimeError(
            f"PyPI availability check failed with HTTP {exc.code}"
        ) from exc
    except URLError as exc:
        raise RuntimeError(f"PyPI availability check failed: {exc.reason}") from exc
    raise RuntimeError(
        f"PyPI already contains {PROJECT_NAME} {version}; versions cannot be overwritten"
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate MemoryNode release version configuration"
    )
    parser.add_argument("--tag", help="require an exact v<package-version> release tag")
    parser.add_argument(
        "--check-pypi",
        action="store_true",
        help="fail if this exact version already exists on PyPI",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        version = read_version()
        validate_configuration(version)
        if args.tag:
            validate_tag(args.tag, version)
        if args.check_pypi:
            require_version_available(version)
    except Exception as exc:
        print(f"release version check failed: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
