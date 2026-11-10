"""Analisi linguistica del testo italiano con spaCy (token, POS, lemmi)."""

from __future__ import annotations

from dataclasses import dataclass, field
from functools import lru_cache
from typing import Optional

from ..config import SPACY_MODEL


@dataclass
class TokenInfo:
    text: str
    lemma: str
    pos: str
    tag: str
    is_stop: bool
    is_punct: bool
    is_space: bool
    dep: str
    head_text: str = ""
    number: Optional[str] = None
    gender: Optional[str] = None
    tense: Optional[str] = None
    verb_form: Optional[str] = None
    mood: Optional[str] = None

    @property
    def lower(self) -> str:
        return self.text.lower()


@dataclass
class AnalyzedSentence:
    text: str
    tokens: list[TokenInfo] = field(default_factory=list)


@lru_cache(maxsize=1)
def _nlp():
    import spacy

    try:
        nlp = spacy.load(SPACY_MODEL, disable=["ner"])
    except OSError as exc:  # pragma: no cover
        raise RuntimeError(
            f"Modello spaCy '{SPACY_MODEL}' non trovato. "
            f"Esegui: python -m spacy download {SPACY_MODEL}"
        ) from exc
    return nlp


def _token_info(tok) -> TokenInfo:
    morph = tok.morph
    number = morph.get("Number")
    gender = morph.get("Gender")
    tense = morph.get("Tense")
    verb_form = morph.get("VerbForm")
    mood = morph.get("Mood")
    return TokenInfo(
        text=tok.text,
        lemma=(tok.lemma_ or tok.text).lower(),
        pos=tok.pos_,
        tag=tok.tag_,
        is_stop=tok.is_stop,
        is_punct=tok.is_punct,
        is_space=tok.is_space,
        dep=tok.dep_,
        head_text=tok.head.text if tok.head is not tok else "",
        number=number[0] if number else None,
        gender=gender[0] if gender else None,
        tense=tense[0] if tense else None,
        verb_form=verb_form[0] if verb_form else None,
        mood=mood[0] if mood else None,
    )


def analyze(text: str) -> list[AnalyzedSentence]:
    """Divide il testo in frasi e restituisce i token linguistici."""
    nlp = _nlp()
    doc = nlp(text)
    sentences: list[AnalyzedSentence] = []
    for sent in doc.sents:
        tokens = [
            _token_info(tok) for tok in sent
            if not tok.is_space
        ]
        if not tokens:
            continue
        sentences.append(AnalyzedSentence(text=sent.text.strip(), tokens=tokens))
    return sentences


@lru_cache(maxsize=16384)
def lemma_single(word: str) -> str:
    """Lemma di una singola parola (per il lookup nell'editor)."""
    nlp = _nlp()
    doc = nlp(word)
    for tok in doc:
        if not tok.is_space:
            return (tok.lemma_ or tok.text).lower()
    return word.lower()
