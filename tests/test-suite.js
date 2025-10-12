#!/usr/bin/env node

/**
 * Comprehensive End-to-End Test Suite for GFS Visual Learning System
 *
 * This test suite simulates real user interactions and verifies:
 * - All spec fields are properly rendered
 * - Drills with thoughtProcess arrays work correctly
 * - First principles and advanced concepts display
 * - Interactive elements respond properly
 * - Screenshots capture every detail
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:8000/docs/index.html',
  screenshotDir: path.join(__dirname, 'screenshots/comprehensive'),
  reportDir: path.join(__dirname, 'reports'),
  viewport: { width: 1920, height: 1080 },
  timeout: 30000,
  headless: 'new', // Set to false for debugging
  slowMo: 50, // Slow down actions to be more human-like
};

// All specs to test
const SPEC_IDS = [
  '00-legend', '01-triangle', '02-scale', '03-chunk-size',
  '04-architecture', '05-planes', '06-read-path', '07-write-path',
  '08-lease', '09-consistency', '10-recovery', '11-evolution', '12-dna'
];

class GFSTestSuite {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      timestamp: new Date().toISOString(),
      specs: {},
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        errors: []
      }
    };
  }

  async setup() {
    console.log('🚀 Setting up test environment...\n');

    // Create directories
    [CONFIG.screenshotDir, CONFIG.reportDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    // Launch browser
    this.browser = await puppeteer.launch({
      headless: CONFIG.headless,
      slowMo: CONFIG.slowMo,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--window-size=1920,1080'
      ]
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport(CONFIG.viewport);

    // Setup error tracking
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        this.results.summary.errors.push({
          type: 'console',
          message: msg.text(),
          timestamp: new Date().toISOString()
        });
      }
    });

    this.page.on('pageerror', error => {
      this.results.summary.errors.push({
        type: 'javascript',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    });

    // Load the application
    console.log('📱 Loading GFS Visual Learning System...');
    await this.page.goto(CONFIG.baseUrl, {
      waitUntil: 'networkidle0',
      timeout: CONFIG.timeout
    });

    // Wait for app initialization
    await this.page.waitForSelector('.app', { timeout: CONFIG.timeout });
    await this.page.waitForTimeout(3000);

    console.log('✅ Application loaded successfully!\n');
  }

  async testSpec(specId) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Testing Spec: ${specId}`);
    console.log(`${'='.repeat(60)}\n`);

    const specResults = {
      id: specId,
      timestamp: new Date().toISOString(),
      tests: [],
      screenshots: [],
      errors: []
    };

    try {
      // Navigate to spec
      await this.navigateToSpec(specId);

      // Test 1: Main diagram rendering
      await this.testDiagramRendering(specId, specResults);

      // Test 2: Crystallized Insight
      await this.testCrystallizedInsight(specId, specResults);

      // Test 3: Prerequisites
      await this.testPrerequisites(specId, specResults);

      // Test 4: First Principles
      await this.testFirstPrinciples(specId, specResults);

      // Test 5: Advanced Concepts
      await this.testAdvancedConcepts(specId, specResults);

      // Test 6: Assessment Checkpoints
      await this.testAssessmentCheckpoints(specId, specResults);

      // Test 7: Drills with ThoughtProcess
      await this.testDrillsWithThoughtProcess(specId, specResults);

      // Test 8: Scene Navigation
      await this.testSceneNavigation(specId, specResults);

      // Test 9: Unified Navigation
      await this.testUnifiedNavigation(specId, specResults);

      // Test 10: Interactive Elements
      await this.testInteractiveElements(specId, specResults);

    } catch (error) {
      console.error(`❌ Critical error in ${specId}:`, error.message);
      specResults.errors.push({
        test: 'spec-execution',
        error: error.message,
        stack: error.stack
      });
    }

    this.results.specs[specId] = specResults;
    return specResults;
  }

  async navigateToSpec(specId) {
    console.log(`🔄 Navigating to ${specId}...`);

    // Click on the navigation item
    const navigated = await this.page.evaluate((id) => {
      const navItem = document.querySelector(`[data-diagram-id="${id}"]`);
      if (navItem) {
        navItem.click();
        return true;
      }
      // Fallback: try by text content
      const navItems = document.querySelectorAll('.nav-item');
      for (const item of navItems) {
        if (item.textContent.includes(id)) {
          item.click();
          return true;
        }
      }
      return false;
    }, specId);

    if (!navigated) {
      throw new Error(`Could not navigate to ${specId}`);
    }

    // Wait for diagram to load
    await this.page.waitForTimeout(2000);
    console.log(`✅ Navigated to ${specId}`);
  }

  async testDiagramRendering(specId, results) {
    console.log('🎨 Testing diagram rendering...');

    const test = { name: 'Diagram Rendering', passed: false, details: {} };

    try {
      const diagramInfo = await this.page.evaluate(() => {
        const container = document.querySelector('.diagram-container');
        const svg = container?.querySelector('svg');
        const mermaidDiagram = container?.querySelector('.mermaid');

        return {
          hasContainer: !!container,
          hasSvg: !!svg,
          hasMermaid: !!mermaidDiagram,
          svgDimensions: svg ? {
            width: svg.getAttribute('width'),
            height: svg.getAttribute('height'),
            viewBox: svg.getAttribute('viewBox')
          } : null,
          nodeCount: container?.querySelectorAll('.node').length || 0,
          edgeCount: container?.querySelectorAll('.edge').length || 0,
          containerDimensions: container ? {
            width: container.offsetWidth,
            height: container.offsetHeight
          } : null
        };
      });

      test.details = diagramInfo;
      test.passed = diagramInfo.hasContainer && (diagramInfo.hasSvg || diagramInfo.hasMermaid);

      // Take screenshot
      const screenshotPath = path.join(CONFIG.screenshotDir, `${specId}-01-diagram.png`);
      await this.page.screenshot({
        path: screenshotPath,
        fullPage: false,
        clip: await this.getElementBounds('.diagram-container')
      });

      results.screenshots.push({
        name: 'diagram',
        path: screenshotPath
      });

      console.log(`  ✅ Diagram: ${test.passed ? 'PASS' : 'FAIL'} - Nodes: ${diagramInfo.nodeCount}, Edges: ${diagramInfo.edgeCount}`);
    } catch (error) {
      test.error = error.message;
      console.log(`  ❌ Diagram: ERROR - ${error.message}`);
    }

    results.tests.push(test);
  }

  async testCrystallizedInsight(specId, results) {
    console.log('💎 Testing crystallized insight...');

    const test = { name: 'Crystallized Insight', passed: false, details: {} };

    try {
      const insightInfo = await this.page.evaluate(() => {
        const panel = document.querySelector('.insight-panel');
        const text = document.getElementById('crystallized-insight');

        return {
          hasPanel: !!panel,
          hasText: !!text,
          isVisible: panel ? window.getComputedStyle(panel).display !== 'none' : false,
          content: text?.textContent.trim() || '',
          contentLength: text?.textContent.trim().length || 0
        };
      });

      test.details = insightInfo;
      test.passed = insightInfo.hasText && insightInfo.contentLength > 0;

      if (insightInfo.isVisible) {
        const screenshotPath = path.join(CONFIG.screenshotDir, `${specId}-02-insight.png`);
        await this.page.screenshot({
          path: screenshotPath,
          fullPage: false,
          clip: await this.getElementBounds('.top-panels')
        });
        results.screenshots.push({
          name: 'insight',
          path: screenshotPath
        });
      }

      console.log(`  ${test.passed ? '✅' : '❌'} Insight: ${test.passed ? 'PASS' : 'FAIL'} - Length: ${insightInfo.contentLength} chars`);
    } catch (error) {
      test.error = error.message;
      console.log(`  ❌ Insight: ERROR - ${error.message}`);
    }

    results.tests.push(test);
  }

  async testPrerequisites(specId, results) {
    console.log('📚 Testing prerequisites...');

    const test = { name: 'Prerequisites', passed: false, details: {} };

    try {
      const prereqInfo = await this.page.evaluate(() => {
        const panel = document.getElementById('prerequisites-panel');
        const content = document.getElementById('prerequisites-content');

        if (!panel || !content) return { found: false };

        const concepts = content.querySelectorAll('.prereq-concepts li');
        const checkQuestion = content.querySelector('.prereq-check p');

        return {
          found: true,
          isVisible: window.getComputedStyle(panel).display !== 'none',
          conceptCount: concepts.length,
          concepts: Array.from(concepts).map(li => li.textContent.trim()),
          hasCheckQuestion: !!checkQuestion,
          checkQuestion: checkQuestion?.textContent.trim() || ''
        };
      });

      test.details = prereqInfo;
      test.passed = prereqInfo.found;

      console.log(`  ${test.passed ? '✅' : '❌'} Prerequisites: ${prereqInfo.conceptCount} concepts`);
    } catch (error) {
      test.error = error.message;
      console.log(`  ❌ Prerequisites: ERROR - ${error.message}`);
    }

    results.tests.push(test);
  }

  async testFirstPrinciples(specId, results) {
    console.log('🔬 Testing First Principles tab...');

    const test = { name: 'First Principles', passed: false, details: {} };

    try {
      // Click on Principles tab
      await this.page.evaluate(() => {
        const tab = document.querySelector('[data-tab="principles"]');
        if (tab) tab.click();
      });
      await this.page.waitForTimeout(500);

      const principlesInfo = await this.page.evaluate(() => {
        const container = document.getElementById('principles-container');
        if (!container) return { found: false };

        const content = container.textContent;
        const sections = container.querySelectorAll('.principle-section');

        return {
          found: true,
          isActive: container.classList.contains('active'),
          sectionCount: sections.length,
          hasTheoretical: content.includes('Theoretical Foundation') ||
                         content.includes('theoreticalFoundation'),
          hasQuantitative: content.includes('Quantitative Analysis') ||
                          content.includes('quantitativeAnalysis'),
          hasSystemDesign: content.includes('System Design') ||
                          content.includes('systemDesign'),
          contentLength: content.length,
          sections: Array.from(sections).map(s => ({
            title: s.querySelector('h4')?.textContent || '',
            hasContent: s.textContent.length > 50
          }))
        };
      });

      test.details = principlesInfo;
      test.passed = principlesInfo.found && principlesInfo.isActive &&
                   (principlesInfo.hasTheoretical || principlesInfo.hasQuantitative);

      // Take screenshot
      const screenshotPath = path.join(CONFIG.screenshotDir, `${specId}-03-principles.png`);
      await this.page.screenshot({
        path: screenshotPath,
        fullPage: false
      });
      results.screenshots.push({
        name: 'first-principles',
        path: screenshotPath
      });

      console.log(`  ${test.passed ? '✅' : '❌'} First Principles: ${principlesInfo.sectionCount} sections, ${principlesInfo.contentLength} chars`);
    } catch (error) {
      test.error = error.message;
      console.log(`  ❌ First Principles: ERROR - ${error.message}`);
    }

    results.tests.push(test);
  }

  async testAdvancedConcepts(specId, results) {
    console.log('🚀 Testing Advanced Concepts...');

    const test = { name: 'Advanced Concepts', passed: false, details: {} };

    try {
      // Still in Principles tab from previous test
      const advancedInfo = await this.page.evaluate(() => {
        const container = document.getElementById('principles-container');
        if (!container) return { found: false };

        const content = container.textContent;
        const advancedSection = container.querySelector('.advanced-section');

        return {
          found: !!advancedSection,
          hasAlternatives: content.includes('Alternative') ||
                          content.includes('alternatives'),
          hasModern: content.includes('Modern') ||
                    content.includes('modern'),
          hasOpenProblems: content.includes('Open Problems') ||
                          content.includes('openProblems'),
          contentLength: advancedSection?.textContent.length || 0
        };
      });

      test.details = advancedInfo;
      test.passed = advancedInfo.found && advancedInfo.contentLength > 0;

      console.log(`  ${test.passed ? '✅' : '❌'} Advanced Concepts: ${advancedInfo.contentLength} chars`);
    } catch (error) {
      test.error = error.message;
      console.log(`  ❌ Advanced Concepts: ERROR - ${error.message}`);
    }

    results.tests.push(test);
  }

  async testAssessmentCheckpoints(specId, results) {
    console.log('📋 Testing Assessment Checkpoints...');

    const test = { name: 'Assessment Checkpoints', passed: false, details: {} };

    try {
      // Click on Assessment tab
      await this.page.evaluate(() => {
        const tab = document.querySelector('[data-tab="assessment"]');
        if (tab) tab.click();
      });
      await this.page.waitForTimeout(500);

      const assessmentInfo = await this.page.evaluate(() => {
        const container = document.getElementById('assessment-container');
        if (!container) return { found: false };

        const checkpoints = container.querySelectorAll('.checkpoint-card');

        return {
          found: true,
          isActive: container.classList.contains('active'),
          checkpointCount: checkpoints.length,
          checkpoints: Array.from(checkpoints).map(cp => ({
            title: cp.querySelector('h4')?.textContent || '',
            hasCheck: !!cp.querySelector('.checkpoint-check'),
            hasMastery: !!cp.querySelector('.checkpoint-mastery')
          }))
        };
      });

      test.details = assessmentInfo;
      test.passed = assessmentInfo.found && assessmentInfo.checkpointCount > 0;

      // Take screenshot
      const screenshotPath = path.join(CONFIG.screenshotDir, `${specId}-04-assessment.png`);
      await this.page.screenshot({
        path: screenshotPath,
        fullPage: false
      });
      results.screenshots.push({
        name: 'assessment',
        path: screenshotPath
      });

      console.log(`  ${test.passed ? '✅' : '❌'} Assessment: ${assessmentInfo.checkpointCount} checkpoints`);
    } catch (error) {
      test.error = error.message;
      console.log(`  ❌ Assessment: ERROR - ${error.message}`);
    }

    results.tests.push(test);
  }

  async testDrillsWithThoughtProcess(specId, results) {
    console.log('🎯 Testing Drills with ThoughtProcess...');

    const test = { name: 'Drills with ThoughtProcess', passed: false, details: {} };

    try {
      // Click on Drills tab
      await this.page.evaluate(() => {
        const tab = document.querySelector('[data-tab="drills"]');
        if (tab) tab.click();
      });
      await this.page.waitForTimeout(500);

      const drillsInfo = await this.page.evaluate(() => {
        const container = document.getElementById('drills-container');
        if (!container) return { found: false };

        const drills = container.querySelectorAll('.drill');
        const drillData = [];

        // Expand first drill to test
        if (drills.length > 0) {
          const firstDrill = drills[0];
          const summary = firstDrill.querySelector('summary');
          if (summary) summary.click();

          // Wait a moment for expansion
          setTimeout(() => {}, 200);
        }

        for (const drill of drills) {
          const drillInfo = {
            prompt: drill.querySelector('.drill-prompt')?.textContent || '',
            hasAnswer: false,
            hasThoughtProcess: false,
            hasInsight: false,
            thoughtSteps: 0
          };

          // Check if drill is expanded
          if (drill.hasAttribute('open')) {
            const content = drill.querySelector('.drill-content');
            if (content) {
              // Simulate clicking "Show Answer" for first drill
              const showAnswer = content.querySelector('button.secondary');
              if (showAnswer && showAnswer.textContent.includes('Show Answer')) {
                showAnswer.click();
              }

              const feedback = content.querySelector('.drill-feedback');
              if (feedback) {
                drillInfo.hasAnswer = !!feedback.querySelector('.correct-answer');
                drillInfo.hasThoughtProcess = !!feedback.querySelector('.thought-process');
                drillInfo.hasInsight = !!feedback.querySelector('.drill-insight');

                const thoughtSteps = feedback.querySelectorAll('.thought-steps li');
                drillInfo.thoughtSteps = thoughtSteps.length;
              }
            }
          }

          drillData.push(drillInfo);
        }

        return {
          found: true,
          isActive: container.classList.contains('active'),
          drillCount: drills.length,
          drills: drillData,
          hasRecallDrills: container.textContent.includes('Recall'),
          hasApplicationDrills: container.textContent.includes('Application'),
          hasAnalysisDrills: container.textContent.includes('Analysis')
        };
      });

      test.details = drillsInfo;

      // Check if at least one drill has thoughtProcess
      const hasThoughtProcess = drillsInfo.drills.some(d => d.hasThoughtProcess);
      const hasInsights = drillsInfo.drills.some(d => d.hasInsight);

      test.passed = drillsInfo.found && drillsInfo.drillCount > 0 &&
                   (hasThoughtProcess || hasInsights);

      // Take screenshot with expanded drill
      const screenshotPath = path.join(CONFIG.screenshotDir, `${specId}-05-drills.png`);
      await this.page.screenshot({
        path: screenshotPath,
        fullPage: false
      });
      results.screenshots.push({
        name: 'drills',
        path: screenshotPath
      });

      // Test interactive drill - type answer and check
      if (drillsInfo.drillCount > 0) {
        await this.testDrillInteraction(specId, results);
      }

      console.log(`  ${test.passed ? '✅' : '❌'} Drills: ${drillsInfo.drillCount} drills, ThoughtProcess: ${hasThoughtProcess}, Insights: ${hasInsights}`);
    } catch (error) {
      test.error = error.message;
      console.log(`  ❌ Drills: ERROR - ${error.message}`);
    }

    results.tests.push(test);
  }

  async testDrillInteraction(specId, results) {
    console.log('  🖱️ Testing drill interaction...');

    try {
      const interaction = await this.page.evaluate(() => {
        const container = document.getElementById('drills-container');
        const firstDrill = container?.querySelector('.drill[open]');

        if (!firstDrill) return { tested: false };

        const textarea = firstDrill.querySelector('textarea');
        const checkButton = firstDrill.querySelector('button:not(.secondary)');

        if (textarea && checkButton) {
          // Type an answer
          textarea.value = 'Test answer for automated testing';
          textarea.dispatchEvent(new Event('input', { bubbles: true }));

          // Click check button
          checkButton.click();

          // Check if feedback appeared
          const feedback = firstDrill.querySelector('.drill-feedback');
          const isVisible = feedback && window.getComputedStyle(feedback).display !== 'none';

          return {
            tested: true,
            feedbackVisible: isVisible,
            hasThoughtProcess: !!feedback?.querySelector('.thought-process'),
            thoughtStepCount: feedback?.querySelectorAll('.thought-steps li').length || 0
          };
        }

        return { tested: false };
      });

      if (interaction.tested) {
        // Take screenshot of interaction result
        const screenshotPath = path.join(CONFIG.screenshotDir, `${specId}-06-drill-interaction.png`);
        await this.page.screenshot({
          path: screenshotPath,
          fullPage: false,
          clip: await this.getElementBounds('.drill[open]')
        });
        results.screenshots.push({
          name: 'drill-interaction',
          path: screenshotPath
        });

        console.log(`    ✅ Interaction: Feedback visible with ${interaction.thoughtStepCount} thought steps`);
      }
    } catch (error) {
      console.log(`    ❌ Interaction test failed: ${error.message}`);
    }
  }

  async testSceneNavigation(specId, results) {
    console.log('🎬 Testing scene navigation...');

    const test = { name: 'Scene Navigation', passed: false, details: {} };

    try {
      const sceneInfo = await this.page.evaluate(() => {
        const stateManager = window.viewer?.stateManager;
        if (!stateManager) return { found: false };

        const controls = document.getElementById('state-controls');
        const timeline = controls?.querySelector('.state-timeline');

        return {
          found: true,
          sceneCount: stateManager.states.length,
          currentIndex: stateManager.currentStateIndex,
          currentScene: stateManager.getCurrentState()?.id,
          hasControls: !!controls,
          hasTimeline: !!timeline,
          hasPrevButton: !!controls?.querySelector('.state-prev'),
          hasNextButton: !!controls?.querySelector('.state-next'),
          hasPlayButton: !!controls?.querySelector('.state-play')
        };
      });

      test.details = sceneInfo;
      test.passed = sceneInfo.found && sceneInfo.sceneCount > 0;

      // Navigate through scenes and capture screenshots
      if (sceneInfo.sceneCount > 1) {
        console.log(`  📸 Capturing ${Math.min(3, sceneInfo.sceneCount)} scenes...`);

        for (let i = 0; i < Math.min(3, sceneInfo.sceneCount - 1); i++) {
          await this.page.evaluate(() => {
            window.viewer?.stateManager?.next();
          });
          await this.page.waitForTimeout(1000);

          const screenshotPath = path.join(CONFIG.screenshotDir, `${specId}-scene-${i + 2}.png`);
          await this.page.screenshot({
            path: screenshotPath,
            fullPage: false
          });
          results.screenshots.push({
            name: `scene-${i + 2}`,
            path: screenshotPath
          });
        }

        // Reset to first scene
        await this.page.evaluate(() => {
          window.viewer?.stateManager?.goToState(0);
        });
      }

      console.log(`  ${test.passed ? '✅' : '❌'} Scenes: ${sceneInfo.sceneCount} scenes available`);
    } catch (error) {
      test.error = error.message;
      console.log(`  ❌ Scenes: ERROR - ${error.message}`);
    }

    results.tests.push(test);
  }

  async testUnifiedNavigation(specId, results) {
    console.log('🧭 Testing state navigation...');

    const test = { name: 'State Navigation', passed: false, details: {} };

    try {
      // Test state navigation functionality
      const navInfo = await this.page.evaluate(() => {
        const stateManager = window.viewer?.stateManager;
        const currentDiagramId = window.viewer?.currentDiagramId;
        const stateControls = document.getElementById('state-controls');
        const prevBtn = stateControls?.querySelector('.state-prev');
        const nextBtn = stateControls?.querySelector('.state-next');

        if (!stateManager) return { found: false, error: 'State manager not found' };

        return {
          found: true,
          hasStateControls: !!stateControls,
          prevDisabled: prevBtn?.disabled || prevBtn?.classList.contains('disabled'),
          nextDisabled: nextBtn?.disabled || nextBtn?.classList.contains('disabled'),
          currentDiagramId: currentDiagramId,
          currentStateIndex: stateManager.currentStateIndex,
          totalStates: stateManager.states?.length || 0,
          currentState: stateManager.getCurrentState()?.caption || ''
        };
      });

      test.details = navInfo;
      test.passed = navInfo.found &&
                   navInfo.hasStateControls &&
                   navInfo.totalStates > 0;

      // Test navigation continuity
      if (navInfo.found && !navInfo.nextDisabled) {
        console.log('  🔄 Testing navigation continuity...');

        const beforeNav = navInfo.currentStateIndex;

        // Navigate forward using state manager
        const moved = await this.page.evaluate(() => {
          return window.viewer?.stateManager?.next();
        });
        await this.page.waitForTimeout(500);

        const afterNav = await this.page.evaluate(() => {
          return window.viewer?.stateManager?.currentStateIndex;
        });

        const navWorked = moved && afterNav > beforeNav;
        test.details.continuityTest = {
          beforeIndex: beforeNav,
          afterIndex: afterNav,
          worked: navWorked
        };

        // Navigate back
        await this.page.evaluate(() => {
          window.viewer?.stateManager?.previous();
        });
        await this.page.waitForTimeout(500);

        console.log(`    ${navWorked ? '✅' : '❌'} Navigation continuity: state ${beforeNav} → ${afterNav}`);
      }

      // Test state exhaustion (navigating through all states)
      if (navInfo.totalStates > 1) {
        console.log('  🔄 Testing state exhaustion...');

        const startDiagram = navInfo.currentDiagramId;
        let statesNavigated = 0;

        // Navigate through states in current diagram
        for (let i = 0; i < navInfo.totalStates; i++) {
          const canContinue = await this.page.evaluate(() => {
            const stateManager = window.viewer?.stateManager;
            return stateManager && stateManager.currentStateIndex < stateManager.states.length - 1;
          });

          if (!canContinue) break;

          const moved = await this.page.evaluate(() => {
            return window.viewer?.stateManager?.next();
          });

          if (moved) {
            statesNavigated++;
            await this.page.waitForTimeout(100);
          } else {
            break;
          }
        }

        test.details.stateExhaustion = {
          statesNavigated,
          totalStates: navInfo.totalStates
        };
        console.log(`    ✅ Navigated through ${statesNavigated} states`);

        // Navigate back to original spec
        await this.navigateToSpec(specId);
        await this.page.waitForTimeout(500);
      }

      // Take screenshot of navigation controls
      const screenshotPath = path.join(CONFIG.screenshotDir, `${specId}-07-unified-nav.png`);
      const controlsBounds = await this.getElementBounds('#state-controls');

      if (controlsBounds) {
        await this.page.screenshot({
          path: screenshotPath,
          fullPage: false,
          clip: controlsBounds
        });
      } else {
        await this.page.screenshot({
          path: screenshotPath,
          fullPage: false
        });
      }

      results.screenshots.push({
        name: 'state-navigation',
        path: screenshotPath
      });

      console.log(`  ${test.passed ? '✅' : '❌'} State Navigation: ${navInfo.totalStates} total states, Current: ${navInfo.currentStateIndex}`);
    } catch (error) {
      test.error = error.message;
      console.log(`  ❌ Unified Navigation: ERROR - ${error.message}`);
    }

    results.tests.push(test);
  }

  async testInteractiveElements(specId, results) {
    console.log('🔧 Testing interactive elements...');

    const test = { name: 'Interactive Elements', passed: false, details: {} };

    try {
      const interactive = await this.page.evaluate(() => {
        // Test various interactive elements
        const results = {
          stateControls: {
            prevButton: !!document.querySelector('.state-prev'),
            nextButton: !!document.querySelector('.state-next'),
            playButton: !!document.querySelector('.state-play'),
            speedControl: !!document.querySelector('.speed-control')
          },
          tabs: {
            drillsTab: !!document.querySelector('[data-tab="drills"]'),
            principlesTab: !!document.querySelector('[data-tab="principles"]'),
            assessmentTab: !!document.querySelector('[data-tab="assessment"]')
          },
          navigation: {
            navItems: document.querySelectorAll('[data-diagram-id]').length,
            hasNavigation: !!document.getElementById('diagram-nav')
          },
          overlays: {
            hasOverlays: !!document.querySelector('.overlay-chip'),
            overlayCount: document.querySelectorAll('.overlay-chip').length,
            hasLayerIndicators: document.querySelectorAll('.layer-indicator').length > 0
          }
        };

        // Count total interactive elements found
        let totalInteractive = 0;
        totalInteractive += Object.values(results.stateControls).filter(Boolean).length;
        totalInteractive += Object.values(results.tabs).filter(Boolean).length;
        totalInteractive += results.navigation.hasNavigation ? 1 : 0;
        totalInteractive += results.overlays.hasOverlays ? 1 : 0;

        results.totalInteractive = totalInteractive;
        results.summary = {
          stateControls: Object.values(results.stateControls).filter(Boolean).length,
          tabs: Object.values(results.tabs).filter(Boolean).length,
          navigation: results.navigation.navItems,
          overlays: results.overlays.overlayCount
        };

        return results;
      });

      test.details = interactive;
      // Expect at least state controls and tabs
      test.passed = interactive.summary.stateControls >= 2 && interactive.summary.tabs >= 2;

      if (test.passed) {
        console.log(`  ✅ Interactive: ${interactive.totalInteractive} elements found`);
        console.log(`     State controls: ${interactive.summary.stateControls}, Tabs: ${interactive.summary.tabs}`);
        console.log(`     Navigation items: ${interactive.summary.navigation}, Overlays: ${interactive.summary.overlays}`);
      } else {
        console.log(`  ❌ Interactive: Missing critical elements`);
        console.log(`     State controls: ${interactive.summary.stateControls} (need 2+), Tabs: ${interactive.summary.tabs} (need 2+)`);
      }
    } catch (error) {
      test.error = error.message;
      console.log(`  ❌ Interactive: ERROR - ${error.message}`);
    }

    results.tests.push(test);
  }

  async getElementBounds(selector) {
    try {
      return await this.page.evaluate((sel) => {
        const element = document.querySelector(sel);
        if (!element) return null;
        const rect = element.getBoundingClientRect();

        // Ensure width and height are positive for screenshots
        if (rect.width <= 0 || rect.height <= 0) {
          return null;
        }

        return {
          x: Math.max(0, rect.left),
          y: Math.max(0, rect.top),
          width: Math.max(1, Math.round(rect.width)),
          height: Math.max(1, Math.round(rect.height))
        };
      }, selector);
    } catch {
      return null;
    }
  }

  async generateReport() {
    console.log('\n📊 Generating comprehensive test report...\n');

    // Calculate statistics
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    Object.values(this.results.specs).forEach(spec => {
      spec.tests.forEach(test => {
        totalTests++;
        if (test.passed) passedTests++;
        else failedTests++;
      });
    });

    this.results.summary.total = totalTests;
    this.results.summary.passed = passedTests;
    this.results.summary.failed = failedTests;

    // Generate HTML Report
    const htmlReport = this.generateHTMLReport();
    const htmlPath = path.join(CONFIG.reportDir, 'test-report.html');
    fs.writeFileSync(htmlPath, htmlReport);

    // Generate Markdown Report
    const mdReport = this.generateMarkdownReport();
    const mdPath = path.join(CONFIG.reportDir, 'test-report.md');
    fs.writeFileSync(mdPath, mdReport);

    // Generate JSON Report
    const jsonPath = path.join(CONFIG.reportDir, 'test-results.json');
    fs.writeFileSync(jsonPath, JSON.stringify(this.results, null, 2));

    // Print summary to console
    console.log('=' .repeat(60));
    console.log('📈 TEST SUMMARY');
    console.log('=' .repeat(60));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} (${((passedTests/totalTests)*100).toFixed(1)}%)`);
    console.log(`Failed: ${failedTests} (${((failedTests/totalTests)*100).toFixed(1)}%)`);
    console.log(`Errors: ${this.results.summary.errors.length}`);
    console.log('\n📁 Reports generated:');
    console.log(`  HTML: ${htmlPath}`);
    console.log(`  Markdown: ${mdPath}`);
    console.log(`  JSON: ${jsonPath}`);
    console.log(`  Screenshots: ${CONFIG.screenshotDir}`);
    console.log('=' .repeat(60));
  }

  generateHTMLReport() {
    const passRate = ((this.results.summary.passed / this.results.summary.total) * 100).toFixed(1);

    let html = `<!DOCTYPE html>
<html>
<head>
  <title>GFS Visual Learning - E2E Test Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; background: #f5f5f5; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; }
    h1 { margin: 0; font-size: 2em; }
    .timestamp { opacity: 0.9; margin-top: 10px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
    .stat-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .stat-value { font-size: 2em; font-weight: bold; color: #333; }
    .stat-label { color: #666; margin-top: 5px; }
    .spec-card { background: white; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden; }
    .spec-header { padding: 15px 20px; background: #f8f9fa; border-bottom: 1px solid #e9ecef; display: flex; justify-content: space-between; align-items: center; }
    .spec-title { font-size: 1.2em; font-weight: 600; }
    .spec-stats { display: flex; gap: 15px; }
    .spec-body { padding: 20px; }
    .test-item { display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
    .test-item:last-child { border-bottom: none; }
    .test-status { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; }
    .test-status.pass { background: #28a745; color: white; }
    .test-status.fail { background: #dc3545; color: white; }
    .test-name { flex: 1; font-weight: 500; }
    .test-details { color: #666; font-size: 0.9em; }
    .screenshots { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; margin-top: 15px; }
    .screenshot { background: #f8f9fa; padding: 10px; border-radius: 4px; text-align: center; font-size: 0.85em; }
    .error-section { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin-top: 20px; }
    .error-item { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
    .progress-bar { width: 100%; height: 30px; background: #e9ecef; border-radius: 15px; overflow: hidden; margin-top: 10px; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, #28a745, #20c997); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎯 GFS Visual Learning - E2E Test Report</h1>
    <div class="timestamp">Generated: ${this.results.timestamp}</div>
  </div>

  <div class="summary">
    <div class="stat-card">
      <div class="stat-value">${this.results.summary.total}</div>
      <div class="stat-label">Total Tests</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" style="color: #28a745">${this.results.summary.passed}</div>
      <div class="stat-label">Passed</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" style="color: #dc3545">${this.results.summary.failed}</div>
      <div class="stat-label">Failed</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" style="color: #ffc107">${this.results.summary.errors.length}</div>
      <div class="stat-label">Errors</div>
    </div>
  </div>

  <div class="progress-bar">
    <div class="progress-fill" style="width: ${passRate}%">${passRate}% Pass Rate</div>
  </div>

  <h2 style="margin-top: 40px;">Test Results by Specification</h2>
`;

    // Add results for each spec
    Object.entries(this.results.specs).forEach(([specId, spec]) => {
      const specPassed = spec.tests.filter(t => t.passed).length;
      const specTotal = spec.tests.length;

      html += `
  <div class="spec-card">
    <div class="spec-header">
      <div class="spec-title">${specId}</div>
      <div class="spec-stats">
        <span style="color: #28a745">✓ ${specPassed}</span>
        <span style="color: #dc3545">✗ ${specTotal - specPassed}</span>
        <span style="color: #666">Total: ${specTotal}</span>
      </div>
    </div>
    <div class="spec-body">
`;

      // Add test results
      spec.tests.forEach(test => {
        const icon = test.passed ? '✓' : '✗';
        const statusClass = test.passed ? 'pass' : 'fail';

        html += `
      <div class="test-item">
        <div class="test-status ${statusClass}">${icon}</div>
        <div class="test-name">${test.name}</div>
        <div class="test-details">${this.getTestDetails(test)}</div>
      </div>
`;
      });

      // Add screenshots
      if (spec.screenshots.length > 0) {
        html += `
      <div class="screenshots">
`;
        spec.screenshots.forEach(ss => {
          html += `        <div class="screenshot">📸 ${ss.name}</div>\n`;
        });
        html += `      </div>\n`;
      }

      // Add errors if any
      if (spec.errors.length > 0) {
        html += `
      <div class="error-section">
        <strong>Errors:</strong>
`;
        spec.errors.forEach(error => {
          html += `        <div class="error-item">${error.test}: ${error.error}</div>\n`;
        });
        html += `      </div>\n`;
      }

      html += `    </div>\n  </div>\n`;
    });

    // Add global errors
    if (this.results.summary.errors.length > 0) {
      html += `
  <div class="error-section" style="margin-top: 30px;">
    <h3>Console & JavaScript Errors</h3>
`;
      this.results.summary.errors.forEach(error => {
        html += `    <div class="error-item">[${error.type}] ${error.message}</div>\n`;
      });
      html += `  </div>\n`;
    }

    html += `
</body>
</html>`;

    return html;
  }

  generateMarkdownReport() {
    let md = `# GFS Visual Learning - E2E Test Report\n\n`;
    md += `**Generated:** ${this.results.timestamp}\n\n`;
    md += `## Summary\n\n`;
    md += `- **Total Tests:** ${this.results.summary.total}\n`;
    md += `- **Passed:** ${this.results.summary.passed} ✅\n`;
    md += `- **Failed:** ${this.results.summary.failed} ❌\n`;
    md += `- **Pass Rate:** ${((this.results.summary.passed / this.results.summary.total) * 100).toFixed(1)}%\n`;
    md += `- **Errors:** ${this.results.summary.errors.length}\n\n`;

    md += `## Detailed Results\n\n`;

    Object.entries(this.results.specs).forEach(([specId, spec]) => {
      const specPassed = spec.tests.filter(t => t.passed).length;
      const specTotal = spec.tests.length;
      const status = specPassed === specTotal ? '✅' : (specPassed > 0 ? '⚠️' : '❌');

      md += `### ${status} ${specId} (${specPassed}/${specTotal})\n\n`;

      spec.tests.forEach(test => {
        const icon = test.passed ? '✅' : '❌';
        md += `- ${icon} **${test.name}**: ${this.getTestDetails(test)}\n`;
      });

      if (spec.screenshots.length > 0) {
        md += `\n**Screenshots:** ${spec.screenshots.map(s => s.name).join(', ')}\n`;
      }

      if (spec.errors.length > 0) {
        md += `\n**Errors:**\n`;
        spec.errors.forEach(error => {
          md += `- ${error.test}: ${error.error}\n`;
        });
      }

      md += `\n`;
    });

    if (this.results.summary.errors.length > 0) {
      md += `## Console & JavaScript Errors\n\n`;
      this.results.summary.errors.forEach(error => {
        md += `- [${error.type}] ${error.message}\n`;
      });
    }

    return md;
  }

  getTestDetails(test) {
    if (!test.details) {
      if (test.error) {
        return `ERROR: ${test.error}`;
      }
      return test.passed ? 'PASS' : 'FAIL';
    }

    const details = [];

    // Add error first if present
    if (test.error) {
      details.push(`ERROR: ${test.error}`);
    }

    // Content-related details
    if (test.details.contentLength !== undefined) {
      details.push(`${test.details.contentLength} chars`);
    }
    if (test.details.drillCount !== undefined) {
      details.push(`${test.details.drillCount} drills`);
    }
    if (test.details.sceneCount !== undefined) {
      details.push(`${test.details.sceneCount} scenes`);
    }
    if (test.details.checkpointCount !== undefined) {
      details.push(`${test.details.checkpointCount} checkpoints`);
    }
    if (test.details.nodeCount !== undefined) {
      details.push(`${test.details.nodeCount} nodes`);
    }

    // State management details
    if (test.details.totalStates !== undefined) {
      details.push(`${test.details.totalStates} states`);
    }
    if (test.details.currentStateIndex !== undefined) {
      details.push(`current: ${test.details.currentStateIndex}`);
    }

    // Navigation test results
    if (test.details.continuityTest) {
      const ct = test.details.continuityTest;
      if (ct.worked) {
        details.push(`✓ continuity (${ct.beforeIndex} → ${ct.afterIndex})`);
      } else {
        details.push(`✗ continuity failed`);
      }
    }
    if (test.details.stateExhaustion) {
      const se = test.details.stateExhaustion;
      details.push(`navigated ${se.statesNavigated}/${se.totalStates} states`);
    }

    // Interactive elements
    if (test.details.summary) {
      const s = test.details.summary;
      details.push(`controls: ${s.stateControls}, tabs: ${s.tabs}, nav: ${s.navigation}`);
    }

    // Missing features
    if (test.details.found === false) {
      details.push(`NOT FOUND${test.details.error ? ': ' + test.details.error : ''}`);
    }

    return details.length > 0 ? details.join(', ') : (test.passed ? 'PASS' : 'FAIL');
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up...');

    if (this.browser) {
      await this.browser.close();
    }

    console.log('✅ Test suite completed!\n');
  }

  async run() {
    try {
      await this.setup();

      // Test all specs
      for (const specId of SPEC_IDS) {
        await this.testSpec(specId);
      }

      await this.generateReport();

    } catch (error) {
      console.error('❌ Fatal error:', error);
      this.results.summary.errors.push({
        type: 'fatal',
        message: error.message,
        stack: error.stack
      });
    } finally {
      await this.cleanup();
    }

    return this.results;
  }
}

// Main execution
if (require.main === module) {
  const suite = new GFSTestSuite();

  suite.run()
    .then(results => {
      const exitCode = results.summary.failed > 0 || results.summary.errors.length > 0 ? 1 : 0;
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

module.exports = GFSTestSuite;