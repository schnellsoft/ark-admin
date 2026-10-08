/** Client-safe types and helpers (no Cloudflare env / D1 / R2 imports). */

export type HeaderIconSettings = {
  more: boolean;
  /** Numeric width in px, stored without the unit in JSON (e.g. "200"). */
  maxWidth: string;
};

export type HeaderIconRow = {
  id: string;
  icon_id: string | null;
  /** Icon library name written into header_icons.json as `name`. */
  name: string;
  label: string;
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
  icons: Array<{
    name: string;
    label: string;
    description: string;
    "aria-label": string;
    link: string;
    color: string;
    "color-hover": string;
  }>;
};

export function emptyHeaderIconSettings(): HeaderIconSettings {
  return { more: false, maxWidth: "200" };
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
  const hasLabel = Boolean(draft.label?.trim());
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
    icons: [...icons]
      .sort((a, b) => a.position - b.position)
      .map((icon) => ({
        name: icon.name?.trim() ?? "",
        label: icon.label?.trim() ?? "",
        description: icon.description?.trim() ?? "",
        "aria-label": icon.aria_label?.trim() ?? "",
        link: normalizeHeaderIconLink(icon.link),
        color: normalizeHeaderIconHex(icon.color),
        "color-hover": normalizeHeaderIconHex(icon.color_hover),
      })),
  };
}
