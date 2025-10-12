const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  console.log('Loading page...');
  await page.goto('http://localhost:8000/docs/index.html?d=00-legend', {
    waitUntil: 'networkidle0',
    timeout: 30000
  });

  console.log('Page loaded. Checking for SVG...');

  // Wait a bit for rendering
  await page.waitForTimeout(3000);

  // Check what's in the diagram container
  const containerHTML = await page.evaluate(() => {
    const container = document.querySelector('#diagram-container');
    return {
      exists: !!container,
      innerHTML: container ? container.innerHTML.substring(0, 500) : null,
      hasChildren: container ? container.children.length : 0
    };
  });

  console.log('Container info:', JSON.stringify(containerHTML, null, 2));

  // Check for SVG specifically
  const svgInfo = await page.evaluate(() => {
    const svg = document.querySelector('#diagram-container svg');
    const allSvgs = document.querySelectorAll('svg');
    return {
      svgInContainer: !!svg,
      totalSvgs: allSvgs.length,
      svgLocations: Array.from(allSvgs).map(s => s.parentElement?.id || s.parentElement?.className)
    };
  });

  console.log('SVG info:', JSON.stringify(svgInfo, null, 2));

  // Check for errors
  const consoleMessages = [];
  page.on('console', msg => consoleMessages.push(msg.text()));

  page.on('pageerror', error => {
    console.log('Page error:', error.message);
  });

  await page.waitForTimeout(2000);

  console.log('\nConsole messages:', consoleMessages.slice(-10));

  await browser.close();
})();
