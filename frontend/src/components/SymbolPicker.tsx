import { useEffect, useMemo, useState } from "react";
import type { SearchResult } from "../types";
import { HAIR_OPTIONS, SKIN_OPTIONS, pictogramUrl, searchPictograms } from "../api";
import type { SymbolOverride } from "../editor/Pictogram";
import { useT } from "../i18n";

interface Props {
  word: string;
  currentId: number | null;
  currentSize?: number;
  onApply: (override: SymbolOverride) => void;
  onHide: () => void;
  onReset: () => void;
  onClose: () => void;
}

export default function SymbolPicker({
  word,
  currentId,
  currentSize,
  onApply,
  onHide,
  onReset,
  onClose,
}: Props) {
  const [query, setQuery] = useState(word);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [nocolor, setNocolor] = useState(false);
  const [skin, setSkin] = useState("");
  const [hair, setHair] = useState("");
  const [size, setSize] = useState<number>(currentSize ?? 2.3);
  const { lang, t } = useT();
  const [searchLang, setSearchLang] = useState<string>(lang);

  const features = useMemo(
    () => ({
      nocolor: nocolor || undefined,
      skin: skin || undefined,
      hair: hair || undefined,
    }),
    [nocolor, skin, hair],
  );

  const runSearch = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      setResults(await searchPictograms(q, 24, searchLang));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => runSearch(query), 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, searchLang]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__box symbol-picker" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>
            {t("sp.title")} <span className="symbol-picker__word">{word}</span>
          </h2>
          <button onClick={onClose}>&times;</button>
        </div>

        <div className="symbol-picker__options">
          <label>
            <input
              type="checkbox"
              checked={nocolor}
              onChange={(e) => setNocolor(e.target.checked)}
            />
            {t("sp.bw")}
          </label>
          <label>
            {t("sp.skin")}
            <select value={skin} onChange={(e) => setSkin(e.target.value)}>
              <option value="">—</option>
              {SKIN_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("sp.hair")}
            <select value={hair} onChange={(e) => setHair(e.target.value)}>
              <option value="">—</option>
              {HAIR_OPTIONS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </label>
          <label className="symbol-picker__size">
            {t("sp.size")}
            <input
              type="range"
              min={1.2}
              max={6}
              step={0.1}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
            />
            <span>{size.toFixed(1)}em</span>
          </label>
          <label>
            {t("gal.language")}
            <select
              value={searchLang}
              onChange={(e) => setSearchLang(e.target.value)}
            >
              <option value="it">IT</option>
              <option value="en">EN</option>
            </select>
          </label>
        </div>

        <input
          className="symbol-picker__search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("sp.search")}
          autoFocus
        />

        {loading && <p className="modal__info">{t("sp.searching")}</p>}

        <div className="modal__grid">
          {results.map((r) => (
            <button
              key={r.id}
              className="result"
              title={r.keyword}
              onClick={() => onApply({ id: r.id, ...features, size })}
            >
              <img src={pictogramUrl(r.id, features) ?? ""} alt={r.keyword} />
              <span>{r.keyword}</span>
            </button>
          ))}
          {!loading && results.length === 0 && (
            <p className="modal__info">{t("sp.noResults")}</p>
          )}
        </div>

        <div className="symbol-picker__footer">
          <button
            className="btn"
            disabled={currentId == null}
            title={t("sp.applySizeTitle")}
            onClick={() => {
              if (currentId != null) onApply({ id: currentId, ...features, size });
            }}
          >
            {t("sp.applySize")}
          </button>
          <button className="btn" onClick={onReset}>
            {t("sp.reset")}
          </button>
          <button className="btn" onClick={onHide}>
            {t("sp.hide")}
          </button>
        </div>
      </div>
    </div>
  );
}
