// UI elements, DOM helpers, and mode switching functionality

import { MODEL_CONFIGS, getCurrentMode, getCurrentModel, setCurrentMode, setCurrentModel } from './models.js';
import { ts } from './helpers.js';

// DOM element references
export const els = {
  apiKey: document.getElementById('apiKey'), 
  revealKeyBtn: document.getElementById('revealKeyBtn'), 
  saveKeyBtn: document.getElementById('saveKeyBtn'), 
  forgetKeyBtn: document.getElementById('forgetKeyBtn'), 
  keyStatus: document.getElementById('keyStatus'),
  modeImageEdit: document.getElementById('modeImageEdit'), 
  modeTextToImage: document.getElementById('modeTextToImage'),
  modelSelect: document.getElementById('modelSelect'), 
  modelRow: document.getElementById('modelRow'),
  imgInput: document.getElementById('imgInput'), 
  imgThumb: document.getElementById('imgThumb'), 
  sourceImageSection: document.getElementById('sourceImageSection'), 
  sourceImageRequired: document.getElementById('sourceImageRequired'), 
  imageInputRow: document.getElementById('imageInputRow'),
  prompt: document.getElementById('prompt'), 
  negPrompt: document.getElementById('negPrompt'), 
  inputCardTitle: document.getElementById('inputCardTitle'),
  width: document.getElementById('width'), 
  height: document.getElementById('height'), 
  seed: document.getElementById('seed'),
  resolutionPreset: document.getElementById('resolutionPreset'), 
  autoDims: document.getElementById('autoDims'),
  cfg: document.getElementById('cfg'), 
  cfgVal: document.getElementById('cfgVal'), 
  steps: document.getElementById('steps'), 
  stepsVal: document.getElementById('stepsVal'),
  generateBtn: document.getElementById('generateBtn'), 
  runStatus: document.getElementById('runStatus'),
  resultImg: document.getElementById('resultImg'), 
  downloadBtn: document.getElementById('downloadBtn'), 
  copyBtn: document.getElementById('copyBtn'), 
  outMeta: document.getElementById('outMeta')
};

// Helper function to create an img element inside the result container
export function createResultImg(src) {
  // Clear the container
  els.resultImg.innerHTML = '';
  
  // Create and configure the img element
  const img = document.createElement('img');
  img.alt = 'Generated result';
  img.src = src;
  
  // Add the img to the container
  els.resultImg.appendChild(img);
  
  // Return the img element for further manipulation if needed
  return img;
}

// Helper function to check if result container has an img element
export function hasResultImg() {
  return els.resultImg.querySelector('img') !== null;
}

// Helper function to get the img element from the result container
export function getResultImgElement() {
  return els.resultImg.querySelector('img');
}

// Sync function for sliders
export const sync = () => { 
  els.cfgVal.textContent = els.cfg.value; 
  els.stepsVal.textContent = els.steps.value; 
};

// Mode switching functionality
export function switchMode(mode, log) {
  setCurrentMode(mode);
  const isTextToImage = mode === 'text-to-image';
  
  // Update UI visibility
  els.modelRow.style.display = isTextToImage ? 'block' : 'none';
  els.sourceImageSection.style.display = isTextToImage ? 'none' : 'block';
  // Add class on the input row so CSS can adapt layout for T2I
  if (els.imageInputRow) {
    if (isTextToImage) els.imageInputRow.classList.add('t2i'); else els.imageInputRow.classList.remove('t2i');
  }
  
  // Update prompt placeholder
  els.prompt.placeholder = isTextToImage ? 
    'Describe the image you want to generate...' : 
    'Describe the edit you want...';
    
  // Update input card title
  els.inputCardTitle.textContent = isTextToImage ? '3) Input & Model' : '3) Input';
    
  // Update resolution presets for text-to-image
  if (isTextToImage) {
    updateParametersForModel(getCurrentModel(), log);
  } else {
    // Restore original image edit controls
    updateParametersForImageEdit();
  }
  
  if (log) log(`[${ts()}] Switched to ${mode} mode`);
}

