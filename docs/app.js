// GFS Visual Learning System - Bundled Application

// === src/utils/sanitizer.js ===
/**
 * HTML Sanitization Utility
 * Provides safe HTML rendering to prevent XSS attacks
 */
class HTMLSanitizer {
  constructor() {
    // Check if DOMPurify is available
    this.purify = typeof DOMPurify !== 'undefined' ? DOMPurify : null;

    if (!this.purify) {
      console.warn('DOMPurify not available. HTML sanitization disabled.');
    }
  }

  /**
   * Sanitize HTML string
   * @param {string} dirty - Unsanitized HTML
   * @param {Object} options - DOMPurify options
   * @returns {string} Sanitized HTML
   */
  sanitize(dirty, options = {}) {
    if (!dirty) return '';

    if (this.purify) {
      return this.purify.sanitize(dirty, {
        ALLOWED_TAGS: [
          'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'span', 'div',
          'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img', 'hr'
        ],
        ALLOWED_ATTR: [
          'href', 'title', 'class', 'id', 'src', 'alt', 'width', 'height',
          'data-*'
        ],
        ALLOW_DATA_ATTR: true,
        ...options
      });
    }

    // Fallback: basic escaping if DOMPurify not available
    return this.escapeHTML(dirty);
  }

  /**
   * Basic HTML escaping (fallback)
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHTML(text) {
    if (!text) return '';

    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Sanitize and set innerHTML safely
   * @param {HTMLElement} element - Target element
   * @param {string} html - HTML to set
   * @param {Object} options - Sanitization options
   */
  setHTML(element, html, options = {}) {
    if (!element) return;
    element.innerHTML = this.sanitize(html, options);
  }

  /**
   * Create element with sanitized HTML
   * @param {string} tag - Element tag name
   * @param {string} html - HTML content
   * @param {Object} options - Sanitization options
   * @returns {HTMLElement} Created element
   */
  createElement(tag, html, options = {}) {
    const element = document.createElement(tag);
    this.setHTML(element, html, options);
    return element;
  }

  /**
   * Sanitize an object's string properties recursively
   * @param {Object} obj - Object to sanitize
   * @returns {Object} Sanitized object
   */
  sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitize(value);
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Check if string contains potentially dangerous content
   * @param {string} text - Text to check
   * @returns {boolean} True if suspicious
   */
  isSuspicious(text) {
    if (!text || typeof text !== 'string') return false;

    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,  // onclick, onerror, etc.
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /data:text\/html/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Log warning if suspicious content detected
   * @param {string} text - Text to check
   * @param {string} context - Context for logging
   */
  warnIfSuspicious(text, context = 'content') {
    if (this.isSuspicious(text)) {
      console.warn(`Suspicious content detected in ${context}:`, text.substring(0, 100));
    }
  }
}

// Create singleton instance
const sanitizer = new HTMLSanitizer();

// Export for module systems, or make global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { HTMLSanitizer, sanitizer };
} else {
  window.HTMLSanitizer = HTMLSanitizer;
  window.sanitizer = sanitizer;
}


// === src/core/app-state.js ===
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

// === src/core/composer.js ===
class SceneComposer {
  constructor() {
    this.debug = false;
  }

  composeScene(spec, overlayIds = []) {
    // Deep clone the spec to avoid mutations
    const composed = this.deepClone(spec);
    const nodeMap = new Map(composed.nodes.map(n => [n.id, n]));
    const edgeMap = new Map(composed.edges.map(e => [e.id, e]));

    // Track which overlays are active
    composed._activeOverlays = overlayIds;

    // Apply each overlay in sequence
    for (const overlayId of overlayIds) {
      const overlay = spec.overlays?.find(o => o.id === overlayId);
      if (!overlay) {
        console.warn(`Overlay ${overlayId} not found`);
        continue;
      }

      this.applyDiff(nodeMap, edgeMap, overlay.diff);
    }

    // Convert maps back to arrays
    composed.nodes = Array.from(nodeMap.values());
    composed.edges = Array.from(edgeMap.values());

    return composed;
  }

  applyDiff(nodeMap, edgeMap, diff) {
    if (!diff) return;

    // Process removals first
    if (diff.remove) {
      diff.remove.nodeIds?.forEach(id => {
        nodeMap.delete(id);
        // Also remove edges connected to this node
        for (const [edgeId, edge] of edgeMap.entries()) {
          if (edge.from === id || edge.to === id) {
            edgeMap.delete(edgeId);
          }
        }
      });

      diff.remove.edgeIds?.forEach(id => edgeMap.delete(id));
    }

    // Process additions
    if (diff.add) {
      diff.add.nodes?.forEach(n => {
        const node = { ...n, _added: true };
        nodeMap.set(n.id, node);
      });

      diff.add.edges?.forEach(e => {
        const edge = { ...e, _added: true };
        edgeMap.set(e.id, edge);
      });
    }

    // Process highlights
    if (diff.highlight) {
      diff.highlight.nodeIds?.forEach(id => {
        const node = nodeMap.get(id);
        if (node) {
          node._highlighted = true;
        }
      });

      diff.highlight.edgeIds?.forEach(id => {
        const edge = edgeMap.get(id);
        if (edge) {
          edge._highlighted = true;
        }
      });
    }

    // Process modifications
    if (diff.modify) {
      diff.modify.nodes?.forEach(mod => {
        const node = nodeMap.get(mod.id);
        if (node) {
          Object.assign(node, mod, { _modified: true });
        }
      });

      diff.modify.edges?.forEach(mod => {
        const edge = edgeMap.get(mod.id);
        if (edge) {
          Object.assign(edge, mod, { _modified: true });
        }
      });
    }
  }

  mergeScenes(spec, sceneIds = []) {
    // Get overlays for all specified scenes
    const overlayIds = [];
    for (const sceneId of sceneIds) {
      const scene = spec.scenes?.find(s => s.id === sceneId);
      if (scene) {
        overlayIds.push(...(scene.overlays || []));
      }
    }

    // Remove duplicates while preserving order
    const uniqueOverlayIds = [...new Set(overlayIds)];

    return this.composeScene(spec, uniqueOverlayIds);
  }

  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    if (obj instanceof Object) {
      const clonedObj = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }
  }

  // Get the diff between two states (useful for animations)
  calculateDiff(specBefore, specAfter) {
    const diff = {
      add: { nodes: [], edges: [] },
      remove: { nodeIds: [], edgeIds: [] },
      modify: { nodes: [], edges: [] }
    };

    const beforeNodes = new Map(specBefore.nodes.map(n => [n.id, n]));
    const afterNodes = new Map(specAfter.nodes.map(n => [n.id, n]));
    const beforeEdges = new Map(specBefore.edges.map(e => [e.id, e]));
    const afterEdges = new Map(specAfter.edges.map(e => [e.id, e]));

    // Find removed nodes
    for (const [id, node] of beforeNodes) {
      if (!afterNodes.has(id)) {
        diff.remove.nodeIds.push(id);
      }
    }

    // Find added or modified nodes
    for (const [id, node] of afterNodes) {
      if (!beforeNodes.has(id)) {
        diff.add.nodes.push(node);
      } else {
        // Check if modified
        const before = beforeNodes.get(id);
        if (JSON.stringify(before) !== JSON.stringify(node)) {
          diff.modify.nodes.push(node);
        }
      }
    }

    // Find removed edges
    for (const [id, edge] of beforeEdges) {
      if (!afterEdges.has(id)) {
        diff.remove.edgeIds.push(id);
      }
    }

    // Find added or modified edges
    for (const [id, edge] of afterEdges) {
      if (!beforeEdges.has(id)) {
        diff.add.edges.push(edge);
      } else {
        // Check if modified
        const before = beforeEdges.get(id);
        if (JSON.stringify(before) !== JSON.stringify(edge)) {
          diff.modify.edges.push(edge);
        }
      }
    }

    return diff;
  }
}

// Export for module systems, or make global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SceneComposer;
} else {
  window.SceneComposer = SceneComposer;
}

// === src/core/renderer.js ===
class MermaidRenderer {
  constructor() {
    this.config = {
      theme: 'base',
      themeVariables: {
        primaryColor: '#CFE8FF',
        primaryBorderColor: '#2B6CB0',
        secondaryColor: '#D1FAE5',
        tertiaryColor: '#E5E7EB',
        primaryTextColor: '#1F2937',
        lineColor: '#6B7280',
        background: '#FFFFFF'
      },
      flowchart: {
        htmlLabels: true,
        curve: 'basis'
      },
      sequence: {
        diagramMarginX: 50,
        diagramMarginY: 20,
        actorMargin: 100,
        width: 150,
        height: 65,
        boxMargin: 10,
        boxTextMargin: 5,
        noteMargin: 10,
        messageMargin: 35
      }
    };

    this.initialized = false;
    this.cache = new Map(); // SVG cache for performance
    this.cacheEnabled = true;
  }

  async initialize() {
    if (this.initialized) return;

    // Check if mermaid is available
    if (typeof mermaid === 'undefined') {
      console.error('Mermaid library not loaded');
      return;
    }

    mermaid.initialize({
      startOnLoad: false,
      ...this.config
    });

    this.initialized = true;
  }

