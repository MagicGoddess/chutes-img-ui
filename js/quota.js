// Quota management functionality - handles API quota display and interactions

import { fetchQuotaUsage } from './api.js';
import { els } from './ui.js';

let quotaData = null;
const quotaElements = {
  counter: document.getElementById('quotaCounter'),
  percentage: document.getElementById('quotaPercentage'),
  text: document.getElementById('quotaText'),
  circle: document.querySelector('.progress-ring-circle'),
  tooltip: document.getElementById('quotaTooltip')
};

// Add touch event for mobile tooltip
if (quotaElements.counter && quotaElements.tooltip) {
  let touchTimer = null;
  
  quotaElements.counter.addEventListener('touchstart', (e) => {
    touchTimer = setTimeout(() => {
      quotaElements.tooltip.style.opacity = '1';
      quotaElements.tooltip.style.visibility = 'visible';
    }, 500); // Show tooltip after 500ms hold
  });
  
  quotaElements.counter.addEventListener('touchend', (e) => {
    if (touchTimer) {
      clearTimeout(touchTimer);
      touchTimer = null;
    }
    // Hide tooltip after a short delay
    setTimeout(() => {
      quotaElements.tooltip.style.opacity = '0';
      quotaElements.tooltip.style.visibility = 'hidden';
    }, 3000);
  });
  
  quotaElements.counter.addEventListener('touchmove', (e) => {
    if (touchTimer) {
      clearTimeout(touchTimer);
      touchTimer = null;
    }
    // Hide tooltip if user moves finger
    quotaElements.tooltip.style.opacity = '0';
    quotaElements.tooltip.style.visibility = 'hidden';
  });
}

function updateQuotaDisplay(quota, used) {
  if (!quotaElements.counter || !quota) return;
  
  quotaData = { quota, used };
  const usedPercentage = (used / quota) * 100;
  const remainingPercentage = 100 - usedPercentage;
  
  // Update text
  quotaElements.percentage.textContent = `${Math.round(remainingPercentage)}%`;
  quotaElements.text.textContent = `${used}/${quota} used`;
  
  // Update progress circle
  const circumference = 2 * Math.PI * 16; // radius = 16
  const offset = circumference - (remainingPercentage / 100) * circumference;
  quotaElements.circle.style.strokeDashoffset = offset;
  
  // Keep a single 'quota' marker class for styling if needed
  quotaElements.counter.classList.remove('quota-high', 'quota-medium', 'quota-low');
  quotaElements.counter.classList.add('quota');
  
  // Show the counter
  quotaElements.counter.style.display = 'flex';
}

function hideQuotaCounter() {
  if (quotaElements.counter) {
    quotaElements.counter.style.display = 'none';
  }
}

async function refreshQuotaUsage() {
  const apiKey = (els.apiKey.value || '').trim();
  if (!apiKey) {
    hideQuotaCounter();
    return;
  }
  
  const data = await fetchQuotaUsage(apiKey);
  if (data && data.quota && data.used !== undefined) {
    updateQuotaDisplay(data.quota, data.used);
  } else {
    hideQuotaCounter();
  }
}

// Public API
export {
  quotaData,
  quotaElements,
  updateQuotaDisplay,
  hideQuotaCounter,
  refreshQuotaUsage
};