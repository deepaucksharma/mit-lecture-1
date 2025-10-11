#!/usr/bin/env node

/**
 * Verify UI Changes - Test accordion layout and tab reorganization
 */

const puppeteer = require('puppeteer');

async function verifyUIChanges() {
  console.log('🔍 Verifying UI Changes...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  try {
    // Load the application
    console.log('📱 Loading application...');
    await page.goto('http://localhost:8888', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    await page.waitForTimeout(2000);

    // 1. Check if Principles tab is active by default
    const principlesTabActive = await page.evaluate(() => {
      const principlesTab = document.querySelector('[data-tab="principles"]');
      return principlesTab && principlesTab.classList.contains('active');
    });

    console.log(`✅ Principles tab is default active: ${principlesTabActive ? 'YES' : 'NO'}`);

    // 2. Check if Practice & Assessment tab exists
    const practiceTabExists = await page.evaluate(() => {
      const practiceTab = document.querySelector('[data-tab="practice"]');
      return practiceTab && practiceTab.textContent.includes('Practice & Assessment');
    });

    console.log(`✅ Practice & Assessment tab exists: ${practiceTabExists ? 'YES' : 'NO'}`);

    // 3. Check Principles container has accordion structure
    const principlesAccordion = await page.evaluate(() => {
      const container = document.getElementById('principles-container');
      if (!container) return { found: false };

      const firstPrinciplesAccordion = container.querySelector('.first-principles-accordion');
      const advancedConceptsAccordion = container.querySelector('.advanced-concepts-accordion');
      const subAccordions = container.querySelectorAll('.sub-accordion-item');

      return {
        found: true,
        hasFirstPrinciples: !!firstPrinciplesAccordion,
        hasAdvancedConcepts: !!advancedConceptsAccordion,
        subAccordionCount: subAccordions.length
      };
    });

    console.log(`✅ Principles accordion structure:`);
    console.log(`   - First Principles accordion: ${principlesAccordion.hasFirstPrinciples ? 'YES' : 'NO'}`);
    console.log(`   - Advanced Concepts accordion: ${principlesAccordion.hasAdvancedConcepts ? 'YES' : 'NO'}`);
    console.log(`   - Sub-accordions: ${principlesAccordion.subAccordionCount}`);

    // 4. Click on Practice & Assessment tab
    await page.evaluate(() => {
      const practiceTab = document.querySelector('[data-tab="practice"]');
      if (practiceTab) practiceTab.click();
    });
    await page.waitForTimeout(500);

    // 5. Check Practice container structure
    const practiceStructure = await page.evaluate(() => {
      const container = document.getElementById('practice-container');
      if (!container) return { found: false };

      const assessmentAccordion = container.querySelector('.assessment-accordion');
      const drillsAccordion = container.querySelector('.drills-accordion');
      const isActive = container.classList.contains('active');

      return {
        found: true,
        isActive,
        hasAssessmentSection: !!assessmentAccordion,
        hasAssessmentOpen: assessmentAccordion?.hasAttribute('open'),
        hasDrillsSection: !!drillsAccordion,
        hasDrillsOpen: drillsAccordion?.hasAttribute('open')
      };
    });

    console.log(`\n✅ Practice & Assessment structure:`);
    console.log(`   - Container active: ${practiceStructure.isActive ? 'YES' : 'NO'}`);
    console.log(`   - Assessment accordion: ${practiceStructure.hasAssessmentSection ? 'YES' : 'NO'}`);
    console.log(`   - Assessment open by default: ${practiceStructure.hasAssessmentOpen ? 'YES' : 'NO'}`);
    console.log(`   - Drills accordion: ${practiceStructure.hasDrillsSection ? 'YES' : 'NO'}`);
    console.log(`   - Drills open by default: ${practiceStructure.hasDrillsOpen ? 'YES' : 'NO'}`);

    // 6. Test accordion collapse/expand
    const accordionTest = await page.evaluate(() => {
      const assessmentAccordion = document.querySelector('.assessment-accordion');
      if (!assessmentAccordion) return { tested: false };

      // Click to collapse
      const summary = assessmentAccordion.querySelector('summary');
      if (summary) {
        summary.click();
        const closedState = !assessmentAccordion.hasAttribute('open');

        // Click to expand again
        summary.click();
        const openState = assessmentAccordion.hasAttribute('open');

        return {
          tested: true,
          canClose: closedState,
          canOpen: openState
        };
      }

      return { tested: false };
    });

    console.log(`\n✅ Accordion functionality:`);
    console.log(`   - Can collapse: ${accordionTest.canClose ? 'YES' : 'NO'}`);
    console.log(`   - Can expand: ${accordionTest.canOpen ? 'YES' : 'NO'}`);

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 VERIFICATION SUMMARY');
    console.log('='.repeat(50));

    const allChecks = [
      principlesTabActive,
      practiceTabExists,
      principlesAccordion.hasFirstPrinciples,
      principlesAccordion.hasAdvancedConcepts,
      practiceStructure.hasAssessmentSection,
      practiceStructure.hasDrillsSection,
      accordionTest.canClose && accordionTest.canOpen
    ];

    const passedChecks = allChecks.filter(Boolean).length;
    const totalChecks = allChecks.length;

    console.log(`✅ Passed: ${passedChecks}/${totalChecks}`);

    if (passedChecks === totalChecks) {
      console.log('\n🎉 All UI changes verified successfully!');
      console.log('\nKey achievements:');
      console.log('  ✓ Principles is now the default active tab');
      console.log('  ✓ Principles content organized in accordions');
      console.log('  ✓ Drills and Assessment combined in Practice tab');
      console.log('  ✓ Both sections use accordion layout');
      console.log('  ✓ Accordions are collapsible and expandable');
    } else {
      console.log('\n⚠️  Some checks failed. Please review the output above.');
    }

  } catch (error) {
    console.error('❌ Error during verification:', error.message);
  } finally {
    await browser.close();
  }
}

// Run verification
verifyUIChanges().then(() => {
  console.log('\n✅ Verification complete!');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});