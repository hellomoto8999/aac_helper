import { Extension, Mark, Node, mergeAttributes } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import Image from "@tiptap/extension-image";
import { Table, TableCell, TableHeader } from "@tiptap/extension-table";

/** Tabella che può riempire il foglio (attributo data-fill). */
export const TemplateTable = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fill: {
        default: false,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-fill") === "full",
        renderHTML: (attributes: Record<string, unknown>) =>
          attributes.fill ? { "data-fill": "full" } : {},
      },
      shape: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-shape"),
        renderHTML: (attributes: Record<string, unknown>) =>
          attributes.shape ? { "data-shape": attributes.shape } : {},
      },
    };
  },
});

const CELL_ATTRS = {
  height: {
    default: null,
    parseHTML: (element: HTMLElement) => element.getAttribute("data-h"),
    renderHTML: (attributes: Record<string, unknown>) =>
      attributes.height
        ? { "data-h": attributes.height, style: `height:${attributes.height}px` }
        : {},
  },
  shape: {
    default: null,
    parseHTML: (element: HTMLElement) => element.getAttribute("data-shape"),
    renderHTML: (attributes: Record<string, unknown>) =>
      attributes.shape ? { "data-shape": attributes.shape } : {},
  },
};

export const SizedTableCell = TableCell.extend({
  addAttributes() {
    return { ...this.parent?.(), ...CELL_ATTRS };
  },
});

export const SizedTableHeader = TableHeader.extend({
  addAttributes() {
    return { ...this.parent?.(), ...CELL_ATTRS };
  },
});

/** Override del bordo per una singola parola (o gruppo di parole selezionato). */
export const FrameMark = Mark.create({
  name: "aacFrame",
  inclusive: false,
  addAttributes() {
    return {
      value: {
        default: "on",
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-aac-frame") === "off" ? "off" : "on",
        renderHTML: (attributes: Record<string, unknown>) => ({
          "data-aac-frame": attributes.value === "off" ? "off" : "on",
        }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-aac-frame]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), 0];
  },
});

/** Aumenta/diminuisce l'altezza della riga corrente. */
export function changeRowHeight(
  editor: import("@tiptap/react").Editor,
  delta: number,
): void {
  const { state, view } = editor;
  const { $from } = state.selection;
  let rowPos: number | null = null;
  let rowNode: import("@tiptap/pm/model").Node | null = null;
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d);
    if (node.type.name === "tableRow") {
      rowPos = $from.before(d);
      rowNode = node;
      break;
    }
  }
  if (rowPos === null || !rowNode) return;
  const firstCell = rowNode.firstChild;
  const domCell = view.nodeDOM(rowPos + 1) as HTMLElement | null;
  const base =
    Number(firstCell?.attrs.height) ||
    (domCell ? Math.round(domCell.getBoundingClientRect().height / zoomOf(domCell)) : 0) ||
    0;
  const next = Math.max(24, base + delta);
  const tr = state.tr;
  let offset = 0;
  rowNode.forEach((cell) => {
    const pos = (rowPos as number) + 1 + offset;
    tr.setNodeMarkup(pos, undefined, { ...cell.attrs, height: next });
    offset += cell.nodeSize;
  });
  view.dispatch(tr);
}

export const FontSize = Extension.create({
  name: "fontSize",
  addOptions() {
    return { types: ["textStyle"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types as string[],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.fontSize || null,
            renderHTML: (attributes: Record<string, unknown>) =>
              attributes.fontSize
                ? { style: `font-size: ${attributes.fontSize}` }
                : {},
          },
        },
      },
    ];
  },
});

function pageOf(el: HTMLElement): HTMLElement {
  return (el.closest(".a4-page") as HTMLElement) || document.body;
}

/** Contenitore di riferimento per il posizionamento assoluto (offsetParent). */
function refRectOf(el: HTMLElement): DOMRect {
  const parent = (el.offsetParent as HTMLElement) || pageOf(el);
  return parent.getBoundingClientRect();
}

