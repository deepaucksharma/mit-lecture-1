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
        ${drill.scenario ? `
          <div class="scenario">
            <strong>Scenario:</strong> ${drill.scenario}
          </div>
        ` : ''}
        ${drill.thoughtProcess && drill.thoughtProcess.length > 0 ? `
          <div class="thought-process">
            <strong>💭 Thought Process:</strong>
            <ol class="thought-steps">
              ${drill.thoughtProcess.map(step => `<li>${step}</li>`).join('')}
            </ol>
          </div>
        ` : ''}
        ${drill.insight ? `
          <div class="drill-insight">
            <strong>💡 Key Insight:</strong> ${drill.insight}
          </div>
        ` : ''}
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

  // Analysis drills are now read-only - no interaction needed

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