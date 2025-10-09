class ProgressTracker {
  constructor() {
    this.storageKey = 'gfs-learning-progress';
    this.progress = this.loadProgress();
  }

  loadProgress() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('Failed to load progress:', error);
      return {};
    }
  }

  saveProgress() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.progress));
    } catch (error) {
      console.error('Failed to save progress:', error);
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
    this.progress = new ProgressTracker();
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
          <button onclick="drillSystem.checkRecall('${drill.id}')">
            Check Answer
          </button>
          <button onclick="drillSystem.revealAnswer('${drill.id}')" class="secondary">
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
          <button onclick="drillSystem.checkApply('${drill.id}')">
            Check Approach
          </button>
          <button onclick="drillSystem.revealRubric('${drill.id}')" class="secondary">
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
          <button onclick="drillSystem.checkAnalysis('${drill.id}')">
            Check Analysis
          </button>
          <button onclick="drillSystem.revealAnalysis('${drill.id}')" class="secondary">
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
          <button onclick="drillSystem.evaluateDesign('${drill.id}')">
            Self-Evaluate
          </button>
          <button onclick="drillSystem.showDesignCriteria('${drill.id}')" class="secondary">
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
          <button onclick="drillSystem.markComplete('${drill.id}')" class="primary">
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
    alert('Well done! Design drill marked as complete.');
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