// Main entry point - coordinates all modules and handles application lifecycle

// Import all modules
import { MODEL_CONFIGS } from './models.js';
import { fetchQuotaUsage, generateImage } from './api.js';
import { 
  idbPutBlob, idbGetBlob, idbPutMeta, idbGetAllMeta, idbDeleteMeta, 
  idbClearMeta, idbDelete, getImageHistory, saveImageHistory,
  getStoredApiKey, saveApiKey, removeApiKey 
} from './storage.js';
import { clamp, snap, ts, fileToBase64, dataURLToBlob } from './helpers.js';
import { PRESETS, findPresetForDimensions, computeAutoDims } from './imageUtils.js';
import { log, toggleActivityLog, initializeActivityLog } from './activityLog.js';
import { registerServiceWorker, toast } from './serviceWorker.js';
import { 
  openImageModal, closeImageModal, downloadModalImage, 
  downloadModalSourceImage, getCurrentModalImage 
} from './modal.js';
import {
  els, currentMode, currentModel, sourceB64, sourceMime, lastBlobUrl, autoDimsCache,
  setCurrentMode, setCurrentModel, setSourceImage, setAutoDimsCache, setLastBlobUrl,
  createResultImg, hasResultImg, getResultImgElement, sync,
  switchMode, updateParametersForImageEdit, updateParametersForModel,
  toggleDimInputs, lastSourceObjectUrl, computeAndDisplayAutoDims,
  applyPreset, handleImageFile
} from './ui.js';

// Redirect helper for some static hosts
(function(){
  try{
    var p = location.pathname; 
    if (p === '/' && !location.href.endsWith('index.html')) {
      // no-op; most hosts serve index.html at '/'
    }
  }catch(e){}
})();

// Initialize service worker
registerServiceWorker();

// Quota management
let quotaData = null;
const quotaElements = {
  counter: document.getElementById('quotaCounter'),
  percentage: document.getElementById('quotaPercentage'),
  text: document.getElementById('quotaText'),
  circle: document.querySelector('.progress-ring-circle'),
  tooltip: document.getElementById('quotaTooltip')
};

// Add touch event for mobile tooltip
if (quotaElements.counter && quotaElements.tooltip) {
  let touchTimer = null;
  
  quotaElements.counter.addEventListener('touchstart', (e) => {
    touchTimer = setTimeout(() => {
      quotaElements.tooltip.style.opacity = '1';
      quotaElements.tooltip.style.visibility = 'visible';
    }, 500); // Show tooltip after 500ms hold
  });
  
  quotaElements.counter.addEventListener('touchend', (e) => {
    if (touchTimer) {
      clearTimeout(touchTimer);
      touchTimer = null;
    }
    // Hide tooltip after a short delay
    setTimeout(() => {
      quotaElements.tooltip.style.opacity = '0';
      quotaElements.tooltip.style.visibility = 'hidden';
    }, 3000);
  });
  
  quotaElements.counter.addEventListener('touchmove', (e) => {
    if (touchTimer) {
      clearTimeout(touchTimer);
      touchTimer = null;
    }
    // Hide tooltip if user moves finger
    quotaElements.tooltip.style.opacity = '0';
    quotaElements.tooltip.style.visibility = 'hidden';
  });
}

function updateQuotaDisplay(quota, used) {
  if (!quotaElements.counter || !quota) return;
  
  quotaData = { quota, used };
  const usedPercentage = (used / quota) * 100;
  const remainingPercentage = 100 - usedPercentage;
  
  // Update text
  quotaElements.percentage.textContent = `${Math.round(remainingPercentage)}%`;
  quotaElements.text.textContent = `${used}/${quota} used`;
  
  // Update progress circle
  const circumference = 2 * Math.PI * 16; // radius = 16
  const offset = circumference - (remainingPercentage / 100) * circumference;
  quotaElements.circle.style.strokeDashoffset = offset;
  
  // Keep a single 'quota' marker class for styling if needed
  quotaElements.counter.classList.remove('quota-high', 'quota-medium', 'quota-low');
  quotaElements.counter.classList.add('quota');
  
  // Show the counter
  quotaElements.counter.style.display = 'flex';
}

function hideQuotaCounter() {
  if (quotaElements.counter) {
    quotaElements.counter.style.display = 'none';
  }
}

async function refreshQuotaUsage() {
  const apiKey = (els.apiKey.value || '').trim();
  if (!apiKey) {
    hideQuotaCounter();
    return;
  }
  
  const data = await fetchQuotaUsage(apiKey);
  if (data && data.quota && data.used !== undefined) {
    updateQuotaDisplay(data.quota, data.used);
  } else {
    hideQuotaCounter();
  }
}

// Load API key from storage
const saved = getStoredApiKey();
if (saved) { 
  els.apiKey.value = saved; 
  els.keyStatus.textContent = 'Loaded from localStorage';
  // Load quota when API key is restored
  setTimeout(refreshQuotaUsage, 100);
}

