// Optional: redirect helper for some static hosts
(function(){
  try{
    var p = location.pathname; if (p === '/' && !location.href.endsWith('index.html')) {
      // no-op; most hosts serve index.html at '/'
    }
  }catch(e){}
})();

// ---- Service worker registration with update handling ----
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(registration => {
        console.log('Service Worker registered successfully');
        
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          console.log('Service Worker update found');
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New service worker installed, page refresh recommended');
              // Show notification with refresh option
              const refreshBtn = document.createElement('button');
              refreshBtn.textContent = 'Refresh Now';
              refreshBtn.style.cssText = 'margin-left: 8px; padding: 4px 8px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;';
              refreshBtn.onclick = () => window.location.reload();
              
              const toastEl = document.getElementById('toast');
              if (toastEl) {
                toastEl.innerHTML = '🔄 App updated! ';
                toastEl.appendChild(refreshBtn);
                toastEl.style.display = 'block';
                setTimeout(() => {
                  toastEl.style.display = 'none';
                }, 10000); // Show for 10 seconds
              }
            }
          });
        });
      })
      .catch(error => console.log('Service Worker registration failed:', error));
    
    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data.type === 'CACHE_UPDATED') {
        console.log('Cache updated to version:', event.data.version);
        toast('✅ App cache updated!');
      }
    });
  });
}

// ---- UI logic ----
const els = {
  apiKey: document.getElementById('apiKey'), revealKeyBtn: document.getElementById('revealKeyBtn'), saveKeyBtn: document.getElementById('saveKeyBtn'), forgetKeyBtn: document.getElementById('forgetKeyBtn'), keyStatus: document.getElementById('keyStatus'),
  modeImageEdit: document.getElementById('modeImageEdit'), modeTextToImage: document.getElementById('modeTextToImage'),
  modelSelect: document.getElementById('modelSelect'), modelRow: document.getElementById('modelRow'),
  imgInput: document.getElementById('imgInput'), imgThumb: document.getElementById('imgThumb'), sourceImageSection: document.getElementById('sourceImageSection'), sourceImageRequired: document.getElementById('sourceImageRequired'), imageInputRow: document.getElementById('imageInputRow'),
  prompt: document.getElementById('prompt'), negPrompt: document.getElementById('negPrompt'), inputCardTitle: document.getElementById('inputCardTitle'),
  width: document.getElementById('width'), height: document.getElementById('height'), seed: document.getElementById('seed'),
  resolutionPreset: document.getElementById('resolutionPreset'), autoDims: document.getElementById('autoDims'),
  cfg: document.getElementById('cfg'), cfgVal: document.getElementById('cfgVal'), steps: document.getElementById('steps'), stepsVal: document.getElementById('stepsVal'),
  generateBtn: document.getElementById('generateBtn'), runStatus: document.getElementById('runStatus'),
  resultImg: document.getElementById('resultImg'), downloadBtn: document.getElementById('downloadBtn'), copyBtn: document.getElementById('copyBtn'), outMeta: document.getElementById('outMeta')
};

