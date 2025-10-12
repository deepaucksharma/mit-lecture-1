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

  console.log('Navigating to application...');
  await page.goto('http://localhost:8899/index.html', { waitUntil: 'networkidle2' });

  // Wait for main content to load
  await page.waitForSelector('.app', { timeout: 10000 });
  await page.waitForTimeout(2000);

  // Capture full page
  console.log('Capturing full page screenshot...');
  await page.screenshot({
    path: path.join(screenshotsDir, '01-full-page.png'),
    fullPage: true
  });

  // Capture contracts sidebar
  console.log('Capturing contracts sidebar...');
  const contractsSidebar = await page.$('.sidebar-contracts');
  if (contractsSidebar) {
    await contractsSidebar.screenshot({
      path: path.join(screenshotsDir, '02-contracts-sidebar.png')
    });
  }

  // Capture step controls
  console.log('Capturing step controls...');
  const stepControls = await page.$('#step-controls');
  if (stepControls) {
    await stepControls.screenshot({
      path: path.join(screenshotsDir, '03-step-controls.png')
    });
  }

  // Click on Practice & Assessment tab
  console.log('Switching to Practice & Assessment tab...');
  await page.click('[data-tab="practice"]');
  await page.waitForTimeout(1000);

  //Capture practice tab
  await page.screenshot({
    path: path.join(screenshotsDir, '04-practice-tab.png'),
    fullPage: true
  });

  // Capture assessment accordion
  const assessmentAccordion = await page.$('.assessment-accordion');
  if (assessmentAccordion) {
    await assessmentAccordion.screenshot({
      path: path.join(screenshotsDir, '05-assessment-accordion-closed.png')
    });

    // Open the accordion
    await page.click('.assessment-accordion summary');
    await page.waitForTimeout(500);

    await assessmentAccordion.screenshot({
      path: path.join(screenshotsDir, '06-assessment-accordion-open.png')
    });
  }

  // Capture drills accordion
  const drillsAccordion = await page.$('.drills-accordion');
  if (drillsAccordion) {
    await drillsAccordion.screenshot({
      path: path.join(screenshotsDir, '07-drills-accordion-closed.png')
    });

    // Open the drills accordion
    await page.click('.drills-accordion summary');
    await page.waitForTimeout(500);

    await drillsAccordion.screenshot({
      path: path.join(screenshotsDir, '08-drills-accordion-open.png')
    });
  }

  console.log('Screenshots captured successfully!');
  console.log(`Saved to: ${screenshotsDir}`);

  await browser.close();
})().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
