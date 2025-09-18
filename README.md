# Chutes Image UI

A minimalist, vibecoded Progressive Web App for generating and editing images with Chutes. Runs fully client-side in your browser; only your selected source image or prompt is sent to Chutes, and your API key is stored in localStorage.

## Features
- Clean single-page UI; desktop two-column layout (Input | Result)
- Supports two modes: Image Edit and Text-to-Image generation
- Model selector for Text-to-Image with multiple models (e.g., Hidream, JuggernautXL, Chroma, Wan2.1 14b)
- **Smart Parameter Management**: Auto resolution preset, empty fields use model defaults, settings preserved when switching models. Models like Wan2.1 14b use a fixed set of supported resolutions.
- **Image History**: Automatically saves generated images with full metadata
  - **Collapsible Activity Log**: Clean, space-saving interface (collapsed by default)
  - **Grid View**: Visual gallery of all generated images with model and settings preview
  - **Modal Preview**: Full-size image viewer with metadata display
  - **Settings Restoration**: Click any image to restore its exact generation settings
  - **Bulk Operations**: Select multiple images for batch deletion
  - **Smart Storage**: Keeps last 50 images, includes source images for edits
- Quota counter: Displays remaining quota as a percentage and usage details
- Experimental PWA: installable, offline app-shell cache
- Activity log for quick debugging and status
- Copies output to clipboard and allows download
- No server code; pure static files

## Configure
- Chutes API key is stored in `localStorage['chutes_api_key']`.
- Quota usage endpoint: `GET https://api.chutes.ai/users/me/quota_usage/me`
- API endpoints:
  - Image Edit: `POST https://chutes-qwen-image-edit.chutes.ai/generate`
  - Text-to-Image: `POST https://image.chutes.ai/generate` with `model` parameter
  - Wan2.1 14b: `POST https://chutes-wan2-1-14b.chutes.ai/text2image` (uses `resolution` enum, not width/height)
- Request body (flat):
  - Image Edit: `width`, `height`, `prompt`, `image_b64`, `true_cfg_scale`, `num_inference_steps`, optionally `negative_prompt`, `seed`.
  - Text-to-Image: `width`, `height`, `prompt`, `guidance_scale`, `num_inference_steps`, optionally `negative_prompt`, `seed`, `model`.
  - Wan2.1 14b: `prompt`, `resolution` (e.g. "832*480"), `guidance_scale`, `sample_shift`, `seed`, `negative_prompt` (see model schema for details).

## Usage
- Use online: https://magicgoddess.github.io/chutes-img-ui
- Or serve locally from the project root:
  - `npm run dev`
  - Open `http://localhost:5173`
- Paste your API key, select a mode, write a prompt, and Generate.

## Image History System

The app automatically saves every generated image with complete metadata to your browser's localStorage:

### Features
- **Automatic Saving**: Every generated image is saved with settings, timestamp, and source image (for edits)
- **Visual Grid**: Browse all images in a responsive gallery with model and date information
- **One-Click Restore**: Click any image to load its exact settings into the generation form
- **Full Preview Modal**: View images at full size with complete metadata
- **Bulk Management**: Select multiple images for batch operations
- **Smart Storage**: Automatically manages storage by keeping the latest 50 images

### Modal Actions
When viewing an image in full-screen mode:
- **📥 Download Image**: Save the generated image to your device
- **📥 Download Source**: Save the original source image (for image edits only)
- **⚙️ Load Settings**: Restore all generation settings to create variations
- **🗑️ Delete**: Permanently remove the image from history

### Privacy & Storage
- All images and settings are stored locally in your browser
- No data is sent to external servers except during generation
- Clear history anytime with the "Clear All" button
- Data persists across browser sessions

## Development & Deployment

### Cache Busting
To ensure users always get the latest version after updates:

```bash
# Update version numbers before deploying
node update-cache-version.js
```

This automatically updates cache versions in the service worker and adds version parameters to CSS/JS files, preventing browser caching issues.

See `CACHE-BUSTING.md` for detailed information about the cache management system.

## Files
- `index.html` — markup only
- `app.css` — styles
- `js/` — modular JavaScript files (main.js, models.js, ui.js, api.js, etc.)
- `manifest.webmanifest` — PWA manifest
- `service-worker.js` — app-shell caching (skips caching any `*.chutes.ai` request)

## Notes
- Width/height snap to multiples of 64 in [128, 2048].
- Optional fields are omitted from the payload when empty.
- The app is intentionally vibecoded: compact, pragmatic, and focused on getting you from prompt to pixels fast.

## Disclaimer
This project is community-built and not affiliated with Chutes.

## References
- [Image Models Documentation](./reference/img-models.md)
- Wan2.1 14b schema: see `reference/img-models.md` for details on supported resolutions and parameters.


## Credits
Audio notification: "completed.ogg" (original filename: "powerUp2.ogg") by Kenny (https://kenney.nl/), used under CC0.
