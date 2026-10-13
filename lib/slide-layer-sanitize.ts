/** Allowlist sanitize for slide HTML layers (admin save + build). */

const ALLOWED_TAGS = new Set([
  "P",
  "H1",
  "H2",
  "H3",
  "H4",
  "SPAN",
  "STRONG",
  "EM",
  "B",
  "I",
  "U",
  "UL",
  "OL",
  "LI",
  "A",
  "BR",
  "DIV",
  "BUTTON",
  "HR",
  "SVG",
  "PATH",
  "USE",
  "G",
  "CIRCLE",
  "RECT",
  "LINE",
  "POLYLINE",
  "POLYGON",
]);

const ALLOWED_ATTR = new Set([
  "class",
  "style",
  "href",
  "target",
  "rel",
  "type",
  "aria-hidden",
  "focusable",
  "viewbox",
  "xmlns",
  "d",
  "fill",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "width",
  "height",
  "x",
  "y",
  "cx",
  "cy",
  "r",
  "x1",
  "y1",
  "x2",
  "y2",
  "points",
  "transform",
  "href",
  "xlink:href",
]);

const SAFE_STYLE =
  /^(?:color|background(?:-color)?|font-(?:size|weight|style|family)|text-align|text-decoration|opacity|letter-spacing|line-height|margin|padding|border(?:-radius)?|display|gap|flex(?:-direction)?|align-items|justify-content|width|height|max-width|max-height)\s*:/i;

function isSafeHref(href: string) {
  const v = href.trim().toLowerCase();
  return (
    v.startsWith("http://") ||
    v.startsWith("https://") ||
    v.startsWith("mailto:") ||
    v.startsWith("tel:") ||
    v.startsWith("/") ||
    v.startsWith("#")
  );
}

function cleanStyle(style: string) {
  return style
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s && SAFE_STYLE.test(s) && !/expression|url\s*\(/i.test(s))
    .join("; ");
}

export function sanitizeSlideLayerHtml(raw: string, maxLen = 20000): string {
  if (typeof DOMParser === "undefined") {
    return String(raw || "").slice(0, maxLen);
  }
  const doc = new DOMParser().parseFromString(
    `<div id="root">${String(raw || "")}</div>`,
    "text/html",
  );
  const root = doc.getElementById("root");
  if (!root) return "";

  const walk = (node: Node) => {
    const children = [...node.childNodes];
    for (const child of children) {
      if (child.nodeType === Node.TEXT_NODE) continue;
      if (child.nodeType !== Node.ELEMENT_NODE) {
        child.parentNode?.removeChild(child);
        continue;
      }
      const el = child as HTMLElement;
      const tag = el.tagName.toUpperCase();
      if (!ALLOWED_TAGS.has(tag)) {
        // Keep children, drop wrapper
        while (el.firstChild) el.parentNode?.insertBefore(el.firstChild, el);
        el.parentNode?.removeChild(el);
        continue;
      }
      for (const attr of [...el.attributes]) {
        const name = attr.name.toLowerCase();
        if (name.startsWith("on") || name === "srcdoc") {
          el.removeAttribute(attr.name);
          continue;
        }
        if (!ALLOWED_ATTR.has(name) && !name.startsWith("data-anim")) {
          el.removeAttribute(attr.name);
          continue;
        }
        if (name === "href" || name === "xlink:href") {
          if (!isSafeHref(attr.value)) el.removeAttribute(attr.name);
        }
        if (name === "style") {
          const cleaned = cleanStyle(attr.value);
          if (cleaned) el.setAttribute("style", cleaned);
          else el.removeAttribute("style");
        }
        if (name === "target" && attr.value !== "_blank") {
          el.removeAttribute("target");
        }
      }
      if (el.getAttribute("target") === "_blank") {
        el.setAttribute("rel", "noopener noreferrer");
      }
      walk(el);
    }
  };

  walk(root);
  return root.innerHTML.slice(0, maxLen);
}
