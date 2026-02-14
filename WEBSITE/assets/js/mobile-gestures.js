/**
 * MOBILE GESTURES
 * Touch interactions for swipe navigation
 */

(function() {
    'use strict';

    // ============================================
    // CONFIGURATION
    // ============================================
    const GESTURE_CONFIG = {
        swipeThreshold: 50,     // Minimum distance for swipe
        swipeTimeout: 500,      // Max time for swipe gesture
        velocityThreshold: 0.3  // Minimum velocity for quick swipe
    };

    // ============================================
    // STATE
    // ============================================
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let isSwiping = false;

    // ============================================
    // NAVIGATION PAGES (In order)
    // ============================================
    const PAGES = [
        '/Landing Page/Landing_Page.html',
        '/About Page/about.html',
        '/Wawasan/wawasan.html',
        '/Monitoring/monitoring.html',
        '/Lapor/lapor.html'
    ];

    // ============================================
    // INITIALIZE
    // ============================================
    function init() {
        // Only enable on touch devices
        if (!('ontouchstart' in window)) {
            console.log('Mobile Gestures: Not a touch device');
            return;
        }

        setupSwipeListeners();
        setupPullToRefresh();
        
        // console.log('Mobile Gestures initialized');
    }

    // ============================================
    // SWIPE NAVIGATION
    // ============================================
    function setupSwipeListeners() {
        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd, { passive: true });
    }

    function handleTouchStart(e) {
        // Ignore if touch starts on interactive elements
        if (isInteractiveElement(e.target)) {
            return;
        }

        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
        isSwiping = true;
    }

    function handleTouchMove(e) {
        if (!isSwiping) return;

        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;
        
        const deltaX = touchX - touchStartX;
        const deltaY = touchY - touchStartY;

        // If horizontal movement is greater, it's a swipe
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
            // Prevent vertical scroll during horizontal swipe
            // But only if we're really swiping horizontally
            if (Math.abs(deltaX) > 30) {
                showSwipeIndicator(deltaX > 0 ? 'right' : 'left');
            }
        }
    }

    function handleTouchEnd(e) {
        if (!isSwiping) return;
        isSwiping = false;

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const touchEndTime = Date.now();

        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        const deltaTime = touchEndTime - touchStartTime;
        const velocity = Math.abs(deltaX) / deltaTime;

        hideSwipeIndicator();

        // Check if it's a valid horizontal swipe
        if (Math.abs(deltaX) < GESTURE_CONFIG.swipeThreshold) return;
        if (Math.abs(deltaY) > Math.abs(deltaX)) return;
        if (deltaTime > GESTURE_CONFIG.swipeTimeout && velocity < GESTURE_CONFIG.velocityThreshold) return;

        // Determine swipe direction
        if (deltaX > 0) {
            handleSwipeRight();
        } else {
            handleSwipeLeft();
        }
    }

    function isInteractiveElement(element) {
        const interactiveSelectors = [
            'input', 'textarea', 'select', 'button', 'a',
            '[role="slider"]', '.carousel', '.slider',
            '.chat-input-area', '.chatbot-modal',
            '.swiper', '.splide'
        ];

        return interactiveSelectors.some(selector => 
            element.matches(selector) || element.closest(selector)
        );
    }

    // ============================================
    // SWIPE HANDLERS
    // ============================================
    function handleSwipeLeft() {
        // Navigate to next page
        const currentIndex = getCurrentPageIndex();
        if (currentIndex < PAGES.length - 1) {
            navigateWithTransition(PAGES[currentIndex + 1], 'slide-left');
        }
    }

    function handleSwipeRight() {
        // Navigate to previous page
        const currentIndex = getCurrentPageIndex();
        if (currentIndex > 0) {
            navigateWithTransition(PAGES[currentIndex - 1], 'slide-right');
        }
    }

    function getCurrentPageIndex() {
        const currentPath = window.location.pathname.toLowerCase();
        return PAGES.findIndex(page => currentPath.includes(page.toLowerCase().split('/')[1]));
    }

    function navigateWithTransition(path, direction) {
        const basePath = '/Bismillahirrahmanirrahim';
        
        // Add transition class
        document.body.classList.add(`page-transition-${direction}`);
        
        // Add CSS for transition
        if (!document.getElementById('page-transition-styles')) {
            const style = document.createElement('style');
            style.id = 'page-transition-styles';
            style.textContent = `
                .page-transition-slide-left {
                    animation: slideOutLeft 0.3s ease forwards;
                }
                .page-transition-slide-right {
                    animation: slideOutRight 0.3s ease forwards;
                }
                @keyframes slideOutLeft {
                    to {
                        transform: translateX(-100%);
                        opacity: 0;
                    }
                }
                @keyframes slideOutRight {
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        // Navigate after animation
        setTimeout(() => {
            window.location.href = basePath + path;
        }, 300);
    }

    // ============================================
    // SWIPE INDICATOR
    // ============================================
    let swipeIndicator = null;

    function showSwipeIndicator(direction) {
        if (!swipeIndicator) {
            swipeIndicator = document.createElement('div');
            swipeIndicator.id = 'swipe-indicator';
            swipeIndicator.innerHTML = `
                <style>
                    #swipe-indicator {
                        position: fixed;
                        top: 50%;
                        transform: translateY(-50%);
                        width: 40px;
                        height: 60px;
                        background: rgba(75, 138, 123, 0.8);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-size: 24px;
                        z-index: 9999;
                        opacity: 0;
                        transition: opacity 0.2s ease;
                        pointer-events: none;
                    }
                    #swipe-indicator.left {
                        left: 0;
                        border-radius: 0 12px 12px 0;
                    }
                    #swipe-indicator.right {
                        right: 0;
                        border-radius: 12px 0 0 12px;
                    }
                    #swipe-indicator.show {
                        opacity: 1;
                    }
                </style>
                <i class="fas fa-chevron-${direction}"></i>
            `;
            document.body.appendChild(swipeIndicator);
        }

        swipeIndicator.className = `${direction} show`;
        swipeIndicator.innerHTML = `<i class="fas fa-chevron-${direction}"></i>`;
    }

    function hideSwipeIndicator() {
        if (swipeIndicator) {
            swipeIndicator.classList.remove('show');
        }
    }

    // ============================================
    // PULL TO REFRESH
    // ============================================
    function setupPullToRefresh() {
        let pullStartY = 0;
        let pullDistance = 0;
        const pullThreshold = 80;
        let pullIndicator = null;

        document.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0) {
                pullStartY = e.touches[0].clientY;
            }
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (pullStartY === 0) return;

            const currentY = e.touches[0].clientY;
            pullDistance = currentY - pullStartY;

            if (pullDistance > 0 && window.scrollY === 0) {
                if (!pullIndicator) {
                    pullIndicator = createPullIndicator();
                }
                
                const progress = Math.min(pullDistance / pullThreshold, 1);
                pullIndicator.style.transform = `translateY(${Math.min(pullDistance * 0.5, 60)}px)`;
                pullIndicator.style.opacity = progress;
                
                const icon = pullIndicator.querySelector('i');
                if (progress >= 1) {
                    icon.style.transform = 'rotate(180deg)';
                    pullIndicator.classList.add('ready');
                } else {
                    icon.style.transform = 'rotate(0deg)';
                    pullIndicator.classList.remove('ready');
                }
            }
        }, { passive: true });

        document.addEventListener('touchend', () => {
            if (pullDistance >= pullThreshold) {
                // Trigger refresh
                if (pullIndicator) {
                    pullIndicator.classList.add('refreshing');
                    pullIndicator.innerHTML = '<div class="loading-spinner"></div>';
                }
                
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            } else {
                // Reset
                if (pullIndicator) {
                    pullIndicator.style.transform = 'translateY(-60px)';
                    pullIndicator.style.opacity = '0';
                }
            }
            
            pullStartY = 0;
            pullDistance = 0;
        }, { passive: true });
    }

    function createPullIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'pull-refresh-indicator';
        indicator.innerHTML = `
            <style>
                #pull-refresh-indicator {
                    position: fixed;
                    top: 0;
                    left: 50%;
                    transform: translateX(-50%) translateY(-60px);
                    width: 48px;
                    height: 48px;
                    background: white;
                    border-radius: 50%;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    transition: transform 0.2s ease, opacity 0.2s ease;
                    opacity: 0;
                }
                #pull-refresh-indicator i {
                    font-size: 20px;
                    color: #4b8a7b;
                    transition: transform 0.3s ease;
                }
                #pull-refresh-indicator.ready i {
                    color: #27ae60;
                }
                #pull-refresh-indicator .loading-spinner {
                    width: 24px;
                    height: 24px;
                    border: 3px solid #f0f0f0;
                    border-top-color: #4b8a7b;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            </style>
            <i class="fas fa-arrow-down"></i>
        `;
        document.body.appendChild(indicator);
        return indicator;
    }

    // ============================================
    // DOUBLE TAP TO SCROLL TOP
    // ============================================
    let lastTapTime = 0;
    
    document.addEventListener('touchend', (e) => {
        // Only on header area
        if (!e.target.closest('header, .navbar, nav')) return;

        const currentTime = Date.now();
        const tapLength = currentTime - lastTapTime;
        
        if (tapLength < 300 && tapLength > 0) {
            // Double tap detected
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
        
        lastTapTime = currentTime;
    });

    // ============================================
    // PUBLIC API
    // ============================================
    window.MobileGestures = {
        navigateTo: navigateWithTransition,
        refresh: () => window.location.reload()
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
