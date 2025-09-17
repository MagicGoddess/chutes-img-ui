// Modal dialog functionality for image viewing and management

import { idbGetBlob } from './storage.js';
import { getImageHistory } from './storage.js';
import { toast, ts } from './helpers.js';
import { log } from './activityLog.js';
import { findPresetForDimensions } from './imageUtils.js';

let currentModalImage = null;

export async function openImageModal(imageId, idbGetAllMeta, selectionMode, toggleImageSelection) {
  if (selectionMode) {
    toggleImageSelection(imageId);
    return;
  }
  
  // Find image metadata from the same source as the grid
  let history = [];
  try {
    const idbMeta = await idbGetAllMeta();
    if (idbMeta && idbMeta.length) {
      history = idbMeta;
    } else {
      history = getImageHistory();
    }
  } catch (e) {
    history = getImageHistory();
  }
  
  const image = history.find(img => img.id === imageId);
  if (!image) {
    console.warn('Image not found:', imageId);
    return;
  }
  
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

export function closeImageModal() {
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

export function downloadModalImage() {
  if (!currentModalImage) return;
  // If image is stored as imageKey, fetch blob from IDB first
  (async () => {
    try {
      if (currentModalImage.imageKey) {
        const blob = await idbGetBlob(currentModalImage.imageKey);
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); 
        a.href = url; 
        a.download = `${currentModalImage.filename}.jpg`; 
        a.click();
        URL.revokeObjectURL(url);
      } else if (currentModalImage.imageData) {
        const a = document.createElement('a'); 
        a.href = currentModalImage.imageData; 
        a.download = `${currentModalImage.filename}.jpg`; 
        a.click();
      }
    } catch (e) {
      console.warn('Download modal image failed', e);
    }
  })();
}

export function downloadModalSourceImage() {
  if (!currentModalImage) return;
  (async () => {
    try {
      if (currentModalImage.sourceKey) {
        const blob = await idbGetBlob(currentModalImage.sourceKey);
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); 
        a.href = url; 
        a.download = `${currentModalImage.filename}-source.jpg`; 
        a.click();
        URL.revokeObjectURL(url);
      } else if (currentModalImage.sourceImageData) {
        const a = document.createElement('a'); 
        a.href = currentModalImage.sourceImageData; 
        a.download = `${currentModalImage.filename}-source.jpg`; 
        a.click();
      }
    } catch (e) {
      console.warn('Download modal source failed', e);
    }
  })();
}

export function loadModalSettings(
  els, 
  switchMode, 
  updateParametersForModel, 
  sync, 
  applyPreset, 
  toggleDimInputs,
  setCurrentModel,
  setSourceImage
) {
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
      els.imgThumb.innerHTML = `<img src="${currentModalImage.sourceImageData}" alt="source"/>`;
      const sourceB64 = currentModalImage.sourceImageData.split(',')[1];
      const sourceMime = 'image/jpeg';
      setSourceImage(sourceB64, sourceMime, null);
    } else if (currentModalImage.sourceKey) {
      // fetch blob from IDB and create object URL
      idbGetBlob(currentModalImage.sourceKey).then(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        els.imgThumb.innerHTML = `<img src="${url}" alt="source"/>`;
        // Also prepare base64 for API by reading blob (async)
        const r = new FileReader(); 
        r.onload = () => { 
          const sourceB64 = (r.result || '').split(',')[1]; 
          const sourceMime = blob.type || 'image/jpeg'; 
          setSourceImage(sourceB64, sourceMime, url);
        }; 
        r.readAsDataURL(blob);
      }).catch(e => console.warn('Failed to load source blob for modal load', e));
    }
  }
  
  closeImageModal();
  toast('Settings loaded from image');
  log(`[${ts()}] Settings loaded from saved image`);
}

export function deleteModalImage(deleteImageFromHistory) {
  if (!currentModalImage) return;
  
  if (!confirm('Delete this image? This cannot be undone.')) {
    return;
  }
  
  deleteImageFromHistory(currentModalImage.id);
  closeImageModal();
  toast('Image deleted');
}

export function getCurrentModalImage() {
  return currentModalImage;
}