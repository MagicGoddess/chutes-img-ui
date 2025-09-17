// Main entry point - wires all modules together

import { initializeServiceWorker } from './serviceWorker.js';
import { MODEL_CONFIGS, getCurrentMode, getCurrentModel, setCurrentMode, setCurrentModel } from './models.js';
import { els, sync, switchMode, updateParametersForModel, updateParametersForImageEdit, createResultImg, hasResultImg, getResultImgElement, toggleDimInputs } from './ui.js';
import { refreshQuotaUsage, hideQuotaCounter } from './api.js';
import { fileToBase64, toast, setBusy, clamp, snap, ts, startGenerationTitle, generationComplete } from './helpers.js';
import { 
  PRESETS, 
  computeAndDisplayAutoDims, 
  applyPreset, 
  lastSourceObjectUrl,
  setSourceImage,
  getSourceImage,
  clearSourceImage
} from './imageUtils.js';
import { log, toggleActivityLog, initializeActivityLog } from './activityLog.js';
import { 
  migrateLocalStorageToIdb, 
  getImageHistory, 
  saveImageHistory,
  idbGetAllMeta,
  idbPutBlob,
  idbPutMeta,
  idbDelete,
  idbDeleteMeta,
  idbClearMeta
} from './storage.js';
import { 
  openImageModal, 
  closeImageModal, 
  downloadModalImage, 
  downloadModalSourceImage, 
  loadModalSettings, 
  deleteModalImage 
} from './modal.js';

// Optional: redirect helper for some static hosts
(function(){
  try{
    var p = location.pathname; if (p === '/' && !location.href.endsWith('index.html')) {
      // no-op; most hosts serve index.html at '/'
    }
  }catch(e){}
})();

// Initialize service worker
initializeServiceWorker();

// Generation timer and tracking
let genTimer = null; 
let genStart = 0;

// Image history and selection state
let selectionMode = false;
let selectedImages = new Set();

// Initialize app state
let currentMode = 'image-edit';
let currentModel = 'hidream';

// Load saved API key
const saved = localStorage.getItem('chutes_api_key');
if (saved) { 
  els.apiKey.value = saved; 
  refreshQuotaUsage(els.apiKey); 
}

// Initialize with image edit mode
switchMode('image-edit', log);

// Event listeners for mode switching
els.modeImageEdit.addEventListener('change', () => {
  if (els.modeImageEdit.checked) switchMode('image-edit', log);
});
els.modeTextToImage.addEventListener('change', () => {
  if (els.modeTextToImage.checked) switchMode('text-to-image', log);
});

els.modelSelect.addEventListener('change', () => {
  if (getCurrentMode() === 'text-to-image') {
    updateParametersForModel(els.modelSelect.value, log);
  }
});

// API key management
els.saveKeyBtn.addEventListener('click', async ()=>{
  const v = els.apiKey.value.trim();
  if (!v) { els.keyStatus.textContent='Enter a key first.'; return; }
  localStorage.setItem('chutes_api_key', v); 
  els.keyStatus.textContent='Saved ✓';
  log(`[${ts()}] Saved API key to localStorage.`);
  // Refresh quota usage when API key is saved
  await refreshQuotaUsage(els.apiKey);
});

