// Image utility functions

import { clamp, snap } from './helpers.js';

// Resolution presets mapping
export const PRESETS = {
  '512x512': { w: 512, h: 512 },
  '1024x1024': { w: 1024, h: 1024 },
  '1536x1024': { w: 1536, h: 1024 },
  '1024x1536': { w: 1024, h: 1536 },
  '768x1360': { w: 768, h: 1360 },
  '1360x768': { w: 1360, h: 768 },
  '2048x2048': { w: 2048, h: 2048 },
  '1920x1080': { w: 1920, h: 1080 },
  '1080x1920': { w: 1080, h: 1920 }
};

/**
 * Finds preset that matches given dimensions
 * @param {number} width - Width to match
 * @param {number} height - Height to match  
 * @param {string} mode - Current mode ('text-to-image' or 'image-edit')
 * @returns {string} Preset key or 'custom'
 */
export function findPresetForDimensions(width, height, mode = 'text-to-image') {
  for (const [presetKey, preset] of Object.entries(PRESETS)) {
    if (preset.w === width && preset.h === height) {
      return presetKey;
    }
  }
  return 'custom';
}

/**
 * Computes auto dimensions from an image URL
 * @param {string} imgUrl - Image URL to analyze
 * @returns {Promise<{w: number, h: number}>} Computed dimensions
 */
export function computeAutoDims(imgUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let w = img.naturalWidth; 
      let h = img.naturalHeight;
      if (!(w > 0 && h > 0)) return reject(new Error('Invalid source dimensions'));
      
      // Maintain aspect ratio while keeping max side <= 2048 and both between 128-2048
      const MAX = 2048; 
      const MIN = 128;
      // Scale so that the largest side becomes as large as possible but <= MAX
      const scale = Math.min(MAX / Math.max(w, h), 1); // don't upscale
      w = Math.floor(w * scale); 
      h = Math.floor(h * scale);
      
      // Enforce multiples of 64
      w = snap(w, 64, MIN, MAX); 
      h = snap(h, 64, MIN, MAX);
      
      // Guarantee at least 128
      if (w < MIN) w = MIN; 
      if (h < MIN) h = MIN;
      resolve({ w, h });
    };
    img.onerror = reject;
    img.src = imgUrl;
  });
}