/** Fattore di zoom applicato (CSS zoom) al contenitore. */
function zoomOf(el: HTMLElement): number {
  const ow = el.offsetWidth || 1;
  const rw = el.getBoundingClientRect().width || ow;
  return rw / ow || 1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Immagine "publisher" a posizione libera: la trascini in qualsiasi punto del
 * foglio (x/y in %), mantieni la larghezza che imposti e la ridimensioni dalla
 * maniglia. Con "Testo attorno" attivo il testo le si dispone attorno; altrimenti
 * è un oggetto libero sul foglio.
 */
export const FloatingImage = Image.extend({
  inline: false,
  group: "block",
  draggable: false,
  selectable: true,

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: "33%",
        parseHTML: (element: HTMLElement) => element.getAttribute("width") || "33%",
        renderHTML: (attributes: Record<string, unknown>) =>
          attributes.width ? { width: attributes.width } : {},
      },
      x: {
        default: 40,
        parseHTML: (element: HTMLElement) => Number(element.getAttribute("data-x")) || 0,
        renderHTML: (attributes: Record<string, unknown>) => ({ "data-x": attributes.x }),
      },
      y: {
        default: 40,
        parseHTML: (element: HTMLElement) => Number(element.getAttribute("data-y")) || 0,
        renderHTML: (attributes: Record<string, unknown>) => ({ "data-y": attributes.y }),
      },
      align: {
        default: "left",
        parseHTML: (element: HTMLElement) => element.getAttribute("data-align") || "left",
        renderHTML: (attributes: Record<string, unknown>) => ({ "data-align": attributes.align }),
      },
      wrap: {
        default: false,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-wrap") === "true",
        renderHTML: (attributes: Record<string, unknown>) => ({
          "data-wrap": attributes.wrap ? "true" : "false",
        }),
      },
    };
  },

  addNodeView() {
    return ({ node: initialNode, getPos, editor }) => {
      let node = initialNode;
      const wrapper = document.createElement("div");
      wrapper.className = "float-img";
      let dragging = false;

      const apply = (n: typeof node) => {
        const wrap = !!n.attrs.wrap;
        wrapper.classList.toggle("float-img--wrap", wrap);
        wrapper.classList.toggle("float-img--free", !wrap);
        wrapper.style.width = n.attrs.width ? String(n.attrs.width) : "";
        if (wrap) {
          wrapper.style.left = "";
          wrapper.style.top = "";
          wrapper.dataset.align = String(n.attrs.align || "left");
        } else {
          wrapper.style.left = `${Number(n.attrs.x) || 0}px`;
          wrapper.style.top = `${Number(n.attrs.y) || 0}px`;
          delete wrapper.dataset.align;
        }
      };
      apply(node);

      const img = document.createElement("img");
      img.src = String(node.attrs.src || "");
      img.alt = String(node.attrs.alt || "");
      img.draggable = false;

      const handle = document.createElement("span");
      handle.className = "float-img__handle";
      handle.contentEditable = "false";
      handle.title = "Ridimensiona";

      wrapper.append(img, handle);

      const commit = (attrs: Record<string, unknown>) => {
        const pos = getPos();
        if (typeof pos === "number") {
          // Legge gli attributi correnti dal documento: la closure `node` può
          // essere meno recente dopo un drag o un resize precedente.
          const current = editor.state.doc.nodeAt(pos);
          if (!current) return;
          editor.view.dispatch(
            editor.view.state.tr.setNodeMarkup(pos, undefined, {
              ...current.attrs,
              ...attrs,
            }),
          );
        }
      };

      const selectNode = () => {
        const pos = getPos();
        if (typeof pos === "number") editor.commands.setNodeSelection(pos);
      };

      const startDrag = (e: MouseEvent) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        selectNode();
        wrapper.classList.add("is-dragging");
        dragging = true;

        const refRect = refRectOf(wrapper);
        const startX = e.clientX;
        const startY = e.clientY;
        const current = (() => {
          const pos = getPos();
          return typeof pos === "number" ? editor.state.doc.nodeAt(pos) : null;
        })();
        const startLeft = Number(current?.attrs.x ?? node.attrs.x) || 0;
        const startTop = Number(current?.attrs.y ?? node.attrs.y) || 0;
        const wrap = !!(current?.attrs.wrap ?? node.attrs.wrap);
        let left = startLeft;
        let top = startTop;
        let align = String(current?.attrs.align ?? node.attrs.align ?? "left");

        const parent = (wrapper.offsetParent as HTMLElement) || pageOf(wrapper);
        const z = zoomOf(wrapper);
        const maxX = Math.max(0, parent.offsetWidth - wrapper.offsetWidth);
        const maxY = Math.max(0, parent.offsetHeight - wrapper.offsetHeight);

        const onMove = (ev: MouseEvent) => {
          if (wrap) {
            const relX = (ev.clientX - refRect.left) / refRect.width;
            align = relX < 0.5 ? "left" : "right";
            wrapper.dataset.align = align;
          } else {
            left = clamp(startLeft + (ev.clientX - startX) / z, 0, maxX);
            top = clamp(startTop + (ev.clientY - startY) / z, 0, maxY);
            wrapper.style.left = `${left}px`;
            wrapper.style.top = `${top}px`;
          }
        };
        const onUp = () => {
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
          wrapper.classList.remove("is-dragging");
          dragging = false;
          if (wrap) commit({ align });
          else commit({ x: Math.round(left), y: Math.round(top) });
        };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      };

      const startResize = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const refRect = refRectOf(wrapper);
        const startX = e.clientX;
        const startPct = (wrapper.getBoundingClientRect().width / refRect.width) * 100;
        let last = startPct;
        const onMove = (ev: MouseEvent) => {
          last = clamp(startPct + ((ev.clientX - startX) / refRect.width) * 100, 5, 100);
          wrapper.style.width = `${last}%`;
        };
        const onUp = () => {
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
          commit({ width: `${Math.round(last * 10) / 10}%` });
        };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      };

      img.addEventListener("mousedown", startDrag);
      handle.addEventListener("mousedown", startResize);

      return {
        dom: wrapper,
        update: (updated: typeof node) => {
          if (updated.type !== node.type) return false;
          node = updated;
          img.src = String(updated.attrs.src || "");
          if (!dragging) apply(updated);
          return true;
        },
      };
    };
  },
});

