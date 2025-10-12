/**
 * Central Configuration Management
 */

export const Config = {
  // Application
  app: {
    name: 'GFS Visual Learning System',
    version: '2.0.0',
    debug: false
  },

  // API and Data
  api: {
    baseUrl: '',  // Empty for relative paths
    dataPath: 'data/',
    specsPath: 'data/specs/',
    manifestFile: 'data/manifest.json',
    timeout: 30000
  },

  // UI Configuration
  ui: {
    defaultTheme: 'light',
    animationDuration: 300,
    autoPlaySpeed: 2000,
    tooltipDelay: 500,
    maxDiagramWidth: 1200,
    maxDiagramHeight: 800
  },

  // Features
  features: {
    enableDrills: true,
    enableAssessment: true,
    enableExport: true,
    enableKeyboardShortcuts: true,
    enableTouchGestures: false,
    enableOfflineMode: true
  },

  // Storage
  storage: {
    prefix: 'gfs-',
    enablePersistence: true,
    storageQuota: 10 * 1024 * 1024, // 10MB
    cacheTimeout: 24 * 60 * 60 * 1000 // 24 hours
  },

  // Diagram Defaults
  diagram: {
    defaultDiagram: '00-legend',
    mermaidTheme: 'default',
    mermaidConfig: {
      startOnLoad: false,
      theme: 'default',
      themeVariables: {
        primaryColor: '#1a73e8',
        primaryTextColor: '#fff',
        primaryBorderColor: '#0d47a1',
        lineColor: '#333',
        secondaryColor: '#f0f0f0',
        tertiaryColor: '#fff'
      },
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis'
      }
    }
  },

  // Performance
  performance: {
    enableLazyLoading: true,
    preloadNextDiagram: true,
    maxConcurrentRequests: 3,
    debounceDelay: 250,
    throttleDelay: 100
  },

  // Development
  dev: {
    enableHotReload: false,
    enableSourceMaps: true,
    logLevel: 'info', // 'debug' | 'info' | 'warn' | 'error'
    mockData: false
  }
};

/**
 * Configuration manager with validation and override support
 */
export class ConfigManager {
  constructor() {
    this.config = { ...Config };
    this.overrides = {};
  }

  /**
   * Get configuration value
   * @param {string} path - Dot-notation path (e.g., 'ui.defaultTheme')
   * @returns {any} Configuration value
   */
  get(path) {
    const keys = path.split('.');
    let value = this.config;

    for (const key of keys) {
      value = value[key];
      if (value === undefined) {
        console.warn(`Config key not found: ${path}`);
        return undefined;
      }
    }

    // Check for overrides
    if (this.overrides[path] !== undefined) {
      return this.overrides[path];
    }

    return value;
  }

  /**
   * Set configuration override
   * @param {string} path - Dot-notation path
   * @param {any} value - New value
   */
  set(path, value) {
    this.overrides[path] = value;

    // Apply to actual config
    const keys = path.split('.');
    let target = this.config;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!target[keys[i]]) {
        target[keys[i]] = {};
      }
      target = target[keys[i]];
    }

    target[keys[keys.length - 1]] = value;
  }

  /**
   * Load configuration from localStorage
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem('gfs-config');
      if (stored) {
        const overrides = JSON.parse(stored);
        Object.keys(overrides).forEach(key => {
          this.set(key, overrides[key]);
        });
      }
    } catch (error) {
      console.error('Failed to load config from storage:', error);
    }
  }

  /**
   * Save configuration overrides to localStorage
   */
  saveToStorage() {
    try {
      localStorage.setItem('gfs-config', JSON.stringify(this.overrides));
    } catch (error) {
      console.error('Failed to save config to storage:', error);
    }
  }

  /**
   * Reset configuration to defaults
   */
  reset() {
    this.config = { ...Config };
    this.overrides = {};
    localStorage.removeItem('gfs-config');
  }

  /**
   * Validate configuration
   * @returns {boolean} True if valid
   */
  validate() {
    const required = [
      'app.name',
      'api.dataPath',
      'diagram.defaultDiagram'
    ];

    for (const path of required) {
      if (!this.get(path)) {
        console.error(`Required config missing: ${path}`);
        return false;
      }
    }

    return true;
  }
}

// Export singleton instance
export const configManager = new ConfigManager();
export default configManager;