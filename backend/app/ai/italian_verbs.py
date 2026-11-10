"""Correttore morfologico per verbi italiani.

Il lemmatizzatore di spaCy (modello it) sbaglia diverse forme finite, in
particolare il futuro ("andrò", "mangerò", "verrò") e a volte ne deduce un
tempo errato. Queste regole recuperano l'infinito e il tempo corretti.
"""

from __future__ import annotations

from difflib import SequenceMatcher
from typing import Optional

# forme irregolari frequenti (presente/participio) -> infinito
IRREGULAR_FORMS = {
    "bevo": "bere", "bevi": "bere", "beve": "bere", "beviamo": "bere",
    "bevete": "bere", "bevono": "bere", "bevuto": "bere",
    "vado": "andare", "vai": "andare", "va": "andare", "andiamo": "andare",
    "andate": "andare", "vanno": "andare",
    "faccio": "fare", "fai": "fare", "fa": "fare", "facciamo": "fare",
    "fate": "fare", "fanno": "fare", "fatto": "fare",
    "dico": "dire", "dici": "dire", "dice": "dire", "diciamo": "dire",
    "dite": "dire", "dicono": "dire", "detto": "dire",
    "vengo": "venire", "vieni": "venire", "viene": "venire",
    "veniamo": "venire", "venite": "venire", "vengono": "venire", "venuto": "venire",
    "esco": "uscire", "esci": "uscire", "esce": "uscire", "usciamo": "uscire",
    "uscite": "uscire", "escono": "uscire",
    "muoio": "morire", "muori": "morire", "muore": "morire",
    "moriamo": "morire", "morite": "morire", "muoiono": "morire", "morto": "morire",
    "tengo": "tenere", "tieni": "tenere", "tiene": "tenere",
    "teniamo": "tenere", "tenete": "tenere", "tengono": "tenere", "tenuto": "tenere",
    "siedo": "sedere", "siedi": "sedere", "siede": "sedere", "sediamo": "sedere",
    "sedete": "sedere", "siedono": "sedere",
    "vedo": "vedere", "vedi": "vedere", "vede": "vedere", "vediamo": "vedere",
    "vedete": "vedere", "vedono": "vedere", "visto": "vedere",
    "posso": "potere", "puoi": "potere", "può": "potere", "possiamo": "potere",
    "potete": "potere", "possono": "potere", "potuto": "potere",
    "devo": "dovere", "devi": "dovere", "deve": "dovere", "dobbiamo": "dovere",
    "dovete": "dovere", "devono": "dovere", "dovuto": "dovere",
    "voglio": "volere", "vuoi": "volere", "vuole": "volere",
    "vogliamo": "volere", "volete": "volere", "vogliono": "volere", "voluto": "volere",
    "so": "sapere", "sai": "sapere", "sa": "sapere", "sappiamo": "sapere",
    "sapete": "sapere", "sanno": "sapere", "saputo": "sapere",
    "sto": "stare", "stai": "stare", "sta": "stare", "stiamo": "stare",
    "state": "stare", "stanno": "stare",
    "do": "dare", "dai": "dare", "dà": "dare", "diamo": "dare",
    "date": "dare", "danno": "dare",
}


def irregular_infinitive(word: str) -> Optional[str]:
    return IRREGULAR_FORMS.get(word.lower())

IRREGULAR_FUTURE_STEMS = {
    "andr": "andare",
    "avr": "avere",
    "sar": "essere",
    "far": "fare",
    "dar": "dare",
    "star": "stare",
    "sapr": "sapere",
    "vedr": "vedere",
    "potr": "potere",
    "dovr": "dovere",
    "vorr": "volere",
    "verr": "venire",
    "terr": "tenere",
    "rimarr": "rimanere",
    "berr": "bere",
    "vivr": "vivere",
    "cadr": "cadere",
    "rompr": "rompere",
    "trarr": "trarre",
    "porr": "porre",
}

# desinenze del futuro (ordinate dalla più lunga)
_FUTURE_ENDINGS = ("anno", "emo", "ete", "ai", "à", "ò")
# desinenze dell'imperfetto indicativo (regolari)
_IMPERFECT_ENDINGS = (
    "avamo", "avate", "avano", "avo", "avi", "ava",
    "evamo", "evate", "evano", "evo", "evi", "eva",
    "ivamo", "ivate", "ivano", "ivo", "ivi", "iva",
)


def _strip_ending(word: str, endings: tuple[str, ...]) -> Optional[str]:
    for end in endings:
        if word.endswith(end) and len(word) > len(end) + 1:
            return word[: -len(end)]
    return None


def is_future_form(word: str) -> bool:
    return _strip_ending(word.lower(), _FUTURE_ENDINGS) is not None


def future_infinitive_candidates(word: str) -> list[str]:
    stem = _strip_ending(word.lower(), _FUTURE_ENDINGS)
    if stem is None:
        return []
    if stem in IRREGULAR_FUTURE_STEMS:
        return [IRREGULAR_FUTURE_STEMS[stem]]
    candidates: list[str] = []
    if stem.endswith("er"):
        base = stem[:-2]
        candidates += [base + "are", base + "ere", base + "iare"]
    elif stem.endswith("ir"):
        base = stem[:-2]
        candidates += [base + "ire", base + "ere"]
    elif stem.endswith("ar") and len(stem) > 2:
        base = stem[:-2]
        candidates += [base + "are", base + "are"]
    else:
        candidates += [stem + "are", stem + "ere", stem + "ire"]
    return candidates


def guess_tense(word: str) -> Optional[str]:
    """Tempo verbale dedotto dalla sola forma ortografica (futuro/imperfetto)."""
    lower = word.lower()
    if is_future_form(lower):
        return "future"
    if _strip_ending(lower, _IMPERFECT_ENDINGS) is not None:
        return "past"
    return None


def looks_like_verb(word: str) -> bool:
    lower = word.lower()
    if len(lower) < 3:
        return False
    if is_future_form(lower):
        return True
    if _strip_ending(lower, _IMPERFECT_ENDINGS) is not None:
        return True
    return lower.endswith(("are", "ere", "ire", "ato", "ito", "uto", "ando", "endo"))


def close_verb_matches(word: str, verb_keywords, limit: int = 5,
                       threshold: float = 0.9) -> list[str]:
    """Match fuzzy dell'infinito contro il vocabolario dei verbi ARASAAC."""
    lower = word.lower()
    scored: list[tuple[float, str]] = []
    for kw in verb_keywords:
        if not kw or kw[0] != lower[0]:
            continue
        if abs(len(kw) - len(lower)) > 3:
            continue
        ratio = SequenceMatcher(None, lower, kw).ratio()
        if ratio >= threshold:
            scored.append((ratio, kw))
    scored.sort(key=lambda x: (-x[0], len(x[1])))
    return [kw for _, kw in scored[:limit]]
