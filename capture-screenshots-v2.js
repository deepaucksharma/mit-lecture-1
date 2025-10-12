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

  // Listen for console messages and errors
  page.on('console', msg => console.log('Browser console:', msg.text()));
  page.on('pageerror', error => console.log('Page error:', error.message));

  console.log('Navigating to application...');

  try {
    await page.goto('http://localhost:8899/index.html', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });

    // Wait for loading to disappear or diagram to appear
    await page.waitForFunction(
      () => {
        const loading = document.getElementById('loading');
        return !loading || loading.style.display === 'none';
      },
      { timeout: 20000 }
    ).catch(() => console.log('Loading did not disappear, continuing anyway...'));

    await page.waitForTimeout(3000);

    // Capture full page
    console.log('Capturing full page screenshot...');
    await page.screenshot({
      path: path.join(screenshotsDir, 'v2-01-full-page.png'),
      fullPage: false
    });

    // Get console errors if any
    const errors = await page.evaluate(() => {
      const errors = window._errors || [];
      return errors;
    });

    if (errors.length > 0) {
      console.log('Found errors:', errors);
    }

    // Check if step controls exist and are visible
    const stepControlsExists = await page.evaluate(() => {
      const el = document.getElementById('step-controls');
      if (!el) return 'Element not found';
      const styles = window.getComputedStyle(el);
      return {
        exists: true,
        display: styles.display,
        visibility: styles.visibility,
        innerHTML: el.innerHTML.substring(0, 200)
      };
    });
    console.log('Step controls state:', stepControlsExists);

    // Check accordion state
    const accordionState = await page.evaluate(() => {
      const assessment = document.querySelector('.assessment-accordion');
      const drills = document.querySelector('.drills-accordion');
      return {
        assessmentExists: !!assessment,
        drillsExists: !!drills,
        assessmentContent: assessment ? assessment.innerHTML.substring(0, 200) : 'Not found',
        drillsContent: drills ? drills.innerHTML.substring(0, 200) : 'Not found'
      };
    });
    console.log('Accordion state:', accordionState);

    console.log('Screenshots captured!');
    console.log(`Saved to: ${screenshotsDir}`);

  } catch (error) {
    console.error('Error during screenshot capture:', error);

    // Capture error state
    await page.screenshot({
      path: path.join(screenshotsDir, 'v2-error-state.png'),
      fullPage: false
    });
  }

  await browser.close();
})();
