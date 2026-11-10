#!/usr/bin/env bash
# Setup completo del backend: venv, dipendenze, modello spaCy, dati ARASAAC.
set -euo pipefail

cd "$(dirname "$0")"

PYTHON="${PYTHON:-python3}"
SPACY_MODEL="${SPACY_MODEL:-it_core_news_md}"

echo "==> Creo il virtualenv (.venv)"
"$PYTHON" -m venv .venv

echo "==> Aggiorno pip"
.venv/bin/pip install --upgrade pip

echo "==> Installo le dipendenze Python"
.venv/bin/pip install -r requirements.txt

echo "==> Scarico il modello spaCy: $SPACY_MODEL"
.venv/bin/python -m spacy download "$SPACY_MODEL"

echo "==> Scarico i dati ARASAAC (pittogrammi + keywords) in data/"
.venv/bin/python -m app.download_data

echo "==> Setup completato. Avvia con: ./run.sh"
