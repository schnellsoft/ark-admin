/** Client-safe header menu types/helpers (no Cloudflare env). */

import {
  asHeaderIconLabel,
  headerIconLabelText,
  normalizeHeaderIconHex,
  normalizeHeaderIconLink,
  serializeHeaderIconLabel,
} from "./header-icons-shared";
import { emptyLocaleMap, type LocaleMap } from "./i18n";

export const HEADER_MENU_MAX_DEPTH = 3;

export type HeaderMenuSettings = {
  more: boolean;
  maxWidth: string;
  color: string;
  colorHover: string;
};

export type HeaderMenuItem = {
  id: string;
  parent_id: string | null;
  icon_id: string | null;
  name: string;
  label: LocaleMap;
  description: string;
  aria_label: string;
  link: string;
  color: string;
  color_hover: string;
  position: number;
  svg?: string | null;
  items?: HeaderMenuItem[];
};

export type HeaderMenuDocumentItem = {
  name: string;
  label: LocaleMap;
  description: string;
  "aria-label": string;
  link: string;
  color: string;
  "color-hover": string;
  items?: HeaderMenuDocumentItem[];
};

export type HeaderMenuDocument = {
  more: boolean;
  "max-width": string;
  color: string;
  "color-hover": string;
  menu: HeaderMenuDocumentItem[];
};

export function emptyHeaderMenuSettings(): HeaderMenuSettings {
  return { more: false, maxWidth: "400", color: "", colorHover: "" };
}

export { asHeaderIconLabel as asMenuLabel, headerIconLabelText as menuLabelText, serializeHeaderIconLabel as serializeMenuLabel };

export function validateMenuItemDraft(
  draft: Partial<HeaderMenuItem>,
  opts?: { hasChildren?: boolean },
): string | null {
  const label = asHeaderIconLabel(draft.label);
  const hasLabel = Boolean(label.ro.trim() || label.bg.trim() || label.en.trim());
  if (!hasLabel) return "Label is required";
  if (opts?.hasChildren) {
    // link forced to #
  }
  return null;
}

export function buildMenuTree(flat: HeaderMenuItem[]): HeaderMenuItem[] {
  const byParent = new Map<string | null, HeaderMenuItem[]>();
  for (const item of flat) {
    const key = item.parent_id;
    const list = byParent.get(key) ?? [];
    list.push({ ...item, items: [] });
    byParent.set(key, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.position - b.position);
  }

  function attach(parentId: string | null, depth: number): HeaderMenuItem[] {
    const children = byParent.get(parentId) ?? [];
    if (depth >= HEADER_MENU_MAX_DEPTH) {
      return children.map((c) => ({ ...c, items: [] }));
    }
    return children.map((c) => ({
      ...c,
      items: attach(c.id, depth + 1),
    }));
  }

  return attach(null, 1);
}

export function flattenMenuTree(tree: HeaderMenuItem[], parentId: string | null = null): HeaderMenuItem[] {
  const out: HeaderMenuItem[] = [];
  tree.forEach((item, index) => {
    const hasChildren = (item.items?.length ?? 0) > 0;
    out.push({
      ...item,
      parent_id: parentId,
      position: index + 1,
      link: hasChildren ? "#" : normalizeHeaderIconLink(item.link),
      items: undefined,
    });
    if (item.items?.length) {
      out.push(...flattenMenuTree(item.items, item.id));
    }
  });
  return out;
}

function toDocumentItem(item: HeaderMenuItem): HeaderMenuDocumentItem {
  const children = item.items ?? [];
  const hasChildren = children.length > 0;
  const doc: HeaderMenuDocumentItem = {
    name: item.name?.trim() ?? "",
    label: asHeaderIconLabel(item.label),
    description: item.description?.trim() ?? "",
    "aria-label": item.aria_label?.trim() ?? "",
    link: hasChildren ? "#" : normalizeHeaderIconLink(item.link),
    color: normalizeHeaderIconHex(item.color),
    "color-hover": normalizeHeaderIconHex(item.color_hover),
  };
  if (hasChildren) {
    doc.items = children.map(toDocumentItem);
  }
  return doc;
}

export function buildHeaderMenuDocument(
  settings: HeaderMenuSettings,
  tree: HeaderMenuItem[],
): HeaderMenuDocument {
  return {
    more: settings.more,
    "max-width": String(settings.maxWidth || "400").replace(/px$/i, ""),
    color: normalizeHeaderIconHex(settings.color),
    "color-hover": normalizeHeaderIconHex(settings.colorHover),
    menu: tree.map(toDocumentItem),
  };
}

export function emptyMenuItem(): Partial<HeaderMenuItem> {
  return {
    parent_id: null,
    icon_id: null,
    name: "",
    label: emptyLocaleMap(""),
    description: "",
    aria_label: "",
    link: "",
    color: "",
    color_hover: "",
    svg: "",
    items: [],
  };
}

export function itemDepthInTree(tree: HeaderMenuItem[], id: string, depth = 1): number | null {
  for (const item of tree) {
    if (item.id === id) return depth;
    const found = itemDepthInTree(item.items ?? [], id, depth + 1);
    if (found !== null) return found;
  }
  return null;
}
