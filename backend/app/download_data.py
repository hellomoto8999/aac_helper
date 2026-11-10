"""Scarica e mette in cache i dati ARASAAC (pittogrammi + keywords) per la lingua configurata.

Uso (dalla cartella backend/):
    python -m app.download_data
"""

from __future__ import annotations

import sys

import httpx

from .config import (
    ARASAAC_API,
    DATA_DIR,
    LANGUAGES,
    keywords_file,
    pictograms_file,
)


def _download(url: str, dest, label: str) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    print(f"Download {label}: {url}")
    with httpx.stream("GET", url, timeout=120.0, follow_redirects=True) as r:
        r.raise_for_status()
        total = 0
        with open(dest, "wb") as fh:
            for chunk in r.iter_bytes(chunk_size=1 << 16):
                fh.write(chunk)
                total += len(chunk)
    print(f"  -> {dest} ({total / 1_000_000:.1f} MB)")


def main() -> int:
    try:
        for language in LANGUAGES:
            _download(
                f"{ARASAAC_API}/pictograms/all/{language}",
                pictograms_file(language),
                f"pittogrammi ({language})",
            )
            _download(
                f"{ARASAAC_API}/keywords/{language}",
                keywords_file(language),
                f"keywords ({language})",
            )
    except httpx.HTTPError as exc:
        print(f"Errore di rete durante il download: {exc}", file=sys.stderr)
        return 1
    print(f"Dati salvati in {DATA_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
