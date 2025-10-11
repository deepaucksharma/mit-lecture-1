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

    // Test 1: Check if unified navigation is initialized
    console.log('Test 1: Unified Navigation Initialization');
    const initTest = await page.evaluate(() => {
      const viewer = window.viewer;
      const globalNav = viewer?.globalNavigation;
      const navCurrent = document.getElementById('nav-current');

      return {
        hasViewer: !!viewer,
        hasGlobalNav: !!globalNav,
        totalStates: globalNav?.totalStates?.length || 0,
        diagramStatesCount: Object.keys(globalNav?.diagramStates || {}).length,
        navCurrentContent: navCurrent?.innerText || '',
        hasNavDisplay: !!navCurrent?.querySelector('.nav-diagram')
      };
    });

    results.totalTests++;
    if (initTest.totalStates > 0 && initTest.hasNavDisplay) {
      console.log(`  ✅ PASS - ${initTest.totalStates} total states across ${initTest.diagramStatesCount} diagrams`);
      console.log(`     Current: ${initTest.navCurrentContent}`);
      results.passed++;
    } else {
      console.log(`  ❌ FAIL - Navigation not properly initialized`);
      results.failed++;
    }

    await page.screenshot({ path: path.join(screenshotsDir, '01-initial-state.png') });

    // Test 2: Test navigation within diagram (state navigation)
    console.log('\nTest 2: State Navigation Within Diagram');
    const stateNav = await page.evaluate(() => {
      const beforePos = window.viewer?.getCurrentGlobalPosition();
      const stateManager = window.viewer?.stateManager;

      if (stateManager && stateManager.states.length > 1) {
        stateManager.next();
        const afterPos = window.viewer?.getCurrentGlobalPosition();
        return {
          success: true,
          beforePos,
          afterPos,
          moved: afterPos > beforePos
        };
      }
      return { success: false };
    });

    results.totalTests++;
    if (stateNav.success && stateNav.moved) {
      console.log(`  ✅ PASS - Navigated from position ${stateNav.beforePos} to ${stateNav.afterPos}`);
      results.passed++;
    } else {
      console.log(`  ❌ FAIL - State navigation failed`);
      results.failed++;
    }

    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotsDir, '02-after-state-nav.png') });

    // Test 3: Test diagram navigation
    console.log('\nTest 3: Cross-Diagram Navigation');
    const beforeDiagram = await page.evaluate(() => window.viewer?.currentDiagramId);

    await page.click('#nav-next');
    await page.waitForTimeout(1000);

    // Continue clicking next until we change diagram
    let changedDiagram = false;
    for (let i = 0; i < 10; i++) {
      const currentDiagram = await page.evaluate(() => window.viewer?.currentDiagramId);
      if (currentDiagram !== beforeDiagram) {
        changedDiagram = true;
        break;
      }

      const canContinue = await page.evaluate(() => {
        const btn = document.getElementById('nav-next');
        return btn && !btn.disabled;
      });

      if (!canContinue) break;

      await page.click('#nav-next');
      await page.waitForTimeout(300);
    }

    const afterDiagram = await page.evaluate(() => window.viewer?.currentDiagramId);
    const newNavText = await page.evaluate(() => document.getElementById('nav-current')?.innerText);

    results.totalTests++;
    if (changedDiagram) {
      console.log(`  ✅ PASS - Navigated from ${beforeDiagram} to ${afterDiagram}`);
      console.log(`     Current: ${newNavText}`);
      results.passed++;
    } else {
      console.log(`  ❌ FAIL - Could not navigate to different diagram`);
      results.failed++;
    }

    await page.screenshot({ path: path.join(screenshotsDir, '03-after-diagram-nav.png') });

    // Test 4: Test backward navigation
    console.log('\nTest 4: Backward Navigation');
    const beforeBack = await page.evaluate(() => window.viewer?.getCurrentGlobalPosition());

    await page.click('#nav-prev');
    await page.waitForTimeout(500);

    const afterBack = await page.evaluate(() => window.viewer?.getCurrentGlobalPosition());

    results.totalTests++;
    if (afterBack < beforeBack) {
      console.log(`  ✅ PASS - Navigated backward from ${beforeBack} to ${afterBack}`);
      results.passed++;
    } else {
      console.log(`  ❌ FAIL - Backward navigation failed`);
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
        stateManager.currentStateIndex = 0;
        stateManager.applyState(stateManager.states[0]);
      }
    });
    await page.waitForTimeout(500);

    const atFirst = await page.evaluate(() => {
      const prevBtn = document.getElementById('nav-prev');
      const pos = window.viewer?.getCurrentGlobalPosition();
      return {
        position: pos,
        prevDisabled: prevBtn?.disabled
      };
    });

    results.totalTests++;
    if (atFirst.position === 0 && atFirst.prevDisabled) {
      console.log(`  ✅ PASS - At position 0, prev button disabled`);
      results.passed++;
    } else {
      console.log(`  ❌ FAIL - Edge case handling incorrect (pos: ${atFirst.position}, disabled: ${atFirst.prevDisabled})`);
      results.failed++;
    }

    await page.screenshot({ path: path.join(screenshotsDir, '04-first-position.png') });

    // Test 6: Test navigation display format
    console.log('\nTest 6: Navigation Display Format');
    const displayFormat = await page.evaluate(() => {
      const navCurrent = document.getElementById('nav-current');
      const parts = {
        diagram: navCurrent?.querySelector('.nav-diagram')?.innerText || '',
        state: navCurrent?.querySelector('.nav-state')?.innerText || '',
        global: navCurrent?.querySelector('.nav-global')?.innerText || ''
      };

      return {
        hasDiagram: parts.diagram.includes('D') && parts.diagram.includes('/13'),
        hasState: parts.state.includes('S') && parts.state.includes('/'),
        hasGlobal: parts.global.includes('/'),
        fullText: navCurrent?.innerText || '',
        parts
      };
    });

    results.totalTests++;
    if (displayFormat.hasDiagram && displayFormat.hasState && displayFormat.hasGlobal) {
      console.log(`  ✅ PASS - Display format correct: ${displayFormat.fullText}`);
      console.log(`     Diagram: ${displayFormat.parts.diagram}`);
      console.log(`     State: ${displayFormat.parts.state}`);
      console.log(`     Global: ${displayFormat.parts.global}`);
      results.passed++;
    } else {
      console.log(`  ❌ FAIL - Display format incorrect`);
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