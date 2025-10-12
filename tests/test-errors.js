/**
 * Consolidated Error Detection Test Suite
 * Combines error detection from test-js-errors.js and test-app-errors.js
 *
 * Purpose:
 * - Detect JavaScript errors and console warnings
 * - Validate component initialization
 * - Check render functions
 * - Monitor network failures
 */

const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:8000';
const DIAGRAM_IDS = [
  '00-legend',
  '01-triangle',
  '02-scale',
  '03-chunk-size',
  '04-architecture',
  '05-planes',
  '06-read-path',
  '07-write-path',
  '08-lease',
  '09-consistency',
  '10-recovery',
  '11-evolution',
  '12-dna'
];

class ErrorTestSuite {
  constructor() {
    this.browser = null;
    this.page = null;
    this.errors = [];
    this.warnings = [];
    this.networkFailures = [];
    this.consoleMessages = [];
  }

  async initialize() {
    console.log('🚀 Initializing Error Test Suite...\n');

    this.browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1920, height: 1080 });

    // Set up error monitoring
    this.setupErrorMonitoring();

    return this;
  }

  setupErrorMonitoring() {
    // Monitor console messages
    this.page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();

      this.consoleMessages.push({ type, text });

      if (type === 'error') {
        this.errors.push({
          type: 'console',
          message: text,
          url: this.page.url()
        });
        console.log(`  ❌ ERROR: ${text}`);
      } else if (type === 'warning' && !text.includes('Third-party cookie') && !text.includes('Unrecognized feature')) {
        this.warnings.push({
          type: 'console',
          message: text,
          url: this.page.url()
        });
        console.log(`  ⚠️  WARNING: ${text}`);
      }
    });

    // Monitor page errors
    this.page.on('pageerror', error => {
      this.errors.push({
        type: 'page',
        message: error.message,
        stack: error.stack,
        url: this.page.url()
      });
      console.log(`  ❌ PAGE ERROR: ${error.message}`);
    });

    // Monitor network failures
    this.page.on('requestfailed', request => {
      const failure = {
        url: request.url(),
        error: request.failure()?.errorText || 'Unknown error',
        method: request.method()
      };
      this.networkFailures.push(failure);
      console.log(`  ❌ NETWORK FAILURE: ${failure.method} ${failure.url} - ${failure.error}`);
    });
  }

  async testIntroPage() {
    console.log('📱 Testing intro page...');

    await this.page.goto(`${BASE_URL}/intro.html`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    await this.page.waitForTimeout(1000);

    // Check for specific intro page elements
    const hasIntroContent = await this.page.evaluate(() => {
      return document.querySelector('body') !== null;
    });

    if (!hasIntroContent) {
      this.errors.push({
        type: 'validation',
        message: 'Intro page failed to load content',
        url: this.page.url()
      });
    }

    console.log('  ✅ Intro page tested\n');
  }

  async testMainApplication() {
    console.log('📱 Testing main application...');

    await this.page.goto(`${BASE_URL}/index.html`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Wait for application to initialize
    await this.page.waitForTimeout(2000);

    // Check component initialization
    const componentStatus = await this.page.evaluate(() => {
      return {
        hasViewer: typeof window.viewer !== 'undefined',
        hasMermaid: typeof window.mermaid !== 'undefined',
        hasStateManager: typeof window.StateManager !== 'undefined',
        viewerInitialized: window.viewer && typeof window.viewer.initialize === 'function',
        hasDiagramContainer: document.getElementById('diagram-container') !== null,
        hasPrinciplesContainer: document.getElementById('principles-content') !== null,
        hasAssessmentContainer: document.getElementById('assessment-content') !== null,
        hasDrillsContainer: document.getElementById('drills-content') !== null,
        hasStateControls: document.getElementById('state-controls') !== null
      };
    });

    console.log('\n📋 Component Status:');
    for (const [key, value] of Object.entries(componentStatus)) {
      const status = value ? '✅' : '❌';
      console.log(`  ${key}: ${status}`);
      if (!value) {
        this.errors.push({
          type: 'component',
          message: `Component check failed: ${key}`,
          url: this.page.url()
        });
      }
    }

    // Check render functions
    const renderFunctions = await this.page.evaluate(() => {
      if (!window.viewer) return {};

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
    for (const [key, value] of Object.entries(renderFunctions)) {
      const status = value ? '✅' : '❌';
      console.log(`  ${key}: ${status}`);
      if (!value) {
        this.errors.push({
          type: 'function',
          message: `Render function missing: ${key}`,
          url: this.page.url()
        });
      }
    }

    console.log('\n');
  }

  async testDiagramNavigation() {
    console.log('📊 Testing diagram navigation...');

    for (let i = 0; i < Math.min(DIAGRAM_IDS.length, 7); i++) {
      const diagramId = DIAGRAM_IDS[i];
      console.log(`  Testing ${diagramId}...`);

      const errorCountBefore = this.errors.length;

      await this.page.goto(`${BASE_URL}/index.html?d=${diagramId}`, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      await this.page.waitForTimeout(1500);

      // Check if diagram loaded
      const diagramLoaded = await this.page.evaluate(() => {
        const container = document.getElementById('diagram-container');
        return container && container.querySelector('svg') !== null;
      });

      if (!diagramLoaded) {
        this.errors.push({
          type: 'diagram',
          message: `Failed to load diagram: ${diagramId}`,
          url: this.page.url()
        });
      }

      const newErrors = this.errors.length - errorCountBefore;
      if (newErrors > 0) {
        console.log(`    ❌ ${newErrors} errors detected`);
      }
    }

    console.log('');
  }

  async testTabSwitching() {
    console.log('🔄 Testing tab switching...');

    // Navigate to a diagram first
    await this.page.goto(`${BASE_URL}/index.html?d=00-legend`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    await this.page.waitForTimeout(1500);

    const tabs = ['practice-tab', 'principles-tab'];

    for (const tabId of tabs) {
      const tabExists = await this.page.$(`#${tabId}`);
      if (tabExists) {
        await this.page.click(`#${tabId}`);
        await this.page.waitForTimeout(500);
        console.log(`  ✅ Tested ${tabId}`);
      } else {
        console.log(`  ⚠️  Tab ${tabId} not found`);
      }
    }

    console.log('');
  }

  async testCommonIssues() {
    console.log('🔍 Checking for common issues...\n');

    // Check for common error patterns
    const commonPatterns = [
      { pattern: /Cannot read prop/i, description: 'Null reference errors' },
      { pattern: /is not a function/i, description: 'Missing function errors' },
      { pattern: /Failed to fetch/i, description: 'Network errors' },
      { pattern: /Syntax error/i, description: 'JavaScript syntax errors' },
      { pattern: /ReferenceError/i, description: 'Undefined variable errors' }
    ];

    const detectedPatterns = new Set();

    for (const error of this.errors) {
      for (const { pattern, description } of commonPatterns) {
        if (pattern.test(error.message)) {
          detectedPatterns.add(description);
        }
      }
    }

    if (detectedPatterns.size > 0) {
      console.log('⚠️  Common issues detected:');
      for (const issue of detectedPatterns) {
        console.log(`  - ${issue}`);
      }
    } else {
      console.log('✅ No common issues detected');
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 ERROR TEST SUMMARY');
    console.log('='.repeat(50));

    const summary = {
      totalErrors: this.errors.length,
      totalWarnings: this.warnings.length,
      networkFailures: this.networkFailures.length,
      consoleErrors: this.errors.filter(e => e.type === 'console').length,
      pageErrors: this.errors.filter(e => e.type === 'page').length,
      componentErrors: this.errors.filter(e => e.type === 'component').length,
      functionErrors: this.errors.filter(e => e.type === 'function').length,
      diagramErrors: this.errors.filter(e => e.type === 'diagram').length,
      validationErrors: this.errors.filter(e => e.type === 'validation').length
    };

    console.log(`❌ JavaScript Errors: ${summary.totalErrors}`);
    console.log(`⚠️  Warnings: ${summary.totalWarnings}`);
    console.log(`📡 Network Failures: ${summary.networkFailures}`);

    if (summary.totalErrors > 0) {
      console.log('\nError Breakdown:');
      console.log(`  Console Errors: ${summary.consoleErrors}`);
      console.log(`  Page Errors: ${summary.pageErrors}`);
      console.log(`  Component Errors: ${summary.componentErrors}`);
      console.log(`  Function Errors: ${summary.functionErrors}`);
      console.log(`  Diagram Errors: ${summary.diagramErrors}`);
      console.log(`  Validation Errors: ${summary.validationErrors}`);

      console.log('\n🔴 Error Details:');
      this.errors.slice(0, 10).forEach((error, i) => {
        console.log(`  ${i + 1}. [${error.type}] ${error.message}`);
        if (error.url) {
          console.log(`     URL: ${error.url}`);
        }
      });

      if (this.errors.length > 10) {
        console.log(`  ... and ${this.errors.length - 10} more errors`);
      }
    }

    const testPassed = summary.totalErrors === 0;

    console.log('\n' + (testPassed ? '✅ All error tests passed!' : '❌ Error tests failed'));

    return { summary, errors: this.errors, warnings: this.warnings, passed: testPassed };
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.initialize();
      await this.testIntroPage();
      await this.testMainApplication();
      await this.testDiagramNavigation();
      await this.testTabSwitching();
      await this.testCommonIssues();

      const report = this.generateReport();

      // Save report to file
      const fs = require('fs').promises;
      await fs.writeFile(
        'tests/reports/error-test-report.json',
        JSON.stringify(report, null, 2)
      );

      console.log('\n📄 Report saved to tests/reports/error-test-report.json');

      return report.passed ? 0 : 1;

    } catch (error) {
      console.error('❌ Test execution failed:', error);
      return 1;
    } finally {
      await this.cleanup();
      console.log('\n✅ Testing complete!');
    }
  }
}

// Run tests if executed directly
if (require.main === module) {
  const tester = new ErrorTestSuite();
  tester.run().then(exitCode => {
    process.exit(exitCode);
  });
}

module.exports = ErrorTestSuite;