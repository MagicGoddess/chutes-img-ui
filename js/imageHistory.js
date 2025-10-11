// Image history management - handles saving, loading, and managing generated images

import { 
  idbPutBlob, idbGetBlob, idbPutMeta, idbGetAllMeta, idbDeleteMeta, 
  idbClearMeta, idbDelete, getImageHistory, saveImageHistory,
  calculateStorageUsage, formatBytes
} from './storage.js';
import { dataURLToBlob, ts } from './helpers.js';
import { log } from './activityLog.js';
import { toast } from './serviceWorker.js';
import { 
  els, currentMode, currentModel, sourceB64, sourceMime, sourceB64s, sourceMimes,
  setCurrentModel, setSourceImage, setSourceImages, switchMode, updateParametersForModel,
  toggleDimInputs, applyPreset, sync, setImgThumbContent, updateParametersForEditModel,
  renderSourceThumbs, computeAndDisplayAutoDims
} from './ui.js';
import { EDIT_MODEL_CONFIGS } from './models.js';
import { findPresetForDimensions } from './imageUtils.js';
import { 
  openImageModal, closeImageModal, downloadModalImage, 
  downloadModalSourceImage, getCurrentModalImage 
} from './modal.js';

// Image History System
// Track object URLs for grid images to prevent memory leaks
let gridObjectUrls = new Set();

function describeImageResolution(settings = {}) {
  const res = settings.resolution;
  if (res) {
    const normalized = String(res).trim();
    if (!normalized) return 'Unknown';
    if (normalized.toLowerCase() === 'auto') return 'Auto';
    if (normalized.includes(':')) return `Aspect ${normalized}`;
    const cleaned = normalized.replace('*', 'x');
    const parts = cleaned.split('x');
    if (parts.length === 2 && parts.every(part => part && part.trim())) {
      return `${parts[0]}×${parts[1]}`;
    }
    return cleaned;
  }
  const w = settings.width;
  const h = settings.height;
  if (w && h) {
    return `${w}×${h}`;
  }
  if (w && !h) {
    return `${w}×?`;
  }
  if (!w && h) {
    return `?×${h}`;
  }
  return 'Unknown';
}

// Track current filter state
let currentFilter = 'all'; // 'all', 'images', 'videos', 'tts'

// Clean up grid object URLs
function cleanupGridObjectUrls() {
  for (const url of gridObjectUrls) {
    URL.revokeObjectURL(url);
  }
  gridObjectUrls.clear();
}

// Update storage usage display
async function updateStorageUsage() {
  const storageElement = document.getElementById('storageUsage');
  if (!storageElement) return;
  
  try {
    const usage = await calculateStorageUsage();
    const totalFormatted = formatBytes(usage.total);
    const idbFormatted = formatBytes(usage.idb);
    const localFormatted = formatBytes(usage.localStorage);
    
    // Compact format for desktop, detailed for mobile
    storageElement.innerHTML = `
      Storage: <strong>${totalFormatted}</strong>
      <div class="storage-breakdown">
        Media: ${idbFormatted} • Settings: ${localFormatted}
      </div>
    `;
  } catch (e) {
    console.warn('Failed to calculate storage usage:', e);
    storageElement.innerHTML = 'Storage unavailable';
  }
}

// Update file sizes for entries that don't have them (migration helper)
async function updateMissingFileSizes(filteredHistory) {
  const itemsToUpdate = [];
  
  for (const img of filteredHistory) {
    if (!img.fileSize && img.imageKey) {
      try {
        const blob = await idbGetBlob(img.imageKey);
        if (blob && blob.size) {
          img.fileSize = blob.size;
          itemsToUpdate.push(img);
        }
      } catch (e) {
        console.warn('Failed to get blob size for', img.id, e);
      }
    }
  }
  
  // Update metadata store with file sizes
  if (itemsToUpdate.length > 0) {
    try {
      for (const item of itemsToUpdate) {
        await idbPutMeta(item);
      }
      // Also update localStorage snapshot
      const history = getImageHistory();
      const updated = history.map(h => {
        const update = itemsToUpdate.find(u => u.id === h.id);
        return update ? { ...h, fileSize: update.fileSize } : h;
      });
      saveImageHistory(updated);
    } catch (e) {
      console.warn('Failed to update file sizes in storage', e);
    }
  }
}

