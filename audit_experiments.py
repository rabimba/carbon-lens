#!/usr/bin/env python3
"""
Carbon Lens — Empirical Audit & Telemetry Scanner
Scans every Baseline and Twist directory under experiments/, counts files,
LOC, words, checks external CDN dependencies, and outputs summary JSON.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
EXPERIMENTS = ["portals", "auden", "entrepreneur"]
TEXT_EXTS = {".html", ".css", ".js", ".mjs", ".json", ".py", ".md", ".csv", ".txt", ".glsl", ".svg"}


def scan_folder(folder: Path) -> dict:
    files = []
    total_loc = 0
    total_words = 0
    total_bytes = 0
    external_urls = set()

    if not folder.exists():
        return {
            "files": 0,
            "loc": 0,
            "words": 0,
            "bytes": 0,
            "externalDeps": 0,
            "externalUrlSamples": [],
            "fileList": [],
        }

    for path in sorted(folder.rglob("*")):
        if not path.is_file() or path.name.startswith(".") or "__pycache__" in path.parts:
            continue
        rel = str(path.relative_to(folder))
        size = path.stat().st_size
        total_bytes += size
        files.append(rel)

        if path.suffix.lower() in TEXT_EXTS:
            text = path.read_text(encoding="utf-8", errors="ignore")
            lines = text.splitlines()
            total_loc += len(lines)
            total_words += len(re.findall(r"\S+", text))

            if path.suffix.lower() in {".html", ".js", ".mjs", ".css"}:
                for match in re.findall(r"""(?:src|href|from)\s*[=(]?\s*['"](https?://[^'"]+)['"]""", text):
                    external_urls.add(match)

    return {
        "files": len(files),
        "loc": total_loc,
        "words": total_words,
        "bytes": total_bytes,
        "externalDeps": len(external_urls),
        "externalUrlSamples": sorted(external_urls)[:10],
        "fileList": files,
    }


def main() -> None:
    report = {}
    for exp in EXPERIMENTS:
        base_dir = ROOT / "experiments" / exp / "baseline"
        twist_dir = ROOT / "experiments" / exp / "twist"
        report[exp] = {
            "baseline": scan_folder(base_dir),
            "twist": scan_folder(twist_dir),
        }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
