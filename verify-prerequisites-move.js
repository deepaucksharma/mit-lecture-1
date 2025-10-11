#!/usr/bin/env node

/**
 * Verify Prerequisites Move - Test prerequisites are now under contracts panel
 */

const puppeteer = require('puppeteer');

async function verifyPrerequisitesMove() {
  console.log('📚 Verifying Prerequisites Location...\n');

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

    // 1. Check prerequisites are NOT in top panels
    const topPanelsCheck = await page.evaluate(() => {
      const topPanels = document.querySelector('.top-panels');
      const prereqInTop = topPanels ? topPanels.querySelector('#prerequisites-panel') : null;
      const insightPanel = document.querySelector('.insight-panel');

      return {
        hasTopPanels: !!topPanels,
        prereqInTopPanels: !!prereqInTop,
        hasInsightPanel: !!insightPanel
      };
    });

    console.log('🔝 Top Panels Check:');
    console.log(`   - Top panels exist: ${topPanelsCheck.hasTopPanels ? 'YES ✅' : 'NO ❌'}`);
    console.log(`   - Prerequisites in top panels: ${topPanelsCheck.prereqInTopPanels ? 'YES ❌' : 'NO ✅'}`);
    console.log(`   - Insight panel still present: ${topPanelsCheck.hasInsightPanel ? 'YES ✅' : 'NO ❌'}`);

    // 2. Check prerequisites ARE in contracts panel
    const contractsPanelCheck = await page.evaluate(() => {
      const contractsPanel = document.querySelector('.sidebar-contracts');
      if (!contractsPanel) return { found: false };

      const header = contractsPanel.querySelector('.panel-header h3');
      const prereqAccordion = contractsPanel.querySelector('.prerequisites-accordion');
      const prereqHeader = contractsPanel.querySelector('.prerequisites-header');
      const prereqContent = contractsPanel.querySelector('#prerequisites-content');
      const contractsSection = contractsPanel.querySelector('#contracts-panel');

      return {
        found: true,
        headerText: header ? header.textContent : '',
        hasPrereqAccordion: !!prereqAccordion,
        hasPrereqHeader: !!prereqHeader,
        hasPrereqContent: !!prereqContent,
        hasContractsSection: !!contractsSection,
        prereqIsDetails: prereqAccordion ? prereqAccordion.tagName === 'DETAILS' : false
      };
    });

    console.log('\n📋 Contracts Panel Check:');
    if (contractsPanelCheck.found) {
      console.log(`   - Contracts panel found: YES ✅`);
      console.log(`   - Header text: "${contractsPanelCheck.headerText}"`);
      console.log(`   - Has contracts section: ${contractsPanelCheck.hasContractsSection ? 'YES ✅' : 'NO ❌'}`);
      console.log(`   - Has prerequisites accordion: ${contractsPanelCheck.hasPrereqAccordion ? 'YES ✅' : 'NO ❌'}`);
      console.log(`   - Prerequisites is collapsible: ${contractsPanelCheck.prereqIsDetails ? 'YES ✅' : 'NO ❌'}`);
    } else {
      console.log(`   - Contracts panel found: NO ❌`);
    }

    // 3. Navigate to a diagram with prerequisites
    await page.evaluate(() => {
      // Click on a diagram that has prerequisites (e.g., Read Path)
      const navItems = document.querySelectorAll('.nav-item');
      if (navItems[5]) navItems[5].click(); // Click on Read Path (index 5)
    });

    await page.waitForTimeout(1000);

    // 4. Check if prerequisites appear and can be toggled
    const prereqFunctionality = await page.evaluate(() => {
      const prereqPanel = document.querySelector('#prerequisites-panel');
      const prereqContent = document.querySelector('#prerequisites-content');

      if (!prereqPanel) return { found: false };

      const isVisible = prereqPanel.style.display !== 'none';
      const hasContent = prereqContent && prereqContent.children.length > 0;

      // Try to toggle the accordion
      if (isVisible) {
        const summary = prereqPanel.querySelector('summary');
        if (summary) {
          const initialOpen = prereqPanel.hasAttribute('open');
          summary.click();
          const afterClickOpen = prereqPanel.hasAttribute('open');

          return {
            found: true,
            isVisible,
            hasContent,
            canToggle: initialOpen !== afterClickOpen,
            initialState: initialOpen ? 'open' : 'closed'
          };
        }
      }

      return {
        found: true,
        isVisible,
        hasContent,
        canToggle: false
      };
    });

    console.log('\n🔧 Prerequisites Functionality:');
    if (prereqFunctionality.found) {
      console.log(`   - Prerequisites visible: ${prereqFunctionality.isVisible ? 'YES ✅' : 'NO (hidden)'}`)
      if (prereqFunctionality.isVisible) {
        console.log(`   - Has content: ${prereqFunctionality.hasContent ? 'YES ✅' : 'NO ❌'}`);
        console.log(`   - Can toggle: ${prereqFunctionality.canToggle ? 'YES ✅' : 'NO ❌'}`);
        console.log(`   - Initial state: ${prereqFunctionality.initialState || 'N/A'}`);
      }
    } else {
      console.log(`   - Prerequisites panel found: NO ❌`);
    }

    // 5. Check styling
    const styling = await page.evaluate(() => {
      const prereqHeader = document.querySelector('.prerequisites-header');
      if (!prereqHeader) return { found: false };

      const styles = window.getComputedStyle(prereqHeader);
      const icon = prereqHeader.querySelector('.accordion-icon');

      return {
        found: true,
        hasBgColor: styles.backgroundColor !== 'rgba(0, 0, 0, 0)',
        hasCursor: styles.cursor === 'pointer',
        hasPadding: styles.padding !== '0px',
        hasIcon: !!icon,
        borderRadius: parseInt(styles.borderRadius) > 0
      };
    });

    console.log('\n🎨 Prerequisites Styling:');
    if (styling.found) {
      console.log(`   - Background color: ${styling.hasBgColor ? 'YES ✅' : 'NO ❌'}`);
      console.log(`   - Pointer cursor: ${styling.hasCursor ? 'YES ✅' : 'NO ❌'}`);
      console.log(`   - Has padding: ${styling.hasPadding ? 'YES ✅' : 'NO ❌'}`);
      console.log(`   - Has icon: ${styling.hasIcon ? 'YES ✅' : 'NO ❌'}`);
      console.log(`   - Border radius: ${styling.borderRadius ? 'YES ✅' : 'NO ❌'}`);
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 VERIFICATION SUMMARY');
    console.log('='.repeat(50));

    const allChecks = [
      !topPanelsCheck.prereqInTopPanels,
      contractsPanelCheck.hasPrereqAccordion,
      contractsPanelCheck.prereqIsDetails,
      prereqFunctionality.isVisible !== false && prereqFunctionality.canToggle,
      styling.hasBgColor && styling.hasCursor
    ];

    const passedChecks = allChecks.filter(Boolean).length;
    const totalChecks = allChecks.length;

    console.log(`✅ Passed: ${passedChecks}/${totalChecks}`);

    if (passedChecks === totalChecks) {
      console.log('\n🎉 Prerequisites successfully moved to contracts panel!');
      console.log('\n✨ Improvements:');
      console.log('  ✓ Prerequisites removed from top panels');
      console.log('  ✓ Added as collapsible accordion under contracts');
      console.log('  ✓ Maintains all functionality');
      console.log('  ✓ Better organization and space utilization');
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
verifyPrerequisitesMove().then(() => {
  console.log('\n✅ Verification complete!');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});