// Filter management
function setHistoryFilter(filter) {
  currentFilter = filter;
  refreshImageGrid();
}

function getHistoryFilter() {
  return currentFilter;
}

function filterHistoryByType(history) {
  if (currentFilter === 'all') return history;
  
  return history.filter(item => {
    const isVideo = item.settings?.type === 'video';
    const isTts = item.settings?.type === 'tts';
    if (currentFilter === 'videos') return isVideo;
    if (currentFilter === 'images') return !isVideo;
    if (currentFilter === 'tts') return isTts;
    return true;
  });
}
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
        try { 
          await idbPutBlob(imageKey, blob, blob.type); 
          entry.imageKey = imageKey; 
          delete entry.imageData; 
          changed = true; 
        } catch (e) { 
          console.warn('Migration image put failed', e); 
        }
      }
      if (entry.sourceImageData && typeof entry.sourceImageData === 'string' && entry.sourceImageData.startsWith('data:')) {
        const sblob = dataURLToBlob(entry.sourceImageData);
        const sourceKey = `${entry.id}:src`;
        try { 
          await idbPutBlob(sourceKey, sblob, sblob.type); 
          entry.sourceKey = sourceKey; 
          delete entry.sourceImageData; 
          changed = true; 
        } catch (e) { 
          console.warn('Migration source put failed', e); 
        }
      }
    }
    if (changed) {
      // Save updated metadata back to localStorage (or to IDB later if migrating metadata)
      saveImageHistory(history);
      console.log('Migrated some images to IndexedDB');
    }
  } catch (e) {
    console.warn('Migration failed', e);
  }
}

