// Modal dialog functionality for image history

import { idbGetBlob, idbGetAllMeta, getImageHistory } from './storage.js';
import { findPresetForDimensions } from './imageUtils.js';
import { toast } from './serviceWorker.js';
import { ts } from './helpers.js';
import { log } from './activityLog.js';

// Current modal state
let currentModalImage = null;
let modalObjectUrl = null; // Track modal object URL for cleanup

/**
 * Opens the image modal dialog
 * @param {string} imageId - The ID of the image to display
 */
export async function openImageModal(imageId) {
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
  // Create/find a video element for video previews
  let modalVideo = document.getElementById('modalVideo');
  if (!modalVideo) {
    modalVideo = document.createElement('video');
    modalVideo.id = 'modalVideo';
    modalVideo.style.display = 'none';
    modalVideo.controls = true;
    const bodyEl = document.querySelector('#imageModal .modal-body');
    if (bodyEl) bodyEl.insertBefore(modalVideo, bodyEl.firstChild);
  }
  const modalModel = document.getElementById('modalModel');
  const modalResolution = document.getElementById('modalResolution');
  const modalSeed = document.getElementById('modalSeed');
  const modalDate = document.getElementById('modalDate');
  const modalDownloadSourceBtn = document.getElementById('modalDownloadSourceBtn');
  const modalTitle = document.getElementById('modalTitle');
  const modalDownloadBtn = document.getElementById('modalDownloadBtn');
  const modalSendToEditBtn = document.getElementById('modalSendToEditBtn');
  
  // Clean up previous modal object URL
  if (modalObjectUrl) {
    URL.revokeObjectURL(modalObjectUrl);
    modalObjectUrl = null;
  }
  
  const isVideo = image.settings?.type === 'video';
  // Switch UI based on type
  if (isVideo) {
    modalTitle.textContent = 'Video Preview';
    modalImage.style.display = 'none';
    modalVideo.style.display = 'block';
  } else {
    modalTitle.textContent = 'Image Preview';
    modalImage.style.display = 'block';
    modalVideo.style.display = 'none';
  }

  // If the content is stored in IDB, load it async; otherwise use inlined data URL
  if (!isVideo) {
    modalImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
  }
  if (image.imageKey) {
    idbGetBlob(image.imageKey).then(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      modalObjectUrl = url; // Track for cleanup
      if (isVideo) {
        modalVideo.src = url;
      } else {
        modalImage.src = url;
      }
    }).catch(e => {
      console.warn('Failed to load modal content blob', e);
      if (!isVideo && image.imageData) modalImage.src = image.imageData;
    });
  } else if (!isVideo && image.imageData) {
    modalImage.src = image.imageData;
  }
  
  modalModel.textContent = image.settings.model;
  // Resolution for video entries uses resolution string; images use width/height
  if (isVideo) {
    modalResolution.textContent = image.settings.resolution || '-';
  } else {
    modalResolution.textContent = `${image.settings.width} × ${image.settings.height}`;
  }
  modalSeed.textContent = image.settings.seed || 'Random';
  
  // Format date as YYYY-MM-DD and time as 24h HH:MM
  const d = new Date(image.timestamp);
  const pad = (n) => String(n).padStart(2, '0');
  const formattedDate = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const formattedTime = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  modalDate.textContent = `${formattedDate} ${formattedTime}`;
  
  // Show/hide source download button (only relevant for image-edit and image-to-video)
  if (image.sourceImageData || image.sourceKey) {
    modalDownloadSourceBtn.style.display = 'inline-flex';
  } else {
    modalDownloadSourceBtn.style.display = 'none';
  }

  // Adjust actions based on type
  if (isVideo) {
    // Change download label and hide Send to Edit
    if (modalDownloadBtn) modalDownloadBtn.innerHTML = '<span>📥</span> Download Video';
    if (modalSendToEditBtn) modalSendToEditBtn.style.display = 'none';
  } else {
    if (modalDownloadBtn) modalDownloadBtn.innerHTML = '<span>📥</span> Download Image';
    if (modalSendToEditBtn) modalSendToEditBtn.style.display = '';
  }
  
  // Show modal (remove any closing class)
  modal.classList.remove('closing');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

/**
 * Closes the image modal dialog
 */
export function closeImageModal() {
  const modal = document.getElementById('imageModal');
  if (!modal) return;
  
  // Clean up modal object URL
  if (modalObjectUrl) {
    URL.revokeObjectURL(modalObjectUrl);
    modalObjectUrl = null;
  }
  
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

/**
 * Downloads the current modal image
 */
export function downloadModalImage() {
  if (!currentModalImage) return;
  
  (async () => {
    try {
      if (currentModalImage.imageKey) {
        const blob = await idbGetBlob(currentModalImage.imageKey);
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); 
        a.href = url; 
        const isVideo = currentModalImage.settings?.type === 'video';
        a.download = `${currentModalImage.filename}.${isVideo ? 'mp4' : 'jpg'}`; 
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

/**
 * Downloads the current modal source image
 */
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

/**
 * Loads settings from the current modal image into the UI
 * This function needs access to UI elements and will be exported for use by the main module
 */
export function loadModalSettings() {
  if (!currentModalImage) return;
  
  // This function will be implemented in the main module where UI elements are accessible
  // We export it here so it can be called from HTML event handlers
  return currentModalImage;
}

/**
 * Deletes the current modal image
 * This function needs access to other modules and will be implemented in the main module
 */
export function deleteModalImage() {
  if (!currentModalImage) return;
  
  if (!confirm('Delete this image? This cannot be undone.')) {
    return;
  }
  
  // This will be implemented in the main module where deleteImageFromHistory is accessible
  return currentModalImage.id;
}

/**
 * Gets the current modal image for use by other modules
 * @returns {Object|null} The current modal image or null
 */
export function getCurrentModalImage() {
  return currentModalImage;
}