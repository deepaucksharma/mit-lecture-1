#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Schema validation based on EvolvingTechSpec.md requirements
const REQUIRED_TOP_LEVEL_FIELDS = ['id', 'title', 'nodes', 'edges', 'contracts'];
const REQUIRED_NODE_FIELDS = ['id', 'type', 'label'];
const REQUIRED_EDGE_FIELDS = ['id', 'from', 'to', 'kind'];
const REQUIRED_CONTRACT_FIELDS = ['invariants', 'guarantees', 'caveats'];

const VALID_NODE_TYPES = ['master', 'chunkserver', 'client', 'rack', 'switch', 'note', 'state'];
const VALID_EDGE_KINDS = ['control', 'data', 'cache', 'heartbeat'];
const VALID_DRILL_TYPES = ['recall', 'apply', 'analyze', 'create'];

class ValidationReport {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
  }

  addError(diagram, category, message) {
    this.errors.push({ diagram, category, message });
  }

  addWarning(diagram, category, message) {
    this.warnings.push({ diagram, category, message });
  }

  addInfo(diagram, category, message) {
    this.info.push({ diagram, category, message });
  }

  hasErrors() {
    return this.errors.length > 0;
  }

  toString() {
    let output = '';

    if (this.errors.length > 0) {
      output += '\n❌ ERRORS:\n';
      this.errors.forEach(e => {
        output += `  [${e.diagram}] ${e.category}: ${e.message}\n`;
      });
    }

    if (this.warnings.length > 0) {
      output += '\n⚠️  WARNINGS:\n';
      this.warnings.forEach(w => {
        output += `  [${w.diagram}] ${w.category}: ${w.message}\n`;
      });
    }

    if (this.info.length > 0) {
      output += '\n✓ INFO:\n';
      this.info.forEach(i => {
        output += `  [${i.diagram}] ${i.category}: ${i.message}\n`;
      });
    }

    return output;
  }
}

function validateSchema(spec, report) {
  const diagramId = spec.id || 'unknown';

  // Check required top-level fields
  REQUIRED_TOP_LEVEL_FIELDS.forEach(field => {
    if (!spec[field]) {
      report.addError(diagramId, 'Schema', `Missing required field: ${field}`);
    }
  });

  // Validate ID format
  if (spec.id && !/^[0-9]{2}-[a-z-]+$/.test(spec.id)) {
    report.addWarning(diagramId, 'Schema', `ID format should be NN-name: ${spec.id}`);
  }

  // Validate nodes
  if (spec.nodes && Array.isArray(spec.nodes)) {
    spec.nodes.forEach((node, idx) => {
      REQUIRED_NODE_FIELDS.forEach(field => {
        if (!node[field]) {
          report.addError(diagramId, 'Schema', `Node ${idx}: Missing required field ${field}`);
        }
      });

      if (node.type && !VALID_NODE_TYPES.includes(node.type)) {
        report.addWarning(diagramId, 'Schema', `Node ${node.id}: Invalid type ${node.type}`);
      }
    });
  }

  // Validate edges
  if (spec.edges && Array.isArray(spec.edges)) {
    spec.edges.forEach((edge, idx) => {
      REQUIRED_EDGE_FIELDS.forEach(field => {
        if (!edge[field]) {
          report.addError(diagramId, 'Schema', `Edge ${idx}: Missing required field ${field}`);
        }
      });

      if (edge.kind && !VALID_EDGE_KINDS.includes(edge.kind)) {
        report.addWarning(diagramId, 'Schema', `Edge ${edge.id}: Invalid kind ${edge.kind}`);
      }
    });
  }

  // Validate contracts
  if (spec.contracts) {
    REQUIRED_CONTRACT_FIELDS.forEach(field => {
      if (!spec.contracts[field]) {
        report.addError(diagramId, 'Schema', `Contracts missing required field: ${field}`);
      } else if (!Array.isArray(spec.contracts[field])) {
        report.addError(diagramId, 'Schema', `Contracts.${field} should be an array`);
      }
    });
  }

  // Validate drills
  if (spec.drills && Array.isArray(spec.drills)) {
    spec.drills.forEach((drill, idx) => {
      if (!drill.id || !drill.type || !drill.prompt) {
        report.addError(diagramId, 'Schema', `Drill ${idx}: Missing required fields (id, type, prompt)`);
      }
      if (drill.type && !VALID_DRILL_TYPES.includes(drill.type)) {
        report.addWarning(diagramId, 'Schema', `Drill ${drill.id}: Invalid type ${drill.type}`);
      }
    });
  }

  return report;
}

