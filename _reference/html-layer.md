---
name: slide-html-layer
description: Plan and implement the per-slide "HTML layer" (overlay with stylized HTML, database SVG icons and text animations) - admin editor with draggable/resizable rectangle, separate desktop and mobile versions ("Same as for desktop" checkbox), storage in ark-admin-content/slideshow/html/, and rendering on the Astro site. Use when working on slideshow overlay content, the layer editor, icon picker, text effects, or layer rendering.
---

# Slide HTML layer: plan and rules

Related skill: `mobile-crop-tool` (image variants, 3:4 mobile crop, `<picture>` markup). Reuse its pointer-event drag logic for the layer rectangle.

## Context

- Admin: Next.js PWA in its own Cloudflare Worker. Public site: Astro static site (slideshow uses UIkit), no Astro `<Image>`.
- Content lives in `ark-admin-content/slideshow/`. The site is rebuilt when slideshow content changes. Goal: maximum loading speed, free tier only.
- A slide may carry **one overlay layer** above the image, per variant (desktop, mobile). Layer content: HTML + inline SVG icons from the database.

## Decisions already made by the user

1. Editor: **visual editing with a source-code toggle**.
2. Rectangle position and size are stored in **percent of the slide** (scales with any screen).
3. Text animations play **only the first time the slide is shown**.
4. Layer HTML is saved to `ark-admin-content/slideshow/html/<slideId>.html`.
5. Layer height can never exceed the slide height. The area is a rectangle the user drags (position) and resizes. Left and top are saved. Content scrolls if it overflows.
6. Desktop and mobile are configured separately. A checkbox **"Same as for desktop"** makes mobile reuse the desktop layer. Unchecking it opens an interface like the desktop one.

## Assumptions (confirm with the user, change here if they disagree)

- Mobile file: `html/<slideId>.mobile.html`. Desktop file: `html/<slideId>.html`.
- Layer settings (non-HTML) live in the existing slideshow JSON, next to the slide entry (see schema).
- "From database only" means: no external resources. Icons come from the icon table, content from admin storage. No external images, fonts, scripts, iframes.
- Only the owner edits this content (trusted), but it is still sanitized (see Security).
- Default editor stack: **Tiptap** (visual) + **CodeMirror 6** (source view). Do a short spike first (Phase 0).

## Data model (in the slideshow JSON, per slide)

```json
{
  "id": "01",
  "layer": {
    "desktop": {
      "enabled": true,
      "rect": { "left": 8, "top": 12, "width": 40, "height": 60 },
      "opacity": 1,
      "background": { "color": "#000000", "opacity": 0.45, "blur": 4 },
      "padding": 4,
      "radius": 12,
      "textColor": "#ffffff",
      "verticalAlign": "center",
      "scaleText": true,
      "animation": { "duration": 600, "delay": 200, "stagger": 120 },
      "zIndex": 2
    },
    "mobile": { "sameAsDesktop": true }
  }
}
```

- `rect` values are **percent of the slide**, numbers with at most 2 decimals.
  - Constraints: `0 <= left`, `0 <= top`, `left + width <= 100`, `top + height <= 100`, `height <= 100`, minimum `width` and `height` 10.
- `mobile.sameAsDesktop = true`: no mobile file and no mobile settings are stored (delete `<slideId>.mobile.html` when the user checks it, after confirming). Rendering reuses the desktop layer entirely.
- `mobile.sameAsDesktop = false`: the same settings object as desktop, plus its own file `<slideId>.mobile.html`. When first unchecked, offer a **"Copy from desktop"** button as a starting point.
- The checkbox is disabled (and mobile layer is empty) if no desktop layer exists.
- HTML itself is **not** in the JSON, only in the `.html` files.

## Layer settings (UI fields)

| Setting | Notes |
|---|---|
| Enabled | Per variant. Lets the user hide the layer on mobile only, for example. |
| Rectangle `left`, `top`, `width`, `height` | Percent. Drag/resize on the preview and numeric fields kept in sync. |
| Opacity | 0-1 for the whole layer (content + background). |
| Background color + its own opacity + blur | Separate from layer opacity, so text stays readable over the image. |
| Padding, corner radius | Percent of layer width or px, one consistent choice. |
| Default text color | Inherited by the content. |
| Vertical alignment | top / center / bottom inside the rectangle. |
| Scale text with slide | On by default: font sizes use `cqw` units, so text shrinks with the layer (see Rendering). |
| Animation: duration, delay, stagger | Defaults for effects chosen in the editor. |
| z-index | Only above the image; default 2. |
| Click-through | `pointer-events: none` when the layer has no links or buttons, so swipes and clicks reach the slideshow. |

