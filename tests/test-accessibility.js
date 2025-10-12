/**
 * Accessibility Test Suite
 * Tests keyboard navigation, screen reader compatibility, and WCAG compliance
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;

const BASE_URL = 'http://localhost:8000';

class AccessibilityTestSuite {
  constructor() {
    this.browser = null;
    this.page = null;
    this.issues = {
      critical: [],
      serious: [],
      moderate: [],
      minor: []
    };
  }

  async initialize() {
    console.log('🚀 Initializing Accessibility Test Suite...\n');

    this.browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1920, height: 1080 });

    return this;
  }

  async testKeyboardNavigation() {
    console.log('⌨️  Testing keyboard navigation...\n');

    await this.page.goto(`${BASE_URL}/index.html`, {
      waitUntil: 'networkidle0'
    });

    // Test tab navigation
    console.log('  Testing TAB key navigation...');
    const tabbableElements = await this.page.evaluate(() => {
      const selector = 'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
      const elements = document.querySelectorAll(selector);
      return Array.from(elements).map(el => ({
        tag: el.tagName,
        text: el.textContent?.trim() || el.value || '',
        hasTabIndex: el.hasAttribute('tabindex'),
        tabIndex: el.tabIndex,
        visible: el.offsetParent !== null
      }));
    });

    console.log(`    Found ${tabbableElements.length} tabbable elements`);
    const visibleTabbable = tabbableElements.filter(e => e.visible);
    console.log(`    ${visibleTabbable.length} are visible`);

    if (visibleTabbable.length === 0) {
      this.issues.serious.push({
        type: 'keyboard',
        message: 'No tabbable elements found',
        element: 'document'
      });
    }

    // Test keyboard shortcuts
    console.log('  Testing keyboard shortcuts...');
    const shortcuts = [
      { key: 'ArrowRight', description: 'Next state/diagram' },
      { key: 'ArrowLeft', description: 'Previous state/diagram' },
      { key: '1', description: 'Go to first diagram' },
      { key: 'Escape', description: 'Close modal/overlay' }
    ];

    for (const shortcut of shortcuts) {
      await this.page.keyboard.press(shortcut.key);
      await this.page.waitForTimeout(100);
      console.log(`    ${shortcut.key}: ${shortcut.description}`);
    }

    // Test focus visibility
    console.log('  Testing focus indicators...');
    const focusStyles = await this.page.evaluate(() => {
      const styles = [];
      const elements = document.querySelectorAll('a, button, input');

      elements.forEach(el => {
        el.focus();
        const computed = window.getComputedStyle(el);
        const focusStyle = {
          element: el.tagName,
          outline: computed.outline,
          boxShadow: computed.boxShadow,
          border: computed.border
        };
        styles.push(focusStyle);
      });

      return styles;
    });

    const elementsWithoutFocusIndicator = focusStyles.filter(s =>
      s.outline === 'none' && s.boxShadow === 'none'
    );

    if (elementsWithoutFocusIndicator.length > 0) {
      this.issues.serious.push({
        type: 'focus',
        message: `${elementsWithoutFocusIndicator.length} elements lack focus indicators`,
        elements: elementsWithoutFocusIndicator
      });
    }

    console.log(`    ${focusStyles.length - elementsWithoutFocusIndicator.length}/${focusStyles.length} elements have focus indicators\n`);
  }

  async testColorContrast() {
    console.log('🎨 Testing color contrast...\n');

    await this.page.goto(`${BASE_URL}/index.html`, {
      waitUntil: 'networkidle0'
    });

    const contrastIssues = await this.page.evaluate(() => {
      const issues = [];

      // Helper function to get luminance
      function getLuminance(r, g, b) {
        const [rs, gs, bs] = [r, g, b].map(c => {
          c = c / 255;
          return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
      }

      // Helper function to calculate contrast ratio
      function getContrastRatio(rgb1, rgb2) {
        const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
        const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
      }

      // Helper function to parse RGB
      function parseRGB(color) {
        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (match) {
          return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) };
        }
        return null;
      }

      // Check text elements
      const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, a, button');

      textElements.forEach(el => {
        if (!el.textContent?.trim()) return;

        const computed = window.getComputedStyle(el);
        const color = parseRGB(computed.color);
        const bgColor = parseRGB(computed.backgroundColor);

        if (color && bgColor) {
          const ratio = getContrastRatio(color, bgColor);
          const fontSize = parseFloat(computed.fontSize);
          const isBold = computed.fontWeight >= 700;

          // WCAG AA requirements
          const requiredRatio = (fontSize >= 18 || (fontSize >= 14 && isBold)) ? 3 : 4.5;

          if (ratio < requiredRatio) {
            issues.push({
              element: el.tagName,
              text: el.textContent.substring(0, 50),
              ratio: ratio.toFixed(2),
              required: requiredRatio,
              fontSize: fontSize,
              isBold: isBold
            });
          }
        }
      });

      return issues;
    });

    console.log(`  Found ${contrastIssues.length} contrast issues`);

    if (contrastIssues.length > 0) {
      console.log('  Top contrast issues:');
      contrastIssues.slice(0, 5).forEach(issue => {
        console.log(`    ${issue.element}: ${issue.ratio}/${issue.required} - "${issue.text}"`);
      });

      this.issues.serious = this.issues.serious.concat(
        contrastIssues.map(i => ({
          type: 'contrast',
          message: `Insufficient contrast ratio ${i.ratio}/${i.required}`,
          element: i.element,
          text: i.text
        }))
      );
    } else {
      console.log('  ✅ All text meets WCAG AA contrast requirements');
    }

    console.log('');
  }

  async testARIALabels() {
    console.log('🏷️  Testing ARIA labels and roles...\n');

    await this.page.goto(`${BASE_URL}/index.html`, {
      waitUntil: 'networkidle0'
    });

    const ariaIssues = await this.page.evaluate(() => {
      const issues = [];

      // Check buttons without accessible text
      document.querySelectorAll('button').forEach(button => {
        const hasText = button.textContent?.trim();
        const hasAriaLabel = button.getAttribute('aria-label');
        const hasAriaLabelledBy = button.getAttribute('aria-labelledby');

        if (!hasText && !hasAriaLabel && !hasAriaLabelledBy) {
          issues.push({
            type: 'missing-label',
            element: 'button',
            html: button.outerHTML.substring(0, 100)
          });
        }
      });

      // Check images without alt text
      document.querySelectorAll('img').forEach(img => {
        if (!img.hasAttribute('alt')) {
          issues.push({
            type: 'missing-alt',
            element: 'img',
            src: img.src
          });
        }
      });

      // Check form inputs without labels
      document.querySelectorAll('input, select, textarea').forEach(input => {
        const id = input.id;
        const hasLabel = id && document.querySelector(`label[for="${id}"]`);
        const hasAriaLabel = input.getAttribute('aria-label');
        const hasPlaceholder = input.getAttribute('placeholder');

        if (!hasLabel && !hasAriaLabel && !hasPlaceholder) {
          issues.push({
            type: 'missing-label',
            element: input.tagName,
            name: input.name || input.id
          });
        }
      });

      // Check landmarks
      const landmarks = {
        main: document.querySelector('main, [role="main"]'),
        nav: document.querySelector('nav, [role="navigation"]'),
        header: document.querySelector('header, [role="banner"]'),
        footer: document.querySelector('footer, [role="contentinfo"]')
      };

      Object.entries(landmarks).forEach(([name, element]) => {
        if (!element) {
          issues.push({
            type: 'missing-landmark',
            landmark: name
          });
        }
      });

      return issues;
    });

    console.log(`  Found ${ariaIssues.length} ARIA/accessibility issues`);

    const byType = {};
    ariaIssues.forEach(issue => {
      byType[issue.type] = (byType[issue.type] || 0) + 1;
    });

    Object.entries(byType).forEach(([type, count]) => {
      console.log(`    ${type}: ${count}`);
      this.issues.moderate.push({
        type: 'aria',
        message: `${count} instances of ${type}`,
        severity: 'moderate'
      });
    });

    console.log('');
  }

  async testHeadingStructure() {
    console.log('📝 Testing heading structure...\n');

    await this.page.goto(`${BASE_URL}/index.html`, {
      waitUntil: 'networkidle0'
    });

    const headingStructure = await this.page.evaluate(() => {
      const headings = [];
      document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(h => {
        headings.push({
          level: parseInt(h.tagName[1]),
          text: h.textContent?.trim(),
          tag: h.tagName
        });
      });
      return headings;
    });

    console.log(`  Found ${headingStructure.length} headings`);

    // Check for multiple H1s
    const h1Count = headingStructure.filter(h => h.level === 1).length;
    if (h1Count > 1) {
      this.issues.moderate.push({
        type: 'heading',
        message: `Multiple H1 tags found (${h1Count})`,
        severity: 'moderate'
      });
      console.log(`  ⚠️  Multiple H1 tags: ${h1Count}`);
    } else if (h1Count === 0) {
      this.issues.serious.push({
        type: 'heading',
        message: 'No H1 tag found',
        severity: 'serious'
      });
      console.log(`  ❌ No H1 tag found`);
    }

    // Check for skipped heading levels
    let lastLevel = 0;
    const skippedLevels = [];

    headingStructure.forEach(h => {
      if (h.level > lastLevel + 1 && lastLevel !== 0) {
        skippedLevels.push({ from: lastLevel, to: h.level, text: h.text });
      }
      lastLevel = h.level;
    });

    if (skippedLevels.length > 0) {
      console.log(`  ⚠️  Skipped heading levels: ${skippedLevels.length}`);
      skippedLevels.forEach(skip => {
        console.log(`    H${skip.from} → H${skip.to}: "${skip.text}"`);
      });
      this.issues.minor.push({
        type: 'heading',
        message: `Skipped heading levels detected`,
        severity: 'minor',
        details: skippedLevels
      });
    } else {
      console.log(`  ✅ Proper heading hierarchy`);
    }

    console.log('');
  }

  async testResponsiveDesign() {
    console.log('📱 Testing responsive design...\n');

    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];

    for (const viewport of viewports) {
      console.log(`  Testing ${viewport.name} (${viewport.width}x${viewport.height})...`);

      await this.page.setViewport({
        width: viewport.width,
        height: viewport.height
      });

      await this.page.goto(`${BASE_URL}/index.html`, {
        waitUntil: 'networkidle0'
      });

      // Check for horizontal scroll
      const hasHorizontalScroll = await this.page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      if (hasHorizontalScroll) {
        this.issues.moderate.push({
          type: 'responsive',
          message: `Horizontal scroll detected at ${viewport.width}px width`,
          viewport: viewport.name
        });
        console.log(`    ⚠️  Horizontal scroll detected`);
      }

      // Check for overlapping elements
      const overlappingElements = await this.page.evaluate(() => {
        const elements = document.querySelectorAll('button, a, input');
        const overlaps = [];

        for (let i = 0; i < elements.length; i++) {
          const rect1 = elements[i].getBoundingClientRect();
          for (let j = i + 1; j < elements.length; j++) {
            const rect2 = elements[j].getBoundingClientRect();

            if (!(rect1.right < rect2.left ||
                  rect1.left > rect2.right ||
                  rect1.bottom < rect2.top ||
                  rect1.top > rect2.bottom)) {
              overlaps.push({
                el1: elements[i].tagName,
                el2: elements[j].tagName
              });
            }
          }
        }

        return overlaps;
      });

      if (overlappingElements.length > 0) {
        console.log(`    ⚠️  ${overlappingElements.length} overlapping elements`);
      } else {
        console.log(`    ✅ No overlapping elements`);
      }

      // Check text readability
      const unreadableText = await this.page.evaluate(() => {
        const elements = document.querySelectorAll('p, span, div');
        const unreadable = [];

        elements.forEach(el => {
          if (!el.textContent?.trim()) return;

          const computed = window.getComputedStyle(el);
          const fontSize = parseFloat(computed.fontSize);

          if (fontSize < 12) {
            unreadable.push({
              text: el.textContent.substring(0, 50),
              fontSize: fontSize
            });
          }
        });

        return unreadable;
      });

      if (unreadableText.length > 0) {
        console.log(`    ⚠️  ${unreadableText.length} elements with small text (<12px)`);
      }
    }

    console.log('');
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 ACCESSIBILITY TEST SUMMARY');
    console.log('='.repeat(60));

    const totalIssues =
      this.issues.critical.length +
      this.issues.serious.length +
      this.issues.moderate.length +
      this.issues.minor.length;

    console.log(`\n🔴 Critical Issues: ${this.issues.critical.length}`);
    this.issues.critical.slice(0, 3).forEach(issue => {
      console.log(`  - ${issue.message}`);
    });

    console.log(`\n🟠 Serious Issues: ${this.issues.serious.length}`);
    this.issues.serious.slice(0, 3).forEach(issue => {
      console.log(`  - ${issue.message}`);
    });

    console.log(`\n🟡 Moderate Issues: ${this.issues.moderate.length}`);
    this.issues.moderate.slice(0, 3).forEach(issue => {
      console.log(`  - ${issue.message}`);
    });

    console.log(`\n🟢 Minor Issues: ${this.issues.minor.length}`);
    this.issues.minor.slice(0, 3).forEach(issue => {
      console.log(`  - ${issue.message}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log(`Total Accessibility Issues: ${totalIssues}`);

    const passed = this.issues.critical.length === 0 && this.issues.serious.length === 0;
    console.log(passed ? '✅ Accessibility test PASSED (no critical/serious issues)' :
                         '❌ Accessibility test FAILED (critical/serious issues found)');
    console.log('='.repeat(60));

    return {
      summary: {
        critical: this.issues.critical.length,
        serious: this.issues.serious.length,
        moderate: this.issues.moderate.length,
        minor: this.issues.minor.length,
        total: totalIssues,
        passed
      },
      issues: this.issues
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

      await this.testKeyboardNavigation();
      await this.testColorContrast();
      await this.testARIALabels();
      await this.testHeadingStructure();
      await this.testResponsiveDesign();

      const report = this.generateReport();

      // Save report
      await fs.mkdir('tests/reports', { recursive: true });
      await fs.writeFile(
        'tests/reports/accessibility-report.json',
        JSON.stringify(report, null, 2)
      );

      console.log('\n📄 Report saved to tests/reports/accessibility-report.json');

      return report.summary.passed ? 0 : 1;

    } catch (error) {
      console.error('❌ Accessibility test failed:', error);
      return 1;
    } finally {
      await this.cleanup();
      console.log('\n✅ Accessibility testing complete!');
    }
  }
}

// Run tests if executed directly
if (require.main === module) {
  const tester = new AccessibilityTestSuite();
  tester.run().then(exitCode => {
    process.exit(exitCode);
  });
}

module.exports = AccessibilityTestSuite;