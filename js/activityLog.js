// Activity log functionality

export function log(line) {
  const el = document.getElementById('logOutput');
  if (!el) return;
  el.textContent += (el.textContent ? '\n' : '') + line;
  el.scrollTop = el.scrollHeight;
}

export function getLogCollapsedState() {
  return localStorage.getItem('chutes_log_collapsed') === 'true';
}

export function setLogCollapsedState(collapsed) {
  localStorage.setItem('chutes_log_collapsed', collapsed.toString());
}

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

// Initialize log state
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