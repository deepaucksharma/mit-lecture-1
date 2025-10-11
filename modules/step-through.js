/**
 * Step-Through Module
 * Handles step-by-step diagram animations and walkthroughs
 */

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

    // If spec has explicit stepThrough array, use that
    if (spec.stepThrough && Array.isArray(spec.stepThrough)) {
      return spec.stepThrough.map((step, index) => ({
        ...step,
        index,
        type: 'custom',
        caption: step.description || `Step ${index + 1}`
      }));
    }

    // Otherwise build steps based on diagram type
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
              active: i === index
            }))
          }
        });
      });
    } else if (spec.layout?.type === 'flow') {
      // For flow diagrams, show nodes progressively
      (spec.nodes || []).forEach((node, index) => {
        const visibleNodes = spec.nodes.slice(0, index + 1);
        const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
        const visibleEdges = (spec.edges || []).filter(e =>
          visibleNodeIds.has(e.from) && visibleNodeIds.has(e.to)
        );

        steps.push({
          type: 'node',
          index,
          nodeId: node.id,
          caption: `Add ${node.label || node.id}`,
          focus: [node.id],
          spec: {
            ...spec,
            nodes: visibleNodes.map((n, i) => ({
              ...n,
              active: i === index
            })),
            edges: visibleEdges
          }
        });
      });
    } else {
      // Default: show full diagram
      steps.push({
        type: 'full',
        index: 0,
        caption: 'Complete diagram',
        spec: spec
      });
    }

    return steps;
  }

  generateStepCaption(edge, spec) {
    const fromNode = (spec.nodes || []).find(n => n.id === edge.from);
    const toNode = (spec.nodes || []).find(n => n.id === edge.to);

    const from = fromNode?.label || edge.from;
    const to = toNode?.label || edge.to;
    const action = edge.label || edge.kind || 'communicates with';

    return `${from} ${action} ${to}`;
  }

  getCurrentStep() {
    return this.steps[this.currentStep] || null;
  }

  getTotalSteps() {
    return this.steps.length;
  }

  goToStep(index) {
    if (index >= 0 && index < this.steps.length) {
      this.currentStep = index;
      this.renderCurrentStep();
      return true;
    }
    return false;
  }

  nextStep() {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.renderCurrentStep();
      return true;
    }
    return false;
  }

  previousStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.renderCurrentStep();
      return true;
    }
    return false;
  }

  renderCurrentStep() {
    const step = this.getCurrentStep();
    if (!step) return;

    // Update diagram
    if (step.spec && this.renderer) {
      this.renderer.render(step.spec);
    }

    // Apply animations if defined
    if (step.animation) {
      this.applyAnimation(step.animation);
    }

    // Update UI
    this.updateStepUI(step);
  }

  applyAnimation(animation) {
    if (!animation) return;

    const { type, target, duration = 500 } = animation;

    switch (type) {
      case 'highlight':
        this.highlightElements(target, duration);
        break;
      case 'fade':
        this.fadeElements(target, duration);
        break;
      case 'pulse':
        this.pulseElements(target, duration);
        break;
      default:
        console.warn('Unknown animation type:', type);
    }
  }

  highlightElements(targets, duration) {
    const targetArray = Array.isArray(targets) ? targets : [targets];
    targetArray.forEach(id => {
      const element = document.querySelector(`[data-node-id="${id}"], [data-edge-id="${id}"]`);
      if (element) {
        element.classList.add('highlighted');
        setTimeout(() => element.classList.remove('highlighted'), duration);
      }
    });
  }

  fadeElements(targets, duration) {
    const targetArray = Array.isArray(targets) ? targets : [targets];
    targetArray.forEach(id => {
      const element = document.querySelector(`[data-node-id="${id}"], [data-edge-id="${id}"]`);
      if (element) {
        element.style.transition = `opacity ${duration}ms`;
        element.style.opacity = '0.3';
        setTimeout(() => {
          element.style.opacity = '1';
        }, duration);
      }
    });
  }

  pulseElements(targets, duration) {
    const targetArray = Array.isArray(targets) ? targets : [targets];
    targetArray.forEach(id => {
      const element = document.querySelector(`[data-node-id="${id}"], [data-edge-id="${id}"]`);
      if (element) {
        element.classList.add('pulse-animation');
        setTimeout(() => element.classList.remove('pulse-animation'), duration);
      }
    });
  }

  updateStepUI(step) {
    // Update step counter
    const counter = document.getElementById('step-counter');
    if (counter) {
      counter.textContent = `Step ${this.currentStep + 1} of ${this.steps.length}`;
    }

    // Update caption
    const caption = document.getElementById('step-caption');
    if (caption) {
      caption.textContent = step.caption || '';
    }

    // Update navigation buttons
    const prevBtn = document.getElementById('step-prev');
    const nextBtn = document.getElementById('step-next');
    const playBtn = document.getElementById('step-play');

    if (prevBtn) prevBtn.disabled = this.currentStep === 0;
    if (nextBtn) nextBtn.disabled = this.currentStep === this.steps.length - 1;
    if (playBtn) playBtn.textContent = this.isPlaying ? 'Pause' : 'Play';

    // Update progress bar
    const progress = document.getElementById('step-progress');
    if (progress) {
      const percentage = ((this.currentStep + 1) / this.steps.length) * 100;
      progress.style.width = `${percentage}%`;
    }
  }

  startAutoPlay() {
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.playInterval = setInterval(() => {
      if (!this.nextStep()) {
        this.stopAutoPlay();
        // Reset to beginning
        this.goToStep(0);
      }
    }, this.playSpeed);

    this.updateStepUI(this.getCurrentStep());
  }

  stopAutoPlay() {
    this.isPlaying = false;
    if (this.playInterval) {
      clearInterval(this.playInterval);
      this.playInterval = null;
    }
    this.updateStepUI(this.getCurrentStep());
  }

  toggleAutoPlay() {
    if (this.isPlaying) {
      this.stopAutoPlay();
    } else {
      this.startAutoPlay();
    }
  }

  setPlaySpeed(speed) {
    this.playSpeed = Math.max(500, Math.min(5000, speed));
    if (this.isPlaying) {
      this.stopAutoPlay();
      this.startAutoPlay();
    }
  }

  reset() {
    this.stopAutoPlay();
    this.goToStep(0);
  }

  destroy() {
    this.stopAutoPlay();
    this.steps = [];
    this.spec = null;
    this.currentStep = 0;
  }
}

// Export for use in main app
export { StepThroughEngine };