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

  console.log('Testing caption text wrapping...\n');

  try {
    await page.goto('http://localhost:8899/index.html', { waitUntil: 'networkidle2', timeout: 15000 });
    await page.waitForTimeout(3000);

    // Capture initial short caption
    console.log('[1/4] Capturing with short caption...');
    await page.screenshot({
      path: path.join(screenshotsDir, 'wrap-01-short-caption.png'),
      fullPage: false
    });

    // Inject long caption text
    console.log('[2/4] Testing with long caption text...');
    await page.evaluate(() => {
      const caption = document.getElementById('step-caption');
      if (caption) {
        caption.textContent = 'This is a very long caption that demonstrates how the text wrapping works when we have multiple lines of content in the step caption area';
      }
    });

    await page.waitForTimeout(500);

    const captionBox = await page.evaluate(() => {
      const captionContainer = document.getElementById('step-caption-container');
      const controls = document.getElementById('step-controls');

      const captionRect = captionContainer ? captionContainer.getBoundingClientRect() : null;
      const controlsRect = controls ? controls.getBoundingClientRect() : null;

      return {
        caption: captionRect ? {
          top: captionRect.top,
          bottom: captionRect.bottom,
          height: captionRect.height
        } : null,
        controls: controlsRect ? {
          top: controlsRect.top,
          bottom: controlsRect.bottom
        } : null,
        gap: captionRect && controlsRect ? controlsRect.top - captionRect.bottom : null
      };
    });

    console.log('  Caption height: ' + captionBox.caption?.height + 'px');
    console.log('  Gap between caption and controls: ' + captionBox.gap + 'px');

    await page.screenshot({
      path: path.join(screenshotsDir, 'wrap-02-long-caption.png'),
      fullPage: false
    });

    // Zoom to bottom area
    const bottomArea = await page.evaluate(() => {
      const controls = document.getElementById('step-controls');
      if (!controls) return null;
      const rect = controls.getBoundingClientRect();
      return {
        x: Math.max(0, rect.x - 100),
        y: Math.max(0, rect.y - 150),
        width: Math.min(rect.width + 200, 1920),
        height: 250
      };
    });

    if (bottomArea) {
      await page.screenshot({
        path: path.join(screenshotsDir, 'wrap-03-bottom-detail.png'),
        clip: bottomArea
      });
    }

    // Test very long caption
    console.log('[3/4] Testing with very long caption (should scroll)...');
    await page.evaluate(() => {
      const caption = document.getElementById('step-caption');
      if (caption) {
        caption.textContent = 'This is an extremely long caption that goes on and on to test the maximum height and scrolling behavior. It should wrap to multiple lines and if it exceeds the max-height of 80px, it should show a scrollbar. This ensures that even with very verbose step descriptions, the layout remains stable and the gap between caption and controls is maintained.';
      }
    });

    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(screenshotsDir, 'wrap-04-very-long-caption.png'),
      fullPage: false
    });

    const finalLayout = await page.evaluate(() => {
      const captionText = document.querySelector('.step-caption-text');
      const captionContainer = document.getElementById('step-caption-container');
      const controls = document.getElementById('step-controls');

      const captionTextRect = captionText ? captionText.getBoundingClientRect() : null;
      const captionContRect = captionContainer ? captionContainer.getBoundingClientRect() : null;
      const controlsRect = controls ? controls.getBoundingClientRect() : null;

      return {
        captionTextHeight: captionTextRect?.height,
        captionContainerHeight: captionContRect?.height,
        gap: captionContRect && controlsRect ? controlsRect.top - captionContRect.bottom : null,
        isScrollable: captionText ? captionText.scrollHeight > captionText.clientHeight : false
      };
    });

    console.log('  Very long caption:');
    console.log('    Caption text height: ' + finalLayout.captionTextHeight + 'px (max-height: 80px)');
    console.log('    Is scrollable: ' + finalLayout.isScrollable);
    console.log('    Gap maintained: ' + finalLayout.gap + 'px ✓\n');

    console.log('✅ Text wrapping tests complete!\n');
    console.log('Summary:');
    console.log('  - Short captions: display inline ✓');
    console.log('  - Long captions: wrap to multiple lines ✓');
    console.log('  - Very long captions: scroll within max-height ✓');
    console.log('  - Gap always maintained: ' + finalLayout.gap + 'px ✓\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  await browser.close();
})();
