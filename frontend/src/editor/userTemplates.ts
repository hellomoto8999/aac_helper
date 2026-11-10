export interface UserTemplate {
  id: string;
  name: string;
  html: string;
  created: number;
}

const KEY = "aac-user-templates";

export function listUserTemplates(): UserTemplate[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const items = JSON.parse(raw) as UserTemplate[];
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

export function saveUserTemplate(name: string, html: string): UserTemplate {
  const item: UserTemplate = {
    id: `u-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: name.trim() || "Senza nome",
    html,
    created: Date.now(),
  };
  const items = listUserTemplates();
  items.unshift(item);
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
  return item;
}

export function deleteUserTemplate(id: string): void {
  const items = listUserTemplates().filter((t) => t.id !== id);
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

function triggerDownload(filename: string, text: string): void {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadTemplate(name: string, html: string): void {
  const data = { type: "aac-template", name: name || "modello", html };
  const safe = (name || "modello").replace(/[^\w\-]+/g, "_").slice(0, 40);
  triggerDownload(`${safe}.aac.json`, JSON.stringify(data, null, 2));
}

/** Legge il contenuto di un file modello e restituisce i modelli contenuti. */
export function parseTemplateFile(text: string): { name: string; html: string }[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    // forse è HTML puro
    return [{ name: "Modello importato", html: text }];
  }
  const arr = Array.isArray(data) ? data : [data];
  const out: { name: string; html: string }[] = [];
  for (const item of arr) {
    if (item && typeof item === "object") {
      const obj = item as Record<string, unknown>;
      const html = typeof obj.html === "string" ? obj.html : "";
      const name = typeof obj.name === "string" ? obj.name : "Modello importato";
      if (html) out.push({ name, html });
    }
  }
  return out;
}
