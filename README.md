# Chutes Image UI

A minimalist, vibecoded Progressive Web App for generating and editing images and videos with Chutes. Runs fully client-side in your browser; only your selected source media or prompt is sent to Chutes, and your API key is stored in localStorage.

## Features
- Clean single-page UI; desktop two-column layout (Input | Result)
- Supports three modes: Image Edit, Text-to-Image, and Video Generation (Text-to-Video / Image-to-Video)
- New: Text-to-Speech (TTS) mode with multiple models
- Model selector for Text-to-Image, Image Edit, and Video Generation (e.g., Hunyuan Image 3, Qwen Image, HiDream, FLUX.1 Dev, JuggernautXL, Chroma, iLustMix, Neta Lumina, Wan2.1 14b, Nova Anime3d Xl, Illustrij, Orphic Lora, Animij, HassakuXL, Nova Cartoon Xl; Qwen Image Edit 2509; Wan2.1 14b Video)
- Smart parameter management:
  - Auto resolution preset; empty fields use model defaults; settings preserved when switching models
  - Models with fixed resolution enums (e.g., Wan2.1 14b image and video, HiDream) handled via dropdown
  - In Video mode, width/height are reflected from the preset and kept read-only
  - For Wan Video Image-to-Video, resolution is not applicable and the UI hides it automatically
  - Hunyuan Image 3 supports pixel presets, custom dimensions, and a custom aspect ratio option that sends the model's `size` string (e.g., `auto`, `1024x768`, `16:9`)
- Model-specific messaging system: Important notices and warnings display automatically (e.g., HiDream dimension swap warning)
- Generation History: Automatically saves generated images and videos with metadata
  - Now also saves audio from TTS and shows 🗣️ badges
  - Collapsible Activity Log
  - Grid view with model and settings preview; videos show a captured first-frame thumbnail
  - Modal preview: images show full-size; videos play inline with controls
  - Settings restoration for images; bulk select/delete; smart storage (keeps last 50)
- Quota counter: Displays remaining quota and usage
- Experimental PWA: installable, offline app-shell cache
- Activity log for quick debugging and status
- Download/copy output (video download, image copy to clipboard)
- Pure static files (no server code)

### Enhanced multi-image selection (Qwen Image Edit 2509)
- Custom upload toolbar (no native "X files selected" text)
- Clear button to remove all sources
- Numbered thumbnails showing order (1..N) — order is preserved and sent to the API
- Reordering support:
  - Desktop: drag via the ☰ handle, or use ▲/▼ on each thumbnail
  - Touch: long-press the handle to start drag with a floating ghost
- Per-image delete (✕ on each thumbnail)
- Additive uploads: selecting or dropping more files appends to the list (respects model max)
- Multi-file drag-and-drop supported
- Auto resolution derives from the first image and updates when you reorder

## Configure
- Chutes API key is stored in `localStorage['chutes_api_key']`.
- Quota usage endpoint: `GET https://api.chutes.ai/users/me/quota_usage/me`
- API endpoints:
  - Text-to-Image: `POST https://image.chutes.ai/generate` with `model` parameter
    - Image Edit:\n\n    - Qwen Image Edit 2509: `POST https://chutes-qwen-image-edit-2509.chutes.ai/generate`
  - HiDream: `POST https://chutes-hidream.chutes.ai/generate` (uses `resolution` enum, not width/height)
  - Hunyuan Image 3: `POST https://chutes-hunyuan-image-3.chutes.ai/generate` (accepts a `size` string for resolution or aspect ratio)
  - Wan2.1 14b (Image): `POST https://chutes-wan2-1-14b.chutes.ai/text2image` (uses `resolution` enum, not width/height)
  - Wan2.1 14b Video:
    - Text-to-Video: `POST https://chutes-wan2-1-14b.chutes.ai/text2video`
    - Image-to-Video: `POST https://chutes-wan2-1-14b.chutes.ai/image2video`

  - Text-to-Speech:
    - Kokoro: `POST https://chutes-kokoro.chutes.ai/speak`

    - CSM 1B: `POST https://chutes-csm-1b.chutes.ai/speak`
