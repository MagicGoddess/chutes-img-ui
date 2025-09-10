# Chutes × Qwen Image Edit (PWA)

A minimalist, vibecoded Progressive Web App for editing images with Qwen Image Edit on Chutes. Runs fully client-side in your browser; only your selected source image is sent to Chutes and your API key is stored in localStorage.

## Features
- Clean single-page UI; desktop two-column layout (Input | Result)
- PWA: installable, offline app-shell cache
- Activity log for quick debugging and status
- Copies output to clipboard and allows download
- No server code; pure static files

## Configure
- Chutes API key is stored in `localStorage['chutes_api_key']`.
- API endpoint: `POST https://chutes-qwen-image-edit.chutes.ai/generate`
- Request body (flat): `width`, `height`, `prompt`, `image_b64`, `true_cfg_scale`, `num_inference_steps`, optionally `negative_prompt`, `seed`.

## Usage
- Use online: https://magicgoddess.github.io/chutes-img-ui
- Or serve locally from the project root:
  - `npx serve` or python3 -m http.server 5173`
  - Open `http://localhost:5173`
- Paste your API key, select an image, write a prompt, and Generate.

## Files
- `index.html` — markup only
- `app.css` — styles
- `app.js` — client logic and Chutes calls
- `manifest.webmanifest` — PWA manifest
- `service-worker.js` — app-shell caching (skips caching any `*.chutes.ai` request)

## Notes
- Width/height snap to multiples of 64 in [128, 2048].
- Optional fields are omitted from the payload when empty.
- The app is intentionally vibecoded: compact, pragmatic, and focused on getting you from prompt to pixels fast.

## Disclaimer
This project is community-built and not affiliated with Chutes.
