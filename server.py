#!/usr/bin/env python3
"""
Carbon Lens — Local Head-to-Head Observatory Server
Zero-dependency static + telemetry HTTP server for comparing
True Blind 1-Shot Baselines against Anti-Jagged Multi-Agent Twists.
"""

from __future__ import annotations

import argparse
import http.server
import json
import mimetypes
import os
import socketserver
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent

mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("application/javascript", ".mjs")
mimetypes.add_type("application/json", ".json")
mimetypes.add_type("text/css", ".css")
mimetypes.add_type("image/svg+xml", ".svg")
mimetypes.add_type("application/wasm", ".wasm")


class CarbonLensHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT_DIR), **kwargs)

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def do_GET(self) -> None:
        if self.path.split("?")[0] == "/api/health":
            payload = json.dumps({"status": "ok", "root": str(ROOT_DIR)}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        super().do_GET()


class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the Carbon Lens Observatory server.")
    parser.add_argument("--port", type=int, default=8420, help="Port to bind (default: 8420)")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Host interface (default: 127.0.0.1)")
    args = parser.parse_args()

    os.chdir(ROOT_DIR)
    with ReusableTCPServer((args.host, args.port), CarbonLensHandler) as httpd:
        print(f"Carbon Lens Observatory running at http://{args.host}:{args.port}")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
