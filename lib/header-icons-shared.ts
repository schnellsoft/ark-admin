/** Client-safe types and helpers (no Cloudflare env / D1 / R2 imports). */

import { emptyLocaleMap, type LocaleMap } from "./i18n";

export type HeaderIconSettings = {
  more: boolean;
  /** Numeric width in px, stored without the unit in JSON (e.g. "200"). */
  maxWidth: string;
  color: string;
  colorHover: string;
};

export type HeaderIconRow = {
  id: string;
  icon_id: string | null;
  /** Icon library name written into header_icons.json as `name`. */
  name: string;
  /** Multilingual label for Astro language switcher. */
  label: LocaleMap;
  description: string;
  aria_label: string;
  link: string;
  color: string;
  color_hover: string;
  position: number;
  /** Joined from icons.svg for admin preview (not written to JSON). */
  svg?: string | null;
};

export type HeaderIconsDocument = {
  more: boolean;
  "max-width": string;
  color: string;
  "color-hover": string;
  icons: Array<{
    name: string;
    label: LocaleMap;
    description: string;
    "aria-label": string;
    link: string;
    color: string;
    "color-hover": string;
  }>;
};

export function emptyHeaderIconSettings(): HeaderIconSettings {
  return { more: false, maxWidth: "200", color: "", colorHover: "" };
}

export function asHeaderIconLabel(value: unknown): LocaleMap {
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

export function serializeHeaderIconLabel(label: LocaleMap | unknown): string {
  return JSON.stringify(asHeaderIconLabel(label));
}

export function headerIconLabelText(label: LocaleMap | unknown, prefer?: keyof LocaleMap): string {
  const map = asHeaderIconLabel(label);
  if (prefer && map[prefer]?.trim()) return map[prefer].trim();
  return map.ro.trim() || map.en.trim() || map.bg.trim() || "";
}

export function normalizeHeaderIconLink(link: string | undefined | null): string {
  const trimmed = (link ?? "").trim();
  return trimmed.length > 0 ? trimmed : "#";
}

export function normalizeHeaderIconHex(color: string | undefined | null): string {
  const trimmed = (color ?? "").trim();
  if (!trimmed) return "";
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  if (/^([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(trimmed)) {
    return `#${trimmed.toUpperCase()}`;
  }
  return trimmed;
}

export function validateHeaderIconDraft(draft: Partial<HeaderIconRow>): string | null {
  const hasIcon = Boolean(draft.icon_id?.trim() || draft.name?.trim());
  const label = asHeaderIconLabel(draft.label);
  const hasLabel = Boolean(label.ro.trim() || label.bg.trim() || label.en.trim());
  if (!hasIcon && !hasLabel) {
    return "Select an icon or provide a label";
  }
  return null;
}

export function buildHeaderIconsDocument(
  settings: HeaderIconSettings,
  icons: HeaderIconRow[],
): HeaderIconsDocument {
  return {
    more: settings.more,
    "max-width": String(settings.maxWidth || "200").replace(/px$/i, ""),
    color: normalizeHeaderIconHex(settings.color),
    "color-hover": normalizeHeaderIconHex(settings.colorHover),
    icons: [...icons]
      .sort((a, b) => a.position - b.position)
      .map((icon) => ({
        name: icon.name?.trim() ?? "",
        label: asHeaderIconLabel(icon.label),
        description: icon.description?.trim() ?? "",
        "aria-label": icon.aria_label?.trim() ?? "",
        link: normalizeHeaderIconLink(icon.link),
        color: normalizeHeaderIconHex(icon.color),
        "color-hover": normalizeHeaderIconHex(icon.color_hover),
      })),
  };
}