function validateSemanticRules(spec, report) {
  const diagramId = spec.id || 'unknown';

  if (!spec.nodes || !spec.edges) return report;

  const nodeMap = new Map(spec.nodes.map(n => [n.id, n]));
  const masterNodes = spec.nodes.filter(n => n.type === 'master').map(n => n.id);

  // Rule 1: Master not on data path
  const dataEdgesWithMaster = spec.edges.filter(e =>
    e.kind === 'data' && (masterNodes.includes(e.from) || masterNodes.includes(e.to))
  );

  if (dataEdgesWithMaster.length > 0) {
    dataEdgesWithMaster.forEach(e => {
      report.addError(diagramId, 'Semantic', `Master on data path: edge ${e.id} (${e.from} → ${e.to})`);
    });
  } else if (masterNodes.length > 0) {
    report.addInfo(diagramId, 'Semantic', 'Master correctly not on data path ✓');
  }

  // Rule 2: Edge references valid nodes
  spec.edges.forEach(edge => {
    if (!nodeMap.has(edge.from)) {
      report.addError(diagramId, 'Semantic', `Edge ${edge.id}: 'from' references non-existent node ${edge.from}`);
    }
    if (!nodeMap.has(edge.to)) {
      report.addError(diagramId, 'Semantic', `Edge ${edge.id}: 'to' references non-existent node ${edge.to}`);
    }
  });

  // Rule 3: Version monotonicity check (if metadata exists)
  const nodesWithVersions = spec.nodes.filter(n => n.metadata && n.metadata.version);
  if (nodesWithVersions.length > 0) {
    nodesWithVersions.forEach(n => {
      if (n.metadata.version < 0) {
        report.addWarning(diagramId, 'Semantic', `Node ${n.id}: Negative version number`);
      }
    });
  }

  // Rule 4: Overlay reference validation
  if (spec.overlays && spec.scenes) {
    const overlayIds = new Set(spec.overlays.map(o => o.id));

    spec.scenes.forEach(scene => {
      if (scene.overlays && Array.isArray(scene.overlays)) {
        scene.overlays.forEach(overlayId => {
          if (!overlayIds.has(overlayId)) {
            report.addError(diagramId, 'Semantic', `Scene ${scene.id} references non-existent overlay ${overlayId}`);
          }
        });
      }
    });
  }

  // Rule 5: Overlay diff validation
  if (spec.overlays) {
    const nodeIds = new Set(spec.nodes.map(n => n.id));
    const edgeIds = new Set(spec.edges.map(e => e.id));

    spec.overlays.forEach(overlay => {
      if (overlay.diff) {
        // Check removals reference existing elements
        if (overlay.diff.remove) {
          overlay.diff.remove.nodeIds?.forEach(id => {
            if (!nodeIds.has(id)) {
              report.addError(diagramId, 'Semantic', `Overlay ${overlay.id}: Removes non-existent node ${id}`);
            }
          });
          overlay.diff.remove.edgeIds?.forEach(id => {
            if (!edgeIds.has(id)) {
              report.addError(diagramId, 'Semantic', `Overlay ${overlay.id}: Removes non-existent edge ${id}`);
            }
          });
        }

        // Check highlights reference existing elements
        if (overlay.diff.highlight) {
          overlay.diff.highlight.nodeIds?.forEach(id => {
            if (!nodeIds.has(id)) {
              report.addWarning(diagramId, 'Semantic', `Overlay ${overlay.id}: Highlights non-existent node ${id}`);
            }
          });
          overlay.diff.highlight.edgeIds?.forEach(id => {
            if (!edgeIds.has(id)) {
              report.addWarning(diagramId, 'Semantic', `Overlay ${overlay.id}: Highlights non-existent edge ${id}`);
            }
          });
        }

        // Check modifications reference existing elements
        if (overlay.diff.modify) {
          overlay.diff.modify.edges?.forEach(mod => {
            if (!edgeIds.has(mod.id)) {
              report.addWarning(diagramId, 'Semantic', `Overlay ${overlay.id}: Modifies non-existent edge ${mod.id}`);
            }
          });
          overlay.diff.modify.nodes?.forEach(mod => {
            if (!nodeIds.has(mod.id)) {
              report.addWarning(diagramId, 'Semantic', `Overlay ${overlay.id}: Modifies non-existent node ${mod.id}`);
            }
          });
        }
      }
    });
  }

  return report;
}