els.forgetKeyBtn.addEventListener('click', ()=>{ 
  localStorage.removeItem('chutes_api_key'); 
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

// Image preview handling
els.imgInput.addEventListener('change', async (e)=>{
  const f = e.target.files?.[0];
  if (!f) { 
    els.imgThumb.innerHTML = '<span class="muted">No image selected</span>'; 
    clearSourceImage(); 
    return; 
  }
  const currentSourceMime = f.type || 'image/png';
  const url = URL.createObjectURL(f);
  els.imgThumb.innerHTML = `<img src="${url}" alt="source"/>`;
  log(`[${ts()}] Reading file: ${f.name}`);
  const b64 = await fileToBase64(f);
  // Strip data URL header; API expects pure base64 string
  const currentSourceB64 = b64.split(',')[1];
  setSourceImage(currentSourceB64, currentSourceMime, url);
  
  // Auto-resize if in "auto" preset mode
  if (els.resolutionPreset && els.resolutionPreset.value === 'auto') {
    await computeAndDisplayAutoDims(url, els, log);
  }
  log(`[${ts()}] Image ready: ${f.name}, ${f.size} bytes`);
});

// Resolution preset handling
if (els.resolutionPreset){
  els.resolutionPreset.addEventListener('change', () => applyPreset(els, toggleDimInputs, log));
  applyPreset(els, toggleDimInputs, log); // initialize
}

// Slider sync
els.cfg.addEventListener('input', sync); 
els.steps.addEventListener('input', sync); 
sync();

// Generate button - main generation logic
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
    
    const { sourceB64: currentSourceB64 } = getSourceImage();
    
    // Check source image requirement based on mode
    if (getCurrentMode() === 'image-edit' && !currentSourceB64) {
      return toast('Select a source image for image editing', true);
    }
    
    // Resolve width/height depending on preset and model
    let width, height;
    const config = getCurrentMode() === 'text-to-image' ? MODEL_CONFIGS[getCurrentModel()] : null;
    
    // Standard width/height handling
    if (els.resolutionPreset){
      const preset = els.resolutionPreset.value;
      if (preset === 'auto' && getCurrentMode() === 'image-edit'){
        // Get auto dimensions from cache or compute them
        const srcUrl = lastSourceObjectUrl(els);
        if (srcUrl) {
          await computeAndDisplayAutoDims(srcUrl, els, log);
        }
        // Use the computed dimensions
        width = parseInt(els.width.value);
        height = parseInt(els.height.value);
      } else if (preset && PRESETS[preset]){
        width = PRESETS[preset].w; 
        height = PRESETS[preset].h;
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
    
    // Get model-specific parameters
    let body;
    let endpoint;
    
    if (getCurrentMode() === 'image-edit') {
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
        image_b64: currentSourceB64,
        true_cfg_scale: cfg,
        num_inference_steps: steps
      };
      if (negative_prompt) body.negative_prompt = negative_prompt;
      if (seedVal !== null && !Number.isNaN(seedVal)) body.seed = seedVal;
      
      endpoint = 'https://chutes-qwen-image-edit.chutes.ai/generate';
    } else {
      // Text-to-image logic using selected model
      const modelConfig = MODEL_CONFIGS[getCurrentModel()];
      const steps = clamp(parseInt(els.steps.value||'50',10), 
        modelConfig.params.num_inference_steps?.min || 1, 
        modelConfig.params.num_inference_steps?.max || 100);
      const cfg = clamp(parseFloat(els.cfg.value||'7.5'), 
        modelConfig.params.guidance_scale?.min || modelConfig.params.true_cfg_scale?.min || 1, 
        modelConfig.params.guidance_scale?.max || modelConfig.params.true_cfg_scale?.max || 20);
      const seedVal = els.seed.value === '' ? null : clamp(parseInt(els.seed.value,10), 0, 4294967295);
      const prompt = els.prompt.value.trim(); 
      if (!prompt) return toast('Prompt cannot be empty', true);
      const negative_prompt = els.negPrompt.value.trim();

      body = {
        width,
        height,
        prompt
      };
      
      // Add model-specific parameters
      if (modelConfig.params.guidance_scale) {
        body.guidance_scale = cfg;
      } else if (modelConfig.params.true_cfg_scale) {
        body.true_cfg_scale = cfg;
      }
      
      body.num_inference_steps = steps;
      
      if (negative_prompt && modelConfig.params.negative_prompt) {
        body.negative_prompt = negative_prompt;
      }
      if (seedVal !== null && !Number.isNaN(seedVal)) {
        body.seed = seedVal;
      }
      
      // Add model name if required
      if (modelConfig.modelName) {
        body.model = modelConfig.modelName;
      }
      
      endpoint = modelConfig.endpoint;
    }
    
    // Update UI state
    setBusy(true, 'Generating…');
    startGenerationTitle();
    
    genStart = Date.now();
    genTimer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - genStart) / 1000);
      setBusy(true, `Generating… ${elapsed}s`);
    }, 1000);
    
    log(`[${ts()}] Starting generation with ${getCurrentMode()} mode`);
    
    // Make API request
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    
    clearInterval(genTimer);
    genTimer = null;
    
    if (!response.ok) {
      setBusy(false);
      const errorText = await response.text().catch(() => 'Unknown error');
      log(`[${ts()}] Generation failed: ${response.status} ${errorText}`);
      return toast(`Generation failed: ${response.status}`, true);
    }
    
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    
    // Display result
    createResultImg(url);
    els.downloadBtn.disabled = false;
    els.copyBtn.disabled = false;
    
    const elapsed = Math.floor((Date.now() - genStart) / 1000);
    els.outMeta.textContent = `Generated in ${elapsed}s • ${(blob.size/1024).toFixed(1)}KB`;
    
    setBusy(false);
    generationComplete();
    
    log(`[${ts()}] Generation complete: ${elapsed}s, ${(blob.size/1024).toFixed(1)}KB`);
    
    // Save to history
    await saveGeneratedImage(blob, {
      mode: getCurrentMode(),
      model: getCurrentMode() === 'text-to-image' ? getCurrentModel() : 'qwen-image-edit',
      prompt: els.prompt.value.trim(),
      negativePrompt: els.negPrompt.value.trim(),
      width,
      height,
      cfgScale: parseFloat(els.cfg.value),
      steps: parseInt(els.steps.value),
      seed: els.seed.value || null
    });
    
    // Refresh quota
    await refreshQuotaUsage(els.apiKey);
    
  } catch (error) {
    clearInterval(genTimer);
    genTimer = null;
    setBusy(false);
    log(`[${ts()}] Generation error: ${error.message}`);
    toast(`Generation failed: ${error.message}`, true);
  }
});

