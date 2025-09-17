// API functions for Chutes services

export async function fetchQuotaUsage(apiKey) {
  try {
    const response = await fetch('https://api.chutes.ai/users/me/quota_usage/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.warn('Failed to fetch quota usage:', error);
  }
  return null;
}

// Quota display management
let quotaData = null;
const quotaElements = {
  counter: document.getElementById('quotaCounter'),
  percentage: document.getElementById('quotaCounter')?.querySelector('.quota-percentage'),
  text: document.getElementById('quotaCounter')?.querySelector('.quota-text'),
  circle: document.getElementById('quotaCounter')?.querySelector('circle')
};

export function updateQuotaDisplay(quota, used) {
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

export function hideQuotaCounter() {
  if (quotaElements.counter) {
    quotaElements.counter.style.display = 'none';
  }
}

export async function refreshQuotaUsage(apiKeyElement) {
  const apiKey = (apiKeyElement.value || '').trim();
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

export function getQuotaData() {
  return quotaData;
}