  async render(spec, containerId = 'diagram-container') {
    if (!this.initialized) {
      await this.initialize();
    }

    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container ${containerId} not found`);
      return null;
    }

    // Generate cache key from spec
    const cacheKey = this.generateCacheKey(spec);

    // Check cache first
    if (this.cacheEnabled && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      container.innerHTML = cached;
      this.postProcess(container, spec);
      return cached;
    }

    const code = this.generateMermaidCode(spec);

    // Clear container
    container.innerHTML = '';

    // Create a unique ID for this render
    const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const element = document.createElement('div');
    element.id = id;

    container.appendChild(element);

    try {
      // Render the diagram
      const { svg } = await mermaid.render(id, code);
      container.innerHTML = svg;

      // Cache the rendered SVG
      if (this.cacheEnabled) {
        this.cache.set(cacheKey, svg);
        // Limit cache size to 20 diagrams
        if (this.cache.size > 20) {
          const firstKey = this.cache.keys().next().value;
          this.cache.delete(firstKey);
        }
      }

      // Post-process the SVG
      this.postProcess(container, spec);

      return svg;
    } catch (error) {
      console.error('Failed to render diagram:', error);
      container.innerHTML = `<div class="error">Failed to render diagram: ${error.message}</div>`;
      return null;
    }
  }

  generateCacheKey(spec) {
    // Create a cache key from spec structure
    return `${spec.id || 'unknown'}-${spec.nodes?.length || 0}-${spec.edges?.length || 0}-${spec.layout?.type || 'flow'}`;
  }

  clearCache() {
    this.cache.clear();
  }

  generateMermaidCode(spec) {
    const layoutType = spec.layout?.type || 'flow';
    const generator = this.getGenerator(layoutType);
    return generator.call(this, spec);
  }

  getGenerator(type) {
    const generators = {
      'sequence': this.generateSequence,
      'flow': this.generateFlow,
      'state': this.generateState,
      'matrix': this.generateMatrix,
      'timeline': this.generateTimeline
    };

    return generators[type] || generators['flow'];
  }

  generateSequence(spec) {
    const lines = ['sequenceDiagram'];

    // Add autonumber if specified
    if (spec.layout?.numbered !== false) {
      lines.push('  autonumber');
    }

    // Define participants in canonical order
    const typeOrder = ['client', 'master', 'chunkserver', 'rack', 'switch', 'note'];
    const sortedNodes = [...(spec.nodes || [])].sort((a, b) =>
      typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type)
    );

    for (const node of sortedNodes) {
      const icon = this.getNodeIcon(node);
      lines.push(`  participant ${node.id} as ${icon}${node.label}`);
    }

    // Group edges by phase if available
    const phases = this.groupEdgesByPhase(spec.edges || []);

    for (const [phaseName, edges] of phases) {
      if (phaseName !== 'default') {
        lines.push(`  rect rgba(${this.getPhaseColor(phaseName)})`);
        lines.push(`    Note over ${sortedNodes[0].id}: ${phaseName}`);
      }

      for (const edge of edges) {
        const arrow = this.getSequenceArrow(edge);
        const label = this.formatEdgeLabel(edge);

        // Add highlight box if needed
        if (edge._highlighted) {
          lines.push(`  rect rgba(255,220,0,0.3)`);
        }

        lines.push(`  ${edge.from}${arrow}${edge.to}: ${label}`);

        // Close highlight box
        if (edge._highlighted) {
          lines.push(`  end`);
        }
      }

      if (phaseName !== 'default') {
        lines.push(`  end`);
      }
    }

    return lines.join('\n');
  }

  generateFlow(spec) {
    const lines = ['flowchart TB'];

    // Define nodes with shapes and styles
    for (const node of spec.nodes || []) {
      const shape = this.getNodeShape(node);
      const style = node._highlighted ? ':::highlight' :
                   node._added ? ':::added' : '';
      // Don't use icons in flowchart - they cause parsing issues with some shapes
      lines.push(`  ${node.id}${shape.open}"${node.label}"${shape.close}${style}`);
    }

    // Define edges
    for (const edge of spec.edges || []) {
      const arrow = this.getFlowArrow(edge);
      const label = edge.label ? `|${this.formatFlowchartEdgeLabel(edge)}|` : '';
      const style = edge._highlighted ? ':::highlightEdge' :
                   edge._added ? ':::addedEdge' : '';
      lines.push(`  ${edge.from} ${arrow}${label} ${edge.to}${style}`);
    }

    // Add style definitions
    lines.push('');
    lines.push('  classDef highlight fill:#FFD700,stroke:#B8860B,stroke-width:4px');
    lines.push('  classDef added fill:#90EE90,stroke:#228B22,stroke-width:3px');
    lines.push('  classDef highlightEdge stroke:#FFD700,stroke-width:4px');
    lines.push('  classDef addedEdge stroke:#228B22,stroke-width:3px,stroke-dasharray: 5 5');
    lines.push('  classDef master fill:#CFE8FF,stroke:#2B6CB0,stroke-width:2px');
    lines.push('  classDef chunkserver fill:#D1FAE5,stroke:#059669,stroke-width:2px');
    lines.push('  classDef client fill:#E5E7EB,stroke:#4B5563,stroke-width:2px');

    // Apply type-based styles
    for (const node of spec.nodes || []) {
      if (!node._highlighted && !node._added) {
        lines.push(`  class ${node.id} ${node.type}`);
      }
    }

    return lines.join('\n');
  }

  generateState(spec) {
    const lines = ['stateDiagram-v2'];

    // Generate state definitions
    for (const node of spec.nodes || []) {
      if (node.type === 'state') {
        lines.push(`  state "${node.label}" as ${node.id}`);
        if (node.metadata?.description) {
          lines.push(`  ${node.id} : ${node.metadata.description}`);
        }
      }
    }

    // Generate transitions
    for (const edge of spec.edges || []) {
      const label = edge.label ? ` : ${edge.label}` : '';
      lines.push(`  ${edge.from} --> ${edge.to}${label}`);
    }

    return lines.join('\n');
  }

  generateMatrix(spec) {
    // For matrix layout, use flowchart with subgraphs
    const lines = ['flowchart TB'];

    // Group nodes by rack/cluster if available
    const racks = this.groupNodesByRack(spec.nodes || []);

    for (const [rackName, nodes] of racks) {
      if (rackName !== 'default') {
        lines.push(`  subgraph ${rackName}["${rackName}"]`);
      }

      for (const node of nodes) {
        const shape = this.getNodeShape(node);
        const icon = this.getNodeIcon(node);
        lines.push(`    ${node.id}${shape.open}${icon}${node.label}${shape.close}`);
      }

      if (rackName !== 'default') {
        lines.push(`  end`);
      }
    }

    // Add edges
    for (const edge of spec.edges || []) {
      const arrow = this.getFlowArrow(edge);
      const label = edge.label ? `|${edge.label}|` : '';
      lines.push(`  ${edge.from} ${arrow}${label} ${edge.to}`);
    }

    return lines.join('\n');
  }

  generateTimeline(spec) {
    const lines = ['gitGraph'];

    // Use git graph for timeline visualization
    lines.push('  commit id: "Start"');

    for (const node of spec.nodes || []) {
      if (node.type === 'event') {
        lines.push(`  commit id: "${node.label}"`);
        if (node.metadata?.branch) {
          lines.push(`  branch ${node.metadata.branch}`);
        }
      }
    }

    return lines.join('\n');
  }

  getNodeShape(node) {
    const shapes = {
      'master': { open: '{{', close: '}}' },      // Hexagon (control/coordination)
      'chunkserver': { open: '[(', close: ')]' }, // Cylinder (storage)
      'client': { open: '[', close: ']' },        // Rectangle
      'rack': { open: '{{', close: '}}' },        // Hexagon
      'switch': { open: '((', close: '))' },      // Circle
      'note': { open: '[', close: ']' },          // Rectangle
      'state': { open: '[', close: ']' },
      'event': { open: '(', close: ')' }
    };

    return shapes[node.type] || shapes['note'];
  }

  getNodeIcon(node) {
    const icons = {
      'master': '🎯 ',
      'chunkserver': '💾 ',
      'client': '💻 ',
      'rack': '🏢 ',
      'switch': '🔌 ',
      'note': '📝 '
    };

    return icons[node.type] || '';
  }

  getSequenceArrow(edge) {
    const arrows = {
      'control': '->>',
      'data': '-->>',
      'cache': '-.>>',
      'heartbeat': '->>'
    };

    return arrows[edge.kind] || '->>';
  }

  getFlowArrow(edge) {
    const arrows = {
      'control': '-->',
      'data': '==>',
      'cache': '-.->',
      'heartbeat': '-.->',
      'bidirectional': '<-->'
    };

    return arrows[edge.kind] || '-->';
  }

  formatEdgeLabel(edge) {
    const parts = [];

    // Add kind indicator
    const kindEmoji = {
      'control': '⚡',
      'data': '📦',
      'cache': '💾',
      'heartbeat': '💓'
    };

    if (kindEmoji[edge.kind]) {
      parts.push(kindEmoji[edge.kind]);
    }

    parts.push(edge.label || '');

    // Add metrics if available (including enhanced fields)
    if (edge.metrics) {
      const metrics = [];
      if (edge.metrics.size) metrics.push(edge.metrics.size);
      if (edge.metrics.latency) metrics.push(edge.metrics.latency);
      if (edge.metrics.throughput) metrics.push(`@${edge.metrics.throughput}`);
      // Enhanced metrics
      if (edge.metrics.frequency) metrics.push(`⏰${edge.metrics.frequency}`);
      if (edge.metrics.payload) metrics.push(`📦${edge.metrics.payload}`);

      if (metrics.length > 0) {
        parts.push(`[${metrics.join(', ')}]`);
      }
    }

    return parts.filter(Boolean).join(' ');
  }

  formatFlowchartEdgeLabel(edge) {
    // Simplified label format for flowcharts (no emojis, no special chars)
    // Only use basic text to avoid Mermaid parsing conflicts
    // Remove or escape problematic characters: parentheses, pipes, brackets
    const label = edge.label || '';
    return label
      .replace(/\(/g, '')  // Remove opening parentheses
      .replace(/\)/g, '')  // Remove closing parentheses
      .replace(/\|/g, '')  // Remove pipe characters
      .replace(/\[/g, '')  // Remove brackets
      .replace(/\]/g, '')
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  groupEdgesByPhase(edges) {
    const phases = new Map([['default', []]]);

    for (const edge of edges) {
      const phase = edge.phase || 'default';
      if (!phases.has(phase)) {
        phases.set(phase, []);
      }
      phases.get(phase).push(edge);
    }

    return phases;
  }

  groupNodesByRack(nodes) {
    const racks = new Map([['default', []]]);

    for (const node of nodes) {
      const rack = node.rack || 'default';
      if (!racks.has(rack)) {
        racks.set(rack, []);
      }
      racks.get(rack).push(node);
    }

    return racks;
  }

  getPhaseColor(phaseName) {
    const colors = {
      'setup': '200,200,255,0.2',
      'execution': '200,255,200,0.2',
      'cleanup': '255,200,200,0.2',
      'error': '255,100,100,0.3'
    };

    return colors[phaseName] || '200,200,200,0.2';
  }

  postProcess(container, spec) {
    // Add tooltips
    this.addTooltips(container, spec);

    // Add accessibility attributes
    this.addAccessibility(container, spec);

    // Add click handlers if needed
    this.addInteractivity(container, spec);
  }

  addTooltips(container, spec) {
    const svg = container.querySelector('svg');
    if (!svg) return;

    // Add tooltips to edges
    for (const edge of spec.edges || []) {
      const edgeElements = svg.querySelectorAll(`[id*="${edge.id}"]`);
      edgeElements.forEach(el => {
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        const details = [
          edge.label,
          `Type: ${edge.kind}`,
          edge.metrics?.size && `Size: ${edge.metrics.size}`,
          edge.metrics?.latency && `Latency: ${edge.metrics.latency}`,
          edge.metrics?.throughput && `Throughput: ${edge.metrics.throughput}`,
          // Enhanced metrics
          edge.metrics?.frequency && `Frequency: ${edge.metrics.frequency}`,
          edge.metrics?.payload && `Payload: ${edge.metrics.payload}`,
          edge.metrics?.purpose && `Purpose: ${edge.metrics.purpose}`
        ].filter(Boolean).join('\n');

        title.textContent = details;
        el.appendChild(title);
      });
    }
  }

  addAccessibility(container, spec) {
    const svg = container.querySelector('svg');
    if (!svg) return;

    // Add ARIA labels
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', spec.title || 'System Architecture Diagram');

    // Add descriptions for screen readers
    const desc = document.createElementNS('http://www.w3.org/2000/svg', 'desc');
    desc.textContent = this.generateTextDescription(spec);
    svg.insertBefore(desc, svg.firstChild);
  }

  generateTextDescription(spec) {
    const nodes = spec.nodes || [];
    const edges = spec.edges || [];

    return `This diagram shows ${nodes.length} components connected by ${edges.length} relationships. ` +
           `Components include ${nodes.map(n => n.label).join(', ')}. ` +
           `The system demonstrates ${spec.title || 'distributed system architecture'}.`;
  }

  addInteractivity(container, spec) {
    const svg = container.querySelector('svg');
    if (!svg) return;

    // Add click handlers to nodes
    for (const node of spec.nodes || []) {
      const nodeElements = svg.querySelectorAll(`[id*="${node.id}"]`);
      nodeElements.forEach(el => {
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => {
          this.onNodeClick(node);
        });
      });
    }
  }

  onNodeClick(node) {
    // Emit custom event that the viewer can handle
    const event = new CustomEvent('nodeClick', {
      detail: { node }
    });
    document.dispatchEvent(event);
  }
}

// Export for module systems, or make global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MermaidRenderer;
} else {
  window.MermaidRenderer = MermaidRenderer;
}

// === src/core/validator.js ===
class ValidationError extends Error {
  constructor(rule, errors) {
    super(`Validation failed for ${rule}: ${errors.join(', ')}`);
    this.rule = rule;
    this.errors = errors;
  }
}

class DiagramValidator {
  constructor() {
    this.ajv = null;
    this.schema = null;
    this.validate = null;
    this.semanticRules = [
      this.validateMasterNotOnDataPath,
      this.validatePrimarySecondaryConsistency,
      this.validateVersionMonotonicity,
      this.validateReplicationFactor,
      this.validateOverlayReferences
    ];
  }

  async initialize() {
    try {
      // In browser environment, Ajv should be loaded via CDN
      if (typeof Ajv === 'undefined') {
        console.warn('Ajv not loaded. Schema validation will be skipped.');
        return;
      }

      this.ajv = new Ajv({ allErrors: true });
      this.schema = await fetch('/data/schema.json').then(r => r.json());
      this.validate = this.ajv.compile(this.schema);
    } catch (error) {
      console.error('Failed to initialize validator:', error);
    }
  }

  validateSpec(spec) {
    const errors = [];

    // Schema validation if available
    if (this.validate && !this.validate(spec)) {
      throw new ValidationError('Schema', this.ajv.errors.map(e => e.message));
    }

    // Semantic validation
    for (const rule of this.semanticRules) {
      const result = rule.call(this, spec);
      if (!result.valid) {
        errors.push(...result.errors);
      }
    }

    if (errors.length > 0) {
      throw new ValidationError('Semantic', errors);
    }

    return true;
  }

  validateMasterNotOnDataPath(spec) {
    const masters = new Set(
      (spec.nodes || []).filter(n => n.type === 'master').map(n => n.id)
    );

    const violations = (spec.edges || []).filter(e =>
      e.kind === 'data' && (masters.has(e.from) || masters.has(e.to))
    );

    return {
      valid: violations.length === 0,
      rule: 'MasterNotOnDataPath',
      errors: violations.map(e => `Data edge ${e.id} touches master`)
    };
  }

  validatePrimarySecondaryConsistency(spec) {
    // Check that if there's a primary, there are secondaries
    const nodes = spec.nodes || [];
    const primaryCount = nodes.filter(n => n.label && n.label.includes('Primary')).length;
    const secondaryCount = nodes.filter(n => n.label && n.label.includes('Secondary')).length;

    if (primaryCount > 0 && secondaryCount === 0) {
      return {
        valid: false,
        rule: 'PrimarySecondaryConsistency',
        errors: ['Primary exists without secondaries']
      };
    }

    return { valid: true, errors: [] };
  }

  validateVersionMonotonicity(spec) {
    // Check version numbers are consistent
    const versionedNodes = (spec.nodes || []).filter(n => n.metadata && n.metadata.version);
    const errors = [];

    // Just ensure versions are positive
    versionedNodes.forEach(node => {
      if (node.metadata.version < 0) {
        errors.push(`Node ${node.id} has negative version ${node.metadata.version}`);
      }
    });

    return {
      valid: errors.length === 0,
      rule: 'VersionMonotonicity',
      errors
    };
  }

  validateReplicationFactor(spec) {
    // This is more of a warning than an error for educational purposes
    const chunkservers = (spec.nodes || []).filter(n => n.type === 'chunkserver');

    if (chunkservers.length > 0 && chunkservers.length < 3) {
      return {
        valid: true, // Warning only
        rule: 'ReplicationFactor',
        errors: []
      };
    }

    return { valid: true, errors: [] };
  }

  validateOverlayReferences(spec) {
    const nodeIds = new Set((spec.nodes || []).map(n => n.id));
    const edgeIds = new Set((spec.edges || []).map(e => e.id));
    const errors = [];

    for (const overlay of spec.overlays || []) {
      // Check removals reference existing elements
      overlay.diff?.remove?.nodeIds?.forEach(id => {
        if (!nodeIds.has(id)) {
          errors.push(`Overlay ${overlay.id} removes non-existent node ${id}`);
        }
      });

      overlay.diff?.remove?.edgeIds?.forEach(id => {
        if (!edgeIds.has(id)) {
          errors.push(`Overlay ${overlay.id} removes non-existent edge ${id}`);
        }
      });

      // Check highlights reference existing elements
      overlay.diff?.highlight?.nodeIds?.forEach(id => {
        if (!nodeIds.has(id)) {
          errors.push(`Overlay ${overlay.id} highlights non-existent node ${id}`);
        }
      });

      overlay.diff?.highlight?.edgeIds?.forEach(id => {
        if (!edgeIds.has(id)) {
          errors.push(`Overlay ${overlay.id} highlights non-existent edge ${id}`);
        }
      });

      // Check modifications reference existing elements
      overlay.diff?.modify?.nodes?.forEach(node => {
        if (!nodeIds.has(node.id)) {
          errors.push(`Overlay ${overlay.id} modifies non-existent node ${node.id}`);
        }
      });

      overlay.diff?.modify?.edges?.forEach(edge => {
        if (!edgeIds.has(edge.id)) {
          errors.push(`Overlay ${overlay.id} modifies non-existent edge ${edge.id}`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      rule: 'OverlayReferences',
      errors
    };
  }
}

// Export for module systems, or make global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DiagramValidator, ValidationError };
} else {
  window.DiagramValidator = DiagramValidator;
  window.ValidationError = ValidationError;
}

// === src/learning/drills.js ===
// Progress tracking adapter - uses unified LearningProgress system
class ProgressTracker {
  constructor(learningProgress = null) {
    // Will be set by DrillSystem after it gets reference to viewer.learningProgress
    this.learningProgress = learningProgress;
    this.completedDrills = new Set();
    this.migrateOldProgress();
  }

  setLearningProgress(learningProgress) {
    this.learningProgress = learningProgress;
  }

  migrateOldProgress() {
    // Migrate from old storage format to new unified system
    const oldKey = 'gfs-learning-progress';
    try {
      const oldData = localStorage.getItem(oldKey);
      if (oldData) {
        const oldProgress = JSON.parse(oldData);
        // Store for later migration when learningProgress is available
        this.pendingMigration = oldProgress;
        localStorage.removeItem(oldKey);
        console.log('Found old progress data, will migrate to new system');
      }
    } catch (error) {
      console.error('Failed to read old progress:', error);
    }
  }

  isDrillComplete(diagramId, drillId) {
    const key = `${diagramId}-${drillId}`;
    return this.completedDrills.has(key);
  }

  markDrillComplete(diagramId, drillId) {
    const key = `${diagramId}-${drillId}`;
    if (!this.completedDrills.has(key)) {
      this.completedDrills.add(key);

      // Update unified progress if available
      if (this.learningProgress) {
        const stats = this.learningProgress.getDiagramStats(diagramId);
        const completed = this.completedDrills.size;
        const total = stats.totalDrills || 10;
        this.learningProgress.updateDrillProgress(diagramId, completed, total);
      }
    }
  }

  getDiagramProgress(diagramId) {
    const prefix = `${diagramId}-`;
    const completed = Array.from(this.completedDrills).filter(key =>
      key.startsWith(prefix)
    ).length;

    return { completed };
  }

  resetProgress(diagramId = null) {
    if (diagramId) {
      const prefix = `${diagramId}-`;
      Array.from(this.completedDrills).forEach(key => {
        if (key.startsWith(prefix)) {
          this.completedDrills.delete(key);
        }
      });
    } else {
      this.completedDrills.clear();
    }

    // Reset in unified system too
    if (this.learningProgress && diagramId) {
      this.learningProgress.updateDrillProgress(diagramId, 0, 10);
    }
  }
}

class DrillSystem {
  constructor() {
    this.progress = new ProgressTracker();
    this.currentDrill = null;
    this.currentDiagramId = null;
    this.stateManager = null;
    this.stateDrills = new Map(); // Maps state IDs to relevant drills
  }

  // Set reference to state manager for state-aware drills
  setStateManager(stateManager) {
    this.stateManager = stateManager;

    // Listen for state changes to highlight relevant drills
    if (this.stateManager) {
      document.addEventListener('stateChange', (e) => {
        this.onStateChange(e.detail);
      });
    }
  }

  // Handle state changes - highlight drills relevant to current state
  onStateChange(stateDetail) {
    const currentState = stateDetail.state;
    if (!currentState) return;

    // Update drill visibility based on state
    const drillElements = document.querySelectorAll('.drill');
    drillElements.forEach(element => {
      const drillId = element.dataset.drillId;
      const stateId = element.dataset.stateId;

      // Highlight drills associated with current state
      if (stateId && stateId === currentState.id) {
        element.classList.add('state-relevant');
      } else {
        element.classList.remove('state-relevant');
      }
    });
  }

  renderDrills(spec, containerId = 'drills-container') {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn('Drills container not found');
      return;
    }

    this.currentDiagramId = spec.id;
    container.innerHTML = '';

    const drills = spec.drills || [];
    if (drills.length === 0) {
      container.innerHTML = '<div class="no-drills">No drills available for this diagram</div>';
      return;
    }

    // Add progress header
    const progressHeader = this.createProgressHeader(spec.id, drills.length);
    container.appendChild(progressHeader);

    // Group drills by type
    const drillsByType = this.groupDrillsByType(drills);

    for (const [type, typeDrills] of Object.entries(drillsByType)) {
      const section = this.createDrillSection(type, typeDrills, spec.id);
      container.appendChild(section);
    }
  }

  createProgressHeader(diagramId, totalDrills) {
    const progress = this.progress.getDiagramProgress(diagramId);
    const percentage = totalDrills > 0 ? Math.round((progress.completed / totalDrills) * 100) : 0;

    const header = document.createElement('div');
    header.className = 'drills-progress';
    header.innerHTML = `
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${percentage}%"></div>
      </div>
      <div class="progress-text">${progress.completed} of ${totalDrills} completed (${percentage}%)</div>
      <button class="reset-btn" onclick="window.viewer.drillSystem.resetDiagramProgress()">Reset Progress</button>
    `;

    return header;
  }

  groupDrillsByType(drills) {
    const grouped = {};
    for (const drill of drills) {
      const type = drill.type || 'recall';
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(drill);
    }
    return grouped;
  }

  createDrillSection(type, drills, diagramId) {
    const section = document.createElement('section');
    section.className = `drill-section drill-${type}`;

    const header = document.createElement('h3');
    header.textContent = this.getDrillTypeLabel(type);
    header.innerHTML += ` <span class="drill-count">(${drills.length})</span>`;
    section.appendChild(header);

    const description = document.createElement('p');
    description.className = 'drill-type-description';
    description.textContent = this.getDrillTypeDescription(type);
    section.appendChild(description);

    drills.forEach((drill, index) => {
      const drillEl = this.createDrillElement(drill, diagramId, index);
      section.appendChild(drillEl);
    });

    return section;
  }

  getDrillTypeLabel(type) {
    const labels = {
      'recall': '🧠 Recall',
      'apply': '⚡ Apply',
      'analyze': '🔍 Analyze',
      'create': '🛠️ Create'
    };
    return labels[type] || type;
  }

  getDrillTypeDescription(type) {
    const descriptions = {
      'recall': 'Test your memory of key concepts',
      'apply': 'Apply concepts to new scenarios',
      'analyze': 'Compare and contrast different approaches',
      'create': 'Design new solutions using learned principles'
    };
    return descriptions[type] || '';
  }

  createDrillElement(drill, diagramId, index) {
    const completed = this.progress.isDrillComplete(diagramId, drill.id);

    const element = document.createElement('details');
    element.className = `drill ${completed ? 'completed' : ''}`;
    element.dataset.drillId = drill.id;

    const summary = document.createElement('summary');
    summary.innerHTML = `
      <span class="drill-indicator">${completed ? '✓' : '○'}</span>
      <span class="drill-prompt">${drill.prompt}</span>
      <span class="drill-type-badge">${drill.type}</span>
    `;
    element.appendChild(summary);

    const content = document.createElement('div');
    content.className = 'drill-content';
    content.innerHTML = this.renderDrillInterface(drill);
    element.appendChild(content);

    // Add event listener for opening
    element.addEventListener('toggle', () => {
      if (element.open) {
        this.currentDrill = drill;
      }
    });

    return element;
  }

  renderDrillInterface(drill) {
    switch (drill.type) {
      case 'recall':
        return this.renderRecallDrill(drill);
      case 'apply':
        return this.renderApplyDrill(drill);
      case 'analyze':
        return this.renderAnalyzeDrill(drill);
      case 'create':
        return this.renderCreateDrill(drill);
      default:
        return this.renderRecallDrill(drill);
    }
  }

  renderRecallDrill(drill) {
    return `
      <div class="drill-recall">
        <div class="drill-question">
          ${drill.prompt}
        </div>
        <textarea
          id="answer-${drill.id}"
          placeholder="Enter your answer here..."
          rows="3"
          class="drill-answer"
        ></textarea>
        <div class="drill-actions">
          <button onclick="window.viewer.drillSystem.checkRecall('${drill.id}')">
            Check Answer
          </button>
          <button onclick="window.viewer.drillSystem.revealAnswer('${drill.id}')" class="secondary">
            Show Answer
          </button>
        </div>
        <div id="feedback-${drill.id}" class="drill-feedback" style="display:none">
          <div class="correct-answer">
            <strong>Answer:</strong> ${drill.answer || 'No answer provided'}
          </div>
        </div>
      </div>
    `;
  }

  renderApplyDrill(drill) {
    return `
      <div class="drill-apply">
        ${drill.scenario ? `
          <div class="scenario">
            <strong>Scenario:</strong> ${drill.scenario}
          </div>
        ` : ''}
        <textarea
          id="solution-${drill.id}"
          placeholder="Apply the concept to solve this problem..."
          rows="5"
          class="drill-solution"
        ></textarea>
        <div class="drill-actions">
          <button onclick="window.viewer.drillSystem.checkApply('${drill.id}')">
            Check Approach
          </button>
          <button onclick="window.viewer.drillSystem.revealRubric('${drill.id}')" class="secondary">
            Show Rubric
          </button>
        </div>
        <div id="rubric-${drill.id}" class="drill-rubric" style="display:none">
          <h4>Key Points to Consider:</h4>
          <ul>
            ${(drill.rubric || []).map(point =>
              `<li>
                <input type="checkbox" id="rubric-${drill.id}-${point.substring(0, 10)}">
                <label for="rubric-${drill.id}-${point.substring(0, 10)}">${point}</label>
              </li>`
            ).join('')}
          </ul>
        </div>
      </div>
    `;
  }

  renderAnalyzeDrill(drill) {
    return `
      <div class="drill-analyze">
        <div class="analysis-grid">
          <div class="analysis-section">
            <h4>Similarities</h4>
            <textarea
              id="similarities-${drill.id}"
              placeholder="What are the similarities?"
              rows="3"
            ></textarea>
          </div>
          <div class="analysis-section">
            <h4>Differences</h4>
            <textarea
              id="differences-${drill.id}"
              placeholder="What are the differences?"
              rows="3"
            ></textarea>
          </div>
          <div class="analysis-section">
            <h4>Trade-offs</h4>
            <textarea
              id="tradeoffs-${drill.id}"
              placeholder="What are the trade-offs?"
              rows="3"
            ></textarea>
          </div>
        </div>
        <div class="drill-actions">
          <button onclick="window.viewer.drillSystem.checkAnalysis('${drill.id}')">
            Check Analysis
          </button>
          <button onclick="window.viewer.drillSystem.revealAnalysis('${drill.id}')" class="secondary">
            Show Analysis Points
          </button>
        </div>
        <div id="analysis-${drill.id}" class="drill-analysis" style="display:none">
          <h4>Analysis Framework:</h4>
          <ul>
            ${(drill.rubric || []).map(point => `<li>${point}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
  }

  renderCreateDrill(drill) {
    return `
      <div class="drill-create">
        <div class="create-prompt">
          ${drill.prompt}
        </div>
        <textarea
          id="design-${drill.id}"
          placeholder="Design your solution here..."
          rows="8"
          class="drill-design"
        ></textarea>
        <div class="drill-actions">
          <button onclick="window.viewer.drillSystem.evaluateDesign('${drill.id}')">
            Self-Evaluate
          </button>
          <button onclick="window.viewer.drillSystem.showDesignCriteria('${drill.id}')" class="secondary">
            Show Design Criteria
          </button>
        </div>
        <div id="criteria-${drill.id}" class="drill-criteria" style="display:none">
          <h4>Design Criteria:</h4>
          <ul>
            ${(drill.rubric || []).map(criterion =>
              `<li>
                <input type="checkbox" id="criteria-${drill.id}-${criterion.substring(0, 10)}">
                <label for="criteria-${drill.id}-${criterion.substring(0, 10)}">${criterion}</label>
              </li>`
            ).join('')}
          </ul>
          <button onclick="window.viewer.drillSystem.markComplete('${drill.id}')" class="primary">
            Mark as Complete
          </button>
        </div>
      </div>
    `;
  }

  // Drill interaction methods
  checkRecall(drillId) {
    const answer = document.getElementById(`answer-${drillId}`).value;
    const feedback = document.getElementById(`feedback-${drillId}`);

    if (!answer.trim()) {
      alert('Please enter an answer');
      return;
    }

    feedback.style.display = 'block';
    this.progress.markDrillComplete(this.currentDiagramId, drillId);
    this.updateDrillStatus(drillId);
  }

  revealAnswer(drillId) {
    const feedback = document.getElementById(`feedback-${drillId}`);
    feedback.style.display = 'block';
  }

  checkApply(drillId) {
    const solution = document.getElementById(`solution-${drillId}`).value;

    if (!solution.trim()) {
      alert('Please enter your solution');
      return;
    }

    this.revealRubric(drillId);
    this.progress.markDrillComplete(this.currentDiagramId, drillId);
    this.updateDrillStatus(drillId);
  }

  revealRubric(drillId) {
    const rubric = document.getElementById(`rubric-${drillId}`);
    rubric.style.display = 'block';
  }

  checkAnalysis(drillId) {
    const similarities = document.getElementById(`similarities-${drillId}`).value;
    const differences = document.getElementById(`differences-${drillId}`).value;
    const tradeoffs = document.getElementById(`tradeoffs-${drillId}`).value;

    if (!similarities.trim() || !differences.trim() || !tradeoffs.trim()) {
      alert('Please complete all three analysis sections');
      return;
    }

    this.revealAnalysis(drillId);
    this.progress.markDrillComplete(this.currentDiagramId, drillId);
    this.updateDrillStatus(drillId);
  }

  revealAnalysis(drillId) {
    const analysis = document.getElementById(`analysis-${drillId}`);
    analysis.style.display = 'block';
  }

  evaluateDesign(drillId) {
    const design = document.getElementById(`design-${drillId}`).value;

    if (!design.trim()) {
      alert('Please enter your design');
      return;
    }

    this.showDesignCriteria(drillId);
  }

  showDesignCriteria(drillId) {
    const criteria = document.getElementById(`criteria-${drillId}`);
    criteria.style.display = 'block';
  }

  markComplete(drillId) {
    this.progress.markDrillComplete(this.currentDiagramId, drillId);
    this.updateDrillStatus(drillId);

    // Check if all drills for current state are complete and auto-advance
    if (this.stateManager && this.shouldAdvanceState()) {
      setTimeout(() => {
        this.stateManager.next();
      }, 1500); // Small delay to let user see completion
    }

    alert('Well done! Design drill marked as complete.');
  }

  // Check if we should advance to next state based on drill completion
  shouldAdvanceState() {
    const currentState = this.stateManager.getCurrentState();
    if (!currentState) return false;

    // Get all drills associated with current state
    const stateDrills = document.querySelectorAll(`.drill[data-state-id="${currentState.id}"]`);
    if (stateDrills.length === 0) return false;

    // Check if all state drills are complete
    for (const drill of stateDrills) {
      if (!drill.classList.contains('completed')) {
        return false;
      }
    }

    return true;
  }

  updateDrillStatus(drillId) {
    const drillElement = document.querySelector(`[data-drill-id="${drillId}"]`);
    if (drillElement) {
      drillElement.classList.add('completed');
      const indicator = drillElement.querySelector('.drill-indicator');
      if (indicator) {
        indicator.textContent = '✓';
      }
    }

    // Refresh progress header
    const spec = { id: this.currentDiagramId, drills: [] };
    const drillElements = document.querySelectorAll('.drill');
    spec.drills = Array.from(drillElements).map(el => ({ id: el.dataset.drillId }));

    const container = document.getElementById('drills-container');
    const oldHeader = container.querySelector('.drills-progress');
    const newHeader = this.createProgressHeader(this.currentDiagramId, spec.drills.length);

    if (oldHeader) {
      container.replaceChild(newHeader, oldHeader);
    }
  }

  resetDiagramProgress() {
    if (confirm('Are you sure you want to reset your progress for this diagram?')) {
      this.progress.resetProgress(this.currentDiagramId);
      location.reload(); // Simple refresh to reset UI
    }
  }
}

// Export for module systems, or make global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DrillSystem, ProgressTracker };
} else {
  window.DrillSystem = DrillSystem;
  window.ProgressTracker = ProgressTracker;
}

// === src/learning/progress.js ===
class LearningProgress {
  constructor() {
    this.storageKey = 'gfs-learning-overall-progress';
    this.sessionKey = 'gfs-learning-session';
    this.data = this.load();
    this.session = this.loadSession();
    this.initSession();
  }

  load() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      return saved ? JSON.parse(saved) : {
        diagrams: {},
        achievements: [],
        totalTime: 0,
        startDate: Date.now(),
        lastActive: Date.now()
      };
    } catch (error) {
      console.error('Failed to load progress:', error);
      return this.getDefaultData();
    }
  }

  loadSession() {
    try {
      const saved = sessionStorage.getItem(this.sessionKey);
      return saved ? JSON.parse(saved) : this.getDefaultSession();
    } catch (error) {
      return this.getDefaultSession();
    }
  }

  getDefaultData() {
    return {
      diagrams: {},
      achievements: [],
      totalTime: 0,
      startDate: Date.now(),
      lastActive: Date.now()
    };
  }

  getDefaultSession() {
    return {
      startTime: Date.now(),
      diagramsViewed: [],
      drillsCompleted: 0,
      stepsViewed: 0
    };
  }

  initSession() {
    // Track page visibility for accurate time tracking
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseSession();
      } else {
        this.resumeSession();
      }
    });

    // Save on page unload
    window.addEventListener('beforeunload', () => {
      this.saveSession();
      this.save();
    });

    // Auto-save every minute
    setInterval(() => {
      this.save();
    }, 60000);
  }

  save() {
    try {
      this.data.lastActive = Date.now();
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  }

  saveSession() {
    try {
      sessionStorage.setItem(this.sessionKey, JSON.stringify(this.session));
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }

  pauseSession() {
    if (this.session.pauseTime) return;
    this.session.pauseTime = Date.now();
  }

  resumeSession() {
    if (!this.session.pauseTime) return;
    const pauseDuration = Date.now() - this.session.pauseTime;
    this.session.startTime += pauseDuration; // Adjust start time to exclude pause
    delete this.session.pauseTime;
  }

  // Diagram progress tracking
  markDiagramViewed(diagramId) {
    if (!this.data.diagrams[diagramId]) {
      this.data.diagrams[diagramId] = {
        firstViewed: Date.now(),
        lastViewed: Date.now(),
        viewCount: 0,
        timeSpent: 0,
        drillsCompleted: 0,
        totalDrills: 0,
        stepsCompleted: 0,
        totalSteps: 0
      };
    }

    this.data.diagrams[diagramId].viewCount++;
    this.data.diagrams[diagramId].lastViewed = Date.now();

    if (!this.session.diagramsViewed.includes(diagramId)) {
      this.session.diagramsViewed.push(diagramId);
    }

    this.save();
  }

  updateDiagramTime(diagramId, seconds) {
    if (!this.data.diagrams[diagramId]) {
      this.markDiagramViewed(diagramId);
    }

    this.data.diagrams[diagramId].timeSpent += seconds;
    this.data.totalTime += seconds;
    this.save();
  }

  updateDrillProgress(diagramId, completed, total) {
    if (!this.data.diagrams[diagramId]) {
      this.markDiagramViewed(diagramId);
    }

    this.data.diagrams[diagramId].drillsCompleted = completed;
    this.data.diagrams[diagramId].totalDrills = total;

    // Check for achievements
    this.checkDrillAchievements(diagramId, completed, total);

    this.save();
  }

  updateStepProgress(diagramId, currentStep, totalSteps) {
    if (!this.data.diagrams[diagramId]) {
      this.markDiagramViewed(diagramId);
    }

    this.data.diagrams[diagramId].stepsCompleted = Math.max(
      currentStep,
      this.data.diagrams[diagramId].stepsCompleted || 0
    );
    this.data.diagrams[diagramId].totalSteps = totalSteps;

    this.session.stepsViewed++;
    this.saveSession();
    this.save();
  }

  // Achievement system
  checkDrillAchievements(diagramId, completed, total) {
    const achievements = [];

    // First drill completed
    if (completed === 1 && !this.hasAchievement('first-drill')) {
      achievements.push({
        id: 'first-drill',
        title: 'First Steps',
        description: 'Completed your first drill',
        icon: '🎯',
        timestamp: Date.now()
      });
    }

    // Complete all drills for a diagram
    if (completed === total && total > 0 && !this.hasAchievement(`master-${diagramId}`)) {
      achievements.push({
        id: `master-${diagramId}`,
        title: 'Diagram Master',
        description: `Completed all drills for ${diagramId}`,
        icon: '🏆',
        timestamp: Date.now()
      });
    }

    // Speed learner (complete 5 drills in one session)
    if (this.session.drillsCompleted >= 5 && !this.hasAchievement('speed-learner')) {
      achievements.push({
        id: 'speed-learner',
        title: 'Speed Learner',
        description: 'Completed 5 drills in one session',
        icon: '⚡',
        timestamp: Date.now()
      });
    }

    // Add new achievements
    achievements.forEach(achievement => {
      this.addAchievement(achievement);
    });

    return achievements;
  }

  hasAchievement(id) {
    return this.data.achievements.some(a => a.id === id);
  }

  addAchievement(achievement) {
    if (!this.hasAchievement(achievement.id)) {
      this.data.achievements.push(achievement);
      this.save();
      this.notifyAchievement(achievement);
    }
  }

  notifyAchievement(achievement) {
    // Emit event for UI to handle
    const event = new CustomEvent('achievement', {
      detail: achievement
    });
    document.dispatchEvent(event);
  }

  // Statistics and reporting
  getOverallProgress() {
    const stats = {
      totalDiagrams: 0,
      completedDiagrams: 0,
      totalDrills: 0,
      completedDrills: 0,
      totalTime: this.data.totalTime,
      achievements: this.data.achievements.length,
      daysActive: this.getDaysActive()
    };

    Object.values(this.data.diagrams).forEach(diagram => {
      stats.totalDiagrams++;
      stats.totalDrills += diagram.totalDrills || 0;
      stats.completedDrills += diagram.drillsCompleted || 0;

      if (diagram.totalDrills > 0 && diagram.drillsCompleted === diagram.totalDrills) {
        stats.completedDiagrams++;
      }
    });

    stats.completionPercentage = stats.totalDrills > 0
      ? Math.round((stats.completedDrills / stats.totalDrills) * 100)
      : 0;

    return stats;
  }

  getDiagramStats(diagramId) {
    const diagram = this.data.diagrams[diagramId] || {
      viewCount: 0,
      timeSpent: 0,
      drillsCompleted: 0,
      totalDrills: 0,
      stepsCompleted: 0,
      totalSteps: 0
    };

    return {
      ...diagram,
      completionPercentage: diagram.totalDrills > 0
        ? Math.round((diagram.drillsCompleted / diagram.totalDrills) * 100)
        : 0,
      formattedTime: this.formatTime(diagram.timeSpent)
    };
  }

  getSessionStats() {
    const duration = Date.now() - this.session.startTime;

    return {
      duration: this.formatTime(Math.floor(duration / 1000)),
      diagramsViewed: this.session.diagramsViewed.length,
      drillsCompleted: this.session.drillsCompleted,
      stepsViewed: this.session.stepsViewed
    };
  }

  getDaysActive() {
    const daysSinceStart = Math.floor((Date.now() - this.data.startDate) / (1000 * 60 * 60 * 24));
    return Math.max(1, daysSinceStart);
  }

  formatTime(seconds) {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }

  // Export/Import functionality
  exportProgress() {
    return {
      version: '1.0',
      exportDate: Date.now(),
      data: this.data
    };
  }

  importProgress(exportedData) {
    if (exportedData.version === '1.0' && exportedData.data) {
      this.data = exportedData.data;
      this.save();
      return true;
    }
    return false;
  }

  // Reset functionality
  resetDiagram(diagramId) {
    if (this.data.diagrams[diagramId]) {
      delete this.data.diagrams[diagramId];
      this.save();
    }
  }

  resetAll() {
    if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
      this.data = this.getDefaultData();
      this.session = this.getDefaultSession();
      this.save();
      this.saveSession();
      location.reload();
    }
  }

  // Learning path recommendations
  getRecommendations() {
    const recommendations = [];
    const stats = this.getOverallProgress();

    // Suggest unviewed diagrams
    const allDiagramIds = [
      '00-legend', '01-triangle', '02-scale', '03-chunk-size',
      '04-architecture', '05-planes', '06-read-path', '07-write-path',
      '08-lease', '09-consistency', '10-recovery', '11-evolution', '12-dna'
    ];

    const unviewed = allDiagramIds.filter(id => !this.data.diagrams[id]);
    if (unviewed.length > 0) {
      recommendations.push({
        type: 'explore',
        title: 'Explore New Diagrams',
        description: `You have ${unviewed.length} diagrams yet to explore`,
        action: 'view',
        target: unviewed[0]
      });
    }

    // Suggest incomplete drills
    const incomplete = Object.entries(this.data.diagrams)
      .filter(([id, data]) => data.totalDrills > data.drillsCompleted)
      .map(([id, data]) => ({
        id,
        remaining: data.totalDrills - data.drillsCompleted
      }));

    if (incomplete.length > 0) {
      const next = incomplete[0];
      recommendations.push({
        type: 'practice',
        title: 'Complete Drills',
        description: `${next.remaining} drills remaining in ${next.id}`,
        action: 'drill',
        target: next.id
      });
    }

    // Suggest review based on time
    const oldestViewed = Object.entries(this.data.diagrams)
      .sort(([, a], [, b]) => a.lastViewed - b.lastViewed)
      .slice(0, 3);

    if (oldestViewed.length > 0) {
      const [id, data] = oldestViewed[0];
      const daysSince = Math.floor((Date.now() - data.lastViewed) / (1000 * 60 * 60 * 24));

      if (daysSince > 7) {
        recommendations.push({
          type: 'review',
          title: 'Time for Review',
          description: `Review ${id} (last viewed ${daysSince} days ago)`,
          action: 'review',
          target: id
        });
      }
    }

    return recommendations;
  }
}

// Export for module systems, or make global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LearningProgress;
} else {
  window.LearningProgress = LearningProgress;
}

// === src/learning/stepper.js ===
class StepThroughEngine {
  constructor(renderer, composer) {
    this.renderer = renderer;
    this.composer = composer;
    this.currentStep = 0;
    this.steps = [];
    this.spec = null;
    this.isPlaying = false;
    this.playInterval = null;
    this.playSpeed = 2000; // milliseconds between steps
  }

  initialize(spec) {
    this.spec = spec;
    this.steps = this.buildSteps(spec);
    this.currentStep = 0;
    this.isPlaying = false;
    this.stopAutoPlay();
  }

  buildSteps(spec) {
    const steps = [];

    // Start with empty state if applicable
    if (spec.layout?.type === 'sequence' || spec.layout?.type === 'flow') {
      steps.push({
        type: 'initial',
        index: -1,
        caption: 'Initial state - no operations yet',
        spec: {
          ...spec,
          nodes: spec.nodes || [],
          edges: []
        }
      });
    }

    // For sequence diagrams, each edge is a step
    if (spec.layout?.type === 'sequence') {
      (spec.edges || []).forEach((edge, index) => {
        steps.push({
          type: 'edge',
          index,
          edgeId: edge.id,
          caption: this.generateStepCaption(edge, spec),
          focus: [edge.from, edge.to],
          spec: {
            ...spec,
            edges: spec.edges.slice(0, index + 1).map((e, i) => ({
              ...e,
              _highlighted: i === index,
              _current: i === index
            }))
          }
        });
      });
    }

    // For flow diagrams with scenes
    if (spec.scenes && spec.scenes.length > 0) {
      spec.scenes.forEach((scene, index) => {
        const composedSpec = this.composer.composeScene(spec, scene.overlays || []);
        steps.push({
          type: 'scene',
          index,
          sceneId: scene.id,
          caption: scene.narrative || scene.name,
          overlays: scene.overlays || [],
          spec: composedSpec
        });
      });
    }

    // For state diagrams, show state transitions
    if (spec.layout?.type === 'state') {
      // Show initial state
      steps.push({
        type: 'state',
        index: 0,
        caption: 'Initial state',
        spec: {
          ...spec,
          edges: []
        }
      });

      // Show each transition
      (spec.edges || []).forEach((edge, index) => {
        const edgesSoFar = spec.edges.slice(0, index + 1);
        steps.push({
          type: 'transition',
          index: index + 1,
          edgeId: edge.id,
          caption: `Transition: ${edge.label || `${edge.from} → ${edge.to}`}`,
          spec: {
            ...spec,
            edges: edgesSoFar.map((e, i) => ({
              ...e,
              _highlighted: i === index
            }))
          }
        });
      });
    }

    // Add final step if we have steps
    if (steps.length > 0) {
      steps.push({
        type: 'final',
        index: steps.length,
        caption: 'Complete flow',
        spec: spec
      });
    }

    return steps;
  }

  generateStepCaption(edge, spec) {
    const fromNode = spec.nodes?.find(n => n.id === edge.from);
    const toNode = spec.nodes?.find(n => n.id === edge.to);

    const verbMap = {
      'control': 'requests',
      'data': 'transfers',
      'cache': 'caches',
      'heartbeat': 'heartbeats to'
    };

    const verb = verbMap[edge.kind] || 'sends to';
    const fromLabel = fromNode?.label || edge.from;
    const toLabel = toNode?.label || edge.to;

    let caption = `${fromLabel} ${verb} ${toLabel}`;

    if (edge.label) {
      caption = `${fromLabel}: ${edge.label}`;
    }

    // Add metrics if available
    if (edge.metrics) {
      const metrics = [];
      if (edge.metrics.size) metrics.push(edge.metrics.size);
      if (edge.metrics.latency) metrics.push(edge.metrics.latency);
      if (metrics.length > 0) {
        caption += ` (${metrics.join(', ')})`;
      }
    }

    return caption;
  }

  async renderStep(stepIndex) {
    if (stepIndex < 0 || stepIndex >= this.steps.length) {
      return;
    }

    this.currentStep = stepIndex;
    const step = this.steps[stepIndex];

    // Render the diagram for this step
    await this.renderer.render(step.spec);

    // Update UI controls
    this.updateStepUI(step, stepIndex);

    // Emit event for other components
    this.emitStepChange(step, stepIndex);
  }

  updateStepUI(step, index) {
    // Update caption
    const captionEl = document.getElementById('step-caption');
    if (captionEl) {
      captionEl.textContent = step.caption;
    }

    // Update progress
    const progressEl = document.getElementById('step-progress');
    if (progressEl) {
      progressEl.textContent = `Step ${index + 1} of ${this.steps.length}`;
    }

    // Update progress bar
    const progressBar = document.getElementById('step-progress-bar');
    if (progressBar) {
      const percentage = ((index + 1) / this.steps.length) * 100;
      progressBar.style.width = `${percentage}%`;
    }

    // Update buttons
    const prevBtn = document.getElementById('step-prev');
    const nextBtn = document.getElementById('step-next');
    const playBtn = document.getElementById('step-play');

    if (prevBtn) {
      prevBtn.disabled = index === 0;
    }

    if (nextBtn) {
      nextBtn.disabled = index === this.steps.length - 1;
    }

    if (playBtn) {
      playBtn.textContent = this.isPlaying ? '⏸ Pause' : '▶ Play';
      playBtn.disabled = index === this.steps.length - 1 && !this.isPlaying;
    }

    // Update step list if present
    this.updateStepList(index);

    // Highlight focused elements if specified
    if (step.focus) {
      this.highlightElements(step.focus);
    }
  }

  updateStepList(currentIndex) {
    const stepList = document.getElementById('step-list');
    if (!stepList) return;

    stepList.innerHTML = '';

    this.steps.forEach((step, index) => {
      const li = document.createElement('li');
      li.className = 'step-item';
      if (index === currentIndex) {
        li.classList.add('current');
      }
      if (index < currentIndex) {
        li.classList.add('completed');
      }

      const button = document.createElement('button');
      button.className = 'step-button';
      button.innerHTML = `
        <span class="step-number">${index + 1}</span>
        <span class="step-text">${step.caption}</span>
      `;
      button.onclick = () => this.goToStep(index);

      li.appendChild(button);
      stepList.appendChild(li);
    });
  }

  highlightElements(elementIds) {
    // Remove previous highlights
    document.querySelectorAll('.step-highlight').forEach(el => {
      el.classList.remove('step-highlight');
    });

    // Add new highlights
    elementIds.forEach(id => {
      const elements = document.querySelectorAll(`[id*="${id}"]`);
      elements.forEach(el => {
        el.classList.add('step-highlight');
      });
    });
  }

  emitStepChange(step, index) {
    const event = new CustomEvent('stepChange', {
      detail: {
        step,
        index,
        total: this.steps.length,
        isFirst: index === 0,
        isLast: index === this.steps.length - 1
      }
    });
    document.dispatchEvent(event);
  }

  // Navigation methods
  async next() {
    if (this.currentStep < this.steps.length - 1) {
      await this.renderStep(this.currentStep + 1);
    } else if (this.isPlaying) {
      this.stopAutoPlay();
    }
  }

  async prev() {
    if (this.currentStep > 0) {
      await this.renderStep(this.currentStep - 1);
    }
  }

  async goToStep(index) {
    if (index >= 0 && index < this.steps.length) {
      await this.renderStep(index);
    }
  }

  async first() {
    await this.renderStep(0);
  }

  async last() {
    await this.renderStep(this.steps.length - 1);
  }

  // Auto-play functionality
  toggleAutoPlay() {
    if (this.isPlaying) {
      this.stopAutoPlay();
    } else {
      this.startAutoPlay();
    }
  }

  startAutoPlay() {
    if (this.currentStep >= this.steps.length - 1) {
      // Reset to beginning if at end
      this.goToStep(0);
    }

    this.isPlaying = true;
    this.updatePlayButton();

    this.playInterval = setInterval(async () => {
      await this.next();
      if (this.currentStep >= this.steps.length - 1) {
        this.stopAutoPlay();
      }
    }, this.playSpeed);
  }

  stopAutoPlay() {
    this.isPlaying = false;
    if (this.playInterval) {
      clearInterval(this.playInterval);
      this.playInterval = null;
    }
    this.updatePlayButton();
  }

  updatePlayButton() {
    const playBtn = document.getElementById('step-play');
    if (playBtn) {
      playBtn.textContent = this.isPlaying ? '⏸ Pause' : '▶ Play';
    }
  }

  setPlaySpeed(speed) {
    this.playSpeed = speed;
    if (this.isPlaying) {
      this.stopAutoPlay();
      this.startAutoPlay();
    }
  }

  // Utility methods
  getCurrentStep() {
    return this.steps[this.currentStep];
  }

  getStepCount() {
    return this.steps.length;
  }

  getCurrentIndex() {
    return this.currentStep;
  }

  // Export steps for external use
  exportSteps() {
    return this.steps.map((step, index) => ({
      index,
      type: step.type,
      caption: step.caption,
      isCurrent: index === this.currentStep
    }));
  }

  // Reset to initial state
  reset() {
    this.stopAutoPlay();
    this.currentStep = 0;
    if (this.steps.length > 0) {
      this.renderStep(0);
    }
  }

  // Cleanup method to prevent memory leaks
  destroy() {
    this.stopAutoPlay();
    this.steps = [];
    this.spec = null;
    this.currentStep = 0;
    this.renderer = null;
    this.composer = null;
  }
}

// Export for module systems, or make global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StepThroughEngine;
} else {
  window.StepThroughEngine = StepThroughEngine;
}

// === src/ui/export.js ===
class ExportManager {
  constructor(viewer) {
    this.viewer = viewer;
  }

  showExportDialog() {
    const modal = document.createElement('div');
    modal.className = 'modal export-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Export Diagram</h2>
          <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
        </div>
        <div class="modal-body">
          <div class="export-options">
            <button class="export-option" onclick="viewer.exportManager.exportSVG()">
              <span class="export-icon">🖼️</span>
              <span class="export-label">Export as SVG</span>
              <span class="export-desc">Vector image for presentations</span>
            </button>
            <button class="export-option" onclick="viewer.exportManager.exportPNG()">
              <span class="export-icon">📷</span>
              <span class="export-label">Export as PNG</span>
              <span class="export-desc">Image for documents</span>
            </button>
            <button class="export-option" onclick="viewer.exportManager.exportJSON()">
              <span class="export-icon">📄</span>
              <span class="export-label">Export as JSON</span>
              <span class="export-desc">Raw specification data</span>
            </button>
            <button class="export-option" onclick="viewer.exportManager.exportMermaid()">
              <span class="export-icon">📝</span>
              <span class="export-label">Export Mermaid Code</span>
              <span class="export-desc">Editable diagram source</span>
            </button>
            <button class="export-option" onclick="viewer.exportManager.exportProgress()">
              <span class="export-icon">📊</span>
              <span class="export-label">Export Progress</span>
              <span class="export-desc">Backup learning progress</span>
            </button>
            <button class="export-option" onclick="viewer.exportManager.printDiagram()">
              <span class="export-icon">🖨️</span>
              <span class="export-label">Print Diagram</span>
              <span class="export-desc">Send to printer or PDF</span>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  exportSVG() {
    const svg = document.querySelector('#diagram-container svg');
    if (!svg) {
      alert('No diagram to export');
      return;
    }

    // Clone and prepare SVG
    const svgClone = svg.cloneNode(true);
    this.addSVGStyles(svgClone);

    // Add title and metadata
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = this.viewer.currentSpec.title || 'GFS Diagram';
    svgClone.insertBefore(title, svgClone.firstChild);

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgClone);

    // Create blob and download
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    this.downloadBlob(blob, `${this.viewer.currentDiagramId}.svg`);

    // Close modal
    this.closeModal();
  }

  exportPNG() {
    const svg = document.querySelector('#diagram-container svg');
    if (!svg) {
      alert('No diagram to export');
      return;
    }

    // Get SVG dimensions
    const bbox = svg.getBBox();
    const width = bbox.width + bbox.x * 2;
    const height = bbox.height + bbox.y * 2;

    // Create canvas
    const canvas = document.createElement('canvas');
    const scale = 2; // Higher resolution
    canvas.width = width * scale;
    canvas.height = height * scale;

    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    // Set white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    // Convert SVG to data URL
    const svgClone = svg.cloneNode(true);
    this.addSVGStyles(svgClone);

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgClone);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    // Create image and draw to canvas
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(svgUrl);

      // Export canvas as PNG
      canvas.toBlob((blob) => {
        this.downloadBlob(blob, `${this.viewer.currentDiagramId}.png`);
        this.closeModal();
      }, 'image/png');
    };

    img.src = svgUrl;
  }

  exportJSON() {
    if (!this.viewer.currentSpec) {
      alert('No diagram to export');
      return;
    }

    // Include current state
    const exportData = {
      ...this.viewer.currentSpec,
      _export: {
        timestamp: Date.now(),
        version: '1.0',
        activeOverlays: Array.from(this.viewer.currentOverlays)
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json;charset=utf-8'
    });

    this.downloadBlob(blob, `${this.viewer.currentDiagramId}.json`);
    this.closeModal();
  }

  exportMermaid() {
    if (!this.viewer.currentSpec) {
      alert('No diagram to export');
      return;
    }

    // Generate Mermaid code
    const composed = this.viewer.composer.composeScene(
      this.viewer.currentSpec,
      Array.from(this.viewer.currentOverlays)
    );

    const mermaidCode = this.viewer.renderer.generateMermaidCode(composed);

    // Add header comment
    const exportContent = `# ${this.viewer.currentSpec.title}
# Generated: ${new Date().toISOString()}
# Overlays: ${Array.from(this.viewer.currentOverlays).join(', ') || 'none'}

${mermaidCode}`;

    const blob = new Blob([exportContent], {
      type: 'text/plain;charset=utf-8'
    });

    this.downloadBlob(blob, `${this.viewer.currentDiagramId}.mmd`);
    this.closeModal();
  }

  exportProgress() {
    const progressData = this.viewer.learningProgress.exportProgress();
    const blob = new Blob([JSON.stringify(progressData, null, 2)], {
      type: 'application/json;charset=utf-8'
    });

    const date = new Date().toISOString().split('T')[0];
    this.downloadBlob(blob, `gfs-progress-${date}.json`);
    this.closeModal();
  }

  printDiagram() {
    // Create print-specific styles
    const printStyles = `
      @media print {
        body > *:not(.print-content) {
          display: none !important;
        }
        .print-content {
          display: block !important;
          padding: 20px;
        }
        .print-header {
          margin-bottom: 20px;
          border-bottom: 2px solid #333;
          padding-bottom: 10px;
        }
        .print-diagram {
          max-width: 100%;
          page-break-inside: avoid;
        }
        .print-contracts {
          margin-top: 20px;
          page-break-inside: avoid;
        }
        .print-contracts h3 {
          margin-top: 15px;
        }
        .print-contracts ul {
          margin-left: 20px;
        }
      }
    `;

    // Add print styles to head
    const styleEl = document.createElement('style');
    styleEl.textContent = printStyles;
    document.head.appendChild(styleEl);

    // Create print content
    const printContent = document.createElement('div');
    printContent.className = 'print-content';
    printContent.style.display = 'none';

    // Add header
    const header = document.createElement('div');
    header.className = 'print-header';
    header.innerHTML = `
      <h1>${this.viewer.currentSpec.title}</h1>
      <p>GFS Visual Learning System - ${new Date().toLocaleDateString()}</p>
    `;
    printContent.appendChild(header);

    // Add diagram
    const diagramContainer = document.createElement('div');
    diagramContainer.className = 'print-diagram';
    const svg = document.querySelector('#diagram-container svg');
    if (svg) {
      diagramContainer.appendChild(svg.cloneNode(true));
    }
    printContent.appendChild(diagramContainer);

    // Add contracts if available
    if (this.viewer.currentSpec.contracts) {
      const contracts = document.createElement('div');
      contracts.className = 'print-contracts';
      contracts.innerHTML = `
        <h2>System Contracts</h2>
        ${this.viewer.currentSpec.contracts.invariants?.length > 0 ? `
          <div>
            <h3>Invariants</h3>
            <ul>
              ${this.viewer.currentSpec.contracts.invariants.map(i => `<li>${i}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        ${this.viewer.currentSpec.contracts.guarantees?.length > 0 ? `
          <div>
            <h3>Guarantees</h3>
            <ul>
              ${this.viewer.currentSpec.contracts.guarantees.map(g => `<li>${g}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        ${this.viewer.currentSpec.contracts.caveats?.length > 0 ? `
          <div>
            <h3>Caveats</h3>
            <ul>
              ${this.viewer.currentSpec.contracts.caveats.map(c => `<li>${c}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      `;
      printContent.appendChild(contracts);
    }

    // Add to body
    document.body.appendChild(printContent);

    // Print
    window.print();

    // Clean up
    setTimeout(() => {
      printContent.remove();
      styleEl.remove();
    }, 1000);

    this.closeModal();
  }

  addSVGStyles(svg) {
    // Embed styles directly in SVG for standalone export
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = `
      text {
        font-family: 'Trebuchet MS', Arial, sans-serif;
        font-size: 14px;
      }
      .node rect {
        stroke-width: 2px;
      }
      .edgeLabel {
        background-color: white;
        padding: 2px 4px;
      }
      .highlight {
        fill: #FFD700 !important;
        stroke: #B8860B !important;
        stroke-width: 4px !important;
      }
    `;
    svg.insertBefore(style, svg.firstChild);

    // Set viewBox if not present
    if (!svg.getAttribute('viewBox')) {
      const bbox = svg.getBBox();
      svg.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
    }

    // Set dimensions
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
  }

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  closeModal() {
    const modal = document.querySelector('.export-modal');
    if (modal) {
      modal.remove();
    }
  }

  // Import functionality
  showImportDialog() {
    const modal = document.createElement('div');
    modal.className = 'modal import-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Import Data</h2>
          <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
        </div>
        <div class="modal-body">
          <div class="import-section">
            <h3>Import Progress Data</h3>
            <p>Restore your learning progress from a backup file.</p>
            <input type="file" id="import-progress" accept=".json">
            <button onclick="viewer.exportManager.importProgressFile()">Import Progress</button>
          </div>
          <div class="import-section">
            <h3>Import Custom Diagram</h3>
            <p>Load a custom diagram specification.</p>
            <input type="file" id="import-diagram" accept=".json">
            <button onclick="viewer.exportManager.importDiagramFile()">Import Diagram</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  async importProgressFile() {
    const input = document.getElementById('import-progress');
    if (!input.files[0]) {
      alert('Please select a file');
      return;
    }

    try {
      const text = await input.files[0].text();
      const data = JSON.parse(text);

      if (this.viewer.learningProgress.importProgress(data)) {
        alert('Progress imported successfully!');
        location.reload();
      } else {
        alert('Invalid progress file');
      }
    } catch (error) {
      alert('Failed to import progress: ' + error.message);
    }
  }

  async importDiagramFile() {
    const input = document.getElementById('import-diagram');
    if (!input.files[0]) {
      alert('Please select a file');
      return;
    }

    try {
      const text = await input.files[0].text();
      const spec = JSON.parse(text);

      // Validate the spec
      this.viewer.validator.validateSpec(spec);

      // Load the diagram
      this.viewer.currentSpec = spec;
      this.viewer.currentDiagramId = spec.id || 'custom';

      // Apply saved overlays if present
      if (spec._export?.activeOverlays) {
        this.viewer.currentOverlays = new Set(spec._export.activeOverlays);
      }

      // Render
      await this.viewer.renderDiagram();
      this.viewer.renderNarrative(spec);
      this.viewer.renderContracts(spec);
      this.viewer.drillSystem.renderDrills(spec);

      alert('Diagram imported successfully!');
      this.closeModal();
    } catch (error) {
      alert('Failed to import diagram: ' + error.message);
    }
  }
}

// Export for module systems, or make global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExportManager;
} else {
  window.ExportManager = ExportManager;
}

// === src/ui/overlays.js ===
class OverlayManager {
  constructor(viewer) {
    this.viewer = viewer;
    this.activeOverlays = new Set();
  }

  renderOverlayChips(spec) {
    const container = document.getElementById('overlay-chips');
    if (!container) return;

    const overlays = spec.overlays || [];

    if (overlays.length === 0) {
      container.innerHTML = '<div class="no-overlays">No overlays available</div>';
      return;
    }

    container.innerHTML = '';

    // Add header
    const header = document.createElement('div');
    header.className = 'overlays-header';
    header.innerHTML = `
      <h3>Overlays</h3>
      <button class="clear-overlays" onclick="viewer.overlayManager.clearAll()">Clear All</button>
    `;
    container.appendChild(header);

    // Add overlay chips
    const chipsContainer = document.createElement('div');
    chipsContainer.className = 'chips-container';

    overlays.forEach((overlay, index) => {
      const chip = this.createOverlayChip(overlay, index);
      chipsContainer.appendChild(chip);
    });

    container.appendChild(chipsContainer);

    // Add scenes if available
    if (spec.scenes && spec.scenes.length > 0) {
      this.renderSceneButtons(spec.scenes, container);
    }
  }

  createOverlayChip(overlay, index) {
    const chip = document.createElement('button');
    chip.className = 'overlay-chip';
    chip.dataset.overlayId = overlay.id;
    chip.dataset.index = index;

    const isActive = this.activeOverlays.has(overlay.id);
    if (isActive) {
      chip.classList.add('active');
    }

    chip.innerHTML = `
      <span class="chip-number">${index + 1}</span>
      <span class="chip-label">${overlay.caption}</span>
      <span class="chip-indicator">${isActive ? '✓' : '○'}</span>
    `;

    chip.onclick = () => this.toggleOverlay(overlay.id);

    // Add tooltip
    chip.title = `Press ${index + 1} to toggle`;

    return chip;
  }

  renderSceneButtons(scenes, container) {
    const scenesSection = document.createElement('div');
    scenesSection.className = 'scenes-section';
    scenesSection.innerHTML = '<h4>Scenes</h4>';

    const scenesGrid = document.createElement('div');
    scenesGrid.className = 'scenes-grid';

    scenes.forEach(scene => {
      const button = document.createElement('button');
      button.className = 'scene-button';
      button.innerHTML = `
        <span class="scene-name">${scene.name}</span>
        ${scene.overlays?.length > 0 ?
          `<span class="scene-overlays">${scene.overlays.length} overlays</span>` : ''}
      `;

      button.onclick = () => this.applyScene(scene);
      scenesGrid.appendChild(button);
    });

    scenesSection.appendChild(scenesGrid);
    container.appendChild(scenesSection);
  }

  toggleOverlay(overlayId) {
    if (this.activeOverlays.has(overlayId)) {
      this.activeOverlays.delete(overlayId);
    } else {
      this.activeOverlays.add(overlayId);
    }

    this.updateUI();
    this.emitChange();
  }

  toggleOverlayByIndex(index) {
    const chip = document.querySelector(`.overlay-chip[data-index="${index}"]`);
    if (chip) {
      const overlayId = chip.dataset.overlayId;
      this.toggleOverlay(overlayId);
    }
  }

  applyScene(scene) {
    // Clear current overlays
    this.activeOverlays.clear();

    // Apply scene overlays
    if (scene.overlays) {
      scene.overlays.forEach(overlayId => {
        this.activeOverlays.add(overlayId);
      });
    }

    this.updateUI();
    this.emitChange();

    // Show scene narrative if available
    if (scene.narrative) {
      this.showSceneNarrative(scene);
    }
  }

  showSceneNarrative(scene) {
    const narrativeEl = document.getElementById('narrative-panel');
    if (narrativeEl) {
      narrativeEl.innerHTML = `
        <div class="scene-narrative">
          <h4>📖 ${scene.name}</h4>
          <p>${scene.narrative}</p>
        </div>
      `;

      // Auto-hide after 5 seconds
      setTimeout(() => {
        if (narrativeEl.querySelector('.scene-narrative')) {
          this.viewer.renderNarrative(this.viewer.currentSpec);
        }
      }, 5000);
    }
  }

  clearAll() {
    this.activeOverlays.clear();
    this.updateUI();
    this.emitChange();
  }

  updateUI() {
    // Update all chip states
    document.querySelectorAll('.overlay-chip').forEach(chip => {
      const overlayId = chip.dataset.overlayId;
      const isActive = this.activeOverlays.has(overlayId);

      chip.classList.toggle('active', isActive);
      chip.querySelector('.chip-indicator').textContent = isActive ? '✓' : '○';
    });

    // Update clear button
    const clearBtn = document.querySelector('.clear-overlays');
    if (clearBtn) {
      clearBtn.disabled = this.activeOverlays.size === 0;
    }
  }

  emitChange() {
    const event = new CustomEvent('overlayToggle', {
      detail: {
        activeOverlays: Array.from(this.activeOverlays)
      }
    });
    document.dispatchEvent(event);
  }

  // Get current state for export
  getState() {
    return {
      activeOverlays: Array.from(this.activeOverlays)
    };
  }

  // Restore state from import
  setState(state) {
    if (state && state.activeOverlays) {
      this.activeOverlays = new Set(state.activeOverlays);
      this.updateUI();
      this.emitChange();
    }
  }
}

// Export for module systems, or make global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OverlayManager;
} else {
  window.OverlayManager = OverlayManager;
}

// === src/ui/viewer.js ===
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
