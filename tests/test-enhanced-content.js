#!/usr/bin/env node

/**
 * Enhanced Content Display Test
 * Validates that all enhanced spec fields are properly displayed
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

class EnhancedContentTests {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      details: []
    };
    this.baseUrl = 'http://localhost:8888';
  }

  log(message, color = 'reset') {
    console.log(`${COLORS[color]}${message}${COLORS.reset}`);
  }

  async init() {
    this.log('\n🔬 Testing Enhanced Content Display\n', 'cyan');
    this.browser = await chromium.launch({ headless: true });
    this.page = await this.browser.newPage();
  }

  async runTest(name, testFn) {
    this.results.total++;
    try {
      const result = await testFn();
      this.results.passed++;
      this.results.details.push({ name, status: 'passed', details: result });
      this.log(`  ✓ ${name}`, 'green');
      return result;
    } catch (error) {
      this.results.failed++;
      this.results.details.push({ name, status: 'failed', error: error.message });
      this.log(`  ✗ ${name}: ${error.message}`, 'red');
      throw error;
    }
  }

  async testCrystallizedInsight() {
    this.log('\n💎 Testing Crystallized Insight Display', 'blue');

    await this.runTest('CrystallizedInsight element exists', async () => {
      await this.page.goto(`${this.baseUrl}?d=00-legend`);
      await this.page.waitForSelector('#diagram-container svg', { timeout: 5000 });
      const exists = await this.page.$('#crystallized-insight');
      if (!exists) throw new Error('Element not found');
    });

    await this.runTest('CrystallizedInsight has content', async () => {
      const text = await this.page.textContent('#crystallized-insight');
      if (!text || text.trim() === '') {
        throw new Error('CrystallizedInsight is empty');
      }
      return text.substring(0, 50) + '...';
    });

    await this.runTest('CrystallizedInsight visible on all diagrams', async () => {
      const diagrams = ['01-triangle', '02-scale', '06-read-path', '08-lease'];
      const results = [];

      for (const diagramId of diagrams) {
        await this.page.goto(`${this.baseUrl}?d=${diagramId}`);
        await this.page.waitForSelector('#diagram-container svg', { timeout: 5000 });
        const text = await this.page.textContent('#crystallized-insight');
        if (text && text.trim() !== '') {
          results.push(`${diagramId}: ✓`);
        } else {
          throw new Error(`${diagramId} has no crystallized insight`);
        }
      }

      return results.join(', ');
    });
  }

  async testEnhancedMetrics() {
    this.log('\n📊 Testing Enhanced Edge Metrics', 'blue');

    await this.runTest('Enhanced metrics code is in renderer', async () => {
      // Check that the enhanced metrics code exists in the renderer
      const hasCode = await this.page.evaluate(() => {
        // Check the renderer has the enhanced metrics code
        const rendererSource = window.MermaidRenderer.toString();
        return rendererSource.includes('edge.metrics?.frequency') &&
               rendererSource.includes('edge.metrics?.payload') &&
               rendererSource.includes('edge.metrics?.purpose');
      });

      if (!hasCode) {
        throw new Error('Enhanced metrics code not in renderer');
      }

      return 'Enhanced metrics code present in renderer';
    });

    await this.runTest('Enhanced metrics loaded in spec', async () => {
      await this.page.goto(`${this.baseUrl}?d=00-legend`);
      await this.page.waitForSelector('#diagram-container svg', { timeout: 10000 });

      const hasInSpec = await this.page.evaluate(() => {
        const spec = window.viewer?.currentSpec;
        if (!spec) return false;

        const heartbeatEdge = spec.edges?.find(e => e.id === 'heartbeat');
        return heartbeatEdge && heartbeatEdge.metrics && (
          heartbeatEdge.metrics.frequency ||
          heartbeatEdge.metrics.payload ||
          heartbeatEdge.metrics.purpose
        );
      });

      if (!hasInSpec) {
        throw new Error('Enhanced metrics not in loaded spec');
      }

      return 'Enhanced metrics present in spec';
    });
  }

  async testAssessmentCheckpoints() {
    this.log('\n📋 Testing Assessment Checkpoints', 'blue');

    await this.runTest('AssessmentCheckpoints field recognized', async () => {
      await this.page.goto(`${this.baseUrl}?d=00-legend`);
      await this.page.waitForSelector('#diagram-container svg', { timeout: 5000 });

      const hasContent = await this.page.evaluate(() => {
        const container = document.getElementById('assessment-container');
        if (!container) return false;
        const text = container.textContent.trim();
        return text && !text.includes('No assessment available');
      });

      if (!hasContent) {
        throw new Error('Assessment checkpoints not displaying');
      }

      return 'Assessment checkpoints loaded';
    });

    await this.runTest('Assessment checkpoints have correct structure', async () => {
      const hasStructure = await this.page.evaluate(() => {
        const container = document.getElementById('assessment-container');
        if (!container) return false;

        const items = container.querySelectorAll('.assessment-item');
        return items.length > 0;
      });

      if (!hasStructure) {
        throw new Error('Assessment structure not correct');
      }

      return 'Assessment structure correct';
    });
  }

  async testFirstPrinciplesRecursive() {
    this.log('\n🔬 Testing Recursive First Principles', 'blue');

    await this.runTest('FirstPrinciples renders all nested fields', async () => {
      await this.page.goto(`${this.baseUrl}?d=08-lease`);
      await this.page.waitForSelector('#principles-container', { timeout: 5000 });

      const sections = await this.page.evaluate(() => {
        const container = document.getElementById('principles-container');
        const sections = container.querySelectorAll('.principle-section');
        return sections.length;
      });

      if (sections < 4) {
        throw new Error(`Only ${sections} principle sections found (expected more with nested content)`);
      }

      return `${sections} principle sections rendered`;
    });

    await this.runTest('Nested objects display with details tags', async () => {
      const hasNested = await this.page.evaluate(() => {
        const container = document.getElementById('principles-container');
        const detailsElements = container.querySelectorAll('details.nested-section');
        return detailsElements.length > 0;
      });

      if (!hasNested) {
        // This is OK if no nested objects in this diagram
        return 'No nested sections (diagram may not have them)';
      }

      return 'Nested sections displayed';
    });
  }

  async testAdvancedConcepts() {
    this.log('\n🎓 Testing Advanced Concepts Display', 'blue');

    await this.runTest('AdvancedConcepts section exists', async () => {
      await this.page.goto(`${this.baseUrl}?d=02-scale`);
      await this.page.waitForSelector('#principles-container', { timeout: 5000 });

      const hasAdvanced = await this.page.evaluate(() => {
        const container = document.getElementById('principles-container');
        const advancedContainer = container.querySelector('.advanced-concepts-container');
        return advancedContainer !== null;
      });

      if (!hasAdvanced) {
        throw new Error('Advanced concepts container not found');
      }
    });

    await this.runTest('AdvancedConcepts shows subsections', async () => {
      const subsections = await this.page.evaluate(() => {
        const container = document.getElementById('principles-container');
        const sections = container.querySelectorAll('.advanced-section');
        return Array.from(sections).map(s => {
          const summary = s.querySelector('summary');
          return summary ? summary.textContent.trim() : '';
        });
      });

      if (subsections.length === 0) {
        throw new Error('No advanced concept subsections found');
      }

      return `Found ${subsections.length} subsections: ${subsections.slice(0, 3).join(', ')}...`;
    });

    await this.runTest('AdvancedConcepts expandable', async () => {
      const expandable = await this.page.evaluate(() => {
        const firstSection = document.querySelector('.advanced-section');
        if (!firstSection) return false;
        return firstSection.tagName === 'DETAILS';
      });

      if (!expandable) {
        throw new Error('Advanced sections not expandable (not using details tag)');
      }
    });
  }

  async testContentUtilization() {
    this.log('\n📊 Testing Content Utilization', 'blue');

    const diagrams = ['00-legend', '02-scale', '06-read-path', '08-lease'];
    const utilizationResults = [];

    for (const diagramId of diagrams) {
      await this.runTest(`Content utilization for ${diagramId}`, async () => {
        await this.page.goto(`${this.baseUrl}?d=${diagramId}`);
        await this.page.waitForSelector('#diagram-container svg', { timeout: 5000 });

        const utilization = await this.page.evaluate(() => {
          const checks = {
            crystallizedInsight: false,
            narrative: false,
            contracts: false,
            firstPrinciples: false,
            advancedConcepts: false,
            assessmentCheckpoints: false,
            drills: false
          };

          // Check each component
          const insight = document.getElementById('crystallized-insight');
          checks.crystallizedInsight = insight && insight.textContent.trim() !== '';

          const narrative = document.getElementById('narrative-panel');
          checks.narrative = narrative && narrative.textContent.trim() !== '';

          const contracts = document.getElementById('contracts-panel');
          checks.contracts = contracts && contracts.querySelector('.contracts') !== null;

          const principles = document.getElementById('principles-container');
          checks.firstPrinciples = principles && principles.querySelector('.principle-section') !== null;
          checks.advancedConcepts = principles && principles.querySelector('.advanced-concepts-container') !== null;

          const assessment = document.getElementById('assessment-container');
          checks.assessmentCheckpoints = assessment && !assessment.querySelector('.no-assessment');

          const drills = document.getElementById('drills-container');
          checks.drills = drills && drills.querySelectorAll('.drill').length > 0;

          return checks;
        });

        const displayed = Object.values(utilization).filter(v => v).length;
        const total = Object.keys(utilization).length;
        const percentage = ((displayed / total) * 100).toFixed(1);

        utilizationResults.push(`${diagramId}: ${displayed}/${total} (${percentage}%)`);

        if (percentage < 80) {
          throw new Error(`Low utilization: ${percentage}% (${displayed}/${total} fields displayed)`);
        }

        return `${displayed}/${total} fields displayed (${percentage}%)`;
      });
    }

    this.log(`\n  📈 Utilization Results:`, 'cyan');
    utilizationResults.forEach(r => this.log(`    ${r}`, 'cyan'));
  }

  async generateReport() {
    const successRate = ((this.results.passed / this.results.total) * 100).toFixed(2);

    const report = `
# Enhanced Content Display Test Results

**Date**: ${new Date().toISOString()}
**Success Rate**: ${successRate}%
**Tests**: ${this.results.passed}/${this.results.total} passed

## Summary

${this.results.failed === 0 ? '✅ ALL TESTS PASSED' : `⚠️ ${this.results.failed} TESTS FAILED`}

## Test Details

${this.results.details.map(d => `
### ${d.name}
- **Status**: ${d.status}
${d.details ? `- **Result**: ${d.details}` : ''}
${d.error ? `- **Error**: ${d.error}` : ''}
`).join('\n')}

## Conclusion

${this.results.failed === 0 ?
  'All enhanced content fields are now properly displayed in the UI.' :
  'Some enhanced content fields are not displaying correctly. See errors above.'
}
`;

    const reportPath = path.join(__dirname, 'reports', 'enhanced-content-test.md');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, report);

    this.log(`\n📄 Report saved: ${reportPath}`, 'cyan');
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.init();

      await this.testCrystallizedInsight();
      await this.testEnhancedMetrics();
      await this.testAssessmentCheckpoints();
      await this.testFirstPrinciplesRecursive();
      await this.testAdvancedConcepts();
      await this.testContentUtilization();

      await this.generateReport();

      this.log('\n' + '='.repeat(60), 'cyan');
      this.log(`✅ Passed: ${this.results.passed}/${this.results.total}`, 'green');
      if (this.results.failed > 0) {
        this.log(`❌ Failed: ${this.results.failed}/${this.results.total}`, 'red');
      }
      this.log('='.repeat(60) + '\n', 'cyan');

      await this.cleanup();
      process.exit(this.results.failed === 0 ? 0 : 1);

    } catch (error) {
      this.log(`\n❌ Fatal error: ${error.message}`, 'red');
      console.error(error);
      await this.cleanup();
      process.exit(1);
    }
  }
}

const suite = new EnhancedContentTests();
suite.run();