function validateLearningElements(spec, report) {
  const diagramId = spec.id || 'unknown';

  // Check for narrative
  if (!spec.narrative) {
    report.addWarning(diagramId, 'Learning', 'Missing narrative field');
  } else {
    report.addInfo(diagramId, 'Learning', `Narrative present (${spec.narrative.length} chars)`);
  }

  // Check for contracts
  if (spec.contracts) {
    const counts = {
      invariants: spec.contracts.invariants?.length || 0,
      guarantees: spec.contracts.guarantees?.length || 0,
      caveats: spec.contracts.caveats?.length || 0
    };

    if (counts.invariants === 0) report.addWarning(diagramId, 'Learning', 'No invariants defined');
    if (counts.guarantees === 0) report.addWarning(diagramId, 'Learning', 'No guarantees defined');
    if (counts.caveats === 0) report.addWarning(diagramId, 'Learning', 'No caveats defined');

    report.addInfo(diagramId, 'Learning',
      `Contracts: ${counts.invariants} invariants, ${counts.guarantees} guarantees, ${counts.caveats} caveats`);
  }

  // Check for drills
  if (!spec.drills || spec.drills.length === 0) {
    report.addWarning(diagramId, 'Learning', 'No drills defined');
  } else {
    const drillsByType = spec.drills.reduce((acc, d) => {
      acc[d.type] = (acc[d.type] || 0) + 1;
      return acc;
    }, {});

    report.addInfo(diagramId, 'Learning',
      `Drills: ${Object.entries(drillsByType).map(([k, v]) => `${v} ${k}`).join(', ')}`);

    // Check for drill diversity
    const uniqueTypes = Object.keys(drillsByType).length;
    if (uniqueTypes < 2) {
      report.addWarning(diagramId, 'Learning', 'Limited drill type diversity (consider adding varied types)');
    }
  }

  // Check for scenes (if applicable)
  if (spec.scenes && spec.scenes.length > 0) {
    report.addInfo(diagramId, 'Learning', `${spec.scenes.length} scene(s) defined`);

    spec.scenes.forEach(scene => {
      if (!scene.narrative) {
        report.addWarning(diagramId, 'Learning', `Scene ${scene.id}: Missing narrative`);
      }
    });
  }

  // Check for overlays (if applicable)
  if (spec.overlays && spec.overlays.length > 0) {
    report.addInfo(diagramId, 'Learning', `${spec.overlays.length} overlay(s) defined`);

    spec.overlays.forEach(overlay => {
      if (!overlay.caption && !overlay.title) {
        report.addWarning(diagramId, 'Learning', `Overlay ${overlay.id}: Missing caption/title`);
      }
    });
  }

  return report;
}

