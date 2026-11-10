import { useEffect, useMemo, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  CATEGORIES,
  TEMPLATES,
  groupsOf,
  templateGroupName,
  templateHeaders,
  templateHtml,
  templateLabel,
  templateRowLabels,
  templatesByCategory,
} from "../editor/templates";
import type { TemplateDef } from "../editor/templates";
import {
  deleteUserTemplate,
  downloadTemplate,
  listUserTemplates,
} from "../editor/userTemplates";
import type { UserTemplate } from "../editor/userTemplates";
import { useT } from "../i18n";
import Icon from "./Icon";

interface Props {
  editor: Editor;
  onClose: () => void;
}

function Thumb({ tpl, lang }: { tpl: TemplateDef; lang: "it" | "en" }) {
  const hasTable = tpl.rows > 0 || !!tpl.headers;
  if (!hasTable) {
    return (
      <div className="tpl-thumb tpl-thumb--lines">
        {Array.from({ length: 4 }, (_, i) => (
          <span key={i} className={`tpl-line${i === 0 ? " tpl-line--title" : ""}`} />
        ))}
      </div>
    );
  }

  const headers = templateHeaders(tpl, lang);
  const rowLabels = templateRowLabels(tpl, lang);
  const hasRowLabels = !!rowLabels;
  const cols = tpl.cols;
  const cells: { text: string; head: boolean }[] = [];
  if (headers) {
    if (hasRowLabels) cells.push({ text: "", head: true });
    headers.forEach((h) => cells.push({ text: h, head: true }));
  }
  for (let r = 0; r < tpl.rows; r++) {
    if (hasRowLabels) cells.push({ text: rowLabels?.[r] ?? "", head: true });
    const contentCols = hasRowLabels ? cols - 1 : cols;
    for (let c = 0; c < contentCols; c++) cells.push({ text: tpl.cell ?? "", head: false });
  }

  return (
    <div
      className={`tpl-thumb tpl-thumb--${tpl.shape || "square"}${
        tpl.header ? " tpl-thumb--head" : ""
      }`}
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
    >
      {cells.map((cell, i) => (
        <span
          key={i}
          className={`tpl-cell${cell.head ? " tpl-cell--head" : ""}`}
        >
          {cell.text ? <em>{cell.text}</em> : null}
        </span>
      ))}
    </div>
  );
}

function SavedThumb() {
  return (
    <div className="tpl-thumb tpl-thumb--lines">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={`tpl-line${i === 0 ? " tpl-line--title" : ""}`} />
      ))}
    </div>
  );
}

export default function TemplateGallery({ editor, onClose }: Props) {
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [userItems, setUserItems] = useState<UserTemplate[]>(() =>
    listUserTemplates(),
  );
  const { lang, t } = useT();

  const templates = useMemo(() => templatesByCategory(category), [category]);
  const groups = useMemo(() => groupsOf(templates), [templates]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const insert = (html: string) => {
    editor.chain().focus().insertContent(html).run();
    onClose();
  };

  const remove = (id: string) => {
    if (!window.confirm(t("gal.deleteConfirm"))) return;
    deleteUserTemplate(id);
    setUserItems(listUserTemplates());
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__box tpl-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>{t("gal.title")}</h2>
          <button type="button" onClick={onClose} title={t("gal.close")}>
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="tpl-body">
          <aside className="tpl-cats">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                className={`tpl-cat${cat.id === category ? " on" : ""}`}
                onClick={() => setCategory(cat.id)}
              >
                {t(cat.key)}
              </button>
            ))}
          </aside>

          <main className="tpl-main">
            {category === "my" ? (
              <section className="tpl-group">
                <h3>{t("gal.myTemplates")}</h3>
                <p className="modal__info">{t("gal.myHint")}</p>
                {userItems.length === 0 ? (
                  <p className="modal__info">{t("gal.none")}</p>
                ) : (
                  <div className="tpl-grid" style={{ marginTop: 14 }}>
                    {userItems.map((item) => (
                      <div key={item.id} className="tpl-card tpl-card--saved">
                        <button
                          className="tpl-card__open"
                          onClick={() => insert(item.html)}
                          title={item.name}
                        >
                          <SavedThumb />
                          <span className="tpl-card__label">{item.name}</span>
                        </button>
                        <button
                          className="tpl-card__dl"
                          title={t("gal.downloadTitle")}
                          onClick={() => downloadTemplate(item.name, item.html)}
                        >
                          <Icon name="download" size={13} />
                        </button>
                        <button
                          className="tpl-card__del"
                          title={t("gal.deleteTitle")}
                          onClick={() => remove(item.id)}
                        >
                          <Icon name="trash" size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ) : (
              <>
                {templates.length === 0 && (
                  <p className="modal__info">{t("gal.emptyCat")}</p>
                )}
                {groups.map((group) => (
                  <section key={group} className="tpl-group">
                    <h3>{templateGroupName(group, lang)}</h3>
                    <div className="tpl-grid">
                      {templates
                        .filter((t) => t.group === group)
                        .map((tpl) => (
                          <button
                            key={tpl.id}
                            className="tpl-card"
                            onClick={() => insert(templateHtml(tpl, lang))}
                            title={templateLabel(tpl, lang)}
                          >
                            <Thumb tpl={tpl} lang={lang} />
                            <span className="tpl-card__label">
                              {templateLabel(tpl, lang)}
                            </span>
                          </button>
                        ))}
                    </div>
                  </section>
                ))}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export { TEMPLATES };
