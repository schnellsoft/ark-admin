---
name: mobile-crop-tool
description: Build and maintain the admin "mobile crop" interface (draggable fixed-ratio crop rectangle with top/left coordinates) and the image generation pipeline that produces desktop and mobile slideshow images (webp + normal) at fixed sizes. Use when working on slideshow image upload, cropping, resizing, webp conversion, or the <picture> markup for slides.
---

# Mobile crop tool: skill for Cursor

## Context

- Public site: Astro static site in its own Cloudflare Worker. Slideshow uses UIkit. Plain `<picture>` / `<img>` markup, **no Astro `<Image>` component**.
- Admin: Next.js PWA in a separate Cloudflare Worker. Images are uploaded through the admin section and stored in R2 (`ark-admin-media/slideshow/`). Slideshow settings JSON lives in `ark-admin-content/slideshow/`.
- At rebuild, images are copied into Astro `src/assets` and served from the site itself (not from R2).
- Goal: maximum loading speed. Free tier only.
- Workers cannot run `sharp`, so **all cropping and resizing happens in the browser (canvas) in the admin PWA, before upload**.

## What the user does

1. Selects a slide image (the large original).
2. The **desktop version** is made by cropping a rectangle locked to the slideshow **ratio** (e.g. 16:9) with a draggable rectangle, then resizing.
3. The **mobile version** is made by cropping a **portrait 3:4** area with a draggable rectangle.
4. Saves / Apply. The app generates all output files and uploads them.
5. `desktopFocus` (`{ x, y }` percentages) is derived from the desktop crop center and written into `slideshow.json` so the public site can set `object-position` even before variants are rebuilt.

## Crop interface requirements

- Show the original image scaled to fit the screen (the "display" size). Keep a `scale = naturalWidth / displayWidth` so display coordinates convert to real pixels.
- Overlay a **draggable rectangle with a locked 3:4 aspect ratio** (width:height = 3:4).
  - Dim everything outside the rectangle.
  - Drag with pointer events (`pointerdown/move/up`, with `setPointerCapture`) so mouse, touch, and pen all work. Set `touch-action: none` on the crop area.
  - Corner handles to resize while keeping 3:4. Optional: mouse wheel / pinch to resize.
  - Clamp so the rectangle never leaves the image.
  - Keyboard: arrow keys move by 1 px (Shift = 10 px), for accessibility.
- **Numeric fields for `left` and `top`** (and read-only `width` and `height`), in **natural image pixels**, as integers. Editing a field moves the rectangle, and dragging updates the fields. Both stay in sync.
- Default rectangle: the largest 3:4 area that fits in the image, centered. If the image is already portrait 3:4, the rectangle covers it all.
- Show a live **preview** of the cropped result at phone proportions.
- Quality warning: if the crop width in natural pixels is **< 1080**, show a warning ("will be upscaled, image may look soft"). Do not block saving.
- Crop state is stored as:

```json
{ "left": 420, "top": 0, "width": 1620, "height": 2160 }
```

All values are integers in natural-image pixels.

## Output files per slide

Source name: `slide-<id>` (a version/hash is added so URLs change when the image changes, e.g. `slide-01.a3f9`).

| Variant | Source of pixels | Dimensions | Formats |
|---|---|---|---|
| Desktop large (`-d-1920`) | **desktop crop** rectangle, resized | **1920 px wide**, height follows crop ratio | webp + normal |
| Desktop medium (`-d-1280`) | **desktop crop** rectangle, resized | **1280 px wide**, height follows crop ratio | webp + normal |
| Mobile large (`-m-1080`) | mobile crop rectangle, resized | **1080 × 1440** (3:4) | webp + normal |
| Mobile medium (`-m-720`) | mobile crop rectangle, resized | **720 × 960** (3:4) | webp + normal |

That is **8 files per image slide**. "Normal" means jpeg for photos (png only if the original has transparency).

