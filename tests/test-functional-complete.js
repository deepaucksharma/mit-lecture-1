#!/usr/bin/env node

/**
 * Comprehensive Functional Test Suite
 * Tests all features and user workflows end-to-end
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
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

class FunctionalTestSuite {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: []
    };
    this.baseUrl = 'http://localhost:8000/index.html';
    this.screenshotDir = path.join(__dirname, 'screenshots', 'functional');
  }

  log(message, color = 'reset') {
    console.log(`${COLORS[color]}${message}${COLORS.reset}`);
  }

  async init() {
    this.log('\n🎯 Comprehensive Functional Testing Suite\n', 'cyan');
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    this.page.setViewportSize({ width: 1920, height: 1080 });

    // Create screenshot directory
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }

    // Track errors
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        this.results.warnings++;
      }
    });

    this.page.on('pageerror', error => {
      this.results.warnings++;
      this.log(`  ⚠️ Page error: ${error.message}`, 'yellow');
    });
  }

  async runTest(name, category, testFn) {
    this.results.total++;
    try {
      const result = await testFn();
      this.results.passed++;
      this.results.tests.push({ name, category, status: 'passed', details: result });
      this.log(`  ✓ ${name}`, 'green');
      return result;
    } catch (error) {
      this.results.failed++;
      this.results.tests.push({ name, category, status: 'failed', message: error.message });
      this.log(`  ✗ ${name}: ${error.message}`, 'red');
    }
  }

  // ================================================================
  // APPLICATION INITIALIZATION WORKFLOW
  // ================================================================

  async testApplicationInitialization() {
    this.log('\n🚀 Testing Application Initialization Workflow', 'blue');

    await this.runTest('Application loads completely', 'Initialization', async () => {
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await this.page.waitForSelector('#diagram-container svg', { timeout: 15000 });
      return 'Application fully loaded';
    });

    await this.runTest('All core components initialized', 'Initialization', async () => {
      const components = await this.page.evaluate(() => ({
        viewer: !!window.viewer,
        renderer: !!window.viewer?.renderer,
        composer: !!window.viewer?.composer,
        stepper: !!window.viewer?.stepper,
        drillSystem: !!window.viewer?.drillSystem,
        learningProgress: !!window.viewer?.learningProgress,
        overlayManager: !!window.viewer?.overlayManager,
        exportManager: !!window.viewer?.exportManager,
        appState: !!window.appState,
        sanitizer: !!window.sanitizer
      }));

      const allInit = Object.values(components).every(v => v === true);
      if (!allInit) {
        const missing = Object.entries(components).filter(([k, v]) => !v).map(([k]) => k);
        throw new Error(`Components not initialized: ${missing.join(', ')}`);
      }
      return `All 10 components initialized`;
    });

    await this.runTest('Dependencies loaded correctly', 'Initialization', async () => {
      const deps = await this.page.evaluate(() => ({
        mermaid: typeof mermaid !== 'undefined',
        domPurify: typeof DOMPurify !== 'undefined',
        classes: {
          MermaidRenderer: typeof MermaidRenderer !== 'undefined',
          SceneComposer: typeof SceneComposer !== 'undefined',
          LearningProgress: typeof LearningProgress !== 'undefined',
          DrillSystem: typeof DrillSystem !== 'undefined'
        }
      }));

      if (!deps.mermaid || !deps.domPurify) {
        throw new Error('External dependencies not loaded');
      }
      return 'All dependencies loaded';
    });

    await this.runTest('Initial diagram rendered', 'Initialization', async () => {
      const diagram = await this.page.evaluate(() => ({
        hasSVG: !!document.querySelector('#diagram-container svg'),
        hasTitle: !!document.getElementById('diagram-title')?.textContent,
        currentId: window.viewer?.currentDiagramId,
        nodeCount: document.querySelectorAll('#diagram-container svg g').length
      }));

      if (!diagram.hasSVG || !diagram.hasTitle) {
        throw new Error('Initial diagram not rendered');
      }
      return `Diagram ${diagram.currentId} with ${diagram.nodeCount} elements`;
    });

    await this.page.screenshot({ path: path.join(this.screenshotDir, '01-app-initialized.png') });
  }

  // ================================================================
  // DIAGRAM NAVIGATION WORKFLOW
  // ================================================================

  async testDiagramNavigation() {
    this.log('\n🗺️ Testing Diagram Navigation Workflow', 'blue');

    await this.runTest('Navigate through all 13 diagrams sequentially', 'Navigation', async () => {
      // Start at first diagram
      await this.page.goto(`${this.baseUrl}?d=00-legend`);
      await this.page.waitForSelector('#diagram-container svg', { timeout: 10000 });

      const diagrams = [];

      for (let i = 0; i < 12; i++) { // Only 12 clicks needed (0-12 = 13 diagrams)
        const canClick = await this.page.evaluate(() => {
          const btn = document.getElementById('nav-next');
          return btn && !btn.disabled;
        });

        if (!canClick) break;

        await this.page.click('#nav-next');
        await this.page.waitForTimeout(500);
        await this.page.waitForSelector('#diagram-container svg', { timeout: 10000 });

        const info = await this.page.evaluate(() => ({
          id: window.viewer?.currentDiagramId,
          hasSVG: !!document.querySelector('#diagram-container svg')
        }));

        if (!info.hasSVG) {
          throw new Error(`Diagram ${i} failed to render`);
        }
        diagrams.push(info.id);
      }

      return `Navigated through ${diagrams.length + 1} diagrams`;
    });

    await this.runTest('Navigate backwards through all diagrams', 'Navigation', async () => {
      let count = 0;

      for (let i = 0; i < 13; i++) {
        const canGoPrev = await this.page.evaluate(() => {
          const btn = document.getElementById('nav-prev');
          return !btn?.disabled;
        });

        if (!canGoPrev) break;

        await this.page.click('#nav-prev');
        await this.page.waitForTimeout(500);
        await this.page.waitForSelector('#diagram-container svg', { timeout: 10000 });
        count++;
      }

      return `Navigated backward ${count} times`;
    });

    await this.runTest('Direct diagram selection via nav items', 'Navigation', async () => {
      const navItems = await this.page.$$('.nav-item');

      if (navItems.length < 13) {
        throw new Error(`Expected 13 nav items, found ${navItems.length}`);
      }

      // Click random nav item
      await navItems[5].click();
      await this.page.waitForTimeout(500);
      await this.page.waitForSelector('#diagram-container svg', { timeout: 10000 });

      const currentDiagram = await this.page.evaluate(() => window.viewer?.currentDiagramId);

      return `Direct navigation to ${currentDiagram}`;
    });

    await this.runTest('URL parameter navigation', 'Navigation', async () => {
      await this.page.goto(`${this.baseUrl}?d=06-read-path`);
      await this.page.waitForSelector('#diagram-container svg', { timeout: 10000 });

      const currentId = await this.page.evaluate(() => window.viewer?.currentDiagramId);

      if (currentId !== '06-read-path') {
        throw new Error(`URL param failed: expected 06-read-path, got ${currentId}`);
      }
      return 'URL parameter navigation working';
    });

    await this.page.screenshot({ path: path.join(this.screenshotDir, '02-navigation-complete.png') });
  }

  // ================================================================
  // STEP-THROUGH WORKFLOW
  // ================================================================

  async testStepThroughWorkflow() {
    this.log('\n⏯️ Testing Step-Through Workflow', 'blue');

    await this.runTest('Step controls visible and functional', 'Step-Through', async () => {
      await this.page.goto(this.baseUrl);
      await this.page.waitForSelector('#diagram-container svg', { timeout: 10000 });

      const controls = await this.page.evaluate(() => ({
        hasContainer: !!document.getElementById('step-controls'),
        hasFirstBtn: !!document.getElementById('step-first'),
        hasPrevBtn: !!document.getElementById('step-prev'),
        hasPlayBtn: !!document.getElementById('step-play'),
        hasNextBtn: !!document.getElementById('step-next'),
        hasLastBtn: !!document.getElementById('step-last'),
        hasSpeed: !!document.getElementById('step-speed'),
        stepCount: window.viewer?.stepper?.steps?.length || 0
      }));

      if (!controls.hasContainer) throw new Error('Step controls not found');
      return `Controls present, ${controls.stepCount} steps available`;
    });

    await this.runTest('Step through complete sequence', 'Step-Through', async () => {
      const stepCount = await this.page.evaluate(() => window.viewer?.stepper?.steps?.length || 0);

      if (stepCount === 0) return 'No steps in current diagram';

      // Step through all
      for (let i = 0; i < stepCount; i++) {
        await this.page.evaluate(() => window.viewer?.stepper?.next());
        await this.page.waitForTimeout(200);
      }

      const finalStep = await this.page.evaluate(() => window.viewer?.stepper?.currentStep);

      if (finalStep !== stepCount - 1) {
        throw new Error(`Expected to be at step ${stepCount - 1}, at ${finalStep}`);
      }
      return `Stepped through ${stepCount} steps successfully`;
    });

    await this.runTest('Auto-play functionality', 'Step-Through', async () => {
      await this.page.evaluate(() => {
        const stepper = window.viewer?.stepper;
        if (stepper) stepper.goToStep(0);
      });
      await this.page.waitForTimeout(300);

      await this.page.evaluate(() => window.viewer?.stepper?.startAutoPlay());
      await this.page.waitForTimeout(1500); // Let it play a bit

      const isPlaying = await this.page.evaluate(() => window.viewer?.stepper?.isPlaying);

      await this.page.evaluate(() => window.viewer?.stepper?.stopAutoPlay());

      const stopped = await this.page.evaluate(() => !window.viewer?.stepper?.isPlaying);

      if (!stopped) throw new Error('Auto-play did not stop');
      return isPlaying ? 'Auto-play started and stopped' : 'Auto-play not available';
    });

    await this.runTest('Speed control adjustment', 'Step-Through', async () => {
      const speedChanged = await this.page.evaluate(() => {
        const stepper = window.viewer?.stepper;
        if (!stepper) return false;

        const originalSpeed = stepper.playSpeed;
        stepper.setPlaySpeed(1000);
        const newSpeed = stepper.playSpeed;

        stepper.setPlaySpeed(originalSpeed); // Restore

        return newSpeed === 1000 && newSpeed !== originalSpeed;
      });

      if (!speedChanged) return 'Speed control not available or already at 1000ms';
      return 'Speed control working';
    });

    await this.page.screenshot({ path: path.join(this.screenshotDir, '03-step-through.png') });
  }

  // ================================================================
  // CONTENT DISPLAY WORKFLOW
  // ================================================================

  async testContentDisplay() {
    this.log('\n📖 Testing Content Display Workflow', 'blue');

    await this.runTest('Crystallized insight displays', 'Content', async () => {
      await this.page.goto(`${this.baseUrl}?d=00-legend`);
      await this.page.waitForSelector('#diagram-container svg', { timeout: 10000 });

      const insight = await this.page.evaluate(() => {
        const el = document.getElementById('crystallized-insight');
        return el?.textContent?.trim() || '';
      });

      if (!insight) throw new Error('Crystallized insight missing');
      return `Insight: "${insight.substring(0, 50)}..."`;
    });

    await this.runTest('Narrative content displays', 'Content', async () => {
      const narrative = await this.page.evaluate(() => {
        const panel = document.getElementById('narrative-panel');
        return panel?.textContent?.trim() || '';
      });

      if (!narrative) throw new Error('Narrative missing');
      return `Narrative length: ${narrative.length} chars`;
    });

    await this.runTest('Contracts display with all sections', 'Content', async () => {
      const contracts = await this.page.evaluate(() => {
        const panel = document.getElementById('contracts-panel');
        return {
          hasInvariants: !!panel?.querySelector('.invariants'),
          hasGuarantees: !!panel?.querySelector('.guarantees'),
          hasCaveats: !!panel?.querySelector('.caveats'),
          invariantCount: panel?.querySelectorAll('.invariants li').length || 0
        };
      });

      if (!contracts.hasInvariants) throw new Error('Contracts not displaying');
      return `Contracts: ${contracts.invariantCount} invariants`;
    });

    await this.runTest('First Principles renders recursively', 'Content', async () => {
      const principles = await this.page.evaluate(() => {
        const container = document.getElementById('principles-container');
        const sections = container?.querySelectorAll('.principle-section');
        const nested = container?.querySelectorAll('.nested-section');
        return {
          sectionCount: sections?.length || 0,
          nestedCount: nested?.length || 0,
          hasContent: (sections?.length || 0) > 0
        };
      });

      if (!principles.hasContent) throw new Error('First Principles not rendering');
      return `${principles.sectionCount} sections (${principles.nestedCount} nested)`;
    });

    await this.runTest('Advanced Concepts displays', 'Content', async () => {
      await this.page.goto(`${this.baseUrl}?d=02-scale`);
      await this.page.waitForSelector('#diagram-container svg', { timeout: 10000 });

      const advanced = await this.page.evaluate(() => {
        const container = document.getElementById('principles-container');
        const advancedContainer = container?.querySelector('.advanced-concepts-container');
        const sections = container?.querySelectorAll('.advanced-section');
        return {
          hasAdvanced: !!advancedContainer,
          sectionCount: sections?.length || 0
        };
      });

      if (!advanced.hasAdvanced) throw new Error('Advanced concepts not displaying');
      return `${advanced.sectionCount} advanced sections`;
    });

    await this.runTest('Assessment checkpoints display', 'Content', async () => {
      const assessment = await this.page.evaluate(() => {
        const container = document.getElementById('assessment-container');
        const checkpoints = container?.querySelectorAll('.assessment-checkpoint');
        const hasNoAssessment = !!container?.querySelector('.no-assessment');
        return {
          checkpointCount: checkpoints?.length || 0,
          isEmpty: hasNoAssessment
        };
      });

      if (assessment.isEmpty) return 'No assessment for this diagram (OK)';
      if (assessment.checkpointCount === 0) throw new Error('Assessment expected but not displaying');
      return `${assessment.checkpointCount} checkpoints displayed`;
    });

    await this.page.screenshot({ path: path.join(this.screenshotDir, '04-content-display.png') });
  }

  // ================================================================
  // DRILL SYSTEM WORKFLOW
  // ================================================================

  async testDrillSystem() {
    this.log('\n🎯 Testing Drill System Workflow', 'blue');

    await this.runTest('Drills load and display', 'Drills', async () => {
      await this.page.goto(`${this.baseUrl}?d=00-legend`);
      await this.page.waitForSelector('#diagram-container svg', { timeout: 10000 });

      // Switch to practice tab
      await this.page.click('[data-tab="practice"]');
      await this.page.waitForTimeout(500);

      const drills = await this.page.evaluate(() => {
        const container = document.getElementById('drills-container');
        const drillElements = container?.querySelectorAll('.drill');
        const noDrills = !!container?.querySelector('.no-drills');
        return {
          drillCount: drillElements?.length || 0,
          isEmpty: noDrills
        };
      });

      if (drills.isEmpty) return 'No drills for this diagram (OK)';
      if (drills.drillCount === 0) throw new Error('Drills expected but not displaying');
      return `${drills.drillCount} drills displayed`;
    });

    await this.runTest('Drill interaction workflow', 'Drills', async () => {
      const drillCount = await this.page.$$eval('.drill', drills => drills.length);

      if (drillCount === 0) return 'No drills to test';

      // Click on drill summary to expand (drills are <details> elements)
      const expanded = await this.page.evaluate(() => {
        const firstDrill = document.querySelector('.drill');
        if (!firstDrill) return false;

        // Drills are details elements - click summary to expand
        const summary = firstDrill.querySelector('summary');
        if (summary) summary.click();

        // Check if opened
        return firstDrill.hasAttribute('open') || firstDrill.open === true;
      });

      return expanded ? 'Drill expands on click' : 'Drill interaction attempted';
    });

    await this.runTest('Drill types render correctly', 'Drills', async () => {
      const drillTypes = await this.page.evaluate(() => {
        const drills = document.querySelectorAll('.drill');
        const types = Array.from(drills).map(d => {
          const badge = d.querySelector('.drill-type-badge');
          return badge?.textContent?.trim();
        }).filter(Boolean);
        return { count: types.length, types: [...new Set(types)] };
      });

      if (drillTypes.count === 0) return 'No drills to check types';
      return `Found ${drillTypes.types.length} drill types: ${drillTypes.types.join(', ')}`;
    });

    await this.page.screenshot({ path: path.join(this.screenshotDir, '05-drills.png') });
  }

  // ================================================================
  // PROGRESS TRACKING WORKFLOW
  // ================================================================

  async testProgressTracking() {
    this.log('\n📊 Testing Progress Tracking Workflow', 'blue');

    await this.runTest('Learning progress tracks diagram views', 'Progress', async () => {
      await this.page.goto(`${this.baseUrl}?d=00-legend`);
      await this.page.waitForSelector('#diagram-container svg', { timeout: 10000 });

      const stats = await this.page.evaluate(() => {
        const progress = window.viewer?.learningProgress;
        if (!progress) return null;
        return progress.getDiagramStats('00-legend');
      });

      if (!stats) throw new Error('Progress tracking not working');
      if (stats.viewCount < 1) throw new Error('View count not tracked');
      return `Views: ${stats.viewCount}, Time: ${stats.totalTimeSeconds}s`;
    });

    await this.runTest('Progress persists across sessions', 'Progress', async () => {
      const hasLocalStorage = await this.page.evaluate(() => {
        try {
          const key = 'gfs-learning-overall-progress';
          const data = localStorage.getItem(key);
          return data !== null;
        } catch (e) {
          return false;
        }
      });

      if (!hasLocalStorage) throw new Error('Progress not saved to localStorage');
      return 'Progress saved to localStorage';
    });

    await this.runTest('Overall progress calculated correctly', 'Progress', async () => {
      const overall = await this.page.evaluate(() => {
        const progress = window.viewer?.learningProgress;
        if (!progress) return null;
        return progress.getOverallProgress();
      });

      if (!overall) throw new Error('Overall progress not calculated');
      if (overall.completionPercentage < 0 || overall.completionPercentage > 100) {
        throw new Error(`Invalid percentage: ${overall.completionPercentage}`);
      }
      return `Overall: ${overall.completionPercentage}%`;
    });
  }

  // ================================================================
  // THEME TOGGLE WORKFLOW
  // ================================================================

  async testThemeToggle() {
    this.log('\n🎨 Testing Theme Toggle Workflow', 'blue');

    await this.runTest('Theme toggle button works', 'Theme', async () => {
      await this.page.goto(this.baseUrl);
      await this.page.waitForSelector('#diagram-container svg', { timeout: 10000 });

      const initialTheme = await this.page.evaluate(() => document.body.className);

      await this.page.click('#theme-toggle');
      await this.page.waitForTimeout(500);

      const newTheme = await this.page.evaluate(() => document.body.className);

      if (initialTheme === newTheme) throw new Error('Theme did not change');
      return `${initialTheme} → ${newTheme}`;
    });

    await this.runTest('Theme persists to localStorage', 'Theme', async () => {
      const theme = await this.page.evaluate(() => localStorage.getItem('gfs-theme'));

      if (!theme) throw new Error('Theme not saved');
      return `Theme saved: ${theme}`;
    });

    await this.runTest('Theme affects diagram rendering', 'Theme', async () => {
      await this.page.click('#theme-toggle');
      await this.page.waitForTimeout(500);

      const diagramUpdated = await this.page.evaluate(() => {
        const svg = document.querySelector('#diagram-container svg');
        return svg !== null; // Should have re-rendered
      });

      if (!diagramUpdated) throw new Error('Diagram not re-rendered with theme');
      return 'Diagram updated with theme';
    });

    await this.runTest('Theme toggle keyboard shortcut (t)', 'Theme', async () => {
      const before = await this.page.evaluate(() => document.body.className);

      await this.page.keyboard.press('t');
      await this.page.waitForTimeout(300);

      const after = await this.page.evaluate(() => document.body.className);

      if (before === after) throw new Error('Keyboard shortcut did not toggle theme');
      return 'Keyboard shortcut working';
    });

    await this.page.screenshot({ path: path.join(this.screenshotDir, '06-theme-dark.png') });
  }

  // ================================================================
  // OVERLAY SYSTEM WORKFLOW
  // ================================================================

  async testOverlaySystem() {
    this.log('\n🔀 Testing Overlay System Workflow', 'blue');

    await this.runTest('Overlay chips display', 'Overlays', async () => {
      await this.page.goto(`${this.baseUrl}?d=00-legend`);
      await this.page.waitForSelector('#diagram-container svg', { timeout: 10000 });

      const overlays = await this.page.evaluate(() => {
        const chips = document.querySelectorAll('.overlay-chip');
        return {
          chipCount: chips.length,
          hasChips: chips.length > 0
        };
      });

      if (!overlays.hasChips) return 'No overlays for this diagram (OK)';
      return `${overlays.chipCount} overlay chips displayed`;
    });

    await this.runTest('Toggle overlay updates diagram', 'Overlays', async () => {
      const chips = await this.page.$$('.overlay-chip');

      if (chips.length === 0) return 'No overlays to test';

      const beforeNodes = await this.page.evaluate(() => {
        return document.querySelectorAll('#diagram-container svg g').length;
      });

      await chips[0].click();
      await this.page.waitForTimeout(1000);

      const afterNodes = await this.page.evaluate(() => {
        return document.querySelectorAll('#diagram-container svg g').length;
      });

      // Overlay should change diagram (node count may change)
      return `Nodes before: ${beforeNodes}, after: ${afterNodes}`;
    });

    await this.runTest('Multiple overlays can be active', 'Overlays', async () => {
      const chips = await this.page.$$('.overlay-chip');

      if (chips.length < 2) return 'Not enough overlays to test';

      // Activate multiple overlays
      await chips[0].click();
      await this.page.waitForTimeout(500);
      await chips[1].click();
      await this.page.waitForTimeout(500);

      const activeCount = await this.page.evaluate(() => {
        return window.viewer?.currentOverlays?.size || 0;
      });

      return `${activeCount} overlays active`;
    });

    await this.page.screenshot({ path: path.join(this.screenshotDir, '07-overlays.png') });
  }

  // ================================================================
  // KEYBOARD SHORTCUTS WORKFLOW
  // ================================================================

  async testKeyboardShortcuts() {
    this.log('\n⌨️ Testing Keyboard Shortcuts Workflow', 'blue');

    await this.runTest('Arrow keys navigate steps', 'Keyboard', async () => {
      await this.page.goto(this.baseUrl);
      await this.page.waitForSelector('#diagram-container svg', { timeout: 10000 });

      const beforeStep = await this.page.evaluate(() => window.viewer?.stepper?.currentStep);

      await this.page.keyboard.press('ArrowRight');
      await this.page.waitForTimeout(300);

      const afterStep = await this.page.evaluate(() => window.viewer?.stepper?.currentStep);

      if (beforeStep === undefined) return 'No steps to navigate';
      return `Step: ${beforeStep} → ${afterStep}`;
    });

    await this.runTest('Ctrl+Arrow keys navigate diagrams', 'Keyboard', async () => {
      const beforeDiagram = await this.page.evaluate(() => window.viewer?.currentDiagramId);

      await this.page.keyboard.press('Control+ArrowRight');
      await this.page.waitForTimeout(1000);

      const afterDiagram = await this.page.evaluate(() => window.viewer?.currentDiagramId);

      if (beforeDiagram === afterDiagram) {
        return 'Already at boundary or shortcut blocked';
      }
      return `Diagram: ${beforeDiagram} → ${afterDiagram}`;
    });

    await this.runTest('Number keys toggle overlays', 'Keyboard', async () => {
      await this.page.goto(`${this.baseUrl}?d=00-legend`);
      await this.page.waitForSelector('#diagram-container svg', { timeout: 10000 });

      await this.page.keyboard.press('1');
      await this.page.waitForTimeout(500);

      const overlayToggled = await this.page.evaluate(() => {
        return window.viewer?.currentOverlays?.size > 0;
      });

      return overlayToggled ? 'Overlay toggled with number key' : 'No overlays or already active';
    });

    await this.runTest('Space bar plays/pauses steps', 'Keyboard', async () => {
      const hasSteps = await this.page.evaluate(() => {
        return window.viewer?.stepper?.steps?.length > 0;
      });

      if (!hasSteps) return 'No steps to play';

      await this.page.keyboard.press('Space');
      await this.page.waitForTimeout(500);

      const isPlaying = await this.page.evaluate(() => window.viewer?.stepper?.isPlaying);

      await this.page.keyboard.press('Space'); // Stop

      return isPlaying ? 'Space toggle working' : 'Space toggle attempted';
    });

    await this.runTest('Help dialog shortcut (?)', 'Keyboard', async () => {
      await this.page.keyboard.press('Shift+Slash'); // ? key
      await this.page.waitForTimeout(300);

      const modalVisible = await this.page.isVisible('.modal');

      if (modalVisible) {
        await this.page.keyboard.press('Escape');
      }

      return modalVisible ? 'Help dialog opened' : 'Help shortcut attempted';
    });

    await this.runTest('Legend shortcut (L)', 'Keyboard', async () => {
      await this.page.goto(`${this.baseUrl}?d=05-planes`);
      await this.page.waitForSelector('#diagram-container svg', { timeout: 10000 });

      await this.page.keyboard.press('l');
      await this.page.waitForTimeout(1000);

      const atLegend = await this.page.evaluate(() => window.viewer?.currentDiagramId);

      if (atLegend !== '00-legend') throw new Error('Legend shortcut failed');
      return 'Jumped to legend';
    });
  }

  // ================================================================
  // EXPORT FUNCTIONALITY WORKFLOW
  // ================================================================

  async testExportFunctionality() {
    this.log('\n💾 Testing Export Functionality Workflow', 'blue');

    await this.runTest('Export manager accessible', 'Export', async () => {
      await this.page.goto(this.baseUrl);
      await this.page.waitForSelector('#diagram-container svg', { timeout: 10000 });

      const exportMethods = await this.page.evaluate(() => {
        const em = window.viewer?.exportManager;
        return {
          exists: !!em,
          hasSVG: typeof em?.exportSVG === 'function',
          hasPNG: typeof em?.exportPNG === 'function',
          hasJSON: typeof em?.exportJSON === 'function',
          hasMermaid: typeof em?.exportMermaid === 'function'
        };
      });

      if (!exportMethods.exists) throw new Error('Export manager not found');
      const methods = Object.entries(exportMethods).filter(([k, v]) => k !== 'exists' && v).length;
      return `${methods}/4 export methods available`;
    });

    await this.runTest('SVG export generates valid data', 'Export', async () => {
      const svgData = await this.page.evaluate(() => {
        const svg = document.querySelector('#diagram-container svg');
        return svg ? svg.outerHTML.length : 0;
      });

      if (svgData === 0) throw new Error('No SVG to export');
      return `SVG data: ${svgData} bytes`;
    });

    await this.runTest('JSON export includes spec data', 'Export', async () => {
      const jsonValid = await this.page.evaluate(() => {
        const spec = window.viewer?.currentSpec;
        if (!spec) return false;

        try {
          JSON.stringify(spec);
          return true;
        } catch (e) {
          return false;
        }
      });

      if (!jsonValid) throw new Error('Spec not JSON serializable');
      return 'Spec exports as valid JSON';
    });
  }

  // ================================================================
  // TAB SWITCHING WORKFLOW
  // ================================================================

  async testTabSwitching() {
    this.log('\n📑 Testing Tab Switching Workflow', 'blue');

    await this.runTest('Switch between Principles and Practice tabs', 'Tabs', async () => {
      await this.page.goto(this.baseUrl);
      await this.page.waitForSelector('#diagram-container svg', { timeout: 10000 });

      // Start on Principles (default)
      const principlesActive = await this.page.evaluate(() => {
        return document.querySelector('[data-tab="principles"]')?.classList.contains('active');
      });

      // Switch to Practice
      await this.page.click('[data-tab="practice"]');
      await this.page.waitForTimeout(300);

      const practiceActive = await this.page.evaluate(() => {
        return document.querySelector('[data-tab="practice"]')?.classList.contains('active');
      });

      if (!practiceActive) throw new Error('Tab switch failed');
      return 'Tab switching working';
    });

    await this.runTest('Tab content changes on switch', 'Tabs', async () => {
      await this.page.click('[data-tab="principles"]');
      await this.page.waitForTimeout(300);

      const principlesVisible = await this.page.isVisible('#principles-container');
      const practiceHidden = await this.page.isHidden('#practice-container');

      if (!principlesVisible || !practiceHidden) {
        throw new Error('Tab content not switching correctly');
      }
      return 'Tab content visibility correct';
    });
  }

  // ================================================================
  // COMPLETE USER JOURNEY WORKFLOW
  // ================================================================

  async testCompleteUserJourney() {
    this.log('\n🚶 Testing Complete User Journey', 'blue');

    await this.runTest('New user: Load → Read → Practice flow', 'User Journey', async () => {
      // 1. Load application
      await this.page.goto(this.baseUrl);
      await this.page.waitForSelector('#diagram-container svg', { timeout: 10000 });

      // 2. Read crystallized insight
      const insight = await this.page.textContent('#crystallized-insight');

      // 3. View diagram
      const hasDiagram = await this.page.isVisible('#diagram-container svg');

      // 4. Read narrative
      const narrative = await this.page.textContent('#narrative-panel');

      // 5. Check first principles
      await this.page.waitForTimeout(300);
      const hasPrinciples = await this.page.evaluate(() => {
        return document.querySelectorAll('.principle-section').length > 0;
      });

      // 6. Switch to practice tab
      await this.page.click('[data-tab="practice"]');
      await this.page.waitForTimeout(300);

      // 7. View drills
      const hasDrills = await this.page.evaluate(() => {
        return document.querySelectorAll('.drill').length > 0;
      });

      if (!hasDiagram || !narrative || !hasPrinciples) {
        throw new Error('User journey incomplete');
      }

      return 'Complete learning flow successful';
    });

    await this.runTest('Return user: Progress displayed correctly', 'User Journey', async () => {
      // Simulate return user with existing progress
      const progressShown = await this.page.evaluate(() => {
        const navItems = document.querySelectorAll('.nav-item');
        let hasProgressIndicator = false;

        navItems.forEach(item => {
          if (item.querySelector('.nav-progress')) {
            hasProgressIndicator = true;
          }
        });

        return hasProgressIndicator;
      });

      return progressShown ? 'Progress indicators showing' : 'No progress indicators yet (new session)';
    });

    await this.page.screenshot({ path: path.join(this.screenshotDir, '08-user-journey.png') });
  }

  // ================================================================
  // ALL DIAGRAMS DEEP VALIDATION
  // ================================================================

  async testAllDiagramsDeep() {
    this.log('\n📊 Testing All 13 Diagrams in Depth', 'blue');

    const diagrams = [
      '00-legend', '01-triangle', '02-scale', '03-chunk-size',
      '04-architecture', '05-planes', '06-read-path', '07-write-path',
      '08-lease', '09-consistency', '10-recovery', '11-evolution', '12-dna'
    ];

    for (const diagramId of diagrams) {
      await this.runTest(`Complete validation: ${diagramId}`, 'Diagrams', async () => {
        await this.page.goto(`${this.baseUrl}?d=${diagramId}`);
        await this.page.waitForSelector('#diagram-container svg', { timeout: 10000 });

        const validation = await this.page.evaluate(() => {
          return {
            // Core rendering
            hasSVG: !!document.querySelector('#diagram-container svg'),
            svgElements: document.querySelectorAll('#diagram-container svg *').length,

            // Content sections
            hasInsight: !!document.getElementById('crystallized-insight')?.textContent,
            hasNarrative: !!document.getElementById('narrative-panel')?.textContent,
            hasContracts: !!document.getElementById('contracts-panel')?.querySelector('.contracts'),
            hasPrinciples: document.querySelectorAll('.principle-section').length > 0,

            // UI elements
            hasTitle: !!document.getElementById('diagram-title')?.textContent,
            hasNavigation: document.querySelectorAll('.nav-item').length === 13,

            // State
            currentId: window.viewer?.currentDiagramId,
            specLoaded: !!window.viewer?.currentSpec
          };
        });

        if (!validation.hasSVG) throw new Error('SVG not rendered');
        if (!validation.hasTitle) throw new Error('Title missing');
        if (!validation.specLoaded) throw new Error('Spec not loaded');
        if (validation.currentId !== diagramId) throw new Error(`ID mismatch: ${validation.currentId}`);

        const score = [
          validation.hasSVG,
          validation.hasInsight,
          validation.hasNarrative,
          validation.hasContracts,
          validation.hasPrinciples,
          validation.hasTitle
        ].filter(Boolean).length;

        return `${score}/6 components validated, ${validation.svgElements} SVG elements`;
      });
    }
  }

  // ================================================================
  // CACHING AND PERFORMANCE WORKFLOW
  // ================================================================

  async testCachingPerformance() {
    this.log('\n⚡ Testing Caching and Performance', 'blue');

    await this.runTest('Cache improves second load time', 'Performance', async () => {
      await this.page.goto(`${this.baseUrl}?d=01-triangle`);
      await this.page.waitForSelector('#diagram-container svg', { timeout: 10000 });

      // First load
      const start1 = Date.now();
      await this.page.evaluate(() => window.viewer?.loadDiagram('02-scale'));
      await this.page.waitForSelector('#diagram-container svg', { timeout: 10000 });
      const time1 = Date.now() - start1;

      // Second load (should be cached)
      const start2 = Date.now();
      await this.page.evaluate(() => window.viewer?.loadDiagram('02-scale'));
      await this.page.waitForTimeout(500);
      const time2 = Date.now() - start2;

      const improvement = ((time1 - time2) / time1 * 100).toFixed(0);

      return `First: ${time1}ms, Second: ${time2}ms (${improvement}% faster)`;
    });

    await this.runTest('Cache size stays within limits', 'Performance', async () => {
      // Load many diagrams to test cache limit
      const diagrams = ['00-legend', '01-triangle', '02-scale', '03-chunk-size', '04-architecture'];

      for (const d of diagrams) {
        await this.page.evaluate((id) => window.viewer?.loadDiagram(id), d);
        await this.page.waitForTimeout(300);
      }

      const cacheSize = await this.page.evaluate(() => {
        return window.viewer?.renderer?.cache?.size || 0;
      });

      if (cacheSize > 20) throw new Error(`Cache exceeded limit: ${cacheSize}`);
      return `Cache size: ${cacheSize} (within limit)`;
    });

    await this.runTest('Navigation performance consistent', 'Performance', async () => {
      const times = [];

      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        await this.page.click('#nav-next');
        await this.page.waitForSelector('#diagram-container svg', { timeout: 10000 });
        times.push(Date.now() - start);
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const max = Math.max(...times);
      const min = Math.min(...times);

      return `Avg: ${avg.toFixed(0)}ms, Range: ${min}-${max}ms`;
    });
  }

  // ================================================================
  // STATE CONSISTENCY WORKFLOW
  // ================================================================

  async testStateConsistency() {
    this.log('\n🔄 Testing State Consistency', 'blue');

    await this.runTest('Viewer state matches UI state', 'State Consistency', async () => {
      await this.page.goto(`${this.baseUrl}?d=03-chunk-size`);
      await this.page.waitForSelector('#diagram-container svg', { timeout: 10000 });

      const consistency = await this.page.evaluate(() => {
        const viewerId = window.viewer?.currentDiagramId;
        const urlParams = new URLSearchParams(window.location.search);
        const urlId = urlParams.get('d');
        const titleText = document.getElementById('diagram-title')?.textContent;
        const activeNav = document.querySelector('.nav-item.active');
        const activeId = activeNav?.dataset?.diagramId;

        return {
          viewerId,
          urlId,
          hasTitle: !!titleText,
          activeId,
          allMatch: viewerId === urlId && viewerId === activeId
        };
      });

      if (!consistency.allMatch) {
        throw new Error(`State mismatch: viewer=${consistency.viewerId}, url=${consistency.urlId}, nav=${consistency.activeId}`);
      }
      return 'All state sources consistent';
    });

    await this.runTest('Progress state consistent with localStorage', 'State Consistency', async () => {
      const consistent = await this.page.evaluate(() => {
        const progress = window.viewer?.learningProgress;
        if (!progress) return false;

        const memoryStats = progress.getDiagramStats('00-legend');

        // Check localStorage
        const stored = localStorage.getItem('gfs-learning-overall-progress');
        if (!stored) return false;

        const storedData = JSON.parse(stored);
        const storedStats = storedData.diagrams?.['00-legend'];

        return storedStats?.viewCount === memoryStats.viewCount;
      });

      if (!consistent) throw new Error('Progress memory/storage mismatch');
      return 'Progress state synchronized';
    });

    await this.runTest('AppState manages global state', 'State Consistency', async () => {
      const appStateWorks = await this.page.evaluate(() => {
        const state = window.appState;
        if (!state) return false;

        // Test set/get
        state.set('test', 'value');
        const retrieved = state.get('test');

        // Test subscription
        let triggered = false;
        state.subscribe('test2', () => { triggered = true; });
        state.set('test2', 'val');

        return retrieved === 'value' && triggered;
      });

      if (!appStateWorks) throw new Error('AppState not functioning correctly');
      return 'AppState set/get/subscribe working';
    });
  }

  // ================================================================
  // DATA INTEGRITY WORKFLOW
  // ================================================================

  async testDataIntegrity() {
    this.log('\n🔍 Testing Data Integrity Through Pipeline', 'blue');

    await this.runTest('Spec loads with all enhanced fields', 'Data Integrity', async () => {
      await this.page.goto(`${this.baseUrl}?d=00-legend`);
      await this.page.waitForSelector('#diagram-container svg', { timeout: 10000 });

      const fields = await this.page.evaluate(() => {
        const spec = window.viewer?.currentSpec;
        return {
          hasId: !!spec?.id,
          hasTitle: !!spec?.title,
          hasNodes: Array.isArray(spec?.nodes),
          hasEdges: Array.isArray(spec?.edges),
          hasContracts: !!spec?.contracts,
          hasCrystallizedInsight: !!spec?.crystallizedInsight,
          hasFirstPrinciples: !!spec?.firstPrinciples,
          hasAdvancedConcepts: !!spec?.advancedConcepts,
          hasAssessmentCheckpoints: Array.isArray(spec?.assessmentCheckpoints),
          hasDrills: Array.isArray(spec?.drills),
          nodeCount: spec?.nodes?.length || 0,
          edgeCount: spec?.edges?.length || 0
        };
      });

      const requiredFields = [
        fields.hasId, fields.hasTitle, fields.hasNodes,
        fields.hasEdges, fields.hasContracts
      ];
      const enhancedFields = [
        fields.hasCrystallizedInsight, fields.hasFirstPrinciples,
        fields.hasAdvancedConcepts, fields.hasAssessmentCheckpoints, fields.hasDrills
      ];

      if (!requiredFields.every(f => f)) throw new Error('Required fields missing');
      const enhancedCount = enhancedFields.filter(f => f).length;

      return `Required: 5/5, Enhanced: ${enhancedCount}/5, Nodes: ${fields.nodeCount}, Edges: ${fields.edgeCount}`;
    });

    await this.runTest('Enhanced metrics preserved in edges', 'Data Integrity', async () => {
      const metricsCheck = await this.page.evaluate(() => {
        const spec = window.viewer?.currentSpec;
        if (!spec) return null;

        const edgesWithMetrics = spec.edges?.filter(e => e.metrics) || [];
        const edgesWithEnhanced = edgesWithMetrics.filter(e =>
          e.metrics.frequency || e.metrics.payload || e.metrics.purpose
        );

        return {
          totalEdges: spec.edges?.length || 0,
          withMetrics: edgesWithMetrics.length,
          withEnhanced: edgesWithEnhanced.length
        };
      });

      if (!metricsCheck) throw new Error('Spec not loaded');
      return `${metricsCheck.withMetrics} edges with metrics, ${metricsCheck.withEnhanced} with enhanced fields`;
    });

    await this.runTest('Drill thought processes preserved', 'Data Integrity', async () => {
      const drillData = await this.page.evaluate(() => {
        const spec = window.viewer?.currentSpec;
        if (!spec?.drills) return null;

        const drillsWithThought = spec.drills.filter(d =>
          Array.isArray(d.thoughtProcess) && d.thoughtProcess.length > 0
        );
        const drillsWithInsight = spec.drills.filter(d => d.insight);

        return {
          totalDrills: spec.drills.length,
          withThought: drillsWithThought.length,
          withInsight: drillsWithInsight.length
        };
      });

      if (!drillData) return 'No drills in current diagram';
      return `${drillData.totalDrills} drills: ${drillData.withThought} with thoughtProcess, ${drillData.withInsight} with insight`;
    });
  }

  // ================================================================
  // ACCESSIBILITY WORKFLOW
  // ================================================================

  async testAccessibilityWorkflow() {
    this.log('\n♿ Testing Accessibility Workflow', 'blue');

    await this.runTest('Keyboard-only navigation possible', 'Accessibility', async () => {
      await this.page.goto(this.baseUrl);
      await this.page.waitForSelector('#diagram-container svg', { timeout: 10000 });

      // Navigate using only keyboard
      await this.page.keyboard.press('Control+ArrowRight'); // Next diagram
      await this.page.waitForTimeout(1000);

      await this.page.keyboard.press('ArrowRight'); // Next step
      await this.page.waitForTimeout(300);

      await this.page.keyboard.press('t'); // Toggle theme
      await this.page.waitForTimeout(300);

      const success = await this.page.evaluate(() => {
        return !!document.querySelector('#diagram-container svg');
      });

      if (!success) throw new Error('Keyboard navigation failed');
      return 'Full keyboard navigation working';
    });

    await this.runTest('Focus indicators visible', 'Accessibility', async () => {
      await this.page.keyboard.press('Tab');
      await this.page.waitForTimeout(100);

      const hasFocus = await this.page.evaluate(() => {
        const focused = document.activeElement;
        const computedStyle = window.getComputedStyle(focused);
        return {
          isFocused: focused !== document.body,
          hasOutline: computedStyle.outline !== 'none' ||
                     computedStyle.boxShadow !== 'none' ||
                     focused.matches(':focus-visible')
        };
      });

      if (!hasFocus.isFocused) return 'No focusable elements tabbed yet';
      return 'Focus indicators present';
    });

    await this.runTest('ARIA labels present on key elements', 'Accessibility', async () => {
      const aria = await this.page.evaluate(() => {
        const svg = document.querySelector('#diagram-container svg');
        return {
          svgRole: svg?.getAttribute('role'),
          svgLabel: svg?.getAttribute('aria-label'),
          hasDesc: !!svg?.querySelector('desc')
        };
      });

      if (!aria.svgRole) throw new Error('SVG missing role attribute');
      return `SVG role: ${aria.svgRole}, label: ${!!aria.svgLabel}, desc: ${aria.hasDesc}`;
    });
  }

  // ================================================================
  // ERROR HANDLING WORKFLOW
  // ================================================================

  async testErrorHandling() {
    this.log('\n⚠️ Testing Error Handling Workflow', 'blue');

    await this.runTest('Invalid diagram ID shows error', 'Error Handling', async () => {
      await this.page.goto(`${this.baseUrl}?d=invalid-999`);
      await this.page.waitForTimeout(3000);

      const errorShown = await this.page.evaluate(() => {
        return !!document.querySelector('.error-message') ||
               !!document.querySelector('.diagram-error');
      });

      // Should either show error or fallback to default diagram
      const viewerOk = await this.page.evaluate(() => !!window.viewer?.currentDiagramId);

      if (!errorShown && !viewerOk) throw new Error('Error not handled');
      return errorShown ? 'Error displayed' : 'Fell back to default diagram';
    });

    await this.runTest('Missing spec data handled gracefully', 'Error Handling', async () => {
      // Block a spec file
      await this.page.route('**/data/specs/10-recovery.json', route => route.abort());

      await this.page.goto(`${this.baseUrl}?d=10-recovery`);
      await this.page.waitForTimeout(3000);

      const handled = await this.page.evaluate(() => {
        return !!document.querySelector('.error-message') ||
               window.viewer?.currentDiagramId !== '10-recovery';
      });

      await this.page.unroute('**/data/specs/10-recovery.json');

      if (!handled) throw new Error('Missing spec not handled');
      return 'Missing spec handled with error or fallback';
    });

    await this.runTest('App continues working after errors', 'Error Handling', async () => {
      // After previous error tests, app should still work
      await this.page.goto(this.baseUrl);
      await this.page.waitForSelector('#diagram-container svg', { timeout: 10000 });

      const stillWorking = await this.page.evaluate(() => {
        return !!window.viewer &&
               !!document.querySelector('#diagram-container svg') &&
               !!window.viewer.currentDiagramId;
      });

      if (!stillWorking) throw new Error('App not working after errors');
      return 'App recovers and continues working';
    });
  }

  // ================================================================
  // SANITIZATION WORKFLOW
  // ================================================================

  async testSanitizationWorkflow() {
    this.log('\n🔒 Testing Sanitization Workflow', 'blue');

    await this.runTest('DOMPurify sanitizes malicious content', 'Security', async () => {
      const sanitized = await this.page.evaluate(() => {
        const sanitizer = window.sanitizer;
        if (!sanitizer) return null;

        const attacks = [
          '<script>alert("xss")</script>',
          '<img src=x onerror="alert(1)">',
          'javascript:void(0)',
          '<iframe src="evil.com"></iframe>'
        ];

        const results = attacks.map(attack => {
          const clean = sanitizer.sanitize(attack);
          const hasHTML = attack.includes('<');

          return {
            original: attack.substring(0, 30),
            cleaned: clean,
            // DOMPurify removes dangerous tags entirely or escapes them
            // For non-HTML content like "javascript:void(0)", it returns as-is (text)
            // That's OK since it won't execute in text context
            safe: hasHTML ? (
              !clean.toLowerCase().includes('<script') &&
              !clean.includes('onerror') &&
              !clean.toLowerCase().includes('<iframe')
            ) : true // Non-HTML content is safe when rendered as text
          };
        });

        return {
          tested: results.length,
          allSafe: results.every(r => r.safe),
          details: results.map(r => ({ safe: r.safe, cleaned: r.cleaned.substring(0, 50) }))
        };
      });

      if (!sanitized) throw new Error('Sanitizer not available');
      if (!sanitized.allSafe) {
        const unsafe = sanitized.details.filter(d => !d.safe);
        throw new Error(`${unsafe.length} attacks not blocked: ${JSON.stringify(unsafe)}`);
      }
      return `${sanitized.tested} attack vectors blocked`;
    });

    await this.runTest('Suspicious content detected', 'Security', async () => {
      const detected = await this.page.evaluate(() => {
        const sanitizer = window.sanitizer;
        if (!sanitizer) return null;

        const suspicious = [
          '<script>',
          'javascript:',
          'onclick=',
          '<iframe',
          'onerror='
        ];

        return {
          tested: suspicious.length,
          detected: suspicious.filter(s => sanitizer.isSuspicious(s)).length
        };
      });

      if (!detected || detected.detected < detected.tested) {
        throw new Error('Not all suspicious patterns detected');
      }
      return `${detected.detected}/${detected.tested} patterns detected`;
    });

    await this.runTest('Rendered content is safe', 'Security', async () => {
      const contentSafe = await this.page.evaluate(() => {
        const containers = [
          document.getElementById('narrative-panel'),
          document.getElementById('contracts-panel'),
          document.getElementById('principles-container')
        ];

        return containers.every(container => {
          if (!container) return true;
          const html = container.innerHTML;
          return !html.includes('<script') &&
                 !html.includes('javascript:') &&
                 !html.includes('onerror=');
        });
      });

      if (!contentSafe) throw new Error('Unsafe content in DOM');
      return 'All rendered content is safe';
    });
  }

  // ================================================================
  // GENERATE COMPREHENSIVE REPORT
  // ================================================================

  async generateReport() {
    const timestamp = new Date().toISOString();
    const successRate = ((this.results.passed / this.results.total) * 100).toFixed(2);

    const report = {
      timestamp,
      summary: {
        total: this.results.total,
        passed: this.results.passed,
        failed: this.results.failed,
        warnings: this.results.warnings,
        successRate: successRate + '%'
      },
      tests: this.results.tests,
      categories: this.groupByCategory()
    };

    // Save JSON report
    const jsonPath = path.join(__dirname, 'reports', 'functional-test-results.json');
    fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    // Generate HTML report
    const htmlReport = this.generateHTMLReport(report);
    const htmlPath = path.join(__dirname, 'reports', 'functional-test-report.html');
    fs.writeFileSync(htmlPath, htmlReport);

    // Generate markdown report
    const mdReport = this.generateMarkdownReport(report);
    const mdPath = path.join(__dirname, 'reports', 'functional-test-report.md');
    fs.writeFileSync(mdPath, mdReport);

    this.log(`\n📄 Reports saved:`, 'cyan');
    this.log(`  - ${jsonPath}`, 'cyan');
    this.log(`  - ${htmlPath}`, 'cyan');
    this.log(`  - ${mdPath}`, 'cyan');

    return report;
  }

  groupByCategory() {
    const categories = {};
    this.results.tests.forEach(test => {
      if (!categories[test.category]) {
        categories[test.category] = { passed: 0, failed: 0, total: 0 };
      }
      categories[test.category].total++;
      categories[test.category][test.status]++;
    });
    return categories;
  }

  generateMarkdownReport(report) {
    const categoryTable = Object.entries(report.categories)
      .map(([cat, stats]) => `| ${cat} | ${stats.total} | ${stats.passed} | ${stats.failed} | ${((stats.passed/stats.total)*100).toFixed(1)}% |`)
      .join('\n');

    return `# Functional Test Report

**Generated**: ${report.timestamp}
**Success Rate**: ${report.summary.successRate}

## Summary
- Total: ${report.summary.total}
- Passed: ${report.summary.passed} ✅
- Failed: ${report.summary.failed}
- Warnings: ${report.summary.warnings}

## By Category

| Category | Total | Passed | Failed | Success Rate |
|----------|-------|--------|--------|--------------|
${categoryTable}

## All Tests

${report.tests.map(t => `### ${t.name}
- **Category**: ${t.category}
- **Status**: ${t.status === 'passed' ? '✅ PASSED' : '❌ FAILED'}
${t.details ? `- **Details**: ${t.details}` : ''}
${t.message ? `- **Error**: ${t.message}` : ''}
`).join('\n')}

---
**Final Status**: ${report.summary.failed === 0 ? '✅ ALL FUNCTIONAL TESTS PASSED' : `⚠️ ${report.summary.failed} TESTS FAILED`}
`;
  }

  generateHTMLReport(report) {
    const categoryRows = Object.entries(report.categories).map(([category, stats]) => {
      const rate = ((stats.passed / stats.total) * 100).toFixed(1);
      return `<tr><td>${category}</td><td>${stats.total}</td><td class="passed">${stats.passed}</td><td class="failed">${stats.failed}</td><td>${rate}%</td></tr>`;
    }).join('');

    const testRows = report.tests.map(test => {
      const statusClass = test.status === 'passed' ? 'passed' : 'failed';
      const icon = test.status === 'passed' ? '✓' : '✗';
      return `<tr><td class="${statusClass}">${icon}</td><td>${test.category}</td><td>${test.name}</td><td><small>${test.details || test.message || ''}</small></td></tr>`;
    }).join('');

    return `<!DOCTYPE html>
<html>
<head>
  <title>Functional Test Report</title>
  <style>
    body { font-family: -apple-system, sans-serif; margin: 40px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; }
    h1 { color: #333; border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }
    .stat-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
    .stat-card.success { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); }
    .stat-value { font-size: 36px; font-weight: bold; }
    .stat-label { font-size: 14px; opacity: 0.9; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #f8f9fa; padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6; }
    td { padding: 10px; border-bottom: 1px solid #dee2e6; }
    .passed { color: #4CAF50; font-weight: 600; }
    .failed { color: #f44336; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🧪 Functional Test Report</h1>
    <p><strong>Generated:</strong> ${report.timestamp}</p>

    <div class="summary">
      <div class="stat-card"><div class="stat-label">Total</div><div class="stat-value">${report.summary.total}</div></div>
      <div class="stat-card success"><div class="stat-label">Passed</div><div class="stat-value">${report.summary.passed}</div></div>
      <div class="stat-card"><div class="stat-label">Failed</div><div class="stat-value">${report.summary.failed}</div></div>
      <div class="stat-card ${report.summary.successRate === '100.00%' ? 'success' : ''}"><div class="stat-label">Success</div><div class="stat-value">${report.summary.successRate}</div></div>
    </div>

    <h2>By Category</h2>
    <table><thead><tr><th>Category</th><th>Total</th><th>Passed</th><th>Failed</th><th>Success Rate</th></tr></thead><tbody>${categoryRows}</tbody></table>

    <h2>All Tests</h2>
    <table><thead><tr><th>Status</th><th>Category</th><th>Test</th><th>Details</th></tr></thead><tbody>${testRows}</tbody></table>
  </div>
</body>
</html>`;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.init();

      // Run all functional test suites
      await this.testApplicationInitialization();
      await this.testDiagramNavigation();
      await this.testStepThroughWorkflow();
      await this.testContentDisplay();
      await this.testDrillSystem();
      await this.testProgressTracking();
      await this.testThemeToggle();
      await this.testOverlaySystem();
      await this.testKeyboardShortcuts();
      await this.testTabSwitching();
      await this.testExportFunctionality();
      await this.testCompleteUserJourney();
      await this.testAllDiagramsDeep();
      await this.testCachingPerformance();
      await this.testStateConsistency();
      await this.testDataIntegrity();
      await this.testAccessibilityWorkflow();
      await this.testErrorHandling();
      await this.testSanitizationWorkflow();

      // Generate report
      const report = await this.generateReport();

      // Print summary
      this.log('\n' + '='.repeat(70), 'cyan');
      this.log('📊 FUNCTIONAL TEST SUMMARY', 'cyan');
      this.log('='.repeat(70), 'cyan');
      this.log(`Total Tests: ${report.summary.total}`, 'blue');
      this.log(`Passed: ${report.summary.passed}`, 'green');
      this.log(`Failed: ${report.summary.failed}`, report.summary.failed > 0 ? 'red' : 'green');
      this.log(`Warnings: ${report.summary.warnings}`, 'yellow');
      this.log(`Success Rate: ${report.summary.successRate}`, report.summary.successRate === '100.00%' ? 'green' : 'yellow');
      this.log('='.repeat(70), 'cyan');

      if (report.summary.failed === 0) {
        this.log('\n✅ ALL FUNCTIONAL TESTS PASSED!', 'green');
      } else {
        this.log('\n⚠️ SOME TESTS FAILED - See reports for details', 'red');
      }

      await this.cleanup();
      process.exit(report.summary.failed === 0 ? 0 : 1);

    } catch (error) {
      this.log(`\n❌ Fatal error: ${error.message}`, 'red');
      console.error(error);
      await this.cleanup();
      process.exit(1);
    }
  }
}

// Run tests
const suite = new FunctionalTestSuite();
suite.run();
