const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Create screenshots directory
const screenshotsDir = path.join(__dirname, 'screenshots', 'unified-nav');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function testUnifiedNavigation() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

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

    // Test 1: Check initial navigation state
    console.log('Test 1: Checking initial navigation state...');
    const initialNavText = await page.evaluate(() => {
      const navCurrent = document.getElementById('nav-current');
      return navCurrent ? navCurrent.innerText : null;
    });

    results.totalTests++;
    if (initialNavText) {
      console.log(`✓ Initial navigation text: ${initialNavText}`);
      results.passed++;
      results.details.push({ test: 'Initial nav state', status: 'passed', value: initialNavText });
    } else {
      console.log('✗ Could not find navigation text');
      results.failed++;
      results.details.push({ test: 'Initial nav state', status: 'failed' });
    }

    await page.screenshot({ path: path.join(screenshotsDir, '01-initial-state.png') });

    // Test 2: Navigate within diagram using state controls
    console.log('Test 2: Testing state navigation within diagram...');
    const hasStateControls = await page.evaluate(() => {
      const nextBtn = document.querySelector('.state-nav-buttons button:nth-child(2)');
      if (nextBtn && !nextBtn.disabled) {
        nextBtn.click();
        return true;
      }
      return false;
    });

    if (hasStateControls) {
      await page.waitForTimeout(500);
      const afterStateNav = await page.evaluate(() => {
        const navCurrent = document.getElementById('nav-current');
        return navCurrent ? navCurrent.innerText : null;
      });

      results.totalTests++;
      if (afterStateNav && afterStateNav !== initialNavText) {
        console.log(`✓ State navigation worked: ${afterStateNav}`);
        results.passed++;
        results.details.push({ test: 'State navigation', status: 'passed', value: afterStateNav });
      } else {
        console.log('✗ State navigation did not update nav display');
        results.failed++;
        results.details.push({ test: 'State navigation', status: 'failed' });
      }

      await page.screenshot({ path: path.join(screenshotsDir, '02-after-state-nav.png') });
    }

    // Test 3: Navigate to next diagram
    console.log('Test 3: Testing diagram navigation...');
    const canNavigateNext = await page.evaluate(() => {
      const nextBtn = document.getElementById('nav-next');
      return nextBtn && !nextBtn.disabled;
    });

    if (canNavigateNext) {
      await page.click('#nav-next');
      await page.waitForTimeout(1000);

      const afterDiagramNav = await page.evaluate(() => {
        const navCurrent = document.getElementById('nav-current');
        const diagramTitle = document.getElementById('diagram-title');
        return {
          nav: navCurrent ? navCurrent.innerText : null,
          title: diagramTitle ? diagramTitle.innerText : null
        };
      });

      results.totalTests++;
      if (afterDiagramNav.nav && afterDiagramNav.nav.includes('D2/13')) {
        console.log(`✓ Diagram navigation worked: ${afterDiagramNav.nav}`);
        console.log(`  Current diagram: ${afterDiagramNav.title}`);
        results.passed++;
        results.details.push({
          test: 'Diagram navigation',
          status: 'passed',
          value: afterDiagramNav.nav,
          diagram: afterDiagramNav.title
        });
      } else {
        console.log('✗ Diagram navigation did not work correctly');
        results.failed++;
        results.details.push({ test: 'Diagram navigation', status: 'failed' });
      }

      await page.screenshot({ path: path.join(screenshotsDir, '03-second-diagram.png') });
    }

    // Test 4: Test continuous navigation through multiple states
    console.log('Test 4: Testing continuous navigation...');
    let navigationPath = [];

    for (let i = 0; i < 10; i++) {
      const canContinue = await page.evaluate(() => {
        const nextBtn = document.getElementById('nav-next');
        return nextBtn && !nextBtn.disabled;
      });

      if (!canContinue) break;

      await page.click('#nav-next');
      await page.waitForTimeout(300);

      const currentState = await page.evaluate(() => {
        const navCurrent = document.getElementById('nav-current');
        const diagramTitle = document.getElementById('diagram-title');
        return {
          nav: navCurrent ? navCurrent.innerText : null,
          title: diagramTitle ? diagramTitle.innerText : null
        };
      });

      navigationPath.push(currentState);
      console.log(`  Position ${i + 1}: ${currentState.nav}`);
    }

    results.totalTests++;
    if (navigationPath.length > 0) {
      console.log(`✓ Navigated through ${navigationPath.length} states`);
      results.passed++;
      results.details.push({
        test: 'Continuous navigation',
        status: 'passed',
        statesTraversed: navigationPath.length
      });

      await page.screenshot({ path: path.join(screenshotsDir, '04-after-continuous-nav.png') });
    } else {
      console.log('✗ Could not perform continuous navigation');
      results.failed++;
      results.details.push({ test: 'Continuous navigation', status: 'failed' });
    }

    // Test 5: Test backward navigation
    console.log('Test 5: Testing backward navigation...');
    const beforeBackward = await page.evaluate(() => {
      const navCurrent = document.getElementById('nav-current');
      return navCurrent ? navCurrent.innerText : null;
    });

    await page.click('#nav-prev');
    await page.waitForTimeout(500);

    const afterBackward = await page.evaluate(() => {
      const navCurrent = document.getElementById('nav-current');
      return navCurrent ? navCurrent.innerText : null;
    });

    results.totalTests++;
    if (afterBackward && afterBackward !== beforeBackward) {
      console.log(`✓ Backward navigation worked: ${beforeBackward} → ${afterBackward}`);
      results.passed++;
      results.details.push({
        test: 'Backward navigation',
        status: 'passed',
        from: beforeBackward,
        to: afterBackward
      });
    } else {
      console.log('✗ Backward navigation did not work');
      results.failed++;
      results.details.push({ test: 'Backward navigation', status: 'failed' });
    }

    await page.screenshot({ path: path.join(screenshotsDir, '05-after-backward-nav.png') });

    // Test 6: Test navigation to specific diagram
    console.log('Test 6: Testing direct diagram navigation...');
    await page.evaluate(() => {
      const navItem = document.querySelector('[data-diagram-id="05-planes"]');
      if (navItem) navItem.click();
    });

    await page.waitForTimeout(1000);

    const afterDirectNav = await page.evaluate(() => {
      const navCurrent = document.getElementById('nav-current');
      const diagramTitle = document.getElementById('diagram-title');
      return {
        nav: navCurrent ? navCurrent.innerText : null,
        title: diagramTitle ? diagramTitle.innerText : null
      };
    });

    results.totalTests++;
    if (afterDirectNav.nav && afterDirectNav.nav.includes('D6/13')) {
      console.log(`✓ Direct navigation worked: ${afterDirectNav.nav}`);
      console.log(`  Current diagram: ${afterDirectNav.title}`);
      results.passed++;
      results.details.push({
        test: 'Direct diagram navigation',
        status: 'passed',
        nav: afterDirectNav.nav,
        title: afterDirectNav.title
      });
    } else {
      console.log('✗ Direct navigation did not work');
      results.failed++;
      results.details.push({ test: 'Direct diagram navigation', status: 'failed' });
    }

    await page.screenshot({ path: path.join(screenshotsDir, '06-direct-navigation.png') });

    // Test 7: Test edge cases (first and last positions)
    console.log('Test 7: Testing edge cases...');

    // Navigate to first diagram
    await page.evaluate(() => {
      const navItem = document.querySelector('[data-diagram-id="00-legend"]');
      if (navItem) navItem.click();
    });
    await page.waitForTimeout(500);

    const atFirstPosition = await page.evaluate(() => {
      const prevBtn = document.getElementById('nav-prev');
      const navCurrent = document.getElementById('nav-current');
      return {
        prevDisabled: prevBtn ? prevBtn.disabled : false,
        nav: navCurrent ? navCurrent.innerText : null
      };
    });

    // Navigate to last diagram
    await page.evaluate(() => {
      const navItem = document.querySelector('[data-diagram-id="12-dna"]');
      if (navItem) navItem.click();
    });
    await page.waitForTimeout(500);

    // Try to navigate to the last state of the last diagram
    let reachedEnd = false;
    for (let i = 0; i < 10; i++) {
      const canContinue = await page.evaluate(() => {
        const nextBtn = document.getElementById('nav-next');
        if (nextBtn && !nextBtn.disabled) {
          nextBtn.click();
          return true;
        }
        return false;
      });

      if (!canContinue) {
        reachedEnd = true;
        break;
      }
      await page.waitForTimeout(200);
    }

    const atLastPosition = await page.evaluate(() => {
      const nextBtn = document.getElementById('nav-next');
      const navCurrent = document.getElementById('nav-current');
      return {
        nextDisabled: nextBtn ? nextBtn.disabled : false,
        nav: navCurrent ? navCurrent.innerText : null
      };
    });

    results.totalTests++;
    if (atFirstPosition.prevDisabled && atLastPosition.nextDisabled) {
      console.log('✓ Edge case navigation buttons disabled correctly');
      console.log(`  First position: ${atFirstPosition.nav} (prev disabled: ${atFirstPosition.prevDisabled})`);
      console.log(`  Last position: ${atLastPosition.nav} (next disabled: ${atLastPosition.nextDisabled})`);
      results.passed++;
      results.details.push({
        test: 'Edge cases',
        status: 'passed',
        firstPos: atFirstPosition,
        lastPos: atLastPosition
      });
    } else {
      console.log('✗ Edge case navigation buttons not properly disabled');
      results.failed++;
      results.details.push({ test: 'Edge cases', status: 'failed' });
    }

    await page.screenshot({ path: path.join(screenshotsDir, '07-last-position.png') });

  } catch (error) {
    console.error('Test failed with error:', error);
    results.details.push({ test: 'Overall', status: 'error', error: error.message });
  }

  await browser.close();

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('UNIFIED NAVIGATION TEST RESULTS');
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