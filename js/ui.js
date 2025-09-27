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
 * Renders the current sourceB64s/sourceMimes into the #imgThumb area with
 * numbering, delete, and reorder controls. Adds touch-friendly drag handles.
 */
export function renderSourceThumbs() {
  const imgs = Array.isArray(sourceB64s) ? sourceB64s : [];
  if (!imgs.length) {
    setImgThumbContent('<span class="muted">No image selected</span>');
    els.imgThumb.classList.remove('multi-grid');
    return;
  }
  // Single image simplified view
  if (imgs.length === 1) {
    const url = `data:${sourceMimes[0] || 'image/jpeg'};base64,${imgs[0]}`;
    setImgThumbContent(`<img src="${url}" alt="source"/>`);
    els.imgThumb.classList.remove('multi-grid');
    return;
  }

  // Multi image grid with controls
  const parts = imgs.map((b64, idx) => {
    const mime = sourceMimes[idx] || 'image/jpeg';
    const url = `data:${mime};base64,${b64}`;
    return `
      <div class="thumb-item" data-index="${idx}">
        <img src="${url}" alt="source ${idx+1}" />
        <div class="thumb-index">${idx + 1}</div>
        <div class="thumb-controls">
          <button type="button" class="btn-up" title="Move up" aria-label="Move up">▲</button>
          <button type="button" class="btn-down" title="Move down" aria-label="Move down">▼</button>
          <button type="button" class="btn-del" title="Remove" aria-label="Remove">✕</button>
        </div>
        <div class="drag-handle" title="Drag to reorder">☰ Drag</div>
      </div>`;
  }).join('');

  setImgThumbContent(parts);
  els.imgThumb.classList.add('multi-grid');

  // Wire per-item controls
  els.imgThumb.querySelectorAll('.thumb-item').forEach(item => {
    const idx = parseInt(item.getAttribute('data-index'), 10);
    const btnUp = item.querySelector('.btn-up');
    const btnDown = item.querySelector('.btn-down');
    const btnDel = item.querySelector('.btn-del');
    if (btnUp) btnUp.addEventListener('click', () => moveImage(idx, Math.max(0, idx - 1)));
    if (btnDown) btnDown.addEventListener('click', () => moveImage(idx, Math.min(sourceB64s.length - 1, idx + 1)));
    if (btnDel) btnDel.addEventListener('click', () => removeImage(idx));

    // Desktop drag & drop using HTML5 drag API on handle
    const handle = item.querySelector('.drag-handle');
    if (handle) handle.setAttribute('draggable', 'true');
  });

  wireDesktopDnD();
  wireTouchLongPressDnD();
}

function currentIndexFromElement(el) {
  const i = parseInt(el.getAttribute('data-index'), 10);
  return Number.isNaN(i) ? null : i;
}

function moveImage(from, to) {
  if (from === to) return;
  if (from < 0 || to < 0) return;
  if (from >= sourceB64s.length || to >= sourceB64s.length) return;
  const b = sourceB64s.splice(from, 1)[0];
  const m = sourceMimes.splice(from, 1)[0];
  sourceB64s.splice(to, 0, b);
  sourceMimes.splice(to, 0, m);
  // Re-render to update numbering and data-index
  renderSourceThumbs();
  // Update primary fields
  if (sourceB64s.length > 0) {
    sourceB64 = sourceB64s[0];
    sourceMime = sourceMimes[0] || 'image/jpeg';
  }
  // If auto preset, recompute dims from first image
  if (currentMode === 'image-edit' && els.resolutionPreset && els.resolutionPreset.value === 'auto') {
    const firstDataUrl = `data:${sourceMimes[0] || 'image/jpeg'};base64,${sourceB64s[0]}`;
    computeAndDisplayAutoDims(firstDataUrl).catch(()=>{});
  }
}

function removeImage(index) {
  if (index < 0 || index >= sourceB64s.length) return;
  sourceB64s.splice(index, 1);
  sourceMimes.splice(index, 1);
  // Also update single-source fields
  if (sourceB64s.length > 0) {
    sourceB64 = sourceB64s[0];
    sourceMime = sourceMimes[0] || 'image/jpeg';
  } else {
    sourceB64 = null;
    sourceMime = null;
  }
  renderSourceThumbs();
  if (currentMode === 'image-edit' && els.resolutionPreset && els.resolutionPreset.value === 'auto' && sourceB64s.length) {
    const firstDataUrl = `data:${sourceMimes[0] || 'image/jpeg'};base64,${sourceB64s[0]}`;
    computeAndDisplayAutoDims(firstDataUrl).catch(()=>{});
  }
}

