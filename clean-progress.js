#!/usr/bin/env node

/**
 * Clean up all progress tracking from app.js
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'docs', 'app.js');

// Read the file
let content = fs.readFileSync(filePath, 'utf-8');

// Remove ProgressTracker class (already done)
// Remove LearningProgress class (already done)

// Remove all progress-related method calls
const progressPatterns = [
  // Remove progress tracking calls
  /this\.progress\.markDrillComplete\([^)]*\);?\n?/g,
  /this\.progress\.isDrillComplete\([^)]*\)/g,
  /this\.progress\.resetProgress\([^)]*\);?\n?/g,
  /this\.learningProgress\.[^(]*\([^)]*\);?\n?/g,

  // Remove progress variable declarations
  /\s*const completed = false;?\n?/g,

  // Remove progress-related conditionals
  /completed\s*\?\s*'✓'\s*:\s*'○'/g,
  /completed\s*\?\s*'completed'\s*:\s*''/g,

  // Remove updateProgressDisplay calls
  /this\.updateProgressDisplay\(\);?\n?/g,

  // Remove resetProgress methods
  /resetProgress\(\)\s*{[^}]*}/g,

  // Remove progress exports
  /export.*Progress[^;]*;?\n?/g,
  /window\..*Progress[^;]*;?\n?/g,

  // Remove progress summary elements
  /const progressEl = document\.getElementById\('progress-summary'\);[^}]*}/gs,

  // Clean up progress stats
  /const stats = this\.learningProgress\.[^;]*;?\n?/g,
  /const diagramStats = this\.learningProgress\.[^;]*;?\n?/g,

  // Remove progress bar updates
  /const progressBar = document\.getElementById\('step-progress-bar'\);[^}]*}/gs,
  /const progressEl = document\.getElementById\('step-progress'\);[^}]*}/gs,
];

// Apply all patterns
progressPatterns.forEach(pattern => {
  content = content.replace(pattern, '');
});

// Fix specific replacements
content = content.replace(/const completed = .*;/g, '');
content = content.replace(/\$\{completed \? '✓' : '○'\}/g, '○');
content = content.replace(/\$\{completed \? 'completed' : ''\}/g, '');

// Clean up empty if blocks
content = content.replace(/if\s*\([^)]*progress[^)]*\)\s*{\s*}/g, '');

// Write the cleaned content back
fs.writeFileSync(filePath, content);

console.log('✅ Progress tracking removed from app.js');

// Also clean up the navigation to remove progress percentage
content = content.replace(/\$\{hasProgress[^}]*\}/gs, '');
content = content.replace(/const progress = [^;]*;?\n?/g, '');
content = content.replace(/const hasProgress = [^;]*;?\n?/g, '');

fs.writeFileSync(filePath, content);

console.log('✅ Navigation progress indicators removed');