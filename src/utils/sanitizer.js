/**
 * HTML Sanitization Utility
 * Provides safe HTML rendering to prevent XSS attacks
 */
class HTMLSanitizer {
  constructor() {
    // Check if DOMPurify is available
    this.purify = typeof DOMPurify !== 'undefined' ? DOMPurify : null;

    if (!this.purify) {
      console.warn('DOMPurify not available. HTML sanitization disabled.');
    }
  }

  /**
   * Sanitize HTML string
   * @param {string} dirty - Unsanitized HTML
   * @param {Object} options - DOMPurify options
   * @returns {string} Sanitized HTML
   */
  sanitize(dirty, options = {}) {
    if (!dirty) return '';

    if (this.purify) {
      return this.purify.sanitize(dirty, {
        ALLOWED_TAGS: [
          'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'span', 'div',
          'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img', 'hr'
        ],
        ALLOWED_ATTR: [
          'href', 'title', 'class', 'id', 'src', 'alt', 'width', 'height',
          'data-*'
        ],
        ALLOW_DATA_ATTR: true,
        ...options
      });
    }

    // Fallback: basic escaping if DOMPurify not available
    return this.escapeHTML(dirty);
  }

  /**
   * Basic HTML escaping (fallback)
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHTML(text) {
    if (!text) return '';

    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Sanitize and set innerHTML safely
   * @param {HTMLElement} element - Target element
   * @param {string} html - HTML to set
   * @param {Object} options - Sanitization options
   */
  setHTML(element, html, options = {}) {
    if (!element) return;
    element.innerHTML = this.sanitize(html, options);
  }

  /**
   * Create element with sanitized HTML
   * @param {string} tag - Element tag name
   * @param {string} html - HTML content
   * @param {Object} options - Sanitization options
   * @returns {HTMLElement} Created element
   */
  createElement(tag, html, options = {}) {
    const element = document.createElement(tag);
    this.setHTML(element, html, options);
    return element;
  }

  /**
   * Sanitize an object's string properties recursively
   * @param {Object} obj - Object to sanitize
   * @returns {Object} Sanitized object
   */
  sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitize(value);
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Check if string contains potentially dangerous content
   * @param {string} text - Text to check
   * @returns {boolean} True if suspicious
   */
  isSuspicious(text) {
    if (!text || typeof text !== 'string') return false;

    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,  // onclick, onerror, etc.
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /data:text\/html/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Log warning if suspicious content detected
   * @param {string} text - Text to check
   * @param {string} context - Context for logging
   */
  warnIfSuspicious(text, context = 'content') {
    if (this.isSuspicious(text)) {
      console.warn(`Suspicious content detected in ${context}:`, text.substring(0, 100));
    }
  }
}

// Create singleton instance
const sanitizer = new HTMLSanitizer();

// Export for module systems, or make global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { HTMLSanitizer, sanitizer };
} else {
  window.HTMLSanitizer = HTMLSanitizer;
  window.sanitizer = sanitizer;
}
