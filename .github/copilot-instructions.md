# Chutes Image UI - GitHub Copilot Instructions

Chutes Image UI is a minimalist Progressive Web App (PWA) for generating and editing images using AI models through the Chutes API. The application runs entirely client-side in the browser - only the API key and generated images are processed.

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
3. Select a model (e.g., "Hidream", "FLUX.1 Dev", etc.)
4. Enter a test prompt: "a beautiful sunset over mountains"
5. Set custom CFG and Steps values, choose a resolution preset
6. Switch to another model - verify user settings are preserved (CFG, Steps, resolution, negative prompt)
7. Verify model-specific parameter ranges update correctly while preserving user values
8. Test "Auto" resolution preset shows model default dimensions

#### Image Edit Mode Testing:
1. Switch to "Image Edit" mode  
2. Upload a test image (any jpg/png)
3. Verify the image appears in the thumbnail
4. Enter an edit prompt: "make it more colorful"
5. Check that "Auto" resolution shows "derive from source" and calculates from uploaded image
6. Verify user settings are preserved when switching between modes
7. Test that CFG and Steps use placeholder defaults when empty

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
│   ├── models.js           # MODEL_CONFIGS and model definitions
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
- `js/models.js`: Contains `MODEL_CONFIGS` with all AI model definitions
- `js/api.js`: API communication functions for quota and image generation
- `js/ui.js`: DOM element references, UI state management, event handlers
- `js/storage.js`: localStorage and IndexedDB operations for persistence
- `js/helpers.js`: Common utility functions (clamp, snap, timestamp, etc.)
- `js/imageUtils.js`: Image processing utilities and resolution presets
- `js/activityLog.js`: Activity log management and display
- `js/modal.js`: Image history modal dialogs
- `js/serviceWorker.js`: Service worker registration and update handling

#### Model Configuration:
Models are defined in `js/models.js` with:
- `name`: Display name
- `endpoint`: API endpoint URL  
- `modelName`: API model parameter (for some models)
- `params`: Parameter definitions with min/max/default values

**Resolution Enums for Specific Models:**
Some models, like Wan2.1 14b, use predefined resolution options instead of free-form width and height inputs. These are defined in the model's `params` object with a `resolutions` array containing objects with `label`, `width`, and `height` properties.

Example for Wan2.1 14b:
```javascript
resolutions: [
  { label: "1024x1024", width: 1024, height: 1024 },
  { label: "1280x720", width: 1280, height: 720 },
  // ... more options
]
```

- **UI Handling:** In `js/ui.js`, when populating the resolution preset dropdown, check if the model has a `resolutions` array. If so, populate the dropdown with the `label` values instead of generating width/height options.
- **API Payload:** In `js/eventListeners.js`, for models with enums, send a `resolution` parameter (e.g., "1024x1024") in the API request instead of separate `width` and `height` fields. Refer to the API schema in `reference/img-models.md` for the exact payload structure.
- **Model Switching:** Ensure that when switching models, the UI updates to reflect whether the new model uses enums or free-form inputs, preserving user settings where possible.

#### Cache Management:
- `update-cache-version.js`: Updates version timestamps in HTML and service worker
- Service worker caches app shell, skips caching Chutes API requests
- Always run cache update before deploying

### Making Changes

#### Adding a New Model:
1. Add model configuration to `MODEL_CONFIGS` in `js/models.js`
2. Reference the API schema from `reference/img-models.md`
3. Test with both default and edge-case parameter values
4. For models like Wan2.1 14b, ensure the UI uses the model's supported resolution enum and sends the correct payload shape (see schema).
5. Verify model switching updates UI controls correctly

#### UI Changes:
1. Modify HTML structure in `index.html` (add new model to model select)
2. Update styles in `app.css`
3. For UI logic changes, edit `js/ui.js` (ensure resolution enum is supported for models like Wan2.1 14b)
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
- Uses Chutes API endpoints for image generation
- API key stored in localStorage
- Supports multiple models: Hidream, Qwen Image, FLUX.1 Dev, JuggernautXL, Chroma, iLustMix, Neta Lumina, Wan2.1 14b
- Wan2.1 14b uses a dedicated endpoint and only supports a fixed set of resolutions (see model schema).
- Image Edit mode uses Qwen Image Edit endpoint specifically

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
- **Model parameters not updating**: Check MODEL_CONFIGS definition in `js/models.js` for the selected model
- **Cache not updating**: Run `node update-cache-version.js` before deployment

### Development Tips:
- Use browser DevTools Network tab to debug API calls
- Check console for service worker registration messages
- Activity log in the UI shows application state changes
- File API requires user gesture for security (actual file selection)

Remember: This is a client-side only application. No server code, no build process, no complex setup required.