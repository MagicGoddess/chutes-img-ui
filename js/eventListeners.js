// Event listeners setup - centralizes all UI event bindings

import { MODEL_CONFIGS } from './models.js';
import { generateImage } from './api.js';
import { 
  getStoredApiKey, saveApiKey, removeApiKey 
} from './storage.js';
import { clamp, snap, ts, fileToBase64 } from './helpers.js';
import { PRESETS } from './imageUtils.js';
import { log, toggleActivityLog } from './activityLog.js';
import { toast } from './serviceWorker.js';
import { 
  closeImageModal, downloadModalImage, 
  downloadModalSourceImage, getCurrentModalImage 
} from './modal.js';
import {
  els, currentMode, currentModel, sourceB64, lastBlobUrl, autoDimsCache,
  setLastBlobUrl, createResultImg, hasResultImg, getResultImgElement, sync,
  switchMode, updateParametersForModel, setCurrentModel,
  lastSourceObjectUrl, computeAndDisplayAutoDims,
  applyPreset, handleImageFile, setSourceImage, setImgThumbContent
} from './ui.js';
import { refreshQuotaUsage, hideQuotaCounter } from './quota.js';
import { setBusy, generationComplete } from './generation.js';
import { 
  saveGeneratedImage, toggleSelectionMode, selectAllImages, selectNoneImages,
  deleteSelectedImages, clearImageHistory, loadModalSettings, deleteModalImage,
  toggleImageSelection
} from './imageHistory.js';

export function setupEventListeners() {
  // Initial sync of UI
  sync();
  
  // UI event listeners
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
      setImgThumbContent('<span class="muted">No image selected</span>'); 
      setSourceImage(null, null); 
      return; 
    }
    
    const mime = f.type || 'image/png';
    const url = URL.createObjectURL(f);
    setImgThumbContent(`<img src="${url}" alt="source"/>`, url);
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
  }

  // Generate button - main image generation logic
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

  // Modal event listeners
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

  // Initial sync to update UI state
  sync();
}

// Public API