/**
 * Append new files to the current multi-image selection honoring maxItems.
 * Does nothing if current model doesn't support multiple images.
 */
export async function appendImageFiles(files) {
  const cfg = EDIT_MODEL_CONFIGS[currentModel]?.imageInput || { type: 'single', maxItems: 1 };
  if (cfg.type !== 'multiple') {
    // Fallback to single-file handler
    const f = files && files[0];
    if (f) await handleImageFile(f);
    return;
  }

  const maxItems = Math.max(1, cfg.maxItems || 1);
  const arr = Array.from(files || []).filter(f => (f.type || '').startsWith('image/'));
  if (!arr.length) return;

  // If we already have images, append while enforcing maxItems
  for (const f of arr) {
    if (sourceB64s.length >= maxItems) break;
    const b64 = await fileToBase64(f);
    const data = (b64 || '').split(',')[1] || '';
    if (!data) continue;
    sourceB64s.push(data);
    sourceMimes.push(f.type || 'image/jpeg');
  }

  // Keep single-source fields in sync
  if (sourceB64s.length > 0) {
    sourceB64 = sourceB64s[0];
    sourceMime = sourceMimes[0] || 'image/jpeg';
  }

  // Auto dims from first image when preset set to auto
  if (currentMode === 'image-edit' && els.resolutionPreset && els.resolutionPreset.value === 'auto') {
    try {
      toggleDimInputs(false);
      if (els.autoDims) { els.autoDims.style.display = 'block'; els.autoDims.textContent = 'Auto: (waiting for image)'; }
      const firstDataUrl = `data:${sourceMimes[0] || 'image/jpeg'};base64,${sourceB64s[0]}`;
      await computeAndDisplayAutoDims(firstDataUrl);
    } catch (e) {
      console.warn('Auto dims failed after append', e);
    }
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
      // If we already have images, render with controls
      if (sourceB64s && sourceB64s.length > 0) {
        renderSourceThumbs();
      }
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
    } else if (currentMode === 'video-generation') {
      const vcfg = VIDEO_MODEL_CONFIGS[currentModel];
      const def = vcfg?.params?.resolution?.default || (vcfg?.params?.resolution?.options || [])[0];
      if (def) {
        const parts = String(def).includes('*') ? String(def).split('*') : String(def).split('x');
        if (parts.length === 2) {
          els.width.value = parseInt(parts[0], 10) || '';
          els.height.value = parseInt(parts[1], 10) || '';
        }
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

  // If preset is a raw resolution string (e.g., "832*480" or "832x480"), parse and apply
  if (val && val !== 'auto' && val !== 'custom') {
    let w = null, h = null;
    if (val.includes('x')) {
      const [ww, hh] = val.split('x').map(Number);
      w = ww; h = hh;
    } else if (val.includes('*')) {
      const [ww, hh] = val.split('*').map(Number);
      w = ww; h = hh;
    }
    if (w && h) {
      toggleDimInputs(false);
      els.width.value = w;
      els.height.value = h;
      if (els.autoDims) els.autoDims.style.display = 'none';
      log(`[${ts()}] Preset selected: ${val}`);
      return;
    }
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

  // Build base64 arrays
  const b64s = [];
  const mimes = [];
  for (const f of sel) {
    const b64 = await fileToBase64(f);
    const b64Data = (b64 || '').split(',')[1] || '';
    b64s.push(b64Data);
    mimes.push(f.type || 'image/jpeg');
  }
  setSourceImages(b64s, mimes);
  renderSourceThumbs();

  // Auto dims based on the first image
  if (currentMode === 'image-edit' && els.resolutionPreset && els.resolutionPreset.value === 'auto') {
    try {
      if (sourceB64s.length > 0) {
        toggleDimInputs(false);
        if (els.autoDims) { els.autoDims.style.display = 'block'; els.autoDims.textContent = 'Auto: (waiting for image)'; }
        const firstDataUrl = `data:${sourceMimes[0] || 'image/jpeg'};base64,${sourceB64s[0]}`;
        await computeAndDisplayAutoDims(firstDataUrl);
      }
    } catch (err) {
      console.warn('Failed to compute auto dims for multi-images', err);
    }
  }
}

// ---- Drag & Drop (desktop) ----
let dragSrcIndex = null;
let lastOverEl = null;

function wireDesktopDnD() {
  els.imgThumb.querySelectorAll('.thumb-item .drag-handle').forEach(handle => {
    const item = handle.closest('.thumb-item');
    handle.addEventListener('dragstart', (e) => {
      const idx = currentIndexFromElement(item);
      dragSrcIndex = idx;
      item.classList.add('dragging');
      try {
        e.dataTransfer.effectAllowed = 'move';
        // Some browsers require data to be set for drag to start
        e.dataTransfer.setData('text/plain', String(idx));
        // Create a sized ghost so the drag avatar matches the preview size
        const rect = item.getBoundingClientRect();
        const ghost = item.cloneNode(true);
        ghost.style.position = 'absolute';
        ghost.style.left = '-10000px';
        ghost.style.top = '-10000px';
        ghost.style.width = rect.width + 'px';
        ghost.style.height = rect.height + 'px';
        ghost.style.pointerEvents = 'none';
        ghost.style.opacity = '1';
        ghost.style.border = '2px solid var(--accent)';
        ghost.style.borderRadius = '8px';
        ghost.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)';
        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, rect.width/2, rect.height/2);
        // Remove after a tick (Firefox requires it to remain in DOM until dragstart returns)
        setTimeout(() => { try { ghost.remove(); } catch(_) {} }, 0);
      } catch(_) {}
    });
    handle.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      dragSrcIndex = null;
    });
  });

  els.imgThumb.querySelectorAll('.thumb-item').forEach(item => {
    item.addEventListener('dragover', (e) => {
      e.preventDefault(); // allow drop
      if (lastOverEl && lastOverEl !== item) lastOverEl.classList.remove('drag-over');
      item.classList.add('drag-over');
      lastOverEl = item;
    });
    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over');
      if (lastOverEl === item) lastOverEl = null;
    });
    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.classList.remove('drag-over');
      const to = currentIndexFromElement(item);
      const from = dragSrcIndex;
      dragSrcIndex = null;
      els.imgThumb.querySelectorAll('.thumb-item.dragging').forEach(el => el.classList.remove('dragging'));
      if (typeof from === 'number' && typeof to === 'number' && from !== to) {
        moveImage(from, to);
      }
    });
  });
}

