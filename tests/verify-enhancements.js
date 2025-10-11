#!/usr/bin/env node

/**
 * Quick verification script to check all enhancements are working
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying GFS Visual Learning Enhancements\n');
console.log('=' .repeat(60));

let passed = 0;
let failed = 0;

// Test 1: Check spec files have new fields
console.log('\n📋 Checking spec file enhancements...');

const specFiles = [
  '00-legend', '01-triangle', '02-scale', '03-chunk-size',
  '04-architecture', '05-planes', '06-read-path', '07-write-path',
  '08-lease', '09-consistency', '10-recovery', '11-evolution', '12-dna'
];

specFiles.forEach(specId => {
  const specPath = path.join(__dirname, 'data', 'specs', `${specId}.json`);

  try {
    const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));

    const checks = {
      firstPrinciples: !!spec.firstPrinciples,
      advancedConcepts: !!spec.advancedConcepts,
      prerequisites: !!spec.prerequisites,
      assessmentCheckpoints: !!spec.assessmentCheckpoints,
      hasThoughtProcess: spec.drills?.some(d =>
        d.drills?.some(drill => drill.thoughtProcess && drill.thoughtProcess.length > 0)
      ),
      hasInsights: spec.drills?.some(d =>
        d.drills?.some(drill => !!drill.insight)
      )
    };

    const allPassed = Object.values(checks).every(v => v);

    if (allPassed) {
      console.log(`  ✅ ${specId}: All enhancements present`);
      passed++;
    } else {
      console.log(`  ❌ ${specId}: Missing enhancements`);
      Object.entries(checks).forEach(([key, value]) => {
        if (!value) console.log(`     - Missing: ${key}`);
      });
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ ${specId}: Error reading spec - ${error.message}`);
    failed++;
  }
});

// Test 2: Check app.js has new methods
console.log('\n🎯 Checking app.js enhancements...');

const appJsPath = path.join(__dirname, 'docs', 'app.js');
const appJs = fs.readFileSync(appJsPath, 'utf8');

const appMethods = [
  'renderDrillFeedback',
  'renderFirstPrinciples',
  'renderAdvancedConcepts',
  'renderPrerequisites',
  'renderAssessmentCheckpoints'
];

appMethods.forEach(method => {
  if (appJs.includes(method)) {
    console.log(`  ✅ ${method} found`);
    passed++;
  } else {
    console.log(`  ❌ ${method} not found`);
    failed++;
  }
});

// Test 3: Check CSS has new styles
console.log('\n🎨 Checking CSS enhancements...');

const cssPath = path.join(__dirname, 'docs', 'style.css');
const css = fs.readFileSync(cssPath, 'utf8');

const cssClasses = [
  '.thought-process',
  '.thought-steps',
  '.drill-insight',
  '.correct-answer'
];

cssClasses.forEach(className => {
  if (css.includes(className)) {
    console.log(`  ✅ ${className} style found`);
    passed++;
  } else {
    console.log(`  ❌ ${className} style not found`);
    failed++;
  }
});

// Test 4: Check test infrastructure
console.log('\n🧪 Checking test infrastructure...');

const testFiles = [
  'test-suite.js',
  'run-tests.sh',
  'tests/test-enhanced-features.js'
];

testFiles.forEach(testFile => {
  const testPath = path.join(__dirname, testFile);
  if (fs.existsSync(testPath)) {
    const stats = fs.statSync(testPath);
    console.log(`  ✅ ${testFile} exists (${stats.size} bytes)`);
    passed++;
  } else {
    console.log(`  ❌ ${testFile} not found`);
    failed++;
  }
});

// Test 5: Verify data consistency
console.log('\n🔄 Checking data consistency...');

// Check if docs/data/specs matches data/specs
const sourceSpecsDir = path.join(__dirname, 'data', 'specs');
const docsSpecsDir = path.join(__dirname, 'docs', 'data', 'specs');

let syncIssues = 0;

specFiles.forEach(specId => {
  const sourceFile = path.join(sourceSpecsDir, `${specId}.json`);
  const docsFile = path.join(docsSpecsDir, `${specId}.json`);

  if (!fs.existsSync(docsFile)) {
    console.log(`  ⚠️  ${specId}.json not in docs/data/specs`);
    syncIssues++;
  } else {
    const sourceContent = fs.readFileSync(sourceFile, 'utf8');
    const docsContent = fs.readFileSync(docsFile, 'utf8');

    if (sourceContent === docsContent) {
      // Files are in sync
    } else {
      console.log(`  ⚠️  ${specId}.json differs between source and docs`);
      syncIssues++;
    }
  }
});

if (syncIssues === 0) {
  console.log(`  ✅ All spec files are synchronized`);
  passed++;
} else {
  console.log(`  ❌ ${syncIssues} synchronization issues found`);
  console.log(`     Run: cp data/specs/*.json docs/data/specs/`);
  failed++;
}

// Final Summary
console.log('\n' + '=' .repeat(60));
console.log('📊 VERIFICATION SUMMARY');
console.log('=' .repeat(60));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

if (failed === 0) {
  console.log('\n🎉 All enhancements verified successfully!');
  console.log('\n📱 You can now:');
  console.log('  1. Run the app: npm start');
  console.log('  2. Run comprehensive tests: npm test');
  console.log('  3. View the app at: http://localhost:8888');
  process.exit(0);
} else {
  console.log('\n⚠️  Some enhancements need attention');
  console.log('Please review the failed checks above');
  process.exit(1);
}