// Event listeners for mode switching
els.modeImageEdit.addEventListener('change', () => {
  if (els.modeImageEdit.checked) switchMode('image-edit');
});
els.modeTextToImage.addEventListener('change', () => {
  if (els.modeTextToImage.checked) switchMode('text-to-image');
});

// Event listener for model selection
els.modelSelect.addEventListener('change', () => {
  if (currentMode === 'text-to-image') {
    updateParametersForModel(els.modelSelect.value);
    setCurrentModel(els.modelSelect.value);
  }
});

// Initialize with image edit mode
switchMode('image-edit');

// API key management
els.saveKeyBtn.addEventListener('click', async ()=>{
  const v = els.apiKey.value.trim();
  if (!v) { els.keyStatus.textContent='Enter a key first.'; return; }
  saveApiKey(v); 
  els.keyStatus.textContent='Saved ✓';
  log(`[${ts()}] Saved API key to localStorage.`);
  // Refresh quota usage when API key is saved
  await refreshQuotaUsage();
});

els.forgetKeyBtn.addEventListener('click', ()=>{ 
  removeApiKey(); 
  els.apiKey.value=''; 
  els.keyStatus.textContent='Removed from localStorage';
  log(`[${ts()}] Removed API key from localStorage.`);
  // Hide quota counter when API key is removed
  hideQuotaCounter();
});

// Reveal/Hide API key
els.revealKeyBtn.addEventListener('click', ()=>{
  const isPwd = els.apiKey.type === 'password';
  els.apiKey.type = isPwd ? 'text' : 'password';
  els.revealKeyBtn.textContent = isPwd ? 'Hide' : 'Show';
  els.revealKeyBtn.setAttribute('aria-pressed', String(isPwd));
});

// Image preview
els.imgInput.addEventListener('change', async (e)=>{
  const f = e.target.files?.[0];
  if (!f) { 
    els.imgThumb.innerHTML = '<span class="muted">No image selected</span>'; 
    setSourceImage(null, null); 
    return; 
  }
  
  const mime = f.type || 'image/png';
  const url = URL.createObjectURL(f);
  els.imgThumb.innerHTML = `<img src="${url}" alt="source"/>`;
  log(`[${ts()}] Reading file: ${f.name}`);
  const b64 = await fileToBase64(f);
  // Strip data URL header; API expects pure base64 string
  const b64Data = b64.split(',')[1];
  setSourceImage(b64Data, mime);
  log(`[${ts()}] Image ready (Base64 in memory).`);
  
  // After image loads, if Auto preset selected compute dims
  if (els.resolutionPreset && els.resolutionPreset.value === 'auto') {
    await computeAndDisplayAutoDims(url);
  }
});

// Resolution preset handling
if (els.resolutionPreset){
  els.resolutionPreset.addEventListener('change', applyPreset);
  applyPreset(); // initialize
}

// Generation timing and title management
let genTimer = null; 
let genStart = 0;
let _originalTitle = document.title || 'Chutes Image UI';
let _doneTimer = null;
let _audioEl = null;

function ensureAudio() {
  if (_audioEl) return _audioEl;
  try {
    _audioEl = new Audio('./audio/completed.ogg');
    _audioEl.preload = 'auto';
  } catch (e) {
    _audioEl = null;
  }
  return _audioEl;
}

function startGenerationTitle() {
  // If a done timer was running, cancel it so title stays as generating
  if (_doneTimer) { clearTimeout(_doneTimer); _doneTimer = null; }
  // Save original title once
  if (!_originalTitle) _originalTitle = document.title || 'Chutes Image UI';
  document.title = `Generating... - ${_originalTitle.replace(/ - Chutes Image UI$/,'') ? 'Chutes Image UI' : 'Chutes Image UI'}`;
}

function generationComplete() {
  // Play audio (non-blocking)
  const audio = ensureAudio();
  if (audio) {
    // Attempt to play; browsers may block autoplay until user interacted
    const p = audio.play();
    if (p && p.catch) p.catch(()=>{});
  }

  // Update title to done
  if (_doneTimer) { clearTimeout(_doneTimer); _doneTimer = null; }
  const base = 'Chutes Image UI';
  document.title = `Generation done! - ${base}`;
  // After 30s, restore original title unless a new generation has started
  _doneTimer = setTimeout(()=>{
    document.title = _originalTitle || base;
    _doneTimer = null;
  }, 30000);
}

function setBusy(state, msg='Working…'){
  els.generateBtn.disabled = state; 
  els.downloadBtn.disabled = state || !hasResultImg(); 
  els.copyBtn.disabled = state || !hasResultImg();
  
  if (state) {
    els.runStatus.className = 'muted loading';
    genStart = performance.now();
    const update = ()=>{
      const secs = (performance.now() - genStart) / 1000;
      els.runStatus.textContent = `${msg} ${secs.toFixed(2)}s`;
    };
    update();
    if (genTimer) clearInterval(genTimer);
    genTimer = setInterval(update, 50);
    // Update page title to reflect generation in progress
    startGenerationTitle();
  } else {
    if (genTimer) { clearInterval(genTimer); genTimer = null; }
    els.runStatus.className = 'muted';
    els.runStatus.textContent = '';
    // When clearing busy state we don't automatically change the title here
    // generationComplete() will handle the success case and title/audio.
  }
}

