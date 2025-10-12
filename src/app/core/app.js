/**
 * Main Application Controller
 * Coordinates all modules and manages application lifecycle
 */

import { eventBus, Events } from './events.js';
import { configManager } from './config.js';
import { appState } from '../state/app-state.js';
import { SpecLoader } from '../data/spec-loader.js';
import { DiagramRenderer } from '../render/diagram-renderer.js';
import { UIManager } from '../ui/ui-manager.js';
import { NavigationManager } from '../features/navigation/navigation-manager.js';
import { LearningManager } from '../features/learning/learning-manager.js';
import { ExportManager } from '../features/export/export-manager.js';
import { ThemeManager } from '../features/theming/theme-manager.js';

export class Application {
  constructor() {
    this.modules = {};
    this.initialized = false;
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      console.log('Initializing GFS Visual Learning System...');

      // Set loading state
      appState.set('app.loading', true);
      eventBus.emit(Events.APP_INIT);

      // Load configuration
      configManager.loadFromStorage();
      if (!configManager.validate()) {
        throw new Error('Invalid configuration');
      }

      // Initialize core modules
      await this.initializeModules();

      // Setup event listeners
      this.setupEventListeners();

      // Load initial diagram
      const params = new URLSearchParams(location.search);
      const diagramId = params.get('d') || configManager.get('diagram.defaultDiagram');
      await this.loadDiagram(diagramId);

      // Mark as initialized
      this.initialized = true;
      appState.update({
        'app.initialized': true,
        'app.loading': false
      });

      eventBus.emit(Events.APP_READY);
      console.log('Application ready');

    } catch (error) {
      console.error('Application initialization failed:', error);
      appState.update({
        'app.loading': false,
        'app.error': error.message
      });
      eventBus.emit(Events.APP_ERROR, error);
      this.handleError(error);
    }
  }

  /**
   * Initialize all modules
   * @private
   */
  async initializeModules() {
    // Data layer
    this.modules.specLoader = new SpecLoader();
    await this.modules.specLoader.init();

    // Rendering layer
    this.modules.diagramRenderer = new DiagramRenderer();
    await this.modules.diagramRenderer.init();

    // UI layer
    this.modules.uiManager = new UIManager();
    await this.modules.uiManager.init();

    // Feature modules
    this.modules.navigation = new NavigationManager();
    await this.modules.navigation.init();

    this.modules.learning = new LearningManager();
    await this.modules.learning.init();

    this.modules.export = new ExportManager();
    await this.modules.export.init();

    this.modules.theme = new ThemeManager();
    await this.modules.theme.init();

    console.log('All modules initialized');
  }

  /**
   * Setup global event listeners
   * @private
   */
  setupEventListeners() {
    // Diagram navigation
    eventBus.on(Events.NAV_PREV, () => this.navigatePrev());
    eventBus.on(Events.NAV_NEXT, () => this.navigateNext());
    eventBus.on(Events.NAV_GOTO, (diagramId) => this.loadDiagram(diagramId));

    // State changes
    appState.subscribe('view.activeLayers', () => {
      this.renderDiagram();
    });

    appState.subscribe('view.timeline.position', (position) => {
      this.updateTimelinePosition(position);
    });

    // UI events
    eventBus.on(Events.UI_TAB_CHANGE, (tab) => {
      appState.set('ui.activeTab', tab);
    });

    // Error handling
    window.addEventListener('error', (event) => {
      this.handleError(event.error);
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason);
    });

    // Save state before unload
    window.addEventListener('beforeunload', () => {
      appState.save();
    });

    // Handle visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        appState.save();
      }
    });
  }

  /**
   * Load a diagram
   * @param {string} diagramId - Diagram identifier
   */
  async loadDiagram(diagramId) {
    try {
      console.log(`Loading diagram: ${diagramId}`);

      // Set loading state
      appState.update({
        'diagram.loading': true,
        'diagram.error': null
      });

      eventBus.emit(Events.DIAGRAM_LOAD, diagramId);

      // Load spec
      const spec = await this.modules.specLoader.load(diagramId);

      // Update state
      appState.update({
        'diagram.current': diagramId,
        'diagram.spec': spec,
        'diagram.loading': false
      });

      // Render UI components
      await this.modules.uiManager.updateForDiagram(spec);

      // Render diagram
      await this.renderDiagram();

      // Update navigation
      this.modules.navigation.updatePosition(diagramId);

      // Update URL
      this.updateURL(diagramId);

      eventBus.emit(Events.DIAGRAM_LOADED, { diagramId, spec });

    } catch (error) {
      console.error(`Failed to load diagram ${diagramId}:`, error);

      appState.update({
        'diagram.loading': false,
        'diagram.error': error.message
      });

      eventBus.emit(Events.DIAGRAM_ERROR, error);
      this.handleError(error);
    }
  }

  /**
   * Render the current diagram
   */
  async renderDiagram() {
    try {
      const spec = appState.get('diagram.spec');
      if (!spec) return;

      const activeLayers = appState.get('view.activeLayers');

      eventBus.emit(Events.DIAGRAM_RENDER, { spec, activeLayers });

      // Compose and render
      const composed = await this.modules.diagramRenderer.compose(spec, activeLayers);
      await this.modules.diagramRenderer.render(composed);

      appState.set('diagram.rendered', true);
      eventBus.emit(Events.DIAGRAM_RENDERED);

    } catch (error) {
      console.error('Failed to render diagram:', error);
      eventBus.emit(Events.DIAGRAM_ERROR, error);
    }
  }

  /**
   * Navigate to previous diagram
   */
  navigatePrev() {
    const prevId = this.modules.navigation.getPrevDiagramId();
    if (prevId) {
      this.loadDiagram(prevId);
    }
  }

  /**
   * Navigate to next diagram
   */
  navigateNext() {
    const nextId = this.modules.navigation.getNextDiagramId();
    if (nextId) {
      this.loadDiagram(nextId);
    }
  }

  /**
   * Update timeline position
   * @param {number} position - Timeline position (0-100)
   */
  updateTimelinePosition(position) {
    // Update view based on timeline position
    const spec = appState.get('diagram.spec');
    if (!spec || !spec.states) return;

    // Find appropriate state for position
    const state = this.findStateForPosition(spec.states, position);
    if (state) {
      appState.set('view.activeState', state);
      appState.set('view.activeLayers', new Set(state.layers || []));
    }
  }

  /**
   * Find state for timeline position
   * @private
   */
  findStateForPosition(states, position) {
    // Find the state closest to the position
    return states.reduce((closest, state) => {
      const diff = Math.abs(state.position - position);
      const closestDiff = Math.abs(closest.position - position);
      return diff < closestDiff ? state : closest;
    });
  }

  /**
   * Update browser URL
   * @private
   */
  updateURL(diagramId) {
    const url = new URL(window.location);
    url.searchParams.set('d', diagramId);
    history.replaceState({}, '', url);
  }

  /**
   * Handle application errors
   * @param {Error} error - Error object
   */
  handleError(error) {
    console.error('Application error:', error);

    // Show error notification
    this.modules.uiManager?.showError(error.message);

    // Log to analytics (if available)
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: false
      });
    }
  }

  /**
   * Destroy the application
   */
  destroy() {
    // Save state
    appState.save();

    // Destroy modules
    Object.values(this.modules).forEach(module => {
      if (module.destroy) {
        module.destroy();
      }
    });

    // Clear event listeners
    eventBus.clear();

    // Reset state
    appState.reset();

    this.initialized = false;
    console.log('Application destroyed');
  }
}

// Create and export application instance
export const app = new Application();

// Auto-initialize when DOM is ready
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    app.init();
  });
}

export default app;