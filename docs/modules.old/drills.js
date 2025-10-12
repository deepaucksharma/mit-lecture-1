/**
 * Drills Module
 * Handles practice drills and progress tracking for drills only
 */

// Progress tracker specifically for drills
class DrillProgressTracker {
  constructor() {
    this.storageKey = 'gfs-drill-progress';
    this.progress = this.loadProgress();
  }

  loadProgress() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('Failed to load drill progress:', error);
      return {};
    }
  }

  saveProgress() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.progress));
    } catch (error) {
      console.error('Failed to save drill progress:', error);
    }
  }

  isDrillComplete(diagramId, drillId) {
    return this.progress[`${diagramId}-${drillId}`]?.completed || false;
  }

  markDrillComplete(diagramId, drillId) {
    this.progress[`${diagramId}-${drillId}`] = {
      completed: true,
      timestamp: Date.now()
    };
    this.saveProgress();
  }

  getDiagramProgress(diagramId) {
    const prefix = `${diagramId}-`;
    const completed = Object.keys(this.progress).filter(key =>
      key.startsWith(prefix) && this.progress[key].completed
    ).length;

    return { completed };
  }

  resetProgress(diagramId = null) {
    if (diagramId) {
      const prefix = `${diagramId}-`;
      Object.keys(this.progress).forEach(key => {
        if (key.startsWith(prefix)) {
          delete this.progress[key];
        }
      });
    } else {
      this.progress = {};
    }
    this.saveProgress();
  }
}