// Helper function to create an img element inside the result container
function createResultImg(src) {
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

// Helper function to check if result container has an img element
function hasResultImg() {
  return els.resultImg.querySelector('img') !== null;
}

// Helper function to get the img element from the result container
function getResultImgElement() {
  return els.resultImg.querySelector('img');
}

// Sync function for sliders
const sync = ()=>{ els.cfgVal.textContent = els.cfg.value; els.stepsVal.textContent = els.steps.value; };

// Model configurations based on actual API schemas from img-models.jsonl
const MODEL_CONFIGS = {
  'hidream': {
    name: 'Hidream',
    endpoint: 'https://kikakkz-hidream-i1-full.chutes.ai/generate',
    params: {
      width: { min: 256, max: 2560, default: 1024, step: 64 },
      height: { min: 256, max: 2560, default: 1024, step: 64 },
      guidance_scale: { min: 0, max: 10, default: 5, step: 0.1 },
      num_inference_steps: { min: 5, max: 75, default: 50, step: 1 },
      seed: { min: 0, max: 100000000, default: null }
    }
  },
  'qwen-image': {
    name: 'Qwen Image',
    endpoint: 'https://chutes-qwen-image.chutes.ai/generate',
    params: {
      width: { min: 128, max: 2048, default: 1024, step: 64 },
      height: { min: 128, max: 2048, default: 1024, step: 64 },
      true_cfg_scale: { min: 0, max: 10, default: 4, step: 0.1 },
      num_inference_steps: { min: 5, max: 100, default: 50, step: 1 },
      seed: { min: 0, max: 4294967295, default: null },
      negative_prompt: { default: '' }
    }
  },
  'flux-dev': {
    name: 'FLUX.1 Dev',
    endpoint: 'https://image.chutes.ai/generate',
    modelName: 'FLUX.1-dev',
    params: {
      width: { min: 128, max: 2048, default: 1024, step: 64 },
      height: { min: 128, max: 2048, default: 1024, step: 64 },
      guidance_scale: { min: 1, max: 20, default: 7.5, step: 0.1 },
      num_inference_steps: { min: 1, max: 30, default: 30, step: 1 },
      seed: { min: 0, max: 4294967295, default: null }
    }
  },
  'juggernaut-xl': {
    name: 'JuggernautXL',
    endpoint: 'https://image.chutes.ai/generate',
    modelName: 'JuggernautXL',
    params: {
      width: { min: 128, max: 2048, default: 1024, step: 64 },
      height: { min: 128, max: 2048, default: 1024, step: 64 },
      guidance_scale: { min: 1, max: 20, default: 7.5, step: 0.1 },
      num_inference_steps: { min: 1, max: 50, default: 25, step: 1 },
      seed: { min: 0, max: 4294967295, default: null },
      negative_prompt: { default: '' }
    }
  },
  'chroma': {
    name: 'Chroma',
    endpoint: 'https://image.chutes.ai/generate',
    modelName: 'chroma',
    params: {
      width: { min: 200, max: 2048, default: 1024, step: 64 },
      height: { min: 200, max: 2048, default: 1024, step: 64 },
      guidance_scale: { min: 1, max: 7.5, default: 4.5, step: 0.1 },
      num_inference_steps: { min: 5, max: 50, default: 30, step: 1 },
      seed: { min: 0, max: null, default: 0 }
    }
  },
  'ilust-mix': {
    name: 'iLustMix',
    endpoint: 'https://image.chutes.ai/generate',
    modelName: 'iLustMix',
    params: {
      width: { min: 128, max: 2048, default: 1024, step: 64 },
      height: { min: 128, max: 2048, default: 1024, step: 64 },
      guidance_scale: { min: 1, max: 20, default: 7.5, step: 0.1 },
      num_inference_steps: { min: 1, max: 50, default: 25, step: 1 },
      seed: { min: 0, max: 4294967295, default: null },
      negative_prompt: { default: '' }
    }
  },
  'neta-lumina': {
    name: 'Neta Lumina',
    endpoint: 'https://image.chutes.ai/generate',
    modelName: 'neta-lumina',
    params: {
      width: { min: 768, max: 2048, default: 1024, step: 64 },
      height: { min: 768, max: 2048, default: 1024, step: 64 },
      guidance_scale: { min: 1, max: 20, default: 7.5, step: 0.1 },
      num_inference_steps: { min: 20, max: 50, default: 30, step: 1 },
      seed: { min: 0, max: 4294967295, default: null },
      negative_prompt: { default: 'blurry, worst quality, low quality' }
    }
  }
};

// Current mode and model
let currentMode = 'image-edit';
let currentModel = 'hidream';

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

async function fetchQuotaUsage(apiKey) {
  try {
    const response = await fetch('https://api.chutes.ai/users/me/quota_usage/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.warn('Failed to fetch quota usage:', error);
  }
  return null;
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

// Load key
const saved = localStorage.getItem('chutes_api_key');
if (saved) { 
  els.apiKey.value = saved; 
  els.keyStatus.textContent = 'Loaded from localStorage';
  // Load quota when API key is restored
  setTimeout(refreshQuotaUsage, 100);
}

// Mode switching
function switchMode(mode) {
  currentMode = mode;
  const isTextToImage = mode === 'text-to-image';
  
  // Update UI visibility
  els.modelRow.style.display = isTextToImage ? 'block' : 'none';
  els.sourceImageSection.style.display = isTextToImage ? 'none' : 'block';
  // Add class on the input row so CSS can adapt layout for T2I
  if (els.imageInputRow) {
    if (isTextToImage) els.imageInputRow.classList.add('t2i'); else els.imageInputRow.classList.remove('t2i');
  }
  
  // Update prompt placeholder
  els.prompt.placeholder = isTextToImage ? 
    'Describe the image you want to generate...' : 
    'Describe the edit you want...';
    
  // Update input card title
  els.inputCardTitle.textContent = isTextToImage ? '3) Input & Model' : '3) Input';
    
  // Update resolution presets for text-to-image
  if (isTextToImage) {
    updateParametersForModel(currentModel);
  } else {
    // Restore original image edit controls
    updateParametersForImageEdit();
  }
  
  log(`[${ts()}] Switched to ${mode} mode`);
}

function updateParametersForImageEdit() {
  // Restore original CFG and steps ranges for image editing
  els.cfg.min = 0; els.cfg.max = 10; els.cfg.step = 0.1; els.cfg.value = 4;
  els.steps.min = 5; els.steps.max = 100; els.steps.step = 1; els.steps.value = 50;
  
  // Update resolution preset options for image editing
  const preset = els.resolutionPreset;
  preset.innerHTML = `
    <option value="auto" selected>Auto (derive from source)</option>
    <option value="512x512">512 × 512 (Low-res square 1:1)</option>
    <option value="1024x1024">1024 × 1024 (Square 1:1)</option>
    <option value="1536x1024">1536 × 1024 (Landscape 3:2)</option>
    <option value="1024x1536">1024 × 1536 (Portrait 2:3)</option>
  <option value="2048x2048">2048 × 2048 (HiRes square)</option>
  <option value="2024x2024">2024 × 2024 (HiRes square)</option>
  <option value="1920x1080">1920 × 1080 (HiRes landscape 16:9)</option>
  <option value="1080x1920">1080 × 1920 (HiRes portrait 9:16)</option>
    <option value="custom">Custom…</option>
  `;
  
  // Reset to defaults
  els.width.value = 1024; els.height.value = 1024; els.seed.value = '';
  els.negPrompt.value = '';
  sync();
}

function updateParametersForModel(modelKey) {
  const config = MODEL_CONFIGS[modelKey];
  if (!config) return;
  
  currentModel = modelKey;
  const params = config.params;
  
  // Update CFG/guidance scale (models use different parameter names)
  const cfgParam = params.guidance_scale || params.true_cfg_scale || params.cfg;
  if (cfgParam) {
    els.cfg.min = cfgParam.min;
    els.cfg.max = cfgParam.max;
    els.cfg.step = cfgParam.step;
    els.cfg.value = cfgParam.default;
  }
  
  // Update inference steps (models use different parameter names)
  const stepsParam = params.num_inference_steps || params.steps;
  if (stepsParam) {
    els.steps.min = stepsParam.min;
    els.steps.max = stepsParam.max;
    els.steps.step = stepsParam.step;
    els.steps.value = stepsParam.default;
  }
  
  // Update width/height (now all models use width/height)
  if (params.width) {
    els.width.min = params.width.min;
    els.width.max = params.width.max;
    els.width.step = params.width.step;
    els.width.value = params.width.default;
  }
  if (params.height) {
    els.height.min = params.height.min;
    els.height.max = params.height.max;
    els.height.step = params.height.step;
    els.height.value = params.height.default;
  }
  
  // Update standard resolution presets for text-to-image
  const preset = els.resolutionPreset;
  preset.innerHTML = `
    <option value="512x512">512 × 512 (Low-res square 1:1)</option>
    <option value="1024x1024" selected>1024 × 1024 (Square 1:1)</option>
    <option value="1536x1024">1536 × 1024 (Landscape 3:2)</option>
    <option value="1024x1536">1024 × 1536 (Portrait 2:3)</option>
    <option value="768x1360">768 × 1360 (Portrait 9:16)</option>
    <option value="1360x768">1360 × 768 (Landscape 16:9)</option>
  <option value="2024x2024">2024 × 2024 (HiRes square)</option>
  <option value="1920x1080">1920 × 1080 (HiRes landscape 16:9)</option>
  <option value="1080x1920">1080 × 1920 (HiRes portrait 9:16)</option>
    <option value="custom">Custom…</option>
  `;
  
  // Update seed
  if (params.seed) {
    els.seed.min = params.seed.min;
    if (params.seed.max) {
      els.seed.max = params.seed.max;
    } else {
      els.seed.removeAttribute('max');
    }
    els.seed.value = params.seed.default || '';
  }
  
  // Update negative prompt default
  if (params.negative_prompt) {
    els.negPrompt.value = params.negative_prompt.default;
  } else {
    els.negPrompt.value = '';
  }
  
  // Update the display values
  sync();
  log(`[${ts()}] Updated parameters for ${config.name} model`);
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
  }
});

// Initialize with image edit mode
switchMode('image-edit');

els.saveKeyBtn.addEventListener('click', async ()=>{
  const v = els.apiKey.value.trim();
  if (!v) { els.keyStatus.textContent='Enter a key first.'; return; }
  localStorage.setItem('chutes_api_key', v);
  els.keyStatus.textContent='Saved ✓';
  log(`[${ts()}] Saved API key to localStorage.`);
  // Refresh quota usage when API key is saved
  await refreshQuotaUsage();
});
els.forgetKeyBtn.addEventListener('click', ()=>{
  localStorage.removeItem('chutes_api_key'); els.apiKey.value=''; els.keyStatus.textContent='Removed from localStorage';
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
let sourceB64 = null; let sourceMime = null; let lastBlobUrl = null;
els.imgInput.addEventListener('change', async (e)=>{
  const f = e.target.files?.[0];
  if (!f) { els.imgThumb.innerHTML = '<span class="muted">No image selected</span>'; sourceB64 = null; return; }
  sourceMime = f.type || 'image/png';
  const url = URL.createObjectURL(f);
  els.imgThumb.innerHTML = `<img src="${url}" alt="source"/>`;
  log(`[${ts()}] Reading file: ${f.name}`);
  const b64 = await fileToBase64(f);
  // Strip data URL header; API expects pure base64 string
  sourceB64 = b64.split(',')[1];
  log(`[${ts()}] Image ready (Base64 in memory).`);
  // After image loads, if Auto preset selected compute dims
  if (els.resolutionPreset && els.resolutionPreset.value === 'auto') {
    await computeAndDisplayAutoDims(url);
  }
});

function fileToBase64(file) {
  return new Promise((res, rej)=>{ const r = new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); });
}

// ---- Resolution Preset Handling ----
const PRESETS = {
  '512x512': { w:512, h:512 },
  '1024x1024': { w:1024, h:1024 },
  '1536x1024': { w:1536, h:1024 },
  '1024x1536': { w:1024, h:1536 },
  '768x1360': { w:768, h:1360 },
  '1360x768': { w:1360, h:768 },
  '2048x2048': { w:2048, h:2048 },
  '2024x2024': { w:2024, h:2024 },
  '1920x1080': { w:1920, h:1080 },
  '1080x1920': { w:1080, h:1920 }
};
let autoDimsCache = null; // {w,h}

// Helper function to find preset that matches given dimensions
function findPresetForDimensions(width, height, mode = 'text-to-image') {
  // For image edit mode, if the dimensions match the source image exactly,
  // it should use "auto". However, since we don't have source image dimensions here,
  // we'll check standard presets first, then fall back to custom.
  
  for (const [presetKey, preset] of Object.entries(PRESETS)) {
    if (preset.w === width && preset.h === height) {
      return presetKey;
    }
  }
  
  // If no standard preset matches, return 'custom'
  return 'custom';
}

async function computeAndDisplayAutoDims(imgUrl){
  try{
    const dims = await computeAutoDims(imgUrl);
    autoDimsCache = dims;
    if (els.autoDims){
      els.autoDims.style.display = 'block';
      els.autoDims.textContent = `Auto: ${dims.w} × ${dims.h}`;
    }
    // Update width/height inputs even when they are disabled so user can see values
    if (els.width && els.height){ els.width.value = dims.w; els.height.value = dims.h; }
    log(`[${ts()}] Auto resolution computed: ${dims.w}x${dims.h}`);
  }catch(e){
    if (els.autoDims){ els.autoDims.style.display='block'; els.autoDims.textContent = 'Auto: (failed to read image)'; }
  }
}

function computeAutoDims(imgUrl){
  return new Promise((resolve, reject)=>{
    const img = new Image();
    img.onload = ()=>{
      let w = img.naturalWidth; let h = img.naturalHeight;
      if (!(w>0 && h>0)) return reject(new Error('Invalid source dimensions'));
      // Maintain aspect ratio while keeping max side <= 2048 and both between 128-2048
      const MAX = 2048; const MIN = 128;
      // Scale so that the largest side becomes as large as possible but <= MAX
      const scale = Math.min(MAX / Math.max(w,h), 1); // don't upscale
      w = Math.floor(w * scale); h = Math.floor(h * scale);
      // Enforce multiples of 64
      w = snap(w,64,MIN,MAX); h = snap(h,64,MIN,MAX);
      // Guarantee at least 128
      if (w < MIN) w = MIN; if (h < MIN) h = MIN;
      resolve({ w, h });
    };
    img.onerror = reject;
    img.src = imgUrl;
  });
}

function applyPreset(){
  if (!els.resolutionPreset) return;
  const val = els.resolutionPreset.value;
  if (val === 'custom'){
    toggleDimInputs(true);
    if (els.autoDims) els.autoDims.style.display='none';
    log(`[${ts()}] Preset: custom`);
    return;
  }
  if (val === 'auto'){
    toggleDimInputs(false); // disable manual editing during auto
    if (els.autoDims){ els.autoDims.style.display='block'; els.autoDims.textContent='Auto: (waiting for image)'; }
    const src = lastSourceObjectUrl();
    if (src){
      // If we already computed auto dims earlier, use cache to populate inputs immediately
      if (autoDimsCache){ if (els.width && els.height){ els.width.value = autoDimsCache.w; els.height.value = autoDimsCache.h; } }
      else { computeAndDisplayAutoDims(src); }
    }
    log(`[${ts()}] Preset: auto`);
    return;
  }
  const p = PRESETS[val];
  if (p){
    toggleDimInputs(false);
    els.width.value = p.w;
    els.height.value = p.h;
    if (els.autoDims) els.autoDims.style.display='none';
    log(`[${ts()}] Preset selected: ${val}`);
    return;
  }
}

function toggleDimInputs(enabled){
  els.width.disabled = !enabled;
  els.height.disabled = !enabled;
}

function lastSourceObjectUrl(){
  // We can re-use the current <img> inside imgThumb if present
  const img = els.imgThumb.querySelector('img');
  return img ? img.src : null;
}

if (els.resolutionPreset){
  els.resolutionPreset.addEventListener('change', applyPreset);
  applyPreset(); // initialize
}

// Generate call
let genTimer = null; let genStart = 0;
els.generateBtn.addEventListener('click', async ()=>{
  try{
    const key = (els.apiKey.value || '').trim();
    if (!key) { toast('Add your API key first', true); els.keyStatus.textContent='API key required'; els.keyStatus.classList.add('error'); els.apiKey.focus(); return; }
    
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
      const prompt = els.prompt.value.trim(); if (!prompt) return toast('Prompt cannot be empty', true);
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
      const prompt = els.prompt.value.trim(); if (!prompt) return toast('Prompt cannot be empty', true);
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
      
      // Note: Text-to-image models don't support source images based on the schemas
      // in img-models.jsonl, so we don't send image_b64 parameter
      
      endpoint = config.endpoint;
    }

    setBusy(true, 'Generating…');
    log(`[${ts()}] Sending request to ${currentMode === 'image-edit' ? 'Qwen Image Edit' : config.name}…`);
    log(`[${ts()}] Request body: ${JSON.stringify(body, null, 2)}`);
    const t0 = performance.now();
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      let text = '';
      try {
        const ct = resp.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const j = await resp.json();
          text = JSON.stringify(j);
        } else {
          text = await resp.text();
        }
      } catch(_) {}
      const msg = `HTTP ${resp.status} — ${text || resp.statusText}`;
      log(`[${ts()}] Error: ${msg}`);
      log(`[${ts()}] Full request details - Endpoint: ${endpoint}, Body: ${JSON.stringify(body, null, 2)}`);
      throw new Error(msg);
    }

    const blob = await resp.blob();
    // Display
    if (lastBlobUrl) URL.revokeObjectURL(lastBlobUrl);
    lastBlobUrl = URL.createObjectURL(blob);
    createResultImg(lastBlobUrl);
    els.downloadBtn.disabled = false; els.copyBtn.disabled = false;
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
    saveGeneratedImage(blob, imageSettings);
    
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

// Helpers
let toastTimer = null;
function toast(msg, isErr=false){
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = isErr ? 'error show' : 'success show';
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>{
    t.className = '';
    t.textContent = '';
  }, 3000);
}
function setBusy(state, msg='Working…'){
  els.generateBtn.disabled = state; els.downloadBtn.disabled = state || !hasResultImg(); els.copyBtn.disabled = state || !hasResultImg();
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
function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
function snap(v, step, min, max){
  const clamped = clamp(v, min, max);
  return clamp(Math.round(clamped/step)*step, min, max);
}

// Activity log helpers
function ts(){
  const d = new Date();
  const p = (n)=> String(n).padStart(2,'0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function log(line){
  const el = document.getElementById('logOutput');
  if (!el) return;
  el.textContent += (el.textContent ? '\n' : '') + line;
  el.scrollTop = el.scrollHeight;
}

// --- Generation title and audio helpers ---
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

els.downloadBtn.addEventListener('click', ()=>{
  if (!hasResultImg()) return;
  const img = getResultImgElement();
  const prefix = currentMode === 'image-edit' ? 'qwen-edit' : `${currentModel}-gen`;
  const a = document.createElement('a'); a.href = img.src; a.download = `${prefix}-${Date.now()}.jpg`; a.click();
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
async function handleImageFile(file){
  if (!file) { els.imgThumb.innerHTML = '<span class="muted">No image selected</span>'; sourceB64 = null; return; }
  if (!(file.type||'').startsWith('image/')) { toast('Please drop an image file', true); return; }
  const url = URL.createObjectURL(file);
  els.imgThumb.innerHTML = `<img src="${url}" alt="source"/>`;
  log(`[${ts()}] Reading file: ${file.name}`);
  const b64 = await fileToBase64(file);
  sourceB64 = (b64||'').split(',')[1] || null;
  sourceMime = file.type || 'image/png';
  log(`[${ts()}] Image ready (Base64 in memory).`);

  // If the user has the resolution preset set to "auto", compute auto dims
  // immediately for dropped images (matches behavior of file input change).
  try {
    if (els.resolutionPreset && els.resolutionPreset.value === 'auto') {
      // Disable manual dim inputs and show waiting message
      toggleDimInputs(false);
      if (els.autoDims) { els.autoDims.style.display = 'block'; els.autoDims.textContent = 'Auto: (waiting for image)'; }

      // If we already have cached auto dims, populate immediately; otherwise compute
      if (autoDimsCache) {
        if (els.width && els.height) { els.width.value = autoDimsCache.w; els.height.value = autoDimsCache.h; }
      } else {
        await computeAndDisplayAutoDims(url);
      }
    }
  } catch (err) {
    // computeAndDisplayAutoDims already updates UI on failure; log for debugging
    console.warn('Failed to compute auto dimensions on drop:', err);
  }
}
['dragenter','dragover'].forEach(ev=>{
  els.imgThumb.addEventListener(ev, (e)=>{ e.preventDefault(); e.stopPropagation(); els.imgThumb.classList.add('drop-hover'); });
});
['dragleave','dragend','drop'].forEach(ev=>{
  els.imgThumb.addEventListener(ev, (e)=>{ e.preventDefault(); e.stopPropagation(); els.imgThumb.classList.remove('drop-hover'); });
});
els.imgThumb.addEventListener('drop', async (e)=>{
  const f = e.dataTransfer?.files?.[0];
  await handleImageFile(f);
});

// Clear API key error hint upon typing/saving
els.apiKey.addEventListener('input', ()=>{
  if (els.keyStatus.classList.contains('error')) { els.keyStatus.classList.remove('error'); els.keyStatus.textContent=''; }
});
els.saveKeyBtn.addEventListener('click', ()=>{ els.keyStatus.classList.remove('error'); });

// Setup slider event listeners and initial sync
els.cfg.addEventListener('input', sync); 
els.steps.addEventListener('input', sync); 
sync();

// ---- Image History System ----

// Image history storage
// We'll keep a small metadata array in localStorage (ids, settings, timestamps)
// but store binary image blobs in IndexedDB to avoid localStorage quota errors.
const IDB_DB_NAME = 'chutes_images';
const IDB_STORE = 'images';

// Metadata store name
const IDB_META_STORE = 'meta';

function openIdb() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(IDB_DB_NAME, 1);
    r.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(IDB_META_STORE)) {
        db.createObjectStore(IDB_META_STORE, { keyPath: 'id' });
      }
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function idbPutBlob(key, blob, type) {
  try {
    const db = await openIdb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put({ key, blob, type });
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch (e) {
    console.warn('IDB put failed', e);
    throw e;
  }
}

async function idbGetBlob(key) {
  try {
    const db = await openIdb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(key);
      req.onsuccess = () => { db.close(); resolve(req.result ? req.result.blob : null); };
      req.onerror = () => { db.close(); reject(req.error); };
    });
  } catch (e) {
    console.warn('IDB get failed', e);
    return null;
  }
}

async function idbPutMeta(meta) {
  try {
    const db = await openIdb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_META_STORE, 'readwrite');
      const store = tx.objectStore(IDB_META_STORE);
      store.put(meta);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch (e) {
    console.warn('IDB put meta failed', e);
    throw e;
  }
}

async function idbGetAllMeta() {
  try {
    const db = await openIdb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_META_STORE, 'readonly');
      const store = tx.objectStore(IDB_META_STORE);
      const req = store.getAll();
      req.onsuccess = () => { db.close(); resolve(req.result || []); };
      req.onerror = () => { db.close(); reject(req.error); };
    });
  } catch (e) {
    console.warn('IDB getAll meta failed', e);
    return [];
  }
}