// retro-compatibilità col nome precedente
export const ResizableImage = FloatingImage;

function zoomFactor(el: HTMLElement): number {
  const ow = el.offsetWidth || 1;
  const rw = el.getBoundingClientRect().width || ow;
  return rw / ow || 1;
}

/** Ridimensionamento delle righe trascinando il bordo orizzontale. */
export const RowResize = Extension.create({
  name: "rowResize",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("rowResize"),
        view: (view) => {
          let hoverRow: { pos: number; node: PMNode } | null = null;

          const locate = (clientX: number, clientY: number) => {
            const info = view.posAtCoords({ left: clientX, top: clientY });
            if (!info) return null;
            const $pos = view.state.doc.resolve(info.pos);
            for (let d = $pos.depth; d > 0; d--) {
              const node = $pos.node(d);
              if (node.type.name === "tableRow") {
                const before = $pos.before(d);
                const dom = view.nodeDOM(before) as HTMLElement | null;
                if (!dom) return null;
                const rect = dom.getBoundingClientRect();
                if (Math.abs(clientY - rect.bottom) <= 5) {
                  return { pos: before, node };
                }
                return null;
              }
            }
            return null;
          };

          const onMouseMove = (e: MouseEvent) => {
            const hit = locate(e.clientX, e.clientY);
            hoverRow = hit;
            view.dom.classList.toggle("row-resize-cursor", !!hit);
          };

          const onMouseDown = (e: MouseEvent) => {
            if (e.button !== 0 || !hoverRow) return;
            e.preventDefault();
            e.stopPropagation();
            const page = (view.dom.closest(".a4-page") as HTMLElement) || view.dom;
            const z = zoomFactor(page);
            const startY = e.clientY;
            const first = hoverRow.node.firstChild;
            let startHeight = Number(first?.attrs.height) || 0;
            if (!startHeight) {
              const dom = view.nodeDOM(hoverRow.pos) as HTMLElement | null;
              startHeight = dom ? Math.round(dom.getBoundingClientRect().height / z) : 24;
            }
            const pos = hoverRow.pos;
            const rowNode = hoverRow.node;

            const apply = (h: number) => {
              const tr = view.state.tr;
              let offset = 0;
              rowNode.forEach((cell) => {
                tr.setNodeMarkup(pos + 1 + offset, undefined, {
                  ...cell.attrs,
                  height: h,
                });
                offset += cell.nodeSize;
              });
              view.dispatch(tr);
            };

            const move = (ev: MouseEvent) => {
              const h = Math.max(24, Math.round(startHeight + (ev.clientY - startY) / z));
              apply(h);
            };
            const up = () => {
              document.removeEventListener("mousemove", move, true);
              document.removeEventListener("mouseup", up, true);
            };
            document.addEventListener("mousemove", move, true);
            document.addEventListener("mouseup", up, true);
          };

          view.dom.addEventListener("mousemove", onMouseMove);
          view.dom.addEventListener("mousedown", onMouseDown, true);

          return {
            destroy() {
              view.dom.removeEventListener("mousemove", onMouseMove);
              view.dom.removeEventListener("mousedown", onMouseDown, true);
            },
          };
        },
      }),
    ];
  },
});

/**
 * Casella di testo: blocco di testo senza pittogrammi, spostabile liberamente
 * sul foglio (come la casella di testo di Word).
 */
