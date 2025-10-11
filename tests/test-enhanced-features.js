const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots/enhanced');
const BASE_URL = 'http://localhost:8000';
const VIEWPORT = { width: 1920, height: 1080 };

// All specs to test
const SPECS = [
  '00-legend', '01-triangle', '02-scale', '03-chunk-size',
  '04-architecture', '05-planes', '06-read-path', '07-write-path',
  '08-lease', '09-consistency', '10-recovery', '11-evolution', '12-dna'
];

async function setupScreenshotsDir() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
}

async function testSpec(page, specId) {
  console.log(`\n📋 Testing ${specId}...`);
  const results = { specId, tests: [], errors: [] };

  try {
    // Navigate to the spec
    console.log(`   → Loading ${specId}`);
    await page.evaluate((id) => {
      const navItem = document.querySelector(`[data-diagram-id="${id}"]`);
      if (navItem) navItem.click();
    }, specId);

    await page.waitForTimeout(2000);

    // Test 1: Crystallized Insight
    console.log('   → Testing crystallized insight...');
    const hasInsight = await page.evaluate(() => {
      const panel = document.getElementById('crystallized-insight');
      if (!panel) return { found: false, message: 'Element not found' };

      const hasContent = panel.textContent.trim().length > 0;
      const isVisible = panel.parentElement.style.display !== 'none';

      return {
        found: true,
        hasContent,
        isVisible,
        content: panel.textContent.trim().substring(0, 100)
      };
    });

    results.tests.push({
      name: 'Crystallized Insight',
      ...hasInsight,
      passed: hasInsight.found && hasInsight.hasContent
    });

    // Take screenshot of main view
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `${specId}-01-main.png`),
      fullPage: false
    });

    // Test 2: Prerequisites Panel
    console.log('   → Testing prerequisites...');
    const hasPrereqs = await page.evaluate(() => {
      const panel = document.getElementById('prerequisites-panel');
      const content = document.getElementById('prerequisites-content');

      if (!panel || !content) return { found: false };

      const isVisible = panel.style.display !== 'none';
      const hasContent = content.textContent.trim().length > 0;

      return {
        found: true,
        isVisible,
        hasContent,
        content: content.textContent.trim().substring(0, 100)
      };
    });

    results.tests.push({
      name: 'Prerequisites Panel',
      ...hasPrereqs,
      passed: hasPrereqs.found
    });

    // Test 3: Principles Tab
    console.log('   → Testing Principles tab...');
    await page.evaluate(() => {
      const principlesTab = document.querySelector('[data-tab="principles"]');
      if (principlesTab) principlesTab.click();
    });
    await page.waitForTimeout(500);

    const hasPrinciples = await page.evaluate(() => {
      const container = document.getElementById('principles-container');
      if (!container) return { found: false };

      const isActive = container.classList.contains('active');
      const hasContent = container.textContent.trim().length > 0;
      const hasFirstPrinciples = container.textContent.includes('First Principles');
      const hasAdvanced = container.textContent.includes('Advanced Concepts');

      return {
        found: true,
        isActive,
        hasContent,
        hasFirstPrinciples,
        hasAdvanced,
        contentLength: container.textContent.length
      };
    });

    results.tests.push({
      name: 'Principles Tab',
      ...hasPrinciples,
      passed: hasPrinciples.found && hasPrinciples.hasContent
    });

    // Screenshot of Principles tab
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `${specId}-02-principles.png`),
      fullPage: false
    });

    // Test 4: Assessment Tab
    console.log('   → Testing Assessment tab...');
    await page.evaluate(() => {
      const assessmentTab = document.querySelector('[data-tab="assessment"]');
      if (assessmentTab) assessmentTab.click();
    });
    await page.waitForTimeout(500);

    const hasAssessment = await page.evaluate(() => {
      const container = document.getElementById('assessment-container');
      if (!container) return { found: false };

      const isActive = container.classList.contains('active');
      const hasContent = container.textContent.trim().length > 0;
      const hasCheckpoints = container.textContent.includes('Assessment Checkpoints');
      const checkpointCards = container.querySelectorAll('.checkpoint-card').length;

      return {
        found: true,
        isActive,
        hasContent,
        hasCheckpoints,
        checkpointCount: checkpointCards,
        contentLength: container.textContent.length
      };
    });

    results.tests.push({
      name: 'Assessment Tab',
      ...hasAssessment,
      passed: hasAssessment.found && hasAssessment.hasContent
    });

    // Screenshot of Assessment tab
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `${specId}-03-assessment.png`),
      fullPage: false
    });

    // Test 5: Drills Tab (back to default)
    console.log('   → Testing Drills tab...');
    await page.evaluate(() => {
      const drillsTab = document.querySelector('[data-tab="drills"]');
      if (drillsTab) drillsTab.click();
    });
    await page.waitForTimeout(500);

    const hasDrills = await page.evaluate(() => {
      const container = document.getElementById('drills-container');
      if (!container) return { found: false };

      const isActive = container.classList.contains('active');
      const drillCount = container.querySelectorAll('.drill').length;

      return {
        found: true,
        isActive,
        drillCount,
        hasContent: drillCount > 0
      };
    });

    results.tests.push({
      name: 'Drills Tab',
      ...hasDrills,
      passed: hasDrills.found
    });

    // Test 6: Scenes Navigation
    console.log('   → Testing scenes...');
    const scenesInfo = await page.evaluate(() => {
      const stateManager = window.viewer?.stateManager;
      if (!stateManager) return { found: false };

      const sceneCount = stateManager.states.length;
      const currentState = stateManager.getCurrentState();

      return {
        found: true,
        sceneCount,
        currentScene: currentState?.id,
        hasTimeline: !!document.getElementById('state-controls')
      };
    });

    results.tests.push({
      name: 'Scenes System',
      ...scenesInfo,
      passed: scenesInfo.found && scenesInfo.sceneCount > 0
    });

    // Screenshot with drills
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `${specId}-04-drills.png`),
      fullPage: false
    });

    // Test scenes navigation by clicking through them
    if (scenesInfo.sceneCount > 1) {
      console.log(`   → Navigating through ${scenesInfo.sceneCount} scenes...`);
      for (let i = 0; i < Math.min(3, scenesInfo.sceneCount - 1); i++) {
        await page.evaluate(() => {
          window.viewer?.stateManager?.next();
        });
        await page.waitForTimeout(1000);

        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, `${specId}-scene-${i + 2}.png`),
          fullPage: false
        });
      }
    }

    console.log(`   ✓ ${specId} complete - ${results.tests.filter(t => t.passed).length}/${results.tests.length} tests passed`);

  } catch (error) {
    console.error(`   ✗ Error testing ${specId}:`, error.message);
    results.errors.push(error.message);
  }

  return results;
}

