/**
 * Event Bus System - Central event management
 * Provides decoupled communication between modules
 */

export class EventBus {
  constructor() {
    this.events = new Map();
    this.debug = false;
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   * @param {Object} context - Optional context for handler
   * @returns {Function} Unsubscribe function
   */
  on(event, handler, context = null) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }

    const listener = { handler, context };
    this.events.get(event).push(listener);

    // Return unsubscribe function
    return () => this.off(event, handler);
  }

  /**
   * Subscribe to an event (one-time)
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   * @param {Object} context - Optional context
   */
  once(event, handler, context = null) {
    const wrapper = (...args) => {
      handler.apply(context, args);
      this.off(event, wrapper);
    };
    this.on(event, wrapper, context);
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} handler - Handler to remove
   */
  off(event, handler) {
    if (!this.events.has(event)) return;

    const listeners = this.events.get(event);
    const index = listeners.findIndex(l => l.handler === handler);

    if (index !== -1) {
      listeners.splice(index, 1);
    }

    if (listeners.length === 0) {
      this.events.delete(event);
    }
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {...any} args - Arguments to pass to handlers
   */
  emit(event, ...args) {
    if (this.debug) {
      console.log(`[EventBus] Emitting: ${event}`, args);
    }

    if (!this.events.has(event)) return;

    const listeners = this.events.get(event).slice();
    listeners.forEach(({ handler, context }) => {
      try {
        handler.apply(context, args);
      } catch (error) {
        console.error(`[EventBus] Error in handler for ${event}:`, error);
      }
    });
  }

  /**
   * Clear all event listeners
   */
  clear() {
    this.events.clear();
  }

  /**
   * Enable/disable debug logging
   * @param {boolean} enabled
   */
  setDebug(enabled) {
    this.debug = enabled;
  }
}

// Create singleton instance
export const eventBus = new EventBus();

// Event constants for type safety
export const Events = {
  // Application lifecycle
  APP_INIT: 'app:init',
  APP_READY: 'app:ready',
  APP_ERROR: 'app:error',

  // Diagram events
  DIAGRAM_LOAD: 'diagram:load',
  DIAGRAM_LOADED: 'diagram:loaded',
  DIAGRAM_RENDER: 'diagram:render',
  DIAGRAM_RENDERED: 'diagram:rendered',
  DIAGRAM_ERROR: 'diagram:error',

  // Navigation events
  NAV_PREV: 'nav:prev',
  NAV_NEXT: 'nav:next',
  NAV_GOTO: 'nav:goto',

  // State events
  STATE_CHANGE: 'state:change',
  STATE_SAVE: 'state:save',
  STATE_RESTORE: 'state:restore',

  // UI events
  UI_TAB_CHANGE: 'ui:tab:change',
  UI_THEME_CHANGE: 'ui:theme:change',
  UI_MODAL_OPEN: 'ui:modal:open',
  UI_MODAL_CLOSE: 'ui:modal:close',

  // Learning events
  DRILL_START: 'drill:start',
  DRILL_COMPLETE: 'drill:complete',
  ASSESSMENT_START: 'assessment:start',
  ASSESSMENT_COMPLETE: 'assessment:complete',

  // Export events
  EXPORT_START: 'export:start',
  EXPORT_COMPLETE: 'export:complete',
  EXPORT_ERROR: 'export:error'
};

export default eventBus;