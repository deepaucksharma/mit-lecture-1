/**
 * Export Manager Module
 * Handles all export functionality for diagrams and data
 */

class ExportManager {
  constructor(viewer) {
    this.viewer = viewer;
  }

  showExportModal() {
    const modal = document.createElement('div');
    modal.className = 'modal export-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Export Options</h2>
          <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
        </div>
        <div class="modal-body">
          <div class="export-grid">
            <button class="export-option" onclick="viewer.exportManager.exportPNG()">
              <span class="export-icon">🖼️</span>
              <span class="export-label">Export as PNG</span>
              <span class="export-desc">High-quality image</span>
            </button>
            <button class="export-option" onclick="viewer.exportManager.exportSVG()">
              <span class="export-icon">🎨</span>
              <span class="export-label">Export as SVG</span>
              <span class="export-desc">Scalable vector graphics</span>
            </button>
            <button class="export-option" onclick="viewer.exportManager.exportJSON()">
              <span class="export-icon">📄</span>
              <span class="export-label">Export as JSON</span>
              <span class="export-desc">Complete specification</span>
            </button>
            <button class="export-option" onclick="viewer.exportManager.exportMermaid()">
              <span class="export-icon">📝</span>
              <span class="export-label">Export Mermaid Code</span>
              <span class="export-desc">Editable diagram source</span>
            </button>
            <!-- Progress export removed - no longer tracking progress -->
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
    modal.style.display = 'flex';

    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  async exportPNG() {
    try {
      const svgElement = document.querySelector('#diagram-container svg');
      if (!svgElement) {
        alert('No diagram to export');
        return;
      }

      // Create a canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Get SVG data
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      // Create an image
      const img = new Image();
      img.onload = () => {
        // Set canvas dimensions
        canvas.width = svgElement.getBoundingClientRect().width * 2; // 2x for higher quality
        canvas.height = svgElement.getBoundingClientRect().height * 2;

        // Draw white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw the image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Convert to PNG
        canvas.toBlob(blob => {
          this.downloadBlob(blob, `${this.viewer.currentDiagramId || 'diagram'}.png`);
          URL.revokeObjectURL(url);
        }, 'image/png');
      };

      img.src = url;
    } catch (error) {
      console.error('Export PNG failed:', error);
      alert('Failed to export PNG: ' + error.message);
    }

    this.closeModal();
  }

  exportSVG() {
    const svgElement = document.querySelector('#diagram-container svg');
    if (!svgElement) {
      alert('No diagram to export');
      return;
    }

    // Clone the SVG to avoid modifying the original
    const svgClone = svgElement.cloneNode(true);

    // Add white background
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', '100%');
    rect.setAttribute('height', '100%');
    rect.setAttribute('fill', 'white');
    svgClone.insertBefore(rect, svgClone.firstChild);

    // Serialize to string
    const svgData = new XMLSerializer().serializeToString(svgClone);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });

    this.downloadBlob(blob, `${this.viewer.currentDiagramId || 'diagram'}.svg`);
    this.closeModal();
  }

  exportJSON() {
    if (!this.viewer.currentSpec) {
      alert('No diagram specification to export');
      return;
    }

    const blob = new Blob([JSON.stringify(this.viewer.currentSpec, null, 2)], {
      type: 'application/json;charset=utf-8'
    });

    this.downloadBlob(blob, `${this.viewer.currentDiagramId || 'diagram'}.json`);
    this.closeModal();
  }

  exportMermaid() {
    if (!this.viewer.currentSpec?.mermaid) {
      alert('No Mermaid code to export');
      return;
    }

    const blob = new Blob([this.viewer.currentSpec.mermaid], {
      type: 'text/plain;charset=utf-8'
    });

    this.downloadBlob(blob, `${this.viewer.currentDiagramId || 'diagram'}.mmd`);
    this.closeModal();
  }

  // Progress export removed - replaced with disabled message
  exportProgress() {
    alert('Progress tracking has been disabled');
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
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          background: white !important;
        }
        .print-content svg {
          max-width: 100% !important;
          height: auto !important;
        }
      }
    `;

    // Add print styles if not already present
    if (!document.getElementById('print-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'print-styles';
      styleSheet.textContent = printStyles;
      document.head.appendChild(styleSheet);
    }

    // Clone diagram for printing
    const diagramContainer = document.getElementById('diagram-container');
    if (!diagramContainer) {
      alert('No diagram to print');
      return;
    }

    const printContent = diagramContainer.cloneNode(true);
    printContent.className = 'print-content';
    document.body.appendChild(printContent);

    // Print
    window.print();

    // Clean up
    setTimeout(() => {
      printContent.remove();
    }, 1000);

    this.closeModal();
  }

  showImportModal() {
    const modal = document.createElement('div');
    modal.className = 'modal import-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Import Data</h2>
          <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
        </div>
        <div class="modal-body">
          <!-- Progress import removed - no longer tracking progress -->
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
    modal.style.display = 'flex';

    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  async importProgressFile() {
    // Progress tracking has been removed
    alert('Progress tracking has been disabled');
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

      // Basic validation
      if (!spec.id || !spec.title || !spec.mermaid) {
        alert('Invalid diagram specification');
        return;
      }

      // Load the imported diagram
      this.viewer.loadDiagram(spec.id, spec);
      this.closeModal();
      alert('Diagram imported successfully!');
    } catch (error) {
      alert('Failed to import diagram: ' + error.message);
    }
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
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => modal.remove());
  }
}

// Export for use in main app
export { ExportManager };