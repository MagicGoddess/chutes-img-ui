// Common utility functions and helpers

/**
 * Clamps a value between min and max
 * @param {number} v - The value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} The clamped value
 */
export function clamp(v, min, max) { 
  return Math.max(min, Math.min(max, v)); 
}

/**
 * Snaps a value to the nearest step within min/max bounds
 * @param {number} v - The value to snap
 * @param {number} step - The step size
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} The snapped value
 */
export function snap(v, step, min, max) {
  const clamped = clamp(v, min, max);
  return clamp(Math.round(clamped / step) * step, min, max);
}

/**
 * Gets current timestamp formatted as HH:MM:SS
 * @returns {string} Formatted timestamp
 */
export function ts() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/**
 * Converts a File to base64 data URL
 * @param {File} file - The file to convert
 * @returns {Promise<string>} Base64 data URL
 */
export function fileToBase64(file) {
  return new Promise((res, rej) => { 
    const r = new FileReader(); 
    r.onload = () => res(r.result); 
    r.onerror = rej; 
    r.readAsDataURL(file); 
  });
}

/**
 * Converts a data URL to Blob
 * @param {string} dataURL - The data URL to convert
 * @returns {Blob} The converted blob
 */
export function dataURLToBlob(dataURL) {
  const parts = dataURL.split(',');
  const meta = parts[0];
  const b64 = parts[1] || '';
  const mime = meta.match(/:(.*?);/)[1] || 'image/png';
  const binary = atob(b64);
  const len = binary.length;
  const u8 = new Uint8Array(len);
  for (let i = 0; i < len; i++) u8[i] = binary.charCodeAt(i);
  return new Blob([u8], { type: mime });
}