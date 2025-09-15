# Chutes Image UI

A minimalist, vibecoded Progressive Web App for generating and editing images with Chutes. Runs fully client-side in your browser; only your selected source image or prompt is sent to Chutes, and your API key is stored in localStorage.

## Features
- Clean single-page UI; desktop two-column layout (Input | Result)
- Supports two modes: Image Edit and Text-to-Image generation
- Model selector for Text-to-Image with multiple models (e.g., Hidream, JuggernautXL, Chroma)
- Quota counter: Displays remaining quota as a percentage and usage details
- Experimental PWA: installable, offline app-shell cache
- Activity log for quick debugging and status
- Copies output to clipboard and allows download
- No server code; pure static files
- **Generated Image History**: Save and manage all your generated images locally with advanced features:
  - **Collapsible Sections**: Activity log and image history can be collapsed, state saved to localStorage
  - **Image Grid**: Visual gallery of all generated images with responsive design
  - **Image Modal**: Click any image to preview with action buttons:
    - Download generated image
    - Download source image (for image edit mode)
    - Load settings back into the form
    - Delete image permanently
  - **Bulk Operations**: Toggle selection mode to:
    - Select/deselect individual images with checkboxes
    - Select all or deselect all images at once
    - Delete multiple images at once
  - **Automatic Saving**: All generated images and their settings are automatically saved
  - **Storage Management**: Automatically limits to 100 images to prevent storage overflow
  - **Persistent Storage**: Uses localStorage to keep your image history between sessions

## Configure
- Chutes API key is stored in `localStorage['chutes_api_key']`.
- Quota usage endpoint: `GET https://api.chutes.ai/users/me/quota_usage/me`
- API endpoints:
  - Image Edit: `POST https://chutes-qwen-image-edit.chutes.ai/generate`
  - Text-to-Image: `POST https://image.chutes.ai/generate` with `model` parameter
- Request body (flat):
  - Image Edit: `width`, `height`, `prompt`, `image_b64`, `true_cfg_scale`, `num_inference_steps`, optionally `negative_prompt`, `seed`.
  - Text-to-Image: `width`, `height`, `prompt`, `guidance_scale`, `num_inference_steps`, optionally `negative_prompt`, `seed`, `model`.

## Usage
- Use online: https://magicgoddess.github.io/chutes-img-ui
- Or serve locally from the project root:
  - `npm run dev`
  - Open `http://localhost:5173`
- Paste your API key, select a mode, write a prompt, and Generate.
- Generated images are automatically saved to your browser history for later access.
- Click the collapse arrows (▼) to hide/show the Activity Log or Generated Images sections.
- Click any generated image to open a modal with download, settings, and delete options.
- Use the "☑️ Select" button to enable bulk operations on multiple images.

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
- `app.js` — client logic and Chutes calls
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
