#!/usr/bin/env node

/**
 * Cache-busting utility script
 * 
 * This script updates version numbers in:
 * - index.html (CSS and JS file references)
 * - service-worker.js (cache version)
 * 
 * Run this script whenever you want to force browsers to fetch fresh versions
 * of your app files instead of using cached versions.
 * 
 * Usage: node update-cache-version.js
 */

const fs = require('fs');
const path = require('path');

const timestamp = Date.now();
const versionParam = `v=${timestamp}`;

console.log(`🔄 Updating cache version to: ${timestamp}`);

// Update index.html
const indexPath = path.join(__dirname, 'index.html');
let indexContent = fs.readFileSync(indexPath, 'utf8');

// Update CSS link
indexContent = indexContent.replace(
  /href="\.\/app\.css(\?v=\d+)?"/g,
  `href="./app.css?${versionParam}"`
);

// Update JS script
indexContent = indexContent.replace(
  /src="\.\/app\.js(\?v=\d+)?"/g,
  `src="./app.js?${versionParam}"`
);

fs.writeFileSync(indexPath, indexContent);
console.log('✅ Updated index.html');

// Update service-worker.js
const swPath = path.join(__dirname, 'service-worker.js');
let swContent = fs.readFileSync(swPath, 'utf8');

// Update cache version
swContent = swContent.replace(
  /const CACHE_VERSION = \d+;/g,
  `const CACHE_VERSION = ${timestamp};`
);

fs.writeFileSync(swPath, swContent);
console.log('✅ Updated service-worker.js');

console.log('🎉 Cache version update complete!');
console.log('📝 Deploy these changes to force browsers to fetch fresh files.');
