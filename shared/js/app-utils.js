// Shared utilities for individual apps

/**
 * Get the base path for the app (useful for navigation)
 */
function getBasePath() {
    const pathParts = window.location.pathname.split('/');
    const appsIndex = pathParts.indexOf('apps');
    if (appsIndex !== -1 && pathParts[appsIndex + 1]) {
        return pathParts.slice(0, appsIndex + 2).join('/');
    }
    return window.location.pathname;
}

/**
 * Navigate back to the main landing page
 */
function navigateToHome() {
    // Calculate relative path back to root
    const pathParts = window.location.pathname.split('/').filter(p => p);
    const appsIndex = pathParts.indexOf('apps');
    if (appsIndex !== -1) {
        const levelsUp = pathParts.length - appsIndex;
        window.location.href = '../'.repeat(levelsUp);
    } else {
        window.location.href = '/';
    }
}

/**
 * Load app configuration
 */
async function loadAppConfig() {
    try {
        const levelsUp = window.location.pathname.split('/').filter(p => p).length - 1;
        const configPath = '../'.repeat(levelsUp) + 'config.json';
        const response = await fetch(configPath);
        return await response.json();
    } catch (error) {
        console.error('Error loading config:', error);
        return null;
    }
}

/**
 * Get current app info from config
 */
async function getCurrentAppInfo() {
    const config = await loadAppConfig();
    if (!config) return null;

    const pathParts = window.location.pathname.split('/');
    const appId = pathParts[pathParts.indexOf('apps') + 1];

    return config.apps.find(app => app.id === appId);
}

/**
 * Simple state management for apps
 */
class AppState {
    constructor(initialState = {}) {
        this.state = { ...initialState };
        this.listeners = [];
    }

    getState() {
        return { ...this.state };
    }

    setState(updates) {
        this.state = { ...this.state, ...updates };
        this.notifyListeners();
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notifyListeners() {
        this.listeners.forEach(listener => listener(this.state));
    }
}

/**
 * Local storage helper
 */
class AppStorage {
    constructor(appId) {
        this.prefix = `mit-app-${appId}-`;
    }

    set(key, value) {
        try {
            localStorage.setItem(this.prefix + key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Storage error:', error);
            return false;
        }
    }

    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(this.prefix + key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Storage error:', error);
            return defaultValue;
        }
    }

    remove(key) {
        localStorage.removeItem(this.prefix + key);
    }

    clear() {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(this.prefix)) {
                localStorage.removeItem(key);
            }
        });
    }
}

// Export for use in apps
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getBasePath, navigateToHome, loadAppConfig, getCurrentAppInfo, AppState, AppStorage };
}