// Generate call
els.generateBtn.addEventListener('click', async ()=>{
  try{
    const key = (els.apiKey.value || '').trim();
    if (!key) { 
      toast('Add your API key first', true); 
      els.keyStatus.textContent='API key required'; 
      els.keyStatus.classList.add('error'); 
      els.apiKey.focus(); 
      return; 
    }
    
    // Check source image requirement based on mode
    if (currentMode === 'image-edit' && !sourceB64) {
      return toast('Select a source image for image editing', true);
    }
    
    // Resolve width/height depending on preset and model
    let width, height;
    const config = currentMode === 'text-to-image' ? MODEL_CONFIGS[currentModel] : null;
    
    // Standard width/height handling
    if (els.resolutionPreset){
      const preset = els.resolutionPreset.value;
      if (preset === 'auto' && currentMode === 'image-edit'){
        if (!autoDimsCache){
          const srcUrl = lastSourceObjectUrl();
          if (srcUrl){
            await computeAndDisplayAutoDims(srcUrl);
          }
        }
        if (autoDimsCache){ width = autoDimsCache.w; height = autoDimsCache.h; }
      } else if (preset && PRESETS[preset]){
        width = PRESETS[preset].w; height = PRESETS[preset].h;
      } else if (preset !== 'auto' && preset !== 'custom' && preset.includes('x')) { 
        // Handle resolution presets like "1024x1024"
        const [w, h] = preset.split('x').map(Number);
        width = w; height = h;
      }
    }
    if (!width || !height){
      // fallback to manual/custom values
      const widthIn = clamp(parseInt(els.width.value||'1024',10), 128, 2048);
      const heightIn = clamp(parseInt(els.height.value||'1024',10), 128, 2048);
      width = snap(widthIn, 64, 128, 2048);
      height = snap(heightIn, 64, 128, 2048);
    }
    
    if (els.autoDims && els.resolutionPreset && els.resolutionPreset.value==='auto' && currentMode === 'image-edit'){
      els.autoDims.textContent = `Auto: ${width} × ${height}`;
    }
    
    // Get model-specific parameters
    let body;
    let endpoint;
    
    if (currentMode === 'image-edit') {
      // Original image editing logic
      const steps = clamp(parseInt(els.steps.value||'50',10), 5, 100);
      const cfg = clamp(parseFloat(els.cfg.value||'4'), 0, 10);
      const seedVal = els.seed.value === '' ? null : clamp(parseInt(els.seed.value,10), 0, 4294967295);
      const prompt = els.prompt.value.trim(); 
      if (!prompt) return toast('Prompt cannot be empty', true);
      const negative_prompt = els.negPrompt.value.trim();

      // Build FLAT body (endpoint expects top-level fields)
      body = {
        width,
        height,
        prompt,
        image_b64: sourceB64,
        true_cfg_scale: cfg,
        num_inference_steps: steps
      };
      if (negative_prompt) body.negative_prompt = negative_prompt;
      if (seedVal !== null && !Number.isNaN(seedVal)) body.seed = seedVal;
      
      endpoint = 'https://chutes-qwen-image-edit.chutes.ai/generate';
    } else {
      // Text-to-image generation
      const prompt = els.prompt.value.trim(); 
      if (!prompt) return toast('Prompt cannot be empty', true);
      const negative_prompt = els.negPrompt.value.trim();
      
      if (!config) return toast('Invalid model selected', true);
      
      // Build body with model-specific parameter names
      body = { 
        prompt,
        width,
        height
      };
      
      // Add model-specific parameters with correct names
      if (config.params.cfg) {
        body.cfg = parseFloat(els.cfg.value);
      } else if (config.params.guidance_scale || config.params.true_cfg_scale) {
        body.guidance_scale = parseFloat(els.cfg.value);
      }
      
      if (config.params.steps) {
        body.steps = parseInt(els.steps.value);
      } else if (config.params.num_inference_steps) {
        body.num_inference_steps = parseInt(els.steps.value);
      }
      
      // Add model parameter for unified API (except for models with separate endpoints)
      if (config.modelName) {
        body.model = config.modelName;
      }
      
      // Add negative prompt if provided
      if (negative_prompt) {
        body.negative_prompt = negative_prompt;
      }
      
      // Add seed if provided
      if (els.seed.value && els.seed.value !== '') {
        const seedVal = parseInt(els.seed.value);
        if (!Number.isNaN(seedVal)) {
          body.seed = seedVal;
        }
      }
      
      // Add additional parameters if they exist in the model config
      if (config.params.sampler && config.params.sampler.default) {
        body.sampler = config.params.sampler.default;
      }
      
      if (config.params.scheduler && config.params.scheduler.default) {
        body.scheduler = config.params.scheduler.default;
      }
      
      endpoint = config.endpoint;
    }

    setBusy(true, 'Generating…');
    log(`[${ts()}] Sending request to ${currentMode === 'image-edit' ? 'Qwen Image Edit' : config.name}…`);
    log(`[${ts()}] Request body: ${JSON.stringify(body, (key, value) => (key === 'image_b64' && typeof value === 'string') ? `${value.substring(0, 40)}...[truncated]` : value, 2)}`);
    
    const t0 = performance.now();
    const blob = await generateImage(endpoint, key, body);

    // Display
    if (lastBlobUrl) URL.revokeObjectURL(lastBlobUrl);
    const newBlobUrl = URL.createObjectURL(blob);
    setLastBlobUrl(newBlobUrl);
    createResultImg(newBlobUrl);
    els.downloadBtn.disabled = false; 
    els.copyBtn.disabled = false;
    const dt = ((performance.now()-t0)/1000).toFixed(1);
    els.outMeta.textContent = `Output ${blob.type || 'image/jpeg'} • ${(blob.size/1024).toFixed(0)} KB • ${dt}s`;
    toast('Done ✓');
    log(`[${ts()}] Done ✓`);
    
    // Save to image history
    const imageSettings = {
      prompt: body.prompt,
      negativePrompt: body.negative_prompt || '',
      width: body.width,
      height: body.height,
      cfgScale: body.cfg || body.guidance_scale || body.true_cfg_scale,
      steps: body.steps || body.num_inference_steps,
      seed: body.seed
    };
    await saveGeneratedImage(blob, imageSettings);
    
    // Refresh quota usage after successful generation
    await refreshQuotaUsage();
    // Signal generation completed (title + audio)
    generationComplete();
  } catch(err){
    console.error(err);
    toast(err.message || String(err), true);
  } finally{
    setBusy(false);
  }
});

