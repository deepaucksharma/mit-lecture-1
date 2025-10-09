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