export const TextBox = Node.create({
  name: "textBox",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,
  selectable: true,

  addAttributes() {
    return {
      x: {
        default: 60,
        parseHTML: (el: HTMLElement) => Number(el.getAttribute("data-x")) || 60,
        renderHTML: (a: Record<string, unknown>) => ({ "data-x": a.x }),
      },
      y: {
        default: 60,
        parseHTML: (el: HTMLElement) => Number(el.getAttribute("data-y")) || 60,
        renderHTML: (a: Record<string, unknown>) => ({ "data-y": a.y }),
      },
      width: {
        default: "45%",
        parseHTML: (el: HTMLElement) => el.getAttribute("data-w") || "45%",
        renderHTML: (a: Record<string, unknown>) => ({ "data-w": a.width }),
      },
      wrap: {
        default: false,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-wrap") === "true",
        renderHTML: (a: Record<string, unknown>) => ({
          "data-wrap": a.wrap ? "true" : "false",
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-textbox]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-textbox": "", class: "aac-textbox" }),
      0,
    ];
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement("div");
      dom.className = "aac-textbox";
      dom.setAttribute("data-textbox", "");
      let dragging = false;

      const apply = (n: typeof node) => {
        const wrap = !!n.attrs.wrap;
        dom.classList.toggle("aac-textbox--wrap", wrap);
        dom.style.width = n.attrs.width ? String(n.attrs.width) : "";
        if (wrap) {
          dom.style.left = "";
          dom.style.top = "";
        } else {
          dom.style.left = `${Number(n.attrs.x) || 0}px`;
          dom.style.top = `${Number(n.attrs.y) || 0}px`;
        }
      };
      apply(node);

      const grip = document.createElement("div");
      grip.className = "aac-textbox__grip";
      grip.contentEditable = "false";
      grip.title = "Sposta";
      grip.textContent = "⠿";
      const content = document.createElement("div");
      content.className = "aac-textbox__content";
      const handle = document.createElement("span");
      handle.className = "aac-textbox__handle";
      handle.contentEditable = "false";
      handle.title = "Ridimensiona";
      dom.append(grip, content, handle);

      const startDrag = (e: MouseEvent) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        dragging = true;
        const startPos = getPos();
        dom.classList.add("is-dragging");
        const parent = (dom.offsetParent as HTMLElement) || pageOf(dom);
        const z = zoomFactor(dom);
        const startX = e.clientX;
        const startY = e.clientY;
        const startLeft = Number(node.attrs.x) || 0;
        const startTop = Number(node.attrs.y) || 0;
        const maxX = Math.max(0, parent.offsetWidth - dom.offsetWidth);
        const maxY = Math.max(0, parent.offsetHeight - dom.offsetHeight);
        let left = startLeft;
        let top = startTop;
        const move = (ev: MouseEvent) => {
          left = Math.min(maxX, Math.max(0, startLeft + (ev.clientX - startX) / z));
          top = Math.min(maxY, Math.max(0, startTop + (ev.clientY - startY) / z));
          dom.style.left = `${left}px`;
          dom.style.top = `${top}px`;
        };
        const up = () => {
          document.removeEventListener("mousemove", move, true);
          document.removeEventListener("mouseup", up, true);
          dragging = false;
          dom.classList.remove("is-dragging");
          const target = typeof startPos === "number" ? startPos : getPos();
          if (typeof target === "number") {
            editor.view.dispatch(
              editor.view.state.tr.setNodeMarkup(target, undefined, {
                ...node.attrs,
                x: Math.round(left),
                y: Math.round(top),
              }),
            );
          }
        };
        document.addEventListener("mousemove", move, true);
        document.addEventListener("mouseup", up, true);
      };

      const startResize = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const resizePos = getPos();
        const parent = (dom.offsetParent as HTMLElement) || pageOf(dom);
        const pr = parent.getBoundingClientRect();
        const startX = e.clientX;
        const startPct = (dom.getBoundingClientRect().width / pr.width) * 100;
        let last = startPct;
        const move = (ev: MouseEvent) => {
          last = Math.min(100, Math.max(15, startPct + ((ev.clientX - startX) / pr.width) * 100));
          dom.style.width = `${last}%`;
        };
        const up = () => {
          document.removeEventListener("mousemove", move, true);
          document.removeEventListener("mouseup", up, true);
          const target = typeof resizePos === "number" ? resizePos : getPos();
          if (typeof target === "number") {
            editor.view.dispatch(
              editor.view.state.tr.setNodeMarkup(target, undefined, {
                ...node.attrs,
                width: `${Math.round(last * 10) / 10}%`,
              }),
            );
          }
        };
        document.addEventListener("mousemove", move, true);
        document.addEventListener("mouseup", up, true);
      };

      grip.addEventListener("mousedown", startDrag);
      handle.addEventListener("mousedown", startResize);

      return {
        dom,
        contentDOM: content,
        update: (updated: typeof node) => {
          if (updated.type !== node.type) return false;
          if (!dragging) apply(updated);
          return true;
        },
      };
    };
  },
});
