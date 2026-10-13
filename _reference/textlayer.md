---
name: slideshow-html-layer
description: Plan and implementation rules for the optional HTML overlay layer on slideshow slides (Astro static site + UIkit slideshow + Next.js admin PWA). Use whenever working on the slide HTML layer, its ribbon-style HTML editor, SVG icon insertion, layer position/opacity settings, desktop/mobile layer configs, or animated text effects. Use it even if the user only says "slide text", "overlay", "slide animation" or "HTML editor".
---

# Slideshow HTML layer

An optional HTML layer rendered on top of a slide image or video. Content is authored in the admin PWA, stored as HTML plus SVG icons, and baked into the static Astro site at build time. Goals: maximum loading speed, no runtime fetching, no heavy libraries.

## Principles

- Layer is optional per slide. No layer means no markup, no CSS and no JS for that slide.
- Content comes only from the database (admin editor). Never from user-supplied URLs.
- Everything is resolved at build time. The static site makes no runtime fetch to R2 or the admin.
- Animations are CSS-only (`opacity` and `transform` only). JS only adds a class.
- Animations play only the first time a slide is shown.

## Files and data

- Layer HTML: `ark-admin-content/slideshow/html/<slideId>.html`
- Layer settings: stored with the slide entry in the slideshow settings JSON in `ark-admin-content/slideshow/` (key `htmlLayer`).
- Build copies HTML and settings into Astro `src/` (alongside the slide images) and inlines the layer into the slide markup. Nothing is served from R2.

Suggested settings shape:

```json
{
  "htmlLayer": {
    "enabled": true,
    "opacity": 1,
    "desktop": { "left": 10, "top": 20, "width": 40, "height": 50 },
    "mobile": { "sameAsDesktop": true, "left": 5, "top": 10, "width": 90, "height": 40 }
  }
}
```

- `left`, `top`, `width`, `height` are percentages of the slide, not pixels.
- `height` must never exceed the slide height (cap at 100 - `top`).
- Content that overflows the area scrolls inside it (`overflow-y: auto`).
- When `mobile.sameAsDesktop` is true, the mobile config is ignored and desktop values are used.

## Admin editor

Ribbon-style layout, visual editing with a source-code toggle.

| Tab | Controls |
|---|---|
| Home | font family, size, color, bold/italic/underline, alignment, lists, clear formatting |
| Insert | SVG icon from the database, link, button, divider |
| Animation | effect, direction, duration, delay, stagger, preview |
| Layer | opacity, area rectangle (drag/resize on a slide preview), Desktop/Mobile switch with "Same as for desktop" checkbox |
| View | Visual / Source toggle, preview with desktop and mobile frames |

Rules:

- The area rectangle is drawn over the slide preview. Dragging and resizing saves percent values.
- Provide a Desktop/Mobile preview that uses the matching slide crop (art-direction image).
- SVG icons are inserted inline from the database, using `currentColor` so the Home tab color applies.
- Sanitize on save and again at build time. Allow a small set of tags (`p, h1-h4, span, strong, em, ul, ol, li, a, br, div, svg, path, use, button`) and a small set of attributes (`class, style` with a safe subset, `href`, `data-anim*`, SVG attributes). Strip scripts, event handlers, iframes and `javascript:` URLs.

## Animation effects

Stored as data attributes on the element, so the HTML stays portable:

```html
<h2 data-anim="slide" data-anim-dir="left" data-anim-duration="600" data-anim-delay="0">Title</h2>
<ul data-anim="stagger" data-anim-dir="bottom" data-anim-step="120"> <li>…</li> </ul>
```

Effects:

| `data-anim` | Behavior |
|---|---|
| `none` | default, no animation |
| `fade` | opacity 0 to 1 |
| `slide` | fade plus move from `data-anim-dir` (`left`, `right`, `top`, `bottom`) |
| `stagger` | children (list items) appear one by one, delay `data-anim-step` ms between them |
| `zoom` | scale 0.9 to 1 plus fade |
| `reveal-lines` | lines slide up from behind a mask (headlines) |
| `blur` | blur to sharp plus fade (use sparingly on mobile) |
| `underline` | underline or highlight sweeps in under key text |
| `typewriter` | short headlines only |

Options per element: effect, direction, duration (ms), delay (ms), step (stagger ms).

## Runtime behavior

CSS (inlined only on pages that have a layer):

```css
.hl [data-anim]:not(.is-in) { opacity: 0; }
.hl [data-anim].is-in { opacity: 1; transform: none; transition: opacity var(--d,600ms) ease var(--delay,0ms), transform var(--d,600ms) ease var(--delay,0ms); }
.hl [data-anim="slide"][data-anim-dir="left"]:not(.is-in) { transform: translateX(-24px); }
.hl [data-anim="slide"][data-anim-dir="right"]:not(.is-in) { transform: translateX(24px); }
.hl [data-anim="slide"][data-anim-dir="top"]:not(.is-in) { transform: translateY(-24px); }
.hl [data-anim="slide"][data-anim-dir="bottom"]:not(.is-in) { transform: translateY(24px); }
.hl [data-anim="zoom"]:not(.is-in) { transform: scale(.9); }
@media (prefers-reduced-motion: reduce) {
  .hl [data-anim] { opacity: 1 !important; transform: none !important; transition: none !important; }
}
```

JS (tiny, one listener):

- Listen to UIkit's slideshow `itemshown` event.
- In the shown slide, find `.hl [data-anim]`, set `--d`, `--delay` from the data attributes, and add `is-in`.
- For `stagger`, set each child's `--delay` to `delay + index * step`.
- Mark the slide `data-played` and skip it on later visits, so animations play only the first time.
- Handle the first slide on page load (it is shown without an event).
- Animate only `opacity` and `transform`. Never `top`, `left`, `width` or `height`.

## Rendering

- Layer container: `position: absolute`, `left/top/width/height` in `%`, `opacity` from settings, `z-index` above the media.
- Use CSS variables or per-breakpoint rules for desktop vs mobile positions (switch at the same breakpoint as the `<picture>` art direction).
- Keep text readable: offer an optional background color or gradient in the Home tab.

## Checklist before finishing

- [ ] Slide without a layer outputs no extra markup, CSS or JS
- [ ] Positions saved in percent, height capped to the slide
- [ ] Mobile "Same as for desktop" works and mobile can override
- [ ] HTML sanitized on save and at build
- [ ] Animations play once, respect reduced motion, use only opacity/transform
- [ ] First slide animates on initial load
