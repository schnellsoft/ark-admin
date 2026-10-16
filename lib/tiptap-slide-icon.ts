import { Node, type NodeViewRendererProps } from "@tiptap/core";

/**
 * Preserve inline SVG icons (span.slide-icon) through TipTap getHTML/setContent.
 */
export const SlideIcon = Node.create({
  name: "slideIcon",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      html: {
        default: "",
        parseHTML: (element: HTMLElement) => element.innerHTML,
      },
      style: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("style"),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span.slide-icon" }];
  },

  renderHTML({ node }: { node: { attrs: { html?: string; style?: string | null } } }) {
    if (typeof document === "undefined") {
      return ["span", { class: "slide-icon", "aria-hidden": "true" }];
    }
    const span = document.createElement("span");
    span.className = "slide-icon";
    span.setAttribute("aria-hidden", "true");
    if (node.attrs.style) span.setAttribute("style", String(node.attrs.style));
    span.innerHTML = String(node.attrs.html || "");
    return span;
  },

  addNodeView() {
    return ({ node }: NodeViewRendererProps) => {
      const dom = document.createElement("span");
      dom.className = "slide-icon";
      dom.setAttribute("aria-hidden", "true");
      if (node.attrs.style) dom.setAttribute("style", String(node.attrs.style));
      dom.innerHTML = String(node.attrs.html || "");
      return { dom };
    };
  },
});
