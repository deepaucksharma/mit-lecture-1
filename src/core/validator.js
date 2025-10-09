class ValidationError extends Error {
  constructor(rule, errors) {
    super(`Validation failed for ${rule}: ${errors.join(', ')}`);
    this.rule = rule;
    this.errors = errors;
  }
}

class DiagramValidator {
  constructor() {
    this.ajv = null;
    this.schema = null;
    this.validate = null;
    this.semanticRules = [
      this.validateMasterNotOnDataPath,
      this.validatePrimarySecondaryConsistency,
      this.validateVersionMonotonicity,
      this.validateReplicationFactor,
      this.validateOverlayReferences
    ];
  }

  async initialize() {
    try {
      // In browser environment, Ajv should be loaded via CDN
      if (typeof Ajv === 'undefined') {
        console.warn('Ajv not loaded. Schema validation will be skipped.');
        return;
      }

      this.ajv = new Ajv({ allErrors: true });
      this.schema = await fetch('/data/schema.json').then(r => r.json());
      this.validate = this.ajv.compile(this.schema);
    } catch (error) {
      console.error('Failed to initialize validator:', error);
    }
  }

  validateSpec(spec) {
    const errors = [];

    // Schema validation if available
    if (this.validate && !this.validate(spec)) {
      throw new ValidationError('Schema', this.ajv.errors.map(e => e.message));
    }

    // Semantic validation
    for (const rule of this.semanticRules) {
      const result = rule.call(this, spec);
      if (!result.valid) {
        errors.push(...result.errors);
      }
    }

    if (errors.length > 0) {
      throw new ValidationError('Semantic', errors);
    }

    return true;
  }

  validateMasterNotOnDataPath(spec) {
    const masters = new Set(
      (spec.nodes || []).filter(n => n.type === 'master').map(n => n.id)
    );

    const violations = (spec.edges || []).filter(e =>
      e.kind === 'data' && (masters.has(e.from) || masters.has(e.to))
    );

    return {
      valid: violations.length === 0,
      rule: 'MasterNotOnDataPath',
      errors: violations.map(e => `Data edge ${e.id} touches master`)
    };
  }

  validatePrimarySecondaryConsistency(spec) {
    // Check that if there's a primary, there are secondaries
    const nodes = spec.nodes || [];
    const primaryCount = nodes.filter(n => n.label && n.label.includes('Primary')).length;
    const secondaryCount = nodes.filter(n => n.label && n.label.includes('Secondary')).length;

    if (primaryCount > 0 && secondaryCount === 0) {
      return {
        valid: false,
        rule: 'PrimarySecondaryConsistency',
        errors: ['Primary exists without secondaries']
      };
    }

    return { valid: true, errors: [] };
  }

  validateVersionMonotonicity(spec) {
    // Check version numbers are consistent
    const versionedNodes = (spec.nodes || []).filter(n => n.metadata && n.metadata.version);
    const errors = [];

    // Just ensure versions are positive
    versionedNodes.forEach(node => {
      if (node.metadata.version < 0) {
        errors.push(`Node ${node.id} has negative version ${node.metadata.version}`);
      }
    });

    return {
      valid: errors.length === 0,
      rule: 'VersionMonotonicity',
      errors
    };
  }

  validateReplicationFactor(spec) {
    // This is more of a warning than an error for educational purposes
    const chunkservers = (spec.nodes || []).filter(n => n.type === 'chunkserver');

    if (chunkservers.length > 0 && chunkservers.length < 3) {
      return {
        valid: true, // Warning only
        rule: 'ReplicationFactor',
        errors: []
      };
    }

    return { valid: true, errors: [] };
  }

  validateOverlayReferences(spec) {
    const nodeIds = new Set((spec.nodes || []).map(n => n.id));
    const edgeIds = new Set((spec.edges || []).map(e => e.id));
    const errors = [];

    for (const overlay of spec.overlays || []) {
      // Check removals reference existing elements
      overlay.diff?.remove?.nodeIds?.forEach(id => {
        if (!nodeIds.has(id)) {
          errors.push(`Overlay ${overlay.id} removes non-existent node ${id}`);
        }
      });

      overlay.diff?.remove?.edgeIds?.forEach(id => {
        if (!edgeIds.has(id)) {
          errors.push(`Overlay ${overlay.id} removes non-existent edge ${id}`);
        }
      });

      // Check highlights reference existing elements
      overlay.diff?.highlight?.nodeIds?.forEach(id => {
        if (!nodeIds.has(id)) {
          errors.push(`Overlay ${overlay.id} highlights non-existent node ${id}`);
        }
      });

      overlay.diff?.highlight?.edgeIds?.forEach(id => {
        if (!edgeIds.has(id)) {
          errors.push(`Overlay ${overlay.id} highlights non-existent edge ${id}`);
        }
      });

      // Check modifications reference existing elements
      overlay.diff?.modify?.nodes?.forEach(node => {
        if (!nodeIds.has(node.id)) {
          errors.push(`Overlay ${overlay.id} modifies non-existent node ${node.id}`);
        }
      });

      overlay.diff?.modify?.edges?.forEach(edge => {
        if (!edgeIds.has(edge.id)) {
          errors.push(`Overlay ${overlay.id} modifies non-existent edge ${edge.id}`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      rule: 'OverlayReferences',
      errors
    };
  }
}

// Export for module systems, or make global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DiagramValidator, ValidationError };
} else {
  window.DiagramValidator = DiagramValidator;
  window.ValidationError = ValidationError;
}