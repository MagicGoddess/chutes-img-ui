// Main entry point - coordinates all modules and handles application lifecycle

// Import all modules
import { getStoredApiKey } from './storage.js';
import { initializeActivityLog, toggleActivityLog } from './activityLog.js';
import { registerServiceWorker } from './serviceWorker.js';
import { openImageModal } from './modal.js';
import { els, switchMode, applyPreset, sync } from './ui.js';
import { refreshQuotaUsage } from './quota.js';
import { setupEventListeners } from './eventListeners.js';
import { initializeImageHistory, toggleImageSelection } from './imageHistory.js';

// Redirect helper for some static hosts
(function(){
  try{
    var p = location.pathname; 
    if (p === '/' && !location.href.endsWith('index.html')) {
      // no-op; most hosts serve index.html at '/'
    }
  }catch(e){}
})();

// Initialize service worker
registerServiceWorker();

// Load API key from storage and refresh quota
const saved = getStoredApiKey();
if (saved) { 
  if (els.apiKey) els.apiKey.value = saved; 
  if (els.keyStatus) els.keyStatus.textContent = 'Loaded from localStorage';
  // Load quota when API key is restored
  setTimeout(refreshQuotaUsage, 100);
}

// Initialize with image edit mode
switchMode('image-edit');

// Initialize resolution preset
applyPreset();

// Initialize UI display values
sync();

// Setup all event listeners
setupEventListeners();

// Initialize activity log and image history
initializeActivityLog();
initializeImageHistory();

// Global functions for HTML onclick handlers
window.toggleActivityLog = toggleActivityLog;
window.openImageModal = openImageModal;
window.toggleImageSelection = toggleImageSelection;