import type {
  ConvertResponse,
  LookupResult,
  PictogramFeatures,
} from "./types";

const API_BASE = "/api";

export async function lookupWords(
  words: string[],
  language = "it",
): Promise<LookupResult[]> {
  const res = await fetch(`${API_BASE}/lookup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ words, language }),
  });
  if (!res.ok) throw new Error(`Errore lookup ${res.status}`);
  const data = await res.json();
  return data.results;
}

export async function convertText(
  text: string,
  useLlm = true,
): Promise<ConvertResponse> {
  const res = await fetch(`${API_BASE}/convert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, use_llm: useLlm }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || `Errore ${res.status}`);
  }
  return res.json();
}

export async function searchPictograms(
  query: string,
  limit = 30,
  language = "it",
) {
  const res = await fetch(
    `${API_BASE}/search?q=${encodeURIComponent(query)}&limit=${limit}&language=${language}`,
  );
  if (!res.ok) throw new Error(`Errore ricerca ${res.status}`);
  const data = await res.json();
  return data.results;
}

export async function health() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error("Backend non raggiungibile");
  return res.json();
}

const RESOLUTION = 500;
const HAIR: Record<string, string> = {
  brown: "A65E26",
  blonde: "FDD700",
  red: "ED4120",
  black: "020100",
  gray: "EFEFEF",
  darkGray: "AAABAB",
  darkBrown: "6A2703",
};
const SKIN: Record<string, string> = {
  white: "F5E5DE",
  black: "A65C17",
  assian: "F4ECAD",
  mulatto: "E3AB72",
  aztec: "CF9D7C",
};

export const HAIR_OPTIONS = Object.keys(HAIR);
export const SKIN_OPTIONS = Object.keys(SKIN);

export function pictogramUrl(
  id: number | null,
  features: PictogramFeatures = {},
): string | null {
  if (id == null) return null;
  const mods: string[] = [];
  if (features.plural) mods.push("plural");
  if (features.action === "past" || features.action === "future")
    mods.push(`action-${features.action}`);
  if (features.nocolor) mods.push("nocolor");
  if (features.hair && HAIR[features.hair])
    mods.push(`hair-${HAIR[features.hair]}`);
  if (features.skin && SKIN[features.skin])
    mods.push(`skin-${SKIN[features.skin]}`);
  const suffix = mods.length ? `_${mods.join("_")}` : "";
  return `https://static.arasaac.org/pictograms/${id}/${id}${suffix}_${RESOLUTION}.png`;
}
