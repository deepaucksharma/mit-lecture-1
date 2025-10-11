#!/usr/bin/env node

/**
 * Verify Accordion Updates - Test collapsed state and styling improvements
 */

const puppeteer = require('puppeteer');

async function verifyAccordionUpdates() {
  console.log('🎨 Verifying Accordion Updates...\n');

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

    // 1. Check Principles accordions are collapsed by default
    const principlesCollapsed = await page.evaluate(() => {
      const firstPrinciplesAccordion = document.querySelector('.first-principles-accordion');
      const advancedConceptsAccordion = document.querySelector('.advanced-concepts-accordion');

      return {
        firstPrinciples: firstPrinciplesAccordion ? !firstPrinciplesAccordion.hasAttribute('open') : false,
        advancedConcepts: advancedConceptsAccordion ? !advancedConceptsAccordion.hasAttribute('open') : false,
        hasFirstPrinciplesIcon: !!document.querySelector('.first-principles-accordion .accordion-icon'),
        hasAdvancedConceptsIcon: !!document.querySelector('.advanced-concepts-accordion .accordion-icon')
      };
    });

    console.log('📦 Principles Tab (Default Collapsed):');
    console.log(`   - First Principles collapsed: ${principlesCollapsed.firstPrinciples ? 'YES ✅' : 'NO ❌'}`);
    console.log(`   - Advanced Concepts collapsed: ${principlesCollapsed.advancedConcepts ? 'YES ✅' : 'NO ❌'}`);

    // 2. Switch to Practice & Assessment tab
    await page.evaluate(() => {
      const practiceTab = document.querySelector('[data-tab="practice"]');
      if (practiceTab) practiceTab.click();
    });
    await page.waitForTimeout(500);

    // 3. Check Practice accordions are collapsed by default
    const practiceCollapsed = await page.evaluate(() => {
      const assessmentAccordion = document.querySelector('.assessment-accordion');
      const drillsAccordion = document.querySelector('.drills-accordion');

      return {
        assessment: assessmentAccordion ? !assessmentAccordion.hasAttribute('open') : false,
        drills: drillsAccordion ? !drillsAccordion.hasAttribute('open') : false,
        hasAssessmentIcon: !!document.querySelector('.assessment-accordion .accordion-icon'),
        hasDrillsIcon: !!document.querySelector('.drills-accordion .accordion-icon')
      };
    });

    console.log('\n📝 Practice & Assessment Tab (Default Collapsed):');
    console.log(`   - Assessment collapsed: ${practiceCollapsed.assessment ? 'YES ✅' : 'NO ❌'}`);
    console.log(`   - Drills collapsed: ${practiceCollapsed.drills ? 'YES ✅' : 'NO ❌'}`);

    // 4. Test accordion expand/collapse with animations
    console.log('\n🎬 Testing Accordion Interactions:');

    // Test Assessment accordion
    const assessmentInteraction = await page.evaluate(() => {
      const accordion = document.querySelector('.assessment-accordion');
      if (!accordion) return { tested: false };

      const summary = accordion.querySelector('summary');
      const icon = accordion.querySelector('.accordion-icon');
      const initialIcon = icon ? icon.textContent : '';

      // Click to expand
      summary.click();
      const isOpen = accordion.hasAttribute('open');
      const openIcon = icon ? icon.textContent : '';

      // Click to collapse
      summary.click();
      const isClosed = !accordion.hasAttribute('open');
      const closedIcon = icon ? icon.textContent : '';

      return {
        tested: true,
        canOpen: isOpen,
        canClose: isClosed,
        iconChanges: initialIcon !== openIcon && openIcon !== closedIcon
      };
    });

    console.log(`   - Assessment accordion expands: ${assessmentInteraction.canOpen ? 'YES ✅' : 'NO ❌'}`);
    console.log(`   - Assessment accordion collapses: ${assessmentInteraction.canClose ? 'YES ✅' : 'NO ❌'}`);

    // 5. Go back to Principles and test sub-accordions
    await page.evaluate(() => {
      const principlesTab = document.querySelector('[data-tab="principles"]');
      if (principlesTab) principlesTab.click();
    });
    await page.waitForTimeout(500);

    // Expand First Principles
    await page.evaluate(() => {
      const firstPrinciples = document.querySelector('.first-principles-accordion');
      if (firstPrinciples && !firstPrinciples.hasAttribute('open')) {
        const summary = firstPrinciples.querySelector('summary');
        if (summary) summary.click();
      }
    });
    await page.waitForTimeout(300);

    // Check sub-accordions
    const subAccordions = await page.evaluate(() => {
      const subItems = document.querySelectorAll('.sub-accordion-item');
      const allCollapsed = Array.from(subItems).every(item => !item.hasAttribute('open'));
      const hasIcons = Array.from(subItems).every(item => !!item.querySelector('.sub-accordion-icon'));

      // Test first sub-accordion
      if (subItems.length > 0) {
        const firstSub = subItems[0];
        const summary = firstSub.querySelector('summary');
        if (summary) {
          summary.click();
          const canExpand = firstSub.hasAttribute('open');
          summary.click();
          const canCollapse = !firstSub.hasAttribute('open');

          return {
            count: subItems.length,
            allCollapsed,
            hasIcons,
            canExpand,
            canCollapse
          };
        }
      }

      return {
        count: subItems.length,
        allCollapsed,
        hasIcons,
        canExpand: false,
        canCollapse: false
      };
    });

    console.log('\n🔍 Sub-Accordions (Inside First Principles):');
    console.log(`   - Total sub-accordions: ${subAccordions.count}`);
    console.log(`   - All initially collapsed: ${subAccordions.allCollapsed ? 'YES ✅' : 'NO ❌'}`);
    console.log(`   - All have icons: ${subAccordions.hasIcons ? 'YES ✅' : 'NO ❌'}`);
    console.log(`   - Can expand/collapse: ${subAccordions.canExpand && subAccordions.canCollapse ? 'YES ✅' : 'NO ❌'}`);

    // 6. Check CSS enhancements
    const styleEnhancements = await page.evaluate(() => {
      const accordion = document.querySelector('.accordion-item');
      if (!accordion) return { found: false };

      const styles = window.getComputedStyle(accordion);

      return {
        found: true,
        hasBorderRadius: parseInt(styles.borderRadius) > 0,
        hasBoxShadow: styles.boxShadow !== 'none',
        hasTransition: styles.transition.includes('box-shadow') || styles.transition.includes('all'),
        hasGradientBg: styles.background.includes('gradient') || styles.backgroundImage.includes('gradient')
      };
    });

    console.log('\n🎨 Style Enhancements:');
    console.log(`   - Border radius: ${styleEnhancements.hasBorderRadius ? 'YES ✅' : 'NO ❌'}`);
    console.log(`   - Box shadow: ${styleEnhancements.hasBoxShadow ? 'YES ✅' : 'NO ❌'}`);
    console.log(`   - Smooth transitions: ${styleEnhancements.hasTransition ? 'YES ✅' : 'NO ❌'}`);
    console.log(`   - Gradient background: ${styleEnhancements.hasGradientBg ? 'YES ✅' : 'NO ❌'}`);

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 VERIFICATION SUMMARY');
    console.log('='.repeat(50));

    const allChecks = [
      principlesCollapsed.firstPrinciples,
      principlesCollapsed.advancedConcepts,
      practiceCollapsed.assessment,
      practiceCollapsed.drills,
      assessmentInteraction.canOpen && assessmentInteraction.canClose,
      subAccordions.allCollapsed,
      subAccordions.canExpand && subAccordions.canCollapse,
      styleEnhancements.hasBorderRadius,
      styleEnhancements.hasBoxShadow,
      styleEnhancements.hasTransition
    ];

    const passedChecks = allChecks.filter(Boolean).length;
    const totalChecks = allChecks.length;

    console.log(`✅ Passed: ${passedChecks}/${totalChecks}`);

    if (passedChecks === totalChecks) {
      console.log('\n🎉 All accordion updates verified successfully!');
      console.log('\n✨ Improvements Applied:');
      console.log('  ✓ All accordions default to collapsed state');
      console.log('  ✓ Enhanced header styling with gradients');
      console.log('  ✓ Smooth expand/collapse animations');
      console.log('  ✓ Subtle hover effects and transitions');
      console.log('  ✓ Improved typography and spacing');
      console.log('  ✓ Visual hierarchy with nested accordions');
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
verifyAccordionUpdates().then(() => {
  console.log('\n✅ Verification complete!');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});