// Download and copy functionality
els.downloadBtn.addEventListener('click', ()=>{
  if (!hasResultImg()) return;
  const img = getResultImgElement();
  const prefix = currentMode === 'image-edit' ? 'qwen-edit' : `${currentModel}-gen`;
  const a = document.createElement('a'); 
  a.href = img.src; 
  a.download = `${prefix}-${Date.now()}.jpg`; 
  a.click();
});

els.copyBtn.addEventListener('click', async ()=>{
  if (!hasResultImg()) return;
  const img = getResultImgElement();
  const res = await fetch(img.src); 
  const blob = await res.blob();
  
  // Try multiple clipboard methods with fallbacks
  let success = false;
  let method = '';
  
  // Method 1: Modern clipboard API with image blob - try multiple MIME types
  if (!success && navigator.clipboard && navigator.clipboard.write) {
    const mimeTypes = [blob.type, 'image/png', 'image/jpeg'];
    
    for (const mimeType of mimeTypes) {
      if (success) break;
      try {
        // For non-matching MIME types, convert the blob
        let targetBlob = blob;
        if (mimeType !== blob.type) {
          // Convert image to target format using canvas
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const tempImg = new Image();
          
          await new Promise((resolve, reject) => {
            tempImg.onload = resolve;
            tempImg.onerror = reject;
            tempImg.src = img.src;
          });
          
          canvas.width = tempImg.naturalWidth;
          canvas.height = tempImg.naturalHeight;
          ctx.drawImage(tempImg, 0, 0);
          
          targetBlob = await new Promise(resolve => {
            canvas.toBlob(resolve, mimeType, 0.95);
          });
        }
        
        await navigator.clipboard.write([new ClipboardItem({ [mimeType]: targetBlob })]);
        success = true;
        method = 'image';
        console.log(`Successfully copied image using MIME type: ${mimeType}`);
        break;
      } catch(e) {
        console.log(`ClipboardItem method failed with ${mimeType}:`, e.message);
      }
    }
  }
  
  // Method 2: Try copying image using different ClipboardItem approach
  if (!success && navigator.clipboard && navigator.clipboard.write) {
    try {
      // Some browsers prefer this syntax
      const clipboardItem = new ClipboardItem({
        'image/png': blob.type === 'image/png' ? blob : new Promise(async (resolve) => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const tempImg = new Image();
          
          tempImg.onload = () => {
            canvas.width = tempImg.naturalWidth;
            canvas.height = tempImg.naturalHeight;
            ctx.drawImage(tempImg, 0, 0);
            canvas.toBlob(resolve, 'image/png', 0.95);
          };
          tempImg.src = img.src;
        })
      });
      
      await navigator.clipboard.write([clipboardItem]);
      success = true;
      method = 'image';
      console.log('Successfully copied image using Promise-based ClipboardItem');
    } catch(e) {
      console.log('Promise-based ClipboardItem method failed:', e.message);
    }
  }
  
  // Method 3: Clipboard API with image URL (avoid data URL fallback for now)
  if (!success && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(img.src);
      success = true;
      method = 'URL';
    } catch(e) {
      console.log('URL clipboard method failed:', e.message);
    }
  }
  
  // Method 4: Legacy execCommand fallback with image URL
  if (!success) {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = img.src;
      document.body.appendChild(textarea);
      textarea.select();
      const result = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (result) {
        success = true;
        method = 'legacy URL';
      }
    } catch(e) {
      console.log('Legacy execCommand method failed:', e.message);
    }
  }
  
  // Show appropriate message
  if (success) {
    if (method === 'image') {
      toast('Image copied to clipboard ✓');
    } else if (method === 'URL' || method === 'legacy URL') {
      toast('Image URL copied to clipboard ✓');
    } else {
      toast('Copied to clipboard ✓');
    }
  } else {
    toast('Clipboard copy failed - try right-click and copy image instead', true);
  }
});

