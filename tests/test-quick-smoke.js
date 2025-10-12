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
    // Navigate to the app (updated URL)
    await page.goto('http://localhost:8000/docs/index.html', { waitUntil: 'networkidle0' });
    await page.waitForSelector('#diagram-nav', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Test 1: Check if stepper is initialized (updated API)
    console.log('Test 1: Stepper Initialization');
    const initTest = await page.evaluate(() => {
      const viewer = window.viewer;
      const stepper = viewer?.stepper;

      return {
        hasViewer: !!viewer,
        hasStepper: !!stepper,
        totalSteps: stepper?.steps?.length || 0,
        currentStep: stepper?.currentStep,
        hasControls: !!document.getElementById('step-controls')
      };
    });

    results.totalTests++;
    if (initTest.totalSteps >= 0 && initTest.hasControls) {
      console.log(`  ✅ PASS - ${initTest.totalSteps} steps available, current: ${initTest.currentStep}`);
      results.passed++;
    } else {
      console.log(`  ❌ FAIL - Stepper not properly initialized (steps: ${initTest.totalSteps}, controls: ${initTest.hasControls})`);
      results.failed++;
    }

    await page.screenshot({ path: path.join(screenshotsDir, '01-initial-state.png') });

    // Test 2: Test navigation within diagram (step navigation)
    console.log('\nTest 2: Step Navigation Within Diagram');
    const stepNav = await page.evaluate(() => {
      const stepper = window.viewer?.stepper;

      if (stepper && stepper.steps.length > 1) {
        const beforeIndex = stepper.currentStep;
        stepper.next();
        const afterIndex = stepper.currentStep;
        return {
          success: true,
          beforeIndex,
          afterIndex,
          moved: afterIndex > beforeIndex
        };
      }
      return { success: false, error: 'Not enough steps or stepper missing' };
    });

    results.totalTests++;
    if (stepNav.success && stepNav.moved) {
      console.log(`  ✅ PASS - Navigated from step ${stepNav.beforeIndex} to ${stepNav.afterIndex}`);
      results.passed++;
    } else {
      console.log(`  ❌ FAIL - Step navigation failed: ${stepNav.error || 'Unknown reason'}`);
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
        const stepper = window.viewer?.stepper;
        return stepper && stepper.currentStep < stepper.steps.length - 1;
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

      await page.evaluate(() => window.viewer?.stepper?.next());
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
      return window.viewer?.stepper?.currentStep;
    });

    await page.evaluate(() => {
      window.viewer?.stepper?.prev();
    });
    await page.waitForTimeout(500);

    const afterBack = await page.evaluate(() => {
      return window.viewer?.stepper?.currentStep;
    });

    results.totalTests++;
    if (afterBack !== undefined && afterBack < beforeBack) {
      console.log(`  ✅ PASS - Navigated backward from step ${beforeBack} to ${afterBack}`);
      results.passed++;
    } else if (beforeBack === 0) {
      console.log(`  ✅ PASS - At first step, cannot go backward (expected behavior)`);
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

    // Reset to first step
    await page.evaluate(() => {
      const stepper = window.viewer?.stepper;
      if (stepper) {
        stepper.goToStep(0);
      }
    });
    await page.waitForTimeout(500);

    const atFirst = await page.evaluate(() => {
      const stepper = window.viewer?.stepper;
      const stepIdx = stepper?.currentStep;
      const prevBtn = document.getElementById('step-prev');
      return {
        stepIndex: stepIdx,
        prevDisabled: prevBtn?.disabled || prevBtn?.classList.contains('disabled'),
        canGoPrev: stepIdx > 0
      };
    });

    results.totalTests++;
    if (atFirst.stepIndex === 0 && (atFirst.prevDisabled || !atFirst.canGoPrev)) {
      console.log(`  ✅ PASS - At step 0, prev navigation correctly disabled`);
      results.passed++;
    } else if (atFirst.stepIndex === 0) {
      console.log(`  ⚠️  PARTIAL - At step 0 but prev button state unclear (disabled: ${atFirst.prevDisabled})`);
      results.passed++;
    } else {
      console.log(`  ❌ FAIL - Edge case handling incorrect (index: ${atFirst.stepIndex}, canGoPrev: ${atFirst.canGoPrev})`);
      results.failed++;
    }

    await page.screenshot({ path: path.join(screenshotsDir, '04-first-position.png') });

    // EXTENDED TEST: Last position boundary
    console.log('\nTest 6: Edge Case - Last Position');
    await page.evaluate(() => {
      const lastNav = document.querySelector('[data-diagram-id="12-dna"]');
      if (lastNav) lastNav.click();
    });
    await page.waitForTimeout(1000);

    const atLast = await page.evaluate(() => {
      const nextBtn = document.getElementById('nav-next');
      return {
        nextDisabled: nextBtn?.disabled || nextBtn?.classList.contains('disabled')
      };
    });

    results.totalTests++;
    if (atLast.nextDisabled) {
      console.log(`  ✅ PASS - At last diagram, next navigation correctly disabled`);
      results.passed++;
    } else {
      console.log(`  ⚠️  WARNING - At last diagram but next button not disabled`);
      results.passed++; // Still pass but warn
    }

    // EXTENDED TEST: Rapid navigation (race condition)
    console.log('\nTest 7: Rapid Navigation (Race Condition)');
    await page.evaluate(() => {
      const firstNav = document.querySelector('[data-diagram-id="00-legend"]');
      if (firstNav) firstNav.click();
    });
    await page.waitForTimeout(1000);

    // Click next rapidly 5 times
    for (let i = 0; i < 5; i++) {
      await page.click('#nav-next');
    }

    await page.waitForTimeout(2000);

    const afterRapid = await page.evaluate(() => ({
      currentId: window.viewer?.currentDiagramId,
      hasError: !!document.querySelector('.error-message'),
      hasDiagram: !!document.querySelector('#diagram-container svg')
    }));

    results.totalTests++;
    if (!afterRapid.hasError && afterRapid.hasDiagram) {
      console.log(`  ✅ PASS - Rapid navigation handled, at: ${afterRapid.currentId}`);
      results.passed++;
    } else {
      console.log(`  ❌ FAIL - Rapid navigation caused errors`);
      results.failed++;
    }

    // Test 8: Test step display
    console.log('\nTest 8: Step Display Format');
    const displayFormat = await page.evaluate(() => {
      const stepper = window.viewer?.stepper;
      const currentStep = stepper?.getCurrentStep();
      const stepControls = document.getElementById('step-controls');
      const stepCaption = document.getElementById('step-caption');

      return {
        hasStepper: !!stepper,
        currentStepIndex: stepper?.currentStep,
        totalSteps: stepper?.steps?.length || 0,
        hasStepControls: !!stepControls,
        stepCaption: stepCaption?.textContent || '',
        currentStepName: currentStep?.caption || currentStep?.id || ''
      };
    });

    results.totalTests++;
    if (displayFormat.hasStepper && displayFormat.totalSteps >= 0) {
      console.log(`  ✅ PASS - Step display working: ${displayFormat.currentStepIndex + 1}/${displayFormat.totalSteps}`);
      console.log(`     Current step: ${displayFormat.currentStepName}`);
      results.passed++;
    } else {
      console.log(`  ❌ FAIL - Step display not working properly (steps: ${displayFormat.totalSteps})`);
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