class GFSViewer {
  constructor() {
    this.validator = null;
    this.renderer = null;
    this.composer = null;
    this.drillSystem = null;
    this.stepper = null;
    this.overlayManager = null;
    this.exportManager = null;
    this.learningProgress = null;

    this.currentSpec = null;
    this.currentDiagramId = null;
    this.currentOverlays = new Set();
    this.manifest = null;
  }

  async initialize() {
    try {
      // Show loading indicator
      this.showLoading(true);

      // Initialize all components
      this.validator = new DiagramValidator();
      await this.validator.initialize();

      this.renderer = new MermaidRenderer();
      await this.renderer.initialize();

      this.composer = new SceneComposer();
      this.learningProgress = new LearningProgress();
      this.drillSystem = new DrillSystem();
      // Connect drill system to unified learning progress
      this.drillSystem.progress.setLearningProgress(this.learningProgress);
      this.stepper = new StepThroughEngine(this.renderer, this.composer);
      this.overlayManager = new OverlayManager(this);
      this.exportManager = new ExportManager(this);

      // Load manifest
      await this.loadManifest();

      // Setup UI components
      this.setupEventListeners();
      this.setupKeyboardShortcuts();
      this.setupTheme();

      // Load initial diagram from URL or default
      const params = new URLSearchParams(location.search);
      const diagramId = params.get('d') || '00-legend';
      await this.loadDiagram(diagramId);

      // Show achievement notifications
      this.setupAchievementListener();

      this.showLoading(false);
    } catch (error) {
      console.error('Failed to initialize viewer:', error);
      this.handleError(error);
    }
  }

  async loadManifest() {
    try {
      const response = await fetch('data/manifest.json');
      if (!response.ok) {
        throw new Error('Failed to load manifest');
      }
      this.manifest = await response.json();
      this.renderNavigation();
    } catch (error) {
      console.warn('Manifest not found, using defaults');
      this.manifest = {
        diagrams: [
          { id: '00-legend', title: 'Master Legend & System Contracts' },
          { id: '01-triangle', title: 'The Impossible Triangle' },
          { id: '02-scale', title: 'Scale Reality Dashboard' },
          { id: '03-chunk-size', title: 'The 64MB Decision Tree' },
          { id: '04-architecture', title: 'Complete Architecture' },
          { id: '05-planes', title: 'Control vs Data Plane' },
          { id: '06-read-path', title: 'Read Path with Cache' },
          { id: '07-write-path', title: 'Write Path Ballet' },
          { id: '08-lease', title: 'Lease State Machine' },
          { id: '09-consistency', title: 'Consistency Reality' },
          { id: '10-recovery', title: 'Failure Recovery Matrix' },
          { id: '11-evolution', title: 'Single Master Evolution' },
          { id: '12-dna', title: 'GFS DNA in Modern Systems' }
        ]
      };
      this.renderNavigation();
    }
  }

