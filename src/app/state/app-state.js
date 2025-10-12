/**
 * Centralized Application State Management
 * Single source of truth for all application state
 */

import { eventBus, Events } from '../core/events.js';

export class AppState {
  constructor() {
    this.state = {
      // Application state
      app: {
        initialized: false,
        loading: false,
        error: null,
        theme: 'light'
      },

      // Current diagram state
      diagram: {
        current: null,
        spec: null,
        rendered: false,
        loading: false,
        error: null
      },

      // View state (replaces steps/overlays/scenes)
      view: {
        activeState: null,
        activeLayers: new Set(),
        timeline: {
          position: 0,
          playing: false,
          speed: 2000
        }
      },

      // UI state
      ui: {
        activeTab: 'principles',
        modalOpen: false,
        sidebarCollapsed: false,
        notifications: []
      },

      // Learning state
      learning: {
        currentDrill: null,
        drillProgress: {},
        assessmentProgress: {}
      },

      // User preferences
      preferences: {
        theme: 'light',
        autoPlay: false,
        showHints: true,
        animationSpeed: 'normal'
      }
    };

    this.listeners = new Map();
    this.history = [];
    this.maxHistory = 50;
  }

  /**
   * Get state value by path
   * @param {string} path - Dot-notation path (e.g., 'diagram.current')
   * @returns {any} State value
   */
  get(path) {
    if (!path) return { ...this.state };

    const keys = path.split('.');
    let value = this.state;

    for (const key of keys) {
      value = value[key];
      if (value === undefined) return undefined;
    }

    return value;
  }

  /**
   * Set state value and notify listeners
   * @param {string} path - Dot-notation path
   * @param {any} value - New value
   * @param {Object} options - Update options
   */
  set(path, value, options = {}) {
    const oldValue = this.get(path);

    // Skip if value hasn't changed (unless forced)
    if (!options.force && oldValue === value) return;

    // Store previous state in history
    if (!options.silent) {
      this.addToHistory(path, oldValue, value);
    }

    // Update state
    const keys = path.split('.');
    let target = this.state;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!target[keys[i]]) {
        target[keys[i]] = {};
      }
      target = target[keys[i]];
    }

    target[keys[keys.length - 1]] = value;

    // Notify listeners
    if (!options.silent) {
      this.notifyListeners(path, value, oldValue);
      eventBus.emit(Events.STATE_CHANGE, {
        path,
        value,
        oldValue
      });
    }
  }

  /**
   * Update multiple state values
   * @param {Object} updates - Object with path-value pairs
   * @param {Object} options - Update options
   */
  update(updates, options = {}) {
    Object.entries(updates).forEach(([path, value]) => {
      this.set(path, value, { ...options, silent: true });
    });

    if (!options.silent) {
      eventBus.emit(Events.STATE_CHANGE, { updates });
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
      const callbacks = this.listeners.get(path);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(path);
        }
      }
    };
  }

  /**
   * Notify listeners of state change
   * @private
   */
  notifyListeners(path, value, oldValue) {
    // Exact path listeners
    if (this.listeners.has(path)) {
      this.listeners.get(path).forEach(callback => {
        try {
          callback(value, oldValue, path);
        } catch (error) {
          console.error(`Error in state listener for ${path}:`, error);
        }
      });
    }

    // Wildcard listeners
    this.listeners.forEach((callbacks, pattern) => {
      if (pattern.includes('*') && this.matchesPattern(path, pattern)) {
        callbacks.forEach(callback => {
          try {
            callback(value, oldValue, path);
          } catch (error) {
            console.error(`Error in wildcard listener for ${pattern}:`, error);
          }
        });
      }
    });
  }

  /**
   * Check if path matches wildcard pattern
   * @private
   */
  matchesPattern(path, pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(path);
  }

  /**
   * Add state change to history
   * @private
   */
  addToHistory(path, oldValue, newValue) {
    this.history.push({
      timestamp: Date.now(),
      path,
      oldValue,
      newValue
    });

    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  /**
   * Undo last state change
   */
  undo() {
    if (this.history.length === 0) return false;

    const last = this.history.pop();
    this.set(last.path, last.oldValue, { silent: true });

    eventBus.emit(Events.STATE_CHANGE, {
      path: last.path,
      value: last.oldValue,
      oldValue: last.newValue,
      undo: true
    });

    return true;
  }

  /**
   * Reset state to initial values
   */
  reset() {
    this.state = {
      app: {
        initialized: false,
        loading: false,
        error: null,
        theme: 'light'
      },
      diagram: {
        current: null,
        spec: null,
        rendered: false,
        loading: false,
        error: null
      },
      view: {
        activeState: null,
        activeLayers: new Set(),
        timeline: {
          position: 0,
          playing: false,
          speed: 2000
        }
      },
      ui: {
        activeTab: 'principles',
        modalOpen: false,
        sidebarCollapsed: false,
        notifications: []
      },
      learning: {
        currentDrill: null,
        drillProgress: {},
        assessmentProgress: {}
      },
      preferences: {
        theme: 'light',
        autoPlay: false,
        showHints: true,
        animationSpeed: 'normal'
      }
    };

    this.history = [];
    eventBus.emit(Events.STATE_CHANGE, { reset: true });
  }

  /**
   * Save state to localStorage
   */
  save() {
    try {
      const serializable = {
        ...this.state,
        view: {
          ...this.state.view,
          activeLayers: Array.from(this.state.view.activeLayers)
        }
      };

      localStorage.setItem('gfs-app-state', JSON.stringify(serializable));
      eventBus.emit(Events.STATE_SAVE, serializable);
      return true;
    } catch (error) {
      console.error('Failed to save state:', error);
      return false;
    }
  }

  /**
   * Load state from localStorage
   */
  load() {
    try {
      const stored = localStorage.getItem('gfs-app-state');
      if (!stored) return false;

      const parsed = JSON.parse(stored);

      // Restore Sets from Arrays
      if (parsed.view && parsed.view.activeLayers) {
        parsed.view.activeLayers = new Set(parsed.view.activeLayers);
      }

      this.state = { ...this.state, ...parsed };
      eventBus.emit(Events.STATE_RESTORE, this.state);
      return true;
    } catch (error) {
      console.error('Failed to load state:', error);
      return false;
    }
  }

  /**
   * Get state snapshot
   */
  snapshot() {
    return JSON.parse(JSON.stringify(this.state));
  }
}

// Create singleton instance
export const appState = new AppState();
export default appState;