function validateDiagram06Compliance(spec, report) {
  if (spec.id !== '06-read-path') return report;

  const diagramId = '06-read-path';

  // Check for required scenes from spec
  const requiredScenes = ['cold-cache', 'warm-cache', 'stale-cache'];
  const actualScenes = spec.scenes ? spec.scenes.map(s => s.id) : [];

  requiredScenes.forEach(sceneId => {
    if (!actualScenes.includes(sceneId)) {
      report.addError(diagramId, 'Spec Compliance', `Missing required scene: ${sceneId}`);
    } else {
      report.addInfo(diagramId, 'Spec Compliance', `Scene ${sceneId} present ✓`);
    }
  });

  // Check for required overlays
  const requiredOverlays = ['cache-hit', 'cache-expired'];
  const actualOverlays = spec.overlays ? spec.overlays.map(o => o.id) : [];

  requiredOverlays.forEach(overlayId => {
    if (!actualOverlays.includes(overlayId)) {
      report.addError(diagramId, 'Spec Compliance', `Missing required overlay: ${overlayId}`);
    } else {
      report.addInfo(diagramId, 'Spec Compliance', `Overlay ${overlayId} present ✓`);
    }
  });

  // Check for latency metrics
  const edgesWithLatency = spec.edges.filter(e => e.metrics && e.metrics.latency);
  if (edgesWithLatency.length === 0) {
    report.addWarning(diagramId, 'Spec Compliance', 'No edges have latency metrics');
  } else {
    report.addInfo(diagramId, 'Spec Compliance', `${edgesWithLatency.length} edges with latency metrics ✓`);
  }

  // Check for cache lifecycle elements
  const cacheRelatedOverlays = spec.overlays?.filter(o =>
    o.id.includes('cache') || o.caption?.toLowerCase().includes('cache')
  );

  if (!cacheRelatedOverlays || cacheRelatedOverlays.length < 2) {
    report.addWarning(diagramId, 'Spec Compliance', 'Insufficient cache lifecycle overlays');
  }

  return report;
}

// Main execution
console.log('='.repeat(80));
console.log('GFS DIAGRAM SPECIFICATION VALIDATOR');
console.log('='.repeat(80));

const specsDir = path.join(__dirname, '..', 'data', 'specs');
const files = fs.readdirSync(specsDir).filter(f => f.endsWith('.json')).sort();

const report = new ValidationReport();
const summaryByDiagram = new Map();

files.forEach(file => {
  const filePath = path.join(specsDir, file);
  const content = fs.readFileSync(filePath, 'utf8');

  let spec;
  try {
    spec = JSON.parse(content);
  } catch (e) {
    report.addError(file, 'Parse', `JSON parse error: ${e.message}`);
    return;
  }

  const diagramId = spec.id || file;

  // Run all validations
  validateSchema(spec, report);
  validateSemanticRules(spec, report);
  validateLearningElements(spec, report);
  validateDiagram06Compliance(spec, report);

  // Track summary
  const diagramErrors = report.errors.filter(e => e.diagram === diagramId).length;
  const diagramWarnings = report.warnings.filter(w => w.diagram === diagramId).length;
  summaryByDiagram.set(diagramId, { errors: diagramErrors, warnings: diagramWarnings });
});

// Print summary
console.log('\n📊 VALIDATION SUMMARY BY DIAGRAM:');
console.log('-'.repeat(80));

files.forEach(file => {
  const filePath = path.join(specsDir, file);
  const spec = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const diagramId = spec.id || file;
  const stats = summaryByDiagram.get(diagramId) || { errors: 0, warnings: 0 };

  const status = stats.errors > 0 ? '❌' : (stats.warnings > 0 ? '⚠️ ' : '✅');
  console.log(`${status} ${diagramId.padEnd(20)} Errors: ${stats.errors}, Warnings: ${stats.warnings}`);
});

// Print detailed report
console.log(report.toString());

// Final summary
console.log('\n' + '='.repeat(80));
console.log(`Total Diagrams: ${files.length}`);
console.log(`Total Errors: ${report.errors.length}`);
console.log(`Total Warnings: ${report.warnings.length}`);
console.log('='.repeat(80));

process.exit(report.hasErrors() ? 1 : 0);
