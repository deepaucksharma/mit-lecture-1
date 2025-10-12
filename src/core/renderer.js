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