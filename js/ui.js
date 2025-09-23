// UI state management and DOM manipulation

import { MODEL_CONFIGS, VIDEO_MODEL_CONFIGS, EDIT_MODEL_CONFIGS } from './models.js';
import { PRESETS, findPresetForDimensions, computeAutoDims } from './imageUtils.js';
import { clamp, snap, ts, fileToBase64 } from './helpers.js';
import { log } from './activityLog.js';

// DOM element references
export const els = {
  apiKey: document.getElementById('apiKey'), 
  revealKeyBtn: document.getElementById('revealKeyBtn'), 
  saveKeyBtn: document.getElementById('saveKeyBtn'), 
  forgetKeyBtn: document.getElementById('forgetKeyBtn'), 
  keyStatus: document.getElementById('keyStatus'),
  modeImageEdit: document.getElementById('modeImageEdit'), 
  modeTextToImage: document.getElementById('modeTextToImage'),
  modeVideoGeneration: document.getElementById('modeVideoGeneration'),
  videoModeToggle: document.getElementById('videoModeToggle'),
  videoModeText2Video: document.getElementById('videoModeText2Video'),
  videoModeImage2Video: document.getElementById('videoModeImage2Video'),
  modelSelect: document.getElementById('modelSelect'), 
  modelRow: document.getElementById('modelRow'),
  imgInput: document.getElementById('imgInput'), 
  imgThumb: document.getElementById('imgThumb'), 
  sourceImageSection: document.getElementById('sourceImageSection'), 
  sourceImageRequired: document.getElementById('sourceImageRequired'), 
  imageInputRow: document.getElementById('imageInputRow'),
  prompt: document.getElementById('prompt'), 
  negPrompt: document.getElementById('negPrompt'), 
  inputCardTitle: document.getElementById('inputCardTitle'),
  width: document.getElementById('width'), 
  height: document.getElementById('height'), 
  seed: document.getElementById('seed'),
  resolutionPreset: document.getElementById('resolutionPreset'), 
  autoDims: document.getElementById('autoDims'),
  cfg: document.getElementById('cfg'), 
  cfgVal: document.getElementById('cfgVal'), 
  steps: document.getElementById('steps'), 
  stepsVal: document.getElementById('stepsVal'),
  // Video-specific parameters
  videoParams: document.getElementById('videoParams'),
  fps: document.getElementById('fps'),
  fpsVal: document.getElementById('fpsVal'),
  frames: document.getElementById('frames'),
  framesVal: document.getElementById('framesVal'),
  sampleShift: document.getElementById('sampleShift'),
  sampleShiftVal: document.getElementById('sampleShiftVal'),
  singleFrame: document.getElementById('singleFrame'),
  generateBtn: document.getElementById('generateBtn'), 
  runStatus: document.getElementById('runStatus'),
  resultImg: document.getElementById('resultImg'), 
  resultVideo: document.getElementById('resultVideo'),
  downloadBtn: document.getElementById('downloadBtn'), 
  copyBtn: document.getElementById('copyBtn'), 
  sendToEditBtn: document.getElementById('sendToEditBtn'), 
  outMeta: document.getElementById('outMeta')
};

// Current application state
export let currentMode = 'image-edit';
export let currentModel = 'qwen-image-edit-2509';
export let sourceB64 = null; 
export let sourceMime = null; 
// Support multiple sources for edit models that accept arrays
export let sourceB64s = [];
export let sourceMimes = [];
export let lastBlobUrl = null;
export let autoDimsCache = null; // {w,h}
let imgThumbObjectUrl = null; // Track object URL for imgThumb to prevent memory leaks

/**
 * Cleanup function to revoke imgThumbObjectUrl to prevent memory leaks.
 */
export function cleanupImgThumbObjectUrl() {
  if (imgThumbObjectUrl) {
    URL.revokeObjectURL(imgThumbObjectUrl);
    imgThumbObjectUrl = null;
  }
}

// Ensure cleanup on page unload/navigation
window.addEventListener('beforeunload', cleanupImgThumbObjectUrl);

/**
 * Updates the current mode
 * @param {string} mode - The mode to set
 */
export function setCurrentMode(mode) {
  currentMode = mode;
}

/**
 * Updates the current model
 * @param {string} model - The model to set
 */
export function setCurrentModel(model) {
  currentModel = model;
}

/**
 * Updates the source image data
 * @param {string} b64 - Base64 image data
 * @param {string} mime - MIME type
 */
export function setSourceImage(b64, mime) {
  sourceB64 = b64;
  sourceMime = mime;
}

/**
 * Sets multiple source images (for edit models that accept multiple)
 * @param {string[]} b64s
 * @param {string[]} mimes
 */
export function setSourceImages(b64s, mimes) {
  sourceB64s = Array.isArray(b64s) ? b64s : [];
  sourceMimes = Array.isArray(mimes) ? mimes : [];
  // Also set the primary single source to the first for compatibility
  if (sourceB64s.length > 0) {
    sourceB64 = sourceB64s[0];
    sourceMime = sourceMimes[0] || 'image/jpeg';
  }
}