async function idbDeleteMeta(id) {
  try {
    const db = await openIdb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_META_STORE, 'readwrite');
      const store = tx.objectStore(IDB_META_STORE);
      store.delete(id);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch (e) {
    console.warn('IDB delete meta failed', e);
  }
}

async function idbClearMeta() {
  try {
    const db = await openIdb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_META_STORE, 'readwrite');
      const store = tx.objectStore(IDB_META_STORE);
      store.clear();
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch (e) {
    console.warn('IDB clear meta failed', e);
  }
}

async function idbDelete(key) {
  try {
    const db = await openIdb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.delete(key);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch (e) {
    console.warn('IDB delete failed', e);
  }
}

// Migration: move legacy localStorage-inlined images into IndexedDB (run once)
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
        try { await idbPutBlob(imageKey, blob, blob.type); entry.imageKey = imageKey; delete entry.imageData; changed = true; } catch (e) { console.warn('Migration image put failed', e); }
      }
      if (entry.sourceImageData && typeof entry.sourceImageData === 'string' && entry.sourceImageData.startsWith('data:')) {
        const sblob = dataURLToBlob(entry.sourceImageData);
        const sourceKey = `${entry.id}:src`;
        try { await idbPutBlob(sourceKey, sblob, sblob.type); entry.sourceKey = sourceKey; delete entry.sourceImageData; changed = true; } catch (e) { console.warn('Migration source put failed', e); }
      }
    }
    if (changed) {
      // Save updated metadata back to localStorage (or to IDB later if migrating metadata)
      localStorage.setItem('chutes_image_history', JSON.stringify(history));
      console.log('Migrated some images to IndexedDB');
    }
  } catch (e) {
    console.warn('Migration failed', e);
  }
}


