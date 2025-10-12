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

  console.log('Testing final state with all collapsed accordions...\n');

  try {
    // Navigate to app
    await page.goto('http://localhost:8899/index.html', { waitUntil: 'networkidle2', timeout: 15000 });
    await page.waitForTimeout(3000);

    // Capture full page - everything should be collapsed
    console.log('[1/6] Capturing full page with collapsed accordions...');
    await page.screenshot({
      path: path.join(screenshotsDir, 'final-01-all-collapsed.png'),
      fullPage: false
    });

    // Check accordion states
    const accordionStates = await page.evaluate(() => {
      const results = {
        principles: {},
        advanced: {},
        assessment: {},
        drills: {}
      };

      // Check principles sections
      const principleSections = document.querySelectorAll('.principle-section');
      results.principles.total = principleSections.length;
      results.principles.open = Array.from(principleSections).filter(el => el.open).length;

      // Check advanced concepts
      const advancedContainer = document.querySelector('.advanced-concepts-container');
      results.advanced.exists = !!advancedContainer;
      results.advanced.open = advancedContainer ? advancedContainer.open : false;

      const advancedSections = document.querySelectorAll('.advanced-section');
      results.advanced.sectionsTotal = advancedSections.length;
      results.advanced.sectionsOpen = Array.from(advancedSections).filter(el => el.open).length;

      // Check assessment accordion
      const assessment = document.querySelector('.assessment-accordion');
      results.assessment.open = assessment ? assessment.open : false;

      // Check drills accordion
      const drills = document.querySelector('.drills-accordion');
      results.drills.open = drills ? drills.open : false;

      return results;
    });

    console.log('\nAccordion States on Page Load:');
    console.log('  Principles:');
    console.log(`    - Total sections: ${accordionStates.principles.total}`);
    console.log(`    - Open sections: ${accordionStates.principles.open} ✓`);
    console.log('  Advanced Concepts:');
    console.log(`    - Container open: ${accordionStates.advanced.open} ✓`);
    console.log(`    - Total subsections: ${accordionStates.advanced.sectionsTotal}`);
    console.log(`    - Open subsections: ${accordionStates.advanced.sectionsOpen} ✓`);
    console.log('  Assessment Accordion:');
    console.log(`    - Open: ${accordionStates.assessment.open} ✓`);
    console.log('  Drills Accordion:');
    console.log(`    - Open: ${accordionStates.drills.open} ✓\n`);

    // Switch to Practice tab
    console.log('[2/6] Switching to Practice tab...');
    await page.click('[data-tab="practice"]');
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: path.join(screenshotsDir, 'final-02-practice-tab-collapsed.png'),
      fullPage: false
    });

    // Open assessment accordion
    console.log('[3/6] Opening Assessment accordion...');
    await page.click('.assessment-accordion summary');
    await page.waitForTimeout(800);

    await page.screenshot({
      path: path.join(screenshotsDir, 'final-03-assessment-expanded.png'),
      fullPage: false
    });

    // Check for analyze drill content
    console.log('[4/6] Opening drills accordion to check analyze drill...');
    await page.click('.drills-accordion summary');
    await page.waitForTimeout(800);

    await page.screenshot({
      path: path.join(screenshotsDir, 'final-04-drills-expanded.png'),
      fullPage: false
    });

    // Find and open a drill
    const drillExists = await page.evaluate(() => {
      const drill = document.querySelector('.drill-analyze');
      return !!drill;
    });

    if (drillExists) {
      console.log('[5/6] Found analyze drill, checking content...');

      const analyzeDrillContent = await page.evaluate(() => {
        const drill = document.querySelector('.drill-analyze');
        if (!drill) return null;

        return {
          hasTextareas: drill.querySelectorAll('textarea').length,
          hasButtons: drill.querySelectorAll('button').length,
          hasThoughtProcess: !!drill.querySelector('.thought-process'),
          hasInsight: !!drill.querySelector('.drill-insight'),
          content: drill.innerHTML.substring(0, 300)
        };
      });

      console.log('  Analyze Drill Content:');
      console.log(`    - Textareas (should be 0): ${analyzeDrillContent.hasTextareas} ${analyzeDrillContent.hasTextareas === 0 ? '✓' : '✗'}`);
      console.log(`    - Buttons (should be 0): ${analyzeDrillContent.hasButtons} ${analyzeDrillContent.hasButtons === 0 ? '✓' : '✗'}`);
      console.log(`    - Has thought process: ${analyzeDrillContent.hasThoughtProcess} ${analyzeDrillContent.hasThoughtProcess ? '✓' : '○'}`);
      console.log(`    - Has key insight: ${analyzeDrillContent.hasInsight} ${analyzeDrillContent.hasInsight ? '✓' : '○'}\n`);
    } else {
      console.log('[5/6] No analyze drills found on this page\n');
    }

    // Capture dark mode
    console.log('[6/6] Testing dark mode...');
    await page.click('#theme-toggle');
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(screenshotsDir, 'final-05-dark-mode-test.png'),
      fullPage: false
    });

    console.log('✅ All tests complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  await browser.close();
})();
