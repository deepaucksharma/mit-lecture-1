/**
 * Unified State Manager
 * Combines steps, overlays, and scenes into a single state system
 */
class StateManager {
  constructor() {
    this.states = [];
    this.layers = new Map();
    this.currentStateIndex = 0;
    this.customLayers = new Set();
    this.isPlaying = false;
    this.playSpeed = 2000;
    this.playInterval = null;
  }

  /**
   * Initialize from spec data
   * Converts old format (steps/scenes/overlays) to unified states
   */
  initialize(spec) {
    this.states = [];
    this.layers.clear();

    // Convert overlays to layers
    if (spec.overlays) {
      spec.overlays.forEach(overlay => {
        this.layers.set(overlay.id, {
          id: overlay.id,
          name: overlay.caption || overlay.id,
          diff: overlay.diff || {},
          type: 'modifier'
        });
      });
    }

    // Convert steps to sequential states (if they exist)
    if (spec.steps && spec.steps.length > 0) {
      const totalSteps = spec.steps.length;
      spec.steps.forEach((step, index) => {
        const position = totalSteps > 1 ? (index / (totalSteps - 1)) * 100 : 50;

        // Determine active layers from step overlays
        const activeLayers = new Set();
        if (step.overlays) {
          step.overlays.forEach(overlayId => activeLayers.add(overlayId));
        }

        this.states.push({
          id: `step-${index}`,
          type: 'sequential',
          position: position,
          layers: activeLayers,
          caption: step.caption || `Step ${index + 1}`,
          narrative: step.narrative || '',
          index: index
        });
      });
    }
    // If no steps but we have scenes, create sequential states from scenes
    else if (spec.scenes && spec.scenes.length > 0) {
      // First, add an initial state with no overlays
      this.states.push({
        id: 'initial',
        type: 'sequential',
        position: 0,
        layers: new Set(),
        caption: 'Initial State',
        narrative: spec.narrative || '',
        index: 0
      });

      // Then convert scenes to sequential states
      const totalScenes = spec.scenes.length;
      spec.scenes.forEach((scene, index) => {
        const position = ((index + 1) / (totalScenes + 1)) * 100;

        this.states.push({
          id: scene.id || `scene-${index}`,
          type: 'sequential',
          position: position,
          layers: new Set(scene.overlays || []),
          caption: scene.title || scene.name || `Scene ${index + 1}`,
          narrative: scene.narrative || '',
          index: index + 1,
          isScene: true
        });
      });
    }
    // If we have neither steps nor scenes, create states from overlays
    else if (spec.overlays && spec.overlays.length > 0) {
      // Initial state with no overlays
      this.states.push({
        id: 'initial',
        type: 'sequential',
        position: 0,
        layers: new Set(),
        caption: 'Base Diagram',
        narrative: spec.narrative || '',
        index: 0
      });

      // Create a state for each overlay
      spec.overlays.forEach((overlay, index) => {
        const position = ((index + 1) / (spec.overlays.length + 1)) * 100;

        this.states.push({
          id: `overlay-${overlay.id}`,
          type: 'sequential',
          position: position,
          layers: new Set([overlay.id]),
          caption: overlay.caption || overlay.id,
          narrative: '',
          index: index + 1
        });
      });
    }

    // Sort states by position
    this.states.sort((a, b) => a.position - b.position);

    // Set initial state
    this.currentStateIndex = 0;
    if (this.states.length > 0) {
      this.applyState(this.states[0]);
    }
  }

  /**
   * Find appropriate timeline position for a scene
   */
  findScenePosition(scene) {
    // Try to intelligently place scenes based on their overlays
    // This is a heuristic - scenes with more overlays come later
    const overlayCount = (scene.overlays || []).length;
    const maxOverlays = 3; // Assume max 3 overlays
    return Math.min(25 + (overlayCount * 25), 90);
  }

  /**
   * Get current state
   */
  getCurrentState() {
    if (this.currentStateIndex >= 0 && this.currentStateIndex < this.states.length) {
      return this.states[this.currentStateIndex];
    }
    return null;
  }

  /**
   * Apply a state (activate its layers and update UI)
   */
  applyState(state) {
    if (!state) return;

    // Performance optimization: check if state has actually changed
    const currentState = this.getCurrentState();
    if (currentState && this.statesEqual(currentState, state)) {
      return; // No change, skip emission
    }

    // Clear custom layers if moving to a defined state
    if (state.type !== 'custom') {
      this.customLayers.clear();
    }

    // Apply state layers with null check
    if (state.layers) {
      this.customLayers = new Set(state.layers);
    } else {
      this.customLayers = new Set();
    }

    // Emit state change event
    this.emitStateChange(state);
  }