async function runEnhancedTests() {
  console.log('🚀 Testing Enhanced Features Across All Specs\n');
  console.log('=' .repeat(60));

  setupScreenshotsDir();

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  // Capture errors
  const consoleErrors = [];
  const jsErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', error => {
    jsErrors.push(error.message);
  });

  // Load the app first
  console.log('🌐 Loading application...');
  await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'networkidle0' });
  await page.waitForTimeout(3000); // Wait for full initialization

  console.log('✓ Application loaded\n');

  // Test each spec
  const allResults = [];
  for (const specId of SPECS) {
    const results = await testSpec(page, specId);
    allResults.push(results);
  }

  await browser.close();

  // Generate summary report
  const summaryPath = path.join(SCREENSHOTS_DIR, 'SUMMARY.md');
  let summary = '# Enhanced Features Test Summary\n\n';
  summary += `**Test Date**: ${new Date().toISOString()}\n\n`;
  summary += '## Results by Spec\n\n';

  allResults.forEach(spec => {
    const passed = spec.tests.filter(t => t.passed).length;
    const total = spec.tests.length;
    const status = passed === total ? '✅' : (passed > total / 2 ? '⚠️' : '❌');

    summary += `### ${status} ${spec.specId} (${passed}/${total} passed)\n\n`;

    spec.tests.forEach(test => {
      const icon = test.passed ? '✓' : '✗';
      summary += `- ${icon} **${test.name}**: `;
      if (test.passed) {
        summary += 'PASS';
        if (test.contentLength) summary += ` (${test.contentLength} chars)`;
        if (test.checkpointCount) summary += ` (${test.checkpointCount} checkpoints)`;
        if (test.sceneCount) summary += ` (${test.sceneCount} scenes)`;
      } else {
        summary += 'FAIL';
        if (test.message) summary += ` - ${test.message}`;
      }
      summary += '\n';
    });

    if (spec.errors.length > 0) {
      summary += '\n**Errors:**\n';
      spec.errors.forEach(err => summary += `- ${err}\n`);
    }
    summary += '\n';
  });

  // Overall statistics
  const totalTests = allResults.reduce((sum, spec) => sum + spec.tests.length, 0);
  const totalPassed = allResults.reduce((sum, spec) =>
    sum + spec.tests.filter(t => t.passed).length, 0);

  summary += `\n## Overall Statistics\n\n`;
  summary += `- **Total Tests**: ${totalTests}\n`;
  summary += `- **Passed**: ${totalPassed}\n`;
  summary += `- **Failed**: ${totalTests - totalPassed}\n`;
  summary += `- **Success Rate**: ${((totalPassed / totalTests) * 100).toFixed(1)}%\n`;

  if (consoleErrors.length > 0) {
    summary += `\n## Console Errors (${consoleErrors.length})\n\n`;
    [...new Set(consoleErrors)].forEach(err => summary += `- ${err}\n`);
  }

  if (jsErrors.length > 0) {
    summary += `\n## JavaScript Errors (${jsErrors.length})\n\n`;
    [...new Set(jsErrors)].forEach(err => summary += `- ${err}\n`);
  }

  fs.writeFileSync(summaryPath, summary);

  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary:');
  console.log(`   Total: ${totalTests} tests`);
  console.log(`   Passed: ${totalPassed} (${((totalPassed / totalTests) * 100).toFixed(1)}%)`);
  console.log(`   Failed: ${totalTests - totalPassed}`);
  console.log(`\n📁 Screenshots: ${SCREENSHOTS_DIR}`);
  console.log(`📄 Report: ${summaryPath}`);
  console.log('='.repeat(60));

  // Save detailed JSON
  fs.writeFileSync(
    path.join(SCREENSHOTS_DIR, 'results.json'),
    JSON.stringify({ specs: allResults, consoleErrors, jsErrors }, null, 2)
  );

  return { allResults, consoleErrors, jsErrors };
}

if (require.main === module) {
  runEnhancedTests()
    .then(data => {
      const hasErrors = data.jsErrors.length > 0;
      process.exit(hasErrors ? 1 : 0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runEnhancedTests };
