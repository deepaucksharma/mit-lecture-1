#!/usr/bin/env node

/**
 * Strict Diagram Validation Test
 *
 * This test specifically validates that diagrams render correctly
 * and catches Mermaid parsing errors that were missed before.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  baseUrl: 'http://localhost:8000',
  screenshotDir: path.join(__dirname, 'screenshots/diagram-validation'),
  timeout: 30000,
  headless: 'new'
};

const SPEC_IDS = [
  '00-legend', '01-triangle', '02-scale', '03-chunk-size',
  '04-architecture', '05-planes', '06-read-path', '07-write-path',
  '08-lease', '09-consistency', '10-recovery', '11-evolution', '12-dna'
];

class DiagramValidationTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      diagrams: {}
    };
  }

  async setup() {
    console.log('🔍 Diagram Validation Test Suite\n');
    console.log('=' .repeat(70));

    if (!fs.existsSync(CONFIG.screenshotDir)) {
      fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
    }

    this.browser = await puppeteer.launch({
      headless: CONFIG.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1920, height: 1080 });

    // Capture console errors
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`  ⚠️  Console Error: ${msg.text()}`);
      }
    });

    await this.page.goto(CONFIG.baseUrl, { waitUntil: 'networkidle0', timeout: CONFIG.timeout });
    await this.page.waitForSelector('.app', { timeout: CONFIG.timeout });
    await this.page.waitForTimeout(2000);

    console.log('✅ Test environment ready\n');
  }

  async testAllDiagrams() {
    for (const specId of SPEC_IDS) {
      await this.testDiagram(specId);
    }
  }

  async testDiagram(specId) {
    console.log(`📊 Testing: ${specId}`);

    this.results.total++;
    const result = {
      id: specId,
      passed: false,
      errors: [],
      warnings: [],
      details: {}
    };

    try {
      // Navigate to spec
      await this.page.evaluate((id) => {
        const navItem = document.querySelector(`[data-diagram-id="${id}"]`);
        if (navItem) navItem.click();
      }, specId);

      await this.page.waitForTimeout(2000);

      // Comprehensive diagram validation
      const validation = await this.page.evaluate(() => {
        const container = document.querySelector('.diagram-container');
        const diagramSection = document.querySelector('.diagram-section');

        if (!container) {
          return { error: 'Diagram container not found' };
        }

        // Check for Mermaid errors
        const errorText = container.textContent;
        const hasMermaidError = errorText.includes('Parse error') ||
                               errorText.includes('Syntax error') ||
                               errorText.includes('Failed to render diagram') ||
                               errorText.includes('Expecting \'SOE\'') ||
                               errorText.includes('got \'PS\'');

        // Check for actual SVG content
        const svg = container.querySelector('svg');
        const mermaidDiv = container.querySelector('.mermaid');

        // Get computed styles
        const containerStyle = window.getComputedStyle(container);
        const containerHeight = container.offsetHeight;
        const containerWidth = container.offsetWidth;

        // Detect diagram type from SVG
        const svgRole = svg?.getAttribute('aria-roledescription') || '';
        const isSequenceDiagram = svgRole.includes('sequence');
        const isFlowchart = svgRole.includes('flowchart');
        const isStateDiagram = svgRole.includes('stateDiagram');

        // Count diagram elements based on type
        let nodes = 0;
        let edges = 0;

        if (isSequenceDiagram) {
          // Sequence diagrams: count actors (participants)
          nodes = svg ? svg.querySelectorAll('rect[class*="actor"]').length : 0;
          edges = svg ? svg.querySelectorAll('.messageText, text[class*="messageText"]').length : 0;
        } else if (isFlowchart) {
          // Flowcharts: count nodes and edges
          nodes = svg ? svg.querySelectorAll('.node, [class*="node"], g[class*="Node"]').length : 0;
          edges = svg ? svg.querySelectorAll('.edge, [class*="edge"], path[class*="Edge"]').length : 0;
        } else if (isStateDiagram) {
          // State diagrams: count states and transitions
          nodes = svg ? svg.querySelectorAll('.state, [id*="state-"]').length : 0;
          edges = svg ? svg.querySelectorAll('.transition, path[class*="transition"]').length : 0;
        } else {
          // Generic fallback
          nodes = svg ? svg.querySelectorAll('rect, circle, polygon').length : 0;
          edges = svg ? svg.querySelectorAll('path, line').length : 0;
        }

        const paths = svg ? svg.querySelectorAll('path').length : 0;
        const rects = svg ? svg.querySelectorAll('rect').length : 0;
        const texts = svg ? svg.querySelectorAll('text').length : 0;

        // Check if SVG has actual content
        const svgBBox = svg?.getBBox ? svg.getBBox() : null;
        const svgHasContent = svgBBox ? (svgBBox.width > 10 && svgBBox.height > 10) : false;

        // More lenient "isEmpty" check - consider rects and paths too
        const hasVisualElements = nodes > 0 || rects > 2 || paths > 2 || texts > 2;

        return {
          hasContainer: !!container,
          hasSvg: !!svg,
          hasMermaid: !!mermaidDiv,
          hasMermaidError: hasMermaidError,
          errorText: hasMermaidError ? errorText.substring(0, 200) : null,
          containerHeight,
          containerWidth,
          diagramType: svgRole,
          isSequenceDiagram,
          isFlowchart,
          isStateDiagram,
          svgDimensions: svg ? {
            width: svg.getAttribute('width') || svg.getBoundingClientRect().width,
            height: svg.getAttribute('height') || svg.getBoundingClientRect().height,
            viewBox: svg.getAttribute('viewBox')
          } : null,
          elementCounts: {
            nodes,
            edges,
            paths,
            rects,
            texts
          },
          svgHasContent,
          hasVisualElements,
          isEmpty: !svg || !hasVisualElements,
          containerClasses: container.className,
          innerHTML: container.innerHTML.substring(0, 300)
        };
      });

      result.details = validation;

      // Strict validation criteria
      if (validation.error) {
        result.errors.push(validation.error);
      }

      if (validation.hasMermaidError) {
        result.errors.push(`Mermaid parse error: ${validation.errorText}`);
      }

      if (!validation.hasSvg) {
        result.errors.push('No SVG element found - diagram did not render');
      }

      if (validation.isEmpty) {
        result.errors.push('Diagram is empty (no visual elements found)');
      }

      if (!validation.svgHasContent && !validation.hasVisualElements) {
        result.warnings.push('SVG may not have proper content');
      }

      // Type-specific validation
      if (validation.isSequenceDiagram && validation.elementCounts.texts < 3) {
        result.warnings.push(`Sequence diagram has very few text elements (${validation.elementCounts.texts})`);
      }

      if (validation.isFlowchart && validation.elementCounts.nodes === 0) {
        result.errors.push('Flowchart has no nodes');
      }

      if (validation.containerHeight < 100) {
        result.warnings.push(`Container height suspiciously small: ${validation.containerHeight}px`);
      }

      // Determine pass/fail
      result.passed = result.errors.length === 0;

      if (result.passed) {
        this.results.passed++;
        const typeInfo = validation.isSequenceDiagram ? 'Sequence' :
                        validation.isFlowchart ? 'Flowchart' :
                        validation.isStateDiagram ? 'State' : 'Unknown';
        console.log(`  ✅ PASS - ${typeInfo} | Elements: ${validation.elementCounts.nodes || validation.elementCounts.rects} | Paths: ${validation.elementCounts.paths}`);
      } else {
        this.results.failed++;
        console.log(`  ❌ FAIL - ${validation.diagramType || 'Unknown type'}`);
        result.errors.forEach(err => console.log(`     Error: ${err}`));
      }

      if (result.warnings.length > 0) {
        result.warnings.forEach(warn => console.log(`     ⚠️  Warning: ${warn}`));
      }

      // Capture screenshot regardless
      const screenshotPath = path.join(CONFIG.screenshotDir, `${specId}-validation.png`);
      await this.page.screenshot({ path: screenshotPath });

    } catch (error) {
      result.errors.push(`Test exception: ${error.message}`);
      result.passed = false;
      this.results.failed++;
      console.log(`  ❌ FAIL - ${error.message}`);
    }

    this.results.diagrams[specId] = result;
    console.log('');
  }

  async generateReport() {
    console.log('=' .repeat(70));
    console.log('📊 DIAGRAM VALIDATION RESULTS');
    console.log('=' .repeat(70));

    console.log(`\nTotal Diagrams: ${this.results.total}`);
    console.log(`Passed: ${this.results.passed} ✅`);
    console.log(`Failed: ${this.results.failed} ❌`);
    console.log(`Success Rate: ${Math.round(this.results.passed / this.results.total * 100)}%`);

    if (this.results.failed > 0) {
      console.log(`\n❌ FAILED DIAGRAMS:`);
      Object.entries(this.results.diagrams).forEach(([id, result]) => {
        if (!result.passed) {
          console.log(`\n  ${id}:`);
          result.errors.forEach(err => console.log(`    - ${err}`));
        }
      });
    }

    // Save detailed report
    const reportPath = path.join(CONFIG.screenshotDir, 'validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Detailed report: ${reportPath}`);
    console.log(`📸 Screenshots: ${CONFIG.screenshotDir}`);
    console.log('=' .repeat(70) + '\n');

    return this.results;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.setup();
      await this.testAllDiagrams();
      const results = await this.generateReport();
      await this.cleanup();
      return results;
    } catch (error) {
      console.error('❌ Fatal error:', error);
      await this.cleanup();
      throw error;
    }
  }
}

// Main execution
if (require.main === module) {
  const test = new DiagramValidationTest();

  test.run()
    .then(results => {
      const exitCode = results.failed > 0 ? 1 : 0;
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

module.exports = DiagramValidationTest;