class DrillSystem {
  constructor() {
    this.progress = new DrillProgressTracker();
    this.currentDrill = null;
    this.currentDiagramId = null;
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
      <button class="reset-btn" onclick="drillSystem.resetDiagramProgress()">Reset Progress</button>
    `;

    return header;
  }

  groupDrillsByType(drills) {
    return drills.reduce((grouped, drill) => {
      const type = drill.type || 'general';
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(drill);
      return grouped;
    }, {});
  }

  createDrillSection(type, drills, diagramId) {
    const section = document.createElement('div');
    section.className = 'drill-section';

    const header = document.createElement('h3');
    header.className = 'drill-section-header';
    header.textContent = this.formatDrillType(type);
    section.appendChild(header);

    const drillList = document.createElement('div');
    drillList.className = 'drill-list';

    drills.forEach((drill, index) => {
      const drillItem = this.createDrillItem(drill, index, diagramId);
      drillList.appendChild(drillItem);
    });

    section.appendChild(drillList);
    return section;
  }

  createDrillItem(drill, index, diagramId) {
    const drillId = `${drill.type || 'general'}-${index}`;
    const isComplete = this.progress.isDrillComplete(diagramId, drillId);

    const item = document.createElement('div');
    item.className = `drill-item ${isComplete ? 'completed' : ''}`;
    item.dataset.drillId = drillId;

    item.innerHTML = `
      <div class="drill-header">
        <span class="drill-status">${isComplete ? '✅' : '○'}</span>
        <h4 class="drill-title">${drill.title || `Drill ${index + 1}`}</h4>
      </div>
      <p class="drill-description">${drill.description || ''}</p>
      ${drill.hint ? `<p class="drill-hint">💡 Hint: ${drill.hint}</p>` : ''}
      <div class="drill-actions">
        <button class="drill-btn" onclick="drillSystem.startDrill('${diagramId}', '${drillId}', ${JSON.stringify(drill).replace(/"/g, '&quot;')})">
          ${isComplete ? 'Review' : 'Start'} Drill
        </button>
        ${isComplete ? `<button class="drill-reset-btn" onclick="drillSystem.resetDrill('${diagramId}', '${drillId}')">Reset</button>` : ''}
      </div>
    `;

    return item;
  }

  formatDrillType(type) {
    const typeMap = {
      'conceptual': '🧠 Conceptual Understanding',
      'practical': '⚙️ Practical Application',
      'debugging': '🐛 Debugging Challenges',
      'design': '🎨 Design Decisions',
      'general': '📝 General Practice'
    };
    return typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
  }

  startDrill(diagramId, drillId, drill) {
    this.currentDrill = { diagramId, drillId, drill };
    this.showDrillModal(drill);
  }

  showDrillModal(drill) {
    // Remove any existing modal
    const existingModal = document.getElementById('drill-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'drill-modal';
    modal.className = 'modal drill-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>${drill.title}</h2>
          <button class="modal-close" onclick="drillSystem.closeDrillModal()">×</button>
        </div>
        <div class="modal-body">
          <div class="drill-content">
            <p class="drill-task">${drill.task || drill.description}</p>
            ${drill.scenario ? `<div class="drill-scenario"><strong>Scenario:</strong> ${drill.scenario}</div>` : ''}
            ${drill.code ? `<pre class="drill-code"><code>${drill.code}</code></pre>` : ''}
            ${drill.options ? this.createDrillOptions(drill.options) : ''}
            ${drill.solution ? `<div class="drill-solution hidden" id="drill-solution">
              <h3>Solution</h3>
              <p>${drill.solution}</p>
              ${drill.explanation ? `<p class="drill-explanation"><strong>Explanation:</strong> ${drill.explanation}</p>` : ''}
            </div>` : ''}
          </div>
          <div class="drill-modal-actions">
            ${drill.solution ? `<button onclick="drillSystem.toggleSolution()">Toggle Solution</button>` : ''}
            <button class="primary" onclick="drillSystem.completeDrill()">Mark Complete</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.style.display = 'flex';
  }

  createDrillOptions(options) {
    return `
      <div class="drill-options">
        ${options.map((opt, i) => `
          <label class="drill-option">
            <input type="radio" name="drill-answer" value="${i}">
            <span>${opt}</span>
          </label>
        `).join('')}
      </div>
    `;
  }

  toggleSolution() {
    const solution = document.getElementById('drill-solution');
    if (solution) {
      solution.classList.toggle('hidden');
    }
  }

  completeDrill() {
    if (this.currentDrill) {
      const { diagramId, drillId } = this.currentDrill;
      this.progress.markDrillComplete(diagramId, drillId);

      // Update the drill item UI
      const drillItem = document.querySelector(`[data-drill-id="${drillId}"]`);
      if (drillItem) {
        drillItem.classList.add('completed');
        const status = drillItem.querySelector('.drill-status');
        if (status) status.textContent = '✅';

        const btn = drillItem.querySelector('.drill-btn');
        if (btn) btn.textContent = 'Review Drill';

        // Add reset button if not present
        if (!drillItem.querySelector('.drill-reset-btn')) {
          const resetBtn = document.createElement('button');
          resetBtn.className = 'drill-reset-btn';
          resetBtn.textContent = 'Reset';
          resetBtn.onclick = () => this.resetDrill(diagramId, drillId);
          drillItem.querySelector('.drill-actions').appendChild(resetBtn);
        }
      }

      // Update progress bar
      this.updateProgressDisplay(diagramId);
    }

    this.closeDrillModal();
  }

  resetDrill(diagramId, drillId) {
    // Remove from progress
    const key = `${diagramId}-${drillId}`;
    delete this.progress.progress[key];
    this.progress.saveProgress();

    // Update UI
    const drillItem = document.querySelector(`[data-drill-id="${drillId}"]`);
    if (drillItem) {
      drillItem.classList.remove('completed');
      const status = drillItem.querySelector('.drill-status');
      if (status) status.textContent = '○';

      const btn = drillItem.querySelector('.drill-btn');
      if (btn) btn.textContent = 'Start Drill';

      const resetBtn = drillItem.querySelector('.drill-reset-btn');
      if (resetBtn) resetBtn.remove();
    }

    this.updateProgressDisplay(diagramId);
  }

  resetDiagramProgress() {
    if (this.currentDiagramId) {
      this.progress.resetProgress(this.currentDiagramId);
      // Re-render drills to update UI
      const spec = { id: this.currentDiagramId, drills: this.getCurrentDrills() };
      this.renderDrills(spec);
    }
  }

  getCurrentDrills() {
    // This would need to be passed from the main app
    // For now, return empty array
    return [];
  }

  updateProgressDisplay(diagramId) {
    const progress = this.progress.getDiagramProgress(diagramId);
    const totalDrills = document.querySelectorAll('.drill-item').length;
    const percentage = totalDrills > 0 ? Math.round((progress.completed / totalDrills) * 100) : 0;

    const progressFill = document.querySelector('.progress-fill');
    if (progressFill) progressFill.style.width = `${percentage}%`;

    const progressText = document.querySelector('.progress-text');
    if (progressText) progressText.textContent = `${progress.completed} of ${totalDrills} completed (${percentage}%)`;
  }

  closeDrillModal() {
    const modal = document.getElementById('drill-modal');
    if (modal) modal.remove();
    this.currentDrill = null;
  }
}

// Export for use in main app
export { DrillSystem, DrillProgressTracker };