async function saveGeneratedImage(contentBlob, settings) {
  const id = Date.now() + Math.random().toString(36).substr(2, 9);
  const contentKey = `${id}:${settings.type || 'img'}`;
  const hasMultipleSources = Array.isArray(sourceB64s) && sourceB64s.length > 1;
  const sourceKey = (!hasMultipleSources && sourceB64) ? `${id}:src` : null;
  const sourceKeys = hasMultipleSources ? sourceB64s.map((_, idx) => `${id}:src${idx}`) : null;

  // Save blobs to IDB first
  try {
  await idbPutBlob(contentKey, contentBlob, contentBlob.type || (settings.type === 'video' ? 'video/mp4' : settings.type === 'tts' ? 'audio/wav' : 'image/jpeg'));
    if (sourceKey) {
      // convert sourceB64 data to blob
      const srcDataUrl = `data:${sourceMime};base64,${sourceB64}`;
      const srcBlob = dataURLToBlob(srcDataUrl);
      await idbPutBlob(sourceKey, srcBlob, srcBlob.type || 'image/jpeg');
    } else if (sourceKeys && sourceB64s && sourceB64s.length) {
      for (let i = 0; i < sourceB64s.length; i++) {
        const b64 = sourceB64s[i];
        const mime = sourceMimes[i] || 'image/jpeg';
        const dataUrl = `data:${mime};base64,${b64}`;
        const sblob = dataURLToBlob(dataUrl);
        await idbPutBlob(sourceKeys[i], sblob, sblob.type || 'image/jpeg');
      }
    }
  } catch (e) {
    console.warn('Failed to store content in IndexedDB, falling back to localStorage for data', e);
    // On failure, fall back to inlining base64 in metadata (older behavior)
    const reader = new FileReader();
    reader.onload = function() {
      const history = getImageHistory();
      const contentData = {
        id,
        imageData: reader.result, // Keep as imageData for backwards compatibility
        sourceImageData: (!hasMultipleSources && sourceB64) ? `data:${sourceMime};base64,${sourceB64}` : null,
        sourceImageDatas: (hasMultipleSources && sourceB64s) ? sourceB64s.map((b64,i)=>`data:${sourceMimes[i]||'image/jpeg'};base64,${b64}`) : null,
        fileSize: contentBlob.size, // Store file size in bytes
        settings: {
          ...settings,
          mode: currentMode,
          model: settings.model || (currentMode === 'text-to-image' ? currentModel : 'qwen-image-edit')
        },
        timestamp: Date.now(),
        filename: `${settings.type === 'video' ? `${currentModel}-video` : (currentMode === 'image-edit' ? 'qwen-edit' : currentModel)}-${Date.now()}`
      };
      history.unshift(contentData);
      if (history.length > 50) history.splice(50);
      saveImageHistory(history);
      refreshImageGrid();
      updateStorageUsage();
      log(`[${ts()}] ${settings.type === 'video' ? 'Video' : 'Image'} saved to history (fallback localStorage)`);
    };
    reader.readAsDataURL(contentBlob);
    return;
  }

  // Prepare metadata entry
  const meta = {
    id,
    imageKey: contentKey, // Keep as imageKey for backwards compatibility
    sourceKey,
    sourceKeys,
    fileSize: contentBlob.size, // Store file size in bytes
    settings: {
      ...settings,
      mode: currentMode,
      model: settings.model || (currentMode === 'text-to-image' ? currentModel : 'qwen-image-edit')
    },
    timestamp: Date.now(),
    filename: `${settings.type === 'video' ? `${currentModel}-video` : settings.type === 'tts' ? `${currentModel}-tts` : (currentMode === 'image-edit' ? 'qwen-edit' : currentModel)}-${Date.now()}`
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
  updateStorageUsage();
  log(`[${ts()}] ${settings.type === 'video' ? 'Video' : 'Content'} saved to history (IndexedDB)`);
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
  updateStorageUsage();
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
  updateStorageUsage();
  toast('Image history cleared');
}

// Selection mode management
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

async function deleteSelectedImages() {
  if (selectedImages.size === 0) return;
  
  if (!confirm(`Delete ${selectedImages.size} selected generations(s)? This cannot be undone.`)) {
    return;
  }
  
  // Get all metadata to find entries to delete
  let allHistory = [];
  try {
    const idbMeta = await idbGetAllMeta();
    if (idbMeta && idbMeta.length) {
      allHistory = idbMeta;
    } else {
      allHistory = getImageHistory();
    }
  } catch (e) {
    allHistory = getImageHistory();
  }

  // Delete blobs and metadata from IDB for selected images
  for (const imageId of selectedImages) {
    const entry = allHistory.find(img => img.id === imageId);
    if (entry) {
      if (entry.imageKey) await idbDelete(entry.imageKey).catch(()=>{});
      if (entry.sourceKey) await idbDelete(entry.sourceKey).catch(()=>{});
      await idbDeleteMeta(imageId).catch(()=>{});
    }
  }

  // Also update localStorage snapshot
  const history = getImageHistory();
  const newHistory = history.filter(img => !selectedImages.has(img.id));
  saveImageHistory(newHistory);

  // Capture count before clearing the selection set
  const deletedCount = selectedImages.size;

  selectedImages.clear();
  refreshImageGrid();
  updateStorageUsage();
  toast(`Deleted ${deletedCount} image(s)`);

  if (selectionMode) {
    toggleSelectionMode(); // Exit selection mode
  }
}

function refreshImageGrid() {
  const grid = document.getElementById('imageGrid');
  
  // Clean up previous grid object URLs to prevent memory leaks
  cleanupGridObjectUrls();
  
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
  grid.innerHTML = '<div class="empty-state"><span class="muted">No content generated yet. Create your first image, video, or TTS to see it here!</span></div>';
      document.getElementById('toggleSelectionBtn').style.display = 'none';
      return;
    }

    // Apply current filter
    const filteredHistory = filterHistoryByType(history);
    
    // Update missing file sizes for existing entries (migration)
    updateMissingFileSizes(filteredHistory);
    
    if (filteredHistory.length === 0) {
  const filterText = currentFilter === 'images' ? 'images' : 
        currentFilter === 'videos' ? 'videos' : currentFilter === 'tts' ? 'TTS' : 'content';
      grid.innerHTML = `<div class="empty-state"><span class="muted">No ${filterText} found in history.</span></div>`;
      document.getElementById('toggleSelectionBtn').style.display = 'none';
      return;
    }

    document.getElementById('toggleSelectionBtn').style.display = 'inline-block';

    // Render grid items with placeholders; if metadata includes imageKey, load blob async
    grid.innerHTML = filteredHistory.map(img => {
      const isVideo = img.settings?.type === 'video';
      const isTts = img.settings?.type === 'tts';
      const resolution = isVideo ? 
        img.settings.resolution || 'Unknown' : 
        (isTts ? 'Audio' : describeImageResolution(img.settings || {}));
      
      // Format file size if available
      const fileSize = img.fileSize ? formatBytes(img.fileSize) : 'Unknown';
      
      // For videos, show a captured first-frame thumbnail (with hidden video for capture)
      const mediaContent = isVideo ? 
        `<div class="video-thumbnail" data-image-id-src="${img.imageKey || ''}">
           <img class="video-thumb" alt="Video thumbnail" />
           <video style="display:none;" data-image-id-src="${img.imageKey || ''}" muted preload="metadata"></video>
         </div>` :
        (isTts ? `
         <div class="audio-thumbnail" data-image-id-src="${img.imageKey || ''}">
           <div class="audio-icon">📢</div>
         </div>` :
         `<img data-image-id-src="${img.imageKey || ''}" src="${img.imageData || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='}" alt="Generated content" loading="lazy" />`);
      
      // Media type badge (video or image). If the generation was produced by
      // the Image Edit mode, show a small edit badge (wrench) next to the image emoji.
      const isImageEdit = img.settings?.mode === 'image-edit';
      const typeBadge = isVideo
        ? `<div class="type-badge badge-video" title="Video">
             <span class="emoji">🎥</span>
           </div>`
        : (isTts ? `<div class="type-badge badge-tts" title="TTS">
             <span class="emoji">🗣️</span>
           </div>` : `<div class="type-badge badge-image" title="Image">
             <span class="emoji">🖼️</span>${isImageEdit ? '<span class="badge-edit">🔧</span>' : ''}
           </div>`);
      
      return `
        <div class="image-grid-item" data-image-id="${img.id}">
          <div class="checkbox" onclick="event.stopPropagation(); toggleImageSelection('${img.id}')"></div>
          ${mediaContent}
          <div class="overlay">
            <div style="font-weight: 600;">${img.settings.model}</div>
            <div style="opacity: 0.8;">${resolution}</div>
            <div style="opacity: 0.8; font-size: 11px;">${fileSize} • ${new Date(img.timestamp).toLocaleDateString()}</div>
          </div>
          ${typeBadge}
        </div>
      `;
    }).join('');

    // Attach click handlers to each grid item so clicks behave differently
    // depending on whether selectionMode is active. Also restore selected
    // visual state for items present in selectedImages.
    document.querySelectorAll('.image-grid-item').forEach(item => {
      const imageId = item.dataset.imageId;
      item.onclick = (e) => {
        // If selection mode is active, toggle selection instead of opening modal
        if (selectionMode) {
          toggleImageSelection(imageId);
        } else {
          openImageModal(imageId);
        }
      };

      // Reflect selection state if this image is already selected
      if (selectedImages.has(imageId)) {
        item.classList.add('selected');
        const checkbox = item.querySelector('.checkbox');
        if (checkbox) checkbox.classList.add('checked');
      }
    });

    // After rendering, asynchronously replace images/videos that have imageKey
    filteredHistory.forEach(async (img) => {
      if (!img.imageKey) return; // already inlined or fallback
      try {
        const itemEl = document.querySelector(`.image-grid-item[data-image-id="${img.id}"]`);
        if (itemEl) itemEl.classList.add('loading-thumb');
        const blob = await idbGetBlob(img.imageKey);
        if (!blob) { if (itemEl) itemEl.classList.remove('loading-thumb'); return; }
        const objectUrl = URL.createObjectURL(blob);
        gridObjectUrls.add(objectUrl); // Track for cleanup
        
        const isVideo = img.settings?.type === 'video';
        if (isVideo) {
          // Update video thumbnail: set video source and capture first frame to an image
          const videoEl = document.querySelector(`video[data-image-id-src="${img.imageKey}"]`);
          if (videoEl) {
            videoEl.src = objectUrl;
            const thumbnailDiv = videoEl.parentElement;
            const drawFrame = () => {
              try {
                if (!thumbnailDiv) return;
                const canvas = document.createElement('canvas');
                const vw = videoEl.videoWidth || 320;
                const vh = videoEl.videoHeight || 240;
                canvas.width = vw;
                canvas.height = vh;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(videoEl, 0, 0, vw, vh);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                const imgNode = thumbnailDiv.querySelector('img.video-thumb');
                if (imgNode) imgNode.src = dataUrl;
              } catch (e) {
                console.warn('Failed to capture video frame for thumbnail', e);
              }
            };
            videoEl.addEventListener('loadedmetadata', () => {
              // Seek a tiny bit into the video to ensure a decodable frame
              const t = videoEl.duration && isFinite(videoEl.duration) ? Math.min(0.1, Math.max(0, videoEl.duration - 0.01)) : 0.1;
              try { videoEl.currentTime = t; } catch (_) {}
            }, { once: true });
            videoEl.addEventListener('seeked', () => {
              drawFrame();
            }, { once: true });
            // Fallback in case seeked doesn't fire but data is ready
            videoEl.addEventListener('loadeddata', () => {
              const imgNode = thumbnailDiv?.querySelector('img.video-thumb');
              if (imgNode && !imgNode.src) drawFrame();
            }, { once: true });
          }
        } else {
          // Update image
          const imgEl = document.querySelector(`img[data-image-id-src="${img.imageKey}"]`);
          if (imgEl) imgEl.src = objectUrl;
        }
        if (itemEl) itemEl.classList.remove('loading-thumb');
      } catch (e) {
        console.warn('Failed to load content blob for', img.id, e);
        const itemEl = document.querySelector(`.image-grid-item[data-image-id="${img.id}"]`);
        if (itemEl) itemEl.classList.remove('loading-thumb');
      }
    });
    
    // Update storage usage display
    updateStorageUsage();
  })();
}

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

