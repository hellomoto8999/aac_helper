import { Extension } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { lookupWords, pictogramUrl } from "../api";

const pluginKey = new PluginKey("pictogram");

// parola (minuscola) -> { id, url } oppure null se senza pittogramma
const cache = new Map<string, { id: number; url: string } | null>();
const inflight = new Set<string>();
let timer: number | undefined;
let currentView: EditorView | null = null;
let pictoLanguage = "it";

/** Cambia la lingua dei pittogrammi per il lookup automatico. */
export function setPictogramLanguage(language: string): void {
  // Non azzera la cache: i pittogrammi già risolti restano; le nuove parole
  // vengono cercate nella lingua corrente (consente di mescolare IT/EN).
  pictoLanguage = language;
}

export interface SymbolOverride {
  id: number;
  nocolor?: boolean;
  skin?: string;
  hair?: string;
  size?: number; // dimensione in em (per singolo pittogramma)
}

type OverrideValue = SymbolOverride | null; // null = nascosto

const OVERRIDES_KEY = "aac-symbol-overrides";

function loadOverrides(): Map<string, OverrideValue> {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    if (!raw) return new Map();
    const obj = JSON.parse(raw) as Record<string, OverrideValue>;
    return new Map(Object.entries(obj));
  } catch {
    return new Map();
  }
}

const overrides: Map<string, OverrideValue> = loadOverrides();

function persistOverrides(): void {
  try {
    const obj: Record<string, OverrideValue> = {};
    overrides.forEach((v, k) => (obj[k] = v));
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(obj));
  } catch {
    /* ignore */
  }
}

export function setSymbolOverride(word: string, value: OverrideValue): void {
  const key = normalizeWord(word);
  if (value === null) overrides.set(key, null);
  else overrides.set(key, value);
  persistOverrides();
  refreshPictograms();
}

export function clearSymbolOverride(word: string): void {
  overrides.delete(normalizeWord(word));
  persistOverrides();
  refreshPictograms();
}

export function getSymbolOverride(word: string): OverrideValue | undefined {
  return overrides.get(normalizeWord(word));
}

/** Id del pittogramma effettivamente mostrato per una parola (override o lookup). */
export function getEffectivePictogramId(word: string): number | null {
  const key = normalizeWord(word);
  if (overrides.has(key)) {
    const v = overrides.get(key);
    return v ? v.id : null;
  }
  const c = cache.get(key);
  return c ? c.id : null;
}

/** Dimensione per-parola impostata (em), oppure undefined se usa quella globale. */
export function getWordSize(word: string): number | undefined {
  const v = overrides.get(normalizeWord(word));
  return v ? v.size : undefined;
}

export function refreshPictograms(): void {
  if (currentView && !currentView.isDestroyed) {
    currentView.dispatch(currentView.state.tr.setMeta(pluginKey, true));
  }
}

/** Rilancia il lookup per il documento corrente (es. dopo un ripristino). */
export function schedulePictogramLookup(): void {
  if (currentView && !currentView.isDestroyed) {
    schedule(currentView.state.doc);
  }
}

const WORD_RE = /[\p{L}\p{M}][\p{L}\p{M}'’-]*/gu;

// parole grammaticali: non risolte automaticamente (ma scelte manualmente sì)
const FUNCTION_WORDS = new Set([
  "il", "lo", "la", "i", "gli", "le", "l", "un", "uno", "una",
  "di", "a", "da", "in", "con", "su", "per", "tra", "fra",
  "e", "ed", "o", "od", "ma", "che",
  "del", "dello", "della", "dei", "degli", "delle",
  "al", "allo", "alla", "ai", "agli", "alle",
  "dal", "dallo", "dalla", "dai", "dagli", "dalle",
  "nel", "nello", "nella", "nei", "negli", "nelle",
  "sul", "sullo", "sulla", "sui", "sugli", "sulle",
]);

function normalizeWord(word: string): string {
  return word.toLowerCase();
}

function isFunctionWord(word: string): boolean {
  return FUNCTION_WORDS.has(normalizeWord(word));
}

function eachWord(
  doc: PMNode,
  fn: (
    word: string,
    from: number,
    to: number,
    marks: readonly import("@tiptap/pm/model").Mark[],
  ) => void,
) {
  doc.descendants((node, pos) => {
    // La casella di testo NON riceve pittogrammi.
    if (node.type.name === "textBox") return false;
    if (!node.isText || !node.text) return;
    WORD_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = WORD_RE.exec(node.text)) !== null) {
      const word = match[0];
      fn(word, pos + match.index, pos + match.index + word.length, node.marks);
    }
  });
}

