# Chutes Image UI - GitHub Copilot Instructions

Chutes Image UI is a minimalist Progressive Web App (PWA) for generating and editing images and videos.
It now also supports Text-to-Speech (TTS) generation.
- **API Payload:** In `js/eventListeners.js`, for models with enums, send a `resolution` parameter in the model's expected format (Wan uses `W*H`, HiDream uses `WxH`) instead of separate `width` and `height` fields. Models with a `sizeParam` (e.g., Hunyuan Image 3) expect a `size` string such as `auto`, `WxH`, or an aspect ratio like `16:9`. Refer to the API schema in `reference/img-models.md` and `reference/vid-models.md` for the exact payload structure.
**Code Principles:** The code should be generic, extendable, and reusable. Avoid hardcoding model names or specific behaviors; use metadata-driven approaches for all model-specific logic.

API payloads: In `js/eventListeners.js`, payload construction is fully metadata-driven for image, image-edit, video, and TTS models:
  - Image models: use `parameterMapping` to map UI fields (cfg, steps) to model parameter names (e.g., `guidance_scale`, `num_inference_steps`).
  - Some image models expose `sizeParam` and `supportsAspectRatio`; build a `size` string when present (e.g., Hunyuan Image 3 accepts `auto`, `WxH`, or `W:H` aspect ratios) instead of width/height.
  - Image Edit models: defined in `EDIT_MODEL_CONFIGS`; use `parameterMapping` plus `imageInput` to indicate single vs multiple images (`image_b64` vs `image_b64s`).
  - Video models: use `includeResolutionIn` and `resolutionFormat` for resolution handling.
  - All models: apply model defaults when UI inputs are empty; include model-specific parameters automatically when building requests to the Chutes API.
  - TTS models: `TTS_MODEL_CONFIGS` defines `params` (with enums/ranges) and optional `audioInput` metadata to request reference audio; the TTS UI renders inputs dynamically and builds the payload accordingly. Returns audio/wav Blobs.

The application runs entirely client-side in the browser — only the API key and generated media are processed.

**ALWAYS reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.**

## Working Effectively

### Bootstrap and Setup
Run these commands to get the application running:
```bash
npm install          # Installs dependencies - takes ~6 seconds
npm run dev         # Starts development server on http://localhost:5173 - starts immediately
```

### Cache Management
Update cache versions before deploying changes:
```bash
node update-cache-version.js    # Updates version numbers for cache busting - takes <1 second
npm run deploy-prep            # Runs cache update and shows deployment message - takes <1 second
```

### Development Server
- Use `npm run dev` to start the local development server
- Server runs on http://localhost:5173
- No build step required - serves static files directly
- Server starts immediately (no timeout needed)

## Validation

### Manual Testing Requirements
**ALWAYS run complete end-to-end scenarios after making changes:**

#### Text-to-Image Mode Testing:
1. Navigate to http://localhost:5173
2. Switch to "Text to Image" mode
3. Select a model (e.g., "FLUX.1 Dev", etc.)
4. Enter a test prompt: "a beautiful sunset over mountains"
5. Set custom CFG and Steps values, choose a resolution preset
6. Switch to HiDream model - verify the warning message appears about dimension swapping
7. Verify HiDream shows resolution enum options (1024×1024, 768×1360, etc.) instead of free width/height
8. Switch to another model - verify user settings are preserved (CFG, Steps, resolution, negative prompt) and message disappears
9. Verify model-specific parameter ranges update correctly while preserving user values
10. Test "Auto" resolution preset shows model default dimensions
11. Switch to Hunyuan Image 3 - confirm pixel presets appear along with a "Custom aspect ratio" option; select it, enter `16:9`, and verify width/height inputs disable while the payload uses the aspect ratio. Switch back to another preset and ensure the aspect ratio field hides again.

