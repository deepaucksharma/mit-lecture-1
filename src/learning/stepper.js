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