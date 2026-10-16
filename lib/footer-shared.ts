/** Client-safe types and helpers for Site/Footer (no Cloudflare env). */

import { emptyLocaleMap, type LocaleMap } from "./i18n";

export type FooterIconRow = {
  id: string;
  icon_id: string | null;
  /** Icon catalog name written into footer.json as `name`. */
  name: string;
  label: LocaleMap;
  aria_label: string;
  link: string;
  position: number;
  /** Joined from icons.svg for admin preview (not written to JSON). */
  svg?: string | null;
};

export type FooterDocument = {
  icons: Array<{
    name: string;
    label: LocaleMap;
    "aria-label": string;
    link: string;
  }>;
};

export function asFooterIconLabel(value: unknown): LocaleMap {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const v = value as Partial<LocaleMap>;
    return { ro: v.ro ?? "", bg: v.bg ?? "", en: v.en ?? "" };
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return emptyLocaleMap();
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const v = parsed as Partial<LocaleMap>;
        return { ro: v.ro ?? "", bg: v.bg ?? "", en: v.en ?? "" };
      }
    } catch {
      // legacy plain string → seed all locales
    }
    return emptyLocaleMap(trimmed);
  }
  return emptyLocaleMap();
}

export function serializeFooterIconLabel(label: LocaleMap | unknown): string {
  return JSON.stringify(asFooterIconLabel(label));
}

export function footerIconLabelText(label: LocaleMap | unknown, prefer?: keyof LocaleMap): string {
  const map = asFooterIconLabel(label);
  if (prefer && map[prefer]?.trim()) return map[prefer].trim();
  return map.ro.trim() || map.en.trim() || map.bg.trim() || "";
}

export function normalizeFooterIconLink(link: string | undefined | null): string {
  const trimmed = (link ?? "").trim();
  return trimmed.length > 0 ? trimmed : "#";
}

export function validateFooterIconDraft(draft: Partial<FooterIconRow>): string | null {
  const hasIcon = Boolean(draft.icon_id?.trim() || draft.name?.trim());
  if (!hasIcon) return "Select an icon";
  return null;
}

export function buildFooterDocument(icons: FooterIconRow[]): FooterDocument {
  return {
    icons: [...icons]
      .sort((a, b) => a.position - b.position)
      .map((icon) => ({
        name: icon.name?.trim() ?? "",
        label: asFooterIconLabel(icon.label),
        "aria-label": icon.aria_label?.trim() ?? "",
        link: normalizeFooterIconLink(icon.link),
      })),
  };
}
