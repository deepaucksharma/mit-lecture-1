#!/usr/bin/env node

/**
 * Test for JavaScript errors in the application
 */

const puppeteer = require('puppeteer');

async function testJSErrors() {
  console.log('🔍 Testing for JavaScript errors...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Collect console errors
  const errors = [];
  const warnings = [];
  const logs = [];

  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();

    if (type === 'error') {
      errors.push(text);
      console.log('❌ ERROR:', text);
    } else if (type === 'warning') {
      warnings.push(text);
      console.log('⚠️  WARNING:', text);
    } else if (type === 'log' && text.includes('Failed')) {
      logs.push(text);
      console.log('📝 LOG:', text);
    }
  });

  page.on('pageerror', error => {
    errors.push(error.message);
    console.log('❌ PAGE ERROR:', error.message);
  });

  try {
    // Test intro page
    console.log('📱 Testing intro page...');
    await page.goto('http://localhost:8888/intro.html', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    await page.waitForTimeout(2000);

    // Test main application
    console.log('\n📱 Testing main application...');
    await page.goto('http://localhost:8888/index.html', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    await page.waitForTimeout(3000);

    // Test navigation to different diagrams
    console.log('\n📊 Testing diagram navigation...');
    const diagrams = [
      '00-legend',
      '01-triangle',
      '02-scale',
      '03-chunk-size',
      '04-architecture',
      '05-planes',
      '06-read-path'
    ];

    for (const diagram of diagrams) {
      console.log(`  Testing ${diagram}...`);
      await page.goto(`http://localhost:8888/index.html?d=${diagram}`, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });
      await page.waitForTimeout(1000);
    }

    // Test tab switching
    console.log('\n🔄 Testing tab switching...');
    const practiceTabExists = await page.evaluate(() => {
      const tab = document.querySelector('[data-tab="practice"]');
      return !!tab;
    });

    if (practiceTabExists) {
      await page.click('[data-tab="practice"]');
      await page.waitForTimeout(500);
      await page.click('[data-tab="principles"]');
      await page.waitForTimeout(500);
    }

    // Check for undefined variables or missing elements
    console.log('\n🔍 Checking for common issues...');
    const issues = await page.evaluate(() => {
      const checks = {
        hasViewer: typeof window.viewer !== 'undefined',
        hasMermaid: typeof mermaid !== 'undefined',
        hasStateManager: typeof StateManager !== 'undefined',
        viewerInitialized: window.viewer && window.viewer.renderer !== null,
        hasDiagramContainer: !!document.getElementById('diagram-container'),
        hasPrinciplesContainer: !!document.getElementById('principles-container'),
        hasAssessmentContainer: !!document.getElementById('assessment-container'),
        hasDrillsContainer: !!document.getElementById('drills-container'),
        hasStateControls: !!document.getElementById('state-controls')
      };

      return checks;
    });

    console.log('\n📋 Component Status:');
    for (const [key, value] of Object.entries(issues)) {
      console.log(`  ${key}: ${value ? '✅' : '❌'}`);
    }

    // Test specific functions
    console.log('\n🧪 Testing specific functions...');

    // Test if rendering functions exist
    const renderFunctionsExist = await page.evaluate(() => {
      if (!window.viewer) return false;

      return {
        renderNarrative: typeof window.viewer.renderNarrative === 'function',
        renderContracts: typeof window.viewer.renderContracts === 'function',
        renderFirstPrinciples: typeof window.viewer.renderFirstPrinciples === 'function',
        renderPrerequisites: typeof window.viewer.renderPrerequisites === 'function',
        renderAssessments: typeof window.viewer.renderAssessments === 'function',
        renderCrystallizedInsight: typeof window.viewer.renderCrystallizedInsight === 'function'
      };
    });

    console.log('\n📦 Render Functions:');
    if (renderFunctionsExist) {
      for (const [key, value] of Object.entries(renderFunctionsExist)) {
        console.log(`  ${key}: ${value ? '✅' : '❌'}`);
      }
    } else {
      console.log('  ❌ Viewer not initialized');
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 ERROR SUMMARY');
    console.log('='.repeat(50));
    console.log(`❌ JavaScript Errors: ${errors.length}`);
    console.log(`⚠️  Warnings: ${warnings.length}`);
    console.log(`📝 Failed Operations: ${logs.length}`);

    if (errors.length > 0) {
      console.log('\n🔴 Errors found:');
      errors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err}`);
      });
    }

    if (errors.length === 0) {
      console.log('\n✅ No JavaScript errors detected!');
    } else {
      console.log('\n⚠️  Please fix the errors listed above.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Run tests
testJSErrors().then(() => {
  console.log('\n✅ Testing complete!');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});