// Event listeners setup - centralizes all UI event bindings

import { MODEL_CONFIGS, VIDEO_MODEL_CONFIGS } from './models.js';
import { generateImage, generateVideo } from './api.js';
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
  applyPreset, handleImageFile, setSourceImage, setImgThumbContent,
  updateVideoModeUI, updateVideoParametersForModel
} from './ui.js';
import { refreshQuotaUsage, hideQuotaCounter } from './quota.js';
import { setBusy, generationComplete } from './generation.js';
import { 
  saveGeneratedImage, toggleSelectionMode, selectAllImages, selectNoneImages,
  deleteSelectedImages, clearImageHistory, loadModalSettings, deleteModalImage,
  toggleImageSelection, setHistoryFilter
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
  
  // Video generation mode listener
  if (els.modeVideoGeneration) {
    els.modeVideoGeneration.addEventListener('change', () => {
      if (els.modeVideoGeneration.checked) switchMode('video-generation');
    });
  }
  
  // Video sub-mode listeners
  if (els.videoModeText2Video) {
    els.videoModeText2Video.addEventListener('change', () => {
      if (els.videoModeText2Video.checked) {
        // Switch to text-to-video mode
        updateVideoModeUI();
      }
    });
  }
  if (els.videoModeImage2Video) {
    els.videoModeImage2Video.addEventListener('change', () => {
      if (els.videoModeImage2Video.checked) {
        // Switch to image-to-video mode
        updateVideoModeUI();
      }
    });
  }

  // Event listener for model selection
  els.modelSelect.addEventListener('change', () => {
    if (currentMode === 'text-to-image') {
      updateParametersForModel(els.modelSelect.value);
      setCurrentModel(els.modelSelect.value);
    } else if (currentMode === 'video-generation') {
      updateVideoParametersForModel(els.modelSelect.value);
      setCurrentModel(els.modelSelect.value);
      // Ensure UI reflects model capabilities (e.g., hide resolution for Wan i2v)
      updateVideoModeUI();
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
      
      // Check video generation requirements
      if (currentMode === 'video-generation') {
        const videoMode = els.videoModeImage2Video?.checked ? 'image-to-video' : 'text-to-video';
        if (videoMode === 'image-to-video' && !sourceB64) {
          return toast('Select a source image for image-to-video generation', true);
        }
      }
      
      // Resolve width/height depending on preset and model
      let width, height;
      const config = currentMode === 'text-to-image' ? MODEL_CONFIGS[currentModel] : null;
      
      // Standard width/height handling
      if (els.resolutionPreset){
        const preset = els.resolutionPreset.value;
        if (preset === 'auto') {
          if (currentMode === 'image-edit') {
            // For image edit mode, derive from source image
            if (!autoDimsCache){
              const srcUrl = lastSourceObjectUrl();
              if (srcUrl){
                await computeAndDisplayAutoDims(srcUrl);
              }
            }
            if (autoDimsCache){ width = autoDimsCache.w; height = autoDimsCache.h; }
          } else if (config && config.params.width && config.params.height) {
            // For text-to-image mode, use model defaults
            width = config.params.width.default;
            height = config.params.height.default;
          }
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
        // Image editing logic - use Qwen Image Edit defaults if inputs are empty
        const qwenEditDefaults = { steps: 50, cfg: 4 }; // Default values for Qwen Image Edit
        const steps = els.steps.value ? clamp(parseInt(els.steps.value,10), 5, 100) : qwenEditDefaults.steps;
        const cfg = els.cfg.value ? clamp(parseFloat(els.cfg.value), 0, 10) : qwenEditDefaults.cfg;
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
      } else if (currentMode === 'video-generation') {
        // Video generation logic (config-driven)
        const prompt = els.prompt.value.trim();
        if (!prompt) return toast('Prompt cannot be empty', true);

        const videoMode = els.videoModeImage2Video?.checked ? 'image-to-video' : 'text-to-video';
        const videoConfig = VIDEO_MODEL_CONFIGS[currentModel];
        if (!videoConfig) return toast('Invalid video model selected', true);

        // Select endpoint based on sub-mode
        endpoint = videoMode === 'image-to-video' ? videoConfig.endpoints.image2video : videoConfig.endpoints.text2video;

        // Build payload generically from model config
        const payload = { prompt };

        // Resolution handling per model metadata
        const includeRes = Array.isArray(videoConfig.includeResolutionIn) ? videoConfig.includeResolutionIn : ['text2video', 'image2video'];
        const modeKey = videoMode === 'image-to-video' ? 'image2video' : 'text2video';
        if (includeRes.includes(modeKey) && videoConfig.params.resolution) {
          let resStr;
          const sel = els.resolutionPreset?.value;
          if (sel && sel !== 'auto' && sel !== 'custom') {
            resStr = sel; // values in UI match model format
          } else {
            resStr = videoConfig.params.resolution.default;
          }
          // Normalize potential display variants just in case
          if (videoConfig.resolutionFormat === 'star') {
            resStr = String(resStr).replace('x', '*');
          } else if (videoConfig.resolutionFormat === 'x') {
            resStr = String(resStr).replace('*', 'x');
          }
          payload.resolution = resStr;
        }

        // Parameter mapping from config param names to UI elements
        const paramToElId = {
          guidance_scale: 'cfg',
          steps: 'steps',
          fps: 'fps',
          frames: 'frames',
          seed: 'seed',
          sample_shift: 'sampleShift',
          single_frame: 'singleFrame',
          negative_prompt: 'negPrompt'
        };

        for (const [paramName, schema] of Object.entries(videoConfig.params)) {
          if (paramName === 'resolution') continue; // handled above
          const elId = paramToElId[paramName];
          let val = null;
          if (elId && els[elId] != null && typeof els[elId].value !== 'undefined') {
            const raw = (els[elId].value || '').toString().trim();
            if (raw !== '') {
              if (paramName === 'negative_prompt') {
                val = raw;
              } else if (paramName === 'single_frame') {
                val = raw === 'true';
              } else if (schema && typeof schema.step === 'number' && String(schema.step).includes('.')) {
                // floating number
                val = parseFloat(raw);
              } else {
                // integer or generic number
                const n = Number(raw);
                val = Number.isNaN(n) ? raw : (Number.isInteger(n) ? parseInt(raw, 10) : n);
              }
            }
          }
          if (val === null || typeof val === 'undefined' || val === '') {
            // Fallback to model default (can be null)
            val = schema?.default;
          }
          // Only set if not undefined to avoid sending extraneous fields
          if (typeof val !== 'undefined') {
            payload[paramName] = val;
          }
        }

        // For image-to-video, include image
        if (videoMode === 'image-to-video') {
          payload.image_b64 = sourceB64;
        }

        body = payload; // flat JSON
      } else {
        // Text-to-image generation (config-driven)
        const prompt = els.prompt.value.trim();
        if (!prompt) return toast('Prompt cannot be empty', true);
        
        if (!config) return toast('Invalid model selected', true);
        
        // Build payload generically from model config
        const payload = { prompt };
        
        // Handle resolution (enum vs width/height)
        if (config.params.resolution && Array.isArray(config.params.resolution.options)) {
          // Model uses resolution enum
          let resStr;
          const presetVal = els.resolutionPreset ? els.resolutionPreset.value : 'auto';
          if (presetVal === 'auto') {
            resStr = config.params.resolution.default;
          } else if (presetVal === 'custom') {
            // Convert width/height to model's format
            if (config.resolutionFormat === 'star') {
              resStr = `${width}*${height}`;
            } else {
              resStr = `${width}x${height}`;
            }
          } else {
            // Use preset value, converting format if needed
            resStr = presetVal;
            if (config.resolutionFormat === 'star') {
              resStr = resStr.replace('x', '*');
            }
          }
          payload.resolution = resStr;
        } else {
          // Model uses separate width/height
          payload.width = width;
          payload.height = height;
        }
        
        // Parameter mapping from UI elements to model param names
        const uiToModelParam = {
          cfg: config.parameterMapping?.cfgScale || 'guidance_scale',
          steps: config.parameterMapping?.steps || 'num_inference_steps',
          seed: 'seed',
          negative_prompt: 'negative_prompt'
        };
        
        // Map UI inputs to model parameters
        for (const [uiParam, modelParam] of Object.entries(uiToModelParam)) {
          let val = null;
          
          if (uiParam === 'cfg') {
            val = els.cfg.value ? parseFloat(els.cfg.value) : null;
          } else if (uiParam === 'steps') {
            val = els.steps.value ? parseInt(els.steps.value) : null;
          } else if (uiParam === 'seed') {
            val = els.seed.value ? parseInt(els.seed.value) : null;
          } else if (uiParam === 'negative_prompt') {
            val = els.negPrompt.value.trim() || null;
          }
          
          // Use model default if UI value is empty
          if (val === null || val === '') {
            const paramSchema = config.params[modelParam] || config.params[uiParam];
            val = paramSchema?.default;
          }
          
          // Only include if not null/undefined/empty
          if (val !== null && val !== undefined && val !== '') {
            payload[modelParam] = val;
          }
        }
        
        // Add model parameter for unified endpoints
        if (config.modelName) {
          payload.model = config.modelName;
        }
        
        // Add any additional model-specific parameters with defaults
        for (const [paramName, paramSchema] of Object.entries(config.params)) {
          if (['width', 'height', 'resolution', 'guidance_scale', 'true_cfg_scale', 'cfg', 'num_inference_steps', 'steps', 'seed', 'negative_prompt'].includes(paramName)) {
            continue; // already handled above
          }
          if (paramSchema.default !== undefined) {
            payload[paramName] = paramSchema.default;
          }
        }
        
        body = payload;
        endpoint = config.endpoint;
      }

      setBusy(true, 'Generating…');
      
      // Determine what we're generating for logging
      let generationType;
      if (currentMode === 'image-edit') {
        generationType = 'Qwen Image Edit';
      } else if (currentMode === 'video-generation') {
        const videoMode = els.videoModeImage2Video?.checked ? 'image-to-video' : 'text-to-video';
        generationType = `${VIDEO_MODEL_CONFIGS[currentModel]?.name || currentModel} (${videoMode})`;
      } else {
        generationType = config?.name || currentModel;
      }
      
      log(`[${ts()}] Sending request to ${generationType}…`);
      log(`[${ts()}] Request body: ${JSON.stringify(body, (key, value) => (key === 'image_b64' && typeof value === 'string') ? `${value.substring(0, 40)}...[truncated]` : value, 2)}`);
      
      const t0 = performance.now();
      
      // Use appropriate API function based on mode
      let blob;
      if (currentMode === 'video-generation') {
        blob = await generateVideo(endpoint, key, body);
      } else {
        blob = await generateImage(endpoint, key, body);
      }

      // Display result
      if (lastBlobUrl) URL.revokeObjectURL(lastBlobUrl);
      const newBlobUrl = URL.createObjectURL(blob);
      setLastBlobUrl(newBlobUrl);
      
      // Show appropriate result element based on content type
      if (currentMode === 'video-generation') {
        // Show video player
        els.resultImg.style.display = 'none';
        els.resultVideo.style.display = 'block';
        els.resultVideo.src = newBlobUrl;
        els.resultVideo.load(); // Force reload of video element
      } else {
        // Show image
        els.resultVideo.style.display = 'none';
        els.resultImg.style.display = 'block';
        createResultImg(newBlobUrl);
      }
      
      els.downloadBtn.disabled = false; 
      els.copyBtn.disabled = false;
      
      // Only show/enable "Send to Image Edit" for image results
      if (els.sendToEditBtn) {
        if (currentMode === 'video-generation') {
          els.sendToEditBtn.disabled = true;
          els.sendToEditBtn.style.display = 'none';
        } else {
          els.sendToEditBtn.disabled = false;
          els.sendToEditBtn.style.display = '';
        }
      }
      const dt = ((performance.now()-t0)/1000).toFixed(1);
      
      // Update metadata display based on content type
      const contentType = currentMode === 'video-generation' ? 'video/mp4' : (blob.type || 'image/jpeg');
      const sizeDisplay = blob.size > 1024*1024 ? 
        `${(blob.size/(1024*1024)).toFixed(1)} MB` : 
        `${(blob.size/1024).toFixed(0)} KB`;
      els.outMeta.textContent = `Output ${contentType} • ${sizeDisplay} • ${dt}s`;
      toast('Done ✓');
      log(`[${ts()}] Done ✓`);
      
      // Save to generation history
      let generationSettings;
      if (currentMode === 'video-generation') {
        // Video generation settings from flat payload
        const videoMode = els.videoModeImage2Video?.checked ? 'image-to-video' : 'text-to-video';
        generationSettings = {
          prompt: body.prompt,
          negativePrompt: body.negative_prompt || '',
          resolution: body.resolution,
          cfgScale: body.guidance_scale,
          steps: body.steps,
          frames: body.frames,
          fps: body.fps,
          seed: body.seed,
          model: currentModel,
          mode: 'video-generation',
          videoMode: videoMode,
          type: 'video'
        };
      } else {
        // Image generation settings
        generationSettings = {
          prompt: body.prompt,
          negativePrompt: body.negative_prompt || '',
          width: body.width,
          height: body.height,
          cfgScale: body.cfg || body.guidance_scale || body.true_cfg_scale,
          steps: body.steps || body.num_inference_steps,
          seed: body.seed,
          model: currentModel,
          mode: currentMode,
          type: 'image'
        };
      }
      await saveGeneratedImage(blob, generationSettings);
      
      // Refresh quota usage after successful generation
      await refreshQuotaUsage();
      // Signal generation completed (title + audio)
      generationComplete();
    } catch(err){
      console.error(err);
      // Show toast and also append the error to the activity log
      toast(err.message || String(err), true);
      try {
        log(`[${ts()}] Error: ${err.message || String(err)}`);
      } catch(e) {
        // Don't let logging failures break the UI - just warn
        console.warn('Failed to write to activity log:', e);
      }
      try {
        // Also update the page title and play error sound
        (await import('./generation.js')).generationFailed();
      } catch(e) {
        console.warn('Failed to trigger generationFailed behavior:', e);
      }
    } finally{
      setBusy(false);
    }
  });

  // Download and copy functionality
  els.downloadBtn.addEventListener('click', ()=>{
    if (currentMode === 'video-generation') {
      // Download video
      if (!els.resultVideo.src) return;
      const prefix = `${currentModel}-video`;
      const a = document.createElement('a'); 
      a.href = els.resultVideo.src; 
      a.download = `${prefix}-${Date.now()}.mp4`; 
      a.click();
    } else {
      // Download image
      if (!hasResultImg()) return;
      const img = getResultImgElement();
      const prefix = currentMode === 'image-edit' ? 'qwen-edit' : `${currentModel}-gen`;
      const a = document.createElement('a'); 
      a.href = img.src; 
      a.download = `${prefix}-${Date.now()}.jpg`; 
      a.click();
    }
  });

  els.copyBtn.addEventListener('click', async ()=>{
    if (currentMode === 'video-generation') {
      // For videos, copy the URL (browsers don't support video clipboard)
      if (!els.resultVideo.src) return;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(els.resultVideo.src);
          toast('Video URL copied to clipboard');
        } else {
          // Fallback for older browsers
          const textArea = document.createElement('textarea');
          textArea.value = els.resultVideo.src;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          toast('Video URL copied to clipboard');
        }
        return;
      } catch (e) {
        toast('Copy failed - ' + e.message, true);
        return;
      }
    }
    
    // Handle image copying (existing code)
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

  // Send to Image Edit from Result button
  if (els.sendToEditBtn) {
    els.sendToEditBtn.addEventListener('click', async () => {
      if (!hasResultImg()) return;
      try {
        // Switch to Image Edit mode
        els.modeImageEdit.checked = true;
        els.modeTextToImage.checked = false;
        switchMode('image-edit');

        // Fetch the current result image as blob and load as source
        const img = getResultImgElement();
        const res = await fetch(img.src);
        const blob = await res.blob();

        // Reuse helper from ui.js: handleImageFile works with File, but we have Blob
        // Create a File from Blob to preserve type
        const file = new File([blob], 'result.jpg', { type: blob.type || 'image/jpeg' });
        await handleImageFile(file);

        // Ensure preset logic applies
        if (els.resolutionPreset && els.resolutionPreset.value === 'auto') {
          const srcUrl = lastSourceObjectUrl();
          if (srcUrl) await computeAndDisplayAutoDims(srcUrl);
        }
        toast('Sent to Image Edit ✓');
      } catch (e) {
        console.warn('Send to Image Edit failed', e);
        toast('Failed to send image to edit', true);
      }
    });
  }

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
  
  // Video parameter sync listeners
  if (els.fps) els.fps.addEventListener('input', sync);
  if (els.frames) els.frames.addEventListener('input', sync);
  if (els.sampleShift) els.sampleShift.addEventListener('input', sync); 

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
  
  // History filter event listener
  document.getElementById('historyFilter').addEventListener('change', (e) => {
    setHistoryFilter(e.target.value);
  });

  // Modal event listeners
  document.getElementById('closeModalBtn').addEventListener('click', closeImageModal);
  document.getElementById('modalDownloadBtn').addEventListener('click', downloadModalImage);
  document.getElementById('modalDownloadSourceBtn').addEventListener('click', downloadModalSourceImage);
  document.getElementById('modalSendToEditBtn').addEventListener('click', async () => {
    try {
      const modalImage = getCurrentModalImage();
      if (!modalImage) return;
      // Switch to Image Edit mode
      els.modeImageEdit.checked = true;
      els.modeTextToImage.checked = false;
      switchMode('image-edit');

      // Prefer the generated image as source for editing
      if (modalImage.imageKey) {
        const blob = await (await import('./storage.js')).idbGetBlob(modalImage.imageKey);
        if (blob) {
          const file = new File([blob], 'history.jpg', { type: blob.type || 'image/jpeg' });
          await handleImageFile(file);
        }
      } else if (modalImage.imageData) {
        // imageData is a data URL
        const res = await fetch(modalImage.imageData);
        const blob = await res.blob();
        const file = new File([blob], 'history.jpg', { type: blob.type || 'image/jpeg' });
        await handleImageFile(file);
      }

      // Apply preset auto dims if needed
      if (els.resolutionPreset && els.resolutionPreset.value === 'auto') {
        const srcUrl = lastSourceObjectUrl();
        if (srcUrl) await computeAndDisplayAutoDims(srcUrl);
      }

      closeImageModal();
      toast('Sent to Image Edit ✓');
    } catch (e) {
      console.warn('Modal send to edit failed', e);
      toast('Failed to send image to edit', true);
    }
  });
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