- Request body (flat):
  - Image Edit:
    - Qwen Image Edit 2509: `width`, `height`, `prompt`, `image_b64s` (array, 1–3), `true_cfg_scale`, `num_inference_steps` (default 40), optionally `negative_prompt`, `seed`.
  - **Send to Image Edit**: One-click button on result and in modal to use an image as the source for Image Edit
  - Text-to-Image: `width`, `height`, `prompt`, `guidance_scale`, `num_inference_steps`, optionally `negative_prompt`, `seed`, `model`.
  - HiDream: `prompt`, `resolution` (e.g. "1024x1024"), `guidance_scale`, `num_inference_steps`, optionally `seed`.
  - Hunyuan Image 3: `prompt`, `size` ("auto", `WxH` like `1280x768`, or aspect ratio like `16:9`), optional `seed`, optional `steps` (default 50).
  - Wan2.1 14b (Image): `prompt`, `resolution` (e.g. "832*480"), `guidance_scale`, `sample_shift`, `seed`, `negative_prompt`.
  - Video (flat JSON, returns mp4 Blob):
  - Wan2.1 14b Video – Text-to-Video: `prompt`, `resolution` (e.g. "832*480"), `guidance_scale`, `steps`, `fps`, `frames`, `seed`, optional `sample_shift`, optional `negative_prompt`.
    - Wan2.1 14b Video – Image-to-Video: same fields as above but without `resolution`; include `image_b64` for the source image.




  - TTS (flat JSON, returns audio/wav Blob):
    - Kokoro: `text` (required), optional `speed`, `voice` enum

    - CSM 1B: `text` (required), optional `speaker`, `max_duration_ms`; advanced `context` omitted from UI

Notes:
- Resolution strings are model-specific: Wan uses `W*H`, HiDream uses `WxH`, and Hunyuan Image 3 uses a `size` string that accepts `auto`, `WxH`, or aspect ratios like `16:9`. The app formats and includes/omits these fields automatically based on each model's metadata.
- Parameter names vary by model: some use `guidance_scale`, others use `true_cfg_scale`. The app maps UI inputs to correct parameter names using each model's `parameterMapping` metadata.
- Some models display contextual warnings or notices (e.g., HiDream shows a dimension swap warning due to a server-side bug).

## Usage
- Use online: https://magicgoddess.github.io/chutes-img-ui
- Or serve locally from the project root:
  - `npm run dev`
  - Open `http://localhost:5173`
- Paste your API key, select a mode, write a prompt, and Generate.
- Image Edit tips (Qwen Image Edit 2509):
  - Use "Upload image(s)" to add sources; use "Clear" to remove all
  - Drag the ☰ handle (or long-press on touch) to reorder; use ✕ to remove
  - Auto resolution uses the first image; reorder to change the base dims
- For Video Generation:
  - Pick a video model (Wan 2.1 14b Video)
  - Choose sub-mode: Text-to-Video or Image-to-Video (upload a source image for i2v)
  - Use presets for resolution (Auto reflects model defaults; for Wan i2v, resolution is hidden)
  - Adjust FPS/Frames/Steps/CFG as needed and Generate

## Generation History System

The app automatically saves every generated image and video with complete metadata to your browser (IndexedDB + localStorage snapshot).

### Features
- **Automatic Saving**: Every generated image/video is saved with settings, timestamp, and source image (for edits/i2v)
- **Visual Grid**: Browse all content in a responsive gallery with model and date information; videos display a first-frame thumbnail
- **One-Click Restore**: Click any image to load its exact settings into the generation form (video settings restoration is not yet supported)
- **Full Preview Modal**: View images full-size; videos play inline with controls and "Download Video"
- **Bulk Management**: Select multiple images for batch operations
- **Smart Storage**: Automatically manages storage by keeping the latest 50 images

### Modal Actions
When viewing content in full-screen mode:
- Images:
  - **📥 Download Image**: Save the generated image to your device
  - **📥 Download Source**: Save the original source image (for image edits only)
  - **⚙️ Load Settings**: Restore all generation settings to create variations
  - **🗑️ Delete**: Permanently remove the image from history
- Videos:
  - **📥 Download Video**: Save the generated video (.mp4)
  - "Send to Image Edit" is not shown for videos
- TTS:
  - **📥 Download Audio**: Save the generated audio (.wav)
  - "Send to Image Edit" is not shown for TTS

### Privacy & Storage
- All images/videos and settings are stored locally in your browser
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
- [Video Models Documentation](./reference/vid-models.md)
- Wan2.1 14b schema: see `reference/img-models.md` for details on supported resolutions and parameters.


## Credits
Audio notification: "completed.ogg" (original filename: "powerUp2.ogg") by Kenny (https://kenney.nl/), used under CC0.
Error notification: "error.ogg" (original filename: "pepSound1.ogg") by Kenny (https://kenney.nl/), used under CC0.
