// Service worker registration and update handling

import { toast } from './helpers.js';

export function initializeServiceWorker() {
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
}