  /**
   * Check if two states are equal (optimization helper)
   */
  statesEqual(state1, state2) {
    if (state1.id !== state2.id) return false;
    if (state1.type !== state2.type) return false;

    // Compare layers
    const layers1 = Array.from(state1.layers || []).sort();
    const layers2 = Array.from(state2.layers || []).sort();

    if (layers1.length !== layers2.length) return false;
    return layers1.every((val, idx) => val === layers2[idx]);
  }

  /**
   * Navigate to next state
   */
  next() {
    if (this.currentStateIndex < this.states.length - 1) {
      this.currentStateIndex++;
      this.applyState(this.states[this.currentStateIndex]);
      return true;
    }
    return false;
  }

  /**
   * Navigate to previous state
   */
  previous() {
    if (this.currentStateIndex > 0) {
      this.currentStateIndex--;
      this.applyState(this.states[this.currentStateIndex]);
      return true;
    }
    return false;
  }

  /**
   * Jump to specific state by ID
   */
  jumpToState(stateId) {
    const index = this.states.findIndex(s => s.id === stateId);
    if (index !== -1) {
      this.currentStateIndex = index;
      this.applyState(this.states[index]);
      return true;
    }
    return false;
  }

  /**
   * Jump to position on timeline (0-100)
   */
  jumpToPosition(position) {
    if (this.states.length === 0) return;

    // Find closest state to this position
    let closestIndex = 0;
    let closestDistance = Math.abs(this.states[0].position - position);

    this.states.forEach((state, index) => {
      const distance = Math.abs(state.position - position);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    if (closestIndex >= 0 && closestIndex < this.states.length) {
      this.currentStateIndex = closestIndex;
      this.applyState(this.states[closestIndex]);
    }
  }

  /**
   * Toggle a layer on current state
   */
  toggleLayer(layerId) {
    if (this.customLayers.has(layerId)) {
      this.customLayers.delete(layerId);
    } else {
      this.customLayers.add(layerId);
    }

    // Create custom state
    const customState = {
      id: 'custom',
      type: 'custom',
      position: this.getCurrentState().position,
      layers: new Set(this.customLayers),
      caption: 'Custom View',
      narrative: ''
    };

    this.emitStateChange(customState);
  }

  /**
   * Get all named states (for quick jump menu)
   */
  getNamedStates() {
    return this.states.filter(s => s.type === 'named' || s.isScene);
  }

  /**
   * Get active layers
   */
  getActiveLayers() {
    return Array.from(this.customLayers);
  }

  /**
   * Start auto-play through states
   */
  play() {
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.playInterval = setInterval(() => {
      if (!this.next()) {
        this.pause();
      }
    }, this.playSpeed);

    this.emitPlayStateChange(true);
  }

  /**
   * Pause auto-play
   */
  pause() {
    this.isPlaying = false;
    if (this.playInterval) {
      clearInterval(this.playInterval);
      this.playInterval = null;
    }
    this.emitPlayStateChange(false);
  }

  /**
   * Toggle play/pause
   */
  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  /**
   * Set playback speed
   */
  setSpeed(ms) {
    this.playSpeed = ms;
    if (this.isPlaying) {
      this.pause();
      this.play();
    }
  }

  /**
   * Emit state change event
   */
  emitStateChange(state) {
    document.dispatchEvent(new CustomEvent('stateChange', {
      detail: {
        state: state,
        index: this.currentStateIndex,
        total: this.states.length,
        layers: Array.from(state.layers || this.customLayers),
        position: state.position
      }
    }));
  }

  /**
   * Emit play state change
   */
  emitPlayStateChange(isPlaying) {
    document.dispatchEvent(new CustomEvent('playStateChange', {
      detail: { isPlaying }
    }));
  }

  /**
   * Get progress percentage
   */
  getProgress() {
    if (this.states.length === 0) return 0;
    return (this.currentStateIndex / (this.states.length - 1)) * 100;
  }

  /**
   * Get all states
   */
  getStates() {
    return this.states;
  }

  /**
   * Get current state index
   */
  getCurrentStateIndex() {
    return this.currentStateIndex;
  }

  /**
   * Get all overlays/layers
   */
  getOverlays() {
    return Array.from(this.layers.keys());
  }

  /**
   * Go to a specific state by index
   */
  goToState(index) {
    if (index >= 0 && index < this.states.length) {
      this.currentStateIndex = index;
      this.applyState(this.states[index]);
      return true;
    }
    return false;
  }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StateManager;
} else {
  window.StateManager = StateManager;
}