## Admin UI

1. In the slide editor add a **"Layer"** section with tabs **Desktop | Mobile**.
2. Preview stage:
   - Desktop tab: the desktop image at its real aspect ratio.
   - Mobile tab: the 3:4 mobile crop image.
   - The stage shows the layer rectangle with drag (move) and corner/edge handles (resize). Use pointer events with `setPointerCapture`, `touch-action: none`. Keyboard: arrows move 0.5% (Shift = 5%).
   - Clamp to the slide: never exceed 100% in either direction.
3. Mobile tab starts with the **"Same as for desktop"** checkbox (checked by default if a desktop layer exists). When checked, show the desktop layer read-only in the mobile preview and hide the editor.
4. Editor below the stage: toolbar, visual area, **Source** toggle (CodeMirror), settings panel.
5. **Play animation** button to preview effects on demand (first-time-only behavior applies only on the public site).
6. Save writes the HTML file(s) and the settings JSON, then triggers the existing rebuild. Use R2 ETag/versions to avoid overwriting concurrent edits. Show a clear error if saving fails.
7. Deleting a slide also deletes its layer HTML files.

## Editor requirements

- Visual mode (Tiptap): headings, paragraphs, bold/italic, links, ordered/unordered lists, line breaks, alignment, text color from a small palette, font size from a small scale, and **style presets** (title, subtitle, badge, button/CTA, highlighted list). Presets map to classes defined in the site stylesheet, so the saved HTML stays small and consistent.
- Source mode (CodeMirror 6, HTML): switching modes must **round-trip safely**. Tiptap drops unknown tags/attributes, so write custom extensions that preserve `class`, `style` (allowlisted), `data-anim*`, `data-icon-id`, and inline `<svg>`. Add tests for the round trip.
- **Icon picker**: a dialog with search and categories reading the icons table. On insert, put inline `<svg>` into the content with `fill="currentColor"`, size in `em`, and `aria-hidden="true"` (or a `<title>` plus `role="img"` if the icon carries meaning). Keep `data-icon-id` on the wrapper so icons can be updated later. Sanitize SVG (no scripts, no external references).
- **Effects picker**: select an element or a list, then choose an effect, direction, duration, delay, stagger. The editor writes `data-anim*` attributes only (no inline JS).
- Hard limit on HTML size (for example 20 KB per file) and a visible counter.

## Animations

Applied with attributes, played by one small shared script on the public site.

Attributes: `data-anim="<effect>"`, optional `data-anim-dir="up|down|left|right"`, `data-anim-duration`, `data-anim-delay`, `data-anim-stagger`, `data-anim-split="items|lines|words|letters"`.

Effects to implement (CSS `opacity`/`transform` only, so they are cheap):

| Effect | Behavior |
|---|---|
| `fade` | Fade in. |
| `slide` | Appears from top, left, right or bottom (`data-anim-dir`), with fade. |
| `zoom` | Scales from 0.9 to 1 with fade. |
| `blur-in` | Blur to sharp with fade. |
| `wipe` | Reveal with `clip-path` from a chosen side. |
| `pop` | Small overshoot scale (for icons and badges). |
| `typewriter` | Letters appear in sequence (split letters). |
| `underline-draw` | Underline or highlight draws in under a phrase. |
| `count-up` | Number counts up to its value. |

Lists: `data-anim-split="items"` plays the chosen effect on each `<li>` **one by one** using a stagger delay (`animation-delay: calc(var(--i) * var(--stagger))`). The user can pick fade or slide from any side for the list items, as requested.