Rules:
- **Never upscale desktop images.** If the original is narrower than 1920 px, skip the 1920 file (and the 1280 file if narrower than that) and record what was produced.
- Mobile files are always cut from the **original full-resolution** image using the crop rectangle, then resized once. Never crop an already-resized image.
- Encode: webp quality about 80, jpeg quality about 80 (progressive). Typical mobile webp should be about 80-200 KB.
- Export with `canvas.toBlob(cb, 'image/webp', 0.8)` and `'image/jpeg', 0.8`. Set `ctx.imageSmoothingQuality = 'high'`. For large downscales, resize in two steps (to about 2x the target, then to the target) to keep sharpness.
- Large originals: use `createImageBitmap` and `OffscreenCanvas` (in a Web Worker if possible) to avoid freezing the UI. Respect EXIF orientation (`imageOrientation: 'from-image'`).
- Slides can be **video**: no crop tool and no image variants. Handle separately.

## Data saved per slide (in the slideshow JSON)

```json
{
  "id": "01",
  "version": "a3f9",
  "alt": "Dentist explaining an X-ray to a patient",
  "mobileCrop": { "left": 420, "top": 0, "width": 1620, "height": 2160 },
  "desktopCrop": { "left": 0, "top": 480, "width": 1920, "height": 1080 },
  "desktopFocus": { "x": 50, "y": 40 },
  "files": {
    "desktop": { "1920": { "width": 1920, "height": 1080 }, "1280": { "width": 1280, "height": 720 } },
    "mobile":  { "1080": { "width": 1080, "height": 1440 }, "720": { "width": 720, "height": 960 } }
  }
}
```

Store the actual produced `width`/`height` so the markup can set `width`/`height` attributes. Keep `mobileCrop` so the user can re-open and adjust the crop later without re-uploading.

## Markup on the Astro site

Breakpoint for the portrait crop: `max-width: 900px` (phones and narrow tablets). Order matters: the first matching `<source>` wins. Put the webp sources first and the normal-format sources after them (or rely on `type`).

```html
<picture>
  <source media="(max-width: 900px)" type="image/webp"
          srcset="slide-01.a3f9-m-720.webp 720w, slide-01.a3f9-m-1080.webp 1080w" sizes="100vw">
  <source media="(max-width: 900px)"
          srcset="slide-01.a3f9-m-720.jpg 720w, slide-01.a3f9-m-1080.jpg 1080w" sizes="100vw">
  <source type="image/webp"
          srcset="slide-01.a3f9-d-1280.webp 1280w, slide-01.a3f9-d-1920.webp 1920w" sizes="100vw">
  <img src="slide-01.a3f9-d-1280.jpg"
       width="1920" height="1080"
       alt="..."
       decoding="async">
</picture>
```

- Always set `alt` (use `alt=""` only for purely decorative images). **Do not add `aria-label` to `<img>`.**
- Always set `width` and `height`, and use CSS `aspect-ratio` per breakpoint, since mobile (3:4) and desktop ratios differ.
- **First slide only:** `fetchpriority="high"`, no `loading` attribute. **All other slides:** `loading="lazy"`.
- Hidden slides must be hidden from assistive tech (`inert` or `aria-hidden="true"`). The slideshow container gets `role="region"` and an `aria-label`. Controls are real `<button>` elements with accessible names. Respect `prefers-reduced-motion`; autoplay needs a pause control.
- Because files are copied into `src/assets` and served from the site, set long cache headers (`Cache-Control: public, max-age=31536000, immutable`) for the hashed image filenames in the `_headers` file. Changed image means a new `version`, so a new filename.

## Checklist before finishing any change

- [ ] Rectangle is always 3:4 and always inside the image.
- [ ] `left`/`top` fields and the drag position stay in sync (natural pixels, integers).
- [ ] Mobile files are cropped from the original, not from a resized copy.
- [ ] No upscaling for desktop files; warning for small crops.
- [ ] 4 sizes x 2 formats produced, names include the version hash.
- [ ] `alt`, `width`, `height` present; `fetchpriority`/`loading` correct per slide position.
- [ ] Works with touch (phone browser) and with the keyboard.