import { Extension } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { EditorView } from "@tiptap/pm/view";
import { getFlowWords } from "./Pictogram";

/** Altezza utile di una pagina A4 (297 mm - 2 × 18 mm di padding), in px @96dpi. */
const PAGE_HEIGHT = 986;
/** Margine superiore/inferiore di ogni foglio (18 mm @96dpi). */
const PAGE_MARGIN_Y = 68;
/** Spazio visivo tra due fogli. */
const PAGE_GAP = 26;
const PAGE_STEP = PAGE_HEIGHT + PAGE_MARGIN_Y * 2 + PAGE_GAP;
const WORD_RE = /[\p{L}\p{M}][\p{L}\p{M}'’-]*/gu;

interface Gap {
  pos: number;
  height: number;
  whiteBefore: number;
  block: boolean;
  key: string;
}

interface PageItem {
  top: number;
  bottom: number;
  pos: number;
  block: boolean;
}

interface CloneWord {
  word: string;
  top: number;
  bottom: number;
}

interface PaginationMeta {
  gaps: Gap[];
}

const paginationKey = new PluginKey<Gap[]>("pagination");
let enabled = true;
let currentView: EditorView | null = null;
let timer: number | undefined;

function makeGapElement(gap: Gap): HTMLElement {
  const el = document.createElement("span");
  el.className = "page-gap-widget";
  el.style.height = `${gap.height}px`;
  const gapEnd = gap.whiteBefore + PAGE_GAP;
  el.style.background = `linear-gradient(to bottom, transparent 0 ${gap.whiteBefore}px, var(--word-canvas) ${gap.whiteBefore}px ${gapEnd}px, transparent ${gapEnd}px 100%)`;
  el.setAttribute("contenteditable", "false");
  el.setAttribute("aria-hidden", "true");
  return el;
}

function decorationsFor(doc: PMNode, gaps: Gap[]): DecorationSet {
  return DecorationSet.create(
    doc,
    gaps.map((gap) =>
      Decoration.widget(gap.pos, makeGapElement(gap), {
        side: -1,
        block: gap.block,
        key: gap.key,
        ignoreSelection: true,
      }),
    ),
  );
}

function sameGaps(a: Gap[], b: Gap[]): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (g, i) =>
      g.pos === b[i].pos &&
      g.height === b[i].height &&
      g.whiteBefore === b[i].whiteBefore &&
      g.block === b[i].block,
  );
}

function measureWords(clone: HTMLElement, originTop: number): CloneWord[] {
  const out: CloneWord[] = [];
  const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const text = node.textContent || "";
    const parent = node.parentElement;
    if (
      parent &&
      !parent.closest("table") &&
      !parent.closest(".aac-textbox") &&
      text
    ) {
      WORD_RE.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = WORD_RE.exec(text)) !== null) {
        const range = document.createRange();
        range.setStart(node, match.index);
        range.setEnd(node, match.index + match[0].length);
        const cell = parent.closest(".aac-word") as HTMLElement | null;
        const rects = (cell ?? range).getClientRects();
        if (!rects.length) continue;
        const rect = cell ? cell.getBoundingClientRect() : rects[0];
        out.push({
          word: match[0],
          top: rect.top - originTop,
          bottom: rect.bottom - originTop,
        });
      }
    }
    node = walker.nextNode();
  }
  return out;
}

/** Blocchi vuoti (paragrafi/righe vuote) che occupano comunque spazio. */
function collectEmptyBlockItems(
  view: EditorView,
  clone: HTMLElement,
  originTop: number,
): PageItem[] {
  const positions: number[] = [];
  view.state.doc.forEach((_node, offset) => positions.push(offset));

  const items: PageItem[] = [];
  const children = [...clone.children];
  const lastIndex = positions.length - 1;
  children.forEach((child, index) => {
    if (!(child instanceof HTMLElement)) return;
    // L'ultimo paragrafo vuoto è il segnaposto di ProseMirror: non deve
    // creare da solo una pagina bianca (tipico dopo una tabella a tutta pagina).
    if (index === lastIndex) return;
    if (
      child.matches("table, .tableWrapper, .aac-textbox, .float-img") ||
      child.textContent?.trim()
    ) {
      return;
    }
    const pos = positions[index];
    if (pos == null) return;
    const rect = child.getBoundingClientRect();
    items.push({
      top: rect.top - originTop,
      bottom: rect.bottom - originTop,
      pos,
      block: true,
    });
  });
  return items;
}

function collectTableItems(
  view: EditorView,
  clone: HTMLElement,
  originTop: number,
): PageItem[] {
  const tables = [...clone.querySelectorAll("table")].filter(
    (table) => !table.parentElement?.closest("table"),
  );
  if (!tables.length) return [];

  const positions: number[] = [];
  view.state.doc.descendants((node, pos, parent) => {
    if (
      node.type.name === "table" &&
      parent?.type.name !== "tableCell" &&
      parent?.type.name !== "tableHeader"
    ) {
      positions.push(pos);
    }
  });

  return tables
    .map((table, i) => {
      const pos = positions[i];
      if (pos == null) return null;
      const rect = table.getBoundingClientRect();
      return {
        top: rect.top - originTop,
        bottom: rect.bottom - originTop,
        pos,
        block: true,
      };
    })
    .filter((item): item is PageItem => item !== null);
}

