/**
 * Diagram Renderer Module
 * Handles Mermaid diagram rendering and composition
 */

import { configManager } from '../core/config.js';
import { eventBus, Events } from '../core/events.js';
import { appState } from '../state/app-state.js';

export class DiagramRenderer {
  constructor() {
    this.mermaidAPI = null;
    this.initialized = false;
    this.container = null;
  }

  /**
   * Initialize the renderer
   */
  async init() {
    // Wait for Mermaid to be available
    if (typeof window.mermaid === 'undefined') {
      console.warn('Mermaid not loaded, waiting...');
      await this.waitForMermaid();
    }

    this.mermaidAPI = window.mermaid;

    // Configure Mermaid
    const mermaidConfig = configManager.get('diagram.mermaidConfig');
    this.mermaidAPI.initialize(mermaidConfig);

    // Get container
    this.container = document.getElementById('diagram-container');
    if (!this.container) {
      throw new Error('Diagram container not found');
    }

    this.initialized = true;
  }

  /**
   * Wait for Mermaid to load
   */
  async waitForMermaid() {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (typeof window.mermaid !== 'undefined') {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 10000);
    });
  }

  /**
   * Compose scene with layers
   * @param {Object} spec - Base specification
   * @param {Set} activeLayers - Active layer IDs
   * @returns {Object} Composed specification
   */
  compose(spec, activeLayers = new Set()) {
    // Deep clone the spec
    const composed = JSON.parse(JSON.stringify(spec));

    // If no layers active, return base spec
    if (activeLayers.size === 0) {
      return composed;
    }

    // Create maps for efficient lookup
    const nodeMap = new Map(composed.nodes.map(n => [n.id, n]));
    const edgeMap = new Map(composed.edges.map(e => [e.id, e]));

    // Apply each active layer
    const layers = spec.layers || [];
    for (const layerId of activeLayers) {
      const layer = layers.find(l => l.id === layerId);
      if (!layer || !layer.diff) continue;

      this.applyLayer(composed, nodeMap, edgeMap, layer.diff);
    }

    return composed;
  }

  /**
   * Apply a layer to the composed spec
   * @private
   */
  applyLayer(composed, nodeMap, edgeMap, diff) {
    // Add nodes
    if (diff.add && Array.isArray(diff.add)) {
      diff.add.forEach(node => {
        if (!nodeMap.has(node.id)) {
          const newNode = { ...node, added: true };
          composed.nodes.push(newNode);
          nodeMap.set(node.id, newNode);
        }
      });
    }

    // Remove nodes
    if (diff.remove && Array.isArray(diff.remove)) {
      diff.remove.forEach(nodeId => {
        const index = composed.nodes.findIndex(n => n.id === nodeId);
        if (index !== -1) {
          composed.nodes.splice(index, 1);
          nodeMap.delete(nodeId);
        }
      });
    }

    // Modify nodes
    if (diff.modify && Array.isArray(diff.modify)) {
      diff.modify.forEach(mod => {
        const node = nodeMap.get(mod.id);
        if (node) {
          Object.assign(node, mod, { modified: true });
        }
      });
    }

    // Handle edges
    if (diff.edges && Array.isArray(diff.edges)) {
      diff.edges.forEach(edge => {
        if (edge.action === 'add' && !edgeMap.has(edge.id)) {
          const newEdge = { ...edge, added: true };
          delete newEdge.action;
          composed.edges.push(newEdge);
          edgeMap.set(edge.id, newEdge);
        } else if (edge.action === 'remove') {
          const index = composed.edges.findIndex(e => e.id === edge.id);
          if (index !== -1) {
            composed.edges.splice(index, 1);
            edgeMap.delete(edge.id);
          }
        }
      });
    }
  }

  /**
   * Render a composed specification
   * @param {Object} composed - Composed specification
   */
  async render(composed) {
    if (!this.initialized) {
      await this.init();
    }

    try {
      // Generate Mermaid code
      const mermaidCode = this.generateMermaidCode(composed);

      // Clear container
      this.container.innerHTML = '';

      // Create a unique ID for this render
      const graphId = `mermaid-${Date.now()}`;

      // Create wrapper div
      const wrapper = document.createElement('div');
      wrapper.id = graphId;
      wrapper.className = 'mermaid-wrapper';
      this.container.appendChild(wrapper);

      // Render with Mermaid
      await this.renderMermaid(graphId, mermaidCode);

      // Apply animations for added/modified elements
      this.applyAnimations(composed);

      // Apply theme adjustments
      this.applyTheme();

    } catch (error) {
      console.error('Render error:', error);
      this.showError(error);
      throw error;
    }
  }

  /**
   * Generate Mermaid code from specification
   * @param {Object} spec - Specification
   * @returns {string} Mermaid code
   */
  generateMermaidCode(spec) {
    const lines = [];

    // Determine diagram type
    const layoutType = spec.layout?.type || 'flow';

    if (layoutType === 'flow') {
      lines.push('flowchart TB');
    } else if (layoutType === 'graph') {
      lines.push('graph TB');
    } else {
      lines.push('flowchart LR');
    }

    // Add nodes
    spec.nodes.forEach(node => {
      const label = this.escapeLabel(node.label || node.id);
      const shape = this.getNodeShape(node.type);

      let className = node.type || 'default';
      if (node.added) className += ' added';
      if (node.modified) className += ' modified';

      lines.push(`    ${node.id}${shape[0]}${label}${shape[1]}:::${className}`);
    });

    // Add edges
    spec.edges.forEach(edge => {
      const label = edge.label ? `|${this.escapeLabel(edge.label)}|` : '';
      const arrow = this.getArrowType(edge.type);

      let edgeClass = '';
      if (edge.added) edgeClass = ':::edgeAdded';
      if (edge.style === 'dashed') edgeClass = ':::edgeDashed';

      lines.push(`    ${edge.from} ${arrow}${label} ${edge.to}${edgeClass}`);
    });

    // Add class definitions
    lines.push('');
    lines.push('    classDef default fill:#f9f9f9,stroke:#333,stroke-width:2px;');
    lines.push('    classDef master fill:#4285f4,stroke:#1a73e8,stroke-width:2px,color:#fff;');
    lines.push('    classDef chunkserver fill:#34a853,stroke:#188038,stroke-width:2px,color:#fff;');
    lines.push('    classDef client fill:#fbbc04,stroke:#f9ab00,stroke-width:2px;');
    lines.push('    classDef added fill:#e8f5e9,stroke:#4caf50,stroke-width:3px;');
    lines.push('    classDef modified fill:#fff3e0,stroke:#ff9800,stroke-width:3px;');
    lines.push('    classDef edgeAdded stroke:#4caf50,stroke-width:3px;');
    lines.push('    classDef edgeDashed stroke-dasharray: 5 5;');

    return lines.join('\n');
  }

  /**
   * Render Mermaid diagram
   * @private
   */
  async renderMermaid(elementId, mermaidCode) {
    return new Promise((resolve, reject) => {
      try {
        // Use mermaid.render for better control
        this.mermaidAPI.render(elementId + '-svg', mermaidCode, (svgCode) => {
          const element = document.getElementById(elementId);
          if (element) {
            element.innerHTML = svgCode;
            resolve();
          } else {
            reject(new Error('Container element not found'));
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get node shape based on type
   * @private
   */
  getNodeShape(type) {
    const shapes = {
      'master': ['[', ']'],        // Rectangle
      'chunkserver': ['[', ']'],    // Rectangle
      'client': ['(', ')'],         // Rounded
      'storage': ['[(', ')]'],      // Cylinder
      'process': ['{{', '}}'],      // Hexagon
      'decision': ['{', '}'],       // Diamond
      'default': ['[', ']']         // Rectangle
    };

    return shapes[type] || shapes.default;
  }

  /**
   * Get arrow type for edges
   * @private
   */
  getArrowType(type) {
    const arrows = {
      'sync': '-->',
      'async': '-.->',
      'bidirectional': '<-->',
      'none': '---',
      'default': '-->'
    };

    return arrows[type] || arrows.default;
  }

  /**
   * Escape label for Mermaid
   * @private
   */
  escapeLabel(label) {
    if (!label) return '';

    return label
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br/>');
  }

  /**
   * Apply animations to added/modified elements
   * @private
   */
  applyAnimations(spec) {
    const animationDuration = configManager.get('ui.animationDuration');

    // Animate added nodes
    const addedNodes = spec.nodes.filter(n => n.added);
    addedNodes.forEach(node => {
      const element = this.container.querySelector(`#${node.id}`);
      if (element) {
        element.style.animation = `fadeIn ${animationDuration}ms ease-in`;
      }
    });

    // Animate modified nodes
    const modifiedNodes = spec.nodes.filter(n => n.modified);
    modifiedNodes.forEach(node => {
      const element = this.container.querySelector(`#${node.id}`);
      if (element) {
        element.style.animation = `pulse ${animationDuration * 2}ms ease-in-out`;
      }
    });
  }

  /**
   * Apply theme adjustments
   * @private
   */
  applyTheme() {
    const theme = appState.get('preferences.theme');
    const isDark = theme === 'dark';

    if (isDark) {
      this.container.classList.add('dark-theme');
    } else {
      this.container.classList.remove('dark-theme');
    }
  }

  /**
   * Show error in diagram container
   * @private
   */
  showError(error) {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="diagram-error">
        <h3>⚠️ Rendering Error</h3>
        <p>${error.message}</p>
        <button onclick="location.reload()">Reload Page</button>
      </div>
    `;
  }

  /**
   * Export diagram as image
   * @param {string} format - Export format (png, svg)
   * @returns {Promise<string>} Data URL or SVG string
   */
  async export(format = 'png') {
    const svg = this.container.querySelector('svg');
    if (!svg) {
      throw new Error('No diagram to export');
    }

    if (format === 'svg') {
      return svg.outerHTML;
    }

    if (format === 'png') {
      return this.svgToPng(svg);
    }

    throw new Error(`Unsupported export format: ${format}`);
  }

  /**
   * Convert SVG to PNG
   * @private
   */
  async svgToPng(svg) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/png'));
      };

      img.onerror = reject;
      img.src = url;
    });
  }

  /**
   * Destroy the renderer
   */
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.initialized = false;
  }
}

export default DiagramRenderer;