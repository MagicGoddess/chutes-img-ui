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
  imgInput: document.getElementById('imgInput'), imgThumb: document.getElementById('imgThumb'),
  prompt: document.getElementById('prompt'), negPrompt: document.getElementById('negPrompt'),
  width: document.getElementById('width'), height: document.getElementById('height'), seed: document.getElementById('seed'),
  resolutionPreset: document.getElementById('resolutionPreset'), autoDims: document.getElementById('autoDims'),
  cfg: document.getElementById('cfg'), cfgVal: document.getElementById('cfgVal'), steps: document.getElementById('steps'), stepsVal: document.getElementById('stepsVal'),
  generateBtn: document.getElementById('generateBtn'), runStatus: document.getElementById('runStatus'),
  resultImg: document.getElementById('resultImg'), downloadBtn: document.getElementById('downloadBtn'), copyBtn: document.getElementById('copyBtn'), outMeta: document.getElementById('outMeta')
};

// Load key
const saved = localStorage.getItem('chutes_api_key');
if (saved) { els.apiKey.value = saved; els.keyStatus.textContent = 'Loaded from localStorage'; }

els.saveKeyBtn.addEventListener('click', ()=>{
  const v = els.apiKey.value.trim();
  if (!v) { els.keyStatus.textContent='Enter a key first.'; return; }
  localStorage.setItem('chutes_api_key', v);
  els.keyStatus.textContent='Saved ✓';
  log(`[${ts()}] Saved API key to localStorage.`);
});
els.forgetKeyBtn.addEventListener('click', ()=>{
  localStorage.removeItem('chutes_api_key'); els.apiKey.value=''; els.keyStatus.textContent='Removed from localStorage';
  log(`[${ts()}] Removed API key from localStorage.`);
});

// Reveal/Hide API key
els.revealKeyBtn.addEventListener('click', ()=>{
  const isPwd = els.apiKey.type === 'password';
  els.apiKey.type = isPwd ? 'text' : 'password';
  els.revealKeyBtn.textContent = isPwd ? 'Hide' : 'Show';
  els.revealKeyBtn.setAttribute('aria-pressed', String(isPwd));
});

// Sliders
const sync = ()=>{ els.cfgVal.textContent = els.cfg.value; els.stepsVal.textContent = els.steps.value; };
els.cfg.addEventListener('input', sync); els.steps.addEventListener('input', sync); sync();

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
    if (!sourceB64) return toast('Select a source image', true);
    // Resolve width/height depending on preset
    let width, height;
    if (els.resolutionPreset){
      const preset = els.resolutionPreset.value;
      if (preset === 'auto'){
        if (!autoDimsCache){
          const srcUrl = lastSourceObjectUrl();
          if (srcUrl){
            await computeAndDisplayAutoDims(srcUrl);
          }
        }
        if (autoDimsCache){ width = autoDimsCache.w; height = autoDimsCache.h; }
      } else if (preset && PRESETS[preset]){
        width = PRESETS[preset].w; height = PRESETS[preset].h;
      }
    }
    if (!width || !height){
      // fallback to manual/custom values
      const widthIn = clamp(parseInt(els.width.value||'1024',10), 128, 2048);
      const heightIn = clamp(parseInt(els.height.value||'1024',10), 128, 2048);
      width = snap(widthIn, 64, 128, 2048);
      height = snap(heightIn, 64, 128, 2048);
    }
    if (els.autoDims && els.resolutionPreset && els.resolutionPreset.value==='auto'){
      els.autoDims.textContent = `Auto: ${width} × ${height}`;
    }
    const steps = clamp(parseInt(els.steps.value||'50',10), 5, 100);
    const cfg = clamp(parseFloat(els.cfg.value||'4'), 0, 10);
    const seedVal = els.seed.value === '' ? null : clamp(parseInt(els.seed.value,10), 0, 4294967295);
    const prompt = els.prompt.value.trim(); if (!prompt) return toast('Prompt cannot be empty', true);
    const negative_prompt = els.negPrompt.value.trim();

    // Build FLAT body (endpoint expects top-level fields)
    const body = {
      width,
      height,
      prompt,
      image_b64: sourceB64,
      true_cfg_scale: cfg,
      num_inference_steps: steps
    };
    if (negative_prompt) body.negative_prompt = negative_prompt;
    if (seedVal !== null && !Number.isNaN(seedVal)) body.seed = seedVal;

    setBusy(true, 'Generating…');
    log(`[${ts()}] Sending request to Chutes…`);
    const t0 = performance.now();
    const resp = await fetch('https://chutes-qwen-image-edit.chutes.ai/generate', {
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
    els.resultImg.src = lastBlobUrl;
    els.downloadBtn.disabled = false; els.copyBtn.disabled = false;
    const dt = ((performance.now()-t0)/1000).toFixed(1);
    els.outMeta.textContent = `Output ${blob.type || 'image/jpeg'} • ${(blob.size/1024).toFixed(0)} KB • ${dt}s`;
    toast('Done ✓');
    log(`[${ts()}] Done ✓`);
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
  els.generateBtn.disabled = state; els.downloadBtn.disabled = state || !els.resultImg.src; els.copyBtn.disabled = state || !els.resultImg.src;
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
  if (!els.resultImg.src) return;
  const a = document.createElement('a'); a.href = els.resultImg.src; a.download = `qwen-edit-${Date.now()}.jpg`; a.click();
});

els.copyBtn.addEventListener('click', async ()=>{
  if (!els.resultImg.src) return;
  const res = await fetch(els.resultImg.src); const blob = await res.blob();
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
