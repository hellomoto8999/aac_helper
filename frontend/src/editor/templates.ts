import type { Lang } from "../i18n";

export type Shape = "square" | "rounded" | "round" | "hex";

export interface TemplateDef {
  id: string;
  label: string;
  category: string;
  group: string;
  cols: number;
  rows: number;
  shape?: Shape;
  header?: boolean;
  headers?: string[];
  rowLabels?: string[];
  cell?: string;
  html: string;
  htmlEn?: string;
}

export interface CategoryDef {
  id: string;
  label: string;
  key: string;
}

export const CATEGORIES: CategoryDef[] = [
  { id: "flashcards", label: "Flashcards e Vocabolario", key: "cat.flashcards" },
  { id: "calendars", label: "Orari e Pianificazioni", key: "cat.calendars" },
  { id: "dual", label: "Modelli Doppia Lingua", key: "cat.dual" },
  { id: "scales", label: "Scale", key: "cat.scales" },
  { id: "activities", label: "Attività", key: "cat.activities" },
  { id: "communication", label: "Comunicazione", key: "cat.communication" },
  { id: "awards", label: "Attestati e Premi", key: "cat.awards" },
  { id: "display", label: "Materiali per Display", key: "cat.display" },
  { id: "labels", label: "Etichette", key: "cat.labels" },
  { id: "my", label: "I miei modelli", key: "cat.my" },
];

const DAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const DAYS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = ["8:00", "9:00", "10:00", "11:00", "12:00", "13:00"];

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

interface GridOpts {
  cols: number;
  rows: number;
  fill?: boolean;
  shape?: Shape;
  headers?: string[];
  corner?: string;
  rowLabels?: string[];
  cell?: string;
}

// altezza utile di una pagina A4 (in px) tenendo conto dei margini di stampa
const PAGE_PX = 950;

function grid(opts: GridOpts): string {
  const fill = opts.fill !== false;
  const totalRows = opts.rows + (opts.headers ? 1 : 0);
  const cellH = fill && totalRows > 0 ? Math.max(40, Math.floor(PAGE_PX / totalRows)) : 0;
  const shapeAttr = opts.shape ? ` data-shape="${opts.shape}"` : "";
  const hAttr = cellH ? ` data-h="${cellH}"` : "";
  const cell = (text = "") =>
    `<td${shapeAttr}${hAttr}><p>${escapeHtml(text)}</p></td>`;
  const head = (text = "") =>
    `<th${shapeAttr}${hAttr}><p>${escapeHtml(text)}</p></th>`;

  const hasRowLabels = !!opts.rowLabels;
  const bodyRows: string[] = [];

  if (opts.headers) {
    const cells: string[] = [];
    if (hasRowLabels) cells.push(head(opts.corner ?? ""));
    for (const h of opts.headers) cells.push(head(h));
    bodyRows.push(`<tr>${cells.join("")}</tr>`);
  }

  const contentCols = hasRowLabels ? opts.cols - 1 : opts.cols;
  for (let r = 0; r < opts.rows; r++) {
    const cells: string[] = [];
    if (hasRowLabels) cells.push(head((opts.rowLabels as string[])[r] ?? ""));
    for (let c = 0; c < contentCols; c++) cells.push(cell(opts.cell ?? ""));
    bodyRows.push(`<tr>${cells.join("")}</tr>`);
  }
  return `<table><tbody>${bodyRows.join("")}</tbody></table>`;
}

