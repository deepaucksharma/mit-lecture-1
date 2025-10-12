/**
 * Unified Application State Manager
 * Single source of truth for all application state
 */
class AppState {
  constructor() {
    this.state = {
      // Current diagram
      currentDiagramId: null,
      currentSpec: null,

      // UI state
      currentOverlays: new Set(),
      currentStep: 0,
      isPlaying: false,
      theme: 'light',

      // Progress tracking
      progress: null,
      achievements: [],

      // Session info
      sessionStart: Date.now(),
      diagramViewCount: 0
    };

    this.listeners = new Map();
    this.history = [];
    this.maxHistory = 50;
  }

  /**
   * Get state value by path (supports dot notation)
   * @param {string} path - Path to state value (e.g., 'ui.theme')
   * @returns {*} State value
   */
  get(path) {
    const keys = path.split('.');
    let value = this.state;

    for (const key of keys) {
      if (value && typeof value === 'object') {
        value = value[key];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Set state value and notify listeners
   * @param {string} path - Path to state value
   * @param {*} value - New value
   * @param {Object} options - Options for state update
   */
  set(path, value, options = {}) {
    const { silent = false, addToHistory = true } = options;

    // Store previous value for history
    const previousValue = this.get(path);

    // Set the new value
    const keys = path.split('.');
    let target = this.state;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!target[key] || typeof target[key] !== 'object') {
        target[key] = {};
      }
      target = target[key];
    }

    const lastKey = keys[keys.length - 1];
    target[lastKey] = value;

    // Add to history if requested
    if (addToHistory && previousValue !== value) {
      this.addToHistory({
        path,
        previousValue,
        newValue: value,
        timestamp: Date.now()
      });
    }

    // Notify listeners unless silent
    if (!silent) {
      this.notify(path, value, previousValue);
    }
  }

  /**
   * Subscribe to state changes
   * @param {string} path - Path to watch (supports wildcards)
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(path, callback) {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, new Set());
    }

    this.listeners.get(path).add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(path);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.listeners.delete(path);
        }
      }
    };
  }

  /**
   * Notify listeners of state change
   * @private
   */
  notify(path, newValue, previousValue) {
    // Notify exact path listeners
    const exactListeners = this.listeners.get(path);
    if (exactListeners) {
      exactListeners.forEach(callback => {
        try {
          callback(newValue, previousValue, path);
        } catch (error) {
          console.error(`Error in state listener for ${path}:`, error);
        }
      });
    }

    // Notify wildcard listeners
    const parts = path.split('.');
    for (let i = 1; i <= parts.length; i++) {
      const wildcardPath = parts.slice(0, i - 1).join('.') +
                          (i > 1 ? '.' : '') + '*';
      const wildcardListeners = this.listeners.get(wildcardPath);
      if (wildcardListeners) {
        wildcardListeners.forEach(callback => {
          try {
            callback(newValue, previousValue, path);
          } catch (error) {
            console.error(`Error in wildcard listener for ${wildcardPath}:`, error);
          }
        });
      }
    }
  }

  /**
   * Add state change to history
   * @private
   */
  addToHistory(change) {
    this.history.push(change);

    // Limit history size
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  /**
   * Get state history
   * @returns {Array} State change history
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.history = [];
  }

  /**
   * Get complete state snapshot
   * @returns {Object} Current state
   */
  getSnapshot() {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * Restore state from snapshot
   * @param {Object} snapshot - State snapshot
   */
  restoreSnapshot(snapshot) {
    this.state = JSON.parse(JSON.stringify(snapshot));
    this.notify('*', this.state, null);
  }

  /**
   * Reset state to initial values
   */
  reset() {
    this.state = {
      currentDiagramId: null,
      currentSpec: null,
      currentOverlays: new Set(),
      currentStep: 0,
      isPlaying: false,
      theme: 'light',
      progress: null,
      achievements: [],
      sessionStart: Date.now(),
      diagramViewCount: 0
    };

    this.history = [];
    this.notify('*', this.state, null);
  }
}

// Make it a singleton
const appState = new AppState();

// Export for module systems, or make global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AppState, appState };
} else {
  window.AppState = AppState;
  window.appState = appState;
}