  async loadDiagram(diagramId) {
    try {
      // Track diagram view
      this.learningProgress.markDiagramViewed(diagramId);

      // Show loading
      this.showDiagramLoading(true);

      // Load spec
      const response = await fetch(`data/specs/${diagramId}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load diagram ${diagramId}`);
      }

      const spec = await response.json();

      // Validate spec
      try {
        this.validator.validateSpec(spec);
      } catch (validationError) {
        console.warn('Validation warning:', validationError);
        // Continue anyway for development
      }

      // Store current state
      this.currentSpec = spec;
      this.currentDiagramId = diagramId;
      this.currentOverlays.clear();

      // Update UI components
      this.updateNavigation(diagramId);
      this.updateTitle(spec.title);
      this.renderCrystallizedInsight(spec);
      this.renderNarrative(spec);
      this.renderContracts(spec);

      // Render the main diagram
      await this.renderDiagram();

      // Initialize learning components
      this.renderFirstPrinciples(spec);
      this.renderAdvancedConcepts(spec);
      this.renderAssessment(spec);
      this.drillSystem.renderDrills(spec);
      this.overlayManager.renderOverlayChips(spec);
      this.stepper.initialize(spec);

      // Update step controls
      this.renderStepControls();

      // Update URL
      this.updateURL(diagramId);

      // Update progress stats
      this.updateProgressDisplay();

      this.showDiagramLoading(false);
    } catch (error) {
      console.error('Failed to load diagram:', error);
      this.handleError(error);
      this.showDiagramLoading(false);
    }
  }

  async renderDiagram() {
    try {
      const composed = this.composer.composeScene(
        this.currentSpec,
        Array.from(this.currentOverlays)
      );

      await this.renderer.render(composed);
    } catch (error) {
      console.error('Failed to render diagram:', error);
      this.handleError(error);
    }
  }

  renderNavigation() {
    const nav = document.getElementById('diagram-nav');
    if (!nav) return;

    nav.innerHTML = '';

    // Add home button
    const homeBtn = document.createElement('button');
    homeBtn.className = 'nav-home';
    homeBtn.innerHTML = '🏠 Home';
    homeBtn.onclick = () => this.loadDiagram('00-legend');
    nav.appendChild(homeBtn);

    // Add diagram list
    const list = document.createElement('div');
    list.className = 'nav-list';

    this.manifest.diagrams.forEach((diagram, index) => {
      const item = document.createElement('button');
      item.className = 'nav-item';
      item.dataset.diagramId = diagram.id;

      const progress = this.learningProgress.getDiagramStats(diagram.id);
      const hasProgress = progress.viewCount > 0;

      item.innerHTML = `
        <span class="nav-number">${index}</span>
        <span class="nav-title">${diagram.title}</span>
        ${hasProgress ? `
          <span class="nav-progress">${progress.completionPercentage}%</span>
        ` : ''}
      `;

      item.onclick = () => this.loadDiagram(diagram.id);
      list.appendChild(item);
    });

    nav.appendChild(list);

    // Add navigation controls
    const controls = document.createElement('div');
    controls.className = 'nav-controls';
    controls.innerHTML = `
      <button id="nav-prev" title="Previous Diagram">⬅</button>
      <span id="nav-current">1 / ${this.manifest.diagrams.length}</span>
      <button id="nav-next" title="Next Diagram">➡</button>
    `;
    nav.appendChild(controls);

    // Setup nav button handlers
    document.getElementById('nav-prev').onclick = () => this.navigatePrev();
    document.getElementById('nav-next').onclick = () => this.navigateNext();
  }

  updateNavigation(diagramId) {
    // Update active state
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.diagramId === diagramId);
    });

    // Update nav controls
    const currentIndex = this.manifest.diagrams.findIndex(d => d.id === diagramId);
    const total = this.manifest.diagrams.length;

    const prevBtn = document.getElementById('nav-prev');
    const nextBtn = document.getElementById('nav-next');
    const current = document.getElementById('nav-current');

    if (prevBtn) prevBtn.disabled = currentIndex === 0;
    if (nextBtn) nextBtn.disabled = currentIndex === total - 1;
    if (current) current.textContent = `${currentIndex + 1} / ${total}`;
  }

  updateTitle(title) {
    const titleEl = document.getElementById('diagram-title');
    if (titleEl) {
      titleEl.textContent = title;
    }

    // Update page title
    document.title = `${title} - GFS Learning`;
  }

  renderCrystallizedInsight(spec) {
    const container = document.getElementById('crystallized-insight');
    if (!container) return;

    if (spec.crystallizedInsight) {
      container.textContent = spec.crystallizedInsight;
      container.style.display = 'block';
    } else {
      container.style.display = 'none';
    }
  }

  renderNarrative(spec) {
    const panel = document.getElementById('narrative-panel');
    if (!panel) return;

    const narrative = spec.narrative || spec.description || '';
    const keyPoints = spec.keyPoints || [];

    panel.innerHTML = `
      ${narrative ? `<div class="narrative-text">${narrative}</div>` : ''}
      ${keyPoints.length > 0 ? `
        <div class="key-points">
          <h4>Key Points</h4>
          <ul>
            ${keyPoints.map(point => `<li>${point}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    `;
  }

  renderContracts(spec) {
    const panel = document.getElementById('contracts-panel');
    if (!panel || !spec.contracts) return;

    panel.innerHTML = `
      <div class="contracts">
        ${spec.contracts.invariants?.length > 0 ? `
          <section class="invariants">
            <h4>🔒 System Invariants</h4>
            <ul>
              ${spec.contracts.invariants.map(i =>
                `<li>${i}</li>`
              ).join('')}
            </ul>
          </section>
        ` : ''}

        ${spec.contracts.guarantees?.length > 0 ? `
          <section class="guarantees">
            <h4>✅ Guarantees</h4>
            <ul>
              ${spec.contracts.guarantees.map(g =>
                `<li class="guarantee">${g}</li>`
              ).join('')}
            </ul>
          </section>
        ` : ''}

        ${spec.contracts.caveats?.length > 0 ? `
          <section class="caveats">
            <h4>⚠️ Caveats</h4>
            <ul>
              ${spec.contracts.caveats.map(c =>
                `<li class="caveat">${c}</li>`
              ).join('')}
            </ul>
          </section>
        ` : ''}
      </div>
    `;
  }

  renderFirstPrinciples(spec) {
    const container = document.getElementById('principles-container');
    if (!container || !spec.firstPrinciples) return;

    const fp = spec.firstPrinciples;

    // Helper to render any nested object structure
    const renderPrincipleField = (key, value, depth = 0) => {
      const icons = {
        theoreticalFoundation: '🔬',
        quantitativeAnalysis: '📊',
        derivedInvariants: '🔒',
        keyInsights: '💡',
        timeBasedCoordination: '⏰',
        formalModel: '📐',
        probabilisticAnalysis: '🎲',
        failureModels: '⚠️',
        reliabilityMath: '📈',
        scaleLaws: '📏',
        cachingTheory: '💾',
        littlesLawApplication: '⚖️',
        coordinationCost: '💸',
        dataflowPrinciples: '🌊',
        coreTradeoffs: '⚖️'
      };

      const icon = icons[key] || '📌';
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

      if (typeof value === 'string') {
        return `
          <section class="principle-section">
            <h${Math.min(3 + depth, 6)}>${icon} ${label}</h${Math.min(3 + depth, 6)}>
            <p>${value}</p>
          </section>
        `;
      } else if (Array.isArray(value)) {
        return `
          <section class="principle-section">
            <h${Math.min(3 + depth, 6)}>${icon} ${label}</h${Math.min(3 + depth, 6)}>
            <ul>
              ${value.map(item => `<li>${item}</li>`).join('')}
            </ul>
          </section>
        `;
      } else if (typeof value === 'object' && value !== null) {
        // Nested object - render recursively
        const nested = Object.entries(value)
          .map(([k, v]) => renderPrincipleField(k, v, depth + 1))
          .join('');
        return `
          <details class="principle-section nested-section" open>
            <summary><h${Math.min(3 + depth, 6)}>${icon} ${label}</h${Math.min(3 + depth, 6)}></summary>
            <div class="nested-content">
              ${nested}
            </div>
          </details>
        `;
      }
      return '';
    };

    const content = Object.entries(fp)
      .map(([key, value]) => renderPrincipleField(key, value))
      .join('');

    container.innerHTML = `<div class="principles-content">${content}</div>`;
  }

  renderAdvancedConcepts(spec) {
    const container = document.getElementById('principles-container');
    if (!container || !spec.advancedConcepts) return;

    const ac = spec.advancedConcepts;

    // Helper to render advanced concept sections
    const renderAdvancedSection = (title, content, icon = '🎓') => {
      if (!content) return '';

      if (typeof content === 'string') {
        return `
          <details class="advanced-section">
            <summary><h4>${icon} ${title}</h4></summary>
            <div class="advanced-content">
              <p>${content}</p>
            </div>
          </details>
        `;
      } else if (Array.isArray(content)) {
        return `
          <details class="advanced-section">
            <summary><h4>${icon} ${title}</h4></summary>
            <div class="advanced-content">
              <ul>
                ${content.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>
          </details>
        `;
      } else if (typeof content === 'object' && content !== null) {
        // Render nested structure
        const nested = Object.entries(content)
          .map(([key, value]) => {
            const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            if (typeof value === 'string') {
              return `<div class="nested-item"><strong>${label}:</strong> ${value}</div>`;
            } else if (Array.isArray(value)) {
              return `
                <div class="nested-item">
                  <strong>${label}:</strong>
                  <ul>${value.map(v => `<li>${v}</li>`).join('')}</ul>
                </div>
              `;
            }
            return '';
          })
          .join('');

        return `
          <details class="advanced-section">
            <summary><h4>${icon} ${title}</h4></summary>
            <div class="advanced-content">
              ${nested}
            </div>
          </details>
        `;
      }
      return '';
    };

    const advancedSections = [
      renderAdvancedSection('Mathematical Models', ac.mathematicalModels, '📐'),
      renderAdvancedSection('Modern System Comparisons', ac.modernSystemComparisons, '🔄'),
      renderAdvancedSection('Theoretical Extensions', ac.theoreticalExtensions, '🧪'),
      renderAdvancedSection('Production Considerations', ac.productionConsiderations, '🏭'),
      renderAdvancedSection('Research Directions', ac.researchDirections, '🔬'),
      renderAdvancedSection('Implementation Challenges', ac.implementationChallenges, '⚠️'),
      renderAdvancedSection('Performance Analysis', ac.performanceAnalysis, '📊'),
      renderAdvancedSection('Edge Cases', ac.edgeCases, '🎯')
    ].filter(Boolean).join('');

    if (advancedSections) {
      // Append to principles container as a separate collapsible section
      container.innerHTML += `
        <div class="advanced-concepts-separator"></div>
        <details class="advanced-concepts-container" open>
          <summary><h3>🎓 Advanced Concepts</h3></summary>
          <div class="advanced-concepts-content">
            ${advancedSections}
          </div>
        </details>
      `;
    }
  }

  renderAssessment(spec) {
    const container = document.getElementById('assessment-container');
    if (!container) return;

    // Check for assessment checkpoints (using correct field name)
    const assessment = spec.assessmentCheckpoints || spec.assessment || spec.checkpoints || spec.questions;

    if (!assessment || (Array.isArray(assessment) && assessment.length === 0)) {
      container.innerHTML = '<div class="no-assessment">No assessment available for this diagram</div>';
      return;
    }

    container.innerHTML = `
      <div class="assessment-content">
        ${Array.isArray(assessment) ?
          assessment.map((item, index) => `
            <div class="assessment-checkpoint">
              <div class="checkpoint-header">
                <span class="checkpoint-number">${index + 1}</span>
                <h4 class="checkpoint-title">${item.competency || item.question || item.text || item}</h4>
              </div>
              ${item.checkYourself ? `
                <div class="checkpoint-check">
                  <strong>✓ Check Yourself:</strong>
                  <p>${item.checkYourself}</p>
                </div>
              ` : ''}
              ${item.mastery ? `
                <details class="checkpoint-mastery">
                  <summary><strong>🎯 Mastery Goal</strong></summary>
                  <p>${item.mastery}</p>
                </details>
              ` : ''}
              ${item.answer ? `
                <details class="answer-reveal">
                  <summary>Show Answer</summary>
                  <p>${item.answer}</p>
                </details>
              ` : ''}
            </div>
          `).join('')
          :
          `<div class="assessment-text">${assessment}</div>`
        }
      </div>
    `;
  }

  renderStepControls() {
    const controls = document.getElementById('step-controls');
    if (!controls) return;

    const stepCount = this.stepper.getStepCount();
    const hasSteps = stepCount > 0;

    controls.innerHTML = `
      ${hasSteps ? `
        <div class="step-info">
          <span class="step-count-badge">${stepCount} steps</span>
          <div id="step-progress" class="step-progress-text">Step 1 of ${stepCount}</div>
        </div>
        <div class="step-caption" id="step-caption">Click Play to start</div>
        <div class="step-buttons">
          <button id="step-first" data-action="first" title="First">⏮</button>
          <button id="step-prev" data-action="prev" title="Previous">⏪</button>
          <button id="step-play" data-action="toggleAutoPlay" title="Play/Pause">▶</button>
          <button id="step-next" data-action="next" title="Next">⏩</button>
          <button id="step-last" data-action="last" title="Last">⏭</button>
        </div>
        <div class="step-speed">
          <label>Speed:</label>
          <input type="range" id="step-speed" min="500" max="5000" value="2000" step="500">
          <span id="step-speed-label">2s</span>
        </div>
      ` : `
        <div class="no-steps">No steps available</div>
      `}
    `;

    // Add event listeners for step control buttons
    const stepButtons = controls.querySelectorAll('.step-buttons button');
    stepButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action && this.stepper[action]) {
          this.stepper[action]();
        }
      });
    });

    // Update speed control
    const speedSlider = document.getElementById('step-speed');
    const speedLabel = document.getElementById('step-speed-label');
    if (speedSlider && speedLabel) {
      speedSlider.addEventListener('input', (e) => {
        const seconds = (5500 - e.target.value) / 1000;
        speedLabel.textContent = `${seconds}s`;
        this.stepper.setPlaySpeed(5500 - e.target.value);
      });
    }
  }

  updateProgressDisplay() {
    const stats = this.learningProgress.getOverallProgress();
    const diagramStats = this.learningProgress.getDiagramStats(this.currentDiagramId);

    const progressEl = document.getElementById('progress-summary');
    if (progressEl) {
      progressEl.innerHTML = `
        <div class="progress-item">
          <span class="progress-label">Overall:</span>
          <span class="progress-value">${stats.completionPercentage}%</span>
        </div>
        <div class="progress-item">
          <span class="progress-label">This Diagram:</span>
          <span class="progress-value">${diagramStats.completionPercentage}%</span>
        </div>
        <div class="progress-item">
          <span class="progress-label">Time Spent:</span>
          <span class="progress-value">${diagramStats.formattedTime}</span>
        </div>
      `;
    }
  }

  setupEventListeners() {
    // Setup tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Remove active class from all tabs and content
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        // Add active class to clicked tab and corresponding content
        e.target.classList.add('active');
        const tabName = e.target.dataset.tab;

        if (tabName === 'principles') {
          document.getElementById('principles-container')?.classList.add('active');
        } else if (tabName === 'practice') {
          document.getElementById('practice-container')?.classList.add('active');
        }
      });
    });

    // Listen for overlay changes
    document.addEventListener('overlayToggle', (e) => {
      this.currentOverlays = new Set(e.detail.activeOverlays);
      this.renderDiagram();
    });

    // Listen for step changes
    document.addEventListener('stepChange', (e) => {
      this.learningProgress.updateStepProgress(
        this.currentDiagramId,
        e.detail.index,
        e.detail.total
      );
    });

    // Listen for drill completion - just refresh UI, ProgressTracker already updated learning progress
    document.addEventListener('drillComplete', (e) => {
      this.updateProgressDisplay();
    });

    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    // Export button
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportManager.showExportDialog());
    }

    // Help button
    const helpBtn = document.getElementById('help-btn');
    if (helpBtn) {
      helpBtn.addEventListener('click', () => this.showHelp());
    }
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Prevent shortcuts when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Number keys toggle overlays
      if (e.key >= '1' && e.key <= '9' && !e.ctrlKey && !e.altKey) {
        const index = parseInt(e.key) - 1;
        this.overlayManager.toggleOverlayByIndex(index);
      }

      // Navigation
      if (e.key === 'ArrowLeft' && !e.shiftKey) {
        if (e.ctrlKey) {
          this.navigatePrev();
        } else {
          this.stepper.prev();
        }
      } else if (e.key === 'ArrowRight' && !e.shiftKey) {
        if (e.ctrlKey) {
          this.navigateNext();
        } else {
          this.stepper.next();
        }
      }

      // Space for play/pause
      if (e.key === ' ' && !e.shiftKey && !e.ctrlKey) {
        e.preventDefault();
        this.stepper.toggleAutoPlay();
      }

      // L for legend
      if (e.key === 'l' && !e.ctrlKey) {
        this.loadDiagram('00-legend');
      }

      // ? for help
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        this.showHelp();
      }

      // T for theme toggle
      if (e.key === 't' && !e.ctrlKey) {
        this.toggleTheme();
      }

      // E for export
      if (e.key === 'e' && !e.ctrlKey) {
        this.exportManager.showExportDialog();
      }
    });
  }

  setupTheme() {
    const savedTheme = localStorage.getItem('gfs-theme') || 'light';
    document.body.className = `theme-${savedTheme}`;
    this.updateThemeToggle(savedTheme);
  }

  toggleTheme() {
    const currentTheme = document.body.className.includes('dark') ? 'dark' : 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    document.body.className = `theme-${newTheme}`;
    localStorage.setItem('gfs-theme', newTheme);
    this.updateThemeToggle(newTheme);

    // Re-render diagram with new theme
    this.renderDiagram();
  }

  updateThemeToggle(theme) {
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      toggle.textContent = theme === 'light' ? '🌙' : '☀️';
      toggle.title = theme === 'light' ? 'Dark Mode' : 'Light Mode';
    }
  }

  setupAchievementListener() {
    document.addEventListener('achievement', (e) => {
      this.showAchievement(e.detail);
    });
  }

  showAchievement(achievement) {
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.innerHTML = `
      <div class="achievement-icon">${achievement.icon}</div>
      <div class="achievement-content">
        <div class="achievement-title">${achievement.title}</div>
        <div class="achievement-description">${achievement.description}</div>
      </div>
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => notification.classList.add('show'), 100);

    // Remove after delay
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  navigatePrev() {
    const currentIndex = this.manifest.diagrams.findIndex(d => d.id === this.currentDiagramId);
    if (currentIndex > 0) {
      const prevDiagram = this.manifest.diagrams[currentIndex - 1];
      this.loadDiagram(prevDiagram.id);
    }
  }

  navigateNext() {
    const currentIndex = this.manifest.diagrams.findIndex(d => d.id === this.currentDiagramId);
    if (currentIndex < this.manifest.diagrams.length - 1) {
      const nextDiagram = this.manifest.diagrams[currentIndex + 1];
      this.loadDiagram(nextDiagram.id);
    }
  }

  showHelp() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Keyboard Shortcuts</h2>
          <button class="modal-close">×</button>
        </div>
        <div class="modal-body">
          <div class="shortcuts-grid">
            <div class="shortcut">
              <kbd>1-9</kbd>
              <span>Toggle overlays</span>
            </div>
            <div class="shortcut">
              <kbd>←/→</kbd>
              <span>Step navigation</span>
            </div>
            <div class="shortcut">
              <kbd>Ctrl+←/→</kbd>
              <span>Diagram navigation</span>
            </div>
            <div class="shortcut">
              <kbd>Space</kbd>
              <span>Play/Pause steps</span>
            </div>
            <div class="shortcut">
              <kbd>L</kbd>
              <span>Go to Legend</span>
            </div>
            <div class="shortcut">
              <kbd>T</kbd>
              <span>Toggle theme</span>
            </div>
            <div class="shortcut">
              <kbd>E</kbd>
              <span>Export diagram</span>
            </div>
            <div class="shortcut">
              <kbd>?</kbd>
              <span>Show this help</span>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add close button listener
    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => modal.remove());
    }

    // Click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  updateURL(diagramId) {
    const url = new URL(window.location);
    url.searchParams.set('d', diagramId);
    history.pushState({}, '', url);
  }

  showLoading(show) {
    const loader = document.getElementById('loading');
    if (loader) {
      loader.style.display = show ? 'flex' : 'none';
    }
  }

  showDiagramLoading(show) {
    const container = document.getElementById('diagram-container');
    if (container) {
      if (show) {
        container.innerHTML = '<div class="diagram-loading">Loading diagram...</div>';
      }
    }
  }

  handleError(error) {
    console.error('Viewer error:', error);

    const container = document.getElementById('diagram-container');
    if (container) {
      container.innerHTML = `
        <div class="error-message">
          <h3>⚠️ Error Loading Diagram</h3>
          <p>${error.message}</p>
          <button id="error-reload">Reload Page</button>
        </div>
      `;

      // Add reload button listener
      const reloadBtn = document.getElementById('error-reload');
      if (reloadBtn) {
        reloadBtn.addEventListener('click', () => location.reload());
      }
    }
  }
}

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
  window.viewer = new GFSViewer();
  window.viewer.initialize();
  window.drillSystem = window.viewer.drillSystem; // For drill onclick handlers
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GFSViewer;
}