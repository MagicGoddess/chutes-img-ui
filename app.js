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
      width: { min: 256, max: 2560, default: 512, step: 64 },
      height: { min: 256, max: 2560, default: 512, step: 64 },
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
      resolution: { default: '1024x1024' },
      guidance_scale: { min: 0, max: 10, default: 5, step: 0.1 },
      num_inference_steps: { min: 5, max: 75, default: 50, step: 1 },
      seed: { min: 0, max: 100000000, default: null }
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
      cfg: { min: 1, max: 7.5, default: 4.5, step: 0.1 },
      steps: { min: 5, max: 50, default: 30, step: 1 },
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
    endpoint: 'https://chutes-neta-lumina.chutes.ai/generate',
    params: {
      width: { min: 768, max: 2048, default: 1024, step: 64 },
      height: { min: 768, max: 2048, default: 1024, step: 64 },
      cfg: { min: 4, max: 5.5, default: 4.5, step: 0.1 },
      steps: { min: 20, max: 50, default: 30, step: 1 },
      seed: { min: 0, max: null, default: 0 },
      sampler: { default: 'res_multistep' },
      scheduler: { default: 'linear_quadratic' },
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
    <option value="1024x1024">1024 × 1024 (1:1)</option>
    <option value="1536x1024">1536 × 1024 (3:2)</option>
    <option value="1024x1536">1024 × 1536 (2:3)</option>
    <option value="2048x2048">2048 × 2048 (Hi‑Res)</option>
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
    <option value="512x512">512 × 512 (1:1)</option>
    <option value="1024x1024" selected>1024 × 1024 (1:1)</option>
    <option value="1536x1024">1536 × 1024 (3:2)</option>
    <option value="1024x1536">1024 × 1536 (2:3)</option>
    <option value="768x1360">768 × 1360 (9:16)</option>
    <option value="1360x768">1360 × 768 (16:9)</option>
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
  '2048x2048': { w:2048, h:2048 }
};
let autoDimsCache = null; // {w,h}

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
    
    if (currentMode === 'text-to-image' && config && config.params.resolution) {
      // Model uses resolution presets (like SD3)
      const preset = els.resolutionPreset.value;
      if (preset !== 'custom' && preset) {
        const [w, h] = preset.split('x').map(Number);
        width = w; height = h;
      } else {
        width = clamp(parseInt(els.width.value||'1024',10), 128, 2048);
        height = clamp(parseInt(els.height.value||'1024',10), 128, 2048);
      }
    } else {
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
      
      // Build body with standardized structure for Chutes unified API
      body = { 
        prompt,
        width,
        height,
        guidance_scale: parseFloat(els.cfg.value),
        num_inference_steps: parseInt(els.steps.value)
      };
      
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
      
      // Note: Text-to-image models don't support source images based on the schemas
      // in img-models.jsonl, so we don't send image_b64 parameter
      
      endpoint = config.endpoint;
    }

    setBusy(true, 'Generating…');
    log(`[${ts()}] Sending request to ${currentMode === 'image-edit' ? 'Qwen Image Edit' : config.name}…`);
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
    
    // Refresh quota usage after successful generation
    await refreshQuotaUsage();
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
  } else {
    if (genTimer) { clearInterval(genTimer); genTimer = null; }
    els.runStatus.className = 'muted';
    els.runStatus.textContent = '';
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

els.downloadBtn.addEventListener('click', ()=>{
  if (!hasResultImg()) return;
  const img = getResultImgElement();
  const prefix = currentMode === 'image-edit' ? 'qwen-edit' : `${currentModel}-gen`;
  const a = document.createElement('a'); a.href = img.src; a.download = `${prefix}-${Date.now()}.jpg`; a.click();
});

els.copyBtn.addEventListener('click', async ()=>{
  if (!hasResultImg()) return;
  const img = getResultImgElement();
  const res = await fetch(img.src); const blob = await res.blob();
  try{
    await navigator.clipboard.write([ new ClipboardItem({ [blob.type]: blob }) ]);
    toast('Copied to clipboard ✓');
  } catch(e){ toast('Clipboard not supported here', true); }
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
