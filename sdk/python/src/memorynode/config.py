from __future__ import annotations

import os
import sys
from dataclasses import dataclass, field
from pathlib import Path

try:
    from platformdirs import PlatformDirs
except ImportError:
    class PlatformDirs:
        def __init__(self, appname, appauthor=False):
            root = Path.home() / f".{appname.lower()}"
            self.user_config_path = root / "config"
            self.user_data_path = root / "data"
            self.user_log_path = root / "logs"
            self.user_runtime_path = root / "run"

if sys.version_info >= (3, 11):
    import tomllib
else:
    import tomli as tomllib


@dataclass(frozen=True)
class Paths:
    config: Path
    data: Path
    logs: Path
    run: Path
    backups: Path | None = None
    exports: Path | None = None

    def __post_init__(self):
        if self.backups is None:
            object.__setattr__(self, "backups", self.data / "backups")
        if self.exports is None:
            object.__setattr__(self, "exports", self.data / "exports")

    @classmethod
    def current(cls):
        if home := os.getenv("MEMORYNODE_HOME"):
            root = Path(home).expanduser().resolve()
            return cls(root / "config", root / "data", root / "logs", root / "run", root / "backups", root / "exports")
        dirs = PlatformDirs("MemoryNode", appauthor=False)
        data = Path(dirs.user_data_path)
        runtime = Path(dirs.user_runtime_path) if dirs.user_runtime_path else data / "run"
        return cls(Path(dirs.user_config_path), data, Path(dirs.user_log_path), runtime, data / "backups", data / "exports")

    def create(self):
        for path in (self.config, self.data, self.logs, self.run, self.backups, self.exports):
            path.mkdir(parents=True, exist_ok=True)

    @property
    def config_file(self): return self.config / "config.toml"
    @property
    def process_file(self): return self.run / "processes.json"
    @property
    def database(self): return self.data / "memorynode.db"


@dataclass(frozen=True)
class GovernancePolicy:
    allow_agent_approval: bool = False
    allow_agent_reject: bool = False
    allow_agent_revoke: bool = False
    allow_agent_supersede: bool = False
    allow_agent_set_expiry: bool = False


@dataclass(frozen=True)
class Config:
    source_root: Path | None = None
    api_host: str = "127.0.0.1"
    api_port: int = 8000
    console_host: str = "127.0.0.1"
    console_port: int = 3000
    governance: GovernancePolicy = field(default_factory=GovernancePolicy)


def valid_source_root(root):
    root = Path(root).expanduser().resolve()
    return root if (root / "backend/app/main.py").is_file() and (root / "frontend/package.json").is_file() else None


def load_config(args=None, paths=None, environ=None):
    paths = paths or Paths.current()
    environ = os.environ if environ is None else environ
    raw = {}
    if paths.config_file.is_file():
        with paths.config_file.open("rb") as stream:
            raw = tomllib.load(stream)
    server, console, source = raw.get("server", {}), raw.get("console", {}), raw.get("source", {})
    def value(name, env, section, default):
        cli_value = getattr(args, name, None)
        if cli_value is not None: return cli_value
        if env in environ: return environ[env]
        return section.get(name.rsplit("_", 1)[-1], default)
    root_value = value("source_root", "MEMORYNODE_SOURCE_ROOT", source, "")
    config = Config(
        Path(root_value).expanduser().resolve() if root_value else None,
        str(value("api_host", "MEMORYNODE_API_HOST", server, "127.0.0.1")),
        _port(value("api_port", "MEMORYNODE_API_PORT", server, 8000), "API"),
        str(value("console_host", "MEMORYNODE_CONSOLE_HOST", console, "127.0.0.1")),
        _port(value("console_port", "MEMORYNODE_CONSOLE_PORT", console, 3000), "console"),
        load_governance_policy(paths),
    )
    if config.api_host != "127.0.0.1" or config.console_host != "127.0.0.1":
        raise ValueError("hosts must be 127.0.0.1")
    if config.api_port == config.console_port:
        raise ValueError("API and console ports must be different")
    return config


def load_governance_policy(paths=None):
    paths = paths or Paths.current()
    raw = {}
    if paths.config_file.is_file():
        with paths.config_file.open("rb") as stream:
            raw = tomllib.load(stream)
    section = raw.get("governance", {})
    values = {}
    for name in (
        "allow_agent_approval",
        "allow_agent_reject",
        "allow_agent_revoke",
        "allow_agent_supersede",
        "allow_agent_set_expiry",
    ):
        value = section.get(name, False)
        if not isinstance(value, bool):
            raise ValueError(f"governance.{name} must be a TOML boolean")
        values[name] = value
    return GovernancePolicy(**values)


def _port(value, label):
    try: value = int(value)
    except (TypeError, ValueError): raise ValueError(f"{label} port must be an integer") from None
    if not 1 <= value <= 65535: raise ValueError(f"{label} port must be 1-65535")
    return value


def initialize(source_root=None, paths=None):
    paths = paths or Paths.current()
    root = valid_source_root(source_root) if source_root else None
    if source_root and not root:
        raise ValueError("invalid source root; run: memorynode init --source-root <MemoryNode repository>")
    paths.create()
    if paths.config_file.exists(): return False
    text = (
        '[server]\nhost = "127.0.0.1"\nport = 8000\n\n'
        '[console]\nhost = "127.0.0.1"\nport = 3000\n\n'
        '[governance]\n'
        'allow_agent_approval = false\n'
        'allow_agent_reject = false\n'
        'allow_agent_revoke = false\n'
        'allow_agent_supersede = false\n'
        'allow_agent_set_expiry = false\n'
    )
    if root:
        text += f'\n[source]\nroot = "{root.as_posix()}"\n'
    paths.config_file.write_text(text, encoding="utf-8")
    return True