// ---- Touch long-press drag ----
let touchDrag = {
  active: false,
  srcIndex: null,
  ghostEl: null,
  currentOverIndex: null
};

function wireTouchLongPressDnD() {
  els.imgThumb.querySelectorAll('.thumb-item .drag-handle').forEach(handle => {
    const item = handle.closest('.thumb-item');
    let pressTimer = null;

    const cancelPress = () => {
      if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    };

    handle.addEventListener('pointerdown', (e) => {
      // Only initiate for touch or primary button
      if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
      e.preventDefault();
      const idx = currentIndexFromElement(item);
      pressTimer = setTimeout(() => {
        startTouchDrag(e, item, idx);
      }, 200);
    });
    ['pointerup','pointercancel','pointerleave'].forEach(type => {
      handle.addEventListener(type, () => cancelPress());
    });
  });
}

function startTouchDrag(e, item, idx) {
  touchDrag.active = true;
  touchDrag.srcIndex = idx;
  item.classList.add('dragging');
  // Create ghost element
  const rect = item.getBoundingClientRect();
  const ghost = item.cloneNode(true);
  ghost.style.position = 'fixed';
  ghost.style.left = rect.left + 'px';
  ghost.style.top = rect.top + 'px';
  ghost.style.width = rect.width + 'px';
  ghost.style.height = rect.height + 'px';
  ghost.style.pointerEvents = 'none';
  ghost.style.opacity = '0.95';
  ghost.style.transform = 'none';
  ghost.style.zIndex = '1000';
  ghost.classList.add('drag-ghost');
  document.body.appendChild(ghost);
  touchDrag.ghostEl = ghost;

  const move = (ev) => {
    if (!touchDrag.active) return;
    ghost.style.left = (ev.clientX - rect.width/2) + 'px';
    ghost.style.top = (ev.clientY - rect.height/2) + 'px';
    const el = document.elementFromPoint(ev.clientX, ev.clientY);
    const targetItem = el?.closest?.('.thumb-item');
    els.imgThumb.querySelectorAll('.thumb-item.drag-over').forEach(n => n.classList.remove('drag-over'));
    if (targetItem) {
      targetItem.classList.add('drag-over');
      const tIdx = currentIndexFromElement(targetItem);
      touchDrag.currentOverIndex = tIdx;
    } else {
      touchDrag.currentOverIndex = null;
    }
  };
  const end = (ev) => {
    if (!touchDrag.active) return;
    touchDrag.active = false;
    document.removeEventListener('pointermove', move, true);
    document.removeEventListener('pointerup', end, true);
    document.removeEventListener('pointercancel', end, true);
    if (touchDrag.ghostEl) {
      touchDrag.ghostEl.remove();
      touchDrag.ghostEl = null;
    }
    els.imgThumb.querySelectorAll('.thumb-item.drag-over').forEach(n => n.classList.remove('drag-over'));
    els.imgThumb.querySelectorAll('.thumb-item.dragging').forEach(n => n.classList.remove('dragging'));
    const from = idx;
    const to = touchDrag.currentOverIndex;
    touchDrag.currentOverIndex = null;
    if (typeof from === 'number' && typeof to === 'number' && from !== to) {
      moveImage(from, to);
    }
  };
  document.addEventListener('pointermove', move, true);
  document.addEventListener('pointerup', end, true);
  document.addEventListener('pointercancel', end, true);
}