/**
 * Updates the auto dimensions cache
 * @param {Object} dims - Dimensions object with w and h properties
 */
export function setAutoDimsCache(dims) {
  autoDimsCache = dims;
}

/**
 * Updates the last blob URL, cleaning up the previous one
 * @param {string} url - The new blob URL
 */
export function setLastBlobUrl(url) {
  if (lastBlobUrl) URL.revokeObjectURL(lastBlobUrl);
  lastBlobUrl = url;
}

/**
 * Sets imgThumb content with proper object URL cleanup
 * @param {string} html - The HTML content to set
 * @param {string} objectUrl - Optional object URL to track for cleanup
 */
export function setImgThumbContent(html, objectUrl = null) {
  // Clean up previous object URL if it exists
  if (imgThumbObjectUrl) {
    URL.revokeObjectURL(imgThumbObjectUrl);
    imgThumbObjectUrl = null;
  }
  
  // Set new content
  els.imgThumb.innerHTML = html;
  
  // Track new object URL if provided
  if (objectUrl) {
    imgThumbObjectUrl = objectUrl;
  }
}

/**
 * Loads an image blob or URL into the Source Image area and prepares base64 for API.
 * Also computes Auto dimensions if that preset is selected.
 * @param {Blob|string} input - Image blob or object/data URL
 */