// Download and copy functionality
els.downloadBtn.addEventListener('click', ()=>{
  if (!hasResultImg()) return;
  const img = getResultImgElement();
  const prefix = getCurrentMode() === 'image-edit' ? 'qwen-edit' : `${getCurrentModel()}-gen`;
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
  
  // Method 1: Modern clipboard API with image blob
  if (!success && navigator.clipboard && navigator.clipboard.write) {
    try {
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      success = true;
      method = 'clipboard.write';
    } catch (e) {
      console.log('clipboard.write failed, trying fallback');
    }
  }
  
  if (success) {
    toast(`✅ Image copied to clipboard (${method})`);
    log(`[${ts()}] Image copied to clipboard using ${method}`);
  } else {
    toast('❌ Failed to copy image to clipboard', true);
    log(`[${ts()}] Failed to copy image to clipboard`);
  }
});

// Drag and drop for image input
['dragenter', 'dragover'].forEach(ev => {
  els.imgThumb.addEventListener(ev, (e)=>{ 
    e.preventDefault(); 
    e.stopPropagation(); 
    els.imgThumb.classList.add('drop-hover'); 
  });
});
['dragleave', 'drop'].forEach(ev => {
  els.imgThumb.addEventListener(ev, (e)=>{ 
    e.preventDefault(); 
    e.stopPropagation(); 
    els.imgThumb.classList.remove('drop-hover'); 
  });
});

els.imgThumb.addEventListener('drop', async (e)=>{
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    els.imgInput.files = files;
    els.imgInput.dispatchEvent(new Event('change'));
  }
});

// API key input handling
els.apiKey.addEventListener('input', ()=>{
  els.keyStatus.classList.remove('error');
});
els.saveKeyBtn.addEventListener('click', ()=>{ 
  els.keyStatus.classList.remove('error'); 
});