Playback rules:
- **Play only the first time the slide is shown.** Use the slideshow's "item shown" event (UIkit `itemshown`) or an `IntersectionObserver` for the first slide. Mark the layer `data-played="true"` after the first play and never replay, including when the slideshow loops back.
- Hidden initial state is applied only when the `js` class is on `<html>`. Without JavaScript the content must be visible.
- Respect `prefers-reduced-motion: reduce`: no animation, show the final state at once.
- Letter and word splitting must keep accessibility: keep the full text readable by assistive tech (one accessible text copy, split spans `aria-hidden="true"`).
- Do not trigger layout shift: animate only `opacity`, `transform`, `filter`, `clip-path`.

## Security and sanitization

- Sanitize **twice**: on save in the admin, and again at build time before inlining (allowlist-based, for example DOMPurify or sanitize-html).
- Allowed: a restricted set of tags (headings, p, span, div, ul/ol/li, a, strong, em, br, svg and its safe child tags), the `class`, `data-anim*`, `data-icon-id`, `aria-*`, `role` attributes, and a small allowlist of inline CSS properties.
- Forbidden: `<script>`, `<iframe>`, `<object>`, `<embed>`, `<img>` with external `src`, `<style>` with `@import` or `url()`, any `on*` attribute, `javascript:` URLs, external references in SVG (`xlink:href` to remote, `<use>` of external files).
- Links: only `http`, `https`, `mailto`, `tel`. External links get `rel="noopener noreferrer"`.

## Rendering on the Astro site

- The build reads the slide JSON and the layer HTML files and **inlines the HTML into the slide markup**. No runtime fetch, so no extra request.
- Markup per slide:

```html
<div class="slide-layer" data-variant="desktop" style="--l:8%;--t:12%;--w:40%;--h:60%;--op:1">
  <div class="slide-layer__body" tabindex="-1"> ...sanitized html... </div>
</div>
```

- If mobile is "same as desktop": render **one** layer. Otherwise render two (`data-variant="desktop"` and `data-variant="mobile"`) and show one with CSS at the same breakpoint as the `<picture>` (`max-width: 900px`). Hide the other with `display: none`, so assistive tech skips it.
- The layer is absolutely positioned inside the slide container using the percent values. It has `container-type: inline-size`, so font sizes can use `cqw` when `scaleText` is on.
- Overflow: `overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin`. If content overflows, a small script adds `tabindex="0"` (keyboard-scrollable). Test that vertical scrolling in the layer does not fight the slideshow's horizontal swipe (use `touch-action: pan-y`).
- Hidden slides must stay hidden from assistive tech (`inert` or `aria-hidden`), which also covers their layers.
- Only the first slide's layer is critical. Keep the layer script tiny (target under 2 KB gzipped) and load it deferred.

## Implementation phases

0. **Spike**: confirm Tiptap + custom extensions round-trip the allowed HTML, SVG and `data-anim*` attributes. Decide the editor stack.
1. **Storage and model**: JSON schema, validation (percent constraints), read/write of `html/<slideId>.html` and `.mobile.html`, API routes in the admin Worker.
2. **Rectangle UI**: preview stage, drag/resize, numeric fields in sync, clamping, desktop/mobile tabs.
3. **Editor**: Tiptap visual mode, CodeMirror source mode, presets, safe mode switching.
4. **Icon picker**: DB query, search, inline SVG insertion.
5. **Animations**: CSS + the shared script, effect picker, preview button.
6. **Desktop/mobile logic**: "Same as for desktop" checkbox, copy from desktop, file cleanup.
7. **Site rendering**: build-time sanitize + inline, CSS, breakpoint switching, scroll and swipe checks.
8. **QA** (checklist below).

## Checklist before finishing any change

- [ ] Rectangle always inside the slide (percent), height never above 100%.
- [ ] Drag/resize and numeric fields stay in sync; works with touch and keyboard.
- [ ] Mobile "Same as for desktop" works both ways, with no orphan files left in storage.
- [ ] Visual and source modes round-trip without losing classes, `data-anim*`, or SVG.
- [ ] Sanitization runs on save and at build; forbidden tags and attributes are removed.
- [ ] Animations play once per page load, never replay, respect reduced motion, and content is visible without JavaScript.
- [ ] No layout shift; no extra network request for the layer; script stays tiny.
- [ ] Scrollable layer is keyboard-accessible and does not break slideshow swiping.
- [ ] Layer text has enough contrast over the image (background color/opacity or a scrim).