export const TEMPLATES: TemplateDef[] = [
  // ---- Flashcards (verticale) ----
  { id: "fc-v1", label: "Flashcard 1×1", category: "flashcards", group: "Flashcards - verticale", cols: 1, rows: 1, shape: "rounded", html: grid({ cols: 1, rows: 1, shape: "rounded" }) },
  { id: "fc-v12", label: "Flashcards 1×2", category: "flashcards", group: "Flashcards - verticale", cols: 1, rows: 2, shape: "rounded", html: grid({ cols: 1, rows: 2, shape: "rounded" }) },
  { id: "fc-v23", label: "Flashcards 2×3", category: "flashcards", group: "Flashcards - verticale", cols: 2, rows: 3, shape: "rounded", html: grid({ cols: 2, rows: 3, shape: "rounded" }) },
  { id: "fc-v34", label: "Flashcards 3×4", category: "flashcards", group: "Flashcards - verticale", cols: 3, rows: 4, shape: "rounded", html: grid({ cols: 3, rows: 4, shape: "rounded" }) },
  { id: "fc-front", label: "Flashcard fronte-retro", category: "flashcards", group: "Flashcards - verticale", cols: 1, rows: 2, shape: "rounded", headers: ["Fronte"], html: grid({ cols: 1, rows: 1, shape: "rounded", headers: ["Fronte"] }), htmlEn: grid({ cols: 1, rows: 1, shape: "rounded", headers: ["Front"] }) },
  { id: "cards-hex", label: "Carte esagonali", category: "flashcards", group: "Carte", cols: 2, rows: 4, shape: "hex", html: grid({ cols: 2, rows: 4, shape: "hex" }) },

  // ---- Flashcards (orizzontale) ----
  { id: "fc-h1", label: "Flashcard 1×1", category: "flashcards", group: "Flashcards - orizzontale", cols: 1, rows: 1, shape: "rounded", html: grid({ cols: 1, rows: 1, shape: "rounded" }) },
  { id: "fc-h21", label: "Flashcards 2×1", category: "flashcards", group: "Flashcards - orizzontale", cols: 2, rows: 1, shape: "rounded", headers: ["1", "2"], html: grid({ cols: 2, rows: 1, shape: "rounded", headers: ["1", "2"] }) },
  { id: "fc-h32", label: "Flashcards 3×2", category: "flashcards", group: "Flashcards - orizzontale", cols: 3, rows: 2, shape: "rounded", html: grid({ cols: 3, rows: 2, shape: "rounded" }) },
  { id: "fc-h42", label: "Flashcards 4×2", category: "flashcards", group: "Flashcards - orizzontale", cols: 4, rows: 2, shape: "rounded", html: grid({ cols: 4, rows: 2, shape: "rounded" }) },
  { id: "fc-h44", label: "Flashcards 4×4", category: "flashcards", group: "Flashcards - orizzontale", cols: 4, rows: 4, shape: "rounded", html: grid({ cols: 4, rows: 4, shape: "rounded" }) },
  { id: "cards-round", label: "Flashcards rotonde 3×2", category: "flashcards", group: "Carte", cols: 3, rows: 2, shape: "round", html: grid({ cols: 3, rows: 2, shape: "round" }) },

  // ---- Orari e Pianificazioni ----
  { id: "cal-week", label: "Orario settimanale", category: "calendars", group: "Orari e Pianificazioni", cols: 7, rows: 4, header: true, headers: DAYS, html: grid({ cols: 7, rows: 4, headers: DAYS }), htmlEn: grid({ cols: 7, rows: 4, headers: DAYS_EN }) },
  { id: "cal-day", label: "Sequenza giornaliera", category: "calendars", group: "Orari e Pianificazioni", cols: 2, rows: 6, header: true, headers: ["Attività"], rowLabels: HOURS, html: grid({ cols: 2, rows: 6, headers: ["Attività"], rowLabels: HOURS }), htmlEn: grid({ cols: 2, rows: 6, headers: ["Activity"], rowLabels: HOURS }) },
  { id: "cal-nownext", label: "Adesso / Poi", category: "calendars", group: "Orari e Pianificazioni", cols: 2, rows: 1, header: true, headers: ["Adesso", "Poi"], html: grid({ cols: 2, rows: 1, headers: ["Adesso", "Poi"] }), htmlEn: grid({ cols: 2, rows: 1, headers: ["Now", "Next"] }) },
  { id: "cal-timetable", label: "Orario (Ora / Attività)", category: "calendars", group: "Orari e Pianificazioni", cols: 2, rows: 6, header: true, headers: ["Attività"], rowLabels: HOURS, html: grid({ cols: 2, rows: 6, headers: ["Attività"], rowLabels: HOURS }), htmlEn: grid({ cols: 2, rows: 6, headers: ["Activity"], rowLabels: HOURS }) },

  // ---- Comunicazione ----
  { id: "comm-33", label: "Tavola comunicazione 3×3", category: "communication", group: "Comunicazione", cols: 3, rows: 3, shape: "rounded", html: grid({ cols: 3, rows: 3, shape: "rounded" }) },
  { id: "comm-43", label: "Tavola comunicazione 3×4", category: "communication", group: "Comunicazione", cols: 3, rows: 4, shape: "rounded", html: grid({ cols: 3, rows: 4, shape: "rounded" }) },
  { id: "comm-44", label: "Tavola comunicazione 4×4", category: "communication", group: "Comunicazione", cols: 4, rows: 4, shape: "rounded", html: grid({ cols: 4, rows: 4, shape: "rounded" }) },

  // ---- Attività ----
  { id: "act-match", label: "Abbina parola e immagine", category: "activities", group: "Attività", cols: 2, rows: 4, header: true, headers: ["Parola", "Immagine"], html: grid({ cols: 2, rows: 4, headers: ["Parola", "Immagine"] }), htmlEn: grid({ cols: 2, rows: 4, headers: ["Word", "Picture"] }) },
  { id: "act-seq", label: "Sequenza 4 passi", category: "activities", group: "Attività", cols: 1, rows: 4, shape: "rounded", rowLabels: ["1", "2", "3", "4"], html: grid({ cols: 2, rows: 4, shape: "rounded", rowLabels: ["1", "2", "3", "4"] }) },

  // ---- Scale ----
  { id: "scale-emotions", label: "Scala delle emozioni", category: "scales", group: "Scale", cols: 5, rows: 1, header: true, headers: ["Molto male", "Male", "Neutro", "Bene", "Molto bene"], html: grid({ cols: 5, rows: 1, headers: ["Molto male", "Male", "Neutro", "Bene", "Molto bene"] }), htmlEn: grid({ cols: 5, rows: 1, headers: ["Very bad", "Bad", "Neutral", "Good", "Very good"] }) },
  { id: "scale-5", label: "Scala 1–5", category: "scales", group: "Scale", cols: 5, rows: 1, header: true, headers: ["1", "2", "3", "4", "5"], html: grid({ cols: 5, rows: 1, headers: ["1", "2", "3", "4", "5"] }) },

  // ---- Attestati e Premi ----
  {
    id: "award",
    label: "Attestato",
    category: "awards",
    group: "Attestati e Premi",
    cols: 1,
    rows: 0,
    html:
      "<h1>Attestato</h1><p>Consegnato a ____________________</p>" +
      "<p>per ____________________</p><p></p>",
    htmlEn:
      "<h1>Certificate</h1><p>Awarded to ____________________</p>" +
      "<p>for ____________________</p><p></p>",
  },

  // ---- Materiali per Display ----
  { id: "display-wordbank", label: "Banca delle parole", category: "display", group: "Materiali per Display", cols: 4, rows: 4, shape: "rounded", html: grid({ cols: 4, rows: 4, shape: "rounded" }) },
  { id: "display-sign", label: "Cartello", category: "display", group: "Materiali per Display", cols: 1, rows: 0, html: "<h1>Titolo</h1><p></p>", htmlEn: "<h1>Title</h1><p></p>" },

  // ---- Etichette ----
  { id: "labels-round", label: "Etichette rotonde", category: "labels", group: "Etichette", cols: 3, rows: 4, shape: "round", html: grid({ cols: 3, rows: 4, shape: "round" }) },
  { id: "labels-square", label: "Etichette quadrate", category: "labels", group: "Etichette", cols: 3, rows: 4, shape: "rounded", html: grid({ cols: 3, rows: 4, shape: "rounded" }) },

  // ---- Doppia lingua ----
  { id: "dual-flash", label: "Flashcard bilingue 2×4", category: "dual", group: "Modelli Doppia Lingua", cols: 2, rows: 4, header: true, headers: ["Italiano", "English"], html: grid({ cols: 2, rows: 4, headers: ["Italiano", "English"] }), htmlEn: grid({ cols: 2, rows: 4, headers: ["Italian", "English"] }) },
];