// Image history and grid functionality
async function saveGeneratedImage(imageBlob, settings) {
  try {
    const { sourceB64: currentSourceB64, sourceMime: currentSourceMime } = getSourceImage();
    
    const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();
    const filename = `${settings.model}-gen-${timestamp}`;
    
    // Save image blob to IndexedDB
    const imageKey = `${imageId}:img`;
    await idbPutBlob(imageKey, imageBlob, imageBlob.type);
    
    // Save source image if in image-edit mode
    let sourceKey = null;
    if (settings.mode === 'image-edit' && currentSourceB64) {
      sourceKey = `${imageId}:src`;
      // Convert base64 back to blob for storage
      const sourceBlob = new Blob([
        new Uint8Array(atob(currentSourceB64).split('').map(c => c.charCodeAt(0)))
      ], { type: currentSourceMime });
      await idbPutBlob(sourceKey, sourceBlob, currentSourceMime);
    }
    
    // Create metadata entry
    const imageEntry = {
      id: imageId,
      timestamp,
      filename,
      imageKey,
      sourceKey,
      settings
    };
    
    // Save metadata to IndexedDB
    await idbPutMeta(imageEntry);
    
    // Also save to localStorage for backwards compatibility
    const history = getImageHistory();
    history.unshift(imageEntry);
    // Keep only last 50 images in localStorage
    if (history.length > 50) {
      history.length = 50;
    }
    saveImageHistory(history);
    
    refreshImageGrid();
    
  } catch (error) {
    console.warn('Failed to save generated image:', error);
    toast('Failed to save image to history', true);
  }
}

// Image grid and selection functionality
function refreshImageGrid() {
  const gridContainer = document.getElementById('imageGrid');
  if (!gridContainer) return;
  
  // Clear existing grid
  gridContainer.innerHTML = '';
  
  // Load from IndexedDB first, fallback to localStorage
  (async () => {
    let history = [];
    try {
      const idbMeta = await idbGetAllMeta();
      if (idbMeta && idbMeta.length) {
        history = idbMeta.sort((a, b) => b.timestamp - a.timestamp);
      } else {
        history = getImageHistory();
      }
    } catch (e) {
      history = getImageHistory();
    }
    
    if (history.length === 0) {
      gridContainer.innerHTML = '<p class="muted">No generated images yet.</p>';
      return;
    }
    
    history.forEach(image => {
      const gridItem = document.createElement('div');
      gridItem.className = 'grid-item';
      gridItem.dataset.imageId = image.id;
      
      const isSelected = selectedImages.has(image.id);
      if (isSelected) {
        gridItem.classList.add('selected');
      }
      
      gridItem.innerHTML = `
        <div class="image-container" onclick="openImageModal('${image.id}')">
          <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" alt="Generated image" loading="lazy">
          <div class="image-overlay">
            <div class="image-model">${image.settings.model}</div>
            <div class="image-resolution">${image.settings.width}×${image.settings.height}</div>
          </div>
        </div>
        ${selectionMode ? `<div class="selection-checkbox" onclick="toggleImageSelection('${image.id}')"><span>${isSelected ? '✓' : ''}</span></div>` : ''}
      `;
      
      gridContainer.appendChild(gridItem);
      
      // Load image asynchronously
      const img = gridItem.querySelector('img');
      if (image.imageKey) {
        // Load from IndexedDB
        idbGetBlob(image.imageKey).then(blob => {
          if (blob) {
            img.src = URL.createObjectURL(blob);
          }
        }).catch(e => {
          console.warn('Failed to load grid image:', e);
          if (image.imageData) {
            img.src = image.imageData;
          }
        });
      } else if (image.imageData) {
        img.src = image.imageData;
      }
    });
  })();
}

function toggleImageSelection(imageId) {
  if (selectedImages.has(imageId)) {
    selectedImages.delete(imageId);
  } else {
    selectedImages.add(imageId);
  }
  
  const gridItem = document.querySelector(`[data-image-id="${imageId}"]`);
  if (gridItem) {
    gridItem.classList.toggle('selected');
    const checkbox = gridItem.querySelector('.selection-checkbox span');
    if (checkbox) {
      checkbox.textContent = selectedImages.has(imageId) ? '✓' : '';
    }
  }
  
  updateSelectionUI();
}

function toggleSelectionMode() {
  selectionMode = !selectionMode;
  selectedImages.clear();
  refreshImageGrid();
  updateSelectionUI();
}

function updateSelectionUI() {
  const toggleBtn = document.getElementById('toggleSelectionBtn');
  const selectionActions = document.getElementById('selectionActions');
  const deleteBtn = document.getElementById('deleteSelectedBtn');
  
  if (toggleBtn) {
    toggleBtn.textContent = selectionMode ? 'Cancel Selection' : 'Select Images';
  }
  
  if (selectionActions) {
    selectionActions.style.display = selectionMode ? 'flex' : 'none';
  }
  
  if (deleteBtn) {
    deleteBtn.disabled = selectedImages.size === 0;
    deleteBtn.textContent = `Delete Selected (${selectedImages.size})`;
  }
}

