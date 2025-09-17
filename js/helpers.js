// Common utility functions

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function snap(v, step, min, max) {
  const clamped = clamp(v, min, max);
  return clamp(Math.round(clamped / step) * step, min, max);
}

export function ts() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function dataURLToBlob(dataURL) {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

// Toast notification system
let toastTimer = null;
export function toast(msg, isErr = false) {
  const el = document.getElementById('toast');
  if (!el) return;
  clearTimeout(toastTimer);
  el.textContent = msg;
  el.style.display = 'block';
  el.style.backgroundColor = isErr ? '#dc2626' : '#059669';
  toastTimer = setTimeout(() => {
    el.style.display = 'none';
  }, 3000);
}

// Busy state management
export function setBusy(state, msg = 'Working…') {
  const btn = document.getElementById('generateBtn');
  const status = document.getElementById('runStatus');
  if (!btn || !status) return;
  
  if (state) {
    btn.disabled = true;
    btn.textContent = msg;
    status.textContent = msg;
  } else {
    btn.disabled = false;
    btn.textContent = 'Generate';
    status.textContent = '';
  }
}

// Title animation for generation progress
let _originalTitle = document.title || 'Chutes Image UI';
let _doneTimer = null;
let _audioEl = null;

export function ensureAudio() {
  if (_audioEl) return _audioEl;
  try {
    _audioEl = new Audio('./audio/completed.ogg');
    _audioEl.preload = 'auto';
  } catch (e) {
    _audioEl = null;
  }
  return _audioEl;
}

export function startGenerationTitle() {
  document.title = '⏳ Generating…';
  clearTimeout(_doneTimer);
  _doneTimer = setTimeout(() => {
    document.title = _originalTitle;
  }, 120000); // 2 minutes fallback
}

export function generationComplete() {
  document.title = '✅ Done!';
  clearTimeout(_doneTimer);
  _doneTimer = setTimeout(() => {
    document.title = _originalTitle;
  }, 5000);
  
  // Play completion sound if available
  const audioEl = ensureAudio();
  if (audioEl) {
    audioEl.play().catch(() => {
      // Audio playback failed, ignore
    });
  }
}