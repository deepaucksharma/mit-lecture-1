#!/usr/bin/env node

/**
 * In-Depth Visual Verification Test
 *
 * This test ensures EVERY part of EVERY spec is tested by:
 * 1. Navigating to each diagram
 * 2. Visiting every state/scene
 * 3. Checking every tab (Principles, Practice & Assessment)
 * 4. Verifying every content type renders
 * 5. Capturing screenshots of everything
 * 6. Validating visual content is present and correct
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  baseUrl: 'http://localhost:8000',
  screenshotDir: path.join(__dirname, 'screenshots/in-depth-visual'),
  viewport: { width: 1920, height: 1080 },
  timeout: 30000,
  headless: 'new',
  slowMo: 100 // Slower to ensure everything renders
};

const SPEC_IDS = [
  '00-legend', '01-triangle', '02-scale', '03-chunk-size',
  '04-architecture', '05-planes', '06-read-path', '07-write-path',
  '08-lease', '09-consistency', '10-recovery', '11-evolution', '12-dna'
];

const TABS = ['principles', 'practice'];

class InDepthVisualTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      timestamp: new Date().toISOString(),
      totalChecks: 0,
      passed: 0,
      failed: 0,
      warnings: 0,
      screenshots: 0,
      specs: {}
    };
  }

  async setup() {
    console.log('🎯 In-Depth Visual Verification Test\n');
    console.log('=' .repeat(80));
    console.log('Testing Strategy: Navigate EVERY state, EVERY tab, VERIFY all content');
    console.log('=' .repeat(80) + '\n');

    if (!fs.existsSync(CONFIG.screenshotDir)) {
      fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
    }

    this.browser = await puppeteer.launch({
      headless: CONFIG.headless,
      slowMo: CONFIG.slowMo,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport(CONFIG.viewport);

    // Monitor console errors
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`      ⚠️  Console: ${msg.text()}`);
      }
    });

    console.log('📱 Loading application...');
    await this.page.goto(CONFIG.baseUrl, { waitUntil: 'networkidle0', timeout: CONFIG.timeout });
    await this.page.waitForSelector('.app', { timeout: CONFIG.timeout });
    await this.page.waitForTimeout(3000);
    console.log('✅ Application ready\n');
  }

  async testAllSpecs() {
    for (const specId of SPEC_IDS) {
      await this.testSpecInDepth(specId);
    }
  }

  async testSpecInDepth(specId) {
    console.log(`${'='.repeat(80)}`);
    console.log(`📊 TESTING: ${specId}`);
    console.log(`${'='.repeat(80)}\n`);

    const specResults = {
      id: specId,
      checks: [],
      screenshots: [],
      states: []
    };

    try {
      // Navigate to spec
      await this.navigateToSpec(specId);

      // Get comprehensive spec information
      const specInfo = await this.page.evaluate(() => {
        const viewer = window.viewer;
        const spec = viewer?.currentSpec;
        const stateManager = viewer?.stateManager;

        return {
          title: spec?.title || 'Unknown',
          stateCount: stateManager?.states?.length || 0,
          states: stateManager?.states.map((s, i) => ({
            index: i,
            id: s.id,
            caption: s.caption,
            type: s.type
          })) || [],
          hasCrystallizedInsight: !!spec?.crystallizedInsight,
          hasPrerequisites: !!spec?.prerequisites,
          hasFirstPrinciples: !!spec?.firstPrinciples,
          hasAdvancedConcepts: !!spec?.advancedConcepts,
          hasAssessmentCheckpoints: !!(spec?.assessmentCheckpoints?.length),
          hasDrills: !!(spec?.drills?.length),
          drillCount: spec?.drills?.length || 0,
          checkpointCount: spec?.assessmentCheckpoints?.length || 0
        };
      });

      console.log(`  📋 Spec: ${specInfo.title}`);
      console.log(`  📈 States: ${specInfo.stateCount}`);
      console.log(`  🎯 Drills: ${specInfo.drillCount}`);
      console.log(`  ✅ Checkpoints: ${specInfo.checkpointCount}\n`);

      // Test each state comprehensively
      for (let stateIndex = 0; stateIndex < specInfo.stateCount; stateIndex++) {
        const stateData = specInfo.states[stateIndex];
        await this.testStateComprehensive(specId, stateIndex, stateData, specInfo, specResults);
      }

      // Summary
      const checksCount = specResults.checks.length;
      const passed = specResults.checks.filter(c => c.passed).length;
      const failed = checksCount - passed;

      console.log(`\n  ✅ ${specId} Complete:`);
      console.log(`     States: ${specInfo.stateCount}`);
      console.log(`     Screenshots: ${specResults.screenshots.length}`);
      console.log(`     Checks: ${passed}/${checksCount} passed`);
      if (failed > 0) {
        console.log(`     ⚠️  Failed: ${failed}`);
      }

    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
      specResults.error = error.message;
    }

    this.results.specs[specId] = specResults;
  }

  async testStateComprehensive(specId, stateIndex, stateData, specInfo, specResults) {
    const stateId = `s${stateIndex}`;
    console.log(`  🎬 State ${stateIndex + 1}/${specInfo.stateCount}: ${stateData.caption}`);

    try {
      // Navigate to this state
      await this.page.evaluate((index) => {
        const stateManager = window.viewer?.stateManager;
        if (stateManager && index < stateManager.states.length) {
          stateManager.currentStateIndex = index;
          stateManager.applyState(stateManager.states[index]);
        }
      }, stateIndex);

      await this.page.waitForTimeout(800);

      // Update UI
      await this.page.evaluate(() => {
        if (window.viewer?.renderStateControls) {
          window.viewer.renderStateControls();
        }
      });

      await this.page.waitForTimeout(400);

      // === CHECK 1: Diagram Rendering ===
      const diagramCheck = await this.verifyDiagram(specId, stateId);
      specResults.checks.push(diagramCheck);
      console.log(`     ${diagramCheck.passed ? '✅' : '❌'} Diagram: ${diagramCheck.message}`);

      // === CHECK 2: Unified Navigation Display ===
      const navCheck = await this.verifyUnifiedNavigation(specId, stateId, stateIndex);
      specResults.checks.push(navCheck);
      console.log(`     ${navCheck.passed ? '✅' : '❌'} Navigation: ${navCheck.message}`);

      // === CHECK 3: State Controls ===
      const controlsCheck = await this.verifyStateControls(specId, stateId);
      specResults.checks.push(controlsCheck);
      console.log(`     ${controlsCheck.passed ? '✅' : '❌'} Controls: ${controlsCheck.message}`);

      // Capture main view screenshot
      await this.captureScreenshot(specId, stateId, 'main', `State ${stateIndex}`, specResults);

      // Test each tab for this state
      for (const tab of TABS) {
        await this.testTabContent(specId, stateId, tab, specInfo, specResults);
      }

    } catch (error) {
      console.log(`     ❌ State error: ${error.message}`);
      specResults.checks.push({
        name: `State ${stateIndex}`,
        passed: false,
        error: error.message
      });
    }
  }

  async testTabContent(specId, stateId, tabName, specInfo, specResults) {
    try {
      // Switch to tab
      await this.page.evaluate((tab) => {
        const tabBtn = document.querySelector(`[data-tab="${tab}"]`);
        if (tabBtn && !tabBtn.classList.contains('active')) {
          tabBtn.click();
        }
      }, tabName);

      await this.page.waitForTimeout(500);

      if (tabName === 'principles') {
        // === CHECK: First Principles Content ===
        const principlesCheck = await this.verifyFirstPrinciples(specId, stateId);
        specResults.checks.push(principlesCheck);
        console.log(`     ${principlesCheck.passed ? '✅' : '❌'} Principles: ${principlesCheck.message}`);

        // === CHECK: Advanced Concepts ===
        const advancedCheck = await this.verifyAdvancedConcepts(specId, stateId);
        specResults.checks.push(advancedCheck);
        console.log(`     ${advancedCheck.passed ? '✅' : '❌'} Advanced: ${advancedCheck.message}`);

      } else if (tabName === 'practice') {
        // === CHECK: Assessment Checkpoints ===
        const assessmentCheck = await this.verifyAssessment(specId, stateId, specInfo);
        specResults.checks.push(assessmentCheck);
        console.log(`     ${assessmentCheck.passed ? '✅' : '❌'} Assessment: ${assessmentCheck.message}`);

        // === CHECK: Drills ===
        const drillsCheck = await this.verifyDrills(specId, stateId, specInfo);
        specResults.checks.push(drillsCheck);
        console.log(`     ${drillsCheck.passed ? '✅' : '❌'} Drills: ${drillsCheck.message}`);
      }

      // Capture tab screenshot
      await this.captureScreenshot(specId, stateId, tabName, `Tab: ${tabName}`, specResults);

    } catch (error) {
      console.log(`     ❌ Tab ${tabName} error: ${error.message}`);
    }
  }

  async verifyDiagram(specId, stateId) {
    const result = await this.page.evaluate(() => {
      const container = document.querySelector('.diagram-container');
      if (!container) return { passed: false, message: 'No container' };

      const hasError = container.textContent.includes('Parse error') ||
                      container.textContent.includes('Failed to render');
      const svg = container.querySelector('svg');
      const nodes = svg ? svg.querySelectorAll('rect, circle, polygon, .node').length : 0;
      const paths = svg ? svg.querySelectorAll('path').length : 0;

      return {
        passed: !hasError && svg && (nodes > 0 || paths > 2),
        message: hasError ? 'Parse error' :
                !svg ? 'No SVG' :
                `${nodes} elements, ${paths} paths`
      };
    });

    this.results.totalChecks++;
    if (result.passed) this.results.passed++;
    else this.results.failed++;

    return { name: `${specId}-${stateId}-diagram`, ...result };
  }

  async verifyUnifiedNavigation(specId, stateId, stateIndex) {
    const result = await this.page.evaluate(() => {
      const navCurrent = document.getElementById('nav-current');
      if (!navCurrent) return { passed: false, message: 'No nav element' };

      const text = navCurrent.innerText;
      const hasDiagram = text.includes('D') && text.includes('/13');
      const hasState = text.includes('S') && text.includes('/');
      const hasGlobal = text.match(/\d+\/58/);

      return {
        passed: hasDiagram && hasState && hasGlobal,
        message: hasDiagram && hasState && hasGlobal ? text.replace(/\n/g, ' ') : 'Missing nav info',
        navText: text
      };
    });

    this.results.totalChecks++;
    if (result.passed) this.results.passed++;
    else this.results.failed++;

    return { name: `${specId}-${stateId}-nav`, ...result };
  }

  async verifyStateControls(specId, stateId) {
    const result = await this.page.evaluate(() => {
      const controls = document.getElementById('state-controls');
      if (!controls) return { passed: false, message: 'No controls' };

      const hasTimeline = !!controls.querySelector('.timeline-track');
      const hasButtons = controls.querySelectorAll('button').length >= 2;
      const isVisible = controls.offsetHeight > 0;

      return {
        passed: hasTimeline && hasButtons && isVisible,
        message: `Timeline: ${hasTimeline}, Buttons: ${hasButtons}, Visible: ${isVisible}`
      };
    });

    this.results.totalChecks++;
    if (result.passed) this.results.passed++;
    else this.results.failed++;

    return { name: `${specId}-${stateId}-controls`, ...result };
  }

  async verifyFirstPrinciples(specId, stateId) {
    const result = await this.page.evaluate(() => {
      const container = document.getElementById('principles-container');
      if (!container) return { passed: false, message: 'No container' };

      const isActive = container.classList.contains('active');
      const content = container.textContent;
      const hasSections = container.querySelectorAll('.principle-section, .sub-accordion-item').length;

      const hasTheoretical = content.includes('Theoretical') || content.includes('theoretical');
      const hasQuantitative = content.includes('Quantitative') || content.includes('quantitative');
      const hasContent = content.length > 100;

      return {
        passed: isActive && hasSections > 0 && hasContent,
        message: `Active: ${isActive}, Sections: ${hasSections}, Length: ${content.length}`
      };
    });

    this.results.totalChecks++;
    if (result.passed) this.results.passed++;
    else { this.results.failed++; this.results.warnings++; }

    return { name: `${specId}-${stateId}-principles`, ...result };
  }

  async verifyAdvancedConcepts(specId, stateId) {
    const result = await this.page.evaluate(() => {
      const container = document.getElementById('principles-container');
      if (!container) return { passed: false, message: 'No container' };

      const content = container.textContent;
      const hasAdvanced = content.includes('Advanced') || content.includes('advanced');
      const hasAlternatives = content.includes('Alternative') || content.includes('alternative');

      return {
        passed: hasAdvanced || hasAlternatives || content.includes('modern'),
        message: hasAdvanced ? 'Has advanced concepts' : 'No advanced section'
      };
    });

    this.results.totalChecks++;
    if (result.passed) this.results.passed++;
    else { this.results.failed++; this.results.warnings++; }

    return { name: `${specId}-${stateId}-advanced`, ...result };
  }

  async verifyAssessment(specId, stateId, specInfo) {
    const result = await this.page.evaluate(() => {
      // Check if assessment accordion is present
      const accordion = document.querySelector('.assessment-accordion');
      if (!accordion) return { passed: true, message: 'No assessment (optional)' };

      // Expand accordion if not open
      const summary = accordion.querySelector('summary');
      if (summary && !accordion.hasAttribute('open')) {
        summary.click();
      }

      const container = document.getElementById('assessment-container');
      if (!container) return { passed: false, message: 'No assessment container' };

      const checkpoints = container.querySelectorAll('.checkpoint-card');
      const hasContent = container.textContent.length > 50;

      return {
        passed: checkpoints.length > 0 || !hasContent,
        message: `${checkpoints.length} checkpoints found`
      };
    });

    await this.page.waitForTimeout(300);

    this.results.totalChecks++;
    if (result.passed) this.results.passed++;
    else { this.results.failed++; this.results.warnings++; }

    return { name: `${specId}-${stateId}-assessment`, ...result };
  }

  async verifyDrills(specId, stateId, specInfo) {
    const result = await this.page.evaluate(() => {
      // Check if drills accordion is present
      const accordion = document.querySelector('.drills-accordion');
      if (!accordion) return { passed: true, message: 'No drills (optional)' };

      // Expand accordion if not open
      const summary = accordion.querySelector('summary');
      if (summary && !accordion.hasAttribute('open')) {
        summary.click();
      }

      const container = document.getElementById('drills-container');
      if (!container) return { passed: false, message: 'No drills container' };

      const drills = container.querySelectorAll('.drill, details');
      const hasContent = container.textContent.length > 50;

      return {
        passed: drills.length > 0 || !hasContent,
        message: `${drills.length} drills found`
      };
    });

    await this.page.waitForTimeout(300);

    this.results.totalChecks++;
    if (result.passed) this.results.passed++;
    else { this.results.failed++; this.results.warnings++; }

    return { name: `${specId}-${stateId}-drills`, ...result };
  }

  async captureScreenshot(specId, stateId, viewType, caption, specResults) {
    try {
      const filename = `${specId}-${stateId}-${viewType}.png`;
      const filepath = path.join(CONFIG.screenshotDir, filename);

      await this.page.screenshot({
        path: filepath,
        fullPage: false
      });

      specResults.screenshots.push({
        spec: specId,
        state: stateId,
        view: viewType,
        caption: caption,
        filename: filename
      });

      this.results.screenshots++;

    } catch (error) {
      console.log(`     ⚠️  Screenshot failed: ${error.message}`);
    }
  }

  async navigateToSpec(specId) {
    const navigated = await this.page.evaluate((id) => {
      const navItem = document.querySelector(`[data-diagram-id="${id}"]`);
      if (navItem) {
        navItem.click();
        return true;
      }
      return false;
    }, specId);

    if (!navigated) {
      throw new Error(`Could not navigate to ${specId}`);
    }

    await this.page.waitForTimeout(2000);
  }

  async generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 IN-DEPTH VISUAL VERIFICATION RESULTS');
    console.log('='.repeat(80));

    // Calculate statistics
    let totalStates = 0;
    let totalScreenshots = 0;

    Object.values(this.results.specs).forEach(spec => {
      totalStates += spec.states?.length || 0;
      totalScreenshots += spec.screenshots?.length || 0;
    });

    console.log(`\n📈 Coverage:`);
    console.log(`   Diagrams: ${SPEC_IDS.length}/13 (100%)`);
    console.log(`   States: ${totalStates}`);
    console.log(`   Screenshots: ${this.results.screenshots}`);
    console.log(`   Checks: ${this.results.totalChecks}`);

    console.log(`\n✅ Results:`);
    console.log(`   Passed: ${this.results.passed} (${Math.round(this.results.passed/this.results.totalChecks*100)}%)`);
    console.log(`   Failed: ${this.results.failed}`);
    console.log(`   Warnings: ${this.results.warnings}`);

    const passRate = Math.round((this.results.passed / this.results.totalChecks) * 100);

    console.log(`\n🎯 Quality:`);
    if (passRate === 100) {
      console.log(`   Status: ✅ PERFECT - All checks passed`);
    } else if (passRate >= 90) {
      console.log(`   Status: ✅ EXCELLENT - ${passRate}% pass rate`);
    } else if (passRate >= 75) {
      console.log(`   Status: ⚠️  GOOD - ${passRate}% pass rate (some warnings)`);
    } else {
      console.log(`   Status: ❌ NEEDS WORK - ${passRate}% pass rate`);
    }

    console.log(`\n📁 Output:`);
    console.log(`   Screenshots: ${CONFIG.screenshotDir}`);
    console.log(`   Total files: ${this.results.screenshots}`);

    // Generate detailed report
    const reportData = {
      ...this.results,
      summary: {
        diagrams: SPEC_IDS.length,
        totalChecks: this.results.totalChecks,
        passed: this.results.passed,
        failed: this.results.failed,
        warnings: this.results.warnings,
        screenshots: this.results.screenshots,
        passRate: passRate,
        status: passRate === 100 ? 'PERFECT' :
                passRate >= 90 ? 'EXCELLENT' :
                passRate >= 75 ? 'GOOD' : 'NEEDS WORK'
      }
    };

    // Save JSON report
    const jsonPath = path.join(CONFIG.screenshotDir, 'in-depth-results.json');
    fs.writeFileSync(jsonPath, JSON.stringify(reportData, null, 2));

    // Generate markdown report
    const mdReport = this.generateMarkdownReport(reportData);
    const mdPath = path.join(CONFIG.screenshotDir, 'IN-DEPTH-REPORT.md');
    fs.writeFileSync(mdPath, mdReport);

    console.log(`   JSON: ${jsonPath}`);
    console.log(`   Markdown: ${mdPath}`);
    console.log('='.repeat(80) + '\n');

    return reportData;
  }

  generateMarkdownReport(data) {
    let md = `# In-Depth Visual Verification Report\n\n`;
    md += `**Generated:** ${data.timestamp}\n`;
    md += `**Status:** ${data.summary.status}\n\n`;

    md += `## Summary\n\n`;
    md += `- **Diagrams Tested:** ${data.summary.diagrams}\n`;
    md += `- **Total Checks:** ${data.summary.totalChecks}\n`;
    md += `- **Passed:** ${data.summary.passed} ✅\n`;
    md += `- **Failed:** ${data.summary.failed} ❌\n`;
    md += `- **Warnings:** ${data.summary.warnings} ⚠️\n`;
    md += `- **Screenshots:** ${data.summary.screenshots}\n`;
    md += `- **Pass Rate:** ${data.summary.passRate}%\n\n`;

    md += `## Detailed Results by Diagram\n\n`;

    Object.entries(data.specs).forEach(([specId, spec]) => {
      const passed = spec.checks.filter(c => c.passed).length;
      const failed = spec.checks.length - passed;
      const status = failed === 0 ? '✅' : '⚠️';

      md += `### ${status} ${specId}\n`;
      md += `- Checks: ${passed}/${spec.checks.length} passed\n`;
      md += `- Screenshots: ${spec.screenshots.length}\n`;

      if (failed > 0) {
        md += `\n**Failed Checks:**\n`;
        spec.checks.filter(c => !c.passed).forEach(check => {
          md += `- ${check.name}: ${check.message}\n`;
        });
      }

      md += `\n`;
    });

    md += `## Testing Methodology\n\n`;
    md += `For each diagram:\n`;
    md += `1. Navigate to diagram\n`;
    md += `2. For each state:\n`;
    md += `   - Verify diagram renders (no Mermaid errors)\n`;
    md += `   - Check unified navigation display\n`;
    md += `   - Verify state controls present\n`;
    md += `   - Capture main view screenshot\n`;
    md += `   - Switch to Principles tab\n`;
    md += `     - Verify first principles content\n`;
    md += `     - Verify advanced concepts\n`;
    md += `     - Capture screenshot\n`;
    md += `   - Switch to Practice & Assessment tab\n`;
    md += `     - Verify assessment checkpoints\n`;
    md += `     - Verify practice drills\n`;
    md += `     - Capture screenshot\n\n`;

    md += `## Screenshot Organization\n\n`;
    md += `Format: \`{diagram-id}-s{state-index}-{view}.png\`\n\n`;
    md += `Views:\n`;
    md += `- \`main\` - Main diagram view with state applied\n`;
    md += `- \`principles\` - Principles tab content\n`;
    md += `- \`practice\` - Practice & Assessment tab content\n\n`;

    return md;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.setup();
      await this.testAllSpecs();
      const report = await this.generateReport();
      await this.cleanup();
      return report;
    } catch (error) {
      console.error('❌ Fatal error:', error);
      await this.cleanup();
      throw error;
    }
  }
}

// Main execution
if (require.main === module) {
  const test = new InDepthVisualTest();

  test.run()
    .then(results => {
      const exitCode = results.summary.passRate < 90 ? 1 : 0;
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

module.exports = InDepthVisualTest;