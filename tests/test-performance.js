/**
 * Performance Test Suite
 * Tests loading times, rendering performance, and resource usage
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;

const BASE_URL = 'http://localhost:8000';
const DIAGRAM_IDS = [
  '00-legend',
  '01-triangle',
  '02-scale',
  '03-chunk-size',
  '04-architecture',
  '05-planes',
  '06-read-path'
];

class PerformanceTestSuite {
  constructor() {
    this.browser = null;
    this.page = null;
    this.metrics = {
      pageLoad: [],
      diagramRender: [],
      navigation: [],
      memory: [],
      cpu: []
    };
    this.thresholds = {
      pageLoad: 3000,        // 3 seconds
      diagramRender: 2000,   // 2 seconds
      navigation: 500,       // 500ms
      memoryUsage: 100,      // 100MB
      cpuUsage: 50           // 50%
    };
  }

  async initialize() {
    console.log('🚀 Initializing Performance Test Suite...\n');

    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--enable-precise-memory-info'
      ]
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1920, height: 1080 });

    // Enable performance monitoring
    await this.page.evaluateOnNewDocument(() => {
      window.performanceMarks = {};
      window.markPerformance = (name) => {
        window.performanceMarks[name] = performance.now();
      };
    });

    return this;
  }

  async measurePageLoad(url, name) {
    console.log(`📊 Measuring page load: ${name}`);

    const startTime = Date.now();

    await this.page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    const loadTime = Date.now() - startTime;

    // Get performance metrics
    const performanceMetrics = await this.page.evaluate(() => {
      const timing = performance.timing;
      const navigation = performance.getEntriesByType('navigation')[0];

      return {
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        loadComplete: timing.loadEventEnd - timing.navigationStart,
        firstPaint: navigation?.loadEventEnd || 0,
        resources: performance.getEntriesByType('resource').length
      };
    });

    // Get memory usage
    const memoryUsage = await this.page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSHeapSize: (performance.memory.usedJSHeapSize / 1048576).toFixed(2),
          totalJSHeapSize: (performance.memory.totalJSHeapSize / 1048576).toFixed(2)
        };
      }
      return null;
    });

    const result = {
      name,
      loadTime,
      ...performanceMetrics,
      memory: memoryUsage,
      passed: loadTime < this.thresholds.pageLoad
    };

    this.metrics.pageLoad.push(result);

    console.log(`  ⏱️  Load time: ${loadTime}ms ${result.passed ? '✅' : '❌'}`);
    if (memoryUsage) {
      console.log(`  💾 Memory: ${memoryUsage.usedJSHeapSize}MB / ${memoryUsage.totalJSHeapSize}MB`);
    }

    return result;
  }

  async measureDiagramRendering() {
    console.log('\n📈 Measuring diagram rendering performance...\n');

    for (const diagramId of DIAGRAM_IDS) {
      console.log(`  Testing ${diagramId}...`);

      // Inject performance marking
      await this.page.evaluateOnNewDocument(() => {
        window.diagramRenderStart = 0;
        window.diagramRenderEnd = 0;
      });

      const startTime = Date.now();

      await this.page.goto(`${BASE_URL}/index.html?d=${diagramId}`, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Wait for diagram to render
      await this.page.waitForSelector('#diagram-container svg', { timeout: 10000 });

      const renderTime = Date.now() - startTime;

      // Get diagram complexity metrics
      const diagramMetrics = await this.page.evaluate(() => {
        const svg = document.querySelector('#diagram-container svg');
        if (!svg) return null;

        const nodes = svg.querySelectorAll('.node').length;
        const edges = svg.querySelectorAll('.edge').length;
        const paths = svg.querySelectorAll('path').length;
        const texts = svg.querySelectorAll('text').length;

        return {
          nodes,
          edges,
          paths,
          texts,
          totalElements: nodes + edges + paths + texts
        };
      });

      const result = {
        diagramId,
        renderTime,
        ...diagramMetrics,
        passed: renderTime < this.thresholds.diagramRender
      };

      this.metrics.diagramRender.push(result);

      console.log(`    ⏱️  Render: ${renderTime}ms ${result.passed ? '✅' : '❌'}`);
      if (diagramMetrics) {
        console.log(`    📊 Elements: ${diagramMetrics.totalElements} (${diagramMetrics.nodes} nodes, ${diagramMetrics.edges} edges)`);
      }
    }
  }

  async measureNavigation() {
    console.log('\n🔄 Measuring navigation performance...\n');

    // Load initial diagram
    await this.page.goto(`${BASE_URL}/index.html?d=00-legend`, {
      waitUntil: 'networkidle0'
    });

    // Test state navigation
    console.log('  Testing state navigation...');
    const stateNavTimes = [];

    for (let i = 0; i < 5; i++) {
      const startTime = Date.now();

      await this.page.evaluate(() => {
        if (window.viewer && window.viewer.stateManager) {
          window.viewer.stateManager.next();
        }
      });

      await this.page.waitForTimeout(100);
      const navTime = Date.now() - startTime;
      stateNavTimes.push(navTime);
    }

    const avgStateNav = stateNavTimes.reduce((a, b) => a + b, 0) / stateNavTimes.length;

    // Test diagram navigation
    console.log('  Testing diagram navigation...');
    const diagramNavTimes = [];

    for (let i = 1; i <= 3; i++) {
      const startTime = Date.now();

      await this.page.goto(`${BASE_URL}/index.html?d=${DIAGRAM_IDS[i]}`, {
        waitUntil: 'networkidle0'
      });

      const navTime = Date.now() - startTime;
      diagramNavTimes.push(navTime);
    }

    const avgDiagramNav = diagramNavTimes.reduce((a, b) => a + b, 0) / diagramNavTimes.length;

    this.metrics.navigation = {
      stateNavigation: {
        average: avgStateNav,
        samples: stateNavTimes,
        passed: avgStateNav < this.thresholds.navigation
      },
      diagramNavigation: {
        average: avgDiagramNav,
        samples: diagramNavTimes,
        passed: avgDiagramNav < this.thresholds.pageLoad
      }
    };

    console.log(`    ⏱️  Avg state nav: ${avgStateNav.toFixed(0)}ms ${avgStateNav < this.thresholds.navigation ? '✅' : '❌'}`);
    console.log(`    ⏱️  Avg diagram nav: ${avgDiagramNav.toFixed(0)}ms ${avgDiagramNav < this.thresholds.pageLoad ? '✅' : '❌'}`);
  }

  async measureResourceUsage() {
    console.log('\n💻 Measuring resource usage...\n');

    await this.page.goto(`${BASE_URL}/index.html`, {
      waitUntil: 'networkidle0'
    });

    // Collect metrics over time
    const samples = [];

    for (let i = 0; i < 5; i++) {
      // Navigate through diagrams
      await this.page.goto(`${BASE_URL}/index.html?d=${DIAGRAM_IDS[i % DIAGRAM_IDS.length]}`, {
        waitUntil: 'networkidle0'
      });

      const metrics = await this.page.metrics();
      const memory = await this.page.evaluate(() => {
        if (performance.memory) {
          return {
            used: (performance.memory.usedJSHeapSize / 1048576).toFixed(2),
            total: (performance.memory.totalJSHeapSize / 1048576).toFixed(2)
          };
        }
        return null;
      });

      samples.push({
        timestamp: Date.now(),
        jsHeapSize: (metrics.JSHeapUsedSize / 1048576).toFixed(2),
        documents: metrics.Documents,
        frames: metrics.Frames,
        listeners: metrics.JSEventListeners,
        nodes: metrics.Nodes,
        memory
      });

      await this.page.waitForTimeout(1000);
    }

    this.metrics.memory = samples;

    // Calculate averages
    const avgMemory = samples.reduce((sum, s) => sum + parseFloat(s.jsHeapSize), 0) / samples.length;
    const memoryPassed = avgMemory < this.thresholds.memoryUsage;

    console.log(`  💾 Avg JS Heap: ${avgMemory.toFixed(2)}MB ${memoryPassed ? '✅' : '❌'}`);
    console.log(`  📊 Event Listeners: ${samples[samples.length - 1].listeners}`);
    console.log(`  🌳 DOM Nodes: ${samples[samples.length - 1].nodes}`);

    // Check for memory leaks
    const memoryGrowth = parseFloat(samples[samples.length - 1].jsHeapSize) - parseFloat(samples[0].jsHeapSize);
    if (memoryGrowth > 10) {
      console.log(`  ⚠️  Potential memory leak detected: +${memoryGrowth.toFixed(2)}MB`);
    }
  }

  async testLazyLoading() {
    console.log('\n🔄 Testing lazy loading...\n');

    await this.page.goto(`${BASE_URL}/index.html`, {
      waitUntil: 'domcontentloaded' // Don't wait for all resources
    });

    // Check which resources are loaded initially
    const initialResources = await this.page.evaluate(() => {
      return performance.getEntriesByType('resource').map(r => ({
        name: r.name.split('/').pop(),
        size: (r.encodedBodySize / 1024).toFixed(2),
        duration: r.duration.toFixed(0)
      }));
    });

    console.log(`  📦 Initial resources: ${initialResources.length}`);

    // Navigate to trigger more loads
    await this.page.goto(`${BASE_URL}/index.html?d=01-triangle`, {
      waitUntil: 'networkidle0'
    });

    const afterNavResources = await this.page.evaluate(() => {
      return performance.getEntriesByType('resource').length;
    });

    console.log(`  📦 After navigation: ${afterNavResources} resources`);

    const lazyLoaded = afterNavResources - initialResources.length;
    console.log(`  🔄 Lazy loaded: ${lazyLoaded} resources`);
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 PERFORMANCE TEST SUMMARY');
    console.log('='.repeat(60));

    // Page Load Summary
    console.log('\n📄 Page Load Performance:');
    const avgPageLoad = this.metrics.pageLoad.reduce((sum, m) => sum + m.loadTime, 0) / this.metrics.pageLoad.length;
    console.log(`  Average: ${avgPageLoad.toFixed(0)}ms`);
    console.log(`  Threshold: ${this.thresholds.pageLoad}ms`);
    console.log(`  Status: ${avgPageLoad < this.thresholds.pageLoad ? '✅ PASS' : '❌ FAIL'}`);

    // Diagram Rendering Summary
    console.log('\n🎨 Diagram Rendering:');
    const avgRender = this.metrics.diagramRender.reduce((sum, m) => sum + m.renderTime, 0) / this.metrics.diagramRender.length;
    console.log(`  Average: ${avgRender.toFixed(0)}ms`);
    console.log(`  Threshold: ${this.thresholds.diagramRender}ms`);
    console.log(`  Status: ${avgRender < this.thresholds.diagramRender ? '✅ PASS' : '❌ FAIL'}`);

    // Navigation Summary
    console.log('\n🔄 Navigation Performance:');
    console.log(`  State Nav: ${this.metrics.navigation.stateNavigation.average.toFixed(0)}ms ${this.metrics.navigation.stateNavigation.passed ? '✅' : '❌'}`);
    console.log(`  Diagram Nav: ${this.metrics.navigation.diagramNavigation.average.toFixed(0)}ms ${this.metrics.navigation.diagramNavigation.passed ? '✅' : '❌'}`);

    // Memory Summary
    console.log('\n💾 Memory Usage:');
    const avgMemory = this.metrics.memory.reduce((sum, s) => sum + parseFloat(s.jsHeapSize), 0) / this.metrics.memory.length;
    console.log(`  Average JS Heap: ${avgMemory.toFixed(2)}MB`);
    console.log(`  Threshold: ${this.thresholds.memoryUsage}MB`);
    console.log(`  Status: ${avgMemory < this.thresholds.memoryUsage ? '✅ PASS' : '❌ FAIL'}`);

    // Overall Status
    const allPassed =
      avgPageLoad < this.thresholds.pageLoad &&
      avgRender < this.thresholds.diagramRender &&
      this.metrics.navigation.stateNavigation.passed &&
      this.metrics.navigation.diagramNavigation.passed &&
      avgMemory < this.thresholds.memoryUsage;

    console.log('\n' + '='.repeat(60));
    console.log(allPassed ? '✅ All performance tests PASSED!' : '❌ Some performance tests FAILED');
    console.log('='.repeat(60));

    return {
      summary: {
        pageLoad: avgPageLoad,
        diagramRender: avgRender,
        stateNavigation: this.metrics.navigation.stateNavigation.average,
        diagramNavigation: this.metrics.navigation.diagramNavigation.average,
        memoryUsage: avgMemory,
        passed: allPassed
      },
      details: this.metrics
    };
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.initialize();

      // Test page load performance
      await this.measurePageLoad(`${BASE_URL}/intro.html`, 'Intro Page');
      await this.measurePageLoad(`${BASE_URL}/index.html`, 'Main Application');

      // Test diagram rendering
      await this.measureDiagramRendering();

      // Test navigation performance
      await this.measureNavigation();

      // Test resource usage
      await this.measureResourceUsage();

      // Test lazy loading
      await this.testLazyLoading();

      // Generate report
      const report = this.generateReport();

      // Save report
      await fs.mkdir('tests/reports', { recursive: true });
      await fs.writeFile(
        'tests/reports/performance-report.json',
        JSON.stringify(report, null, 2)
      );

      console.log('\n📄 Report saved to tests/reports/performance-report.json');

      return report.summary.passed ? 0 : 1;

    } catch (error) {
      console.error('❌ Performance test failed:', error);
      return 1;
    } finally {
      await this.cleanup();
      console.log('\n✅ Performance testing complete!');
    }
  }
}

// Run tests if executed directly
if (require.main === module) {
  const tester = new PerformanceTestSuite();
  tester.run().then(exitCode => {
    process.exit(exitCode);
  });
}

module.exports = PerformanceTestSuite;