#### Image Edit Mode Testing:
1. Switch to "Image Edit" mode
2. Verify a Model dropdown is visible with options: "Qwen Image Edit" and "Qwen Image Edit 2509"
3. Select Qwen Image Edit: upload one image via the custom "Upload image(s)" button; verify multi-upload hint is hidden; Auto resolution shows derive-from-source; Generate works
4. Switch to Qwen Image Edit 2509:
  - Upload multiple images (2–3) or drag-and-drop several at once; verify thumbnails show all images with order badges (1..N)
  - Add more images again; confirm they append instead of replacing (up to model max)
  - Reorder via ☰ drag handle (desktop) or long-press on touch; or use ▲/▼ buttons; Auto uses the first for dimensions and updates on reorder
  - Delete a specific image with ✕ and verify numbering/Auto dims update
  - Clear all with the Clear button
  - Generate works and preserves the current order in `image_b64s`
5. History: entries for multi-image edits should save all source images; in the modal, "Download Sources" triggers downloads for each source
6. Switching back from 2509 to Qwen Image Edit should keep only the first source image
7. Sending an image from history to Image Edit should still load it as the single source; switching models preserves the uploaded image(s) per capability
#### Video Generation Mode Testing:
1. Switch to "Video Generation" mode
2. Choose a video model: "Wan2.1 14b Video"
3. Toggle sub-mode:
  - Text to Video: enter a prompt
  - Image to Video: upload a source image and enter a prompt
4. Resolution presets:
  - Defaults reflect model enums (Wan uses "W*H")
  - For Wan Image-to-Video specifically, resolution is not applicable and the control is hidden
5. Set/leave FPS, Frames, Steps, CFG; empty fields use model placeholders/defaults
6. Generate and verify:
  - Result panel shows a playable video
  - Download button saves .mp4; Copy copies URL
  - "Send to Image Edit" is hidden for videos
7. Generation History:
  - New entries appear as videos with first-frame thumbnails
  - Modal opens as "Video Preview" with a playable element and "Download Video"
#### TTS Mode Testing:
1. Switch to "Text to Speech" mode
2. Verify a Model dropdown is visible with options: Kokoro, CSM 1B
3. Enter sample text: "Hello from Chutes TTS"
4. For Kokoro: pick a voice from the enum and adjust speed; Generate and play audio

6. For Cosy Voice: upload required prompt audio and provide matching prompt text; Generate
7. For CSM 1B: test speaker values 0 or 1 and max duration; Generate
8. History shows 🗣️ badge, filter by TTS, modal opens as "Audio Preview" with download
1. Switch to "Image Edit" mode  
2. Upload a test image (any jpg/png)
3. Verify the image appears in the thumbnail
4. Enter an edit prompt: "make it more colorful"
5. Check that "Auto" resolution shows "derive from source" and calculates from uploaded image
6. Verify user settings are preserved when switching between modes
7. Test that CFG and Steps use placeholder defaults when empty
8. From the Result panel, click "Send to Image Edit" and verify the generated image appears as the source thumbnail and Auto resolution computes from it
9. From Image History, open an image modal and click "Send to Image Edit"; verify the same behavior

#### Cache System Testing:
1. Run `node update-cache-version.js`
2. Refresh browser and check Network tab in DevTools
3. Verify CSS and JS files show `200` status (fresh fetch) instead of `304` (cached)
4. Check console for service worker registration messages

### Browser Testing
- Test in Chrome/Edge (primary target)
- Verify PWA functionality works (service worker registration)
- Check responsive layout on desktop and mobile viewports
- Validate that the app works offline for cached resources

## Common Tasks

### File Structure Reference
```
/
├── index.html              # Main HTML file with UI structure
├── app.css                 # All styles and responsive layout
├── service-worker.js       # PWA caching logic
├── manifest.webmanifest    # PWA manifest
├── update-cache-version.js # Cache busting utility
├── package.json            # Dependencies and scripts
├── README.md               # User documentation
├── CACHE-BUSTING.md        # Cache management details
├── js/                     # Modular JavaScript files
│   ├── main.js             # Entry point, coordinates all modules
│   ├── models.js           # MODEL_CONFIGS and VIDEO_MODEL_CONFIGS definitions
│   ├── tts configs in models.js as TTS_MODEL_CONFIGS
│   ├── api.js              # API communication (quota, generate, etc.)
│   ├── storage.js          # localStorage/IndexedDB operations
│   ├── ui.js               # UI state management and DOM manipulation
│   ├── helpers.js          # Common utility functions
│   ├── imageUtils.js       # Image manipulation and processing
│   ├── activityLog.js      # Activity log functionality
│   ├── serviceWorker.js    # Service worker registration logic
│   └── modal.js            # Modal dialog functionality
├── reference/              
│   └── img-models.md       # API schemas for all models
├── icons/                  # PWA icon files
└── favicon files
```

