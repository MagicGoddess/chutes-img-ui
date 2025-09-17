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
5. Verify all controls work: resolution presets, sliders, seed input
6. Check that model-specific parameters update correctly (ranges and defaults)

#### Image Edit Mode Testing:
1. Switch to "Image Edit" mode  
2. Upload a test image (any jpg/png)
3. Verify the image appears in the thumbnail
4. Enter an edit prompt: "make it more colorful"
5. Check that resolution auto-derives from source image
6. Verify all controls are appropriate for Qwen Image Edit model

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
├── js/                     # Modular JavaScript files
│   ├── main.js             # Entry point, wires everything together
│   ├── serviceWorker.js    # Service Worker registration logic
│   ├── ui.js               # UI event listeners and DOM updates
│   ├── api.js              # API calls (quota, generate, etc.)
│   ├── models.js           # MODEL_CONFIGS and model helpers
│   ├── storage.js          # localStorage/IndexedDB logic (image history)
│   ├── imageUtils.js       # Image/file manipulation helpers
│   ├── modal.js            # Modal dialog logic
│   ├── activityLog.js      # Activity log helpers
│   └── helpers.js          # Common utility functions
├── app.css                 # All styles and responsive layout
├── service-worker.js       # PWA caching logic
├── manifest.webmanifest    # PWA manifest
├── update-cache-version.js # Cache busting utility
├── package.json            # Dependencies and scripts
├── README.md               # User documentation
├── CACHE-BUSTING.md        # Cache management details
├── reference/              
│   └── img-models.md       # API schemas for all models
├── icons/                  # PWA icon files
├── app.js.backup           # Original monolithic file (backup)
└── favicon files
```

### Key Files to Understand

#### JavaScript Module Structure:
- `js/main.js`: Entry point that imports and wires all modules together
- `js/models.js`: MODEL_CONFIGS definitions and model state management
- `js/ui.js`: DOM element references, UI state management, mode switching
- `js/api.js`: Chutes API communication and quota management
- `js/storage.js`: IndexedDB and localStorage for image history
- `js/imageUtils.js`: Image processing, file handling, resolution presets
- `js/modal.js`: Image viewing modal and settings management
- `js/activityLog.js`: Activity logging functionality
- `js/helpers.js`: Common utilities and helper functions
- `js/serviceWorker.js`: Service worker registration and update handling

#### Module Configuration:
Models are defined in `js/models.js` with:
- `name`: Display name
- `endpoint`: API endpoint URL  
- `modelName`: API model parameter (for some models)
- `params`: Parameter definitions with min/max/default values

#### Cache Management:
- `update-cache-version.js`: Updates version timestamps in HTML and service worker
- Service worker caches app shell, skips caching Chutes API requests
- Always run cache update before deploying

### Making Changes

#### Adding a New Model:
1. Add model configuration to `MODEL_CONFIGS` in `js/models.js`
2. Reference the API schema from `reference/img-models.md`
3. Test with both default and edge-case parameter values
4. Verify model switching updates UI controls correctly

#### UI Changes:
1. Modify HTML structure in `index.html` 
2. Update styles in `app.css`
3. Update corresponding JavaScript module in `js/` directory
4. Test responsive layout at different screen sizes
5. Validate PWA functionality still works

#### API Changes:
1. Update endpoint URLs or parameters in `js/models.js`
2. Update API functions in `js/api.js` if needed
3. Validate against schemas in `reference/img-models.md`
4. Test with actual API calls (requires valid API key)
5. Check error handling for failed requests

#### Adding New Functionality:
1. Create new module in `js/` directory if needed
2. Export functions from the new module
3. Import and use in `js/main.js` or other modules
4. Update service worker cache list in `service-worker.js`
5. Test module interactions and dependencies

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
- Supports multiple models: Hidream, Qwen Image, FLUX.1 Dev, JuggernautXL, Chroma, iLustMix, Neta Lumina
- Image Edit mode uses Qwen Image Edit endpoint specifically

### PWA Features:
- Service worker for offline app shell caching
- Web app manifest for installation
- Responsive design for mobile/desktop
- Local storage for API key persistence

### No Build Process:
- Pure vanilla JavaScript ES6 modules, HTML, CSS
- No bundling or compilation required
- Direct file serving via `serve` package
- Cache busting via query parameters
- ES6 import/export for modular organization

### Browser Compatibility:
- Modern browsers with ES6+ support
- Service Worker API support
- File API for image uploads
- LocalStorage for settings

## Troubleshooting

### Common Issues:
- **API key required**: Enter valid Chutes API key in the API Key section
- **CORS errors**: Chutes API endpoints are properly configured for browser requests
- **Image upload failures**: Verify file is a valid image format (jpg, png, etc.)
- **Model parameters not updating**: Check MODEL_CONFIGS definition for the selected model
- **Cache not updating**: Run `node update-cache-version.js` before deployment

### Development Tips:
- Use browser DevTools Network tab to debug API calls
- Check console for service worker registration messages
- Activity log in the UI shows application state changes
- File API requires user gesture for security (actual file selection)

Remember: This is a client-side only application. No server code, no build process, no complex setup required.