function getImageHistory() {
  // Prefer metadata in IndexedDB; fall back to localStorage
  // This returns a synchronous array if stored in localStorage, or if IDB used,
  // the calling code should call refreshImageGrid which will read from IDB async.
  try {
    const metaRaw = localStorage.getItem('chutes_image_history');
    if (metaRaw) return JSON.parse(metaRaw);
  } catch (e) { console.warn('Failed to read localStorage history', e); }
  // If no localStorage metadata, return empty and rely on async IDB loader to populate UI
  return [];
}

function saveImageHistory(history) {
  try {
    localStorage.setItem('chutes_image_history', JSON.stringify(history));
  } catch (e) {
    console.warn('Failed to save image history metadata to localStorage:', e);
  }
}

// Convert DataURL (base64) to Blob
function dataURLToBlob(dataURL) {
  const parts = dataURL.split(',');
  const meta = parts[0];
  const b64 = parts[1] || '';
  const mime = meta.match(/:(.*?);/)[1] || 'image/png';
  const binary = atob(b64);
  const len = binary.length;
  const u8 = new Uint8Array(len);
  for (let i = 0; i < len; i++) u8[i] = binary.charCodeAt(i);
  return new Blob([u8], { type: mime });
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
  const selectionIcon = document.getElementById('selectionIcon');
  
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

function deleteSelectedImages() {
  if (selectedImages.size === 0) return;
  
  if (!confirm(`Delete ${selectedImages.size} selected image(s)? This cannot be undone.`)) {
    return;
  }
  
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

// Run migration at startup (non-blocking)
migrateLocalStorageToIdb().catch(e => console.warn('Migration routine failed', e));

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

// Modal functionality
let currentModalImage = null;

function openImageModal(imageId) {
  if (selectionMode) {
    toggleImageSelection(imageId);
    return;
  }
  
  const history = getImageHistory();
  const image = history.find(img => img.id === imageId);
  if (!image) return;
  
  currentModalImage = image;
  
  const modal = document.getElementById('imageModal');
  const modalImage = document.getElementById('modalImage');
  const modalModel = document.getElementById('modalModel');
  const modalResolution = document.getElementById('modalResolution');
  const modalSeed = document.getElementById('modalSeed');
  const modalDate = document.getElementById('modalDate');
  const modalDownloadSourceBtn = document.getElementById('modalDownloadSourceBtn');
  
  // If the image is stored in IDB, load it async; otherwise use inlined data URL
  modalImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
  if (image.imageKey) {
    idbGetBlob(image.imageKey).then(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      modalImage.src = url;
    }).catch(e => {
      console.warn('Failed to load modal image blob', e);
      if (image.imageData) modalImage.src = image.imageData;
    });
  } else if (image.imageData) {
    modalImage.src = image.imageData;
  }
  modalModel.textContent = image.settings.model;
  modalResolution.textContent = `${image.settings.width} × ${image.settings.height}`;
  modalSeed.textContent = image.settings.seed || 'Random';
  // Format date as YYYY-MM-DD and time as 24h HH:MM
  const d = new Date(image.timestamp);
  const pad = (n) => String(n).padStart(2, '0');
  const formattedDate = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const formattedTime = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  modalDate.textContent = `${formattedDate} ${formattedTime}`;
  
  // Show/hide source download button
  // If we stored source in IDB, indicate accordingly
  if (image.sourceImageData || image.sourceKey) {
    modalDownloadSourceBtn.style.display = 'inline-flex';
  } else {
    modalDownloadSourceBtn.style.display = 'none';
  }
  
  // Show modal (remove any closing class)
  modal.classList.remove('closing');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

function closeImageModal() {
  const modal = document.getElementById('imageModal');
  if (!modal) return;
  // Add closing animation class and wait for animation to finish
  modal.classList.add('closing');
  const onAnimEnd = (e) => {
    if (e.target !== modal) return;
    modal.style.display = 'none';
    modal.classList.remove('closing');
    modal.removeEventListener('animationend', onAnimEnd);
    document.body.style.overflow = ''; // Restore scrolling
    currentModalImage = null;
  };
  modal.addEventListener('animationend', onAnimEnd);
}

function downloadModalImage() {
  if (!currentModalImage) return;
  // If image is stored as imageKey, fetch blob from IDB first
  (async () => {
    try {
      if (currentModalImage.imageKey) {
        const blob = await idbGetBlob(currentModalImage.imageKey);
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `${currentModalImage.filename}.jpg`; a.click();
        URL.revokeObjectURL(url);
      } else if (currentModalImage.imageData) {
        const a = document.createElement('a'); a.href = currentModalImage.imageData; a.download = `${currentModalImage.filename}.jpg`; a.click();
      }
    } catch (e) {
      console.warn('Download modal image failed', e);
    }
  })();
}

function downloadModalSourceImage() {
  if (!currentModalImage) return;
  (async () => {
    try {
      if (currentModalImage.sourceKey) {
        const blob = await idbGetBlob(currentModalImage.sourceKey);
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `${currentModalImage.filename}-source.jpg`; a.click();
        URL.revokeObjectURL(url);
      } else if (currentModalImage.sourceImageData) {
        const a = document.createElement('a'); a.href = currentModalImage.sourceImageData; a.download = `${currentModalImage.filename}-source.jpg`; a.click();
      }
    } catch (e) {
      console.warn('Download modal source failed', e);
    }
  })();
}

function loadModalSettings() {
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
    currentModel = settings.model;
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
      sourceB64 = currentModalImage.sourceImageData.split(',')[1];
      sourceMime = 'image/jpeg';
    } else if (currentModalImage.sourceKey) {
      // fetch blob from IDB and create object URL
      idbGetBlob(currentModalImage.sourceKey).then(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        els.imgThumb.innerHTML = `<img src="${url}" alt="source"/>`;
        // Also prepare base64 for API by reading blob (async)
        const r = new FileReader(); r.onload = () => { sourceB64 = (r.result || '').split(',')[1]; sourceMime = blob.type || 'image/jpeg'; }; r.readAsDataURL(blob);
      }).catch(e => console.warn('Failed to load source blob for modal load', e));
    }
  }
  
  closeImageModal();
  toast('Settings loaded from image');
  log(`[${ts()}] Settings loaded from saved image`);
}

