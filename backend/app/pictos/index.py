"""Indice locale dei pittogrammi ARASAAC per il matching parola -> pittogramma."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from difflib import SequenceMatcher
from functools import lru_cache
from typing import Optional

from ..config import (
    LANGUAGE,
    PICTOGRAM_RESOLUTION,
    STATIC_BASE,
    keywords_file,
    pictograms_file,
)

# type grammaticale ARASAAC -> nome
KEYWORD_TYPES = {
    1: "aggettivo",
    2: "nome",
    3: "verbo",
    4: "avverbio",
    5: "espressione",
    6: "altro",
}

_ARTICLES = {
    "il", "lo", "la", "i", "gli", "le", "l", "un", "uno", "una", "un'",
    "dei", "degli", "delle", "del", "dello", "della",
}
_PARENS_RE = re.compile(r"[\(\[\{][^\)\]\}]*[\)\]\}]")
_NON_WORD_RE = re.compile(r"[^\w\s'àèéìòùÀÈÉÌÒÙ]", re.UNICODE)
_WS_RE = re.compile(r"\s+")

_HAIR = {
    "brown": "A65E26", "blonde": "FDD700", "red": "ED4120", "black": "020100",
    "gray": "EFEFEF", "darkGray": "AAABAB", "darkBrown": "6A2703",
}
_SKIN = {
    "white": "F5E5DE", "black": "A65C17", "assian": "F4ECAD",
    "mulatto": "E3AB72", "aztec": "CF9D7C",
}


def normalize(text: str) -> str:
    """Normalizza una parola/espressione per il matching."""
    text = text.lower().strip()
    text = _PARENS_RE.sub(" ", text)
    text = text.replace("’", "'")
    text = _NON_WORD_RE.sub(" ", text)
    text = _WS_RE.sub(" ", text).strip()
    if not text:
        return ""
    parts = text.split(" ")
    if len(parts) > 1 and parts[0] in _ARTICLES:
        parts = parts[1:]
    return " ".join(parts).strip()


@dataclass(frozen=True)
class PictogramEntry:
    id: int
    keyword: str
    normalized: str
    plural: Optional[str] = None
    type: Optional[int] = None
    has_locution: bool = False
    schematic: bool = False
    aac: bool = False
    categories: tuple[str, ...] = field(default_factory=tuple)

    def image_url(
        self,
        *,
        plural: bool = False,
        action: Optional[str] = None,
        nocolor: bool = False,
        hair: Optional[str] = None,
        skin: Optional[str] = None,
        resolution: int = PICTOGRAM_RESOLUTION,
    ) -> str:
        mods: list[str] = []
        if plural:
            mods.append("plural")
        if action in ("past", "future"):
            mods.append(f"action-{action}")
        if nocolor:
            mods.append("nocolor")
        if hair and hair in _HAIR:
            mods.append(f"hair-{_HAIR[hair]}")
        if skin and skin in _SKIN:
            mods.append(f"skin-{_SKIN[skin]}")
        suffix = ("_" + "_".join(mods)) if mods else ""
        return f"{STATIC_BASE}/{self.id}/{self.id}{suffix}_{resolution}.png"


class PictogramIndex:
    def __init__(self, pictograms: list[dict], keywords: list[str] | None = None):
        self.by_id: dict[int, PictogramEntry] = {}
        self.by_keyword: dict[str, list[PictogramEntry]] = {}
        self.keywords: list[str] = []

        for picto in pictograms:
            pid = picto.get("_id")
            if pid is None:
                continue
            cats = tuple(picto.get("categories") or ())
            for kw in picto.get("keywords") or ():
                raw_kw = (kw.get("keyword") or "").strip()
                if not raw_kw:
                    continue
                norm = normalize(raw_kw)
                if not norm:
                    continue
                entry = PictogramEntry(
                    id=pid,
                    keyword=norm,
                    normalized=norm,
                    plural=normalize(kw["plural"]) if kw.get("plural") else None,
                    type=kw.get("type"),
                    has_locution=bool(kw.get("hasLocution")),
                    schematic=bool(picto.get("schematic")),
                    aac=bool(picto.get("aac")),
                    categories=cats,
                )
                self.by_id.setdefault(pid, entry)
                self.by_keyword.setdefault(norm, []).append(entry)
                if entry.plural:
                    self.by_keyword.setdefault(entry.plural, []).append(entry)

        if keywords:
            cleaned = {normalize(k) for k in keywords}
            cleaned.discard("")
            self.keywords = sorted(cleaned)
        else:
            self.keywords = sorted(self.by_keyword.keys())

        self.verb_keywords = sorted(
            {e.keyword for entries in self.by_keyword.values()
             for e in entries if e.type == 3}
        )

    # -- matching ---------------------------------------------------------
    def candidates(self, word: str) -> list[PictogramEntry]:
        norm = normalize(word)
        if not norm:
            return []
        exact = self.by_keyword.get(norm)
        if exact:
            return list(exact)
        return self._near(norm)

    def _near(self, norm: str, limit: int = 6) -> list[PictogramEntry]:
        out: list[PictogramEntry] = []
        seen: set[int] = set()

        def push(entries):
            for e in entries:
                if e.id not in seen:
                    seen.add(e.id)
                    out.append(e)

        for key in self.keywords:
            if key.startswith(norm) and 0 < len(key) - len(norm) <= 1:
                push(self.by_keyword.get(key, ()))
                if len(out) >= limit:
                    return out
        if len(out) >= limit:
            return out

        scored: list[tuple[float, str]] = []
        for key in self.keywords:
            if not key or not norm or key[0] != norm[0]:
                continue
            if abs(len(key) - len(norm)) > 3:
                continue
            ratio = SequenceMatcher(None, norm, key).ratio()
            if ratio >= 0.9:
                scored.append((ratio, key))
        scored.sort(key=lambda x: (-x[0], len(x[1])))
        for _, key in scored:
            push(self.by_keyword.get(key, ()))
            if len(out) >= limit:
                break
        return out

    @staticmethod
    def best(entries: list[PictogramEntry], prefer_type: Optional[int] = None,
             prefer_locution: bool = False) -> Optional[PictogramEntry]:
        if not entries:
            return None

        def score(e: PictogramEntry) -> tuple:
            type_match = 0 if (prefer_type is not None and e.type == prefer_type) else 1
            loc = 0 if (prefer_locution and e.has_locution) else 1
            return (type_match, loc, 0 if e.aac else 1, 1 if e.schematic else 0, e.id)

        return min(entries, key=score)

    def search(self, query: str, limit: int = 30) -> list[PictogramEntry]:
        norm = normalize(query)
        if not norm:
            return []
        results: list[PictogramEntry] = []
        seen: set[int] = set()

        def push(entries):
            for e in entries:
                if e.id not in seen:
                    seen.add(e.id)
                    results.append(e)

        push(self.by_keyword.get(norm, ()))
        for key in self.keywords:
            if norm in key:
                push(self.by_keyword.get(key, ()))
            if len(results) >= limit:
                break
        return results[:limit]

    def get(self, pid: int) -> Optional[PictogramEntry]:
        return self.by_id.get(pid)

    def exact_lookup(self, word: str) -> Optional[PictogramEntry]:
        """Matching ESATTO (nessun sinonimo): solo la parola/lemma richiesto."""
        norm = normalize(word)
        if not norm:
            return None
        entries = self.by_keyword.get(norm)
        if not entries:
            return None
        return self.best(entries)

    def alternatives(self, word: str, prefer_type: Optional[int] = None,
                     limit: int = 6) -> list[PictogramEntry]:
        """Pittogrammi suggeriti per una parola (esatti + simili), per l'LLM."""
        norm = normalize(word)
        if not norm:
            return []
        out: list[PictogramEntry] = []
        seen: set[int] = set()

        def push(entries):
            for entry in entries:
                if entry.id not in seen:
                    seen.add(entry.id)
                    out.append(entry)

        push(self.by_keyword.get(norm, ()))
        push(self._near(norm, limit=limit))
        if len(out) < limit:
            for entry in self.search(norm, limit=limit * 2):
                key = entry.normalized
                if key.startswith(norm) or " " not in key:
                    push([entry])
                if len(out) >= limit:
                    break

        def score(e: PictogramEntry) -> tuple:
            type_match = 0 if (prefer_type is not None and e.type == prefer_type) else 1
            exact = 0 if e.normalized == norm else 1
            return (exact, type_match, 0 if e.aac else 1, e.id)

        out.sort(key=score)
        return out[:limit]


@lru_cache(maxsize=8)
def load_index(language: str = LANGUAGE) -> PictogramIndex:
    picto_path = pictograms_file(language)
    kw_path = keywords_file(language)
    if not picto_path.exists():
        raise FileNotFoundError(
            f"File dati mancante: {picto_path}. Esegui 'python -m app.download_data'."
        )
    with open(picto_path, encoding="utf-8") as fh:
        pictograms = json.load(fh)

    keywords = None
    if kw_path.exists():
        with open(kw_path, encoding="utf-8") as fh:
            data = json.load(fh)
            keywords = data.get("words") if isinstance(data, dict) else data

    index = PictogramIndex(pictograms, keywords)
    print(
        f"[index] {language}: {len(index.by_id)} pittogrammi, "
        f"{len(index.by_keyword)} chiavi"
    )
    return index