// Drag & drop support for source image
['dragenter','dragover'].forEach(ev=>{
  els.imgThumb.addEventListener(ev, (e)=>{ 
    e.preventDefault(); 
    e.stopPropagation(); 
    els.imgThumb.classList.add('drop-hover'); 
  });
});
['dragleave','dragend','drop'].forEach(ev=>{
  els.imgThumb.addEventListener(ev, (e)=>{ 
    e.preventDefault(); 
    e.stopPropagation(); 
    els.imgThumb.classList.remove('drop-hover'); 
  });
});
els.imgThumb.addEventListener('drop', async (e)=>{
  const f = e.dataTransfer?.files?.[0];
  await handleImageFile(f);
});

// Clear API key error hint upon typing/saving
els.apiKey.addEventListener('input', ()=>{
  if (els.keyStatus.classList.contains('error')) { 
    els.keyStatus.classList.remove('error'); 
    els.keyStatus.textContent=''; 
  }
});
els.saveKeyBtn.addEventListener('click', ()=>{ 
  els.keyStatus.classList.remove('error'); 
});

// Setup slider event listeners and initial sync
els.cfg.addEventListener('input', sync); 
els.steps.addEventListener('input', sync); 
sync();

// Image History System
async function migrateLocalStorageToIdb() {
  try {
    const raw = localStorage.getItem('chutes_image_history');
    if (!raw) return;
    const history = JSON.parse(raw || '[]');
    let changed = false;
    for (const entry of history) {
      // If entry already references imageKey, skip
      if (entry.imageKey) continue;
      // If there's an inlined imageData, move it to IDB
      if (entry.imageData && typeof entry.imageData === 'string' && entry.imageData.startsWith('data:')) {
        const blob = dataURLToBlob(entry.imageData);
        const imageKey = `${entry.id}:img`;
        try { 
          await idbPutBlob(imageKey, blob, blob.type); 
          entry.imageKey = imageKey; 
          delete entry.imageData; 
          changed = true; 
        } catch (e) { 
          console.warn('Migration image put failed', e); 
        }
      }
      if (entry.sourceImageData && typeof entry.sourceImageData === 'string' && entry.sourceImageData.startsWith('data:')) {
        const sblob = dataURLToBlob(entry.sourceImageData);
        const sourceKey = `${entry.id}:src`;
        try { 
          await idbPutBlob(sourceKey, sblob, sblob.type); 
          entry.sourceKey = sourceKey; 
          delete entry.sourceImageData; 
          changed = true; 
        } catch (e) { 
          console.warn('Migration source put failed', e); 
        }
      }
    }
    if (changed) {
      // Save updated metadata back to localStorage (or to IDB later if migrating metadata)
      saveImageHistory(history);
      console.log('Migrated some images to IndexedDB');
    }
  } catch (e) {
    console.warn('Migration failed', e);
  }
}

