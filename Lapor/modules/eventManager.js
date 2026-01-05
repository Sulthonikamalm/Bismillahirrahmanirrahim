/**
 * Event Manager Module
 * Prevents memory leaks by managing event listener lifecycle
 * Provides automatic cleanup and proper event delegation
 */

export class EventManager {
    constructor() {
        this.listeners = new Map();
        this.delegatedListeners = new Map();
    }

    /**
     * Add event listener with automatic tracking
     * @param {HTMLElement} element - Target element
     * @param {string} event - Event type
     * @param {Function} handler - Event handler
     * @param {Object} options - Event listener options
     * @returns {string} - Listener ID for manual removal if needed
     */
    addEventListener(element, event, handler, options = {}) {
        if (!element || !event || !handler) {
            console.warn('EventManager: Invalid parameters');
            return null;
        }

        const listenerId = this.generateListenerId(element, event);
        
        // Remove old listener if exists (prevent duplicates)
        if (this.listeners.has(listenerId)) {
            this.removeEventListener(listenerId);
        }
        
        // Add new listener
        element.addEventListener(event, handler, options);
        
        // Store reference for cleanup
        this.listeners.set(listenerId, {
            element,
            event,
            handler,
            options
        });
        
        return listenerId;
    }

    /**
     * Add delegated event listener (for dynamic elements)
     * More efficient than adding individual listeners
     * @param {HTMLElement} container - Container element
     * @param {string} event - Event type
     * @param {string} selector - CSS selector for target elements
     * @param {Function} handler - Event handler
     */
    addDelegatedListener(container, event, selector, handler) {
        if (!container || !event || !selector || !handler) {
            console.warn('EventManager: Invalid delegation parameters');
            return null;
        }

        const delegationId = this.generateDelegationId(container, event, selector);
        
        // Create delegated handler
        const delegatedHandler = (e) => {
            const target = e.target.closest(selector);
            if (target && container.contains(target)) {
                handler.call(target, e);
            }
        };
        
        // Add to container
        container.addEventListener(event, delegatedHandler);
        
        // Store reference
        this.delegatedListeners.set(delegationId, {
            container,
            event,
            selector,
            handler: delegatedHandler
        });
        
        return delegationId;
    }

    /**
     * Remove specific event listener
     * @param {string} listenerId - Listener ID
     */
    removeEventListener(listenerId) {
        const listener = this.listeners.get(listenerId);
        
        if (!listener) return;
        
        const { element, event, handler, options } = listener;
        element.removeEventListener(event, handler, options);
        this.listeners.delete(listenerId);
    }

    /**
     * Remove delegated event listener
     * @param {string} delegationId - Delegation ID
     */
    removeDelegatedListener(delegationId) {
        const delegation = this.delegatedListeners.get(delegationId);
        
        if (!delegation) return;
        
        const { container, event, handler } = delegation;
        container.removeEventListener(event, handler);
        this.delegatedListeners.delete(delegationId);
    }

    /**
     * Remove all event listeners managed by this instance
     * Critical for preventing memory leaks
     */
    removeAll() {
        // Remove regular listeners
        this.listeners.forEach((listener, id) => {
            const { element, event, handler, options } = listener;
            if (element && element.removeEventListener) {
                element.removeEventListener(event, handler, options);
            }
        });
        this.listeners.clear();
        
        // Remove delegated listeners
        this.delegatedListeners.forEach((delegation) => {
            const { container, event, handler } = delegation;
            if (container && container.removeEventListener) {
                container.removeEventListener(event, handler);
            }
        });
        this.delegatedListeners.clear();
    }

    /**
     * Generate unique ID for listener
     * @private
     */
    generateListenerId(element, event) {
        const elementId = element.id || element.className || 'anonymous';
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 9);
        return `${elementId}-${event}-${timestamp}-${random}`;
    }

    /**
     * Generate unique ID for delegated listener
     * @private
     */
    generateDelegationId(container, event, selector) {
        const containerId = container.id || container.className || 'anonymous';
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 9);
        return `delegated-${containerId}-${event}-${selector}-${timestamp}-${random}`;
    }

    /**
     * Get statistics about managed listeners
     * Useful for debugging memory leaks
     * @returns {Object} - Statistics
     */
    getStats() {
        return {
            totalListeners: this.listeners.size,
            totalDelegatedListeners: this.delegatedListeners.size,
            listeners: Array.from(this.listeners.keys()),
            delegated: Array.from(this.delegatedListeners.keys())
        };
    }

    /**
     * Add one-time event listener (auto-removes after execution)
     * @param {HTMLElement} element - Target element
     * @param {string} event - Event type
     * @param {Function} handler - Event handler
     */
    addOneTimeListener(element, event, handler) {
        const wrappedHandler = (e) => {
            handler(e);
            element.removeEventListener(event, wrappedHandler);
        };
        
        return this.addEventListener(element, event, wrappedHandler);
    }

    /**
     * Add throttled event listener
     * Prevents handler from executing too frequently
     * @param {HTMLElement} element - Target element
     * @param {string} event - Event type
     * @param {Function} handler - Event handler
     * @param {number} delay - Throttle delay in ms
     */
    addThrottledListener(element, event, handler, delay = 300) {
        let lastRun = 0;
        
        const throttledHandler = (e) => {
            const now = Date.now();
            
            if (now - lastRun >= delay) {
                handler(e);
                lastRun = now;
            }
        };
        
        return this.addEventListener(element, event, throttledHandler);
    }

    /**
     * Add debounced event listener
     * Delays handler execution until events stop firing
     * @param {HTMLElement} element - Target element
     * @param {string} event - Event type
     * @param {Function} handler - Event handler
     * @param {number} delay - Debounce delay in ms
     */
    addDebouncedListener(element, event, handler, delay = 300) {
        let timeoutId = null;
        
        const debouncedHandler = (e) => {
            clearTimeout(timeoutId);
            
            timeoutId = setTimeout(() => {
                handler(e);
            }, delay);
        };
        
        return this.addEventListener(element, event, debouncedHandler);
    }
}
