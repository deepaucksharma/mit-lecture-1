#!/usr/bin/env node

/**
 * Master Test Runner
 * Orchestrates all test suites with proper categorization
 *
 * Test Categories:
 * 1. Static Validation - No browser required
 * 2. Quick Smoke Tests - Fast sanity checks
 * 3. Error Detection - JavaScript and console errors
 * 4. Integration Tests - Feature interactions
 * 5. Comprehensive E2E - Full user journeys
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

class TestRunner {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      suites: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      }
    };
  }

  async runTest(name, filePath, category) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 Running: ${name}`);
    console.log(`📁 Category: ${category}`);
    console.log(`${'='.repeat(60)}\n`);

    const startTime = Date.now();

    return new Promise((resolve) => {
      const testProcess = spawn('node', [filePath], {
        stdio: 'inherit',
        cwd: path.dirname(filePath)
      });

      testProcess.on('close', (code) => {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        const passed = code === 0;

        const result = {
          name,
          category,
          filePath,
          passed,
          exitCode: code,
          duration: `${duration}s`
        };

        this.results.suites.push(result);
        this.results.summary.total++;
        if (passed) {
          this.results.summary.passed++;
          console.log(`\n✅ ${name} PASSED (${duration}s)`);
        } else {
          this.results.summary.failed++;
          console.log(`\n❌ ${name} FAILED with exit code ${code} (${duration}s)`);
        }

        resolve(result);
      });

      testProcess.on('error', (err) => {
        console.error(`\n❌ Failed to run ${name}:`, err);
        const result = {
          name,
          category,
          filePath,
          passed: false,
          error: err.message,
          duration: '0s'
        };
        this.results.suites.push(result);
        this.results.summary.failed++;
        resolve(result);
      });
    });
  }

  async checkFileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async runTestSuite(suite) {
    console.log(`\n${'#'.repeat(60)}`);
    console.log(`📦 Test Suite: ${suite.name}`);
    console.log(`${'#'.repeat(60)}`);

    for (const test of suite.tests) {
      const filePath = path.join(__dirname, test.file);

      if (await this.checkFileExists(filePath)) {
        await this.runTest(test.name, filePath, suite.name);
      } else {
        console.log(`\n⚠️  Skipping ${test.name} - File not found: ${test.file}`);
        this.results.suites.push({
          name: test.name,
          category: suite.name,
          filePath: test.file,
          passed: false,
          skipped: true,
          reason: 'File not found'
        });
        this.results.summary.skipped++;
      }
    }
  }

  async generateReport() {
    const reportPath = path.join(__dirname, 'reports', 'master-test-report.json');
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));

    // Generate markdown report
    const mdReport = this.generateMarkdownReport();
    const mdPath = path.join(__dirname, 'reports', 'master-test-report.md');
    await fs.writeFile(mdPath, mdReport);

    console.log(`\n📄 Reports saved:`);
    console.log(`   - JSON: ${reportPath}`);
    console.log(`   - Markdown: ${mdPath}`);
  }

  generateMarkdownReport() {
    const { summary, suites, timestamp } = this.results;

    let md = `# Master Test Report\n\n`;
    md += `**Generated:** ${new Date(timestamp).toLocaleString()}\n\n`;

    md += `## Summary\n\n`;
    md += `- **Total Tests:** ${summary.total}\n`;
    md += `- **Passed:** ${summary.passed} ✅\n`;
    md += `- **Failed:** ${summary.failed} ❌\n`;
    md += `- **Skipped:** ${summary.skipped} ⚠️\n`;
    md += `- **Pass Rate:** ${((summary.passed / (summary.total - summary.skipped)) * 100).toFixed(1)}%\n\n`;

    md += `## Test Results by Category\n\n`;

    // Group by category
    const byCategory = {};
    suites.forEach(suite => {
      if (!byCategory[suite.category]) {
        byCategory[suite.category] = [];
      }
      byCategory[suite.category].push(suite);
    });

    for (const [category, tests] of Object.entries(byCategory)) {
      md += `### ${category}\n\n`;
      md += `| Test | Status | Duration | Notes |\n`;
      md += `|------|--------|----------|-------|\n`;

      tests.forEach(test => {
        const status = test.skipped ? '⚠️ Skipped' : (test.passed ? '✅ Passed' : '❌ Failed');
        const notes = test.skipped ? test.reason : (test.error || '-');
        md += `| ${test.name} | ${status} | ${test.duration} | ${notes} |\n`;
      });
      md += `\n`;
    }

    return md;
  }

  printSummary() {
    const { summary } = this.results;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 FINAL TEST SUMMARY`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Total Tests:    ${summary.total}`);
    console.log(`Passed:         ${summary.passed} ✅`);
    console.log(`Failed:         ${summary.failed} ❌`);
    console.log(`Skipped:        ${summary.skipped} ⚠️`);

    const passRate = ((summary.passed / (summary.total - summary.skipped)) * 100).toFixed(1);
    console.log(`Pass Rate:      ${passRate}%`);

    if (summary.failed > 0) {
      console.log(`\n❌ Failed Tests:`);
      this.results.suites
        .filter(s => !s.passed && !s.skipped)
        .forEach(s => console.log(`   - ${s.name} (${s.category})`));
    }

    if (summary.skipped > 0) {
      console.log(`\n⚠️  Skipped Tests:`);
      this.results.suites
        .filter(s => s.skipped)
        .forEach(s => console.log(`   - ${s.name}: ${s.reason}`));
    }

    console.log(`${'='.repeat(60)}\n`);
  }

  async run(options = {}) {
    const testSuites = [
      {
        name: 'Static Validation',
        tests: [
          { name: 'Enhancement Verification', file: 'verify-enhancements.js' }
        ]
      },
      {
        name: 'Quick Smoke Tests',
        tests: [
          { name: 'Navigation Smoke Test', file: 'test-quick-smoke.js' }
        ]
      },
      {
        name: 'Error Detection',
        tests: [
          { name: 'Error Detection Suite', file: 'test-errors.js' }
        ]
      },
      {
        name: 'Diagram Validation',
        tests: [
          { name: 'Diagram Validation', file: 'test-diagram-validation.js' }
        ]
      },
      {
        name: 'Integration Tests',
        tests: [
          { name: 'Enhanced Features', file: 'test-enhanced-features.js' },
          { name: 'In-Depth Visual', file: 'test-in-depth-visual.js' }
        ]
      },
      {
        name: 'Comprehensive E2E',
        tests: [
          { name: 'Full Test Suite', file: 'test-suite.js' }
        ]
      }
    ];

    console.log(`🚀 Starting Master Test Runner`);
    console.log(`📅 ${new Date().toLocaleString()}\n`);

    // Filter suites if specific category requested
    let suitesToRun = testSuites;
    if (options.category) {
      suitesToRun = testSuites.filter(s =>
        s.name.toLowerCase().includes(options.category.toLowerCase())
      );
      if (suitesToRun.length === 0) {
        console.error(`❌ No test suite found for category: ${options.category}`);
        console.log(`Available categories: ${testSuites.map(s => s.name).join(', ')}`);
        process.exit(1);
      }
    }

    // Run only specific test if requested
    if (options.test) {
      for (const suite of suitesToRun) {
        suite.tests = suite.tests.filter(t =>
          t.name.toLowerCase().includes(options.test.toLowerCase())
        );
      }
      suitesToRun = suitesToRun.filter(s => s.tests.length > 0);

      if (suitesToRun.length === 0) {
        console.error(`❌ No test found matching: ${options.test}`);
        process.exit(1);
      }
    }

    // Run test suites
    for (const suite of suitesToRun) {
      await this.runTestSuite(suite);
    }

    // Generate reports
    await this.generateReport();

    // Print summary
    this.printSummary();

    return this.results.summary.failed === 0 ? 0 : 1;
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--category':
      case '-c':
        options.category = args[++i];
        break;
      case '--test':
      case '-t':
        options.test = args[++i];
        break;
      case '--help':
      case '-h':
        console.log(`
Master Test Runner

Usage: node run-all-tests.js [options]

Options:
  -c, --category <name>  Run only tests in specific category
  -t, --test <name>      Run only tests matching name
  -h, --help            Show this help message

Categories:
  - static-validation   : File and code validation (no browser)
  - quick-smoke        : Fast smoke tests
  - error-detection    : JavaScript error detection
  - diagram-validation : Mermaid diagram validation
  - integration        : Feature integration tests
  - comprehensive-e2e  : Full end-to-end tests

Examples:
  node run-all-tests.js                      # Run all tests
  node run-all-tests.js -c smoke            # Run smoke tests only
  node run-all-tests.js -t navigation       # Run navigation tests
  node run-all-tests.js -c integration -t visual  # Run visual integration tests
        `);
        process.exit(0);
        break;
      default:
        if (args[i].startsWith('-')) {
          console.error(`Unknown option: ${args[i]}`);
          console.log('Use --help for usage information');
          process.exit(1);
        }
    }
  }

  return options;
}

// Main execution
if (require.main === module) {
  const options = parseArgs();
  const runner = new TestRunner();

  runner.run(options)
    .then(exitCode => {
      console.log(exitCode === 0 ? '✅ All tests completed!' : '❌ Some tests failed');
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('❌ Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = TestRunner;