### Key Files to Understand

#### Modular Architecture:
- `js/main.js`: Entry point that imports and coordinates all modules
- `js/models.js`: Contains `MODEL_CONFIGS`, `EDIT_MODEL_CONFIGS`, and `VIDEO_MODEL_CONFIGS` with model definitions
- `js/api.js`: API communication functions for quota and image generation
- `js/ui.js`: DOM element references, UI state management, event handlers
- `js/storage.js`: localStorage and IndexedDB operations for persistence
- `js/helpers.js`: Common utility functions (clamp, snap, timestamp, etc.)
- `js/imageUtils.js`: Image processing utilities and resolution presets
- `js/activityLog.js`: Activity log management and display
- `js/modal.js`: Image history modal dialogs
- `js/serviceWorker.js`: Service worker registration and update handling

#### Model Configuration:
Image/text models are defined in `js/models.js` with:
- `name`: Display name
- `endpoint`: API endpoint URL  
- `modelName`: API model parameter (for some models)
- `params`: Parameter definitions with min/max/default values
- **Metadata for payload construction:**
  - `payloadFormat`: Request body shape (currently `flat` for all models)
  - `parameterMapping`: Maps UI concepts to model-specific parameter names (e.g., `cfgScale: 'guidance_scale'`)
  - `resolutionFormat`: For models with resolution enums, format string (`'star'` for W*H, `'x'` for WxH)
  - `sizeParam`: When present, send a `size` string instead of width/height; combine with `supportsAspectRatio` to enable aspect ratio inputs (e.g., Hunyuan Image 3)
  - `includeResolutionIn`: For video models, which sub-modes include resolution
  - TTS: `TTS_MODEL_CONFIGS` includes `params` (with types: enum, ranges, required) and optional `audioInput` { type, field, label, required }

**Resolution enums for specific models:**
Some models (e.g., Wan2.1 14b image/video, HiDream) use predefined resolution options instead of free-form width/height. These are defined under `params.resolution.options` as strings in the format the model expects (Wan: `W*H`, HiDream: `WxH`).

Example for Wan2.1 14b image:
```javascript
params: {
  resolution: {
    options: ["1280*720", "720*1280", "832*480", "480*832", "1024*1024"],
    default: "832*480"
  },
  // ... other params
}
```

Example for HiDream (with model message):
```javascript
'hidream': {
  name: 'HiDream',
  endpoint: 'https://chutes-hidream.chutes.ai/generate',
  resolutionFormat: 'x', // uses WxH format
  message: {
    type: 'warning',
    text: '⚠️ Note: Width and height dimensions for most resolutions are currently swapped due to a bug on Chutes server side.'
  },
  params: {
    resolution: {
      options: ['1024x1024', '768x1360', '1360x768', '880x1168', '1168x880', '1248x832', '832x1248'],
      default: '1024x1024'
    },
    // ... other params
  }
}
```

- **UI Handling:** In `js/ui.js`, when populating the resolution preset dropdown, check if the model has `params.resolution.options`. Populate the dropdown with those option strings; for display, convert separators to `×` (e.g., `832*480` → `832 × 480`). Models with `supportsAspectRatio` should show the custom aspect ratio input when the `custom-aspect` option is selected and hide it otherwise.
- **API Payload:** In `js/eventListeners.js`, for models with enums, send a `resolution` parameter in the model’s expected format (Wan uses `W*H`). For models with `sizeParam`, build and send the `size` string (e.g., `auto`, `1024x768`, `16:9`) instead of separate `width` and `height` fields. Refer to the API schema in `reference/img-models.md` and `reference/vid-models.md` for the exact payload structure.
- **Model Switching:** Ensure that when switching models, the UI updates to reflect whether the new model uses enums or free-form inputs, preserving user settings where possible.