// Modal functionality integration
async function loadModalSettings() {
  const currentModalImage = getCurrentModalImage();
  if (!currentModalImage) return;
  
  const settings = currentModalImage.settings;
  
  // Set mode
  if (settings.mode === 'image-edit') {
    els.modeImageEdit.checked = true;
    els.modeTextToImage.checked = false;
    switchMode('image-edit');
    // Ensure the correct Image Edit model is selected and UI updated
    const targetModel = (settings.model && EDIT_MODEL_CONFIGS[settings.model]) 
      ? settings.model 
      : Object.keys(EDIT_MODEL_CONFIGS)[0];
    if (targetModel) {
      els.modelSelect.value = targetModel;
      setCurrentModel(targetModel);
      updateParametersForEditModel(targetModel);
    }
  } else {
    els.modeImageEdit.checked = false;
    els.modeTextToImage.checked = true;
    switchMode('text-to-image');
    // Set model for text-to-image
    els.modelSelect.value = settings.model;
    setCurrentModel(settings.model);
    updateParametersForModel(settings.model);
  }
  
  // Load settings
  els.prompt.value = settings.prompt || '';
  els.negPrompt.value = settings.negativePrompt || '';
  let resolvedWidth = settings.width ?? 1024;
  let resolvedHeight = settings.height ?? 1024;
  let presetToUse = null;
  const hasResolutionString = typeof settings.resolution === 'string' && settings.resolution.trim().length;
  if (hasResolutionString) {
    const resStr = settings.resolution.trim();
    const lowered = resStr.toLowerCase();
    if (lowered === 'auto') {
      presetToUse = 'auto';
      if (settings.width) resolvedWidth = settings.width;
      if (settings.height) resolvedHeight = settings.height;
    } else if (resStr.includes(':')) {
      presetToUse = 'custom-aspect';
      if (els.aspectRatio) els.aspectRatio.value = resStr;
      if (settings.width) resolvedWidth = settings.width;
      if (settings.height) resolvedHeight = settings.height;
    } else {
      const cleaned = resStr.replace('*', 'x');
      const parts = cleaned.split('x').map(v => parseInt(v, 10));
      if (parts.length === 2 && parts.every(n => !Number.isNaN(n))) {
        resolvedWidth = parts[0];
        resolvedHeight = parts[1];
        presetToUse = findPresetForDimensions(resolvedWidth, resolvedHeight, settings.mode);
        if (presetToUse === 'custom') {
          // Keep exact resolution for display when not matching preset
          if (els.resolutionPreset && !Array.from(els.resolutionPreset.options).some(opt => opt.value === cleaned)) {
            // Will fall back to custom, width/height inputs already set
          }
        }
      }
    }
  }
  if (!presetToUse) {
    presetToUse = findPresetForDimensions(resolvedWidth, resolvedHeight, settings.mode);
  }

  els.width.value = resolvedWidth;
  els.height.value = resolvedHeight;
  els.cfg.value = settings.cfgScale || 4;
  els.steps.value = settings.steps || 50;
  els.seed.value = settings.seed || '';
  
  // Set resolution preset dropdown to match the loaded dimensions
  if (els.resolutionPreset) {
    const availableValues = Array.from(els.resolutionPreset.options || []).map(opt => opt.value);
    if (!availableValues.includes(presetToUse)) {
      if (presetToUse === 'custom-aspect' && els.aspectRatio) {
        els.aspectRatio.value = '';
      }
      presetToUse = presetToUse === 'custom-aspect' ? 'custom' : 'auto';
    }
    els.resolutionPreset.value = presetToUse;
    if (presetToUse === 'custom') {
      toggleDimInputs(true);
      if (els.autoDims) els.autoDims.style.display = 'none';
    }
    // Apply preset logic to update UI state (handles auto/custom-aspect cases)
    applyPreset();
  }
  
  // Update UI
  sync();
  
  // Load source image if available
  if (settings.mode === 'image-edit') {
    const hasMultiInline = Array.isArray(currentModalImage.sourceImageDatas) && currentModalImage.sourceImageDatas.length > 0;
    const hasMultiKeys = Array.isArray(currentModalImage.sourceKeys) && currentModalImage.sourceKeys.length > 0;

    if (hasMultiInline) {
      // Multiple inline data URLs stored in history
      const b64s = [];
      const mimes = [];
      for (const dataUrl of currentModalImage.sourceImageDatas) {
        if (typeof dataUrl !== 'string') continue;
        const parts = dataUrl.split(',');
        if (parts.length === 2) {
          b64s.push(parts[1]);
          const mimeMatch = dataUrl.match(/^data:([^;]+);base64,/);
          mimes.push(mimeMatch ? mimeMatch[1] : 'image/jpeg');
        }
      }
      setSourceImages(b64s, mimes);
      renderSourceThumbs();
    } else if (hasMultiKeys) {
      // Multiple source blobs referenced by keys
      (async () => {
        try {
          const blobs = await Promise.all(currentModalImage.sourceKeys.map(k => idbGetBlob(k).catch(()=>null)));
          const b64s = [];
          const mimes = [];
          for (const blob of blobs) {
            if (!blob) continue;
            const r = new FileReader();
            const b64 = await new Promise((resolve, reject) => {
              r.onload = () => resolve(String(r.result || ''));
              r.onerror = reject;
              r.readAsDataURL(blob);
            });
            const parts = b64.split(',');
            if (parts.length === 2) {
              b64s.push(parts[1]);
              mimes.push(blob.type || 'image/jpeg');
            }
          }
          setSourceImages(b64s, mimes);
          renderSourceThumbs();
        } catch (e) {
          console.warn('Failed to load multi-source blobs for modal load', e);
        }
      })();
    } else if (currentModalImage.sourceImageData) {
      // Single inline data URL
      setImgThumbContent(`<img src="${currentModalImage.sourceImageData}" alt="source"/>`);
      setSourceImage(currentModalImage.sourceImageData.split(',')[1], 'image/jpeg');
      // Keep arrays in sync for single-image case
      setSourceImages([currentModalImage.sourceImageData.split(',')[1]], ['image/jpeg']);
    } else if (currentModalImage.sourceKey) {
      // Single blob key
      idbGetBlob(currentModalImage.sourceKey).then(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        setImgThumbContent(`<img src="${url}" alt="source"/>`, url);
        const r = new FileReader(); 
        r.onload = () => { 
          const data = (r.result || '').split(',')[1];
          const mime = blob.type || 'image/jpeg';
          setSourceImage(data, mime);
          setSourceImages([data], [mime]);
        }; 
        r.readAsDataURL(blob);
      }).catch(e => console.warn('Failed to load source blob for modal load', e));
    }

    // If preset is Auto, recompute dimensions from first source image
    try {
      if (els.resolutionPreset && els.resolutionPreset.value === 'auto') {
        const firstB64 = (Array.isArray(sourceB64s) && sourceB64s.length) ? sourceB64s[0] : sourceB64;
        const firstMime = (Array.isArray(sourceMimes) && sourceMimes.length) ? (sourceMimes[0] || 'image/jpeg') : (sourceMime || 'image/jpeg');
        if (firstB64) {
          const dataUrl = `data:${firstMime};base64,${firstB64}`;
          await computeAndDisplayAutoDims(dataUrl);
        }
      }
    } catch (e) {
      console.warn('Auto dims compute failed during Load Settings', e);
    }
  }
  
  closeImageModal();
  toast('Settings loaded from image');
  log(`[${ts()}] Settings loaded from saved image`);
}

function deleteModalImage() {
  const currentModalImage = getCurrentModalImage();
  if (!currentModalImage) return;
  
  if (!confirm('Delete this image? This cannot be undone.')) {
    return;
  }
  
  deleteImageFromHistory(currentModalImage.id);
  closeImageModal();
  toast('Image deleted');
}

// Initialize image history system
function initializeImageHistory() {
  // Run migration then refresh grid (migration is non-blocking but we want a refresh after it finishes)
  migrateLocalStorageToIdb().then(() => {
    // After migration, attempt to move localStorage snapshot into IDB meta if needed
    refreshImageGrid();
  }).catch(() => {
    refreshImageGrid();
  });
}

// Public API
export {
  migrateLocalStorageToIdb,
  saveGeneratedImage,
  deleteImageFromHistory,
  clearImageHistory,
  selectionMode,
  selectedImages,
  toggleSelectionMode,
  updateSelectionUI,
  selectAllImages,
  selectNoneImages,
  deleteSelectedImages,
  refreshImageGrid,
  toggleImageSelection,
  loadModalSettings,
  deleteModalImage,
  cleanupGridObjectUrls,
  updateStorageUsage,
  initializeImageHistory,
  setHistoryFilter,
  getHistoryFilter
};