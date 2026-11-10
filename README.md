# AAC Helper

Editor di testo in stile word processor (**foglio A4 bianco**, TipTap/ProseMirror)
con **pittogrammi AAC ARASAAC posizionati automaticamente sopra le parole**
mentre si scrive. Pensato per preparare verifiche e materiali per studenti, con
formattazione, immagini e stampa/PDF.

> Regole: **nessun sinonimo**. Ad ogni parola corrisponde il pittogramma della
> parola stessa (forma base: verbo all'infinito, nome al singolare). Viene
> mostrata **la parola digitata** dall'utente; la keyword interna non è
> visualizzata e non vengono aggiunti marcatori automatici di tempo (il futuro
> o il passato di un verbo non "appaiono" sul pittogramma).

## Funzionalità

- **Editor rich text** su **foglio A4**: grassetto, corsivo, sottolineato, barrato,
  titoli H1–H3, elenchi, citazioni, allineamento, colore/testo evidenziato,
  carattere e dimensione.
- **Immagini a posizione libera (stile Publisher)**: inserimento da file o URL;
  **trascinale ovunque** sul foglio (posizione assoluta in pixel **ancorata al
  foglio**, quindi stabile e non influenzata dal testo), mantenendo la
  **dimensione che imposti**; **ridimensiona** dalla maniglia.
  Pulsante **"Testo attorno"** (con l'immagine selezionata) per far girare il
  testo attorno all'immagine, se vuoi evitare sovrapposizioni. Incolla/trascina
  immagini direttamente nell'editor; il contenuto sotto non viene perso.
- **Vai a capo automatico** (pulsante `↵`, attivo di default): attiva/disattiva
  il ritorno a capo del testo.
- **Casella di testo** (blocco senza pittogrammi): pulsante "📝 Casella di testo"
  in Home; si **sposta** trascinando la barra e si **ridimensiona** dalla maniglia.
- **Margini laterali regolabili** (16 / 10 / 6 / 3 mm) dalla scheda Home.
- **Mostra/nascondi riquadro** (pulsante `▢`): attiva/disattiva il bordo nero
  delle celle.
- **Pittogrammi automatici** sopra le parole mentre si scrive (riconoscimento
  esatto + forma base dei verbi).
  - **Cella** con riquadro nero che racchiude **parola + pittogramma**.
  - **Segnaposto ricercabile** per TUTTE le parole senza pittogramma, incluse
    congiunzioni, articoli e preposizioni: clicca il riquadro e scegli
    manualmente il simbolo.
  - **Cambio pittogramma**: clicca l'area del pittogramma e scegli da un
    **paniere di simboli simili** (ricerca ARASAAC), come in SymWriter 2.
  - **Personalizzazione**: bianco/nero, colore pelle e capelli.
  - **Wordlist**: le modifiche per parola vengono salvate e riapplicate.
  - **Nessun pittogramma / Predefinito** per singola parola.
  - **Dimensione regolabile** (1.2–6em): le celle si adattano e non si
    sovrappongono.
- **Template a pagina intera**: le tabelle dei modelli riempiono il foglio A4
  (es. una flashcard 1×1 è grande quanto il foglio).
- **Salva / ricarica modelli** ("I miei modelli"): salva il documento corrente
  come modello, poi reinseriscilo; salvati in locale (`localStorage`), restano
  dopo il riavvio; eliminabili dalla galleria.
- **Template**: menu **"Scegli un modello…"** con **galleria in stile Widgit**
  (sidebar per categorie + anteprime per gruppo), **precompilati con etichette
  reali** (giorni della settimana, ore, "Adesso/Poi", numeri delle scale,
  Italiano/English, "Titolo/Scrivi qui…"): Flashcards verticali/orizzontali,
  Carte rotonde/esagonali, Orari e pianificazioni, Supporto alla lettoscrittura
  (con Colourful semantics), Scale, Attività, Comunicazione, Attestati,
  Materiali per Display, Etichette, Doppia lingua.
- **Ribbon in stile Office** (schede Home / Template / Tabella / Stampa,
  **comprimibile**: clic sulla scheda attiva o sulla freccia).
- **Tabelle modificabili**: trascina il **bordo di colonna** per cambiarne la
  larghezza; tasto destro → **"Riga più alta / più bassa"** per l'altezza delle
  celle. I template mostrano **etichette reali** nelle anteprime (giorni, ore,
  "Adesso/Poi", numeri, ecc.).
- **Menu contestuale tabella** (tasto destro dentro una tabella, come Word/
  Excel): inserisci/elimina riga e colonna, altezza riga, unisci/dividi celle,
  riga/colonna di intestazione, elimina tabella.
- **Tema chiaro/scuro**: automatico in base al sistema operativo, con **pulsante
  on/off** in alto a destra (scelta salvata). Il foglio resta bianco.
- **Multilingua IT/EN**: selettore in alto a destra; cambia **interfaccia** e
  **lingua dei pittogrammi**. I pittogrammi già inseriti restano; le nuove parole
  usano la lingua attiva (puoi mescolare IT ed EN liberamente). Nel pannello di
  scelta del pittogramma puoi cercare anche nella lingua opposta.
- **Layout a foglio fisso**: intestazione e ribbon restano fissi, **scorre solo
  la pagina**; il foglio è un **A4 a dimensione fissa**.
- **Selezione con trascinamento** del mouse (anche su più tabelle/paragrafi) e
  cancellazione con **Canc/Delete**.
- **Zoom della pagina** (solo il foglio, 50–300%), avvio al **130%**.
- **Maiuscolo/minuscolo** su tutto il documento.
- **Lettura ad alta voce** del testo (text-to-speech del browser, italiano).
- **Stampa** (nella scheda Stampa) con pittogrammi, solo la pagina A4.
- Interfaccia moderna in stile Kindle (tema carta, essenziale).

### Ispirato a Widgit Online / SymWriter 2

Funzioni di Widgit studiate e già presenti: automatic symbolisation, symbol
chooser (alternative per parola), nascondere il simbolo, wordlist, dimensioni
simboli, skin tone/colore, TTS, PDF/stampa, template a griglie. Ancora da
implementare: **dual language** (traduzione), **symbol spell check**, **mind map**,
riordino parole con drag nel testo, griglie interattive.

## Architettura

```
frontend (React + Vite + TipTap)  --/api-->  backend (FastAPI)
                                                 |
                                                 +--> indice locale ARASAAC (data/*.json)
                                                 +--> spaCy (lemma / verbi italiani)
                                                 +--> immagini da static.arasaac.org
```

Il matching parola → pittogramma usa un **indice locale** costruito dagli endpoint
`GET /api/pictograms/all/it` + `GET /api/keywords/it`, quindi non serve chiamare
l'API ARASAAC ad ogni richiesta.

### Come funziona il posizionamento dei pittogrammi

1. L'editor rileva le parole del documento (debounce ~350 ms).
2. Il frontend chiede al backend `/api/lookup` solo le parole non ancora in cache.
3. Il backend risolve ogni parola con match **esatto** e, per i verbi, con la
   forma base (`app/ai/italian_verbs.py`); nessun sinonimo, nessun fuzzy.
4. L'editor disegna una **cella** attorno a ogni parola: riquadro con il
   **pittogramma** (immagine) sopra e la **parola** sotto. Cliccando l'area del
   pittogramma (o di un riquadro vuoto) si apre il **paniere** per sceglierlo,
   nasconderlo o personalizzarlo; le scelte sono salvate in una wordlist locale
   (`localStorage`). Le parole grammaticali (articoli, preposizioni,
   congiunzioni) non ricevono un pittogramma automatico ma hanno comunque il
   riquadro per la scelta manuale. La dimensione si regola dallo slider
   "Pittogrammi".

## Motore AI (OpenCode Go) — opzionale

L'AI (OpenCode Go, `deepseek-v4.1-flash`) resta integrata per la conversione di
intere frasi (`/api/convert`) con fallback deterministico spaCy, ma **non viene
usata per il posizionamento live** dei pittogrammi nell'editor (che è esatto e
istantaneo). Anche in conversione **non sono ammessi sinonimi**: la keyword deve
appartenere alla stessa parola. La chiave è letta da
`~/.local/share/opencode/auth.json` o da `OPENCODE_API_KEY`.

| Variabile | Default | Descrizione |
| --- | --- | --- |
| `OPENCODE_GO_MODEL` | `deepseek-v4.1-flash` | Modello |
| `OPENCODE_GO_REASONING` | `none` | `none`/`low`/`high`/`max` |
| `OPENCODE_GO_MAX_TOKENS` | `600` | Limite token di output |
| `OPENCODE_GO_ENABLED` | `1` | `0` per disattivare l'AI |

> Nota: OpenCode Go è pensato per agenti di coding e il traffico è monitorato
> per abusi.



## Requisiti

- Python 3.10+ (testato con 3.13)
- Node.js 18+ e npm
- ~10 MB di dati ARASAAC (scaricati in automatico)
- ~50 MB per il modello spaCy

## Avvio rapido (produzione, consigliato)

Il backend serve anche il **frontend compilato**, quindi gira tutto in **un solo
servizio** sulla porta **5173**. È gestito da **systemd** (`aac-helper`):
parte da solo al **boot** e si **riavvia automaticamente** se cade.

```bash
./start.sh     # avvia/riavvia il servizio
./stop.sh      # ferma il servizio
./deploy.sh    # ricompila il frontend e riavvia (dopo modifiche al codice)
```

- URL: `http://<IP-del-server>:5173` (es. `http://<IP>:5173`)
- Stato: `systemctl status aac-helper`
- Abilitato al boot: `systemctl is-enabled aac-helper`

Configurazione del servizio: `/etc/systemd/system/aac-helper.service`.

## Sviluppo (separato)

### 1. Backend

```bash
cd backend
./setup.sh                     # venv + dipendenze + modello spaCy + dati ARASAAC
./run.sh                       # avvia su http://127.0.0.1:8000
```

Setup manuale equivalente:

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m spacy download it_core_news_md
.venv/bin/python -m app.download_data
.venv/bin/uvicorn app.main:app --port 8000
```

### 2. Frontend (dev server con HMR)

```bash
cd frontend
npm install
npm run dev                    # apre http://127.0.0.1:5173 (proxy /api -> 8000)
```

## Accesso dalla rete locale

Il servizio espone tutto su `0.0.0.0`, quindi è raggiungibile da altri
dispositivi della stessa rete:

- Dashboard (unico URL): `http://<IP-del-server>:5173`

Il frontend compilato e l'API sono serviti dalla stessa origine, quindi non serve
alcun proxy. Se chiami l'API da un'altra origine web, aggiungi l'origine
consentita (CORS) con la variabile d'ambiente:

```bash
CORS_ORIGINS="http://<IP-client>:5173" ./run.sh

```

Il proprio IP si ricava con `hostname -I`.

## API

| Metodo | Endpoint                | Descrizione                                   |
| ------ | ----------------------- | --------------------------------------------- |
| GET    | `/api/health`           | Stato backend, lingua, modello, indice        |
| POST   | `/api/lookup`           | `{ "words": ["..."] }` → pittogramma per parola |
| POST   | `/api/convert`          | `{ "text": "..." }` → sequenze di pittogrammi |
| GET    | `/api/search?q=&limit=` | Ricerca pittogrammi                           |
| GET    | `/api/pictogram/{id}`   | Dati di un singolo pittogramma                |

Esempio:

```bash
curl -X POST http://127.0.0.1:8000/api/convert \
  -H 'Content-Type: application/json' \
  -d '{"text":"Il bambino mangia una mela. Domani andrò a scuola."}'
```

## Struttura del progetto

```
arasaac-dashboard/
├── backend/
│   ├── app/
│   │   ├── main.py            endpoint FastAPI
│   │   ├── config.py          configurazione
│   │   ├── download_data.py   download dati ARASAAC
│   │   ├── ai/
│   │   │   ├── pipeline.py        spaCy (token/POS/lemma)
│   │   │   ├── italian_verbs.py   correzione verbi italiani
│   │   │   ├── llm.py             client OpenCode Go
│   │   │   └── simplifier.py      AI + regole AAC + selezione pittogrammi
│   │   └── pictos/
│   │       └── index.py       indice locale parola -> pittogramma
│   ├── data/                  JSON ARASAAC in cache (non versionati)
│   ├── requirements.txt
│   ├── setup.sh
│   └── run.sh
└── frontend/
    ├── src/
    │   ├── App.tsx
    │   ├── api.ts
    │   ├── types.ts
    │   ├── editor/
    │   │   ├── Pictogram.ts         decorazioni pittogrammi sopra le parole
    │   │   ├── extensions.ts        FontSize + immagine ridimensionabile
    │   │   └── templates.ts         template (griglie, orario, ...)
    │   └── components/
    │       ├── PictogramEditor.tsx  editor TipTap
    │       ├── SymbolPicker.tsx     paniere/ricerca pittogrammi
    │       ├── TableContextMenu.tsx menu tasto destro delle tabelle
    │       └── Toolbar.tsx          formattazione/immagini/zoom/stampa
    ├── package.json
    └── vite.config.ts
```

## Sviluppi futuri

- **Template come SymWriter** (vedi sotto).
- Salvataggio/caricamento delle sequenze.
- Export PDF lato server.
- Gestione genere grammaticale (varianti maschile/femminile dei pittogrammi).
- Cache locale delle risposte AI per ridurre ulteriormente costi e latenza.

### Idee per i template (stile SymWriter/Widgit)

1. **Tabelle (griglie)** — FATTO: `@tiptap/extension-table` + menu "Template…"
   con griglie, orario, adesso/poi, colourful semantics; i pittogrammi
   automatici funzionano dentro le celle.
2. **Populate frames**: pannello che riempie automaticamente le celle da una
   wordlist (come la funzione "Populate Frames" di Widgit).
3. **Dimensione per riquadro**: `--picto-size` locale alla cella per griglie con
   simboli piccoli e pagine con simboli grandi.
4. **Now/Next e mind map** più ricchi (due riquadri grandi / nodo centrale +
   rami), sempre come contenuto editabile.
5. **Salvataggio template utente** (come "User Templates" di Widgit).

## Sicurezza e pubblicazione su GitHub

- **Nessun segreto è incluso nel repository.** La chiave di OpenCode Go viene
  letta a runtime da `~/.local/share/opencode/auth.json` (fuori dal repo) oppure
  dalla variabile `OPENCODE_API_KEY`. Lo stesso vale per qualsiasi credenziale.
- **I dati ARASAAC non sono versionati** (`backend/data/` è in `.gitignore`):
  vengono scaricati con `python -m app.download_data`.
- Prima di pubblicare, controlla le variabili d'ambiente e assicurati che `.env`
  non sia mai committato (`.env` e `.env.*` sono ignorati; usa `.env.example`).
- Se esponi il servizio in rete, usa la rete locale/VPN; non aprire la porta su
  Internet senza autenticazione (l'API non ha autenticazione).
- Su GitHub attiva **secret scanning** e **Dependabot** per stare al sicuro.

## Licenza e attribuzione

- Il **codice sorgente** di questo progetto è distribuito con licenza **MIT**
  (vedi `LICENSE`).
- I **pittogrammi** NON sono inclusi nel repository: sono opera di
  **Sergio Palao**, origine **ARASAAC** (<https://arasaac.org>), con licenza
  **CC BY-NC-SA**.
- L'**API ARASAAC** è utilizzabile **solo per applicazioni non commerciali**:
  questa dashboard è destinata a un uso **non commerciale** e deve mantenere
  l'attribuzione ad ARASAAC e all'autore dei pittogrammi.