#### Cache Management:
- `update-cache-version.js`: Updates version timestamps in HTML and service worker
- Service worker caches app shell, skips caching Chutes API requests
- Always run cache update before deploying

### Making Changes

#### Adding a New Model:
1. Add model configuration to `MODEL_CONFIGS` in `js/models.js`
2. Include metadata for payload construction:
   - `payloadFormat`: currently `'flat'` for all models
   - `parameterMapping`: map UI concepts to model param names (e.g., `cfgScale: 'guidance_scale'`, `steps: 'num_inference_steps'`)
   - `resolutionFormat`: if model uses resolution enums, specify `'star'` or `'x'`
  - `sizeParam`/`supportsAspectRatio`: when present, build size strings (`auto`, `WxH`, `W:H`) instead of width/height and show the aspect ratio control
   - `message`: optional model-specific warning/info message: `{ type: 'warning'/'info', text: 'Message content' }`
3. Reference the API schema from `reference/img-models.md`
4. Test with both default and edge-case parameter values
5. Verify model switching updates UI controls correctly and payload uses correct parameter names

#### Adding a New Image Edit Model:
1. Add a new entry to `EDIT_MODEL_CONFIGS` with:
  - `endpoint`
  - `params` including `width`, `height`, `true_cfg_scale`/`guidance_scale`, `num_inference_steps`, `seed`, `negative_prompt`
  - `parameterMapping` to map UI `cfgScale` and `steps`
  - `imageInput`: `{ type: 'single'|'multiple', field: 'image_b64'|'image_b64s', maxItems }`
2. The UI will automatically enable multiple file selection and show a hint when `type==='multiple'`.
3. The request payload will include `image_b64` or `image_b64s` accordingly and apply model defaults.
4. History will store one or many source images and allow downloading all sources from the modal.
#### Adding a New Video Model:
1. Add an entry to `VIDEO_MODEL_CONFIGS` with:
  - `endpoints` for `text2video` and `image2video`
  - `params` including any of: `resolution`, `guidance_scale`, `steps`, `fps`, `frames`, `seed`, `sample_shift`, `negative_prompt`
  - Metadata: `payloadFormat` (currently `flat`), `resolutionFormat` (`'star'` or `'x'`), and `includeResolutionIn` (e.g., `['text2video']` for Wan)
2. The UI will automatically populate resolution presets from `params.resolution.options` and hide resolution controls in modes not listed in `includeResolutionIn`.
3. The request payload will be built automatically in `js/eventListeners.js` using the metadata and defaults.
#### Adding a New TTS Model:
1. Add an entry to `TTS_MODEL_CONFIGS` with:
  - `endpoint`
  - `params` with `text` plus optional numeric ranges and enums
  - Optional `audioInput`: `{ type: 'single', field: 'sample_audio_b64'|'prompt_audio_b64', label, required? }`
2. The TTS UI will automatically render controls and handle audio uploads as needed.
3. The request payload will include provided params and audio fields; empty optional params use model defaults.
4. History will save audio as type `tts` with 🗣️ badge and filter support.

#### UI Changes:
1. Modify HTML structure in `index.html` (add new model to model select)
2. Update styles in `app.css`
3. For UI logic changes, edit `js/ui.js` (ensure resolution enum is supported for models like Wan2.1 14b)
  - Models with `supportsAspectRatio` must toggle the aspect ratio input when `custom-aspect` is selected.
4. Test responsive layout at different screen sizes
5. Validate PWA functionality still works

#### API Changes:
1. Update endpoint URLs or parameters in `js/models.js`
2. Modify API functions in `js/api.js` if needed
3. Validate against schemas in `reference/img-models.md`
4. Test with actual API calls (requires valid API key)
4. Check error handling for failed requests

## Deployment

### Pre-deployment Checklist:
1. Run `npm run deploy-prep` to update cache versions
2. Test the complete user workflow manually
3. Verify service worker updates correctly
4. Check that all static files are included

### Hosting Requirements:
- Static file hosting (GitHub Pages, Netlify, etc.)
- HTTPS required for PWA features
- No server-side processing needed
- Optional: Configure cache headers for optimal performance

