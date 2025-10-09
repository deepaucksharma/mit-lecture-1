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