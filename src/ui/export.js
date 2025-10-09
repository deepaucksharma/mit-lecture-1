class ExportManager {
  constructor(viewer) {
    this.viewer = viewer;
  }

  showExportDialog() {
    const modal = document.createElement('div');
    modal.className = 'modal export-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Export Diagram</h2>
          <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
        </div>
        <div class="modal-body">
          <div class="export-options">
            <button class="export-option" onclick="viewer.exportManager.exportSVG()">
              <span class="export-icon">🖼️</span>
              <span class="export-label">Export as SVG</span>
              <span class="export-desc">Vector image for presentations</span>
            </button>
            <button class="export-option" onclick="viewer.exportManager.exportPNG()">
              <span class="export-icon">📷</span>
              <span class="export-label">Export as PNG</span>
              <span class="export-desc">Image for documents</span>
            </button>
            <button class="export-option" onclick="viewer.exportManager.exportJSON()">
              <span class="export-icon">📄</span>
              <span class="export-label">Export as JSON</span>
              <span class="export-desc">Raw specification data</span>
            </button>
            <button class="export-option" onclick="viewer.exportManager.exportMermaid()">
              <span class="export-icon">📝</span>
              <span class="export-label">Export Mermaid Code</span>
              <span class="export-desc">Editable diagram source</span>
            </button>
            <button class="export-option" onclick="viewer.exportManager.exportProgress()">
              <span class="export-icon">📊</span>
              <span class="export-label">Export Progress</span>
              <span class="export-desc">Backup learning progress</span>
            </button>
            <button class="export-option" onclick="viewer.exportManager.printDiagram()">
              <span class="export-icon">🖨️</span>
              <span class="export-label">Print Diagram</span>
              <span class="export-desc">Send to printer or PDF</span>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  exportSVG() {
    const svg = document.querySelector('#diagram-container svg');
    if (!svg) {
      alert('No diagram to export');
      return;
    }

    // Clone and prepare SVG
    const svgClone = svg.cloneNode(true);
    this.addSVGStyles(svgClone);

    // Add title and metadata
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = this.viewer.currentSpec.title || 'GFS Diagram';
    svgClone.insertBefore(title, svgClone.firstChild);

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgClone);

    // Create blob and download
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    this.downloadBlob(blob, `${this.viewer.currentDiagramId}.svg`);

    // Close modal
    this.closeModal();
  }

  exportPNG() {
    const svg = document.querySelector('#diagram-container svg');
    if (!svg) {
      alert('No diagram to export');
      return;
    }

    // Get SVG dimensions
    const bbox = svg.getBBox();
    const width = bbox.width + bbox.x * 2;
    const height = bbox.height + bbox.y * 2;

    // Create canvas
    const canvas = document.createElement('canvas');
    const scale = 2; // Higher resolution
    canvas.width = width * scale;
    canvas.height = height * scale;

    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    // Set white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    // Convert SVG to data URL
    const svgClone = svg.cloneNode(true);
    this.addSVGStyles(svgClone);

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgClone);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    // Create image and draw to canvas
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(svgUrl);

      // Export canvas as PNG
      canvas.toBlob((blob) => {
        this.downloadBlob(blob, `${this.viewer.currentDiagramId}.png`);
        this.closeModal();
      }, 'image/png');
    };

    img.src = svgUrl;
  }

  exportJSON() {
    if (!this.viewer.currentSpec) {
      alert('No diagram to export');
      return;
    }

    // Include current state
    const exportData = {
      ...this.viewer.currentSpec,
      _export: {
        timestamp: Date.now(),
        version: '1.0',
        activeOverlays: Array.from(this.viewer.currentOverlays)
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json;charset=utf-8'
    });

    this.downloadBlob(blob, `${this.viewer.currentDiagramId}.json`);
    this.closeModal();
  }

  exportMermaid() {
    if (!this.viewer.currentSpec) {
      alert('No diagram to export');
      return;
    }

    // Generate Mermaid code
    const composed = this.viewer.composer.composeScene(
      this.viewer.currentSpec,
      Array.from(this.viewer.currentOverlays)
    );

    const mermaidCode = this.viewer.renderer.generateMermaidCode(composed);

    // Add header comment
    const exportContent = `# ${this.viewer.currentSpec.title}
# Generated: ${new Date().toISOString()}
# Overlays: ${Array.from(this.viewer.currentOverlays).join(', ') || 'none'}

${mermaidCode}`;

    const blob = new Blob([exportContent], {
      type: 'text/plain;charset=utf-8'
    });

    this.downloadBlob(blob, `${this.viewer.currentDiagramId}.mmd`);
    this.closeModal();
  }

  exportProgress() {
    const progressData = this.viewer.learningProgress.exportProgress();
    const blob = new Blob([JSON.stringify(progressData, null, 2)], {
      type: 'application/json;charset=utf-8'
    });

    const date = new Date().toISOString().split('T')[0];
    this.downloadBlob(blob, `gfs-progress-${date}.json`);
    this.closeModal();
  }

  printDiagram() {
    // Create print-specific styles
    const printStyles = `
      @media print {
        body > *:not(.print-content) {
          display: none !important;
        }
        .print-content {
          display: block !important;
          padding: 20px;
        }
        .print-header {
          margin-bottom: 20px;
          border-bottom: 2px solid #333;
          padding-bottom: 10px;
        }
        .print-diagram {
          max-width: 100%;
          page-break-inside: avoid;
        }
        .print-contracts {
          margin-top: 20px;
          page-break-inside: avoid;
        }
        .print-contracts h3 {
          margin-top: 15px;
        }
        .print-contracts ul {
          margin-left: 20px;
        }
      }
    `;

    // Add print styles to head
    const styleEl = document.createElement('style');
    styleEl.textContent = printStyles;
    document.head.appendChild(styleEl);

    // Create print content
    const printContent = document.createElement('div');
    printContent.className = 'print-content';
    printContent.style.display = 'none';

    // Add header
    const header = document.createElement('div');
    header.className = 'print-header';
    header.innerHTML = `
      <h1>${this.viewer.currentSpec.title}</h1>
      <p>GFS Visual Learning System - ${new Date().toLocaleDateString()}</p>
    `;
    printContent.appendChild(header);

    // Add diagram
    const diagramContainer = document.createElement('div');
    diagramContainer.className = 'print-diagram';
    const svg = document.querySelector('#diagram-container svg');
    if (svg) {
      diagramContainer.appendChild(svg.cloneNode(true));
    }
    printContent.appendChild(diagramContainer);

    // Add contracts if available
    if (this.viewer.currentSpec.contracts) {
      const contracts = document.createElement('div');
      contracts.className = 'print-contracts';
      contracts.innerHTML = `
        <h2>System Contracts</h2>
        ${this.viewer.currentSpec.contracts.invariants?.length > 0 ? `
          <div>
            <h3>Invariants</h3>
            <ul>
              ${this.viewer.currentSpec.contracts.invariants.map(i => `<li>${i}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        ${this.viewer.currentSpec.contracts.guarantees?.length > 0 ? `
          <div>
            <h3>Guarantees</h3>
            <ul>
              ${this.viewer.currentSpec.contracts.guarantees.map(g => `<li>${g}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        ${this.viewer.currentSpec.contracts.caveats?.length > 0 ? `
          <div>
            <h3>Caveats</h3>
            <ul>
              ${this.viewer.currentSpec.contracts.caveats.map(c => `<li>${c}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      `;
      printContent.appendChild(contracts);
    }

    // Add to body
    document.body.appendChild(printContent);

    // Print
    window.print();

    // Clean up
    setTimeout(() => {
      printContent.remove();
      styleEl.remove();
    }, 1000);

    this.closeModal();
  }

  addSVGStyles(svg) {
    // Embed styles directly in SVG for standalone export
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = `
      text {
        font-family: 'Trebuchet MS', Arial, sans-serif;
        font-size: 14px;
      }
      .node rect {
        stroke-width: 2px;
      }
      .edgeLabel {
        background-color: white;
        padding: 2px 4px;
      }
      .highlight {
        fill: #FFD700 !important;
        stroke: #B8860B !important;
        stroke-width: 4px !important;
      }
    `;
    svg.insertBefore(style, svg.firstChild);

    // Set viewBox if not present
    if (!svg.getAttribute('viewBox')) {
      const bbox = svg.getBBox();
      svg.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
    }

    // Set dimensions
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
  }

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  closeModal() {
    const modal = document.querySelector('.export-modal');
    if (modal) {
      modal.remove();
    }
  }

  // Import functionality
  showImportDialog() {
    const modal = document.createElement('div');
    modal.className = 'modal import-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Import Data</h2>
          <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
        </div>
        <div class="modal-body">
          <div class="import-section">
            <h3>Import Progress Data</h3>
            <p>Restore your learning progress from a backup file.</p>
            <input type="file" id="import-progress" accept=".json">
            <button onclick="viewer.exportManager.importProgressFile()">Import Progress</button>
          </div>
          <div class="import-section">
            <h3>Import Custom Diagram</h3>
            <p>Load a custom diagram specification.</p>
            <input type="file" id="import-diagram" accept=".json">
            <button onclick="viewer.exportManager.importDiagramFile()">Import Diagram</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  async importProgressFile() {
    const input = document.getElementById('import-progress');
    if (!input.files[0]) {
      alert('Please select a file');
      return;
    }

    try {
      const text = await input.files[0].text();
      const data = JSON.parse(text);

      if (this.viewer.learningProgress.importProgress(data)) {
        alert('Progress imported successfully!');
        location.reload();
      } else {
        alert('Invalid progress file');
      }
    } catch (error) {
      alert('Failed to import progress: ' + error.message);
    }
  }

  async importDiagramFile() {
    const input = document.getElementById('import-diagram');
    if (!input.files[0]) {
      alert('Please select a file');
      return;
    }

    try {
      const text = await input.files[0].text();
      const spec = JSON.parse(text);

      // Validate the spec
      this.viewer.validator.validateSpec(spec);

      // Load the diagram
      this.viewer.currentSpec = spec;
      this.viewer.currentDiagramId = spec.id || 'custom';

      // Apply saved overlays if present
      if (spec._export?.activeOverlays) {
        this.viewer.currentOverlays = new Set(spec._export.activeOverlays);
      }

      // Render
      await this.viewer.renderDiagram();
      this.viewer.renderNarrative(spec);
      this.viewer.renderContracts(spec);
      this.viewer.drillSystem.renderDrills(spec);

      alert('Diagram imported successfully!');
      this.closeModal();
    } catch (error) {
      alert('Failed to import diagram: ' + error.message);
    }
  }
}

// Export for module systems, or make global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExportManager;
} else {
  window.ExportManager = ExportManager;
}