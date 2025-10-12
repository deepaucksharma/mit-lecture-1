/**
 * Spec Loader Module
 * Handles loading and caching of diagram specifications
 */

import { configManager } from '../core/config.js';
import { eventBus, Events } from '../core/events.js';

export class SpecLoader {
  constructor() {
    this.cache = new Map();
    this.manifest = null;
    this.loading = new Set();
  }

  /**
   * Initialize the spec loader
   */
  async init() {
    await this.loadManifest();
  }

  /**
   * Load the manifest file
   */
  async loadManifest() {
    try {
      const manifestPath = configManager.get('api.manifestFile');
      const response = await fetch(manifestPath);

      if (!response.ok) {
        // Use default manifest if fetch fails
        this.manifest = this.getDefaultManifest();
        console.warn('Using default manifest');
        return;
      }

      this.manifest = await response.json();

      // Cache manifest
      if (configManager.get('storage.enablePersistence')) {
        localStorage.setItem('gfs-manifest', JSON.stringify(this.manifest));
      }
    } catch (error) {
      console.warn('Failed to load manifest, using defaults:', error);
      this.manifest = this.getDefaultManifest();
    }
  }

  /**
   * Get default manifest
   */
  getDefaultManifest() {
    return {
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
  }

  /**
   * Load a diagram specification
   * @param {string} diagramId - Diagram identifier
   * @returns {Promise<Object>} Diagram specification
   */
  async load(diagramId) {
    // Check cache first
    if (this.cache.has(diagramId)) {
      return this.cache.get(diagramId);
    }

    // Prevent duplicate loading
    if (this.loading.has(diagramId)) {
      // Wait for existing load to complete
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (!this.loading.has(diagramId)) {
            clearInterval(checkInterval);
            if (this.cache.has(diagramId)) {
              resolve(this.cache.get(diagramId));
            } else {
              reject(new Error(`Failed to load ${diagramId}`));
            }
          }
        }, 100);
      });
    }

    // Start loading
    this.loading.add(diagramId);

    try {
      const specsPath = configManager.get('api.specsPath');
      const response = await fetch(`${specsPath}${diagramId}.json`);

      if (!response.ok) {
        throw new Error(`Failed to load diagram ${diagramId}: ${response.statusText}`);
      }

      const spec = await response.json();

      // Validate spec
      this.validateSpec(spec);

      // Enhance spec with defaults
      const enhanced = this.enhanceSpec(spec, diagramId);

      // Cache the spec
      this.cache.set(diagramId, enhanced);

      // Persist to localStorage if enabled
      if (configManager.get('storage.enablePersistence')) {
        this.saveToStorage(diagramId, enhanced);
      }

      this.loading.delete(diagramId);
      return enhanced;

    } catch (error) {
      this.loading.delete(diagramId);

      // Try to load from storage as fallback
      const stored = this.loadFromStorage(diagramId);
      if (stored) {
        console.warn(`Loaded ${diagramId} from storage due to error:`, error);
        return stored;
      }

      throw error;
    }
  }

  /**
   * Validate specification structure
   * @param {Object} spec - Specification to validate
   */
  validateSpec(spec) {
    const required = ['id', 'title', 'nodes', 'edges'];

    for (const field of required) {
      if (!spec[field]) {
        throw new Error(`Invalid spec: missing required field '${field}'`);
      }
    }

    // Validate nodes
    if (!Array.isArray(spec.nodes) || spec.nodes.length === 0) {
      throw new Error('Invalid spec: nodes must be a non-empty array');
    }

    // Validate edges
    if (!Array.isArray(spec.edges)) {
      throw new Error('Invalid spec: edges must be an array');
    }
  }

  /**
   * Enhance spec with defaults and computed properties
   * @param {Object} spec - Raw specification
   * @param {string} diagramId - Diagram ID
   * @returns {Object} Enhanced specification
   */
  enhanceSpec(spec, diagramId) {
    return {
      ...spec,
      id: spec.id || diagramId,
      layout: spec.layout || { type: 'flow' },
      contracts: spec.contracts || {},
      firstPrinciples: spec.firstPrinciples || {},
      drills: spec.drills || [],
      assessment: spec.assessment || [],
      overlays: spec.overlays || [],
      steps: spec.steps || [],
      // Convert old format to new unified state format
      states: this.convertToStates(spec),
      layers: this.convertToLayers(spec)
    };
  }

  /**
   * Convert old step/scene format to unified states
   * @param {Object} spec - Specification
   * @returns {Array} Unified states
   */
  convertToStates(spec) {
    const states = [];

    // Convert steps to sequential states
    if (spec.steps && spec.steps.length > 0) {
      spec.steps.forEach((step, index) => {
        states.push({
          id: step.id || `step-${index}`,
          type: 'sequential',
          position: (index / (spec.steps.length - 1)) * 100,
          layers: step.overlays || [],
          caption: step.caption || step.description || `Step ${index + 1}`,
          narrative: step.narrative
        });
      });
    }

    // Convert scenes to named states
    if (spec.scenes && spec.scenes.length > 0) {
      spec.scenes.forEach((scene) => {
        states.push({
          id: scene.id,
          type: 'named',
          position: scene.position || 50,
          layers: scene.overlays || [],
          caption: scene.name || scene.id,
          narrative: scene.description
        });
      });
    }

    // If no states, create a default
    if (states.length === 0) {
      states.push({
        id: 'default',
        type: 'sequential',
        position: 0,
        layers: [],
        caption: 'Default View'
      });
    }

    return states;
  }

  /**
   * Convert overlays to layers
   * @param {Object} spec - Specification
   * @returns {Array} Layers
   */
  convertToLayers(spec) {
    if (!spec.overlays || spec.overlays.length === 0) {
      return [];
    }

    return spec.overlays.map(overlay => ({
      id: overlay.id,
      name: overlay.name || overlay.id,
      description: overlay.description,
      diff: {
        add: overlay.addNodes || [],
        remove: overlay.removeNodes || [],
        modify: overlay.modifyNodes || [],
        edges: overlay.edges || []
      }
    }));
  }

  /**
   * Save spec to localStorage
   * @param {string} diagramId - Diagram ID
   * @param {Object} spec - Specification
   */
  saveToStorage(diagramId, spec) {
    try {
      const key = `gfs-spec-${diagramId}`;
      localStorage.setItem(key, JSON.stringify(spec));
    } catch (error) {
      console.warn(`Failed to save ${diagramId} to storage:`, error);
    }
  }

  /**
   * Load spec from localStorage
   * @param {string} diagramId - Diagram ID
   * @returns {Object|null} Specification or null
   */
  loadFromStorage(diagramId) {
    try {
      const key = `gfs-spec-${diagramId}`;
      const stored = localStorage.getItem(key);

      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn(`Failed to load ${diagramId} from storage:`, error);
    }

    return null;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get manifest
   * @returns {Object} Manifest
   */
  getManifest() {
    return this.manifest || this.getDefaultManifest();
  }

  /**
   * Get diagram info
   * @param {string} diagramId - Diagram ID
   * @returns {Object|null} Diagram info from manifest
   */
  getDiagramInfo(diagramId) {
    const manifest = this.getManifest();
    return manifest.diagrams.find(d => d.id === diagramId) || null;
  }

  /**
   * Get all diagram IDs
   * @returns {Array<string>} Diagram IDs
   */
  getDiagramIds() {
    const manifest = this.getManifest();
    return manifest.diagrams.map(d => d.id);
  }

  /**
   * Preload next diagram
   * @param {string} currentId - Current diagram ID
   */
  async preloadNext(currentId) {
    const ids = this.getDiagramIds();
    const currentIndex = ids.indexOf(currentId);

    if (currentIndex !== -1 && currentIndex < ids.length - 1) {
      const nextId = ids[currentIndex + 1];
      // Load in background
      this.load(nextId).catch(() => {
        // Silent fail for preload
      });
    }
  }
}

export default SpecLoader;