export function templatesByCategory(category: string): TemplateDef[] {
  return TEMPLATES.filter((t) => t.category === category);
}

export function groupsOf(templates: TemplateDef[]): string[] {
  const out: string[] = [];
  for (const t of templates) if (!out.includes(t.group)) out.push(t.group);
  return out;
}

/* ---- Localizzazione dei modelli integrati ---- */

const LABELS_EN: Record<string, string> = {
  "fc-v1": "Flashcard 1×1",
  "fc-v12": "Flashcards 1×2",
  "fc-v23": "Flashcards 2×3",
  "fc-v34": "Flashcards 3×4",
  "fc-front": "Double-sided flashcard",
  "cards-hex": "Hexagonal cards",
  "fc-h1": "Flashcard 1×1",
  "fc-h21": "Flashcards 2×1",
  "fc-h32": "Flashcards 3×2",
  "fc-h42": "Flashcards 4×2",
  "fc-h44": "Flashcards 4×4",
  "cards-round": "Round flashcards 3×2",
  "cal-week": "Weekly timetable",
  "cal-day": "Daily schedule",
  "cal-nownext": "Now / Next",
  "cal-timetable": "Timetable (Time / Activity)",
  "comm-33": "Communication board 3×3",
  "comm-43": "Communication board 3×4",
  "comm-44": "Communication board 4×4",
  "act-match": "Match word and picture",
  "act-seq": "4-step sequence",
  "scale-emotions": "Emotions scale",
  "scale-5": "Scale 1–5",
  "award": "Certificate",
  "display-wordbank": "Word bank",
  "display-sign": "Sign",
  "labels-round": "Round labels",
  "labels-square": "Square labels",
  "dual-flash": "Bilingual flashcard 2×4",
};

