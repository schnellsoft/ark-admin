/**
 * Walk HTML and map only visible text nodes (not inside script/style/etc.).
 * Browser-only (DOMParser). Attributes such as alt/title are left untouched.
 */

const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEMPLATE",
  "TEXTAREA",
]);

function isSkippedAncestor(node: Node): boolean {
  let el =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as Element)
      : node.parentElement;
  while (el) {
    if (SKIP_TAGS.has(el.tagName)) return true;
    el = el.parentElement;
  }
  return false;
}

function wrapFragment(html: string): {
  doc: Document;
  root: HTMLElement;
} | null {
  const doc = new DOMParser().parseFromString(
    `<div id="__ark_html_root">${html}</div>`,
    "text/html",
  );
  const root = doc.getElementById("__ark_html_root");
  if (!root) return null;
  return { doc, root };
}

function collectTextNodes(root: HTMLElement, doc: Document): Text[] {
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (isSkippedAncestor(node)) return NodeFilter.FILTER_REJECT;
      const text = node.textContent ?? "";
      if (!text.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes: Text[] = [];
  let current: Node | null;
  while ((current = walker.nextNode())) {
    nodes.push(current as Text);
  }
  return nodes;
}

/** Leading / trailing whitespace of a text node, kept around the translated core. */
export function preserveEdgeWhitespace(
  original: string,
  translated: string,
): string {
  const lead = original.match(/^\s*/)?.[0] ?? "";
  const trail = original.match(/\s*$/)?.[0] ?? "";
  return `${lead}${translated.trim()}${trail}`;
}

export function collectVisibleTextNodes(html: string): string[] {
  const wrapped = wrapFragment(html);
  if (!wrapped) return [];
  return collectTextNodes(wrapped.root, wrapped.doc).map(
    (n) => n.textContent ?? "",
  );
}

/**
 * Replace each visible text node in order with `replacements[i]`.
 * Length must match `collectVisibleTextNodes`; extras are ignored.
 */
export function applyVisibleTextNodes(
  html: string,
  replacements: string[],
): string {
  const wrapped = wrapFragment(html);
  if (!wrapped) return html;
  const nodes = collectTextNodes(wrapped.root, wrapped.doc);
  nodes.forEach((node, i) => {
    const next = replacements[i];
    if (next == null) return;
    node.textContent = preserveEdgeWhitespace(node.textContent ?? "", next);
  });
  return wrapped.root.innerHTML;
}

/** Translate visible text nodes via an async mapper (e.g. AI API per string). */
export async function mapVisibleHtmlText(
  html: string,
  mapText: (text: string) => Promise<string>,
): Promise<string> {
  const texts = collectVisibleTextNodes(html);
  if (!texts.length) return html;
  const translated: string[] = [];
  for (const text of texts) {
    const core = text.trim();
    if (!core) {
      translated.push(text);
      continue;
    }
    translated.push(await mapText(core));
  }
  return applyVisibleTextNodes(html, translated);
}
