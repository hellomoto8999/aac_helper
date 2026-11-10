import { createContext, useContext } from "react";

export type Lang = "it" | "en";

type Entry = { it: string; en: string };

const DICT: Record<string, Entry> = {
  // App
  "status.ok": { it: "Backend pronto", en: "Backend ready" },
  "status.off": { it: "Backend offline", en: "Backend offline" },
  "theme.toLight": { it: "Passa al tema chiaro", en: "Switch to light theme" },
  "theme.toDark": { it: "Passa al tema scuro", en: "Switch to dark theme" },
  "lang.label": { it: "Lingua", en: "Language" },
  "footer": {
    it: "Pittogrammi: autore Sergio Palao, origine ARASAAC (https://arasaac.org), licenza CC (BY-NC-SA). Uso non commerciale.",
    en: "Pictograms: author Sergio Palao, origin ARASAAC (https://arasaac.org), licence CC (BY-NC-SA). Non-commercial use.",
  },
  "footer.short": {
    it: "Pittogrammi ARASAAC © Sergio Palao · CC BY-NC-SA",
    en: "ARASAAC pictograms © Sergio Palao · CC BY-NC-SA",
  },
  "doc.untitled": { it: "Documento1", en: "Document1" },
  "status.words": { it: "Parole", en: "Words" },
  "status.pages": { it: "Pagine", en: "Pages" },

  // Ribbon tabs
  "tab.home": { it: "Home", en: "Home" },
  "tab.template": { it: "Modelli", en: "Templates" },
  "tab.table": { it: "Tabella", en: "Table" },
  "tab.print": { it: "Stampa", en: "Print" },
  "ribbon.expand": { it: "Espandi", en: "Expand" },
  "ribbon.collapse": { it: "Comprimi", en: "Collapse" },

  // Undo/redo
  "cmd.undo": { it: "Indietro (Annulla)", en: "Back (Undo)" },
  "cmd.redo": { it: "Avanti (Ripeti)", en: "Forward (Redo)" },

  // Paragraph / font
  "cmd.style": { it: "Stile paragrafo", en: "Paragraph style" },
  "style.p": { it: "Normale", en: "Normal" },
  "style.h1": { it: "Titolo 1", en: "Heading 1" },
  "style.h2": { it: "Titolo 2", en: "Heading 2" },
  "style.h3": { it: "Titolo 3", en: "Heading 3" },
  "cmd.font": { it: "Carattere", en: "Font" },
  "cmd.size": { it: "Dimensione", en: "Size" },
  "font.default": { it: "Calibri", en: "Calibri" },

  // Formatting
  "cmd.bold": { it: "Grassetto", en: "Bold" },
  "cmd.italic": { it: "Corsivo", en: "Italic" },
  "cmd.underline": { it: "Sottolineato", en: "Underline" },
  "cmd.strike": { it: "Barrato", en: "Strikethrough" },
  "cmd.upper": { it: "Tutto MAIUSCOLO", en: "UPPERCASE" },
  "cmd.lower": { it: "Tutto minuscolo", en: "lowercase" },
  "cmd.bullet": { it: "Elenco puntato", en: "Bullet list" },
  "cmd.ordered": { it: "Elenco numerato", en: "Numbered list" },
  "cmd.quote": { it: "Citazione", en: "Quote" },
  "cmd.alignLeft": { it: "Allinea a sinistra", en: "Align left" },
  "cmd.alignCenter": { it: "Centra", en: "Center" },
  "cmd.alignRight": { it: "Allinea a destra", en: "Align right" },
  "cmd.textColor": { it: "Colore testo", en: "Text colour" },
  "cmd.highlight": { it: "Evidenzia", en: "Highlight" },

  // Images / textbox
  "cmd.imageFile": { it: "Immagine da file", en: "Image from file" },
  "cmd.imageUrl": { it: "Immagine da URL", en: "Image from URL" },
  "cmd.textbox": { it: "Inserisci una casella di testo (senza pittogrammi)", en: "Insert a text box (no pictograms)" },
  "cmd.textboxLabel": { it: "Casella di testo", en: "Text box" },
  "cmd.textboxShort": { it: "Testo", en: "Text" },

  // Cells / wrap / read
  "cmd.frame": { it: "Mostra/nascondi il riquadro attorno alle parole", en: "Show/hide the box around words" },
  "cmd.wrap": { it: "Vai a capo automatico", en: "Word wrap" },
  "cmd.textAround": { it: "Testo che gira attorno all'immagine selezionata", en: "Text wraps around selected image" },
  "cmd.textAroundLabel": { it: "Testo attorno", en: "Text wrap" },
  "cmd.read": { it: "Leggi ad alta voce", en: "Read aloud" },

  // Pictograms size
  "cmd.pictograms": { it: "Pittogrammi", en: "Pictograms" },

  // Zoom
  "cmd.zoom": { it: "Zoom", en: "Zoom" },
  "cmd.zoomOut": { it: "Riduci zoom della pagina", en: "Zoom out" },
  "cmd.zoomIn": { it: "Aumenta zoom della pagina", en: "Zoom in" },
  "cmd.zoomReset": { it: "Zoom 100%", en: "Zoom 100%" },
  "cmd.fit": { it: "Adatta alla larghezza", en: "Fit to width" },

  // Margins
  "cmd.margins": { it: "Margini", en: "Margins" },
  "cmd.marginsTitle": { it: "Margini laterali della pagina (mm)", en: "Page side margins (mm)" },

  // Pages
  "cmd.pages": { it: "Pagine", en: "Pages" },
  "cmd.pagesJoin": { it: "Pagine unite (attaccate)", en: "Joined pages" },
  "cmd.pagesSplit": { it: "Pagine separate", en: "Separate pages" },
  "cmd.pagesJoinLabel": { it: "Unisci", en: "Join" },
  "cmd.pagesSplitLabel": { it: "Dividi", en: "Split" },

  // Document / autosave
  "doc.new": { it: "Nuovo", en: "New" },
  "doc.newTitle": { it: "Nuovo documento (svuota la pagina)", en: "New document (clear page)" },
  "doc.newConfirm": { it: "Svuotare il documento corrente? Il salvataggio automatico verrà cancellato.", en: "Clear the current document? The autosave will be deleted." },
  "doc.saving": { it: "Salvataggio…", en: "Saving…" },
  "doc.saved": { it: "Salvato", en: "Saved" },
  "doc.restored": { it: "Documento ripristinato", en: "Document restored" },
  "doc.saveError": { it: "Salvataggio automatico non disponibile", en: "Autosave unavailable" },

  // Ribbon group labels (Word-like)
  "grp.file": { it: "File", en: "File" },
  "grp.clipboard": { it: "Appunti", en: "Clipboard" },
  "grp.style": { it: "Stile", en: "Style" },
  "grp.format": { it: "Formato", en: "Format" },
  "grp.paragraph": { it: "Paragrafo", en: "Paragraph" },
  "grp.insert": { it: "Inserisci", en: "Insert" },
  "grp.zoom": { it: "Zoom", en: "Zoom" },
  "grp.view": { it: "Visualizza", en: "View" },
  "grp.templates": { it: "Modelli", en: "Templates" },
  "grp.quickTemplates": { it: "Modelli rapidi", en: "Quick templates" },
  "grp.table": { it: "Tabella", en: "Table" },
  "grp.rowsCols": { it: "Righe/Colonne", en: "Rows/Columns" },
  "grp.cells": { it: "Celle", en: "Cells" },
  "grp.print": { it: "Stampa", en: "Print" },
  "grp.pages": { it: "Pagine", en: "Pages" },

  // Template tab
  "tpl.choose": { it: "Scegli un modello…", en: "Choose a template…" },
  "tpl.saveCurrent": { it: "Salva modello corrente", en: "Save current template" },
  "tpl.savedOk": { it: "Modello salvato in “I miei modelli”.", en: "Template saved in “My templates”." },
  "tpl.savePrompt": { it: "Nome del modello:", en: "Template name:" },

  // Table tab
  "tbl.insert": { it: "Inserisci", en: "Insert" },
  "tbl.rowsCols": { it: "Righe/Colonne", en: "Rows/Columns" },
  "tbl.addRow": { it: "Aggiungi riga", en: "Add row" },
  "tbl.addCol": { it: "Aggiungi colonna", en: "Add column" },
  "tbl.delRow": { it: "Elimina riga", en: "Delete row" },
  "tbl.delCol": { it: "Elimina colonna", en: "Delete column" },
  "tbl.merge": { it: "Unisci", en: "Merge" },
  "tbl.split": { it: "Dividi", en: "Split" },
  "tbl.headerRow": { it: "Intest. riga", en: "Header row" },
  "tbl.delete": { it: "Elimina tabella", en: "Delete table" },

  // Print tab
  "print.button": { it: "Stampa", en: "Print" },

  // Context menu
  "ctx.selection": { it: "Selezione", en: "Selection" },
  "ctx.table": { it: "Tabella", en: "Table" },
  "ctx.deleteSelection": { it: "Elimina selezione", en: "Delete selection" },
  "ctx.insertRowAbove": { it: "Inserisci riga sopra", en: "Insert row above" },
  "ctx.insertRowBelow": { it: "Inserisci riga sotto", en: "Insert row below" },
  "ctx.insertColLeft": { it: "Inserisci colonna a sinistra", en: "Insert column left" },
  "ctx.insertColRight": { it: "Inserisci colonna a destra", en: "Insert column right" },
  "ctx.deleteRow": { it: "Elimina riga", en: "Delete row" },
  "ctx.deleteCol": { it: "Elimina colonna", en: "Delete column" },
  "ctx.rowTaller": { it: "Riga più alta", en: "Taller row" },
  "ctx.rowShorter": { it: "Riga più bassa", en: "Shorter row" },
  "ctx.mergeCells": { it: "Unisci celle", en: "Merge cells" },
  "ctx.splitCell": { it: "Dividi cella", en: "Split cell" },
  "ctx.headerRow": { it: "Riga di intestazione", en: "Header row" },
  "ctx.headerCol": { it: "Colonna di intestazione", en: "Header column" },
  "ctx.deleteTable": { it: "Elimina tabella", en: "Delete table" },

  // Gallery
  "gal.title": { it: "Scegli un modello", en: "Choose a template" },
  "gal.language": { it: "Lingua", en: "Language" },
  "gal.myTemplates": { it: "I miei modelli", en: "My templates" },
  "gal.savePrompt": { it: "Nome del modello:", en: "Template name:" },
  "gal.downloadDoc": { it: "Scarica documento", en: "Download document" },
  "gal.loadFile": { it: "Carica da file", en: "Load from file" },
  "gal.none": { it: "Nessun modello salvato. Crea un documento e salvalo qui.", en: "No saved templates. Create a document and save it here." },
  "gal.myHint": { it: "I modelli sono salvati in questo browser. Per portarli altrove usa Scarica documento in Modelli.", en: "Templates are saved in this browser. To move them elsewhere use Download document in Templates." },
  "gal.loadedOk": { it: "Modelli importati in “I miei modelli”.", en: "Templates imported into “My templates”." },
  "gal.emptyCat": { it: "Nessun modello in questa categoria.", en: "No templates in this category." },
  "gal.deleteConfirm": { it: "Eliminare questo modello?", en: "Delete this template?" },
  "gal.deleteTitle": { it: "Elimina modello", en: "Delete template" },
  "gal.downloadTitle": { it: "Scarica file", en: "Download file" },
  "gal.close": { it: "Chiudi", en: "Close" },
  "gal.invalidFile": { it: "Nessun modello valido nel file.", en: "No valid template in the file." },

  // Categories
  "cat.flashcards": { it: "Flashcards e Vocabolario", en: "Flashcards and Vocabulary" },
  "cat.calendars": { it: "Orari e Pianificazioni", en: "Timetables and Planners" },
  "cat.dual": { it: "Modelli Doppia Lingua", en: "Dual Language Templates" },
  "cat.scales": { it: "Scale", en: "Scales" },
  "cat.activities": { it: "Attività", en: "Activities" },
  "cat.communication": { it: "Comunicazione", en: "Communication" },
  "cat.awards": { it: "Attestati e Premi", en: "Certificates and Rewards" },
  "cat.display": { it: "Materiali per Display", en: "Display Materials" },
  "cat.labels": { it: "Etichette", en: "Labels" },
  "cat.my": { it: "I miei modelli", en: "My templates" },

  // Symbol picker
  "sp.title": { it: "Pittogramma per", en: "Pictogram for" },
  "sp.bw": { it: "bianco/nero", en: "black/white" },
  "sp.skin": { it: "pelle", en: "skin" },
  "sp.hair": { it: "capelli", en: "hair" },
  "sp.size": { it: "dimensione", en: "size" },
  "sp.search": { it: "Cerca un pittogramma...", en: "Search a pictogram..." },
  "sp.searching": { it: "Ricerca...", en: "Searching..." },
  "sp.noResults": { it: "Nessun risultato", en: "No results" },
  "sp.applySize": { it: "Applica dimensione", en: "Apply size" },
  "sp.applySizeTitle": { it: "Applica solo la dimensione al pittogramma attuale", en: "Apply only the size to the current pictogram" },
  "sp.reset": { it: "Predefinito", en: "Default" },
  "sp.hide": { it: "Nessun pittogramma", en: "No pictogram" },
};

export function translate(lang: Lang, key: string): string {
  const entry = DICT[key];
  if (!entry) return key;
  return entry[lang] ?? entry.it;
}

export interface I18n {
  lang: Lang;
  t: (key: string) => string;
}

export const LangContext = createContext<I18n>({
  lang: "it",
  t: (k) => k,
});

export function useT(): I18n {
  return useContext(LangContext);
}
