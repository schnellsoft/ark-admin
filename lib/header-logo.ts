import { getEnv } from "./env";

export const HEADER_LOGO_CONTENT_KEY = "header/logo/header_logo.json";
export const HEADER_LOGO_MEDIA_PREFIX = "header/logo";

export type HeaderLogoImage = {
  type: "image";
  /** R2 object key inside ark-admin-media (path the Astro site resolves). */
  src: string;
};

export type HeaderLogoSvg = {
  type: "svg";
  /** Inline SVG markup embedded by the Astro site. */
  svg: string;
};

export type HeaderLogoEntry = HeaderLogoImage | HeaderLogoSvg;

export type HeaderLogoDocument = {
  /** Compact / mobile logo (reference: `.snd-ct-logo-min`). */
  logo_min: HeaderLogoEntry | null;
  /** Full / desktop logo (reference: `.snd-ct-logo-max`). */
  logo_max: HeaderLogoEntry | null;
  updated_at: string;
};

export type HeaderLogoSlot = "logo_min" | "logo_max";

export function emptyHeaderLogoDocument(): HeaderLogoDocument {
  return {
    logo_min: null,
    logo_max: null,
    updated_at: new Date(0).toISOString(),
  };
}

export function isHeaderLogoEntry(value: unknown): value is HeaderLogoEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  if (entry.type === "image" && typeof entry.src === "string" && entry.src.length > 0) {
    return true;
  }
  if (entry.type === "svg" && typeof entry.svg === "string" && entry.svg.trim().length > 0) {
    return true;
  }
  return false;
}

export function parseHeaderLogoDocument(raw: unknown): HeaderLogoDocument {
  if (!raw || typeof raw !== "object") return emptyHeaderLogoDocument();
  const obj = raw as Record<string, unknown>;
  return {
    logo_min: isHeaderLogoEntry(obj.logo_min) ? obj.logo_min : null,
    logo_max: isHeaderLogoEntry(obj.logo_max) ? obj.logo_max : null,
    updated_at:
      typeof obj.updated_at === "string" && obj.updated_at
        ? obj.updated_at
        : new Date(0).toISOString(),
  };
}

function extensionFromFileName(name: string): string {
  const match = /\.([a-zA-Z0-9]{1,12})$/.exec(name);
  return match?.[1]?.toLowerCase() ?? "bin";
}

export async function getHeaderLogoDocument(): Promise<HeaderLogoDocument> {
  const { CONTENT } = getEnv();
  const obj = await CONTENT.get(HEADER_LOGO_CONTENT_KEY);
  if (!obj) return emptyHeaderLogoDocument();
  try {
    return parseHeaderLogoDocument(await obj.json());
  } catch {
    return emptyHeaderLogoDocument();
  }
}

export async function putHeaderLogoDocument(doc: HeaderLogoDocument): Promise<void> {
  const { CONTENT } = getEnv();
  await CONTENT.put(HEADER_LOGO_CONTENT_KEY, JSON.stringify(doc, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
}

/** Remove prior `header/logo/logo_min.*` / `logo_max.*` objects so only one image remains. */
async function clearMediaSlot(slot: HeaderLogoSlot) {
  const { MEDIA } = getEnv();
  const prefix = `${HEADER_LOGO_MEDIA_PREFIX}/${slot}`;
  const listed = await MEDIA.list({ prefix });
  await Promise.all(
    listed.objects
      .filter((obj) => obj.key === prefix || obj.key.startsWith(`${prefix}.`))
      .map((obj) => MEDIA.delete(obj.key)),
  );
}

export async function putHeaderLogoImage(
  slot: HeaderLogoSlot,
  file: File,
): Promise<HeaderLogoImage> {
  const { MEDIA } = getEnv();
  const ext = extensionFromFileName(file.name);
  const key = `${HEADER_LOGO_MEDIA_PREFIX}/${slot}.${ext}`;
  await clearMediaSlot(slot);
  const buffer = await file.arrayBuffer();
  await MEDIA.put(key, buffer, {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
  });
  return { type: "image", src: key };
}
