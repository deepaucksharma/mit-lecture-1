const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const screenshotsDir = path.join(__dirname, 'screenshots-visual-test');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('Starting comprehensive visual testing...\n');

  try {
    // Navigate to app
    console.log('[1/10] Loading application...');
    await page.goto('http://localhost:8899/index.html', { waitUntil: 'networkidle2', timeout: 15000 });
    await page.waitForTimeout(3000);

    // Full page
    console.log('[2/10] Capturing full page...');
    await page.screenshot({
      path: path.join(screenshotsDir, 'test-01-full-page.png'),
      fullPage: false
    });

    // Contracts sidebar detailed
    console.log('[3/10] Capturing contracts sidebar...');
    const contractsBox = await page.evaluate(() => {
      const el = document.querySelector('.sidebar-contracts');
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height
      };
    });

    if (contractsBox) {
      await page.screenshot({
        path: path.join(screenshotsDir, 'test-02-contracts-sidebar.png'),
        clip: contractsBox
      });
      console.log(`   Contracts width: ${contractsBox.width}px`);
    }

    // Step controls at bottom
    console.log('[4/10] Capturing step controls...');
    const stepControlsBox = await page.evaluate(() => {
      const el = document.querySelector('.state-controls-floating');
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        x: Math.max(0, rect.x - 50),
        y: Math.max(0, rect.y - 50),
        width: rect.width + 100,
        height: rect.height + 100
      };
    });

    if (stepControlsBox) {
      await page.screenshot({
        path: path.join(screenshotsDir, 'test-03-step-controls.png'),
        clip: stepControlsBox
      });
    }

    // Switch to Practice & Assessment tab
    console.log('[5/10] Switching to Practice & Assessment tab...');
    await page.click('[data-tab="practice"]');
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: path.join(screenshotsDir, 'test-04-practice-tab-full.png'),
      fullPage: false
    });

    // Capture right sidebar with practice tab
    console.log('[6/10] Capturing right sidebar...');
    const rightSidebarBox = await page.evaluate(() => {
      const el = document.querySelector('.sidebar-right');
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: Math.min(rect.height, 1080)
      };
    });

    if (rightSidebarBox) {
      await page.screenshot({
        path: path.join(screenshotsDir, 'test-05-right-sidebar.png'),
        clip: rightSidebarBox
      });
      console.log(`   Right sidebar width: ${rightSidebarBox.width}px`);
    }

    // Open Assessment accordion
    console.log('[7/10] Opening Assessment accordion...');
    await page.click('.assessment-accordion summary');
    await page.waitForTimeout(800);

    await page.screenshot({
      path: path.join(screenshotsDir, 'test-06-assessment-open.png'),
      fullPage: false
    });

    // Capture just the assessment content
    const assessmentBox = await page.evaluate(() => {
      const el = document.querySelector('.assessment-accordion');
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: Math.min(rect.height, 800)
      };
    });

    if (assessmentBox) {
      await page.screenshot({
        path: path.join(screenshotsDir, 'test-07-assessment-detail.png'),
        clip: assessmentBox
      });
    }

    // Open Drills accordion
    console.log('[8/10] Opening Drills accordion...');
    await page.click('.drills-accordion summary');
    await page.waitForTimeout(800);

    await page.screenshot({
      path: path.join(screenshotsDir, 'test-08-drills-open.png'),
      fullPage: false
    });

    // Navigate to a different diagram with longer content
    console.log('[9/10] Testing with different diagram (06-read-path)...');
    await page.evaluate(() => {
      window.viewer.loadDiagram('06-read-path');
    });
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: path.join(screenshotsDir, 'test-09-read-path-diagram.png'),
      fullPage: false
    });

    // Switch to dark mode
    console.log('[10/10] Testing dark mode...');
    await page.click('#theme-toggle');
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(screenshotsDir, 'test-10-dark-mode.png'),
      fullPage: false
    });

    console.log('\n✅ All screenshots captured successfully!');
    console.log(`📁 Location: ${screenshotsDir}\n`);

    // List all captured files
    const files = fs.readdirSync(screenshotsDir).filter(f => f.startsWith('test-'));
    console.log('Captured screenshots:');
    files.forEach(file => {
      const stats = fs.statSync(path.join(screenshotsDir, file));
      console.log(`   - ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
    });

  } catch (error) {
    console.error('❌ Error during screenshot capture:', error.message);
    await page.screenshot({
      path: path.join(screenshotsDir, 'test-error-state.png'),
      fullPage: false
    });
  }

  await browser.close();
})();
