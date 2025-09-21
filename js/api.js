// API communication functions for Chutes services

/**
 * Fetches quota usage from the API
 * @param {string} apiKey - The API key for authentication
 * @returns {Promise<Object|null>} Quota data or null if failed
 */
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

/**
 * Makes an API call to generate an image
 * @param {string} endpoint - The API endpoint URL
 * @param {string} apiKey - The API key for authentication
 * @param {Object} body - The request body parameters
 * @returns {Promise<Blob>} The generated image blob
 */
export async function generateImage(endpoint, apiKey, body) {
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    let text = '';
    try {
      const ct = resp.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const j = await resp.json();
        text = JSON.stringify(j);
      } else {
        text = await resp.text();
      }
    } catch(_) {}
    const msg = `HTTP ${resp.status} — ${text || resp.statusText}`;
    throw new Error(msg);
  }

  return await resp.blob();
}

/**
 * Makes an API call to generate a video
 * @param {string} endpoint - The API endpoint URL
 * @param {string} apiKey - The API key for authentication
 * @param {Object} body - The request body parameters
 * @returns {Promise<Blob>} The generated video blob
 */
export async function generateVideo(endpoint, apiKey, body) {
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    let text = '';
    try {
      const ct = resp.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const j = await resp.json();
        text = JSON.stringify(j);
      } else {
        text = await resp.text();
      }
    } catch(_) {}
    const msg = `HTTP ${resp.status} — ${text || resp.statusText}`;
    throw new Error(msg);
  }

  return await resp.blob();
}