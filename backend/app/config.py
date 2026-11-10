from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"

LANGUAGE = os.getenv("ARASAAC_LANGUAGE", "it")
LANGUAGES = [
    s.strip()
    for s in os.getenv("ARASAAC_LANGUAGES", "it,en").split(",")
    if s.strip()
]
SPACY_MODEL = os.getenv("SPACY_MODEL", "it_core_news_md")
PICTOGRAM_RESOLUTION = int(os.getenv("PICTOGRAM_RESOLUTION", "500"))

ARASAAC_API = "https://api.arasaac.org/api"
STATIC_BASE = "https://static.arasaac.org/pictograms"


def pictograms_file(language: str) -> Path:
    return DATA_DIR / f"pictograms_{language}.json"


def keywords_file(language: str) -> Path:
    return DATA_DIR / f"keywords_{language}.json"


PICTOGRAMS_FILE = pictograms_file(LANGUAGE)
KEYWORDS_FILE = keywords_file(LANGUAGE)

CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

_extra = os.getenv("CORS_ORIGINS", "")
if _extra:
    CORS_ORIGINS.extend(o.strip() for o in _extra.split(",") if o.strip())

# --- Livello AI opzionale: OpenCode Go (API OpenAI-compatibile) ---------------
OPENCODE_GO_BASE = os.getenv("OPENCODE_GO_BASE", "https://opencode.ai/zen/go/v1")
OPENCODE_GO_MODEL = os.getenv("OPENCODE_GO_MODEL", "deepseek-v4.1-flash")
OPENCODE_GO_TIMEOUT = float(os.getenv("OPENCODE_GO_TIMEOUT", "60"))
OPENCODE_GO_ENABLED = os.getenv("OPENCODE_GO_ENABLED", "1") not in ("0", "false", "no")
OPENCODE_GO_REASONING = os.getenv("OPENCODE_GO_REASONING", "none")
OPENCODE_GO_MAX_TOKENS = int(os.getenv("OPENCODE_GO_MAX_TOKENS", "600"))
OPENCODE_AUTH_FILE = Path(
    os.getenv("OPENCODE_AUTH_FILE", Path.home() / ".local/share/opencode/auth.json")
)
OPENCODE_SESSION_FILE = DATA_DIR / "opencode_session_id.txt"
