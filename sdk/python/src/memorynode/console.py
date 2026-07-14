from __future__ import annotations

import argparse
import json
import mimetypes
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from importlib.resources import files
from pathlib import PurePosixPath
from urllib.parse import unquote, urlsplit


SENTINEL = "memorynode-console-0.5.0.txt"


def assets_root():
    return files("memorynode").joinpath("console_assets")


def assets_available():
    return assets_root().joinpath(SENTINEL).is_file()


class ConsoleHandler(BaseHTTPRequestHandler):
    assets = None
    api_origin = "http://127.0.0.1:8000"

    def do_HEAD(self):
        self._serve(False)

    def do_GET(self):
        self._serve(True)

    def _serve(self, body):
        path = unquote(urlsplit(self.path).path)
        if path == "/":
            self.send_response(302)
            self.send_header("Location", "/proposals/")
            self.end_headers()
            return
        if path == "/memorynode-config.js":
            payload = f"window.__MEMORYNODE_CONFIG__={json.dumps({'apiOrigin': self.api_origin}, separators=(',', ':'))};\n".encode()
            return self._send(payload, "text/javascript; charset=utf-8", body, "no-store")
        parts = PurePosixPath(path.lstrip("/"))
        if not path.startswith("/") or "\\" in path or ".." in parts.parts:
            return self.send_error(404)
        resource = self.assets.joinpath(*parts.parts)
        if resource.is_dir():
            resource = resource.joinpath("index.html")
        if not resource.is_file():
            return self.send_error(404)
        self._send(resource.read_bytes(), mimetypes.guess_type(resource.name)[0] or "application/octet-stream", body)

    def _send(self, payload, content_type, body, cache="public, max-age=3600"):
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", cache)
        self.end_headers()
        if body:
            self.wfile.write(payload)

    def log_message(self, _format, *_args):
        pass


def make_server(host, port, api_origin, assets=None):
    if host != "127.0.0.1":
        raise ValueError("console host must be 127.0.0.1")
    class Handler(ConsoleHandler):
        pass
    Handler.assets = assets or assets_root()
    Handler.api_origin = api_origin
    return ThreadingHTTPServer((host, port), Handler)


def main(argv=None):
    parser = argparse.ArgumentParser(prog="python -m memorynode.console")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, required=True)
    parser.add_argument("--api-port", type=int, required=True)
    args = parser.parse_args(argv)
    if not 1 <= args.port <= 65535 or not 1 <= args.api_port <= 65535 or args.port == args.api_port:
        parser.error("ports must be different and between 1 and 65535")
    if not assets_available():
        parser.error("packaged console assets are missing")
    server = make_server(args.host, args.port, f"http://127.0.0.1:{args.api_port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