function selectAllImages() {
  const gridItems = document.querySelectorAll('.grid-item');
  gridItems.forEach(item => {
    const imageId = item.dataset.imageId;
    selectedImages.add(imageId);
    item.classList.add('selected');
    const checkbox = item.querySelector('.selection-checkbox span');
    if (checkbox) {
      checkbox.textContent = '✓';
    }
  });
  updateSelectionUI();
}

function selectNoneImages() {
  selectedImages.clear();
  document.querySelectorAll('.grid-item').forEach(item => {
    item.classList.remove('selected');
    const checkbox = item.querySelector('.selection-checkbox span');
    if (checkbox) {
      checkbox.textContent = '';
    }
  });
  updateSelectionUI();
}

async function deleteSelectedImages() {
  if (selectedImages.size === 0) return;
  
  if (!confirm(`Delete ${selectedImages.size} selected images? This cannot be undone.`)) {
    return;
  }
  
  // Delete from IndexedDB and localStorage
  for (const imageId of selectedImages) {
    await deleteImageFromHistory(imageId);
  }
  
  selectedImages.clear();
  refreshImageGrid();
  updateSelectionUI();
  toast(`Deleted ${selectedImages.size} images`);
}

async function deleteImageFromHistory(imageId) {
  // Delete from IndexedDB
  await idbDeleteMeta(imageId);
  await idbDelete(`${imageId}:img`);
  await idbDelete(`${imageId}:src`);
  
  // Also remove from localStorage
  const history = getImageHistory();
  const newHistory = history.filter(img => img.id !== imageId);
  saveImageHistory(newHistory);
}

async function clearImageHistory() {
  if (!confirm('Clear all image history? This cannot be undone.')) {
    return;
  }
  
  // Clear IndexedDB
  await idbClearMeta();
  
  // Clear localStorage
  localStorage.removeItem('chutes_image_history');
  
  refreshImageGrid();
  toast('Image history cleared');
}

// Event listeners for image history management
document.getElementById('toggleSelectionBtn')?.addEventListener('click', toggleSelectionMode);
document.getElementById('selectAllBtn')?.addEventListener('click', selectAllImages);
document.getElementById('selectNoneBtn')?.addEventListener('click', selectNoneImages);
document.getElementById('deleteSelectedBtn')?.addEventListener('click', deleteSelectedImages);
document.getElementById('clearHistoryBtn')?.addEventListener('click', clearImageHistory);

// Modal event listeners
document.getElementById('closeModalBtn')?.addEventListener('click', closeImageModal);
document.getElementById('modalDownloadBtn')?.addEventListener('click', downloadModalImage);
document.getElementById('modalDownloadSourceBtn')?.addEventListener('click', downloadModalSourceImage);
document.getElementById('modalLoadSettingsBtn')?.addEventListener('click', () => {
  loadModalSettings(
    els, 
    (mode) => switchMode(mode, log), 
    (model) => updateParametersForModel(model, log), 
    sync, 
    () => applyPreset(els, toggleDimInputs, log), 
    toggleDimInputs,
    setCurrentModel,
    setSourceImage
  );
});
document.getElementById('modalDeleteBtn')?.addEventListener('click', () => deleteModalImage(deleteImageFromHistory));

// Close modal on background click
document.getElementById('imageModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'imageModal') {
    closeImageModal();
  }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeImageModal();
  }
});

// Initialize
initializeActivityLog();

// Run migration then refresh grid
migrateLocalStorageToIdb().then(() => {
  refreshImageGrid();
}).catch(() => {
  refreshImageGrid();
});

// Global functions for HTML onclick handlers
window.toggleActivityLog = toggleActivityLog;
window.openImageModal = (imageId) => openImageModal(imageId, idbGetAllMeta, selectionMode, toggleImageSelection);
window.toggleImageSelection = toggleImageSelection;