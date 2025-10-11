/**
 * GFS Visual Learning System - Modular Version
 * Main application module that integrates all components
 */

// Import modules
import { DiagramValidator, ValidationError } from './modules/validation.js';
import { DrillSystem } from './modules/drills.js';
import { StepThroughEngine } from './modules/step-through.js';
import { ExportManager } from './modules/export-manager.js';
// StateManager is loaded separately as it doesn't export ES6 modules yet

// Main GFS Viewer Application
class GFSViewer {
  constructor() {
    this.currentDiagramId = null;
    this.currentSpec = null;
    this.renderer = null;
    this.validator = new DiagramValidator();
    this.drillSystem = new DrillSystem();
    this.stepThrough = null;
    this.exportManager = new ExportManager(this);
    this.stateManager = null;
    this.diagramCache = new Map();
  }

  async initialize() {
    console.log('🚀 Initializing GFS Visual Learning System...');

    // Initialize Mermaid
    if (typeof mermaid !== 'undefined') {
      mermaid.initialize({
        startOnLoad: false,
        theme: localStorage.getItem('theme') === 'dark' ? 'dark' : 'default',
        themeVariables: {
          primaryColor: '#667eea',
          primaryTextColor: '#fff',
          primaryBorderColor: '#764ba2',
          lineColor: '#667eea',
          secondaryColor: '#f3f4f6',
          tertiaryColor: '#e5e7eb'
        }
      });
    }

    // Initialize StateManager if available
    if (typeof StateManager !== 'undefined') {
      this.stateManager = new StateManager();
    }

    // Initialize StepThrough engine
    this.stepThrough = new StepThroughEngine(this, null);

    // Set up event listeners
    this.setupEventListeners();

    // Load initial diagram from URL or default
    const urlParams = new URLSearchParams(window.location.search);
    const diagramId = urlParams.get('d') || '00-legend';
    await this.loadDiagram(diagramId);

    console.log('✅ GFS Viewer initialized');
  }

  setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const diagramId = item.dataset.diagram;
        if (diagramId) {
          this.loadDiagram(diagramId);
        }
      });
    });

    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    // Help button
    const helpBtn = document.getElementById('help-btn');
    if (helpBtn) {
      helpBtn.addEventListener('click', () => this.showHelp());
    }

    // Export button
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportManager.showExportModal());
    }

    // Tab switching
    document.querySelectorAll('[data-tab]').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabName = e.target.dataset.tab;
        this.switchTab(tabName);
      });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'e':
            e.preventDefault();
            this.exportManager.showExportModal();
            break;
          case 'h':
            e.preventDefault();
            this.showHelp();
            break;
          case 'd':
            e.preventDefault();
            this.toggleTheme();
            break;
        }
      }
    });
  }

  async loadDiagram(diagramId, spec = null) {
    try {
      console.log(`📊 Loading diagram: ${diagramId}`);

      // Check cache first
      if (!spec && this.diagramCache.has(diagramId)) {
        spec = this.diagramCache.get(diagramId);
      }

      // Load spec if not provided
      if (!spec) {
        const response = await fetch(`/data/specs/${diagramId}.json`);
        if (!response.ok) {
          throw new Error(`Failed to load diagram: ${response.statusText}`);
        }
        spec = await response.json();
        this.diagramCache.set(diagramId, spec);
      }

      // Validate spec
      const validationResult = this.validator.validate(spec);
      if (!validationResult.valid) {
        console.warn('Validation warnings:', validationResult.warnings);
      }

      // Store current diagram info
      this.currentDiagramId = diagramId;
      this.currentSpec = spec;

      // Update URL without reload
      const url = new URL(window.location);
      url.searchParams.set('d', diagramId);
      window.history.pushState({}, '', url);

      // Update UI
      this.updateNavigation(diagramId);
      await this.renderDiagram(spec);
      this.renderNarrative(spec);
      this.renderContracts(spec);
      this.renderFirstPrinciples(spec);
      this.renderPrerequisites(spec);
      this.renderAssessments(spec);
      this.renderCrystallizedInsight(spec);

      // Initialize interactive components
      if (spec.drills) {
        this.drillSystem.renderDrills(spec);
      }

      if (spec.stepThrough && this.stepThrough) {
        this.stepThrough.initialize(spec);
        this.renderStepControls();
      }

      if (this.stateManager && spec.stateDescription) {
        this.stateManager.initialize(spec.stateDescription);
        this.renderStateControls();
      }

      console.log(`✅ Diagram loaded: ${diagramId}`);
    } catch (error) {
      console.error('❌ Failed to load diagram:', error);
      this.showError(`Failed to load diagram: ${error.message}`);
    }
  }

  async renderDiagram(spec) {
    const container = document.getElementById('diagram-container');
    if (!container) {
      console.warn('Diagram container not found');
      return;
    }

    container.innerHTML = '<div class="loading">Rendering diagram...</div>';

    try {
      if (spec.mermaid && typeof mermaid !== 'undefined') {
        const { svg } = await mermaid.render('mermaid-diagram', spec.mermaid);
        container.innerHTML = svg;
      } else {
        container.innerHTML = '<div class="no-diagram">No diagram available</div>';
      }
    } catch (error) {
      console.error('Mermaid rendering error:', error);
      container.innerHTML = `<div class="error">Failed to render diagram: ${error.message}</div>`;
    }
  }

  renderNarrative(spec) {
    const container = document.getElementById('narrative-container');
    if (!container || !spec.narrative) return;

    let html = '';
    if (typeof spec.narrative === 'string') {
      html = `<p>${spec.narrative}</p>`;
    } else if (typeof spec.narrative === 'object') {
      html = `
        <div class="narrative-section">
          <h3>Introduction</h3>
          <p>${spec.narrative.introduction || ''}</p>
        </div>
        <div class="narrative-section">
          <h3>What It Solves</h3>
          <p>${spec.narrative.whatItSolves || ''}</p>
        </div>
        <div class="narrative-section">
          <h3>How It Works</h3>
          <p>${spec.narrative.howItWorks || ''}</p>
        </div>
      `;
    }

    container.innerHTML = html;
  }

  renderContracts(spec) {
    const container = document.getElementById('contracts-container');
    if (!container || !spec.contracts) return;

    const contracts = spec.contracts;
    let html = `
      <div class="contract-section">
        <p class="contract-description">${contracts.description || ''}</p>
      </div>
    `;

    if (contracts.assumptions?.length > 0) {
      html += `
        <div class="contract-section">
          <h4>Assumptions</h4>
          <ul class="contract-list">
            ${contracts.assumptions.map(a => `<li>${a}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    if (contracts.invariants?.length > 0) {
      html += `
        <div class="contract-section">
          <h4>Invariants</h4>
          <ul class="contract-list">
            ${contracts.invariants.map(i => `<li>${i}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    if (contracts.postconditions?.length > 0) {
      html += `
        <div class="contract-section">
          <h4>Postconditions</h4>
          <ul class="contract-list">
            ${contracts.postconditions.map(p => `<li>${p}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    container.innerHTML = html;
  }

  renderFirstPrinciples(spec) {
    const container = document.getElementById('principles-container');
    if (!container || !spec.firstPrinciples) return;

    let html = '';

    // Render thinking steps
    if (spec.firstPrinciples.thinking?.length > 0) {
      html += '<div class="principles-section">';
      spec.firstPrinciples.thinking.forEach(item => {
        html += `
          <div class="accordion-item">
            <button class="accordion-header" onclick="this.classList.toggle('active'); this.nextElementSibling.classList.toggle('show')">
              <span class="step-number">Step ${item.step}</span>
              <span class="principle-title">${item.principle}</span>
              <span class="accordion-icon">▼</span>
            </button>
            <div class="accordion-content">
              <p>${item.explanation}</p>
              ${item.details ? `<div class="principle-details">${item.details}</div>` : ''}
            </div>
          </div>
        `;
      });
      html += '</div>';
    }

    // Render advanced concepts if present
    if (spec.firstPrinciples.advanced?.length > 0) {
      html += `
        <div class="advanced-concepts">
          <h4>Advanced Concepts</h4>
          <div class="concepts-grid">
            ${spec.firstPrinciples.advanced.map(concept => `
              <div class="concept-card">
                <h5>${concept.concept}</h5>
                <p>${concept.explanation}</p>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    container.innerHTML = html;
  }

  renderPrerequisites(spec) {
    const container = document.getElementById('prerequisites-container');
    if (!container || !spec.prerequisites) return;

    let html = '<ul class="prerequisites-list">';
    spec.prerequisites.forEach(prereq => {
      html += `<li>${prereq}</li>`;
    });
    html += '</ul>';

    container.innerHTML = html;
  }

  renderAssessments(spec) {
    const container = document.getElementById('assessment-container');
    if (!container || !spec.assessments) return;

    let html = '';

    // Render conceptual questions
    if (spec.assessments.conceptual?.length > 0) {
      html += '<div class="assessment-section">';
      html += '<h4>Conceptual Questions</h4>';
      spec.assessments.conceptual.forEach((q, i) => {
        html += `
          <div class="assessment-item">
            <div class="question">
              <strong>Q${i + 1}:</strong> ${q.question}
            </div>
            <div class="answer hidden" id="answer-${i}">
              <strong>A:</strong> ${q.answer}
            </div>
            <button class="reveal-btn" onclick="document.getElementById('answer-${i}').classList.toggle('hidden')">
              Toggle Answer
            </button>
          </div>
        `;
      });
      html += '</div>';
    }

    // Render practical scenarios
    if (spec.assessments.practical?.length > 0) {
      html += '<div class="assessment-section">';
      html += '<h4>Practical Scenarios</h4>';
      spec.assessments.practical.forEach((scenario, i) => {
        html += `
          <div class="scenario-item">
            <h5>Scenario ${i + 1}: ${scenario.scenario}</h5>
            <p class="task"><strong>Task:</strong> ${scenario.task}</p>
            <div class="solution hidden" id="solution-${i}">
              <strong>Solution:</strong> ${scenario.solution}
            </div>
            <button class="reveal-btn" onclick="document.getElementById('solution-${i}').classList.toggle('hidden')">
              Toggle Solution
            </button>
          </div>
        `;
      });
      html += '</div>';
    }

    container.innerHTML = html;
  }

  renderCrystallizedInsight(spec) {
    const container = document.getElementById('insight-container');
    if (!container || !spec.crystallizedInsight) return;

    container.innerHTML = `
      <div class="insight-box">
        <div class="insight-icon">💎</div>
        <div class="insight-content">
          <p>${spec.crystallizedInsight}</p>
        </div>
      </div>
    `;
  }

  renderStepControls() {
    const container = document.getElementById('step-controls');
    if (!container || !this.stepThrough) return;

    const totalSteps = this.stepThrough.getTotalSteps();
    if (totalSteps === 0) return;

    container.innerHTML = `
      <div class="step-controls-wrapper">
        <div class="step-info">
          <span id="step-counter">Step 1 of ${totalSteps}</span>
          <span id="step-caption"></span>
        </div>
        <div class="step-buttons">
          <button id="step-prev" onclick="viewer.stepThrough.previousStep()">Previous</button>
          <button id="step-play" onclick="viewer.stepThrough.toggleAutoPlay()">Play</button>
          <button id="step-next" onclick="viewer.stepThrough.nextStep()">Next</button>
        </div>
        <div class="step-progress-bar">
          <div id="step-progress" class="step-progress-fill"></div>
        </div>
      </div>
    `;

    this.stepThrough.renderCurrentStep();
  }

  renderStateControls() {
    const container = document.getElementById('state-controls');
    if (!container || !this.stateManager) return;

    const states = this.stateManager.getStates();
    if (states.length === 0) return;

    container.innerHTML = `
      <div class="state-controls-wrapper">
        <h4>System States</h4>
        <div class="state-buttons">
          ${states.map(state => `
            <button class="state-btn" data-state="${state.id}"
                    onclick="viewer.stateManager.setState('${state.id}')">
              ${state.name}
            </button>
          `).join('')}
        </div>
        <div class="state-description" id="state-description"></div>
      </div>
    `;

    // Set initial state
    if (states.length > 0) {
      this.stateManager.setState(states[0].id);
    }
  }

  updateNavigation(activeId) {
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.dataset.diagram === activeId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('[data-tab]').forEach(tab => {
      if (tab.dataset.tab === tabName) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    // Update tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
      if (content.id === `${tabName}-container`) {
        content.classList.add('active');
        content.style.display = 'block';
      } else {
        content.classList.remove('active');
        content.style.display = 'none';
      }
    });
  }

  toggleTheme() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    // Update theme toggle button
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.textContent = newTheme === 'light' ? '🌙' : '☀️';
    }

    // Re-initialize Mermaid with new theme
    if (typeof mermaid !== 'undefined') {
      mermaid.initialize({
        startOnLoad: false,
        theme: newTheme === 'dark' ? 'dark' : 'default'
      });
      // Re-render current diagram
      if (this.currentSpec) {
        this.renderDiagram(this.currentSpec);
      }
    }
  }

  showHelp() {
    const modal = document.createElement('div');
    modal.className = 'modal help-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Help & Shortcuts</h2>
          <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
        </div>
        <div class="modal-body">
          <h3>Keyboard Shortcuts</h3>
          <ul class="shortcuts-list">
            <li><kbd>Ctrl</kbd> + <kbd>E</kbd> - Export diagram</li>
            <li><kbd>Ctrl</kbd> + <kbd>H</kbd> - Show this help</li>
            <li><kbd>Ctrl</kbd> + <kbd>D</kbd> - Toggle dark mode</li>
            <li><kbd>←</kbd> / <kbd>→</kbd> - Navigate diagrams</li>
            <li><kbd>Space</kbd> - Play/pause step-through</li>
          </ul>

          <h3>Features</h3>
          <ul>
            <li>📊 Interactive diagrams with step-through animations</li>
            <li>🎯 Practice drills with progress tracking</li>
            <li>💡 First principles breakdown</li>
            <li>📝 Self-assessments with solutions</li>
            <li>🎨 Export diagrams in multiple formats</li>
          </ul>

          <h3>Getting Started</h3>
          <p>Navigate through different GFS concepts using the left sidebar.
             Each diagram includes narrative explanations, contracts, and interactive elements.</p>

          <div class="help-links">
            <a href="intro.html?from=app" target="_blank">📺 Watch Introduction Video</a>
            <a href="https://github.com/yourusername/gfs-visual" target="_blank">📚 Documentation</a>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.style.display = 'flex';

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-notification';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);

    setTimeout(() => errorDiv.remove(), 5000);
  }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  // Set initial theme
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.body.setAttribute('data-theme', savedTheme);

  // Create and initialize viewer
  window.viewer = new GFSViewer();
  await window.viewer.initialize();

  // Expose drill system for onclick handlers
  window.drillSystem = window.viewer.drillSystem;
});

// Export for testing
export { GFSViewer };