function computeGaps(view: EditorView): Gap[] {
  const doc = view.dom;
  const width = doc.offsetWidth || doc.getBoundingClientRect().width;
  if (!width || !doc.isConnected) return [];

  const host = document.createElement("div");
  host.style.cssText = [
    "position:fixed",
    "left:-100000px",
    "top:0",
    `width:${width}px`,
    "visibility:hidden",
    "pointer-events:none",
    "z-index:-1",
  ].join(";");

  const clone = doc.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(".page-gap-widget").forEach((el) => el.remove());
  host.appendChild(clone);
  document.body.appendChild(host);

  try {
    const originTop = clone.getBoundingClientRect().top;
    const words = measureWords(clone, originTop);
    const pmWords = getFlowWords(view.state.doc);

    if (
      words.length !== pmWords.length ||
      words.some(
        (word, i) =>
          word.word.toLocaleLowerCase() !==
          pmWords[i].word.toLocaleLowerCase(),
      )
    ) {
      // Layout non riconosciuto: meglio nessuna pagina che pagine sbagliate.
      return [];
    }

    const items: PageItem[] = [];
    let line: { top: number; bottom: number; first: number } | null = null;
    for (let index = 0; index < words.length; index++) {
      const word = words[index];
      if (!line || Math.abs(word.top - line.top) > 3) {
        if (line) {
          items.push({
            top: line.top,
            bottom: line.bottom,
            pos: pmWords[line.first].from,
            block: false,
          });
        }
        line = { top: word.top, bottom: word.bottom, first: index };
      } else {
        line.bottom = Math.max(line.bottom, word.bottom);
      }
    }
    if (line) {
      items.push({
        top: line.top,
        bottom: line.bottom,
        pos: pmWords[line.first].from,
        block: false,
      });
    }

    items.push(...collectTableItems(view, clone, originTop));
    const emptyItems = collectEmptyBlockItems(view, clone, originTop);
    items.push(...emptyItems);
    items.sort((a, b) => a.top - b.top || Number(a.block) - Number(b.block));

    const gaps: Gap[] = [];
    let offset = 0;
    let pageBottom = PAGE_HEIGHT;

    for (const item of items) {
      let top = item.top + offset;
      let bottom = item.bottom + offset;

      // Se l'elemento inizia già oltre il bordo (tipico dei paragrafi
      // vuoti), deve comunque nascere una nuova pagina con il suo spazio.
      let broke = false;
      if (top >= pageBottom - 0.5) {
        const whiteBefore = Math.max(0, pageBottom - top) + PAGE_MARGIN_Y;
        const jump = whiteBefore + PAGE_GAP + PAGE_MARGIN_Y;
        gaps.push({
          pos: item.pos,
          height: Math.round(jump),
          whiteBefore: Math.round(whiteBefore),
          block: item.block,
          key: `pg-${item.pos}-${Math.round(jump)}-${Math.round(whiteBefore)}`,
        });
        offset += jump;
        pageBottom += PAGE_STEP;
        top += jump;
        bottom += jump;
        broke = true;
      }

      if (!broke && bottom > pageBottom + 0.5) {
        const whiteBefore = Math.max(0, pageBottom - top) + PAGE_MARGIN_Y;
        const jump = whiteBefore + PAGE_GAP + PAGE_MARGIN_Y;
        if (jump > 1) {
          gaps.push({
            pos: item.pos,
            height: Math.round(jump),
            whiteBefore: Math.round(whiteBefore),
            block: item.block,
            key: `pg-${item.pos}-${Math.round(jump)}-${Math.round(whiteBefore)}`,
          });
          offset += jump;
          pageBottom += PAGE_STEP;
        }
      }
    }

    // Evita due widget nello stesso punto.
    const unique: Gap[] = [];
    for (const gap of gaps) {
      if (!unique.some((g) => g.pos === gap.pos)) unique.push(gap);
    }
    return unique;
  } finally {
    host.remove();
  }
}

function applyGaps(view: EditorView, gaps: Gap[]): void {
  const current = paginationKey.getState(view.state) ?? [];
  if (sameGaps(current, gaps)) return;
  view.dispatch(view.state.tr.setMeta(paginationKey, { gaps }));
  window.dispatchEvent(
    new CustomEvent("aac-pagination", {
      detail: { pages: gaps.length + 1 },
    }),
  );
}

function schedule(view: EditorView): void {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    if (view.isDestroyed || !enabled) return;
    applyGaps(view, computeGaps(view));
  }, 90);
}

/** Attiva/disattiva la paginazione e forza il ricalcolo. */
export function setPaginationEnabled(value: boolean): void {
  enabled = value;
  if (!currentView || currentView.isDestroyed) return;
  if (!value) {
    applyGaps(currentView, []);
    window.dispatchEvent(
      new CustomEvent("aac-pagination", { detail: { pages: 1 } }),
    );
    return;
  }
  schedule(currentView);
}

/** Ricalcola dopo variazioni di larghezza/wrap. */
export function refreshPagination(): void {
  if (currentView && !currentView.isDestroyed) schedule(currentView);
}

export const PaginationExtension = Extension.create({
  name: "pagination",

  onCreate() {
    currentView = this.editor.view;
    schedule(currentView);
  },

  onUpdate() {
    currentView = this.editor.view;
    if (enabled) schedule(currentView);
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<Gap[]>({
        key: paginationKey,
        state: {
          init: () => [],
          apply: (tr, oldGaps) => {
            const meta = tr.getMeta(paginationKey) as
              | PaginationMeta
              | undefined;
            if (meta) return meta.gaps;
            if (tr.docChanged) return [];
            return oldGaps;
          },
        },
        props: {
          decorations(state) {
            const gaps = paginationKey.getState(state) ?? [];
            return decorationsFor(state.doc, gaps);
          },
        },
        view: (view) => ({
          update: () => {
            if (enabled) schedule(view);
          },
          destroy: () => {
            currentView = null;
            window.clearTimeout(timer);
          },
        }),
      }),
    ];
  },
});
