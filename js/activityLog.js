// Activity log functionality

import { ts } from './helpers.js';
import { getLogCollapsedState, setLogCollapsedState } from './storage.js';

/**
 * Logs a message to the activity log
 * @param {string} line - The message to log
 */
export function log(line) {
  const el = document.getElementById('logOutput');
  if (!el) return;
  el.textContent += (el.textContent ? '\n' : '') + line;
  el.scrollTop = el.scrollHeight;
}

/**
 * Toggles the activity log collapsed state
 */
export function toggleActivityLog() {
  const container = document.getElementById('logContainer');
  const toggleIcon = document.getElementById('logToggleIcon');
  const toggleText = document.getElementById('logToggleText');
  
  const isCollapsed = container.style.display === 'none';
  
  if (isCollapsed) {
    container.style.display = 'block';
    toggleIcon.textContent = '▼';
    toggleText.textContent = 'Collapse';
    setLogCollapsedState(false);
  } else {
    container.style.display = 'none';
    toggleIcon.textContent = '▶';
    toggleText.textContent = 'Expand';
    setLogCollapsedState(true);
  }
}

/**
 * Initializes activity log state from localStorage
 */
export function initializeActivityLog() {
  const container = document.getElementById('logContainer');
  const toggleIcon = document.getElementById('logToggleIcon');
  const toggleText = document.getElementById('logToggleText');
  
  const isCollapsed = getLogCollapsedState();
  
  if (isCollapsed) {
    container.style.display = 'none';
    toggleIcon.textContent = '▶';
    toggleText.textContent = 'Expand';
  } else {
    container.style.display = 'block';
    toggleIcon.textContent = '▼';
    toggleText.textContent = 'Collapse';
  }
}