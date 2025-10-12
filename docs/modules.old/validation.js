/**
 * Validation Module
 * Handles diagram specification validation
 */

class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.field = field;
  }
}

class DiagramValidator {
  constructor() {
    this.requiredFields = ['id', 'title', 'mermaid', 'narrative', 'contracts'];
    this.optionalFields = [
      'thoughtProcess', 'insights', 'firstPrinciples', 'prerequisites',
      'drills', 'assessments', 'crystallizedInsight', 'animations',
      'stepThrough', 'interactiveChallenges', 'stateDescription'
    ];
    this.contractRequiredFields = ['description', 'assumptions', 'invariants', 'postconditions'];
  }

  validate(spec) {
    const errors = [];

    // Check required fields
    for (const field of this.requiredFields) {
      if (!spec[field]) {
        errors.push(new ValidationError(`Missing required field: ${field}`, field));
      }
    }

    // Validate id format (kebab-case)
    if (spec.id && !/^[0-9]{2}-[a-z-]+$/.test(spec.id)) {
      errors.push(new ValidationError(
        'ID must be in format: NN-kebab-case (e.g., "01-read-path")',
        'id'
      ));
    }

    // Validate contracts structure
    if (spec.contracts) {
      const contractErrors = this.validateContracts(spec.contracts);
      errors.push(...contractErrors);
    }

    // Validate narrative structure
    if (spec.narrative && typeof spec.narrative === 'object') {
      if (!spec.narrative.introduction || !spec.narrative.whatItSolves || !spec.narrative.howItWorks) {
        errors.push(new ValidationError(
          'Narrative must have introduction, whatItSolves, and howItWorks',
          'narrative'
        ));
      }
    }

    // Validate firstPrinciples structure if present
    if (spec.firstPrinciples) {
      const fpErrors = this.validateFirstPrinciples(spec.firstPrinciples);
      errors.push(...fpErrors);
    }

    // Validate assessments if present
    if (spec.assessments) {
      const assessmentErrors = this.validateAssessments(spec.assessments);
      errors.push(...assessmentErrors);
    }

    // Validate step-through if present
    if (spec.stepThrough) {
      const stepErrors = this.validateStepThrough(spec.stepThrough);
      errors.push(...stepErrors);
    }

    return {
      valid: errors.length === 0,
      errors: errors,
      warnings: this.getWarnings(spec)
    };
  }

  validateContracts(contracts) {
    const errors = [];

    for (const field of this.contractRequiredFields) {
      if (!contracts[field]) {
        errors.push(new ValidationError(
          `Contracts missing required field: ${field}`,
          `contracts.${field}`
        ));
      }
    }

    // Validate arrays
    ['assumptions', 'invariants', 'postconditions'].forEach(field => {
      if (contracts[field] && !Array.isArray(contracts[field])) {
        errors.push(new ValidationError(
          `Contracts.${field} must be an array`,
          `contracts.${field}`
        ));
      }
    });

    return errors;
  }

  validateFirstPrinciples(principles) {
    const errors = [];

    if (!principles.thinking || !Array.isArray(principles.thinking)) {
      errors.push(new ValidationError(
        'FirstPrinciples must have a thinking array',
        'firstPrinciples.thinking'
      ));
    } else {
      principles.thinking.forEach((item, index) => {
        if (!item.step || !item.principle || !item.explanation) {
          errors.push(new ValidationError(
            `FirstPrinciples thinking[${index}] must have step, principle, and explanation`,
            `firstPrinciples.thinking[${index}]`
          ));
        }
      });
    }

    if (principles.advanced && !Array.isArray(principles.advanced)) {
      errors.push(new ValidationError(
        'FirstPrinciples.advanced must be an array',
        'firstPrinciples.advanced'
      ));
    }

    return errors;
  }

  validateAssessments(assessments) {
    const errors = [];

    if (!assessments.conceptual || !Array.isArray(assessments.conceptual)) {
      errors.push(new ValidationError(
        'Assessments must have a conceptual questions array',
        'assessments.conceptual'
      ));
    }

    if (assessments.practical && !Array.isArray(assessments.practical)) {
      errors.push(new ValidationError(
        'Assessments.practical must be an array',
        'assessments.practical'
      ));
    }

    // Validate question structure
    if (assessments.conceptual) {
      assessments.conceptual.forEach((q, index) => {
        if (!q.question || !q.answer) {
          errors.push(new ValidationError(
            `Conceptual question[${index}] must have question and answer`,
            `assessments.conceptual[${index}]`
          ));
        }
      });
    }

    return errors;
  }

  validateStepThrough(stepThrough) {
    const errors = [];

    if (!Array.isArray(stepThrough)) {
      errors.push(new ValidationError(
        'StepThrough must be an array',
        'stepThrough'
      ));
      return errors;
    }

    stepThrough.forEach((step, index) => {
      if (!step.step || !step.description) {
        errors.push(new ValidationError(
          `StepThrough[${index}] must have step number and description`,
          `stepThrough[${index}]`
        ));
      }

      if (step.animation && (!step.animation.type || !step.animation.target)) {
        errors.push(new ValidationError(
          `StepThrough[${index}] animation must have type and target`,
          `stepThrough[${index}].animation`
        ));
      }
    });

    return errors;
  }

  getWarnings(spec) {
    const warnings = [];

    // Suggest optional fields that could enhance the diagram
    const missingOptional = this.optionalFields.filter(field => !spec[field]);

    if (missingOptional.length > 0) {
      warnings.push({
        type: 'enhancement',
        message: `Consider adding: ${missingOptional.join(', ')} for richer content`
      });
    }

    // Check for empty arrays
    ['drills', 'assessments', 'animations'].forEach(field => {
      if (spec[field] && Array.isArray(spec[field]) && spec[field].length === 0) {
        warnings.push({
          type: 'empty',
          field: field,
          message: `${field} is defined but empty`
        });
      }
    });

    // Check for short descriptions
    if (spec.contracts?.description && spec.contracts.description.length < 50) {
      warnings.push({
        type: 'quality',
        field: 'contracts.description',
        message: 'Contract description seems short. Consider adding more detail.'
      });
    }

    return warnings;
  }

  // Helper method to display validation results
  displayResults(results, name = 'Diagram') {
    console.group(`📋 Validation Results for ${name}`);

    if (results.valid) {
      console.log('✅ Valid specification');
    } else {
      console.log(`❌ Invalid specification (${results.errors.length} errors)`);
      results.errors.forEach((error, i) => {
        console.error(`  ${i + 1}. [${error.field}]: ${error.message}`);
      });
    }

    if (results.warnings.length > 0) {
      console.log(`⚠️ ${results.warnings.length} warnings:`);
      results.warnings.forEach((warning, i) => {
        console.warn(`  ${i + 1}. [${warning.type}] ${warning.message}`);
      });
    }

    console.groupEnd();
    return results.valid;
  }
}

// Export for use in other modules
export { DiagramValidator, ValidationError };