function deleteModalImage() {
  if (!currentModalImage) return;
  
  if (!confirm('Delete this image? This cannot be undone.')) {
    return;
  }
  
  deleteImageFromHistory(currentModalImage.id);
  closeImageModal();
  toast('Image deleted');
}

// Activity Log Collapse
function getLogCollapsedState() {
  return localStorage.getItem('chutes_log_collapsed') === 'true';
}

function setLogCollapsedState(collapsed) {
  localStorage.setItem('chutes_log_collapsed', collapsed.toString());
}

function toggleActivityLog() {
  const container = document.getElementById('logContainer');
  const toggleIcon = document.getElementById('logToggleIcon');
  const toggleText = document.getElementById('logToggleText');
  
  const isCollapsed = container.style.display === 'none';
  
  if (isCollapsed) {
    container.style.display = 'block';
    toggleIcon.textContent = '▼';
    toggleText.textContent = 'Collapse';
    setLogCollapsedState(false);
  } else {
    container.style.display = 'none';
    toggleIcon.textContent = '▶';
    toggleText.textContent = 'Expand';
    setLogCollapsedState(true);
  }
}

// Initialize log state
function initializeActivityLog() {
  const container = document.getElementById('logContainer');
  const toggleIcon = document.getElementById('logToggleIcon');
  const toggleText = document.getElementById('logToggleText');
  
  const isCollapsed = getLogCollapsedState();
  
  if (isCollapsed) {
    container.style.display = 'none';
    toggleIcon.textContent = '▶';
    toggleText.textContent = 'Expand';
  } else {
    container.style.display = 'block';
    toggleIcon.textContent = '▼';
    toggleText.textContent = 'Collapse';
  }
}

// Event Listeners
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
  if (e.key === 'Escape' && currentModalImage) {
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
