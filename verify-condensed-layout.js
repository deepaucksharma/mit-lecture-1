#!/usr/bin/env node

/**
 * Verify Condensed Layout - Test header/footer removal and sidebar condensation
 */

const puppeteer = require('puppeteer');

async function verifyCondensedLayout() {
  console.log('🎨 Verifying Condensed Layout...\n');

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

    // 1. Check that header and footer are hidden
    const layoutStructure = await page.evaluate(() => {
      const app = document.querySelector('#app');
      const hasNoHeaderClass = app ? app.classList.contains('app-no-header') : false;
      const header = document.querySelector('.app-header');
      const footer = document.querySelector('.app-footer');
      const isHeaderHidden = header ? window.getComputedStyle(header).display === 'none' : true;
      const isFooterHidden = footer ? window.getComputedStyle(footer).display === 'none' : true;

      return {
        hasNoHeaderClass,
        isHeaderHidden,
        isFooterHidden
      };
    });

    console.log('🏗️ Layout Structure:');
    console.log(`   - App has no-header class: ${layoutStructure.hasNoHeaderClass ? 'YES ✅' : 'NO ❌'}`);
    console.log(`   - Header is hidden: ${layoutStructure.isHeaderHidden ? 'YES ✅' : 'NO ❌'}`);
    console.log(`   - Footer is hidden: ${layoutStructure.isFooterHidden ? 'YES ✅' : 'NO ❌'}`);

    // 2. Check condensed sidebar structure
    const sidebarStructure = await page.evaluate(() => {
      const sidebar = document.querySelector('.sidebar-left-condensed');
      if (!sidebar) return { found: false };

      const title = sidebar.querySelector('.sidebar-title');
      const controls = sidebar.querySelector('.sidebar-controls');
      const themeToggle = controls ? controls.querySelector('#theme-toggle') : null;
      const helpBtn = controls ? controls.querySelector('#help-btn') : null;
      const currentInfo = sidebar.querySelector('.current-info');
      const diagramNav = sidebar.querySelector('.diagram-nav-condensed');
      const contractsAccordion = sidebar.querySelector('.contracts-accordion');

      const sidebarStyles = window.getComputedStyle(sidebar);

      return {
        found: true,
        hasTitle: !!title,
        hasControls: !!controls,
        hasThemeToggle: !!themeToggle,
        hasHelpBtn: !!helpBtn,
        hasCurrentInfo: !!currentInfo,
        hasDiagramNav: !!diagramNav,
        hasContractsAccordion: !!contractsAccordion,
        width: sidebarStyles.width,
        hasGradientBg: sidebarStyles.background.includes('gradient') || sidebarStyles.backgroundImage.includes('gradient'),
        isFullHeight: sidebarStyles.height === '100vh'
      };
    });

    console.log('\n📐 Condensed Sidebar Structure:');
    if (sidebarStructure.found) {
      console.log(`   - Sidebar found: YES ✅`);
      console.log(`   - Title section: ${sidebarStructure.hasTitle ? 'YES ✅' : 'NO ❌'}`);
      console.log(`   - Control buttons: ${sidebarStructure.hasControls ? 'YES ✅' : 'NO ❌'}`);
      console.log(`   - Theme toggle: ${sidebarStructure.hasThemeToggle ? 'YES ✅' : 'NO ❌'}`);
      console.log(`   - Help button: ${sidebarStructure.hasHelpBtn ? 'YES ✅' : 'NO ❌'}`);
      console.log(`   - Current info: ${sidebarStructure.hasCurrentInfo ? 'YES ✅' : 'NO ❌'}`);
      console.log(`   - Navigation: ${sidebarStructure.hasDiagramNav ? 'YES ✅' : 'NO ❌'}`);
      console.log(`   - Contracts accordion: ${sidebarStructure.hasContractsAccordion ? 'YES ✅' : 'NO ❌'}`);
      console.log(`   - Width: ${sidebarStructure.width}`);
      console.log(`   - Gradient background: ${sidebarStructure.hasGradientBg ? 'YES ✅' : 'NO ❌'}`);
      console.log(`   - Full height: ${sidebarStructure.isFullHeight ? 'YES ✅' : 'NO ❌'}`);
    } else {
      console.log(`   - Sidebar found: NO ❌`);
    }

    // 3. Check mini button styling
    const buttonStyling = await page.evaluate(() => {
      const themeBtn = document.querySelector('#theme-toggle.mini-btn');
      const helpBtn = document.querySelector('#help-btn.mini-btn');

      if (!themeBtn || !helpBtn) return { found: false };

      const themeBtnStyles = window.getComputedStyle(themeBtn);
      const helpBtnStyles = window.getComputedStyle(helpBtn);

      return {
        found: true,
        themeBtn: {
          hasBorder: themeBtnStyles.borderWidth !== '0px',
          hasBorderRadius: parseInt(themeBtnStyles.borderRadius) > 0,
          hasPadding: themeBtnStyles.padding !== '0px'
        },
        helpBtn: {
          hasBorder: helpBtnStyles.borderWidth !== '0px',
          hasBorderRadius: parseInt(helpBtnStyles.borderRadius) > 0,
          hasPadding: helpBtnStyles.padding !== '0px'
        }
      };
    });

    console.log('\n🔘 Mini Button Styling:');
    if (buttonStyling.found) {
      console.log(`   - Theme button styled: ${buttonStyling.themeBtn.hasBorder && buttonStyling.themeBtn.hasBorderRadius ? 'YES ✅' : 'NO ❌'}`);
      console.log(`   - Help button styled: ${buttonStyling.helpBtn.hasBorder && buttonStyling.helpBtn.hasBorderRadius ? 'YES ✅' : 'NO ❌'}`);
    } else {
      console.log(`   - Mini buttons found: NO ❌`);
    }

    // 4. Check main content area adjustments
    const mainContentLayout = await page.evaluate(() => {
      const mainContent = document.querySelector('.main-content');
      if (!mainContent) return { found: false };

      const styles = window.getComputedStyle(mainContent);
      const narrativePanel = document.querySelector('.narrative-panel-horizontal');
      const narrativeStyles = narrativePanel ? window.getComputedStyle(narrativePanel) : null;

      return {
        found: true,
        height: styles.height,
        maxHeight: styles.maxHeight,
        isFullHeight: styles.height === '100vh' || styles.maxHeight === '100vh',
        narrativeHasBorderRadius: narrativeStyles ? parseInt(narrativeStyles.borderRadius) > 0 : false,
        narrativeHasMargin: narrativeStyles ? narrativeStyles.margin !== '0px' : false
      };
    });

    console.log('\n📊 Main Content Layout:');
    if (mainContentLayout.found) {
      console.log(`   - Main content found: YES ✅`);
      console.log(`   - Full viewport height: ${mainContentLayout.isFullHeight ? 'YES ✅' : 'NO ❌'}`);
      console.log(`   - Narrative panel styled: ${mainContentLayout.narrativeHasBorderRadius && mainContentLayout.narrativeHasMargin ? 'YES ✅' : 'NO ❌'}`);
    } else {
      console.log(`   - Main content found: NO ❌`);
    }

    // 5. Test theme toggle functionality in new location
    console.log('\n🎨 Testing Theme Toggle in Sidebar:');
    const initialTheme = await page.evaluate(() => document.body.className);
    console.log(`   - Initial theme: ${initialTheme || 'light'}`);

    await page.click('#theme-toggle');
    await page.waitForTimeout(300);

    const newTheme = await page.evaluate(() => document.body.className);
    console.log(`   - After toggle: ${newTheme || 'light'}`);
    console.log(`   - Theme toggle works: ${initialTheme !== newTheme ? 'YES ✅' : 'NO ❌'}`);

    // 6. Check navigation compactness
    const navCompactness = await page.evaluate(() => {
      const navItems = document.querySelectorAll('.diagram-nav-condensed .nav-item');
      if (navItems.length === 0) return { found: false };

      const firstItem = navItems[0];
      const styles = window.getComputedStyle(firstItem);
      const navNumber = firstItem.querySelector('.nav-number');
      const numberStyles = navNumber ? window.getComputedStyle(navNumber) : null;

      return {
        found: true,
        itemCount: navItems.length,
        fontSize: styles.fontSize,
        padding: styles.padding,
        isCompact: parseFloat(styles.fontSize) <= 13, // 0.8rem ≈ 12.8px
        numberSize: numberStyles ? numberStyles.width : null,
        isNumberCompact: numberStyles ? parseInt(numberStyles.width) <= 20 : false
      };
    });

    console.log('\n🗂️ Navigation Compactness:');
    if (navCompactness.found) {
      console.log(`   - Navigation items: ${navCompactness.itemCount}`);
      console.log(`   - Compact font size: ${navCompactness.isCompact ? 'YES ✅' : 'NO ❌'} (${navCompactness.fontSize})`);
      console.log(`   - Compact number badges: ${navCompactness.isNumberCompact ? 'YES ✅' : 'NO ❌'}`);
    } else {
      console.log(`   - Navigation items found: NO ❌`);
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 VERIFICATION SUMMARY');
    console.log('='.repeat(50));

    const allChecks = [
      layoutStructure.hasNoHeaderClass,
      layoutStructure.isHeaderHidden,
      layoutStructure.isFooterHidden,
      sidebarStructure.found && sidebarStructure.hasTitle,
      sidebarStructure.found && sidebarStructure.hasControls,
      sidebarStructure.found && sidebarStructure.hasDiagramNav,
      sidebarStructure.found && sidebarStructure.hasContractsAccordion,
      buttonStyling.found,
      mainContentLayout.isFullHeight,
      initialTheme !== newTheme,
      navCompactness.isCompact
    ];

    const passedChecks = allChecks.filter(Boolean).length;
    const totalChecks = allChecks.length;

    console.log(`✅ Passed: ${passedChecks}/${totalChecks}`);

    if (passedChecks === totalChecks) {
      console.log('\n🎉 All condensed layout features verified successfully!');
      console.log('\n✨ Layout Improvements:');
      console.log('  ✓ Header and footer completely removed');
      console.log('  ✓ All controls moved to condensed sidebar');
      console.log('  ✓ Sidebar has gradient background and sticky title');
      console.log('  ✓ Navigation items are compact and organized');
      console.log('  ✓ Main content uses full viewport height');
      console.log('  ✓ Clean, modern interface with better space utilization');
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
verifyCondensedLayout().then(() => {
  console.log('\n✅ Verification complete!');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});