// Event listeners setup - centralizes all UI event bindings

import { MODEL_CONFIGS, VIDEO_MODEL_CONFIGS, EDIT_MODEL_CONFIGS, TTS_MODEL_CONFIGS } from './models.js';
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
  els, currentMode, currentModel, sourceB64, sourceB64s, lastBlobUrl, autoDimsCache,
  setLastBlobUrl, createResultImg, hasResultImg, getResultImgElement, sync,
  switchMode, updateParametersForModel, setCurrentModel,
  lastSourceObjectUrl, computeAndDisplayAutoDims,
  applyPreset, handleImageFile, handleImageFiles, setSourceImage, setSourceImages, setImgThumbContent,
  updateVideoModeUI, updateVideoParametersForModel, updateParametersForEditModel, updateVideoResolutionPresets,
  renderSourceThumbs, appendImageFiles,
  updateTTSParametersForModel, setTtsAudio, clearTtsAudio, ttsAudioB64,
  setLipSyncVideo, setLipSyncAudio, clearLipSyncVideo, clearLipSyncAudio, lipSyncVideoB64, lipSyncAudioB64
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
  if (els.modeTTS) {
    els.modeTTS.addEventListener('change', () => {
      if (els.modeTTS.checked) switchMode('tts');
    });
  }
  
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
        log(`[${ts()}] Switching to text-to-video mode`);
        // Refresh model dropdown for text-to-video mode
        restoreModelSelectForVideo();
        // Update parameters for newly selected model
        updateVideoParametersForModel(currentModel);
        updateVideoResolutionPresets();
        // Switch to text-to-video mode
        updateVideoModeUI();
        // Refresh muted values to reflect placeholders/defaults
        sync();
      }
    });
  }
  if (els.videoModeImage2Video) {
    els.videoModeImage2Video.addEventListener('change', () => {
      if (els.videoModeImage2Video.checked) {
        log(`[${ts()}] Switching to image-to-video mode`);
        // Refresh model dropdown for image-to-video mode
        restoreModelSelectForVideo();
        // Update parameters for newly selected model
        updateVideoParametersForModel(currentModel);
        updateVideoResolutionPresets();
        // Switch to image-to-video mode
        updateVideoModeUI();
        // Refresh muted values to reflect placeholders/defaults
        sync();
      }
    });
  }
  if (els.videoModeLipSync) {
    els.videoModeLipSync.addEventListener('change', () => {
      if (els.videoModeLipSync.checked) {
        log(`[${ts()}] Switching to lip sync mode`);
        // Refresh model dropdown for lip sync mode
        restoreModelSelectForVideo();
        // Update parameters for newly selected model
        updateVideoParametersForModel(currentModel);
        updateVideoResolutionPresets();
        // Switch to lip sync mode
        updateVideoModeUI();
        // Refresh muted values to reflect placeholders/defaults
        sync();
      }
    });
  }

  // Event listener for model selection
  els.modelSelect.addEventListener('change', () => {
    if (currentMode === 'text-to-image') {
      updateParametersForModel(els.modelSelect.value);
      setCurrentModel(els.modelSelect.value);
    } else if (currentMode === 'video-generation') {
      log(`[${ts()}] Video model changed to: ${els.modelSelect.value}`);
      updateVideoParametersForModel(els.modelSelect.value);
      setCurrentModel(els.modelSelect.value);
      
      // Auto-switch to lip sync mode if Musetalk is selected
      if (els.modelSelect.value === 'musetalk' && els.videoModeLipSync) {
        log(`[${ts()}] Auto-switching to lip sync mode for Musetalk`);
        els.videoModeLipSync.checked = true;
      }
      
      // Refresh resolution presets and width/height to match selected video model
      updateVideoResolutionPresets();
      // Ensure UI reflects model capabilities (e.g., hide resolution for Wan i2v)
      updateVideoModeUI();
      // Sync muted displays (e.g., stepsVal) to the new model's defaults/placeholders
      sync();
    } else if (currentMode === 'image-edit') {
      setCurrentModel(els.modelSelect.value);
      updateParametersForEditModel(els.modelSelect.value);
    }
  });

  // TTS model change
  if (els.ttsModelSelect) {
    els.ttsModelSelect.addEventListener('change', () => {
      if (els.modeTTS && els.modeTTS.checked) {
        updateTTSParametersForModel(els.ttsModelSelect.value);
      }
    });
  }

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

  // Custom upload button opens the hidden file input
  const uploadBtn = document.getElementById('imgUploadBtn');
  if (uploadBtn) {
    uploadBtn.addEventListener('click', () => {
      els.imgInput?.click();
    });
  }

  // Clear all sources button
  const clearBtn = document.getElementById('clearSourcesBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      setImgThumbContent('<span class="muted">No image selected</span>');
      els.imgThumb.classList.remove('multi-grid');
      setSourceImage(null, null);
      setSourceImages([], []);
      els.imgInput.value = '';
    });
  }

  // Image preview (single or multiple depending on model)
  els.imgInput.addEventListener('change', async (e)=>{
    const files = e.target.files;
    if (!files || files.length === 0) { 
      setImgThumbContent('<span class="muted">No image selected</span>'); 
      setSourceImage(null, null);
      setSourceImages([], []); 
      // Clear any multi-grid state
      els.imgThumb.classList.remove('multi-grid');
      return; 
    }
    // Determine if current context supports multiple images
    let supportsMulti = false;
    if (currentMode === 'image-edit') {
      supportsMulti = EDIT_MODEL_CONFIGS[currentModel]?.imageInput?.type === 'multiple';
    } else if (currentMode === 'video-generation') {
      const vcfg = VIDEO_MODEL_CONFIGS[currentModel];
      const isImage2Video = els.videoModeImage2Video && els.videoModeImage2Video.checked;
      supportsMulti = isImage2Video && vcfg?.imageInput?.type === 'multiple';
    }

    if (supportsMulti) {
      // Append to existing rather than replace
      await appendImageFiles(files);
      renderSourceThumbs();
    } else {
      const f = files[0];
      if (!f) return;
      const mime = f.type || 'image/png';
      const url = URL.createObjectURL(f);
      setImgThumbContent(`<img src="${url}" alt="source"/>`, url);
      // Single image -> ensure grid class is removed
      els.imgThumb.classList.remove('multi-grid');
      log(`[${ts()}] Reading file: ${f.name}`);
      const b64 = await fileToBase64(f);
      const b64Data = b64.split(',')[1];
      setSourceImage(b64Data, mime);
      setSourceImages([b64Data], [mime]);
      log(`[${ts()}] Image ready (Base64 in memory).`);
      if (els.resolutionPreset && els.resolutionPreset.value === 'auto') {
        await computeAndDisplayAutoDims(url);
      }
    }
  });

  // TTS audio upload handlers
  if (els.ttsAudioUploadBtn) {
    els.ttsAudioUploadBtn.addEventListener('click', () => {
      els.ttsAudioInput?.click();
    });
  }
  if (els.ttsAudioClearBtn) {
    els.ttsAudioClearBtn.addEventListener('click', () => {
      els.ttsAudioInput.value = '';
      clearTtsAudio();
      if (els.ttsAudioInfo) els.ttsAudioInfo.textContent = 'No audio selected';
    });
  }
  if (els.ttsAudioInput) {
    els.ttsAudioInput.addEventListener('change', async (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const b64 = await (await import('./helpers.js')).fileToBase64(f);
      const data = (b64 || '').split(',')[1] || '';
      setTtsAudio(data, f.type || 'audio/wav');
      if (els.ttsAudioInfo) els.ttsAudioInfo.textContent = `Selected: ${f.name}`;
    });
  }

  // Video upload handlers for lip sync
  if (els.videoUploadBtn) {
    els.videoUploadBtn.addEventListener('click', () => {
      els.videoInput?.click();
    });
  }
  if (els.clearVideoBtn) {
    els.clearVideoBtn.addEventListener('click', () => {
      els.videoInput.value = '';
      clearLipSyncVideo();
      if (els.videoThumb) els.videoThumb.innerHTML = '<span class="muted">No video selected</span>';
    });
  }
  if (els.videoInput) {
    els.videoInput.addEventListener('change', async (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      
      log(`[${ts()}] Reading video file: ${f.name}`);
      const b64 = await fileToBase64(f);
      const data = (b64 || '').split(',')[1] || '';
      setLipSyncVideo(data, f.type || 'video/mp4');
      
      // Create video thumbnail
      const url = URL.createObjectURL(f);
      if (els.videoThumb) {
        els.videoThumb.innerHTML = `<video src="${url}" style="width:100%;height:auto;max-height:200px;" controls muted></video>`;
      }
      log(`[${ts()}] Video ready (Base64 in memory).`);
    });
  }

  // Audio upload handlers for lip sync  
  if (els.audioUploadBtn) {
    els.audioUploadBtn.addEventListener('click', () => {
      els.audioInput?.click();
    });
  }
  if (els.clearAudioBtn) {
    els.clearAudioBtn.addEventListener('click', () => {
      els.audioInput.value = '';
      clearLipSyncAudio();
      if (els.audioThumb) els.audioThumb.innerHTML = '<span class="muted">No audio selected</span>';
    });
  }
  if (els.audioInput) {
    els.audioInput.addEventListener('change', async (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      
      log(`[${ts()}] Reading audio file: ${f.name}`);
      const b64 = await fileToBase64(f);
      const data = (b64 || '').split(',')[1] || '';
      setLipSyncAudio(data, f.type || 'audio/wav');
      
      // Create audio thumbnail/preview
      const url = URL.createObjectURL(f);
      if (els.audioThumb) {
        els.audioThumb.innerHTML = `<audio src="${url}" style="width:100%;" controls></audio>`;
      }
      log(`[${ts()}] Audio ready (Base64 in memory).`);
    });
  }

  // Resolution preset handling
  if (els.resolutionPreset){
    els.resolutionPreset.addEventListener('change', applyPreset);
  }

  // Generate button - main image generation logic
  els.generateBtn.addEventListener('click', async ()=>{
    // Track request start time for duration/error messaging
    let t0 = null;
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
        // Image edit (config-driven)
        const editCfg = EDIT_MODEL_CONFIGS[currentModel] || EDIT_MODEL_CONFIGS['qwen-image-edit'];
        if (!editCfg) return toast('Invalid image edit model selected', true);
        const pmap = editCfg.parameterMapping || { cfgScale: 'true_cfg_scale', steps: 'num_inference_steps' };

        const prompt = els.prompt.value.trim();
        if (!prompt) return toast('Prompt cannot be empty', true);
        const negative_prompt = els.negPrompt.value.trim();
        const seedVal = els.seed.value === '' ? null : clamp(parseInt(els.seed.value,10), 0, 4294967295);
        // Resolve cfg/steps using placeholders when empty
        const stepsMin = editCfg.params?.num_inference_steps?.min ?? 5;
        const stepsMax = editCfg.params?.num_inference_steps?.max ?? 100;
        const stepsDef = editCfg.params?.num_inference_steps?.default ?? 50;
        const cfgMin = editCfg.params?.true_cfg_scale?.min ?? 0;
        const cfgMax = editCfg.params?.true_cfg_scale?.max ?? 10;
        const cfgDef = editCfg.params?.true_cfg_scale?.default ?? 4;
        const steps = els.steps.value ? clamp(parseInt(els.steps.value,10), stepsMin, stepsMax) : stepsDef;
        const cfg = els.cfg.value ? clamp(parseFloat(els.cfg.value), cfgMin, cfgMax) : cfgDef;

        const payload = { width, height, prompt };
        payload[pmap.cfgScale || 'true_cfg_scale'] = cfg;
        payload[pmap.steps || 'num_inference_steps'] = steps;
        if (negative_prompt) payload.negative_prompt = negative_prompt;
        if (seedVal !== null && !Number.isNaN(seedVal)) payload.seed = seedVal;

        // Attach images based on model capability
        const imgCap = editCfg.imageInput || { type: 'single', field: 'image_b64' };
        if (imgCap.type === 'multiple') {
          const maxItems = Math.max(1, imgCap.maxItems || 1);
          const imgs = Array.isArray(sourceB64s) && sourceB64s.length ? sourceB64s.slice(0, maxItems) : (sourceB64 ? [sourceB64] : []);
          payload[imgCap.field || 'image_b64s'] = imgs;
        } else {
          payload[imgCap.field || 'image_b64'] = sourceB64;
        }

        body = payload;
        endpoint = editCfg.endpoint;
      } else if (currentMode === 'video-generation') {
        // Video generation logic (config-driven)
        const isLipSync = els.videoModeLipSync?.checked;
        const videoMode = isLipSync ? 'lip-sync' : (els.videoModeImage2Video?.checked ? 'image-to-video' : 'text-to-video');
        const videoConfig = VIDEO_MODEL_CONFIGS[currentModel];
        if (!videoConfig) {
          log(`[${ts()}] ERROR: Invalid video model selected: ${currentModel}`);
          return toast('Invalid video model selected', true);
        }
        
        log(`[${ts()}] Using video model: ${videoConfig.name}, mode: ${videoMode}`);

        if (isLipSync) {
          // Lip sync mode - validate required inputs
          if (!lipSyncVideoB64) return toast('Video file is required for lip sync', true);
          if (!lipSyncAudioB64) return toast('Audio file is required for lip sync', true);
          
          // Select lip sync endpoint
          endpoint = videoConfig.endpoints.lipsync;
          log(`[${ts()}] Lip sync endpoint: ${endpoint}`);
          
          // Build lip sync payload
          const payload = {
            video_input: lipSyncVideoB64,
            audio_input: lipSyncAudioB64
          };

          // Parameter mapping for lip sync specific parameters
          const paramToElId = {
            fps: 'fps',
            batch_size: 'batchSize',
            extra_margin: 'extraMargin',
            parsing_mode: 'parsingMode',
            left_cheek_width: 'leftCheekWidth',
            right_cheek_width: 'rightCheekWidth'
          };

          for (const [paramName, schema] of Object.entries(videoConfig.params)) {
            const elId = paramToElId[paramName];
            let val = null;
            if (elId && els[elId] != null && typeof els[elId].value !== 'undefined') {
              const raw = (els[elId].value || '').toString().trim();
              if (raw !== '') {
                if (schema?.type === 'enum') {
                  val = raw;
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

          body = payload;
        } else {
          // Regular video generation (text-to-video or image-to-video)
          const prompt = els.prompt.value.trim();
          if (!prompt) return toast('Prompt cannot be empty', true);

          // Select endpoint based on sub-mode
          endpoint = videoMode === 'image-to-video' ? videoConfig.endpoints.image2video : videoConfig.endpoints.text2video;
          log(`[${ts()}] Regular video endpoint: ${endpoint} for mode: ${videoMode}`);
          
          // Check if the selected model supports the current video mode
          if (!endpoint) {
            log(`[${ts()}] ERROR: ${videoConfig.name} does not support ${videoMode} mode`);
            return toast(`${videoConfig.name} does not support ${videoMode} mode. Please select Lip Sync mode for this model.`, true);
          }

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
            steps: 'steps', // not used by all video models
            inference_steps: 'steps', // some models use inference_steps
            fps: 'fps',
            frames: 'frames',
            num_frames: 'frames', // some models support num_frames/base_num_frames
            base_num_frames: 'frames',
            seed: 'seed',
            sample_shift: 'sampleShift',
            shift: 'sampleShift', // some models use 'shift'
            negative_prompt: 'negPrompt',
            ar_step: null,
            overlap_history: null,
            causal_block_size: null,
            addnoise_condition: null
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

          // For image-to-video, include image(s)
          if (videoMode === 'image-to-video') {
            if (videoConfig.imageInput?.type === 'multiple') {
              // Map first/last according to config mapping
              const imgs = Array.isArray(sourceB64s) ? sourceB64s.slice(0, Math.max(1, videoConfig.imageInput.maxItems || 2)) : (sourceB64 ? [sourceB64] : []);
              const mapping = videoConfig.imageInput.mapping || {};
              if (imgs.length === 1) {
                const field = mapping.single || 'image_b64';
                payload[field] = imgs[0];
              } else if (imgs.length >= 2) {
                const firstField = (mapping.multiple && mapping.multiple[0]) || 'img_b64_first';
                const lastField = (mapping.multiple && mapping.multiple[1]) || 'img_b64_last';
                payload[firstField] = imgs[0];
                payload[lastField] = imgs[1];
              }
            } else {
              payload.image_b64 = sourceB64;
            }
          }

          body = payload; // flat JSON
        }
      } else if (currentMode === 'text-to-image' || currentMode === 'image-edit') {
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
      } else if (currentMode === 'tts') {
        // TTS is handled via its own button; ignore this button in TTS mode
        return;
      }

      setBusy(true, 'Generating…');
      
      // Determine what we're generating for logging
      let generationType;
      if (currentMode === 'image-edit') {
        generationType = `${EDIT_MODEL_CONFIGS[currentModel]?.name || currentModel}`;
      } else if (currentMode === 'video-generation') {
        const isLipSync = els.videoModeLipSync?.checked;
        const videoMode = isLipSync ? 'lip-sync' : (els.videoModeImage2Video?.checked ? 'image-to-video' : 'text-to-video');
        generationType = `${VIDEO_MODEL_CONFIGS[currentModel]?.name || currentModel} (${videoMode})`;
      } else {
        generationType = config?.name || currentModel;
      }
      
      log(`[${ts()}] Sending request to ${generationType}…`);
      const redactor = (key, value) => {
        // Truncate any single base64 field similar to Qwen 2509 behavior
        // Examples: image_b64, img_b64_first, img_b64_last
        if (typeof value === 'string' && (/_b64$/i.test(key) || /b64/i.test(key))) {
          return `${value.substring(0, 40)}...[truncated]`;
        }
        // Summarize arrays of base64 fields similar to image_b64s
        if (Array.isArray(value) && (/_b64s$/i.test(key) || /b64s/i.test(key))) {
          return `[${value.length} images]`;
        }
        return value;
      };
      log(`[${ts()}] Request body: ${JSON.stringify(body, redactor, 2)}`);
      
  // Start timer right before issuing the network request
  t0 = performance.now();
      
      // Final safety check for endpoint
      if (!endpoint || endpoint === 'undefined') {
        return toast('Invalid endpoint configuration. Please check model and mode selection.', true);
      }

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
        if (els.resultAudio) els.resultAudio.style.display = 'none';
        els.resultVideo.src = newBlobUrl;
        els.resultVideo.load(); // Force reload of video element
      } else {
        // Show image
        els.resultVideo.style.display = 'none';
        if (els.resultAudio) els.resultAudio.style.display = 'none';
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
        const isLipSync = els.videoModeLipSync?.checked;
        const videoMode = isLipSync ? 'lip-sync' : (els.videoModeImage2Video?.checked ? 'image-to-video' : 'text-to-video');
        
        if (isLipSync) {
          generationSettings = {
            fps: body.fps,
            batchSize: body.batch_size,
            extraMargin: body.extra_margin,
            parsingMode: body.parsing_mode,
            leftCheekWidth: body.left_cheek_width,
            rightCheekWidth: body.right_cheek_width,
            model: currentModel,
            mode: 'video-generation',
            videoMode: videoMode,
            type: 'lipsync',
            typeBadge: '📹👄',
            // Store the reference video and audio for history
            sourceVideo: lipSyncVideoB64,
            sourceAudio: lipSyncAudioB64
          };
        } else {
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
        }
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
      // Show a more helpful message if a long-running request hit a network error (likely server/proxy idle timeout)
      const elapsedSec = t0 ? ((performance.now() - t0) / 1000).toFixed(1) : '0.0';
      if ((err && String(err).includes('NetworkError')) && currentMode === 'video-generation') {
        const hint = `The network request failed after ~${elapsedSec}s. This often means the server or a proxy closed the connection before the video finished rendering. Try reducing Frames, Steps, or using 540P, or try with a single start image. If the issue persists, the endpoint may require an async job flow.`;
        toast(hint, true);
      } else {
        // Generic error toast
        toast(err.message || String(err), true);
      }
      try {
        if ((err && String(err).includes('NetworkError')) && currentMode === 'video-generation') {
          log(`[${ts()}] Error after ${elapsedSec}s: Network error during video generation (likely server/proxy timeout). Consider reducing Frames/Steps or resolution.`);
        } else {
          log(`[${ts()}] Error: ${err.message || String(err)}`);
        }
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

  // TTS Generate button
  if (els.ttsGenerateBtn) {
    els.ttsGenerateBtn.addEventListener('click', async () => {
      let t0 = null;
      try {
          setBusy(true, 'Generating audio…');
        const key = (els.apiKey.value || '').trim();
        if (!key) { 
          toast('Add your API key first', true); 
          els.keyStatus.textContent='API key required'; 
          els.keyStatus.classList.add('error'); 
          els.apiKey.focus(); 
          return; 
        }
        const modelKey = els.ttsModelSelect?.value;
        const cfg = TTS_MODEL_CONFIGS[modelKey];
        if (!cfg) return toast('Invalid TTS model selected', true);
        const text = (els.ttsText?.value || '').trim();
        if (!text) return toast('Text cannot be empty', true);
        // Build payload based on config
        const payload = { text };
        for (const [name, schema] of Object.entries(cfg.params || {})) {
          if (name === 'text') continue;
          const el = document.getElementById(`tts_${name}`);
          let val = null;
          if (el) {
            const raw = (el.value || '').trim();
            if (raw !== '') {
              if (el.type === 'number') {
                const n = Number(raw);
                val = Number.isNaN(n) ? undefined : (String(schema.step || '').includes('.') ? parseFloat(raw) : parseInt(raw, 10));
              } else {
                val = raw;
              }
            }
          }
          if (val === null || typeof val === 'undefined' || val === '') {
            if (schema.required) {
              return toast(`${name} is required`, true);
            }
            val = schema.default;
          }
          if (typeof val !== 'undefined') payload[name] = val;
        }
        // Attach reference audio depending on model
        const audioMeta = cfg.audioInput;
        if (audioMeta) {
          const ui = await import('./ui.js');
          const b64 = ui.ttsAudioB64;
          if (audioMeta.required && !b64) {
            return toast('Reference audio is required for this model', true);
          }
          if (b64) payload[audioMeta.field || 'sample_audio_b64'] = b64;
        }

        // Log and send
        t0 = performance.now();
        log(`[${ts()}] Sending request to ${cfg.name} (TTS)…`);
        log(`[${ts()}] Request body: ${JSON.stringify(payload, (k,v)=>k.endsWith('_b64')?'[b64]':v, 2)}`);

        const resp = await fetch(cfg.endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        if (!resp.ok) {
          const textErr = await resp.text().catch(()=>resp.statusText);
          throw new Error(`HTTP ${resp.status} — ${textErr}`);
        }
        const blob = await resp.blob();

        // Show result as audio
        if (lastBlobUrl) URL.revokeObjectURL(lastBlobUrl);
        const newBlobUrl = URL.createObjectURL(blob);
        setLastBlobUrl(newBlobUrl);
        // Hide image/video, show audio
        els.resultImg.style.display = 'none';
        els.resultVideo.style.display = 'none';
        const audioEl = els.resultAudio;
        if (audioEl) {
          audioEl.style.display = 'block';
          audioEl.src = newBlobUrl;
          audioEl.load();
        }
        els.downloadBtn.disabled = false;
        els.copyBtn.disabled = false; // we'll copy URL
        if (els.sendToEditBtn) { els.sendToEditBtn.disabled = true; els.sendToEditBtn.style.display = 'none'; }
        const dt = ((performance.now()-t0)/1000).toFixed(1);
        const sizeDisplay = blob.size > 1024*1024 ? `${(blob.size/(1024*1024)).toFixed(1)} MB` : `${(blob.size/1024).toFixed(0)} KB`;
        els.outMeta.textContent = `Output ${blob.type || 'audio/wav'} • ${sizeDisplay} • ${dt}s`;
        toast('Done ✓');
        log(`[${ts()}] Done ✓`);

        // Save to history as TTS
        const generationSettings = {
          text,
          model: modelKey,
          mode: 'tts',
          type: 'tts'
        };
        await (await import('./imageHistory.js')).saveGeneratedImage(blob, generationSettings);
        await refreshQuotaUsage();
        ;(await import('./generation.js')).generationComplete();
      } catch (err) {
        console.error(err);
        toast(err.message || String(err), true);
        try { (await import('./generation.js')).generationFailed(); } catch(_){}
      }
        finally {
          setBusy(false);
        }
    });
  }

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
    } else if (currentMode === 'tts') {
      // Download audio
      if (!els.resultAudio.src) return;
      const a = document.createElement('a');
      a.href = els.resultAudio.src;
      a.download = `tts-${Date.now()}.wav`;
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
    if (currentMode === 'tts') {
      if (!els.resultAudio.src) return;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(els.resultAudio.src);
          toast('Audio URL copied to clipboard');
        } else {
          const textArea = document.createElement('textarea');
          textArea.value = els.resultAudio.src;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          toast('Audio URL copied to clipboard');
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
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;
    let supportsMulti = false;
    if (currentMode === 'image-edit') {
      supportsMulti = EDIT_MODEL_CONFIGS[currentModel]?.imageInput?.type === 'multiple';
    } else if (currentMode === 'video-generation') {
      const vcfg = VIDEO_MODEL_CONFIGS[currentModel];
      const isImage2Video = els.videoModeImage2Video && els.videoModeImage2Video.checked;
      supportsMulti = isImage2Video && vcfg?.imageInput?.type === 'multiple';
    }
    if (supportsMulti) {
      await appendImageFiles(files);
      renderSourceThumbs();
    } else {
      const f = files[0];
      await handleImageFile(f);
    }
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