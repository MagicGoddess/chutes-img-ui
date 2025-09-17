// Image history management - handles saving, loading, and managing generated images

import { 
  idbPutBlob, idbGetBlob, idbPutMeta, idbGetAllMeta, idbDeleteMeta, 
  idbClearMeta, idbDelete, getImageHistory, saveImageHistory
} from './storage.js';
import { dataURLToBlob, ts } from './helpers.js';
import { log } from './activityLog.js';
import { toast } from './serviceWorker.js';
import { 
  els, currentMode, currentModel, sourceB64, sourceMime,
  setCurrentModel, setSourceImage, switchMode, updateParametersForModel,
  toggleDimInputs, applyPreset, sync, setImgThumbContent
} from './ui.js';
import { findPresetForDimensions } from './imageUtils.js';
import { 
  openImageModal, closeImageModal, downloadModalImage, 
  downloadModalSourceImage, getCurrentModalImage 
} from './modal.js';

// Image History System
// Track object URLs for grid images to prevent memory leaks
let gridObjectUrls = new Set();

// Clean up grid object URLs
function cleanupGridObjectUrls() {
  for (const url of gridObjectUrls) {
    URL.revokeObjectURL(url);
  }
  gridObjectUrls.clear();
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
  
  if (!confirm(`Delete ${selectedImages.size} selected image(s)? This cannot be undone.`)) {
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
        gridObjectUrls.add(objectUrl); // Track for cleanup
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
function loadModalSettings() {
  const currentModalImage = getCurrentModalImage();
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
    setCurrentModel(settings.model);
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
      setImgThumbContent(`<img src="${currentModalImage.sourceImageData}" alt="source"/>`);
      setSourceImage(currentModalImage.sourceImageData.split(',')[1], 'image/jpeg');
    } else if (currentModalImage.sourceKey) {
      // fetch blob from IDB and create object URL
      idbGetBlob(currentModalImage.sourceKey).then(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        setImgThumbContent(`<img src="${url}" alt="source"/>`, url);
        // Also prepare base64 for API by reading blob (async)
        const r = new FileReader(); 
        r.onload = () => { 
          setSourceImage((r.result || '').split(',')[1], blob.type || 'image/jpeg'); 
        }; 
        r.readAsDataURL(blob);
      }).catch(e => console.warn('Failed to load source blob for modal load', e));
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
  initializeImageHistory
};