export async function loadSourceFromBlobOrUrl(input) {
  try {
    let blob;
    let url;
    if (typeof input === 'string') {
      url = input;
      // If it's a data URL, convert to blob for uniform handling
      if (url.startsWith('data:')) {
        const res = await fetch(url);
        blob = await res.blob();
      } else {
        blob = await (await fetch(url)).blob();
      }
    } else {
      blob = input;
    }

    if (!url) {
      url = URL.createObjectURL(blob);
    }

  // Update thumbnail and track object URL
  setImgThumbContent(`<img src="${url}" alt="source"/>`, url);
  // Single image -> ensure grid class is removed
  els.imgThumb.classList.remove('multi-grid');

    // Prepare base64 for API
    const reader = new FileReader();
    await new Promise((resolve, reject) => {
      reader.onload = () => resolve();
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const dataUrl = String(reader.result || '');
    const parts = dataUrl.split(',');
    if (parts.length === 2) {
      setSourceImage(parts[1], blob.type || 'image/jpeg');
    }

    // If auto preset is selected in image-edit mode, compute auto dims
    if (currentMode === 'image-edit' && els.resolutionPreset && els.resolutionPreset.value === 'auto') {
      toggleDimInputs(false);
      if (els.autoDims) {
        els.autoDims.style.display = 'block';
        els.autoDims.textContent = 'Auto: (waiting for image)';
      }
      await computeAndDisplayAutoDims(url);
    }
  } catch (e) {
    console.warn('Failed to load source from blob/url', e);
  }
}

/**
 * Helper function to create an img element inside the result container
 * @param {string} src - Image source URL
 * @returns {HTMLImageElement} The created image element
 */
export function createResultImg(src) {
  // Clear the container
  els.resultImg.innerHTML = '';
  
  // Create and configure the img element
  const img = document.createElement('img');
  img.alt = 'Generated result';
  img.src = src;
  
  // Add the img to the container
  els.resultImg.appendChild(img);
  
  // Return the img element for further manipulation if needed
  return img;
}

/**
 * Helper function to check if result container has an img element
 * @returns {boolean} True if image exists
 */
export function hasResultImg() {
  return els.resultImg.querySelector('img') !== null;
}

/**
 * Helper function to get the img element from the result container
 * @returns {HTMLImageElement|null} The image element or null
 */
export function getResultImgElement() {
  return els.resultImg.querySelector('img');
}

/**
 * Syncs slider display values
 */
export function sync() { 
  els.cfgVal.textContent = els.cfg.value || (els.cfg.placeholder ? `default (${els.cfg.placeholder})` : 'default'); 
  els.stepsVal.textContent = els.steps.value || (els.steps.placeholder ? `default (${els.steps.placeholder})` : 'default'); 
  
  // Update video parameter displays if elements exist
  if (els.fpsVal) {
    els.fpsVal.textContent = els.fps.value || (els.fps.placeholder ? `default (${els.fps.placeholder})` : 'default');
  }
  if (els.framesVal) {
    els.framesVal.textContent = els.frames.value || (els.frames.placeholder ? `default (${els.frames.placeholder})` : 'default');
  }
  if (els.sampleShiftVal) {
    els.sampleShiftVal.textContent = els.sampleShift.value || (els.sampleShift.placeholder ? `default (${els.sampleShift.placeholder})` : 'default');
  }
}

/**
 * Switches between modes (image-edit and text-to-image)
 * @param {string} mode - The mode to switch to
 */
export function switchMode(mode) {
  currentMode = mode;
  const isTextToImage = mode === 'text-to-image';
  const isVideoGeneration = mode === 'video-generation';
  const isImageEdit = mode === 'image-edit';
  
  // Update UI visibility
  // Show model select for text-to-image, video-generation, and image-edit (edit models)
  els.modelRow.style.display = (isTextToImage || isVideoGeneration || isImageEdit) ? 'block' : 'none';
  els.sourceImageSection.style.display = (isTextToImage) ? 'none' : 'block';
  
  // Show/hide video mode toggle
  if (els.videoModeToggle) {
    els.videoModeToggle.style.display = isVideoGeneration ? 'block' : 'none';
  }
  
  // Show/hide video parameters
  if (els.videoParams) {
    els.videoParams.style.display = isVideoGeneration ? 'block' : 'none';
  }
  
  // Add class on the input row so CSS can adapt layout
  if (els.imageInputRow) {
    els.imageInputRow.classList.toggle('t2i', isTextToImage);
    els.imageInputRow.classList.toggle('video', isVideoGeneration);
  }
  
  // Update prompt placeholder
  if (isVideoGeneration) {
    els.prompt.placeholder = 'Describe the video you want to generate...';
  } else {
    els.prompt.placeholder = isTextToImage ? 
      'Describe the image you want to generate...' : 
      'Describe the edit you want...';
  }
    
  // Update input card title
  if (isVideoGeneration) {
    els.inputCardTitle.textContent = '3) Input & Video Model';
  } else {
    els.inputCardTitle.textContent = isTextToImage ? '3) Input & Model' : '3) Input';
  }
    
  // Update resolution presets and parameters based on mode
  if (isVideoGeneration) {
    // Set default video model and update parameters
    currentModel = Object.keys(VIDEO_MODEL_CONFIGS)[0];
    els.modelSelect.value = currentModel;
    updateParametersForVideoGeneration();
    // Hide autoDims in video generation mode
    if (els.autoDims) { els.autoDims.style.display = 'none'; }
    // Disable manual width/height editing in video mode
    toggleDimInputs(false);
  } else if (isTextToImage) {
    restoreModelSelectForImages();
    updateParametersForModel(currentModel);
    // Hide autoDims element in text-to-image mode - auto dims are not applicable here
    if (els.autoDims) { els.autoDims.style.display = 'none'; els.autoDims.textContent = ''; }
  } else {
    // Image Edit: populate with edit models and update parameters
    restoreModelSelectForImageEdit();
    // Ensure currentModel is a valid edit model
    if (!EDIT_MODEL_CONFIGS[currentModel]) {
      currentModel = Object.keys(EDIT_MODEL_CONFIGS)[0];
      els.modelSelect.value = currentModel;
    }
    updateParametersForEditModel(currentModel);
  }
  
  // Update source image visibility based on video sub-mode
  if (isVideoGeneration) {
    updateVideoModeUI();
  }
  
  log(`[${ts()}] Switched to ${mode} mode`);
}

/**
 * Updates parameters for image editing mode
 */
export function updateParametersForImageEdit() {
  // Set up CFG and steps for image editing with placeholders (use Qwen Image Edit defaults)
  els.cfg.min = 0; els.cfg.max = 10; els.cfg.step = 0.1; 
  els.cfg.placeholder = '4';
  els.cfg.value = '';
  
  els.steps.min = 5; els.steps.max = 100; els.steps.step = 1; 
  els.steps.placeholder = '50';
  els.steps.value = '';
  
  // Update labels
  const cfgLabel = document.querySelector('label[for="cfg"]');
  if (cfgLabel) cfgLabel.textContent = 'CFG Scale (0–10)';
  
  const stepsLabel = document.querySelector('label[for="steps"]');
  if (stepsLabel) stepsLabel.textContent = 'Inference Steps (5–100)';
  
  // Update resolution preset options for image editing
  const preset = els.resolutionPreset;
  preset.innerHTML = `
    <option value="auto" selected>Auto (derive from source)</option>
    <option value="512x512">512 × 512 (Low-res square 1:1)</option>
    <option value="1024x1024">1024 × 1024 (Square 1:1)</option>
    <option value="1536x1024">1536 × 1024 (Landscape 3:2)</option>
    <option value="1024x1536">1024 × 1536 (Portrait 2:3)</option>
    <option value="2048x2048">2048 × 2048 (HiRes square)</option>
    <option value="1920x1080">1920 × 1080 (HiRes landscape 16:9)</option>
    <option value="1080x1920">1080 × 1920 (HiRes portrait 9:16)</option>
    <option value="custom">Custom…</option>
  `;
  
  // Reset to defaults but preserve user inputs for seed and negative prompt
  els.width.value = 1024; els.height.value = 1024; 
  // Don't reset seed and negative prompt as they might be user-set
  
  // Set negative prompt placeholder for image editing (uses Qwen Image Edit defaults)
  els.negPrompt.placeholder = 'Things to avoid (optional)';
  
  sync();
}

/**
 * Updates parameters for a specific Image Edit model
 * @param {string} modelKey - The edit model key to update parameters for
 */
export function updateParametersForEditModel(modelKey) {
  const config = EDIT_MODEL_CONFIGS[modelKey];
  if (!config) return;
  currentModel = modelKey;
  const params = config.params || {};

  // Update CFG and Steps placeholders/ranges
  const cfgParam = params.true_cfg_scale || params.guidance_scale || params.cfg;
  if (cfgParam) {
    els.cfg.min = cfgParam.min;
    els.cfg.max = cfgParam.max;
    els.cfg.step = cfgParam.step;
    els.cfg.placeholder = cfgParam.default;
    els.cfg.value = '';
    const cfgLabel = document.querySelector('label[for="cfg"]');
    if (cfgLabel) cfgLabel.textContent = `CFG Scale (${cfgParam.min}–${cfgParam.max})`;
  }
  const stepsParam = params.num_inference_steps || params.steps;
  if (stepsParam) {
    els.steps.min = stepsParam.min;
    els.steps.max = stepsParam.max;
    els.steps.step = stepsParam.step;
    els.steps.placeholder = stepsParam.default;
    els.steps.value = '';
    const stepsLabel = document.querySelector('label[for="steps"]');
    if (stepsLabel) stepsLabel.textContent = `Inference Steps (${stepsParam.min}–${stepsParam.max})`;
  }

  // Width/Height constraints
  if (params.width) {
    els.width.min = params.width.min;
    els.width.max = params.width.max;
    els.width.step = params.width.step;
  }
  if (params.height) {
    els.height.min = params.height.min;
    els.height.max = params.height.max;
    els.height.step = params.height.step;
  }
  // Set resolution preset options for image-edit
  updateParametersForImageEdit();

  // Negative prompt placeholder
  const negPromptParam = params.negative_prompt;
  if (negPromptParam && negPromptParam.default !== undefined) {
    els.negPrompt.placeholder = `Things to avoid (optional)` + (negPromptParam.default ? `\nDefault: ${negPromptParam.default}` : '');
  } else {
    els.negPrompt.placeholder = 'Things to avoid (optional)';
  }

  // File input multi-selection based on model capability
  const imgCap = config.imageInput || { type: 'single', maxItems: 1 };
  if (els.imgInput) {
    if (imgCap.type === 'multiple') {
      els.imgInput.setAttribute('multiple', 'multiple');
      const hint = document.getElementById('multiImageHint');
      if (hint) hint.style.display = '';
    } else {
      els.imgInput.removeAttribute('multiple');
      const hint = document.getElementById('multiImageHint');
      if (hint) hint.style.display = 'none';
      // If we currently have multiple images selected, trim to first
      if (sourceB64s && sourceB64s.length > 1) {
        setSourceImages([sourceB64s[0]], [sourceMimes[0] || 'image/jpeg']);
        // Update thumbnail to show only first image
        const url = lastSourceObjectUrl();
        if (url) {
          setImgThumbContent(`<img src="${url}" alt="source"/>`, url);
          els.imgThumb.classList.remove('multi-grid');
        } else if (sourceB64) {
          setImgThumbContent(`<img src="data:${sourceMime};base64,${sourceB64}" alt="source"/>`);
          els.imgThumb.classList.remove('multi-grid');
        }
      }
    }
  }

  sync();
  log(`[${ts()}] Updated parameters for ${config.name} (Image Edit)`);
}

/**
 * Updates parameters for a specific model
 * @param {string} modelKey - The model key to update parameters for
 */
export function updateParametersForModel(modelKey) {
  const config = MODEL_CONFIGS[modelKey];
  if (!config) return;
  
  currentModel = modelKey;
  const params = config.params;
  
  // Store current resolution preset selection to preserve it
  const currentPreset = els.resolutionPreset ? els.resolutionPreset.value : 'auto';
  
  // Update CFG/guidance scale (models use different parameter names) - update range and placeholder only
  const cfgParam = params.guidance_scale || params.true_cfg_scale || params.cfg;
  if (cfgParam) {
    els.cfg.min = cfgParam.min;
    els.cfg.max = cfgParam.max;
    els.cfg.step = cfgParam.step;
    els.cfg.placeholder = cfgParam.default;
    // Clear value to show placeholder
    els.cfg.value = '';
    // Update label to show the range
    const cfgLabel = document.querySelector('label[for="cfg"]');
    if (cfgLabel) {
      cfgLabel.textContent = `CFG Scale (${cfgParam.min}–${cfgParam.max})`;
    }
  }
  
  // Update inference steps (models use different parameter names) - update range and placeholder only
  const stepsParam = params.num_inference_steps || params.steps;
  if (stepsParam) {
    els.steps.min = stepsParam.min;
    els.steps.max = stepsParam.max;
    els.steps.step = stepsParam.step;
    els.steps.placeholder = stepsParam.default;
    // Clear value to show placeholder
    els.steps.value = '';
    // Update label to show the range
    const stepsLabel = document.querySelector('label[for="steps"]');
    if (stepsLabel) {
      stepsLabel.textContent = `Inference Steps (${stepsParam.min}–${stepsParam.max})`;
    }
  }
  
  // Update width/height constraints but only set values if Auto is selected
  if (params.width) {
    els.width.min = params.width.min;
    els.width.max = params.width.max;
    els.width.step = params.width.step;
    // Only set default values if Auto preset is selected
    if (currentPreset === 'auto') {
      els.width.value = params.width.default;
    }
  }
  if (params.height) {
    els.height.min = params.height.min;
    els.height.max = params.height.max;
    els.height.step = params.height.step;
    // Only set default values if Auto preset is selected
    if (currentPreset === 'auto') {
      els.height.value = params.height.default;
    }
  }
  
  // Update standard resolution presets, preserving current selection
  const preset = els.resolutionPreset;
  let autoLabel;
  if (currentMode === 'image-edit') {
    autoLabel = 'Auto (derive from source)';
  } else {
    // For text-to-image mode, show model default resolution. Some models expose
    // a `resolution` enum instead of free width/height; handle both cases.
    if (params.width && params.height) {
      autoLabel = `Auto (${params.width.default} × ${params.height.default})`;
    } else if (params.resolution && params.resolution.default) {
      // resolution default like '832*480' -> display with ×
      const parts = (params.resolution.default || '').split(/[*x]/);
      if (parts.length === 2) {
        autoLabel = `Auto (${parts[0]} × ${parts[1]})`;
      } else {
        autoLabel = 'Auto (model default)';
      }
    } else {
      autoLabel = 'Auto (model default)';
    }
  }
  // If the model provides a discrete set of supported resolutions, show those
  // first (converting '832*480' -> '832x480' keys used by PRESETS), otherwise
  // fall back to the standard preset list.
  if (params.resolution && Array.isArray(params.resolution.options)) {
    // Build options from model resolution enum
    let optsHtml = `<option value="auto">${autoLabel}</option>`;
    params.resolution.options.forEach(opt => {
      // opt may be like '832*480' - normalize to '832x480' for PRESETS lookup
      const val = String(opt).replace('*', 'x');
      const display = String(opt).replace(/[*x]/, ' × ');
      optsHtml += `<option value="${val}">${display}</option>`;
    });
    optsHtml += `<option value="custom">Custom…</option>`;
    preset.innerHTML = optsHtml;
    // If auto is selected, populate width/height from the model default resolution
    if (currentPreset === 'auto' && params.resolution.default) {
      const dparts = String(params.resolution.default).split(/[*x]/);
      if (dparts.length === 2) {
        if (els.width && els.height) {
          els.width.value = parseInt(dparts[0], 10);
          els.height.value = parseInt(dparts[1], 10);
        }
      }
    }
  } else {
    preset.innerHTML = `
      <option value="auto">${autoLabel}</option>
      <option value="512x512">512 × 512 (Low-res square 1:1)</option>
      <option value="1024x1024">1024 × 1024 (Square 1:1)</option>
      <option value="1536x1024">1536 × 1024 (Landscape 3:2)</option>
      <option value="1024x1536">1024 × 1536 (Portrait 2:3)</option>
      <option value="768x1360">768 × 1360 (Portrait 9:16)</option>
      <option value="1360x768">1360 × 768 (Landscape 16:9)</option>
      <option value="1920x1080">1920 × 1080 (HiRes landscape 16:9)</option>
      <option value="1080x1920">1080 × 1920 (HiRes portrait 9:16)</option>
      <option value="custom">Custom…</option>
    `;
  }
  
  // Restore the previously selected preset, or default to auto
  preset.value = currentPreset || 'auto';
  
  // Update seed
  if (params.seed) {
    els.seed.min = params.seed.min;
    if (params.seed.max) {
      els.seed.max = params.seed.max;
    } else {
      els.seed.removeAttribute('max');
    }
    // Only clear seed if it was empty before
    if (!els.seed.value) {
      els.seed.value = params.seed.default || '';
    }
  }
  
  // Update negative prompt placeholder based on model default
  const negPromptParam = params.negative_prompt;
  if (negPromptParam && negPromptParam.default) {
    // Model has a default negative prompt - include it in placeholder
    els.negPrompt.placeholder = `Things to avoid (optional)\nDefault: ${negPromptParam.default}`;
  } else {
    // No default negative prompt - use basic placeholder
    els.negPrompt.placeholder = 'Things to avoid (optional)';
  }
  
  // Update the display values
  sync();
  log(`[${ts()}] Updated parameters for ${config.name} model`);
}

/**
 * Toggles dimension input enabled/disabled state
 * @param {boolean} enabled - Whether inputs should be enabled
 */
export function toggleDimInputs(enabled) {
  els.width.disabled = !enabled;
  els.height.disabled = !enabled;
}

/**
 * Gets the last source object URL for re-use
 * @returns {string|null} The source URL or null
 */
export function lastSourceObjectUrl() {
  // We can re-use the current <img> inside imgThumb if present
  const img = els.imgThumb.querySelector('img');
  return img ? img.src : null;
}

/**
 * Computes and displays auto dimensions for an image
 * @param {string} imgUrl - The image URL to analyze
 */
export async function computeAndDisplayAutoDims(imgUrl) {
  try {
    const dims = await computeAutoDims(imgUrl);
    autoDimsCache = dims;
    // Only update the autoDims UI when in image-edit mode and auto preset is selected
    if (currentMode === 'image-edit' && els.resolutionPreset && els.resolutionPreset.value === 'auto') {
      if (els.autoDims) {
        els.autoDims.style.display = 'block';
        els.autoDims.textContent = `Auto: ${dims.w} × ${dims.h}`;
      }
      // Update width/height inputs even when they are disabled so user can see values
      if (els.width && els.height) { 
        els.width.value = dims.w; 
        els.height.value = dims.h; 
      }
    } else {
      // If not image-edit/auto, still update width/height for visibility
      if (els.width && els.height) {
        els.width.value = dims.w;
        els.height.value = dims.h;
      }
    }
    log(`[${ts()}] Auto resolution computed: ${dims.w}x${dims.h}`);
  } catch(e) {
    if (currentMode === 'image-edit' && els.autoDims) { 
      els.autoDims.style.display = 'block'; 
      els.autoDims.textContent = 'Auto: (failed to read image)'; 
    }
  }
}

/**
 * Applies the selected resolution preset
 */
export function applyPreset() {
  if (!els.resolutionPreset) return;
  const val = els.resolutionPreset.value;
  
  if (val === 'custom') {
    toggleDimInputs(true);
    if (els.autoDims) els.autoDims.style.display = 'none';
    log(`[${ts()}] Preset: custom`);
    return;
  }
  
  if (val === 'auto') {
    toggleDimInputs(false); // disable manual editing during auto
    const src = lastSourceObjectUrl();
    // Only update and show the autoDims UI when in image-edit mode
    if (currentMode === 'image-edit') {
      if (els.autoDims) {
        els.autoDims.style.display = 'block';
        els.autoDims.textContent = 'Auto: (waiting for image)';
      }
    }

    if (src && currentMode === 'image-edit') {
      // If we already computed auto dims earlier, use cache to populate inputs immediately
      if (autoDimsCache) { 
        if (els.width && els.height) { 
          els.width.value = autoDimsCache.w; 
          els.height.value = autoDimsCache.h; 
        } 
      } else { 
        computeAndDisplayAutoDims(src); 
      }
    }
    // For text-to-image mode, do not touch the autoDims element; populate width/height
    if (currentMode === 'text-to-image') {
      const config = MODEL_CONFIGS[currentModel];
      if (config && config.params.width && config.params.height) {
        els.width.value = config.params.width.default;
        els.height.value = config.params.height.default;
      }
    }
    log(`[${ts()}] Preset: auto`);
    return;
  }
  
  const p = PRESETS[val];
  if (p) {
    toggleDimInputs(false);
    els.width.value = p.w;
    els.height.value = p.h;
    if (els.autoDims) els.autoDims.style.display = 'none';
    log(`[${ts()}] Preset selected: ${val}`);
    return;
  }
}

/**
 * Handles image file selection/drop
 * @param {File} file - The image file to handle
 */
export async function handleImageFile(file) {
  if (!file) { 
    setImgThumbContent('<span class="muted">No image selected</span>'); 
    sourceB64 = null; 
    // Clear grid state when nothing is selected
    els.imgThumb.classList.remove('multi-grid');
    return; 
  }
  if (!(file.type || '').startsWith('image/')) { 
    // This will use toast from serviceWorker module - needs to be imported in main
    console.error('Please drop an image file'); 
    return; 
  }
  
  const url = URL.createObjectURL(file);
  setImgThumbContent(`<img src="${url}" alt="source"/>`, url);
  // Single image -> ensure grid class is removed
  els.imgThumb.classList.remove('multi-grid');
  log(`[${ts()}] Reading file: ${file.name}`);
  const b64 = await fileToBase64(file);
  sourceB64 = (b64 || '').split(',')[1] || null;
  sourceMime = file.type || 'image/png';
  // Keep multi-image state in sync as [single]
  setSourceImages(sourceB64 ? [sourceB64] : [], sourceMime ? [sourceMime] : []);
  log(`[${ts()}] Image ready (Base64 in memory).`);

  // If the user has the resolution preset set to "auto", compute auto dims
  // immediately for dropped images (matches behavior of file input change).
  try {
    if (currentMode === 'image-edit' && els.resolutionPreset && els.resolutionPreset.value === 'auto') {
      // Disable manual dim inputs and show waiting message
      toggleDimInputs(false);
      if (els.autoDims) { 
        els.autoDims.style.display = 'block'; 
        els.autoDims.textContent = 'Auto: (waiting for image)'; 
      }

      // If we already have cached auto dims, populate immediately; otherwise compute
      if (autoDimsCache) {
        if (els.width && els.height) { 
          els.width.value = autoDimsCache.w; 
          els.height.value = autoDimsCache.h; 
        }
      } else {
        await computeAndDisplayAutoDims(url);
      }
    }
  } catch (err) {
    // computeAndDisplayAutoDims already updates UI on failure; log for debugging
    console.warn('Failed to compute auto dimensions on drop:', err);
  }
}

/**
 * Handles multiple image file selection for edit models that support it
 * @param {FileList|File[]} files
 */
export async function handleImageFiles(files) {
  const arr = Array.from(files || []).filter(f => (f.type || '').startsWith('image/'));
  if (!arr.length) {
    setImgThumbContent('<span class="muted">No image selected</span>');
    setSourceImages([], []);
    // Clear grid state
    els.imgThumb.classList.remove('multi-grid');
    return;
  }
  // Determine allowed max
  const cfg = EDIT_MODEL_CONFIGS[currentModel]?.imageInput || { maxItems: 1 };
  const maxItems = Math.max(1, cfg.maxItems || 1);
  const sel = arr.slice(0, maxItems);

  // Build previews and base64 arrays
  const htmlParts = [];
  const b64s = [];
  const mimes = [];
  for (const f of sel) {
    const url = URL.createObjectURL(f);
    // Track each URL? imgThumb only tracks a single objectUrl; instead we won't track here.
    htmlParts.push(`<img src="${url}" alt="source"/>`);
    const b64 = await fileToBase64(f);
    const b64Data = (b64 || '').split(',')[1] || '';
    b64s.push(b64Data);
    mimes.push(f.type || 'image/jpeg');
  }
  // Set thumbnail with multiple images (no single object URL tracking)
  setImgThumbContent(htmlParts.join(''));
  // Toggle grid class when more than one image is selected
  els.imgThumb.classList.toggle('multi-grid', sel.length > 1);
  setSourceImages(b64s, mimes);

  // Auto dims based on the first image
  if (currentMode === 'image-edit' && els.resolutionPreset && els.resolutionPreset.value === 'auto') {
    try {
      const firstImg = els.imgThumb.querySelector('img');
      if (firstImg) {
        toggleDimInputs(false);
        if (els.autoDims) { els.autoDims.style.display = 'block'; els.autoDims.textContent = 'Auto: (waiting for image)'; }
        await computeAndDisplayAutoDims(firstImg.src);
      }
    } catch (err) {
      console.warn('Failed to compute auto dims for multi-images', err);
    }
  }
}

/**
 * Updates parameters for video generation mode
 */
export function updateParametersForVideoGeneration() {
  // Filter model select to show only video models
  updateModelSelectForVideo();
  
  // Update video-specific parameters based on current model
  updateVideoParametersForModel(currentModel);
  
  // Update resolution presets for video generation
  const config = VIDEO_MODEL_CONFIGS[currentModel];
  if (config && config.params.resolution && Array.isArray(config.params.resolution.options)) {
    const preset = els.resolutionPreset;
    let optsHtml = '<option value="auto">Auto (model default)</option>';
    config.params.resolution.options.forEach(opt => {
      const display = String(opt).replace(/[*x]/, ' × ');
      optsHtml += `<option value="${opt}">${display}</option>`;
    });
    preset.innerHTML = optsHtml;
    preset.value = 'auto';
  }
  
  sync();

  // Reflect model default resolution in width/height boxes
  const def = String(config.params.resolution.default || '1024*1024');
  const parts = def.includes('*') ? def.split('*') : def.split('x');
  if (els.width && els.height && parts.length === 2) {
    els.width.value = parseInt(parts[0], 10) || 1024;
    els.height.value = parseInt(parts[1], 10) || 1024;
  }
  // Ensure manual editing is disabled and auto dims hidden
  toggleDimInputs(false);
  if (els.autoDims) { els.autoDims.style.display = 'none'; }
}

/**
 * Updates the model select dropdown to show only video models
 */
export function updateModelSelectForVideo() {
  const modelSelect = els.modelSelect;
  if (!modelSelect) return;
  
  // Save current selection
  const currentSelection = modelSelect.value;
  
  // Clear and repopulate with video models only
  modelSelect.innerHTML = '';
  Object.keys(VIDEO_MODEL_CONFIGS).forEach(key => {
    const config = VIDEO_MODEL_CONFIGS[key];
    const option = document.createElement('option');
    option.value = key;
    option.textContent = config.name;
    modelSelect.appendChild(option);
  });
  
  // Try to restore previous selection if it's a video model, otherwise default to first
  if (Object.keys(VIDEO_MODEL_CONFIGS).includes(currentSelection)) {
    modelSelect.value = currentSelection;
    currentModel = currentSelection;
  } else {
    const firstVideoModel = Object.keys(VIDEO_MODEL_CONFIGS)[0];
    modelSelect.value = firstVideoModel;
    currentModel = firstVideoModel;
  }
}

/**
 * Updates video-specific parameters for a model
 * @param {string} modelKey - The video model key
 */
export function updateVideoParametersForModel(modelKey) {
  const config = VIDEO_MODEL_CONFIGS[modelKey];
  if (!config) return;
  
  const params = config.params;
  
  // Update CFG/guidance scale
  if (params.guidance_scale) {
    els.cfg.min = params.guidance_scale.min;
    els.cfg.max = params.guidance_scale.max;
    els.cfg.step = params.guidance_scale.step;
    els.cfg.placeholder = params.guidance_scale.default;
    els.cfg.value = '';
    const cfgLabel = document.querySelector('label[for="cfg"]');
    if (cfgLabel) {
      cfgLabel.textContent = `Guidance Scale (${params.guidance_scale.min}–${params.guidance_scale.max})`;
    }
  }
  
  // Update steps
  if (params.steps) {
    els.steps.min = params.steps.min;
    els.steps.max = params.steps.max;
    els.steps.step = params.steps.step;
    els.steps.placeholder = params.steps.default;
    els.steps.value = '';
    const stepsLabel = document.querySelector('label[for="steps"]');
    if (stepsLabel) {
      stepsLabel.textContent = `Steps (${params.steps.min}–${params.steps.max})`;
    }
  }
  
  // Update video-specific parameters
  if (params.fps && els.fps) {
    els.fps.min = params.fps.min;
    els.fps.max = params.fps.max;
    els.fps.step = params.fps.step;
    els.fps.placeholder = params.fps.default;
    els.fps.value = '';
    const fpsLabel = document.querySelector('label[for="fps"]');
    if (fpsLabel) {
      fpsLabel.textContent = `Frame Rate (${params.fps.min}–${params.fps.max})`;
    }
  }
  
  if (params.frames && els.frames) {
    els.frames.min = params.frames.min;
    els.frames.max = params.frames.max;
    els.frames.step = params.frames.step;
    els.frames.placeholder = params.frames.default;
    els.frames.value = '';
    const framesLabel = document.querySelector('label[for="frames"]');
    if (framesLabel) {
      framesLabel.textContent = `Frames (${params.frames.min}–${params.frames.max})`;
    }
  }
  
  if (params.sample_shift && els.sampleShift) {
    els.sampleShift.min = params.sample_shift.min;
    els.sampleShift.max = params.sample_shift.max;
    els.sampleShift.step = params.sample_shift.step;
    els.sampleShift.placeholder = params.sample_shift.default || 'Auto';
    els.sampleShift.value = '';
  }
  
  // Update negative prompt
  if (params.negative_prompt && params.negative_prompt.default) {
    els.negPrompt.placeholder = params.negative_prompt.default;
  }
}

/**
 * Updates video mode UI based on current sub-mode selection
 */
export function updateVideoModeUI() {
  if (currentMode !== 'video-generation') return;
  
  const isImage2Video = els.videoModeImage2Video && els.videoModeImage2Video.checked;
  
  // Show/hide source image section based on video mode
  if (els.sourceImageSection) {
    els.sourceImageSection.style.display = isImage2Video ? 'block' : 'none';
  }
  
  // Update source image requirement text
  if (els.sourceImageRequired) {
    els.sourceImageRequired.textContent = isImage2Video ? '(required)' : '';
  }

  // Hide resolution UI when the selected model omits resolution for image-to-video
  const vcfg = VIDEO_MODEL_CONFIGS[currentModel];
  const includeRes = Array.isArray(vcfg?.includeResolutionIn) ? vcfg.includeResolutionIn : ['text2video', 'image2video'];
  const shouldHideResolution = isImage2Video && !includeRes.includes('image2video');
  // Resolution preset container (first column)
  const rpContainer = els.resolutionPreset ? els.resolutionPreset.parentElement : null;
  if (rpContainer) {
    rpContainer.style.display = shouldHideResolution ? 'none' : '';
  }
  // Width/Height containers (second and third columns)
  const wContainer = els.width ? els.width.parentElement : null;
  const hContainer = els.height ? els.height.parentElement : null;
  if (wContainer) wContainer.style.display = shouldHideResolution ? 'none' : '';
  if (hContainer) hContainer.style.display = shouldHideResolution ? 'none' : '';
}

/**
 * Restores the model select dropdown to show all models
 */
export function restoreModelSelectForImages() {
  const modelSelect = els.modelSelect;
  if (!modelSelect) return;
  
  // Save current selection
  const currentSelection = modelSelect.value;
  
  // Clear and repopulate with image models
  modelSelect.innerHTML = Object.entries(MODEL_CONFIGS)
    .map(([key, config]) => {
      // Use config.displayName if available, otherwise fallback to key
      const label = config.displayName || config.name || key;
      return `<option value="${key}">${label}</option>`;
    })
    .join('');
  
  // Try to restore previous selection if it's an image model, otherwise default to hidream
  if (Object.keys(MODEL_CONFIGS).includes(currentSelection)) {
    modelSelect.value = currentSelection;
    currentModel = currentSelection;
  } else {
    modelSelect.value = 'hidream';
    currentModel = 'hidream';
  }
}

/**
 * Populates model select with Image Edit models
 */
export function restoreModelSelectForImageEdit() {
  const modelSelect = els.modelSelect;
  if (!modelSelect) return;

  const currentSelection = modelSelect.value;

  modelSelect.innerHTML = Object.entries(EDIT_MODEL_CONFIGS)
    .map(([key, config]) => `<option value="${key}">${config.name || key}</option>`)
    .join('');

  const keys = Object.keys(EDIT_MODEL_CONFIGS);
  if (keys.includes(currentSelection)) {
    modelSelect.value = currentSelection;
    currentModel = currentSelection;
  } else {
    const def = keys[0] || 'qwen-image-edit';
    modelSelect.value = def;
    currentModel = def;
  }
}