## Technical Notes

### API Integration:
- Uses Chutes API endpoints for image and video generation
- API key stored in localStorage
- Image models: Hunyuan Image 3, Qwen Image, HiDream, FLUX.1 Dev, JuggernautXL, Chroma, iLustMix, Neta Lumina, Wan2.1 14b (image), Nova Anime3d Xl, Illustrij, Orphic Lora, Animij, HassakuXL, Nova Cartoon Xl
- Image Edit models: Qwen Image Edit, Qwen Image Edit 2509 (multi-image)
- Video models: Wan2.1 14b Video
- TTS models: Kokoro, CSM 1B
- Wan2.1 14b Image/Video use dedicated endpoints and fixed resolution enums (see schema).
- Image Edit mode uses image-edit model endpoints from `EDIT_MODEL_CONFIGS`
 - Video mode specifics:
  - Wan2.1 14b Video: text2video expects flat JSON with `resolution` in "W*H" form; image2video expects the same but without `resolution`. Optional: `sample_shift`.


### PWA Features:
- Service worker for offline app shell caching
- Web app manifest for installation
- Responsive design for mobile/desktop
- Local storage for API key persistence

### No Build Process:
- Pure vanilla JavaScript ES modules, HTML, CSS
- No bundling or compilation required
- Direct file serving via `serve` package
- Cache busting via query parameters
- Modular architecture using ES6 imports/exports

### Browser Compatibility:
- Modern browsers with ES6+ module support
- Service Worker API support
- File API for image uploads
- LocalStorage for settings

## Troubleshooting

### Common Issues:
- **API key required**: Enter valid Chutes API key in the API Key section
- **CORS errors**: Chutes API endpoints are properly configured for browser requests
- **Image upload failures**: Verify file is a valid image format (jpg, png, etc.)
- **Model parameters not updating**: Check MODEL_CONFIGS / VIDEO_MODEL_CONFIGS definition in `js/models.js` for the selected model
- **Cache not updating**: Run `node update-cache-version.js` before deployment
 - **Wan i2v resolution**: If resolution appears for Wan image-to-video, ensure the UI toggle hides the resolution preset and that payload omits `resolution`.

## Video-specific Implementation Notes

### UI
- `index.html` contains a Video Generation mode and a sub-mode toggle (Text↔Image)
- `js/ui.js`:
  - `switchMode('video-generation')` filters models to VIDEO_MODEL_CONFIGS and disables manual width/height
  - `updateParametersForVideoGeneration()` populates resolution presets from model enums
  - `updateVideoModeUI()` hides resolution controls based on model metadata (`includeResolutionIn`) so resolution is omitted where not applicable (e.g., Wan image-to-video)

### Models
- `VIDEO_MODEL_CONFIGS` in `js/models.js` defines endpoints, parameter limits, and behavior metadata for video models
  - `payloadFormat`: request body shape (currently `flat` top-level JSON)
  - `resolutionFormat`: `'star'` for `W*H` (Wan)
  - `includeResolutionIn`: which sub-modes include a `resolution` field (e.g., `['text2video']` for Wan)

### API
- `js/api.js` has `generateVideo(endpoint, apiKey, body)` that posts flat JSON and returns an mp4 `Blob`.
- `js/eventListeners.js` builds video payloads using model metadata (no hard-coded model checks):
  - Includes or omits `resolution` based on `includeResolutionIn`
  - Formats the resolution string according to `resolutionFormat`
  - Applies model defaults when UI inputs are empty; includes `image_b64` for image-to-video

### History & Modal
- `js/imageHistory.js`: saves videos with type `video`; grid uses first-frame thumbnails; selection/bulk delete works for mixed media
- `js/modal.js`: Detects `type==='video'`, switches to Video Preview, hides Send to Edit, and downloads as .mp4

### Development Tips:
- Use browser DevTools Network tab to debug API calls
- Check console for service worker registration messages
- Activity log in the UI shows application state changes
- File API requires user gesture for security (actual file selection)

Remember: This is a client-side only application. No server code, no build process, no complex setup required.