const GROUPS_EN: Record<string, string> = {
  "Flashcards - verticale": "Flashcards - vertical",
  "Carte": "Cards",
  "Flashcards - orizzontale": "Flashcards - horizontal",
  "Orari e Pianificazioni": "Timetables and Planners",
  "Comunicazione": "Communication",
  "Attività": "Activities",
  "Scale": "Scales",
  "Attestati e Premi": "Certificates and Awards",
  "Materiali per Display": "Display materials",
  "Etichette": "Labels",
  "Modelli Doppia Lingua": "Dual-language templates",
};

const HEADERS_EN: Record<string, string> = {
  "Fronte": "Front",
  "Attività": "Activity",
  "Adesso": "Now",
  "Poi": "Next",
  "Parola": "Word",
  "Immagine": "Picture",
  "Molto male": "Very bad",
  "Male": "Bad",
  "Neutro": "Neutral",
  "Bene": "Good",
  "Molto bene": "Very good",
  "Italiano": "Italian",
  "Lun": "Mon",
  "Mar": "Tue",
  "Mer": "Wed",
  "Gio": "Thu",
  "Ven": "Fri",
  "Sab": "Sat",
  "Dom": "Sun",
};

function translateHeader(value: string, lang: Lang): string {
  return lang === "en" ? HEADERS_EN[value] ?? value : value;
}

export function templateLabel(tpl: TemplateDef, lang: Lang): string {
  return lang === "en" ? LABELS_EN[tpl.id] ?? tpl.label : tpl.label;
}

export function templateGroupName(group: string, lang: Lang): string {
  return lang === "en" ? GROUPS_EN[group] ?? group : group;
}

export function templateHeaders(
  tpl: TemplateDef,
  lang: Lang,
): string[] | undefined {
  return tpl.headers?.map((h) => translateHeader(h, lang));
}

export function templateRowLabels(
  tpl: TemplateDef,
  lang: Lang,
): string[] | undefined {
  return tpl.rowLabels?.map((h) => translateHeader(h, lang));
}

export function templateHtml(tpl: TemplateDef, lang: Lang): string {
  return lang === "en" && tpl.htmlEn ? tpl.htmlEn : tpl.html;
}
