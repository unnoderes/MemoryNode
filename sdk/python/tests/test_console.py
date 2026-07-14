import json
import threading
from urllib.error import HTTPError
from urllib.request import urlopen

from memorynode.console import make_server


def test_static_console_runtime_config_and_traversal(tmp_path):
    (tmp_path / "index.html").write_text("sentinel", encoding="utf-8")
    server = make_server("127.0.0.1", 0, "http://127.0.0.1:8765", tmp_path)
    thread = threading.Thread(target=server.serve_forever)
    thread.start()
    try:
        base = f"http://127.0.0.1:{server.server_port}"
        config = urlopen(base + "/memorynode-config.js").read().decode()
        assert json.dumps({"apiOrigin": "http://127.0.0.1:8765"}, separators=(",", ":")) in config
        assert urlopen(base + "/index.html").read() == b"sentinel"
        for path in ("/../secret", "/%2e%2e/secret", "/..%5csecret"):
            try:
                urlopen(base + path)
            except HTTPError as exc:
                assert exc.code == 404
            else:
                raise AssertionError("traversal was served")
    finally:
        server.shutdown()
        thread.join(timeout=5)
        server.server_close()
