#!/usr/bin/env node

/**
 * Build script to create modular bundle
 * Combines new modular architecture with existing functionality
 */

const fs = require('fs');
const path = require('path');

// Module load order (dependencies first)
const newModules = [
  // Core infrastructure
  'src/app/core/events.js',
  'src/app/core/config.js',
  'src/app/state/app-state.js',
  'src/app/data/spec-loader.js',
  'src/app/render/diagram-renderer.js',
  // Note: app.js loaded last as it depends on others
];

// Existing modules to preserve functionality
const existingModules = [
  'src/core/composer.js',
  'src/core/validator.js',
  'src/core/state-manager.js',
  'src/core/renderer.js',
  'src/learning/drills.js',
  'src/learning/progress.js',
  'src/learning/stepper.js',
  'src/ui/export.js',
  'src/ui/overlays.js',
  'src/ui/viewer.js'
];

// Convert ES6 modules to browser-compatible format
function convertModule(content, filePath) {
  let converted = content;

  // Remove ES6 import statements
  converted = converted.replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, '');
  converted = converted.replace(/^import\s+{.*?}\s+from\s+['"].*?['"];?\s*$/gm, '');

  // Remove ES6 export statements
  converted = converted.replace(/^export\s+default\s+/gm, 'window.');
  converted = converted.replace(/^export\s+{.*?};?\s*$/gm, '');
  converted = converted.replace(/^export\s+const\s+/gm, 'window.');
  converted = converted.replace(/^export\s+class\s+/gm, 'window.');
  converted = converted.replace(/^export\s+/gm, 'window.');

  // Wrap in IIFE to avoid polluting global scope
  return `
// Module: ${filePath}
(function() {
  'use strict';

${converted}

})();
`;
}

// Build the bundle
function buildBundle() {
  console.log('Building modular bundle...');

  let bundle = `/**
 * GFS Visual Learning System - Modular Bundle
 * Generated: ${new Date().toISOString()}
 */

(function() {
  'use strict';

  // Initialize global namespace
  window.GFS = window.GFS || {};

`;

  // Add polyfills
  bundle += `
  // Polyfills
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function(callback) {
      return setTimeout(callback, 1000/60);
    };
  }

`;

  // Process new modules
  console.log('Processing new modules...');
  newModules.forEach(modulePath => {
    try {
      const fullPath = path.join(__dirname, modulePath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const converted = convertModule(content, modulePath);
        bundle += converted;
        console.log(`  ✓ ${modulePath}`);
      } else {
        console.log(`  ⚠ ${modulePath} not found, skipping`);
      }
    } catch (error) {
      console.error(`  ✗ Error processing ${modulePath}:`, error.message);
    }
  });

  // Process existing modules
  console.log('Processing existing modules...');
  existingModules.forEach(modulePath => {
    try {
      const fullPath = path.join(__dirname, modulePath);
      const content = fs.readFileSync(fullPath, 'utf8');
      bundle += `
// Module: ${modulePath}
${content}
`;
      console.log(`  ✓ ${modulePath}`);
    } catch (error) {
      console.error(`  ✗ Error processing ${modulePath}:`, error.message);
    }
  });

  // Add initialization code
  bundle += `

  // Initialize application when DOM is ready
  window.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing GFS Visual Learning System (Modular)...');

    try {
      // Check if we should use new modular system
      const useModular = localStorage.getItem('gfs-use-modular') === 'true';

      if (useModular && window.app) {
        // Use new modular system
        console.log('Using new modular architecture');
        await window.app.init();
      } else {
        // Fall back to existing viewer
        console.log('Using existing architecture');
        window.viewer = new GFSViewer();
        await window.viewer.initialize();
        window.drillSystem = window.viewer.drillSystem;
      }
    } catch (error) {
      console.error('Initialization failed:', error);

      // Try fallback initialization
      if (window.GFSViewer) {
        window.viewer = new GFSViewer();
        window.viewer.initialize().catch(console.error);
      }
    }
  });

})();

// Bundle created: ${new Date().toISOString()}
`;

  // Write bundle
  const outputPath = path.join(__dirname, 'docs', 'app-modular.js');
  fs.writeFileSync(outputPath, bundle);
  console.log(`\nBundle created: ${outputPath}`);
  console.log(`Size: ${(bundle.length / 1024).toFixed(2)} KB`);
}

// Run build
buildBundle();