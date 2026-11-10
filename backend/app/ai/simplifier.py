"""Conversione deterministica (AAC) di una frase italiana in pittogrammi ARASAAC."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Optional

from ..config import LANGUAGE
from ..pictos.index import PictogramEntry, PictogramIndex, normalize
from . import italian_verbs
from .pipeline import AnalyzedSentence, TokenInfo

CONTENT_POS = {"NOUN", "PROPN", "VERB", "ADJ", "ADV", "NUM"}
FUNCTION_POS = {"ADP", "PRON", "CCONJ", "SCONJ", "INTJ", "PART"}
SKIP_POS = {"DET", "AUX", "PUNCT", "SYM", "X"}

MAX_LOCUTION = 4
PAST_TENSES = {"Past", "Imp", "Pqp"}


@dataclass
class PictogramItem:
    source: str
    keyword: str
    label: str
    pictogram_id: Optional[int]
    image_url: Optional[str]
    resolved: bool
    type: Optional[int] = None
    type_label: Optional[str] = None
    has_locution: bool = False
    features: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return asdict(self)


def _item_from_entry(entry: PictogramEntry, source: str, features: dict) -> PictogramItem:
    from ..pictos.index import KEYWORD_TYPES

    return PictogramItem(
        source=source,
        keyword=entry.keyword,
        label=source,
        pictogram_id=entry.id,
        image_url=entry.image_url(**features),
        resolved=True,
        type=entry.type,
        type_label=KEYWORD_TYPES.get(entry.type),
        has_locution=entry.has_locution,
        features=features,
    )


def _unresolved(token: TokenInfo) -> PictogramItem:
    return PictogramItem(
        source=token.text,
        keyword=token.lemma,
        label=token.text,
        pictogram_id=None,
        image_url=None,
        resolved=False,
        features={},
    )


def _tense_for(token: TokenInfo) -> Optional[str]:
    if token.pos == "VERB" or italian_verbs.looks_like_verb(token.text):
        guessed = italian_verbs.guess_tense(token.text)
        if guessed:
            return guessed
    if token.tense in PAST_TENSES:
        return "past"
    if token.tense == "Fut":
        return "future"
    return None


def _features_for(token: TokenInfo, entry: PictogramEntry) -> dict:
    # Nessun marcatore automatico di tempo (il futuro/passato non deve apparire).
    features: dict = {}
    if token.number == "Plur" and entry.plural and token.pos != "VERB":
        features["plural"] = True
    return features


def _resolve_verb(token: TokenInfo, index: PictogramIndex) -> Optional[PictogramEntry]:
    """Recupera l'infinito del verbo (futuro/irregolari) e lo cerca nell'indice."""
    candidates = italian_verbs.future_infinitive_candidates(token.text)
    irregular = italian_verbs.irregular_infinitive(token.text)
    if irregular:
        candidates.append(irregular)
    candidates += [token.lemma, token.text]

    seen: set[str] = set()
    for cand in candidates:
        norm = normalize(cand)
        if not norm or norm in seen:
            continue
        seen.add(norm)
        entries = index.by_keyword.get(norm)
        if entries:
            entry = index.best(entries, prefer_type=3)
            if entry is not None:
                return entry

    for kw in italian_verbs.close_verb_matches(token.text, index.verb_keywords):
        entries = index.by_keyword.get(kw)
        if entries:
            entry = index.best(entries, prefer_type=3)
            if entry is not None:
                return entry
    return None


def _find_locution(tokens: list[TokenInfo], start: int, index: PictogramIndex):
    """Cerca la locuzione più lunga a partire da `start` (lemma e superficie)."""
    best = None
    max_len = min(MAX_LOCUTION, len(tokens) - start)
    for length in range(max_len, 1, -1):
        window = tokens[start:start + length]
        if any(t.is_punct or t.is_space for t in window):
            continue
        joined = normalize(" ".join(t.lemma for t in window))
        surface = normalize(" ".join(t.text for t in window))
        for phrase in (joined, surface):
            if not phrase or " " not in phrase:
                continue
            entries = index.by_keyword.get(phrase)
            if entries:
                entry = index.best(entries, prefer_locution=True)
                if entry is not None:
                    best = (length, entry)
                    break
        if best:
            break
    return best


def convert_sentence(sent: AnalyzedSentence, index: PictogramIndex) -> list[PictogramItem]:
    items: list[PictogramItem] = []
    tokens = sent.tokens
    i = 0
    while i < len(tokens):
        token = tokens[i]

        if token.is_punct or token.pos in ("PUNCT", "SYM"):
            i += 1
            continue

        if (
            token.pos in FUNCTION_POS
            and len(normalize(token.lemma or token.text)) <= 1
        ):
            i += 1
            continue

        loc = _find_locution(tokens, i, index)
        if loc:
            length, entry = loc
            source = " ".join(t.text for t in tokens[i:i + length])
            items.append(_item_from_entry(entry, source, {}))
            i += length
            continue

        if token.pos in SKIP_POS or (token.is_stop and token.pos != "VERB"):
            i += 1
            continue

        is_verb = token.pos == "VERB" or token.tag == "V"
        entry = None
        if is_verb:
            entry = _resolve_verb(token, index)
        if entry is None and token.pos in CONTENT_POS:
            entries = index.candidates(token.lemma) or index.candidates(token.text)
            entry = index.best(entries)
        if entry is None and token.pos in FUNCTION_POS:
            entries = index.by_keyword.get(normalize(token.lemma), [])
            entry = index.best(entries)
        if entry is None and not is_verb and italian_verbs.looks_like_verb(token.text):
            entry = _resolve_verb(token, index)

        if entry is not None:
            items.append(_item_from_entry(entry, token.text, _features_for(token, entry)))
        elif token.pos in ("NOUN", "PROPN", "VERB", "ADJ", "NUM", "ADV") or is_verb:
            items.append(_unresolved(token))
        i += 1

    return items


def convert_text(
    text: str, use_llm: bool = True, language: str = LANGUAGE
) -> tuple[list[dict], str]:
    """Converte il testo in sequenze di pittogrammi.

    Ritorna (sequenze, motore_usato). Se `use_llm` ed è disponibile, OpenCode Go
    è il motore primario; in caso di errore si usa il fallback deterministico.
    """
    from .pipeline import analyze
    from . import llm
    from ..pictos.index import load_index

    index = load_index(language)
    sentences = analyze(text)

    engine = "spacy"
    want_llm = use_llm and llm.available()

    sequences = []
    for sent in sentences:
        det_items = convert_sentence(sent, index)
        if not det_items:
            continue
        items = det_items
        if want_llm:
            try:
                items = _refine_with_llm(sent, det_items, index)
                engine = f"opencode-go:{llm.model_name()}"
            except llm.LLMError:
                want_llm = False
                items = det_items
        sequences.append({
            "source": sent.text,
            "items": [item.to_dict() for item in items],
        })
    return sequences, engine


def lookup_words(words: list[str], language: str = LANGUAGE) -> list[dict]:
    """Lookup ESATTO parola -> pittogramma (nessun sinonimo), per l'editor live.

    Prova prima la parola così com'è, poi il suo lemma. Non usa fuzzy né sinonimi.
    La 'word' originale resta quella dell'utente (da mostrare); la keyword interna
    non va visualizzata.
    """
    from .pipeline import lemma_single
    from ..pictos.index import load_index

    index = load_index(language)
    is_italian = language == "it"
    results: list[dict] = []
    for word in words:
        original = word
        entry = index.exact_lookup(word)
        if entry is None:
            candidates: list[str] = []
            if is_italian:
                irregular = italian_verbs.irregular_infinitive(word)
                if irregular:
                    candidates.append(irregular)
                if italian_verbs.is_future_form(word):
                    candidates += italian_verbs.future_infinitive_candidates(word)
                lemma = lemma_single(word)
                if lemma:
                    candidates.append(lemma)
            else:
                # inglese: forme plurali semplici
                low = normalize(word)
                for suffix in ("es", "s"):
                    if low.endswith(suffix) and len(low) > len(suffix) + 1:
                        candidates.append(low[: -len(suffix)])
            for cand in candidates:
                if not cand or normalize(cand) == normalize(word):
                    continue
                entry = index.exact_lookup(cand)
                if entry is not None:
                    break
        if entry is None:
            results.append({
                "word": original, "keyword": None, "pictogram_id": None,
                "image_url": None, "resolved": False,
            })
        else:
            results.append({
                "word": original,
                "keyword": entry.keyword,
                "pictogram_id": entry.id,
                "image_url": entry.image_url(),
                "resolved": True,
            })
    return results


_POS_IT = {
    "NOUN": "nome", "PROPN": "nome proprio", "VERB": "verbo",
    "ADJ": "aggettivo", "ADV": "avverbio", "PRON": "pronome",
    "ADP": "preposizione", "DET": "articolo", "AUX": "ausiliare",
    "CCONJ": "congiunzione", "SCONJ": "congiunzione", "NUM": "numero",
    "INTJ": "interiezione",
}
_GENDER_IT = {"Masc": "maschile", "Fem": "femminile", "Neut": "neutro"}
_NUMBER_IT = {"Sing": "singolare", "Plur": "plurale"}
_TENSE_IT = {"Pres": "presente", "Past": "passato", "Imp": "imperfetto",
             "Fut": "futuro", "Pqp": "trapassato"}

_LLM_SYSTEM = (
    "Trasforma la frase italiana in una sequenza di pittogrammi ARASAAC. "
    "Tieni i concetti chiave (nomi, verbi, aggettivi, avverbi), ometti articoli e "
    "preposizioni. Verbi all'infinito, nomi al singolare (plural:true se plurale). "
    "Indica il tempo del verbo in action: past/future, altrimenti null. "
    "Usa il pittogramma della PAROLA STESSA (forma base): NON usare sinonimi o "
    "parole diverse. Scegli tra i candidati quello che corrisponde alla stessa "
    "parola; se la parola non ha un pittogramma, omettila. "
    "Rispondi SOLO con JSON: "
    '{"items":[{"keyword":"mangiare","source":"mangia","plural":false,"action":"past"}]}'
)


def _morph_summary(tok: TokenInfo) -> str:
    parts = []
    if tok.gender:
        parts.append(_GENDER_IT.get(tok.gender, tok.gender))
    if tok.number:
        parts.append(_NUMBER_IT.get(tok.number, tok.number))
    if tok.pos == "VERB" or tok.tag == "V":
        tense = _tense_for(tok)
        if tense:
            parts.append("tempo: " + tense)
    elif tok.tense:
        parts.append(_TENSE_IT.get(tok.tense, tok.tense))
    return ", ".join(parts)


def _token_candidates(tok: TokenInfo, index: PictogramIndex) -> list[str]:
    is_verb = tok.pos == "VERB" or tok.tag == "V"
    if is_verb:
        prefer = 3
    elif tok.pos in ("NOUN", "PROPN"):
        prefer = 2
    else:
        prefer = None

    words: list[str] = []

    def add_word(word: Optional[str]) -> None:
        word = (word or "").strip()
        if word and word not in words:
            words.append(word)

    if is_verb:
        for cand in italian_verbs.future_infinitive_candidates(tok.text):
            add_word(cand)
        add_word(italian_verbs.irregular_infinitive(tok.text))
    add_word(tok.lemma)
    add_word(tok.text)

    names: list[str] = []
    for word in words:
        for entry in index.alternatives(word, prefer, limit=5):
            if entry.keyword not in names:
                names.append(entry.keyword)
        if len(names) >= 5:
            break
    return names[:5]


def _collect_locutions(sent: AnalyzedSentence, index: PictogramIndex) -> list[str]:
    phrases: list[str] = []
    tokens = sent.tokens
    i = 0
    while i < len(tokens):
        loc = _find_locution(tokens, i, index)
        if loc:
            length, entry = loc
            if " " in entry.keyword and entry.keyword not in phrases:
                phrases.append(entry.keyword)
            i += length
        else:
            i += 1
    return phrases


def _refine_with_llm(sent: AnalyzedSentence, det_items: list[PictogramItem],
                     index: PictogramIndex) -> list[PictogramItem]:
    from . import llm

    word_lines = []
    for tok in sent.tokens:
        if tok.pos not in CONTENT_POS and tok.pos != "PRON":
            continue
        pos = _POS_IT.get(tok.pos, tok.pos)
        morph = _morph_summary(tok)
        label = f"{pos}, {morph}" if morph else pos
        cands = _token_candidates(tok, index)
        cand_txt = ", ".join(cands) if cands else "-"
        word_lines.append(f'- "{tok.text}" ({label}): {cand_txt}')

    locutions = _collect_locutions(sent, index)

    user_prompt = f'Frase: "{sent.text}"\nParole:\n' + "\n".join(word_lines)
    if locutions:
        user_prompt += "\nEspressioni: " + ", ".join(locutions)
    user_prompt += "\nJSON:"

    data = llm.chat_json(
        [
            {"role": "system", "content": _LLM_SYSTEM},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.2,
    )

    raw_items = data.get("items") if isinstance(data, dict) else data
    if not isinstance(raw_items, list) or not raw_items:
        raise llm.LLMError("Risposta LLM senza items")

    from .pipeline import lemma_single

    det_by_source: dict[str, PictogramItem] = {}
    for item in det_items:
        det_by_source.setdefault(normalize(item.source), item)

    refined: list[PictogramItem] = []
    for entry in raw_items:
        if not isinstance(entry, dict):
            continue
        keyword = entry.get("keyword")
        if keyword in (None, "", "null"):
            continue
        keyword = str(keyword).strip()
        norm = normalize(keyword)
        if not norm:
            continue

        source = str(entry.get("source") or keyword).strip()
        det = det_by_source.get(normalize(source))

        # NIENTE sinonimi: la keyword deve appartenere alla stessa parola.
        allowed = {normalize(source), normalize(lemma_single(source))}
        if norm not in allowed:
            if det is not None:
                refined.append(det)
            continue

        found = index.exact_lookup(keyword)
        if found is None:
            if det is not None:
                refined.append(det)
            continue

        # Solo il plurale (nessun marcatore di tempo/futuro).
        feats: dict = {}
        if entry.get("plural") is True and found.plural:
            feats["plural"] = True
        refined.append(_item_from_entry(found, source, feats))

    if not refined:
        raise llm.LLMError("Nessuna voce valida dal modello")
    return refined


class PictogramIndexRef:
    """Deprecato: usa `PictogramIndex` da load_index(language)."""

    @classmethod
    def get(cls, language: str = LANGUAGE) -> PictogramIndex:
        from ..pictos.index import load_index

        return load_index(language)
