import { useEffect, useMemo, useState } from "react";
import { health } from "./api";
import PictogramEditor from "./components/PictogramEditor";
import Icon from "./components/Icon";
import { LangContext, translate } from "./i18n";
import type { Lang } from "./i18n";
import { setPictogramLanguage } from "./editor/Pictogram";

function initialDark(): boolean {
  try {
    const saved = localStorage.getItem("aac-theme");
    if (saved === "dark") return true;
    if (saved === "light") return false;
  } catch {
    /* ignore */
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem("aac-lang");
    if (saved === "it" || saved === "en") return saved;
  } catch {
    /* ignore */
  }
  return "it";
}

export default function App() {
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [dark, setDark] = useState(initialDark);
  const [lang, setLang] = useState<Lang>(initialLang);

  const t = useMemo(() => (key: string) => translate(lang, key), [lang]);
  const i18n = useMemo(() => ({ lang, t }), [lang, t]);

  useEffect(() => {
    health()
      .then(() => setBackendOk(true))
      .catch(() => setBackendOk(false));
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    try {
      localStorage.setItem("aac-theme", dark ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }, [dark]);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem("aac-lang", lang);
    } catch {
      /* ignore */
    }
    setPictogramLanguage(lang);
  }, [lang]);

  return (
    <LangContext.Provider value={i18n}>
      <div className="app">
        <header className="app__header">
          <h1>
            <span className="app__docname">{t("doc.untitled")}</span>
            <span className="app__title-sep">-</span>
            <span className="app__appname">AAC Helper</span>
          </h1>
          <div className="app__status">
            <span className={`dot ${backendOk === false ? "dot--off" : "dot--on"}`} />
            <span className="app__status-text">
              {backendOk === false ? t("status.off") : t("status.ok")}
            </span>
            <div className="lang-toggle" title={t("lang.label")}>
              <button
                className={lang === "it" ? "on" : ""}
                onClick={() => setLang("it")}
              >
                IT
              </button>
              <button
                className={lang === "en" ? "on" : ""}
                onClick={() => setLang("en")}
              >
                EN
              </button>
            </div>
            <button
              type="button"
              className="theme-toggle"
              title={dark ? t("theme.toLight") : t("theme.toDark")}
              aria-label={dark ? t("theme.toLight") : t("theme.toDark")}
              onClick={() => setDark((d) => !d)}
            >
              <Icon name={dark ? "sun" : "moon"} size={17} />
            </button>
          </div>
        </header>

        <PictogramEditor />
      </div>
    </LangContext.Provider>
  );
}
