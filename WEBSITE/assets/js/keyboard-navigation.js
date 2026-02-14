/**
 * KEYBOARD NAVIGATION & ACCESSIBILITY
 * Full keyboard support for navigation and interactions
 */

(function() {
    'use strict';

    // ============================================
    // CONFIGURATION
    // ============================================
    const A11Y_CONFIG = {
        focusableElements: 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
        skipLinkId: 'skip-to-content',
        mainContentId: 'main-content'
    };

    // ============================================
    // KEYBOARD SHORTCUTS
    // ============================================
    const SHORTCUTS = {
        'Alt+H': () => navigateTo('/Landing Page/Landing_Page.html'),   // Home
        'Alt+L': () => navigateTo('/Lapor/lapor.html'),                 // Lapor
        'Alt+M': () => navigateTo('/Monitoring/monitoring.html'),        // Monitoring
        'Alt+A': () => navigateTo('/About Page/about.html'),            // About
        'Alt+C': () => openChatbot(),                                    // Chat
        'Escape': () => closeModals(),                                   // Close modals
        '/': () => focusSearch()                                         // Focus search
    };

    // ============================================
    // INITIALIZE
    // ============================================
    function init() {
        setupKeyboardListeners();
        setupFocusManagement();
        setupAriaLive();
        createSkipLink();
        
        // console.log('Keyboard Navigation & A11y initialized');
    }

    // ============================================
    // KEYBOARD EVENT LISTENERS
    // ============================================
    function setupKeyboardListeners() {
        document.addEventListener('keydown', handleKeyDown);
    }

    function handleKeyDown(e) {
        // Build key combination string
        let keyCombo = '';
        if (e.altKey) keyCombo += 'Alt+';
        if (e.ctrlKey) keyCombo += 'Ctrl+';
        if (e.shiftKey) keyCombo += 'Shift+';
        keyCombo += e.key;

        // Check if shortcut exists
        if (SHORTCUTS[keyCombo]) {
            e.preventDefault();
            SHORTCUTS[keyCombo]();
            return;
        }

        // Handle specific key behaviors
        handleEscapeKey(e);
        handleTabKey(e);
        handleEnterOnCards(e);
        handleArrowNavigation(e);
    }

    // ============================================
    // ESCAPE KEY - Close Modals
    // ============================================
    function handleEscapeKey(e) {
        if (e.key !== 'Escape') return;

        closeModals();
    }

    function closeModals() {
        // Close chatbot modal
        const chatbotOverlay = document.querySelector('.chatbot-modal-overlay.active');
        if (chatbotOverlay && window.TemanKuChatbot) {
            window.TemanKuChatbot.close();
            return;
        }

        // Close FAB menu
        const fabMenu = document.querySelector('.fab-menu.open');
        if (fabMenu) {
            fabMenu.classList.remove('open');
            return;
        }

        // Close any custom modals
        const activeModals = document.querySelectorAll('.modal.active, [role="dialog"][aria-hidden="false"]');
        activeModals.forEach(modal => {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
        });
    }

    // ============================================
    // TAB KEY - Trap Focus in Modals
    // ============================================
    function handleTabKey(e) {
        if (e.key !== 'Tab') return;

        const activeModal = document.querySelector('.chatbot-modal-overlay.active .chatbot-modal, [role="dialog"][aria-hidden="false"]');
        
        if (activeModal) {
            trapFocus(activeModal, e);
        }
    }

    function trapFocus(container, e) {
        const focusableElements = container.querySelectorAll(A11Y_CONFIG.focusableElements);
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
            // Shift + Tab
            if (document.activeElement === firstFocusable) {
                e.preventDefault();
                lastFocusable.focus();
            }
        } else {
            // Tab
            if (document.activeElement === lastFocusable) {
                e.preventDefault();
                firstFocusable.focus();
            }
        }
    }

    // ============================================
    // ENTER KEY - Activate Cards
    // ============================================
    function handleEnterOnCards(e) {
        if (e.key !== 'Enter') return;

        const target = e.target;
        
        // If on a clickable card, trigger click
        if (target.matches('.card[tabindex], .blog-card[tabindex], [role="button"]')) {
            e.preventDefault();
            target.click();
        }
    }

    // ============================================
    // ARROW KEYS - Navigate Lists
    // ============================================
    function handleArrowNavigation(e) {
        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;

        const target = e.target;
        
        // Check if we're in a navigable list
        const list = target.closest('[role="listbox"], [role="menu"], .nav-links');
        if (!list) return;

        const items = list.querySelectorAll('[role="option"], [role="menuitem"], .nav-item');
        const currentIndex = Array.from(items).indexOf(target);

        if (currentIndex === -1) return;

        let nextIndex;
        
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            nextIndex = currentIndex + 1 >= items.length ? 0 : currentIndex + 1;
        } else {
            nextIndex = currentIndex - 1 < 0 ? items.length - 1 : currentIndex - 1;
        }

        e.preventDefault();
        items[nextIndex].focus();
    }

    // ============================================
    // FOCUS MANAGEMENT
    // ============================================
    function setupFocusManagement() {
        // Add visible focus ring
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                document.body.classList.add('keyboard-user');
            }
        });

        document.addEventListener('mousedown', () => {
            document.body.classList.remove('keyboard-user');
        });

        // Add focus styles
        const style = document.createElement('style');
        style.textContent = `
            /* Hide focus ring for mouse users */
            :focus {
                outline: none;
            }

            /* Show focus ring for keyboard users */
            .keyboard-user :focus {
                outline: 3px solid #4b8a7b;
                outline-offset: 2px;
                border-radius: 4px;
            }

            .keyboard-user :focus:not(:focus-visible) {
                outline: none;
            }

            /* Better focus visibility on dark backgrounds */
            .keyboard-user .header-bg :focus,
            .keyboard-user .monitoring-hero :focus {
                outline-color: white;
            }

            /* Skip link styles */
            .skip-link {
                position: fixed;
                top: -100%;
                left: 50%;
                transform: translateX(-50%);
                background: #132338;
                color: white;
                padding: 12px 24px;
                border-radius: 0 0 12px 12px;
                z-index: 99999;
                text-decoration: none;
                font-weight: 600;
                transition: top 0.3s ease;
            }

            .skip-link:focus {
                top: 0;
            }
        `;
        document.head.appendChild(style);
    }

    // ============================================
    // SKIP LINK
    // ============================================
    function createSkipLink() {
        // Check if skip link already exists
        if (document.getElementById(A11Y_CONFIG.skipLinkId)) return;

        const skipLink = document.createElement('a');
        skipLink.id = A11Y_CONFIG.skipLinkId;
        skipLink.className = 'skip-link';
        skipLink.href = `#${A11Y_CONFIG.mainContentId}`;
        skipLink.textContent = 'Langsung ke konten utama';

        document.body.insertBefore(skipLink, document.body.firstChild);
    }

    // ============================================
    // ARIA LIVE REGION
    // ============================================
    function setupAriaLive() {
        // Create live region for announcements
        const liveRegion = document.createElement('div');
        liveRegion.id = 'a11y-announcements';
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'sr-only';
        liveRegion.style.cssText = `
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
        `;

        document.body.appendChild(liveRegion);
    }

    function announce(message) {
        const liveRegion = document.getElementById('a11y-announcements');
        if (liveRegion) {
            liveRegion.textContent = message;
            setTimeout(() => {
                liveRegion.textContent = '';
            }, 1000);
        }
    }

    // ============================================
    // HELPER FUNCTIONS
    // ============================================
    function navigateTo(path) {
        const basePath = '/Bismillahirrahmanirrahim';
        window.location.href = basePath + path;
    }

    function openChatbot() {
        if (window.TemanKuChatbot) {
            window.TemanKuChatbot.open();
        }
    }

    function focusSearch() {
        const searchInput = document.querySelector(
            '#reportIdInput, #searchInput, [type="search"], input[placeholder*="Cari"]'
        );
        if (searchInput) {
            searchInput.focus();
        }
    }

    // ============================================
    // PUBLIC API
    // ============================================
    window.A11yKeyboard = {
        announce,
        trapFocus,
        closeModals,
        focusSearch
    };

    // ============================================
    // AUTO-INIT
    // ============================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
