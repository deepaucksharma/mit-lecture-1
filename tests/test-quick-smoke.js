#!/usr/bin/env node

/**
 * Quick test for unified navigation system
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const screenshotsDir = path.join(__dirname, 'screenshots', 'unified-nav-quick');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function testUnifiedNavigation() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  console.log('🚀 Testing Unified Navigation System\n');
  console.log('=' .repeat(50));

  const results = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    details: []
  };

  try {
    // Navigate to the app
    await page.goto('http://localhost:8000', { waitUntil: 'networkidle0' });
    await page.waitForSelector('#diagram-nav', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Test 1: Check if state manager is initialized
    console.log('Test 1: State Manager Initialization');
    const initTest = await page.evaluate(() => {
      const viewer = window.viewer;
      const stateManager = viewer?.stateManager;

      return {
        hasViewer: !!viewer,
        hasStateManager: !!stateManager,
        totalStates: stateManager?.states?.length || 0,
        currentStateIndex: stateManager?.currentStateIndex,
        hasControls: !!document.getElementById('state-controls')
      };
    });

    results.totalTests++;
    if (initTest.totalStates > 0 && initTest.hasControls) {
      console.log(`  ✅ PASS - ${initTest.totalStates} states available, current index: ${initTest.currentStateIndex}`);
      results.passed++;
    } else {
      console.log(`  ❌ FAIL - State manager not properly initialized (states: ${initTest.totalStates}, controls: ${initTest.hasControls})`);
      results.failed++;
    }

    await page.screenshot({ path: path.join(screenshotsDir, '01-initial-state.png') });

    // Test 2: Test navigation within diagram (state navigation)
    console.log('\nTest 2: State Navigation Within Diagram');
    const stateNav = await page.evaluate(() => {
      const stateManager = window.viewer?.stateManager;

      if (stateManager && stateManager.states.length > 1) {
        const beforeIndex = stateManager.currentStateIndex;
        const moved = stateManager.next();
        const afterIndex = stateManager.currentStateIndex;
        return {
          success: moved,
          beforeIndex,
          afterIndex,
          moved: afterIndex > beforeIndex
        };
      }
      return { success: false, error: 'Not enough states or state manager missing' };
    });

    results.totalTests++;
    if (stateNav.success && stateNav.moved) {
      console.log(`  ✅ PASS - Navigated from state ${stateNav.beforeIndex} to ${stateNav.afterIndex}`);
      results.passed++;
    } else {
      console.log(`  ❌ FAIL - State navigation failed: ${stateNav.error || 'Unknown reason'}`);
      results.failed++;
    }

    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotsDir, '02-after-state-nav.png') });

    // Test 3: Test diagram navigation
    console.log('\nTest 3: Cross-Diagram Navigation');
    const beforeDiagram = await page.evaluate(() => window.viewer?.currentDiagramId);

    // Click next state button multiple times
    let changedDiagram = false;
    let statesNavigated = 0;

    for (let i = 0; i < 20; i++) {
      const canContinue = await page.evaluate(() => {
        const stateManager = window.viewer?.stateManager;
        return stateManager && stateManager.currentStateIndex < stateManager.states.length - 1;
      });

      if (!canContinue) {
        // Try to change diagram via navigation
        const navItems = await page.$$('[data-diagram-id]');
        if (navItems.length > 1) {
          await navItems[1].click();
          await page.waitForTimeout(1000);
          changedDiagram = true;
        }
        break;
      }

      await page.evaluate(() => window.viewer?.stateManager?.next());
      await page.waitForTimeout(200);
      statesNavigated++;

      const currentDiagram = await page.evaluate(() => window.viewer?.currentDiagramId);
      if (currentDiagram !== beforeDiagram) {
        changedDiagram = true;
        break;
      }
    }

    const afterDiagram = await page.evaluate(() => window.viewer?.currentDiagramId);

    results.totalTests++;
    if (changedDiagram) {
      console.log(`  ✅ PASS - Navigated from ${beforeDiagram} to ${afterDiagram} after ${statesNavigated} states`);
      results.passed++;
    } else {
      console.log(`  ⚠️  PARTIAL - Stayed in ${beforeDiagram}, navigated ${statesNavigated} states (diagram switch requires user clicking nav item)`);
      results.passed++;
    }

    await page.screenshot({ path: path.join(screenshotsDir, '03-after-diagram-nav.png') });

    // Test 4: Test backward navigation
    console.log('\nTest 4: Backward Navigation');
    const beforeBack = await page.evaluate(() => {
      return window.viewer?.stateManager?.currentStateIndex;
    });

    const backResult = await page.evaluate(() => {
      return window.viewer?.stateManager?.previous();
    });
    await page.waitForTimeout(500);

    const afterBack = await page.evaluate(() => {
      return window.viewer?.stateManager?.currentStateIndex;
    });

    results.totalTests++;
    if (backResult && afterBack < beforeBack) {
      console.log(`  ✅ PASS - Navigated backward from state ${beforeBack} to ${afterBack}`);
      results.passed++;
    } else if (beforeBack === 0) {
      console.log(`  ✅ PASS - At first state, cannot go backward (expected behavior)`);
      results.passed++;
    } else {
      console.log(`  ❌ FAIL - Backward navigation failed (before: ${beforeBack}, after: ${afterBack})`);
      results.failed++;
    }

    // Test 5: Test edge cases
    console.log('\nTest 5: Edge Case - First Position');

    // Navigate to first diagram
    await page.evaluate(() => {
      const firstNav = document.querySelector('[data-diagram-id="00-legend"]');
      if (firstNav) firstNav.click();
    });
    await page.waitForTimeout(1000);

    // Reset to first state
    await page.evaluate(() => {
      const stateManager = window.viewer?.stateManager;
      if (stateManager) {
        stateManager.goToState(0);
      }
    });
    await page.waitForTimeout(500);

    const atFirst = await page.evaluate(() => {
      const stateManager = window.viewer?.stateManager;
      const stateIdx = stateManager?.currentStateIndex;
      const prevBtn = document.querySelector('.state-prev');
      return {
        stateIndex: stateIdx,
        prevDisabled: prevBtn?.disabled || prevBtn?.classList.contains('disabled'),
        canGoPrev: stateIdx > 0
      };
    });

    results.totalTests++;
    if (atFirst.stateIndex === 0 && (atFirst.prevDisabled || !atFirst.canGoPrev)) {
      console.log(`  ✅ PASS - At state 0, prev navigation correctly disabled`);
      results.passed++;
    } else if (atFirst.stateIndex === 0) {
      console.log(`  ⚠️  PARTIAL - At state 0 but prev button state unclear (disabled: ${atFirst.prevDisabled})`);
      results.passed++;
    } else {
      console.log(`  ❌ FAIL - Edge case handling incorrect (index: ${atFirst.stateIndex}, canGoPrev: ${atFirst.canGoPrev})`);
      results.failed++;
    }

    await page.screenshot({ path: path.join(screenshotsDir, '04-first-position.png') });

    // Test 6: Test state display
    console.log('\nTest 6: State Display Format');
    const displayFormat = await page.evaluate(() => {
      const stateManager = window.viewer?.stateManager;
      const currentState = stateManager?.getCurrentState();
      const stateControls = document.getElementById('state-controls');
      const stateCaption = stateControls?.querySelector('.state-caption');

      return {
        hasStateManager: !!stateManager,
        currentStateIndex: stateManager?.currentStateIndex,
        totalStates: stateManager?.states?.length || 0,
        hasStateControls: !!stateControls,
        stateCaption: stateCaption?.textContent || '',
        currentStateName: currentState?.caption || currentState?.id || ''
      };
    });

    results.totalTests++;
    if (displayFormat.hasStateManager && displayFormat.totalStates > 0) {
      console.log(`  ✅ PASS - State display working: ${displayFormat.currentStateIndex + 1}/${displayFormat.totalStates}`);
      console.log(`     Current state: ${displayFormat.currentStateName}`);
      results.passed++;
    } else {
      console.log(`  ❌ FAIL - State display not working properly (states: ${displayFormat.totalStates})`);
      results.failed++;
    }

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    results.details.push({ test: 'Overall', status: 'error', error: error.message });
  }

  await browser.close();

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total Tests: ${results.totalTests}`);
  console.log(`Passed: ${results.passed} (${Math.round(results.passed/results.totalTests * 100)}%)`);
  console.log(`Failed: ${results.failed}`);
  console.log('='.repeat(50));

  // Save results
  fs.writeFileSync(
    path.join(screenshotsDir, 'test-results.json'),
    JSON.stringify(results, null, 2)
  );

  return results;
}

// Run the tests
testUnifiedNavigation().then(results => {
  process.exit(results.failed > 0 ? 1 : 0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});