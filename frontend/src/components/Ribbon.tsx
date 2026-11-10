import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { expandToWordRange } from "../editor/Pictogram";
import {
  downloadTemplate,
  parseTemplateFile,
  saveUserTemplate,
} from "../editor/userTemplates";
import { useT } from "../i18n";
import Icon from "./Icon";

interface Props {
  editor: Editor | null;
  zoom: number;
  setZoom: (zoom: number) => void;
  frame: boolean;
  setFrame: (frame: boolean) => void;
  wrap: boolean;
  setWrap: (wrap: boolean) => void;
  margin: number;
  setMargin: (margin: number) => void;
  paged: boolean;
  setPaged: (paged: boolean) => void;
  onOpenTemplates: () => void;
  onNewDocument: () => void;
}

const FONT_FAMILIES = [
  { label: "Predefinito", value: "" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times", value: "'Times New Roman', serif" },
  { label: "Courier", value: "'Courier New', monospace" },
];

const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px", "40px"];

function tableHtml(cols: number, rows: number): string {
  const cell = "<td><p></p></td>";
  const body = Array.from(
    { length: rows },
    () => `<tr>${Array.from({ length: cols }, () => cell).join("")}</tr>`,
  ).join("");
  return `<table><tbody>${body}</tbody></table>`;
}

type Tab = "home" | "template" | "table" | "print";

const TABS: { id: Tab; key: string }[] = [
  { id: "home", key: "tab.home" },
  { id: "template", key: "tab.template" },
  { id: "table", key: "tab.table" },
  { id: "print", key: "tab.print" },
];

export default function Ribbon({
  editor,
  zoom,
  setZoom,
  frame,
  setFrame,
  wrap,
  setWrap,
  margin,
  setMargin,
  paged,
  setPaged,
  onOpenTemplates,
  onNewDocument,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const templateFileRef = useRef<HTMLInputElement>(null);
  const [, setTick] = useState(0);
  const [tab, setTab] = useState<Tab>("home");
  const [collapsed, setCollapsed] = useState(false);
  const { t } = useT();

  useEffect(() => {
    if (!editor) return;
    const rerender = () => setTick((t) => t + 1);
    editor.on("transaction", rerender);
    editor.on("selectionUpdate", rerender);
    return () => {
      editor.off("transaction", rerender);
      editor.off("selectionUpdate", rerender);
    };
  }, [editor]);

  if (!editor) return null;

  const cmd = () => editor.chain().focus();
  const isActive = (name: string, attrs?: Record<string, unknown>) =>
    editor.isActive(name, attrs);
  const imageSelected = editor.isActive("image");
  const imageWrap = imageSelected && Boolean(editor.getAttributes("image").wrap);

  const speak = () => {
    const text = editor.getText();
    if (!text.trim() || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "it-IT";
    window.speechSynthesis.speak(u);
  };

  const frameActive = (() => {
    const sel = editor.state.selection;
    if (sel.empty) return frame;
    if (editor.isActive("aacFrame", { value: "off" })) return false;
    if (editor.isActive("aacFrame", { value: "on" })) return true;
    return frame;
  })();

  const toggleFrame = () => {
    const markType = editor.schema.marks.aacFrame;
    if (!markType) return;
    const sel = editor.state.selection;
    const selectedText = sel.empty
      ? ""
      : editor.state.doc.textBetween(sel.from, sel.to, " ", " ");

    // Nessuna selezione (o selezione senza parole): vale per tutto il foglio.
    if (sel.empty || !/[\p{L}\p{M}]/u.test(selectedText)) {
      const next = !frame;
      setFrame(next);
      const tr = editor.state.tr.removeMark(
        0,
        editor.state.doc.content.size,
        markType,
      );
      if (tr.docChanged) editor.view.dispatch(tr);
      return;
    }

    // Selezione di parole: applica/rimuove l'override solo su quelle parole.
    const target = !frameActive;
    const { from, to } = expandToWordRange(
      editor.state.doc,
      sel.from,
      sel.to,
    );
    const tr = editor.state.tr.removeMark(from, to, markType);
    if (target !== frame) {
      tr.addMark(from, to, markType.create({ value: target ? "on" : "off" }));
    }
    editor.view.dispatch(tr);
    editor.commands.focus();
  };

  const transformCase = (mode: "upper" | "lower") => {
    const { state, view } = editor;
    const tr = state.tr;
    state.doc.descendants((node, pos) => {
      if (node.isText && node.text) {
        const next =
          mode === "upper" ? node.text.toUpperCase() : node.text.toLowerCase();
        if (next !== node.text)
          tr.replaceWith(pos, pos + node.text.length, state.schema.text(next, node.marks));
      }
    });
    if (tr.docChanged) view.dispatch(tr);
  };

  const insertImageSrc = (src: string) =>
    editor
      .chain()
      .focus()
      .insertContent({
        type: "image",
        attrs: { src, x: 40, y: 40, width: "33%", wrap: false },
      })
      .run();

  const insertImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result || "");
      if (src) insertImageSrc(src);
    };
    reader.readAsDataURL(file);
  };

  const insertImageUrl = () => {
    const url = window.prompt("URL immagine:");
    if (url) insertImageSrc(url);
  };

  const importTemplateFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const items = parseTemplateFile(String(reader.result || ""));
      if (items.length === 0) {
        window.alert(t("gal.invalidFile"));
        return;
      }
      items.forEach((item) => saveUserTemplate(item.name, item.html));
      window.alert(t("gal.loadedOk"));
    };
    reader.readAsText(file);
  };

  const HomeTab = (
    <>
      <div className="rb-group" data-label={t("grp.file")}>
        <button
          type="button"
          className="rb-with-label"
          title={t("doc.newTitle")}
          aria-label={t("doc.newTitle")}
          onClick={onNewDocument}
        >
          <Icon name="newDoc" />
          <span>{t("doc.new")}</span>
        </button>
      </div>

      <div className="rb-group" data-label={t("grp.clipboard")}>
        <button
          type="button"
          title={t("cmd.undo")}
          aria-label={t("cmd.undo")}
          onClick={() => cmd().undo().run()}
        >
          <Icon name="undo" />
        </button>
        <button
          type="button"
          title={t("cmd.redo")}
          aria-label={t("cmd.redo")}
          onClick={() => cmd().redo().run()}
        >
          <Icon name="redo" />
        </button>
      </div>

      <div className="rb-group" data-label={t("grp.style")}>
        <select
          title={t("cmd.style")}
          aria-label={t("cmd.style")}
          value={
            isActive("heading", { level: 1 })
              ? "h1"
              : isActive("heading", { level: 2 })
                ? "h2"
                : isActive("heading", { level: 3 })
                  ? "h3"
                  : "p"
          }
          onChange={(e) => {
            const v = e.target.value;
            if (v === "p") cmd().setParagraph().run();
            else cmd().toggleHeading({ level: Number(v[1]) as 1 | 2 | 3 }).run();
          }}
        >
          <option value="p">{t("style.p")}</option>
          <option value="h1">{t("style.h1")}</option>
          <option value="h2">{t("style.h2")}</option>
          <option value="h3">{t("style.h3")}</option>
        </select>
        <select
          title={t("cmd.font")}
          aria-label={t("cmd.font")}
          defaultValue=""
          onChange={(e) =>
            e.target.value
              ? cmd().setFontFamily(e.target.value).run()
              : cmd().unsetFontFamily().run()
          }
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.label} value={f.value}>
              {f.label === "Predefinito" ? t("font.default") : f.label}
            </option>
          ))}
        </select>
        <select
          title={t("cmd.size")}
          aria-label={t("cmd.size")}
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value;
            if (v) cmd().setMark("textStyle", { fontSize: v }).run();
            else cmd().setMark("textStyle", { fontSize: null }).unsetMark("textStyle").run();
          }}
        >
          <option value="">11</option>
          {FONT_SIZES.map((s) => (
            <option key={s} value={s}>
              {s.replace("px", "")}
            </option>
          ))}
        </select>
      </div>

      <div className="rb-group" data-label={t("grp.format")}>
        <button
          type="button"
          className={isActive("bold") ? "on" : ""}
          title={t("cmd.bold")}
          aria-label={t("cmd.bold")}
          aria-pressed={isActive("bold")}
          onClick={() => cmd().toggleBold().run()}
        >
          <b>B</b>
        </button>
        <button
          type="button"
          className={isActive("italic") ? "on" : ""}
          title={t("cmd.italic")}
          aria-label={t("cmd.italic")}
          aria-pressed={isActive("italic")}
          onClick={() => cmd().toggleItalic().run()}
        >
          <i>I</i>
        </button>
        <button
          type="button"
          className={isActive("underline") ? "on" : ""}
          title={t("cmd.underline")}
          aria-label={t("cmd.underline")}
          aria-pressed={isActive("underline")}
          onClick={() => cmd().toggleUnderline().run()}
        >
          <u>U</u>
        </button>
        <button
          type="button"
          className={isActive("strike") ? "on" : ""}
          title={t("cmd.strike")}
          aria-label={t("cmd.strike")}
          aria-pressed={isActive("strike")}
          onClick={() => cmd().toggleStrike().run()}
        >
          <s>S</s>
        </button>
        <button type="button" title={t("cmd.upper")} aria-label={t("cmd.upper")} onClick={() => transformCase("upper")}>
          AA
        </button>
        <button type="button" title={t("cmd.lower")} aria-label={t("cmd.lower")} onClick={() => transformCase("lower")}>
          aa
        </button>
      </div>

      <div className="rb-group" data-label={t("grp.paragraph")}>
        <button
          type="button"
          className={isActive("bulletList") ? "on" : ""}
          title={t("cmd.bullet")}
          aria-label={t("cmd.bullet")}
          aria-pressed={isActive("bulletList")}
          onClick={() => cmd().toggleBulletList().run()}
        >
          <Icon name="list" />
        </button>
        <button
          type="button"
          className={isActive("orderedList") ? "on" : ""}
          title={t("cmd.ordered")}
          aria-label={t("cmd.ordered")}
          aria-pressed={isActive("orderedList")}
          onClick={() => cmd().toggleOrderedList().run()}
        >
          <Icon name="listOrdered" />
        </button>
        <button
          type="button"
          className={isActive("blockquote") ? "on" : ""}
          title={t("cmd.quote")}
          aria-label={t("cmd.quote")}
          aria-pressed={isActive("blockquote")}
          onClick={() => cmd().toggleBlockquote().run()}
        >
          <Icon name="quote" />
        </button>
        <button
          type="button"
          className={isActive("textAlign", { textAlign: "left" }) ? "on" : ""}
          title={t("cmd.alignLeft")}
          aria-label={t("cmd.alignLeft")}
          aria-pressed={isActive("textAlign", { textAlign: "left" })}
          onClick={() => cmd().setTextAlign("left").run()}
        >
          <Icon name="alignLeft" />
        </button>
        <button
          type="button"
          className={isActive("textAlign", { textAlign: "center" }) ? "on" : ""}
          title={t("cmd.alignCenter")}
          aria-label={t("cmd.alignCenter")}
          aria-pressed={isActive("textAlign", { textAlign: "center" })}
          onClick={() => cmd().setTextAlign("center").run()}
        >
          <Icon name="alignCenter" />
        </button>
        <button
          type="button"
          className={isActive("textAlign", { textAlign: "right" }) ? "on" : ""}
          title={t("cmd.alignRight")}
          aria-label={t("cmd.alignRight")}
          aria-pressed={isActive("textAlign", { textAlign: "right" })}
          onClick={() => cmd().setTextAlign("right").run()}
        >
          <Icon name="alignRight" />
        </button>
      </div>

      <div className="rb-break" aria-hidden="true" />

      <div className="rb-group" data-label={t("grp.insert")}>
        <label className="rb-color" title={t("cmd.textColor")}>
          <span className="rb-color__glyph" aria-hidden="true">A</span>
          <input
            type="color"
            aria-label={t("cmd.textColor")}
            defaultValue="#1f2a37"
            onChange={(e) => cmd().setColor(e.target.value).run()}
          />
        </label>
        <label className="rb-color" title={t("cmd.highlight")}>
          <span className="rb-color__glyph" aria-hidden="true">
            <Icon name="highlighter" size={16} />
          </span>
          <input
            type="color"
            aria-label={t("cmd.highlight")}
            defaultValue="#fff176"
            onChange={(e) => cmd().toggleHighlight({ color: e.target.value }).run()}
          />
        </label>
        <button
          type="button"
          title={t("cmd.imageFile")}
          aria-label={t("cmd.imageFile")}
          onClick={() => fileRef.current?.click()}
        >
          <Icon name="image" />
        </button>
        <button
          type="button"
          title={t("cmd.imageUrl")}
          aria-label={t("cmd.imageUrl")}
          onClick={insertImageUrl}
        >
          <Icon name="link" />
        </button>
        <button
          type="button"
          className="rb-with-label"
          title={t("cmd.textbox")}
          aria-label={t("cmd.textbox")}
          onClick={() =>
            cmd()
              .insertContent({ type: "textBox", content: [{ type: "paragraph" }] })
              .run()
          }
        >
          <Icon name="textbox" />
          <span>{t("cmd.textboxShort")}</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) insertImageFile(file);
            e.target.value = "";
          }}
        />
      </div>

      <div className="rb-group">
        <label className="rb-range" title={t("cmd.pictograms")}>
          <span>{t("cmd.pictograms")}</span>
          <input
            type="range"
            aria-label={t("cmd.pictograms")}
            min={1.2}
            max={6}
            step={0.1}
            defaultValue={2.3}
            onChange={(e) =>
              document.documentElement.style.setProperty(
                "--picto-size",
                `${e.target.value}em`,
              )
            }
          />
        </label>
      </div>

      <div className="rb-group" data-label={t("grp.zoom")}>
        <span className="rb-label">{t("cmd.zoom")}</span>
        <button
          type="button"
          title={t("cmd.zoomOut")}
          aria-label={t("cmd.zoomOut")}
          onClick={() => setZoom(Math.max(0.5, Math.round((zoom - 0.1) * 10) / 10))}
        >
          <Icon name="minus" />
        </button>
        <span className="rb-zoom" aria-live="polite">{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          title={t("cmd.zoomIn")}
          aria-label={t("cmd.zoomIn")}
          onClick={() => setZoom(Math.min(3, Math.round((zoom + 0.1) * 10) / 10))}
        >
          <Icon name="plus" />
        </button>
        <button
          type="button"
          title={t("cmd.zoomReset")}
          aria-label={t("cmd.zoomReset")}
          onClick={() => setZoom(1)}
        >
          <Icon name="reset" />
        </button>
        <button
          type="button"
          title={t("cmd.fit")}
          aria-label={t("cmd.fit")}
          onClick={() =>
            setZoom(
              Math.max(
                0.25,
                Math.min(1.3, Math.round(((window.innerWidth - 48) / 794) * 100) / 100),
              ),
            )
          }
        >
          <Icon name="fit" />
        </button>
      </div>

      <div className="rb-group" data-label={t("grp.view")}>
        <button
          type="button"
          className={frameActive ? "on" : ""}
          title={t("cmd.frame")}
          aria-label={t("cmd.frame")}
          aria-pressed={frameActive}
          onClick={toggleFrame}
        >
          <Icon name="frame" />
        </button>
        <button
          type="button"
          className={wrap ? "on" : ""}
          title={t("cmd.wrap")}
          aria-label={t("cmd.wrap")}
          aria-pressed={wrap}
          onClick={() => setWrap(!wrap)}
        >
          <Icon name="wrap" />
        </button>
        <button
          type="button"
          className={`rb-with-label${imageWrap ? " on" : ""}`}
          title={t("cmd.textAround")}
          aria-pressed={imageWrap}
          disabled={!imageSelected}
          onClick={() => cmd().updateAttributes("image", { wrap: !imageWrap }).run()}
        >
          <Icon name="textAround" />
          <span>{t("cmd.textAroundLabel")}</span>
        </button>
        <button
          type="button"
          title={t("cmd.read")}
          aria-label={t("cmd.read")}
          onClick={speak}
        >
          <Icon name="volume" />
        </button>
      </div>
    </>
  );

  const TemplateTab = (
    <>
      <div className="rb-group" data-label={t("grp.templates")}>
        <button type="button" className="rb-big" onClick={onOpenTemplates}>
          <Icon name="grid" />
          <span>{t("tpl.choose")}</span>
        </button>
        <button
          type="button"
          className="rb-big"
          title={t("tpl.saveCurrent")}
          onClick={() => {
            const name = window.prompt(t("tpl.savePrompt"));
            if (!name) return;
            saveUserTemplate(name, editor.getHTML());
            window.alert(t("tpl.savedOk"));
          }}
        >
          <Icon name="save" />
          <span>{t("tpl.saveCurrent")}</span>
        </button>
        <button
          type="button"
          className="rb-big"
          title={t("gal.downloadDoc")}
          onClick={() => downloadTemplate("documento", editor.getHTML())}
        >
          <Icon name="download" />
          <span>{t("gal.downloadDoc")}</span>
        </button>
        <button
          type="button"
          className="rb-big"
          title={t("gal.loadFile")}
          onClick={() => templateFileRef.current?.click()}
        >
          <Icon name="upload" />
          <span>{t("gal.loadFile")}</span>
        </button>
        <input
          ref={templateFileRef}
          type="file"
          accept=".json,.aac.json,application/json,text/html"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) importTemplateFile(file);
            e.target.value = "";
          }}
        />
      </div>
    </>
  );

  const TableTab = (
    <>
      <div className="rb-group" data-label={t("grp.table")}>
        <span className="rb-label">{t("tbl.insert")}</span>
        {[
          [2, 2],
          [3, 2],
          [3, 3],
          [4, 3],
          [4, 4],
        ].map(([c, r]) => (
          <button
            type="button"
            key={`${c}x${r}`}
            title={`${c} × ${r}`}
            onClick={() => cmd().insertContent(tableHtml(c, r)).run()}
          >
            {c}×{r}
          </button>
        ))}
      </div>
      <div className="rb-group" data-label={t("grp.rowsCols")}>
        <span className="rb-label">{t("tbl.rowsCols")}</span>
        <button type="button" title={t("tbl.addRow")} onClick={() => cmd().addRowAfter().run()}>
          +Riga
        </button>
        <button type="button" title={t("tbl.addCol")} onClick={() => cmd().addColumnAfter().run()}>
          +Colonna
        </button>
        <button type="button" title={t("tbl.delRow")} onClick={() => cmd().deleteRow().run()}>
          −Riga
        </button>
        <button type="button" title={t("tbl.delCol")} onClick={() => cmd().deleteColumn().run()}>
          −Colonna
        </button>
      </div>
      <div className="rb-group" data-label={t("grp.cells")}>
        <button type="button" title={t("ctx.mergeCells")} onClick={() => cmd().mergeCells().run()}>
          {t("tbl.merge")}
        </button>
        <button type="button" title={t("ctx.splitCell")} onClick={() => cmd().splitCell().run()}>
          {t("tbl.split")}
        </button>
        <button type="button" title={t("ctx.headerRow")} onClick={() => cmd().toggleHeaderRow().run()}>
          {t("tbl.headerRow")}
        </button>
        <button type="button" title={t("tbl.delete")} onClick={() => cmd().deleteTable().run()}>
          {t("tbl.delete")}
        </button>
      </div>
    </>
  );

  const PrintTab = (
    <>
      <div className="rb-group" data-label={t("grp.print")}>
        <button type="button" className="rb-big rb-big--primary" onClick={() => window.print()}>
          <Icon name="printer" />
          <span>{t("print.button")}</span>
        </button>
      </div>

      <div className="rb-group">
        <label className="rb-range" title={t("cmd.marginsTitle")}>
          <span>{t("cmd.margins")}</span>
          <input
            type="range"
            aria-label={t("cmd.marginsTitle")}
            min={0}
            max={40}
            step={1}
            value={margin}
            onChange={(e) => setMargin(Number(e.target.value))}
          />
          <span className="rb-zoom">{margin}mm</span>
        </label>
      </div>

      <div className="rb-group" data-label={t("grp.pages")}>
        <span className="rb-label">{t("cmd.pages")}</span>
        <button
          type="button"
          className={!paged ? "on" : ""}
          title={t("cmd.pagesJoin")}
          aria-pressed={!paged}
          onClick={() => setPaged(false)}
        >
          {t("cmd.pagesJoinLabel")}
        </button>
        <button
          type="button"
          className={paged ? "on" : ""}
          title={t("cmd.pagesSplit")}
          aria-pressed={paged}
          onClick={() => setPaged(true)}
        >
          {t("cmd.pagesSplitLabel")}
        </button>
      </div>
    </>
  );

  return (
    <div className={`ribbon${collapsed ? " ribbon--collapsed" : ""}`}>
      <div className="ribbon__tabs">
        {TABS.map((tabDef) => (
          <button
            type="button"
            key={tabDef.id}
            className={`ribbon__tab${tab === tabDef.id && !collapsed ? " on" : ""}`}
            aria-pressed={tab === tabDef.id && !collapsed}
            onClick={() => {
              setTab(tabDef.id);
              setCollapsed(false);
            }}
          >
            {t(tabDef.key)}
          </button>
        ))}
        <button
          type="button"
          className="ribbon__collapse"
          title={collapsed ? "Espandi" : "Comprimi"}
          aria-label={collapsed ? "Espandi" : "Comprimi"}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((c) => !c)}
        >
          <Icon name={collapsed ? "chevronDown" : "chevronUp"} size={16} />
        </button>
      </div>

      {!collapsed && (
        <div className="ribbon__body">
          {tab === "home" && HomeTab}
          {tab === "template" && TemplateTab}
          {tab === "table" && TableTab}
          {tab === "print" && PrintTab}
        </div>
      )}
    </div>
  );
}