async function saveGeneratedImage(imageBlob, settings) {
  const id = Date.now() + Math.random().toString(36).substr(2, 9);
  const imageKey = `${id}:img`;
  const sourceKey = sourceB64 ? `${id}:src` : null;

  // Save blobs to IDB first
  try {
    await idbPutBlob(imageKey, imageBlob, imageBlob.type || 'image/jpeg');
    if (sourceKey) {
      // convert sourceB64 data to blob
      const srcDataUrl = `data:${sourceMime};base64,${sourceB64}`;
      const srcBlob = dataURLToBlob(srcDataUrl);
      await idbPutBlob(sourceKey, srcBlob, srcBlob.type || 'image/jpeg');
    }
  } catch (e) {
    console.warn('Failed to store images in IndexedDB, falling back to localStorage for image data', e);
    // On failure, fall back to inlining base64 in metadata (older behavior)
    const reader = new FileReader();
    reader.onload = function() {
      const history = getImageHistory();
      const imageData = {
        id,
        imageData: reader.result,
        sourceImageData: sourceB64 ? `data:${sourceMime};base64,${sourceB64}` : null,
        settings: {
          mode: currentMode,
          model: currentMode === 'text-to-image' ? currentModel : 'qwen-image-edit',
          prompt: settings.prompt,
          negativePrompt: settings.negativePrompt || '',
          width: settings.width,
          height: settings.height,
          cfgScale: settings.cfgScale,
          steps: settings.steps,
          seed: settings.seed
        },
        timestamp: Date.now(),
        filename: `${currentMode === 'image-edit' ? 'qwen-edit' : currentModel}-${Date.now()}`
      };
      history.unshift(imageData);
      if (history.length > 50) history.splice(50);
      saveImageHistory(history);
      refreshImageGrid();
      log(`[${ts()}] Image saved to history (fallback localStorage)`);
    };
    reader.readAsDataURL(imageBlob);
    return;
  }

  // Prepare metadata entry
  const meta = {
    id,
    imageKey,
    sourceKey,
    settings: {
      mode: currentMode,
      model: currentMode === 'text-to-image' ? currentModel : 'qwen-image-edit',
      prompt: settings.prompt,
      negativePrompt: settings.negativePrompt || '',
      width: settings.width,
      height: settings.height,
      cfgScale: settings.cfgScale,
      steps: settings.steps,
      seed: settings.seed
    },
    timestamp: Date.now(),
    filename: `${currentMode === 'image-edit' ? 'qwen-edit' : currentModel}-${Date.now()}`
  };

  const history = getImageHistory();
  history.unshift(meta);
  if (history.length > 50) history.splice(50);
  // Try to save metadata into IDB meta store; fall back to localStorage
  try {
    await idbPutMeta(meta);
    // Also update localStorage summary list (simple array) for quick sync
    const ls = getImageHistory();
    ls.unshift(meta);
    if (ls.length > 50) ls.splice(50);
    saveImageHistory(ls);
  } catch (e) {
    // If IDB meta store isn't available, persist metadata to localStorage
    saveImageHistory(history);
  }
  refreshImageGrid();
  log(`[${ts()}] Image saved to history (IndexedDB)`);
}

async function deleteImageFromHistory(imageId) {
  const history = getImageHistory();
  const entry = history.find(img => img.id === imageId);
  if (entry) {
    if (entry.imageKey) await idbDelete(entry.imageKey).catch(()=>{});
    if (entry.sourceKey) await idbDelete(entry.sourceKey).catch(()=>{});
  }
  const newHistory = history.filter(img => img.id !== imageId);
  // Remove metadata from IDB meta store if present
  try {
    await idbDeleteMeta(imageId).catch(()=>{});
    // Also update localStorage snapshot
    saveImageHistory(newHistory);
  } catch (e) {
    saveImageHistory(newHistory);
  }
  refreshImageGrid();
}

async function clearImageHistory() {
  // Remove metadata
  const history = await idbGetAllMeta().catch(() => getImageHistory());
  for (const img of history) {
    if (img.imageKey) await idbDelete(img.imageKey).catch(()=>{});
    if (img.sourceKey) await idbDelete(img.sourceKey).catch(()=>{});
    if (img.id) await idbDeleteMeta(img.id).catch(()=>{});
  }
  try { await idbClearMeta(); } catch(e){}
  localStorage.removeItem('chutes_image_history');
  refreshImageGrid();
  toast('Image history cleared');
}

let selectionMode = false;
let selectedImages = new Set();

function toggleSelectionMode() {
  selectionMode = !selectionMode;
  selectedImages.clear();
  
  const grid = document.getElementById('imageGrid');
  const toggleBtn = document.getElementById('toggleSelectionBtn');
  const selectAllBtn = document.getElementById('selectAllBtn');
  const selectNoneBtn = document.getElementById('selectNoneBtn');
  const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
  
  if (selectionMode) {
    grid.classList.add('selection-mode');
    toggleBtn.innerHTML = '<span id="selectionIcon">☑</span> Cancel';
    selectAllBtn.style.display = 'inline-block';
    selectNoneBtn.style.display = 'inline-block';
    deleteSelectedBtn.style.display = 'inline-block';
  } else {
    grid.classList.remove('selection-mode');
    toggleBtn.innerHTML = '<span id="selectionIcon">☐</span> Select';
    selectAllBtn.style.display = 'none';
    selectNoneBtn.style.display = 'none';
    deleteSelectedBtn.style.display = 'none';
  }
  
  updateSelectionUI();
}

function updateSelectionUI() {
  const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
  deleteSelectedBtn.disabled = selectedImages.size === 0;
  deleteSelectedBtn.textContent = `Delete Selected (${selectedImages.size})`;
}

function selectAllImages() {
  const images = document.querySelectorAll('.image-grid-item');
  selectedImages.clear();
  images.forEach(item => {
    const imageId = item.dataset.imageId;
    if (imageId) {
      selectedImages.add(imageId);
      item.classList.add('selected');
      const checkbox = item.querySelector('.checkbox');
      if (checkbox) checkbox.classList.add('checked');
    }
  });
  updateSelectionUI();
}