/** Espande una selezione ai confini della parola, per non spezzare le celle. */
export function expandToWordRange(
  doc: PMNode,
  from: number,
  to: number,
): { from: number; to: number } {
  let start = from;
  let end = to;
  const wordChar = /[\p{L}\p{M}'’-]/u;
  doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isText || !node.text) return;
    const text = node.text;
    let s = Math.max(0, from - pos);
    let e = Math.min(text.length, to - pos);
    if (s > 0 && wordChar.test(text[s - 1])) {
      while (s > 0 && wordChar.test(text[s - 1])) s--;
    }
    if (e < text.length && wordChar.test(text[e])) {
      while (e < text.length && wordChar.test(text[e])) e++;
    }
    start = Math.min(start, pos + s);
    end = Math.max(end, pos + e);
  });
  return { from: start, to: end };
}

/** Parole che partecipano al flusso di testo (escluse tabelle e caselle). */
export interface FlowWord {
  word: string;
  from: number;
  to: number;
}

function inTable(doc: PMNode, pos: number): boolean {
  const $pos = doc.resolve(pos);
  for (let d = $pos.depth; d > 0; d--) {
    const name = $pos.node(d).type.name;
    if (name === "tableCell" || name === "tableHeader" || name === "table") {
      return true;
    }
  }
  return false;
}

export function getFlowWords(doc: PMNode): FlowWord[] {
  const out: FlowWord[] = [];
  eachWord(doc, (word, from, to) => {
    if (inTable(doc, from)) return;
    out.push({ word, from, to });
  });
  return out;
}

function buildDecorations(doc: PMNode): DecorationSet {
  const decorations: Decoration[] = [];
  eachWord(doc, (word, from, to, marks) => {
    if (word.length < 1) return;
    const key = normalizeWord(word);
    const frameMark = marks.find((m) => m.type.name === "aacFrame");
    const frameClass = frameMark
      ? ` aac-word--frame-${frameMark.attrs.value === "off" ? "off" : "on"}`
      : "";

    let url: string | null = null;
    let size: number | undefined;
    if (overrides.has(key)) {
      const value = overrides.get(key);
      if (!value) return; // nascosto esplicitamente
      url = pictogramUrl(value.id, value);
      size = value.size;
    } else if (isFunctionWord(word)) {
      url = null; // funtori: riquadro vuoto, scelta manuale
    } else if (cache.has(key)) {
      const c = cache.get(key);
      url = c ? c.url : null;
    } else {
      return; // non ancora risolto
    }

    if (url) {
      const style =
        `--picto:url("${url}")` + (size ? `;--picto-size:${size}em` : "");
      decorations.push(
        Decoration.inline(from, to, {
          class: `aac-word${frameClass}`,
          "data-word": word,
          style,
        }),
      );
    } else {
      decorations.push(
        Decoration.inline(from, to, {
          class: `aac-word aac-word--empty${frameClass}`,
          "data-word": word,
        }),
      );
    }
  });
  return DecorationSet.create(doc, decorations);
}

async function fetchMissing(doc: PMNode): Promise<void> {
  const missing: string[] = [];
  eachWord(doc, (word) => {
    if (isFunctionWord(word)) return;
    const key = normalizeWord(word);
    if (!cache.has(key) && !inflight.has(key)) {
      inflight.add(key);
      missing.push(word);
    }
  });
  if (missing.length === 0) return;

  try {
    const results = await lookupWords(missing.slice(0, 400), pictoLanguage);
    for (const result of results) {
      cache.set(
        normalizeWord(result.word),
        result.resolved && result.image_url && result.pictogram_id != null
          ? { id: result.pictogram_id, url: result.image_url }
          : null,
      );
    }
  } catch {
    for (const word of missing) cache.set(normalizeWord(word), null);
  } finally {
    for (const word of missing) inflight.delete(normalizeWord(word));
  }

  refreshPictograms();
}

function schedule(doc: PMNode): void {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    void fetchMissing(doc);
  }, 350);
}

export const PictogramExtension = Extension.create({
  name: "pictogram",

  onCreate() {
    currentView = this.editor.view;
    schedule(this.editor.state.doc);
  },

  onUpdate() {
    currentView = this.editor.view;
    schedule(this.editor.state.doc);
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: pluginKey,
        state: {
          init: (_config, state) => buildDecorations(state.doc),
          apply: (_tr, _old, _oldState, newState) => buildDecorations(newState.doc),
        },
        props: {
          decorations(state) {
            return pluginKey.getState(state) as DecorationSet;
          },
        },
      }),
    ];
  },
});
