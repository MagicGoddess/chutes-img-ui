// Image generation utilities - handles timing, title management, and UI state

import { els, hasResultImg } from './ui.js';

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

// Public API
export {
  ensureAudio,
  startGenerationTitle,
  generationComplete,
  setBusy
};