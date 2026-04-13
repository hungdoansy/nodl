# Landing-page assets

This directory holds the marketing visuals referenced by `apps/web/src/app/`.
Everything currently shipped is a **placeholder** — please replace each file
with a final asset before deploying to production.

## What to provide

| File | Used by | Target dimensions | Format | Notes |
|---|---|---|---|---|
| `hero-product.png` | `ProductPreview.tsx` | 1600 × 1000 (16:10) | PNG, ≤ 400 KB | The hero shot. Show the editor on the left with realistic JS/TS code, output panel on the right with inline values. Keep the title bar empty (the page wraps it in a window chrome). |
| `feature-inline-output.png` *(optional)* | future inline feature card | 800 × 500 | PNG | Close-up of the inline output flow. Reserved for a future deeper feature section. |
| `feature-packages.png` *(optional)* | future inline feature card | 800 × 500 | PNG | Close-up of the package manager dialog. Same future use. |
| `demo.mp4` *(optional)* | future product video | 1600 × 1000 @ 30 fps | MP4 (H.264) | Short loop (10–20 s) of the write → ⌘⏎ → see-output cycle. Currently not embedded; add a `<video>` element to `ProductPreview.tsx` once available. |

After dropping `hero-product.png`, point `ProductPreview.tsx` at it:
```diff
- src="/screenshots/hero-product.svg"
+ src="/screenshots/hero-product.png"
```
(The SVG placeholder can then be deleted.)

## Other top-level assets (in `apps/web/public/`)

| File | Used by | Target dimensions | Format |
|---|---|---|---|
| `favicon.svg` | `<link rel="icon">` in `layout.tsx` | 32 × 32 viewBox | SVG (already shipped — replace if rebranding) |
| `og-image.svg` → swap to `og-image.png` | OG meta tag in `layout.tsx` | 1200 × 630 | PNG ≤ 300 KB. Slack / X / LinkedIn previews need PNG or JPG; SVG is shipped only as a reference design. After exporting to PNG, update `apps/web/src/app/layout.tsx` to reference `/og-image.png`. |

## Capturing the hero shot

For consistency with the in-app design system:
- Run the desktop app in dark mode (default).
- Hide the sidebar (or keep it minimal — 1–2 saved scratchpads visible).
- Pick a code sample that demonstrates inline output, async, and a quick `console.log`.
- Capture at 2× or 3× device pixel ratio, then downscale to 1600 × 1000 for the final PNG.
- Optimise with `pngcrush` / `oxipng` / Squoosh before committing.
