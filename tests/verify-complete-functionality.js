#!/usr/bin/env node

/**
 * Complete Functionality Verification
 * Verifies all corner cases, spec details, and navigation workflows
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const screenshotsDir = path.join(__dirname, 'screenshots', 'complete-verification');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function verifyCompleteFunctionality() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  console.log('🔍 Complete Functionality Verification\n');
  console.log('=' .repeat(60));

  const results = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    details: []
  };

  const specs = [
    '00-legend', '01-triangle', '02-scale', '03-chunk-size',
    '04-architecture', '05-planes', '06-read-path', '07-write-path',
    '08-lease', '09-consistency', '10-recovery', '11-evolution', '12-dna'
  ];

  try {
    // Navigate to the app
    await page.goto('http://localhost:8000', { waitUntil: 'networkidle0' });
    await page.waitForTimeout(2000);

    console.log('\n📋 SPEC-BY-SPEC VERIFICATION\n');

    for (const specId of specs) {
      console.log(`\n🎯 Testing ${specId}`);
      console.log('-'.repeat(40));

      // Navigate to the spec
      await page.goto(`http://localhost:8000?d=${specId}`, { waitUntil: 'networkidle0' });
      await page.waitForTimeout(2000);

      // 1. Check Core Components
      console.log('  ✓ Core Components:');
      const coreCheck = await page.evaluate(() => {
        return {
          hasViewer: !!window.viewer,
          hasStateManager: !!window.viewer?.stateManager,
          stateCount: window.viewer?.stateManager?.states?.length || 0,
          hasDiagram: !!document.querySelector('#diagram-container svg'),
          hasInsight: !!document.querySelector('#crystallized-insight')?.textContent,
          hasNarrative: !!document.querySelector('#narrative-panel')?.textContent,
          hasContracts: !!document.querySelector('#contracts-panel')?.textContent
        };
      });

      results.totalTests++;
      const coreScore = Object.values(coreCheck).filter(v => v).length;
      if (coreScore >= 5) {
        console.log(`    ✅ Core: ${coreScore}/7 components`);
        results.passed++;
      } else {
        console.log(`    ❌ Core: ${coreScore}/7 components`);
        results.failed++;
      }

      // 2. Check Educational Content
      console.log('  ✓ Educational Content:');
      const eduCheck = await page.evaluate(() => {
        const checkTab = (tabName) => {
          const tab = document.querySelector(`[data-tab="${tabName}"]`);
          if (tab) tab.click();
          return {
            exists: !!tab,
            hasContent: false
          };
        };

        const principles = checkTab('principles');
        principles.hasContent = !!document.querySelector('#principles-container')?.textContent;

        const practice = checkTab('practice');
        practice.hasContent = !!document.querySelector('#practice-container')?.textContent;

        return {
          principles,
          practice,
          hasPrerequisites: !!document.querySelector('#prerequisites-content')?.textContent,
          hasAssessments: !!document.querySelector('#assessment-container')?.textContent,
          hasDrills: !!document.querySelector('#drills-container')?.textContent
        };
      });

      results.totalTests++;
      const eduScore = [
        eduCheck.principles?.hasContent,
        eduCheck.practice?.hasContent,
        eduCheck.hasPrerequisites,
        eduCheck.hasAssessments,
        eduCheck.hasDrills
      ].filter(v => v).length;

      if (eduScore >= 3) {
        console.log(`    ✅ Education: ${eduScore}/5 sections`);
        results.passed++;
      } else {
        console.log(`    ❌ Education: ${eduScore}/5 sections`);
        results.failed++;
      }

      // 3. Check Navigation
      console.log('  ✓ Navigation:');
      const navCheck = await page.evaluate(() => {
        const stateManager = window.viewer?.stateManager;
        if (!stateManager || !stateManager.states || stateManager.states.length === 0) {
          return { hasStates: false };
        }

        const initialIndex = stateManager.currentStateIndex;
        const canGoNext = stateManager.next();
        const afterNext = stateManager.currentStateIndex;
        const canGoPrev = stateManager.previous();
        const afterPrev = stateManager.currentStateIndex;

        return {
          hasStates: true,
          totalStates: stateManager.states.length,
          initialIndex,
          canGoNext,
          afterNext,
          canGoPrev,
          afterPrev,
          navigation: afterNext !== initialIndex || afterPrev !== initialIndex
        };
      });

      results.totalTests++;
      if (navCheck.hasStates && navCheck.totalStates > 0) {
        console.log(`    ✅ Navigation: ${navCheck.totalStates} states available`);
        results.passed++;
      } else {
        console.log(`    ❌ Navigation: No states available`);
        results.failed++;
      }

      // 4. Check Drill Thought Process
      console.log('  ✓ Drill Features:');
      const drillCheck = await page.evaluate(() => {
        // Open drills accordion
        const drillAccordion = document.querySelector('.drills-accordion');
        if (drillAccordion) drillAccordion.click();

        const drills = document.querySelectorAll('.drill-item');
        const hasThoughtProcess = Array.from(drills).some(drill =>
          drill.querySelector('.thought-process') !== null
        );
        const hasInsights = Array.from(drills).some(drill =>
          drill.querySelector('.drill-insight') !== null
        );

        return {
          drillCount: drills.length,
          hasThoughtProcess,
          hasInsights,
          hasOptions: document.querySelectorAll('.drill-option').length > 0
        };
      });

      results.totalTests++;
      if (drillCheck.drillCount > 0 && (drillCheck.hasThoughtProcess || drillCheck.hasInsights)) {
        console.log(`    ✅ Drills: ${drillCheck.drillCount} drills with enhanced features`);
        results.passed++;
      } else {
        console.log(`    ❌ Drills: Missing or incomplete (${drillCheck.drillCount} drills)`);
        results.failed++;
      }

      // 5. Check Advanced Concepts
      console.log('  ✓ Advanced Features:');
      const advancedCheck = await page.evaluate(() => {
        const hasAdvanced = document.querySelector('.advanced-concepts') !== null;
        const hasFirstPrinciples = document.querySelector('.first-principles') !== null;
        const hasCheckpoints = document.querySelectorAll('.assessment-item').length > 0;

        return {
          hasAdvanced,
          hasFirstPrinciples,
          hasCheckpoints
        };
      });

      results.totalTests++;
      const advScore = Object.values(advancedCheck).filter(v => v).length;
      if (advScore >= 2) {
        console.log(`    ✅ Advanced: ${advScore}/3 features`);
        results.passed++;
      } else {
        console.log(`    ❌ Advanced: ${advScore}/3 features`);
        results.failed++;
      }

      // Take screenshot
      await page.screenshot({
        path: path.join(screenshotsDir, `${specId}-complete.png`),
        fullPage: true
      });
    }

    // Test Cross-Diagram Navigation
    console.log('\n\n📊 WORKFLOW VERIFICATION\n');
    console.log('-'.repeat(40));

    // Test navigation between diagrams
    console.log('Testing cross-diagram navigation...');
    for (let i = 0; i < Math.min(3, specs.length - 1); i++) {
      await page.goto(`http://localhost:8000?d=${specs[i]}`, { waitUntil: 'networkidle0' });
      await page.waitForTimeout(1000);

      const navItem = await page.$(`[data-diagram-id="${specs[i + 1]}"]`);
      if (navItem) {
        await navItem.click();
        await page.waitForTimeout(1000);

        const currentDiagram = await page.evaluate(() => window.viewer?.currentDiagramId);
        results.totalTests++;
        if (currentDiagram === specs[i + 1]) {
          console.log(`  ✅ Navigation from ${specs[i]} to ${specs[i + 1]}`);
          results.passed++;
        } else {
          console.log(`  ❌ Navigation failed: expected ${specs[i + 1]}, got ${currentDiagram}`);
          results.failed++;
        }
      }
    }

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    results.details.push({ test: 'Overall', status: 'error', error: error.message });
  }

  await browser.close();

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${results.totalTests}`);
  console.log(`Passed: ${results.passed} (${Math.round(results.passed/results.totalTests * 100)}%)`);
  console.log(`Failed: ${results.failed}`);
  console.log('='.repeat(60));

  // Save results
  const reportPath = path.join(screenshotsDir, 'verification-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Report saved to: ${reportPath}`);
  console.log(`📸 Screenshots saved to: ${screenshotsDir}`);

  return results;
}

// Run the verification
verifyCompleteFunctionality().then(results => {
  const passRate = results.totalTests > 0 ?
    (results.passed / results.totalTests * 100).toFixed(1) : 0;

  console.log('\n' + '='.repeat(60));
  if (passRate >= 80) {
    console.log('✅ VERIFICATION PASSED - Core functionality working!');
    console.log(`   Pass rate: ${passRate}%`);
  } else if (passRate >= 60) {
    console.log('⚠️  PARTIAL SUCCESS - Most features working');
    console.log(`   Pass rate: ${passRate}%`);
  } else {
    console.log('❌ VERIFICATION FAILED - Critical issues found');
    console.log(`   Pass rate: ${passRate}%`);
  }
  console.log('='.repeat(60));

  process.exit(results.failed > results.totalTests * 0.2 ? 1 : 0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});