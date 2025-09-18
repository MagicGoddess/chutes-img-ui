# Cache-Busting and Deployment Guide

This document explains how to ensure users always get the latest version of your app instead of cached versions.

## What We've Fixed

### 1. Dynamic Service Worker Cache Versioning
- The service worker now uses timestamp-based cache names
- Old caches are automatically cleaned up
- Users get notifications when the cache updates

### 2. Versioned Asset URLs
- CSS and JS files now include version parameters (e.g., `app.css?v=1726316400000`)
- This forces browsers to fetch fresh files when versions change
- HTML file can still be cached normally since it references versioned assets

### 3. Smart Service Worker Caching
- Service worker automatically detects and cleans up old cache versions
- Uses timestamp-based cache names for reliable invalidation
- Preserves performance benefits of caching while ensuring updates work

### 4. Automatic Update Detection
- Service worker detects when new versions are available
- Users see toast notifications when updates occur
- Optional page refresh prompts for immediate updates

## How to Deploy Updates

### Method 1: Use the Update Script (Recommended)
```bash
node update-cache-version.js
```

This script automatically:
- Updates version numbers in index.html 
- Updates cache version in service-worker.js
- Uses current timestamp to ensure uniqueness

### Method 2: Manual Version Updates
1. Edit `index.html` and update the version numbers in:
   - `<link rel="stylesheet" href="./app.css?v=NEW_VERSION">`
    - `<script src="./js/main.js?v=NEW_VERSION">`

2. Edit `service-worker.js` and update:
   - `const CACHE_VERSION = NEW_VERSION;`

## Server Configuration (Optional)

For optimal performance, configure your web server with these headers:

### For CSS/JS files with version parameters:
```
Cache-Control: public, max-age=31536000, immutable
```

### For HTML files (optional - allows reasonable caching):
```
Cache-Control: public, max-age=300
```

### Example Apache .htaccess:
```apache
# Cache CSS and JS files with version parameters for 1 year
<FilesMatch "\.(css|js)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
</FilesMatch>

# Cache HTML files for 5 minutes (optional)
<FilesMatch "\.(html|htm)$">
    Header set Cache-Control "public, max-age=300"
</FilesMatch>
```

### Example Nginx configuration:
```nginx
# CSS and JS files - long cache with version busting
location ~* \.(css|js)$ {
    add_header Cache-Control "public, max-age=31536000, immutable";
}

# HTML files - short cache (optional)
location ~* \.html$ {
    add_header Cache-Control "public, max-age=300";
}
```

## Testing the Fix

1. Deploy your updated files
2. Open browser developer tools (Network tab)
3. Refresh the page
4. Verify that CSS and JS files show `200` status (fresh fetch) instead of `304` (cached)
5. Check console for service worker registration messages

## Deployment Workflow

1. Make your app changes
2. Run `node update-cache-version.js`
3. Deploy all files to your hosting service
4. Users will automatically get the latest version

## Notes

- The version numbers use timestamps, ensuring each deployment has a unique version
- Service worker updates happen automatically in the background
- Users see friendly notifications when updates are available
- No manual cache clearing needed by users