/**
 * Updates parameters for video generation mode
 */
export function updateParametersForVideoGeneration() {
  // Filter model select to show only video models
  updateModelSelectForVideo();
  
  // Update video-specific parameters based on current model
  updateVideoParametersForModel(currentModel);
  // Update resolution presets and reflect defaults for the current video model
  updateVideoResolutionPresets();
  
  sync();
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
 * Rebuilds the resolution presets for the current video model and updates width/height boxes.
 * Works for models using either the "WxH" or "W*H" string formats.
 */
export function updateVideoResolutionPresets() {
  const config = VIDEO_MODEL_CONFIGS[currentModel];
  if (!config) return;

  // Populate resolution presets based on model enum options
  const res = config.params?.resolution;
  if (res && Array.isArray(res.options)) {
    const preset = els.resolutionPreset;
    const defStr = res.default || res.options[0];
    const defParts = String(defStr).split(/[*x]/);
    const autoLabel = defParts.length === 2 ? `Auto (${defParts[0]} × ${defParts[1]})` : 'Auto (model default)';

    let optsHtml = `<option value="auto">${autoLabel}</option>`;
    res.options.forEach(opt => {
      const display = String(opt).replace(/[*x]/, ' × ');
      // Keep value as-is (UI stores in model's format; payload builder normalizes)
      optsHtml += `<option value="${opt}">${display}</option>`;
    });
    // Video models use enums; no Custom option exposed
    preset.innerHTML = optsHtml;
    preset.value = 'auto';

    // Reflect default resolution into width/height boxes
    const parts = String(defStr).includes('*') ? String(defStr).split('*') : String(defStr).split('x');
    if (els.width && els.height && parts.length === 2) {
      els.width.value = parseInt(parts[0], 10) || '';
      els.height.value = parseInt(parts[1], 10) || '';
    }
  }

  // In video mode, width/height are display-only
  toggleDimInputs(false);
  if (els.autoDims) { els.autoDims.style.display = 'none'; }
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

  // Video image-to-video only supports a single source image.
  // Ensure the file input does not allow multi-select and hide the multi-image hint.
  if (els.imgInput) {
    // Always enforce single selection for video modes
    els.imgInput.removeAttribute('multiple');
  }
  const multiHint = document.getElementById('multiImageHint');
  if (multiHint) {
    multiHint.style.display = 'none';
  }
  // Update the label text to drop the plural when in video i2v, preserving the existing required span
  const srcLabel = els.sourceImageSection ? els.sourceImageSection.querySelector('label') : null;
  if (srcLabel) {
    const reqSpan = els.sourceImageRequired || srcLabel.querySelector('#sourceImageRequired');
    const leadingText = isImage2Video ? 'Source Image ' : 'Source Image(s) ';
    if (srcLabel.firstChild && srcLabel.firstChild.nodeType === Node.TEXT_NODE) {
      srcLabel.firstChild.nodeValue = leadingText;
    } else {
      srcLabel.insertBefore(document.createTextNode(leadingText), srcLabel.firstChild || null);
    }
    if (reqSpan) {
      reqSpan.textContent = isImage2Video ? '(required)' : '';
    }
  }

  // If we previously had multiple images (from Image Edit multi-image model),
  // trim to the first image for video i2v and update the thumbnail view.
  if (isImage2Video && Array.isArray(sourceB64s) && sourceB64s.length > 1) {
    const firstB64 = sourceB64s[0];
    const firstMime = (sourceMimes && sourceMimes[0]) || 'image/jpeg';
    setSourceImages([firstB64], [firstMime]);
    // Prefer using the currently displayed first <img> if available
    let url = lastSourceObjectUrl();
    if (!url && firstB64) {
      url = `data:${firstMime};base64,${firstB64}`;
    }
    if (url) {
      setImgThumbContent(`<img src="${url}" alt="source"/>`);
      els.imgThumb.classList.remove('multi-grid');
    }
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