function selectNoneImages() {
  selectedImages.clear();
  document.querySelectorAll('.image-grid-item').forEach(item => {
    item.classList.remove('selected');
    const checkbox = item.querySelector('.checkbox');
    if (checkbox) checkbox.classList.remove('checked');
  });
  updateSelectionUI();
}

async function deleteSelectedImages() {
  if (selectedImages.size === 0) return;
  
  if (!confirm(`Delete ${selectedImages.size} selected image(s)? This cannot be undone.`)) {
    return;
  }
  
  // Get all metadata to find entries to delete
  let allHistory = [];
  try {
    const idbMeta = await idbGetAllMeta();
    if (idbMeta && idbMeta.length) {
      allHistory = idbMeta;
    } else {
      allHistory = getImageHistory();
    }
  } catch (e) {
    allHistory = getImageHistory();
  }

  // Delete blobs and metadata from IDB for selected images
  for (const imageId of selectedImages) {
    const entry = allHistory.find(img => img.id === imageId);
    if (entry) {
      if (entry.imageKey) await idbDelete(entry.imageKey).catch(()=>{});
      if (entry.sourceKey) await idbDelete(entry.sourceKey).catch(()=>{});
      await idbDeleteMeta(imageId).catch(()=>{});
    }
  }

  // Also update localStorage snapshot
  const history = getImageHistory();
  const newHistory = history.filter(img => !selectedImages.has(img.id));
  saveImageHistory(newHistory);

  // Capture count before clearing the selection set
  const deletedCount = selectedImages.size;

  selectedImages.clear();
  refreshImageGrid();
  toast(`Deleted ${deletedCount} image(s)`);

  if (selectionMode) {
    toggleSelectionMode(); // Exit selection mode
  }
}

function refreshImageGrid() {
  const grid = document.getElementById('imageGrid');
  // First try to load metadata from IndexedDB meta store
  (async () => {
    let history = [];
    try {
      const idbMeta = await idbGetAllMeta();
      if (idbMeta && idbMeta.length) {
        history = idbMeta.sort((a,b) => b.timestamp - a.timestamp);
      } else {
        // Fallback to localStorage metadata
        history = getImageHistory();
      }
    } catch (e) {
      console.warn('Failed to read metadata from IDB, falling back', e);
      history = getImageHistory();
    }

    if (!history || history.length === 0) {
      grid.innerHTML = '<div class="empty-state"><span class="muted">No images generated yet. Create your first image to see it here!</span></div>';
      document.getElementById('toggleSelectionBtn').style.display = 'none';
      return;
    }

    document.getElementById('toggleSelectionBtn').style.display = 'inline-block';

    // Render grid items with placeholders; if metadata includes imageKey, load blob async
    grid.innerHTML = history.map(img => `
      <div class="image-grid-item" data-image-id="${img.id}" onclick="openImageModal('${img.id}')">
        <div class="checkbox" onclick="event.stopPropagation(); toggleImageSelection('${img.id}')"></div>
        <img data-image-id-src="${img.imageKey || ''}" src="${img.imageData || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='}" alt="Generated image" loading="lazy" />
        <div class="overlay">
          <div style="font-weight: 600;">${img.settings.model}</div>
          <div style="opacity: 0.8;">${img.settings.width}×${img.settings.height}</div>
          <div style="opacity: 0.8; font-size: 11px;">${new Date(img.timestamp).toLocaleDateString()}</div>
        </div>
      </div>
    `).join('');

    // After rendering, asynchronously replace images that have imageKey
    history.forEach(async (img) => {
      if (!img.imageKey) return; // already inlined or fallback
      try {
        const itemEl = document.querySelector(`.image-grid-item[data-image-id="${img.id}"]`);
        if (itemEl) itemEl.classList.add('loading-thumb');
        const blob = await idbGetBlob(img.imageKey);
        if (!blob) { if (itemEl) itemEl.classList.remove('loading-thumb'); return; }
        const objectUrl = URL.createObjectURL(blob);
        const imgEl = document.querySelector(`img[data-image-id-src="${img.imageKey}"]`);
        if (imgEl) imgEl.src = objectUrl;
        if (itemEl) itemEl.classList.remove('loading-thumb');
      } catch (e) {
        console.warn('Failed to load image blob for', img.id, e);
        const itemEl = document.querySelector(`.image-grid-item[data-image-id="${img.id}"]`);
        if (itemEl) itemEl.classList.remove('loading-thumb');
      }
    });
  })();
}

function toggleImageSelection(imageId) {
  if (!selectionMode) return;
  
  const item = document.querySelector(`[data-image-id="${imageId}"]`);
  const checkbox = item.querySelector('.checkbox');
  
  if (selectedImages.has(imageId)) {
    selectedImages.delete(imageId);
    item.classList.remove('selected');
    checkbox.classList.remove('checked');
  } else {
    selectedImages.add(imageId);
    item.classList.add('selected');
    checkbox.classList.add('checked');
  }
  
  updateSelectionUI();
}

