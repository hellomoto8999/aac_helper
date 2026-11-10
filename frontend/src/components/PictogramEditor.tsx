import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, MouseEvent } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import FontFamily from "@tiptap/extension-font-family";
import Placeholder from "@tiptap/extension-placeholder";
import { TableRow } from "@tiptap/extension-table";
import Ribbon from "./Ribbon";
import SymbolPicker from "./SymbolPicker";
import TemplateGallery from "./TemplateGallery";
import TableContextMenu from "./TableContextMenu";
import { useT } from "../i18n";
import {
  clearAutosave,
  loadAutosave,
  saveAutosave,
} from "../editor/autosave";
import {
  PictogramExtension,
  clearSymbolOverride,
  getEffectivePictogramId,
  getWordSize,
  schedulePictogramLookup,
  setSymbolOverride,
} from "../editor/Pictogram";
import {
  PaginationExtension,
  refreshPagination,
  setPaginationEnabled,
} from "../editor/Pagination";
import type { SymbolOverride } from "../editor/Pictogram";
import {
  FontSize,
  FloatingImage,
  FrameMark,
  RowResize,
  SizedTableCell,
  SizedTableHeader,
  TemplateTable,
  TextBox,
} from "../editor/extensions";

const INITIAL_CONTENT = "<p></p>";

// larghezza reale di una pagina A4 a 96dpi
const A4_WIDTH_PX = 794;

function fitZoom(): number {
  if (typeof window === "undefined") return 1.3;
  const available = window.innerWidth - 48;
  const fit = available / A4_WIDTH_PX;
  return Math.max(0.25, Math.min(1.3, Math.round(fit * 100) / 100));
}

function insertImageFromFile(
  view: import("@tiptap/pm/view").EditorView,
  file: File,
  coords: { pos: number } | null,
  x: number,
  y: number,
) {
  const reader = new FileReader();
  reader.onload = () => {
    const src = String(reader.result || "");
    const nodeType = view.state.schema.nodes.image;
    if (!src || !nodeType) return;
    const node = nodeType.create({ src, x, y, width: "33%", wrap: false });
    const tr = view.state.tr;
    const pos =
      coords && typeof coords.pos === "number"
        ? coords.pos
        : view.state.selection.from;
    tr.insert(pos, node);
    view.dispatch(tr);
  };
  reader.readAsDataURL(file);
}

