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

  console.log('Testing new caption layout...\n');

  try {
    await page.goto('http://localhost:8899/index.html', { waitUntil: 'networkidle2', timeout: 15000 });
    await page.waitForTimeout(3000);

    // Capture initial state
    console.log('[1/4] Capturing initial state with caption above bar...');
    await page.screenshot({
      path: path.join(screenshotsDir, 'caption-01-initial.png'),
      fullPage: false
    });

    // Check caption positioning
    const layout = await page.evaluate(() => {
      const caption = document.getElementById('step-caption');
      const captionContainer = document.getElementById('step-caption-container');
      const controls = document.getElementById('step-controls');
      const diagram = document.getElementById('diagram-container');

      const getCenterY = (el) => {
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return rect.top + rect.height / 2;
      };

      return {
        caption: caption ? {
          display: window.getComputedStyle(caption).display,
          text: caption.textContent,
          centerY: getCenterY(caption)
        } : null,
        captionContainer: captionContainer ? {
          display: window.getComputedStyle(captionContainer).display,
          bottom: window.getComputedStyle(captionContainer).bottom,
          centerY: getCenterY(captionContainer)
        } : null,
        controls: controls ? {
          bottom: window.getComputedStyle(controls).bottom,
          centerY: getCenterY(controls)
        } : null,
        diagram: diagram ? {
          paddingBottom: window.getComputedStyle(diagram).paddingBottom
        } : null
      };
    });

    console.log('Layout measurements:');
    console.log(`  Caption container bottom: ${layout.captionContainer?.bottom}`);
    console.log(`  Controls bottom: ${layout.controls?.bottom}`);
    console.log(`  Diagram padding-bottom: ${layout.diagram?.paddingBottom}`);
    console.log(`  Caption Y: ${layout.caption?.centerY}`);
    console.log(`  Controls Y: ${layout.controls?.centerY}`);
    console.log(`  Separation: ${(layout.controls?.centerY - layout.caption?.centerY).toFixed(0)}px\n`);

    // Capture zoomed view of bottom area
    console.log('[2/4] Capturing bottom area detail...');
    const bottomBox = await page.evaluate(() => {
      const controls = document.getElementById('step-controls');
      if (!controls) return null;
      const rect = controls.getBoundingClientRect();
      return {
        x: Math.max(0, rect.x - 100),
        y: Math.max(0, rect.y - 120),
        width: Math.min(rect.width + 200, 1920),
        height: 200
      };
    });

    if (bottomBox) {
      await page.screenshot({
        path: path.join(screenshotsDir, 'caption-02-bottom-detail.png'),
        clip: bottomBox
      });
    }

    // Click play to see caption change
    console.log('[3/4] Testing caption updates...');
    await page.click('#step-play');
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: path.join(screenshotsDir, 'caption-03-playing.png'),
      fullPage: false
    });

    const captionAfterPlay = await page.evaluate(() => {
      const caption = document.getElementById('step-caption');
      return caption ? caption.textContent : null;
    });
    console.log(`  Caption text after play: "${captionAfterPlay}"`);

    // Dark mode test
    console.log('[4/4] Testing dark mode...');
    await page.click('#theme-toggle');
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(screenshotsDir, 'caption-04-dark-mode.png'),
      fullPage: false
    });

    console.log('\n✅ Caption layout tests complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  await browser.close();
})();