export function updateParametersForImageEdit() {
  // Restore original CFG and steps ranges for image editing
  els.cfg.min = 0; els.cfg.max = 10; els.cfg.step = 0.1; els.cfg.value = 4;
  els.steps.min = 5; els.steps.max = 100; els.steps.step = 1; els.steps.value = 50;
  
  // Update resolution preset options for image editing
  const preset = els.resolutionPreset;
  preset.innerHTML = `
    <option value="auto" selected>Auto (derive from source)</option>
    <option value="512x512">512 × 512 (Low-res square 1:1)</option>
    <option value="1024x1024">1024 × 1024 (Square 1:1)</option>
    <option value="1536x1024">1536 × 1024 (Landscape 3:2)</option>
    <option value="1024x1536">1024 × 1536 (Portrait 2:3)</option>
  <option value="2048x2048">2048 × 2048 (HiRes square)</option>
  <option value="2024x2024">2024 × 2024 (HiRes square)</option>
  <option value="1920x1080">1920 × 1080 (HiRes landscape 16:9)</option>
  <option value="1080x1920">1080 × 1920 (HiRes portrait 9:16)</option>
    <option value="custom">Custom…</option>
  `;
  
  // Reset to defaults
  els.width.value = 1024; els.height.value = 1024; els.seed.value = '';
  els.negPrompt.value = '';
  sync();
}

export function updateParametersForModel(modelKey, log) {
  const config = MODEL_CONFIGS[modelKey];
  if (!config) return;
  
  setCurrentModel(modelKey);
  const params = config.params;
  
  // Update CFG/guidance scale (models use different parameter names)
  const cfgParam = params.guidance_scale || params.true_cfg_scale || params.cfg;
  if (cfgParam) {
    els.cfg.min = cfgParam.min;
    els.cfg.max = cfgParam.max;
    els.cfg.step = cfgParam.step;
    els.cfg.value = cfgParam.default;
  }
  
  // Update inference steps (models use different parameter names)
  const stepsParam = params.num_inference_steps || params.steps;
  if (stepsParam) {
    els.steps.min = stepsParam.min;
    els.steps.max = stepsParam.max;
    els.steps.step = stepsParam.step;
    els.steps.value = stepsParam.default;
  }
  
  // Update width/height (now all models use width/height)
  if (params.width) {
    els.width.min = params.width.min;
    els.width.max = params.width.max;
    els.width.step = params.width.step;
    els.width.value = params.width.default;
  }
  if (params.height) {
    els.height.min = params.height.min;
    els.height.max = params.height.max;
    els.height.step = params.height.step;
    els.height.value = params.height.default;
  }
  
  // Update standard resolution presets for text-to-image
  const preset = els.resolutionPreset;
  preset.innerHTML = `
    <option value="512x512">512 × 512 (Low-res square 1:1)</option>
    <option value="1024x1024" selected>1024 × 1024 (Square 1:1)</option>
    <option value="1536x1024">1536 × 1024 (Landscape 3:2)</option>
    <option value="1024x1536">1024 × 1536 (Portrait 2:3)</option>
    <option value="768x1360">768 × 1360 (Portrait 9:16)</option>
    <option value="1360x768">1360 × 768 (Landscape 16:9)</option>
  <option value="2024x2024">2024 × 2024 (HiRes square)</option>
  <option value="1920x1080">1920 × 1080 (HiRes landscape 16:9)</option>
  <option value="1080x1920">1080 × 1920 (HiRes portrait 9:16)</option>
    <option value="custom">Custom…</option>
  `;
  
  // Update seed
  if (params.seed) {
    els.seed.min = params.seed.min;
    if (params.seed.max) {
      els.seed.max = params.seed.max;
    } else {
      els.seed.removeAttribute('max');
    }
    els.seed.value = params.seed.default || '';
  }
  
  // Update negative prompt default
  if (params.negative_prompt) {
    els.negPrompt.value = params.negative_prompt.default;
  } else {
    els.negPrompt.value = '';
  }
  
  // Update the display values
  sync();
  if (log) log(`[${ts()}] Updated parameters for ${config.name} model`);
}

// Helper function to toggle dimension inputs
export function toggleDimInputs(enabled) {
  els.width.disabled = !enabled;
  els.height.disabled = !enabled;
}