export default function PictogramEditor() {
  const [zoom, setZoom] = useState(fitZoom);
  const [frame, setFrame] = useState(true);
  const [wrap, setWrap] = useState(true);
  const [sideMargin, setSideMargin] = useState(16);
  const [paged, setPaged] = useState(true);
  const [picker, setPicker] = useState<{ word: string } | null>(null);
  const [gallery, setGallery] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{
    x: number;
    y: number;
    inTable: boolean;
  } | null>(null);
  const downPos = useRef<{ x: number; y: number } | null>(null);
  const { t, lang } = useT();
  const [wordCount, setWordCount] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [saveState, setSaveState] = useState<
    "idle" | "restored" | "saving" | "saved" | "error"
  >("idle");
  const readyRef = useRef(false);
  const saveTimer = useRef<number | undefined>(undefined);
  const statusTimer = useRef<number | undefined>(undefined);
  const settingsRef = useRef({
    frame,
    wrap,
    margin: sideMargin,
    paged,
  });

  const handlePageMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    downPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePageClick = (e: MouseEvent<HTMLDivElement>) => {
    const down = downPos.current;
    downPos.current = null;
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    if (moved > 6) return; // è stato un trascinamento (selezione)
    if (editor && !editor.state.selection.empty) return; // testo selezionato
    const target = e.target as HTMLElement;
    const cell = target.closest?.(".aac-word") as HTMLElement | null;
    if (!cell) return;
    const word = cell.getAttribute("data-word");
    if (!word) return;
    const rect = cell.getBoundingClientRect();
    const padTop = parseFloat(getComputedStyle(cell).paddingTop) || 0;
    if (e.clientY - rect.top <= padTop) {
      setPicker({ word });
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      FontFamily,
      FontSize,
      FrameMark,
      TemplateTable.configure({ resizable: true }),
      TableRow,
      SizedTableHeader,
      SizedTableCell,
      RowResize,
      TextBox,
      FloatingImage.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({ placeholder: "Scrivi il testo..." }),
      PictogramExtension,
      PaginationExtension,
    ],
    content: INITIAL_CONTENT,
    editorProps: {
      attributes: { class: "doc" },
      handleDOMEvents: {
        mousedown: (_view, event) => {
          const t = event.target as HTMLElement;
          if (
            t.closest?.(".aac-textbox__grip") ||
            t.closest?.(".aac-textbox__handle")
          ) {
            return true; // gestito dal NodeView della casella di testo
          }
          return false;
        },
      },
      handlePaste(view, event) {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) {
              insertImageFromFile(view, file, null, 40, 40);
              return true;
            }
          }
        }
        return false;
      },
      handleDrop(view, event) {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;
        const image = Array.from(files).find((f) => f.type.startsWith("image/"));
        if (!image) return false;
        event.preventDefault();
        const coords = view.posAtCoords({
          left: event.clientX,
          top: event.clientY,
        });
        const page = view.dom.closest(".a4-page") as HTMLElement | null;
        let x = 40;
        let y = 40;
        if (page) {
          const r = page.getBoundingClientRect();
          const z = r.width / (page.offsetWidth || r.width) || 1;
          x = (event.clientX - r.left) / z;
          y = (event.clientY - r.top) / z;
        }
        insertImageFromFile(view, image, coords, x, y);
        return true;
      },
    },
  });

  // Ripristina l'ultimo documento salvato automaticamente.
  useEffect(() => {
    if (!editor) return;
    let active = true;

    void (async () => {
      const snapshot = await loadAutosave();
      if (!active || editor.isDestroyed || readyRef.current) return;

      if (!snapshot) {
        readyRef.current = true;
        return;
      }

      // Se l'utente ha già iniziato a scrivere, non sovrascrivere il lavoro.
      if (!editor.isEmpty) {
        readyRef.current = true;
        return;
      }

      readyRef.current = true;
      editor.commands.setContent(snapshot.html, { emitUpdate: false });
      schedulePictogramLookup();
      const restoredText = editor.getText().trim();
      setWordCount(restoredText ? restoredText.split(/\s+/).length : 0);
      setFrame(snapshot.settings.frame);
      setWrap(snapshot.settings.wrap);
      setSideMargin(snapshot.settings.margin);
      setPaged(snapshot.settings.paged);
      settingsRef.current = { ...snapshot.settings };
      setSaveState("restored");
      window.clearTimeout(statusTimer.current);
      statusTimer.current = window.setTimeout(() => setSaveState("idle"), 3000);
    })();

    return () => {
      active = false;
    };
  }, [editor]);

  // Conteggio parole per la status bar in stile Word.
  useEffect(() => {
    if (!editor) return;
    const update = () => {
      const text = editor.getText().trim();
      setWordCount(text ? text.split(/\s+/).length : 0);
    };
    update();
    editor.on("transaction", update);
    return () => {
      editor.off("transaction", update);
    };
  }, [editor]);

  useEffect(() => {
    if (editor) setPaginationEnabled(paged && wrap);
  }, [editor, paged, wrap]);

  useEffect(() => {
    const onPages = (event: Event) => {
      const pages = (event as CustomEvent<{ pages?: number }>).detail?.pages;
      if (pages && pages > 0) setPageCount(pages);
    };
    window.addEventListener("aac-pagination", onPages);
    return () => window.removeEventListener("aac-pagination", onPages);
  }, []);

  useEffect(() => {
    if (editor) refreshPagination();
  }, [editor, wrap, sideMargin, zoom]);

  const persist = useCallback(async () => {
    if (!editor || editor.isDestroyed || !readyRef.current) return;
    const result = await saveAutosave(editor.getHTML(), settingsRef.current);
    if (result === "error") {
      setSaveState("error");
      return;
    }
    setSaveState("saved");
    window.clearTimeout(statusTimer.current);
    statusTimer.current = window.setTimeout(() => setSaveState("idle"), 1800);
  }, [editor]);

  const scheduleSave = useCallback(() => {
    if (!readyRef.current) return;
    setSaveState("saving");
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void persist();
    }, 800);
  }, [persist]);

  // Salva dopo ogni modifica, al blur e quando la pagina viene nascosta.
  useEffect(() => {
    if (!editor) return;

    const onUpdate = () => scheduleSave();
    const flush = () => {
      if (!readyRef.current) return;
      window.clearTimeout(saveTimer.current);
      void persist();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };

    editor.on("update", onUpdate);
    editor.on("blur", flush);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);

    return () => {
      editor.off("update", onUpdate);
      editor.off("blur", flush);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
      window.clearTimeout(saveTimer.current);
    };
  }, [editor, persist, scheduleSave]);

  // Le impostazioni di pagina fanno parte del documento salvato.
  useEffect(() => {
    settingsRef.current = {
      frame,
      wrap,
      margin: sideMargin,
      paged,
    };
    if (readyRef.current) scheduleSave();
  }, [frame, wrap, sideMargin, paged, scheduleSave]);

  useEffect(
    () => () => {
      window.clearTimeout(saveTimer.current);
      window.clearTimeout(statusTimer.current);
    },
    [],
  );

  const handleNewDocument = useCallback(async () => {
    if (!editor) return;
    if (!editor.isEmpty && !window.confirm(t("doc.newConfirm"))) return;
    window.clearTimeout(saveTimer.current);
    await clearAutosave();
    editor.chain().focus().clearContent(false).run();
    setSaveState("idle");
    window.clearTimeout(statusTimer.current);
  }, [editor, t]);

  const handleContextMenu = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const inTable = !!target.closest("table");
    const sel = editor?.state.selection;
    const hasSelection = sel ? !sel.empty : false;
    if (!inTable && !hasSelection) return; // menu predefinito del browser

    e.preventDefault();
    const coords = editor?.view.posAtCoords({ left: e.clientX, top: e.clientY });
    const pos = coords?.pos ?? null;
    const inside = pos != null && sel && pos >= sel.from && pos <= sel.to;
    // Non toccare la selezione se il clic è al suo interno (così unisci/dividi
    // e le celle evidenziate restano attivi). Altrimenti sposta il cursore.
    if (inTable && !inside && pos != null) {
      editor?.commands.setTextSelection(pos);
      editor?.view.focus();
    }
    setCtxMenu({ x: e.clientX, y: e.clientY, inTable });
  };

  const applyOverride = useCallback(
    (override: SymbolOverride) => {
      if (picker) setSymbolOverride(picker.word, override);
      setPicker(null);
    },
    [picker],
  );

  const hideOverride = useCallback(() => {
    if (picker) setSymbolOverride(picker.word, null);
    setPicker(null);
  }, [picker]);

  const resetOverride = useCallback(() => {
    if (picker) clearSymbolOverride(picker.word);
    setPicker(null);
  }, [picker]);

  return (
    <div className="editor-wrap">
      <Ribbon
        editor={editor}
        zoom={zoom}
        setZoom={setZoom}
        frame={frame}
        setFrame={setFrame}
        wrap={wrap}
        setWrap={setWrap}
        margin={sideMargin}
        setMargin={setSideMargin}
        paged={paged}
        setPaged={setPaged}
        onOpenTemplates={() => setGallery(true)}
        onNewDocument={handleNewDocument}
      />

      <div
        className="page-area"
        onMouseDown={handlePageMouseDown}
        onClick={handlePageClick}
        onContextMenu={handleContextMenu}
      >
        <div
          className={`a4-page${frame ? "" : " no-frame"}${wrap ? "" : " no-wrap"} ${
            paged ? "a4-page--split" : "a4-page--join"
          }`}
          style={
            {
              zoom,
              padding: `18mm ${sideMargin}mm`,
              "--page-margin-x": `${sideMargin}mm`,
            } as CSSProperties
          }
        >
          <EditorContent editor={editor} className="editor-content" />
        </div>
      </div>

      <div className="word-statusbar">
        <span className="word-statusbar__license">{t("footer.short")}</span>
        <span className="word-statusbar__grow" />
        {saveState !== "idle" && (
          <span
            className={`word-statusbar__save word-statusbar__save--${saveState}`}
            role="status"
            aria-live="polite"
          >
            {saveState === "saving" && t("doc.saving")}
            {saveState === "saved" && t("doc.saved")}
            {saveState === "restored" && t("doc.restored")}
            {saveState === "error" && t("doc.saveError")}
          </span>
        )}
        <span className="word-statusbar__item word-statusbar__item--a4">A4</span>
        <span className="word-statusbar__item">
          {t("status.pages")}: {pageCount}
        </span>
        <span className="word-statusbar__item">
          {t("status.words")}: {wordCount}
        </span>
        <span className="word-statusbar__item word-statusbar__item--lang">
          {lang.toUpperCase()}
        </span>
        <span className="word-statusbar__item">{Math.round(zoom * 100)}%</span>
      </div>

      {ctxMenu && editor && (
        <TableContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          editor={editor}
          inTable={ctxMenu.inTable}
          onClose={() => setCtxMenu(null)}
        />
      )}

      {picker && (
        <SymbolPicker
          word={picker.word}
          currentId={getEffectivePictogramId(picker.word)}
          currentSize={getWordSize(picker.word)}
          onApply={applyOverride}
          onHide={hideOverride}
          onReset={resetOverride}
          onClose={() => setPicker(null)}
        />
      )}

      {gallery && editor && (
        <TemplateGallery editor={editor} onClose={() => setGallery(false)} />
      )}
    </div>
  );
}
