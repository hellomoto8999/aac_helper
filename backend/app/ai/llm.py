"""Client per OpenCode Go (API OpenAI-compatibile) usato come motore AI primario."""

from __future__ import annotations

import json
import os
import re
import uuid
from typing import Optional

import httpx

from ..config import (
    OPENCODE_AUTH_FILE,
    OPENCODE_GO_BASE,
    OPENCODE_GO_MAX_TOKENS,
    OPENCODE_GO_MODEL,
    OPENCODE_GO_REASONING,
    OPENCODE_GO_TIMEOUT,
    OPENCODE_SESSION_FILE,
)

_MODEL = OPENCODE_GO_MODEL
_CLIENT: Optional[httpx.Client] = None


def _client() -> httpx.Client:
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = httpx.Client(timeout=OPENCODE_GO_TIMEOUT)
    return _CLIENT


class LLMError(RuntimeError):
    pass


def _api_key() -> Optional[str]:
    key = os.getenv("OPENCODE_API_KEY")
    if key:
        return key.strip()
    try:
        data = json.loads(OPENCODE_AUTH_FILE.read_text(encoding="utf-8"))
        entry = data.get("opencode-go") or {}
        return entry.get("key")
    except (OSError, json.JSONDecodeError):
        return None


def available() -> bool:
    return bool(_api_key())


def model_name() -> str:
    return _MODEL


def _session_id() -> str:
    try:
        if OPENCODE_SESSION_FILE.exists():
            sid = OPENCODE_SESSION_FILE.read_text(encoding="utf-8").strip()
            if sid:
                return sid
        sid = "arasaac-dashboard-" + uuid.uuid4().hex
        OPENCODE_SESSION_FILE.parent.mkdir(parents=True, exist_ok=True)
        OPENCODE_SESSION_FILE.write_text(sid, encoding="utf-8")
        return sid
    except OSError:
        return "arasaac-dashboard-" + uuid.uuid4().hex


def chat(
    messages: list[dict],
    *,
    model: Optional[str] = None,
    temperature: float = 0.1,
    max_tokens: Optional[int] = None,
) -> str:
    key = _api_key()
    if not key:
        raise LLMError("Chiave OpenCode Go non disponibile (auth.json o OPENCODE_API_KEY)")

    payload = {
        "model": model or _MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens or OPENCODE_GO_MAX_TOKENS,
    }
    if OPENCODE_GO_REASONING:
        payload["reasoning_effort"] = OPENCODE_GO_REASONING
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "x-opencode-session": _session_id(),
        "User-Agent": "arasaac-dashboard/0.1",
    }
    try:
        resp = _client().post(f"{OPENCODE_GO_BASE}/chat/completions",
                              json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()
    except httpx.HTTPStatusError as exc:
        body = exc.response.text[:300]
        raise LLMError(f"OpenCode Go HTTP {exc.response.status_code}: {body}") from exc
    except httpx.HTTPError as exc:
        raise LLMError(f"Errore di rete verso OpenCode Go: {exc}") from exc

    try:
        return data["choices"][0]["message"]["content"] or ""
    except (KeyError, IndexError, TypeError) as exc:
        raise LLMError("Risposta LLM inattesa") from exc


_JSON_RE = re.compile(r"\{.*\}|\[.*\]", re.DOTALL)


def chat_json(messages: list[dict], **kwargs) -> object:
    """Chiama il modello e prova a estrarre un oggetto/array JSON dalla risposta."""
    content = chat(messages, **kwargs)
    match = _JSON_RE.search(content)
    if not match:
        raise LLMError("Nessun JSON nella risposta del modello")
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError as exc:
        raise LLMError(f"JSON non valido: {exc}") from exc
