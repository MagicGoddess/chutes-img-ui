// Image utilities, file handling, and resolution preset management

import { snap } from './helpers.js';
import { ts } from './helpers.js';

// Resolution presets
export const PRESETS = {
  '512x512': { w: 512, h: 512 },
  '1024x1024': { w: 1024, h: 1024 },
  '1536x1024': { w: 1536, h: 1024 },
  '1024x1536': { w: 1024, h: 1536 },
  '768x1360': { w: 768, h: 1360 },
  '1360x768': { w: 1360, h: 768 },
  '2048x2048': { w: 2048, h: 2048 },
  '2024x2024': { w: 2024, h: 2024 },
  '1920x1080': { w: 1920, h: 1080 },
  '1080x1920': { w: 1080, h: 1920 }
};

let autoDimsCache = null; // {w,h}

// Helper function to find preset that matches given dimensions
export function findPresetForDimensions(width, height, mode = 'text-to-image') {
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

export async function computeAndDisplayAutoDims(imgUrl, els, log) {
  try {
    const dims = await computeAutoDims(imgUrl);
    autoDimsCache = dims;
    if (els.autoDims) {
      els.autoDims.style.display = 'block';
      els.autoDims.textContent = `Auto: ${dims.w} × ${dims.h}`;
    }
    // Update width/height inputs even when they are disabled so user can see values
    if (els.width && els.height) { 
      els.width.value = dims.w; 
      els.height.value = dims.h; 
    }
    if (log) log(`[${ts()}] Auto resolution computed: ${dims.w}x${dims.h}`);
  } catch (e) {
    if (els.autoDims) { 
      els.autoDims.style.display = 'block'; 
      els.autoDims.textContent = 'Auto: (failed to read image)'; 
    }
  }
}

export function computeAutoDims(imgUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let w = img.naturalWidth; 
      let h = img.naturalHeight;
      if (!(w > 0 && h > 0)) return reject(new Error('Invalid source dimensions'));
      // Maintain aspect ratio while keeping max side <= 2048 and both between 128-2048
      const MAX = 2048; const MIN = 128;
      // Scale so that the largest side becomes as large as possible but <= MAX
      const scale = Math.min(MAX / Math.max(w, h), 1); // don't upscale
      w = Math.floor(w * scale); 
      h = Math.floor(h * scale);
      // Enforce multiples of 64
      w = snap(w, 64, MIN, MAX); 
      h = snap(h, 64, MIN, MAX);
      // Guarantee at least 128
      if (w < MIN) w = MIN; 
      if (h < MIN) h = MIN;
      resolve({ w, h });
    };
    img.onerror = reject;
    img.src = imgUrl;
  });
}

export function applyPreset(els, toggleDimInputs, log) {
  if (!els.resolutionPreset) return;
  const val = els.resolutionPreset.value;
  if (val === 'custom') {
    toggleDimInputs(true);
    if (els.autoDims) els.autoDims.style.display = 'none';
    if (log) log(`[${ts()}] Preset: custom`);
    return;
  }
  if (val === 'auto') {
    toggleDimInputs(false); // disable manual editing during auto
    if (els.autoDims) { 
      els.autoDims.style.display = 'block'; 
      els.autoDims.textContent = 'Auto: (waiting for image)'; 
    }
    const src = lastSourceObjectUrl(els);
    if (src) {
      // If we already computed auto dims earlier, use cache to populate inputs immediately
      if (autoDimsCache) { 
        if (els.width && els.height) { 
          els.width.value = autoDimsCache.w; 
          els.height.value = autoDimsCache.h; 
        }
      } else { 
        computeAndDisplayAutoDims(src, els, log); 
      }
    }
    if (log) log(`[${ts()}] Preset: auto`);
    return;
  }
  const p = PRESETS[val];
  if (p) {
    toggleDimInputs(false);
    els.width.value = p.w;
    els.height.value = p.h;
    if (els.autoDims) els.autoDims.style.display = 'none';
    if (log) log(`[${ts()}] Preset selected: ${val}`);
    return;
  }
}

export function lastSourceObjectUrl(els) {
  // We can re-use the current <img> inside imgThumb if present
  const img = els.imgThumb.querySelector('img');
  return img ? img.src : null;
}

// Image upload and preview variables
export let sourceB64 = null;
export let sourceMime = null; 
export let lastBlobUrl = null;

export function setSourceImage(b64, mime, blobUrl) {
  sourceB64 = b64;
  sourceMime = mime;
  lastBlobUrl = blobUrl;
}

export function getSourceImage() {
  return { sourceB64, sourceMime, lastBlobUrl };
}

export function clearSourceImage() {
  sourceB64 = null;
  sourceMime = null;
  if (lastBlobUrl) {
    URL.revokeObjectURL(lastBlobUrl);
    lastBlobUrl = null;
  }
}