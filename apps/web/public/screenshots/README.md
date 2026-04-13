# Landing-page assets

The hero now uses a fully-interactive in-page replica of the desktop app
(`apps/web/src/components/preview/InteractivePreview.tsx`), so no hero
screenshot is required. This directory is reserved for any future
asset-backed sections.

## Currently shipped (in `apps/web/public/`)

| File | Used by | Format | Notes |
|---|---|---|---|
| `favicon.svg` | `<link rel="icon">` in `layout.tsx` | SVG | Replace if rebranding. |
| `og-image.svg` | OG meta tag in `layout.tsx` | SVG | Slack / X / LinkedIn previews work better with PNG. Export the SVG to `og-image.png` (1200 × 630) before deploy and update `layout.tsx` to point at the PNG. |

## Capture guide (for future screenshots)

When you do want a real screenshot for any future section:
- Run the desktop app in dark mode (default).
- Hide the sidebar (or keep it minimal — 1–2 saved scratchpads visible).
- Pick a sample that demonstrates inline output, async, and a quick `console.log`.
- Capture at 2× or 3× device pixel ratio, then downscale to 1600 × 1000 PNG.
- Optimise with `pngcrush` / `oxipng` / Squoosh before committing.
