/**
 * Quick Performance Test - Lightweight version
 */
const puppeteer = require('puppeteer');

async function quickTest() {
  console.log('🚀 Running Quick Performance Test...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-precise-memory-info']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const results = {
    pageLoad: [],
    diagramRender: [],
    memory: [],
    passed: 0,
    failed: 0
  };

  // Test 1: Page load
  console.log('📊 Testing page load performance...');
  const urls = [
    { url: 'http://localhost:8000/docs/intro.html', name: 'Intro Page' },
    { url: 'http://localhost:8000/docs/index.html', name: 'Main App' }
  ];

  for (const { url, name } of urls) {
    const start = Date.now();
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    const loadTime = Date.now() - start;

    const memory = await page.evaluate(() => {
      return performance.memory ?
        (performance.memory.usedJSHeapSize / 1048576).toFixed(2) : 'N/A';
    });

    results.pageLoad.push({ name, loadTime, memory });
    const passed = loadTime < 3000;
    results[passed ? 'passed' : 'failed']++;

    console.log(`  ${name}: ${loadTime}ms (${memory}MB) ${passed ? '✅' : '❌'}`);
  }

  // Test 2: Diagram rendering (test 3 diagrams for speed)
  console.log('\n📈 Testing diagram rendering...');
  const diagrams = ['00-legend', '01-triangle', '02-scale'];

  for (const id of diagrams) {
    const start = Date.now();
    await page.goto(`http://localhost:8000/docs/index.html?d=${id}`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Wait for SVG with timeout
    try {
      await page.waitForSelector('#diagram-container svg', { timeout: 5000 });
    } catch (e) {
      // Continue even if timeout
    }

    await page.waitForTimeout(500); // Small buffer

    const renderTime = Date.now() - start;

    const svgInfo = await page.evaluate(() => {
      const svg = document.querySelector('#diagram-container svg');
      return {
        exists: !!svg,
        elements: svg ? svg.querySelectorAll('*').length : 0
      };
    });

    results.diagramRender.push({ id, renderTime, svgInfo });
    const passed = renderTime < 2000;
    results[passed ? 'passed' : 'failed']++;

    console.log(`  ${id}: ${renderTime}ms (${svgInfo.elements} SVG elements) ${passed ? '✅' : '❌'}`);
  }

  // Test 3: Memory usage
  console.log('\n💾 Testing memory usage...');
  const samples = [];

  for (let i = 0; i < 3; i++) {
    await page.goto(`http://localhost:8000/docs/index.html?d=${diagrams[i % diagrams.length]}`, {
      waitUntil: 'networkidle0'
    });

    await page.waitForTimeout(500);

    const metrics = await page.metrics();
    const memory = (metrics.JSHeapUsedSize / 1048576).toFixed(2);
    samples.push({ memory: parseFloat(memory), nodes: metrics.Nodes });
  }

  const avgMemory = samples.reduce((sum, s) => sum + s.memory, 0) / samples.length;
  const memoryPassed = avgMemory < 100;
  results[memoryPassed ? 'passed' : 'failed']++;
  results.memory = { average: avgMemory, samples };

  console.log(`  Average: ${avgMemory.toFixed(2)}MB ${memoryPassed ? '✅' : '❌'}`);
  console.log(`  Nodes: ${samples[samples.length - 1].nodes}`);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));

  const avgPageLoad = results.pageLoad.reduce((sum, r) => sum + r.loadTime, 0) / results.pageLoad.length;
  const avgRender = results.diagramRender.reduce((sum, r) => sum + r.renderTime, 0) / results.diagramRender.length;

  console.log(`\n📄 Page Load: ${avgPageLoad.toFixed(0)}ms avg (threshold: 3000ms)`);
  console.log(`🎨 Diagram Render: ${avgRender.toFixed(0)}ms avg (threshold: 2000ms)`);
  console.log(`💾 Memory Usage: ${avgMemory.toFixed(2)}MB avg (threshold: 100MB)`);
  console.log(`\n✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);

  // Bottlenecks
  console.log('\n⚠️  BOTTLENECKS IDENTIFIED:');
  if (avgRender > 2000) {
    console.log(`  - Diagram rendering is slow: ${avgRender.toFixed(0)}ms (${(avgRender/2000*100).toFixed(0)}% over threshold)`);
  }
  if (avgPageLoad > 3000) {
    console.log(`  - Page load is slow: ${avgPageLoad.toFixed(0)}ms`);
  }
  if (results.diagramRender.some(d => !d.svgInfo.exists)) {
    console.log(`  - Some diagrams failed to render SVG`);
  }

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  if (avgRender > 2000) {
    console.log('  1. Optimize Mermaid diagram complexity');
    console.log('  2. Consider lazy rendering or progressive loading');
    console.log('  3. Cache rendered diagrams');
  }
  if (avgPageLoad > 1500) {
    console.log('  4. Minify and bundle JavaScript files');
    console.log('  5. Enable compression (gzip/brotli)');
    console.log('  6. Consider CDN for external libraries');
  }

  await browser.close();

  const allPassed = results.failed === 0;
  console.log('\n' + '='.repeat(60));
  console.log(allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
  console.log('='.repeat(60));

  return allPassed ? 0 : 1;
}

quickTest().then(code => process.exit(code)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