// Modal functionality integration
function loadModalSettings() {
  const currentModalImage = getCurrentModalImage();
  if (!currentModalImage) return;
  
  const settings = currentModalImage.settings;
  
  // Set mode
  if (settings.mode === 'image-edit') {
    els.modeImageEdit.checked = true;
    els.modeTextToImage.checked = false;
    switchMode('image-edit');
  } else {
    els.modeImageEdit.checked = false;
    els.modeTextToImage.checked = true;
    switchMode('text-to-image');
    // Set model for text-to-image
    els.modelSelect.value = settings.model;
    setCurrentModel(settings.model);
    updateParametersForModel(settings.model);
  }
  
  // Load settings
  els.prompt.value = settings.prompt || '';
  els.negPrompt.value = settings.negativePrompt || '';
  els.width.value = settings.width || 1024;
  els.height.value = settings.height || 1024;
  els.cfg.value = settings.cfgScale || 4;
  els.steps.value = settings.steps || 50;
  els.seed.value = settings.seed || '';
  
  // Set resolution preset dropdown to match the loaded dimensions
  const matchingPreset = findPresetForDimensions(settings.width || 1024, settings.height || 1024, settings.mode);
  if (els.resolutionPreset) {
    els.resolutionPreset.value = matchingPreset;
    // If it's custom, we need to enable the width/height inputs
    if (matchingPreset === 'custom') {
      toggleDimInputs(true);
      if (els.autoDims) els.autoDims.style.display = 'none';
    } else {
      // Apply preset logic to update UI state
      applyPreset();
    }
  }
  
  // Update UI
  sync();
  
  // Load source image if available
  if (settings.mode === 'image-edit') {
    if (currentModalImage.sourceImageData) {
      els.imgThumb.innerHTML = `<img src="${currentModalImage.sourceImageData}" alt="source"/>`;
      setSourceImage(currentModalImage.sourceImageData.split(',')[1], 'image/jpeg');
    } else if (currentModalImage.sourceKey) {
      // fetch blob from IDB and create object URL
      idbGetBlob(currentModalImage.sourceKey).then(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        els.imgThumb.innerHTML = `<img src="${url}" alt="source"/>`;
        // Also prepare base64 for API by reading blob (async)
        const r = new FileReader(); 
        r.onload = () => { 
          setSourceImage((r.result || '').split(',')[1], blob.type || 'image/jpeg'); 
        }; 
        r.readAsDataURL(blob);
      }).catch(e => console.warn('Failed to load source blob for modal load', e));
    }
  }
  
  closeImageModal();
  toast('Settings loaded from image');
  log(`[${ts()}] Settings loaded from saved image`);
}

function deleteModalImage() {
  const currentModalImage = getCurrentModalImage();
  if (!currentModalImage) return;
  
  if (!confirm('Delete this image? This cannot be undone.')) {
    return;
  }
  
  deleteImageFromHistory(currentModalImage.id);
  closeImageModal();
  toast('Image deleted');
}

// Event Listeners for image history
document.getElementById('toggleSelectionBtn').addEventListener('click', toggleSelectionMode);
document.getElementById('selectAllBtn').addEventListener('click', selectAllImages);
document.getElementById('selectNoneBtn').addEventListener('click', selectNoneImages);
document.getElementById('deleteSelectedBtn').addEventListener('click', deleteSelectedImages);
document.getElementById('clearHistoryBtn').addEventListener('click', () => {
  if (confirm('Clear all image history? This cannot be undone.')) {
    clearImageHistory();
  }
});

document.getElementById('closeModalBtn').addEventListener('click', closeImageModal);
document.getElementById('modalDownloadBtn').addEventListener('click', downloadModalImage);
document.getElementById('modalDownloadSourceBtn').addEventListener('click', downloadModalSourceImage);
document.getElementById('modalLoadSettingsBtn').addEventListener('click', loadModalSettings);
document.getElementById('modalDeleteBtn').addEventListener('click', deleteModalImage);

// Close modal on background click
document.getElementById('imageModal').addEventListener('click', (e) => {
  if (e.target.id === 'imageModal') {
    closeImageModal();
  }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && getCurrentModalImage()) {
    closeImageModal();
  }
});

// Initialize
initializeActivityLog();
// Run migration then refresh grid (migration is non-blocking but we want a refresh after it finishes)
migrateLocalStorageToIdb().then(() => {
  // After migration, attempt to move localStorage snapshot into IDB meta if needed
  refreshImageGrid();
}).catch(() => {
  refreshImageGrid();
});

// Global functions for HTML onclick handlers
window.toggleActivityLog = toggleActivityLog;
window.openImageModal = openImageModal;
window.toggleImageSelection = toggleImageSelection;