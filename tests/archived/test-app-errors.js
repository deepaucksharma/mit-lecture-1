#!/usr/bin/env node

/**
 * Test to capture JavaScript errors and console output
 */

const puppeteer = require('puppeteer');

async function captureErrors() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const errors = [];
  const consoleMessages = [];

  // Capture console messages
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push({
      type: msg.type(),
      text: text
    });

    if (msg.type() === 'error') {
      console.log(`❌ Console Error: ${text}`);
    }
  });

  // Capture page errors
  page.on('pageerror', error => {
    console.log(`❌ Page Error: ${error.message}`);
    errors.push({
      type: 'pageerror',
      message: error.message,
      stack: error.stack
    });
  });

  // Capture request failures
  page.on('requestfailed', request => {
    console.log(`❌ Request Failed: ${request.url()} - ${request.failure().errorText}`);
    errors.push({
      type: 'request',
      url: request.url(),
      error: request.failure().errorText
    });
  });

  try {
    console.log('🔍 Loading application and capturing errors...\n');

    await page.goto('http://localhost:8000', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Wait a bit to let any async errors surface
    await page.waitForTimeout(5000);

    // Check app state
    const appState = await page.evaluate(() => {
      return {
        loadingVisible: document.getElementById('loading')?.style.display !== 'none',
        appVisible: document.querySelector('.app')?.style.display !== 'none',
        hasViewer: !!window.viewer,
        viewerState: window.viewer ? {
          hasManifest: !!window.viewer.manifest,
          currentDiagramId: window.viewer.currentDiagramId,
          hasRenderer: !!window.viewer.renderer,
          hasStateManager: !!window.viewer.stateManager
        } : null,
        bodyText: document.body.innerText.substring(0, 200)
      };
    });

    console.log('\n📊 App State:');
    console.log(JSON.stringify(appState, null, 2));

    console.log(`\n📝 Total console messages: ${consoleMessages.length}`);
    console.log(`❌ Total errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n🚨 Errors Found:');
      errors.forEach((err, i) => {
        console.log(`\n${i + 1}. [${err.type}]`);
        console.log(`   ${err.message || err.error}`);
        if (err.stack) {
          console.log(`   Stack: ${err.stack.substring(0, 200)}`);
        }
      });
    }

  } catch (error) {
    console.error('Test failed:', error.message);
  }

  await browser.close();
}

captureErrors().catch(console.error);