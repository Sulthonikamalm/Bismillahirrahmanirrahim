/**
 * ONBOARDING TOUR - First-time User Guide
 * Provides step-by-step introduction for new users
 */

(function() {
    'use strict';

    // ============================================
    // CONFIGURATION
    // ============================================
    const TOUR_CONFIG = {
        storageKey: 'sigap_onboarding_completed',
        overlayZIndex: 9999,
        animationDuration: 300
    };

    // ============================================
    // TOUR STEPS DEFINITION
    // ============================================
    const TOUR_STEPS = {
        landing: [
            {
                target: '.hero-section',
                title: 'Selamat Datang di SIGAP! 👋',
                content: 'Platform pelaporan kekerasan seksual yang aman dan terpercaya. Kami di sini untuk membantu Anda.',
                position: 'bottom'
            },
            {
                target: '.js-lapor-hero',
                title: 'Buat Laporan 📝',
                content: 'Siap untuk melapor? Klik tombol ini untuk mengisi formulir pelaporan. Identitas Anda akan dijaga kerahasiaannya.',
                position: 'right'
            },
            {
                target: '.nav-item[href*="Monitoring"]',
                title: 'Pantau Progress 📊',
                content: 'Sudah membuat laporan? Lacak perkembangannya secara real-time di halaman Monitoring.',
                position: 'bottom'
            },
            {
                target: '.stats-grid',
                title: 'Statistik Pelaporan 📈',
                content: 'Lihat jumlah korban yang berani bicara dan data penanganan kasus di kampus kita.',
                position: 'top'
            }
        ],
        lapor: [
            {
                target: '.form-step.active',
                title: 'Formulir Pelaporan 📋',
                content: 'Isi formulir ini langkah demi langkah. Data Anda terenkripsi dan aman.',
                position: 'right'
            },
            {
                target: '.step-indicator',
                title: 'Indikator Langkah',
                content: 'Lihat progress pengisian formulir Anda di sini.',
                position: 'bottom'
            }
        ],
        monitoring: [
            {
                target: '.search-input',
                title: 'Lacak Laporan Anda 🔍',
                content: 'Masukkan kode laporan atau email untuk melihat status terkini.',
                position: 'bottom'
            }
        ]
    };

    // ============================================
    // STATE
    // ============================================
    let currentStep = 0;
    let currentPageTour = null;
    let overlay = null;
    let tooltip = null;
    let spotlight = null;

    // ============================================
    // CHECK IF TOUR SHOULD RUN
    // ============================================
    function shouldShowTour() {
        return !localStorage.getItem(TOUR_CONFIG.storageKey);
    }

    function markTourCompleted() {
        localStorage.setItem(TOUR_CONFIG.storageKey, 'true');
    }

    function resetTour() {
        localStorage.removeItem(TOUR_CONFIG.storageKey);
    }

    // ============================================
    // DETECT CURRENT PAGE
    // ============================================
    function detectPage() {
        const path = window.location.pathname.toLowerCase();
        
        if (path.includes('landing') || path.endsWith('/')) {
            return 'landing';
        } else if (path.includes('lapor')) {
            return 'lapor';
        } else if (path.includes('monitoring')) {
            return 'monitoring';
        }
        return null;
    }

    // ============================================
    // CREATE TOUR ELEMENTS
    // ============================================
    function createTourElements() {
        // Overlay
        overlay = document.createElement('div');
        overlay.className = 'tour-overlay';
        overlay.innerHTML = `
            <style>
                .tour-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.7);
                    z-index: ${TOUR_CONFIG.overlayZIndex};
                    opacity: 0;
                    transition: opacity ${TOUR_CONFIG.animationDuration}ms ease;
                    pointer-events: none;
                }
                
                .tour-overlay.active {
                    opacity: 1;
                    pointer-events: auto;
                }

                .tour-spotlight {
                    position: fixed;
                    border-radius: 8px;
                    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7);
                    z-index: ${TOUR_CONFIG.overlayZIndex + 1};
                    transition: all ${TOUR_CONFIG.animationDuration}ms ease;
                    pointer-events: none;
                }

                .tour-tooltip {
                    position: fixed;
                    background: white;
                    border-radius: 16px;
                    padding: 24px;
                    max-width: 360px;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    z-index: ${TOUR_CONFIG.overlayZIndex + 2};
                    opacity: 0;
                    transform: translateY(10px);
                    transition: all ${TOUR_CONFIG.animationDuration}ms ease;
                }

                .tour-tooltip.active {
                    opacity: 1;
                    transform: translateY(0);
                }

                .tour-tooltip-title {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: #132338;
                    margin-bottom: 8px;
                }

                .tour-tooltip-content {
                    font-size: 0.95rem;
                    color: #555;
                    line-height: 1.6;
                    margin-bottom: 20px;
                }

                .tour-tooltip-actions {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 12px;
                }

                .tour-tooltip-progress {
                    font-size: 0.85rem;
                    color: #888;
                }

                .tour-btn {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 50px;
                    font-size: 0.9rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .tour-btn-skip {
                    background: transparent;
                    color: #888;
                }

                .tour-btn-skip:hover {
                    color: #333;
                }

                .tour-btn-next {
                    background: linear-gradient(135deg, #4b8a7b 0%, #2d5a4e 100%);
                    color: white;
                }

                .tour-btn-next:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 15px rgba(75, 138, 123, 0.4);
                }

                .tour-btn-prev {
                    background: #f0f0f0;
                    color: #333;
                }

                .tour-btn-prev:hover {
                    background: #e0e0e0;
                }

                .tour-close {
                    position: absolute;
                    top: 12px;
                    right: 12px;
                    width: 32px;
                    height: 32px;
                    background: #f0f0f0;
                    border: none;
                    border-radius: 50%;
                    font-size: 18px;
                    color: #666;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s ease;
                }

                .tour-close:hover {
                    background: #e0e0e0;
                    color: #333;
                }

                .tour-arrow {
                    position: absolute;
                    width: 0;
                    height: 0;
                }

                .tour-arrow.top {
                    bottom: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    border-left: 10px solid transparent;
                    border-right: 10px solid transparent;
                    border-bottom: 10px solid white;
                }

                .tour-arrow.bottom {
                    top: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    border-left: 10px solid transparent;
                    border-right: 10px solid transparent;
                    border-top: 10px solid white;
                }

                .tour-arrow.left {
                    right: 100%;
                    top: 50%;
                    transform: translateY(-50%);
                    border-top: 10px solid transparent;
                    border-bottom: 10px solid transparent;
                    border-right: 10px solid white;
                }

                .tour-arrow.right {
                    left: 100%;
                    top: 50%;
                    transform: translateY(-50%);
                    border-top: 10px solid transparent;
                    border-bottom: 10px solid transparent;
                    border-left: 10px solid white;
                }
            </style>
        `;
        document.body.appendChild(overlay);

        // Spotlight
        spotlight = document.createElement('div');
        spotlight.className = 'tour-spotlight';
        document.body.appendChild(spotlight);

        // Tooltip
        tooltip = document.createElement('div');
        tooltip.className = 'tour-tooltip';
        document.body.appendChild(tooltip);
    }

    // ============================================
    // SHOW STEP
    // ============================================
    function showStep(stepIndex) {
        const steps = currentPageTour;
        if (!steps || stepIndex >= steps.length) {
            endTour();
            return;
        }

        currentStep = stepIndex;
        const step = steps[stepIndex];
        const target = document.querySelector(step.target);

        if (!target) {
            // Target not found, skip to next
            showStep(stepIndex + 1);
            return;
        }

        // Activate overlay
        overlay.classList.add('active');

        // Position spotlight
        const rect = target.getBoundingClientRect();
        const padding = 8;
        spotlight.style.top = (rect.top - padding) + 'px';
        spotlight.style.left = (rect.left - padding) + 'px';
        spotlight.style.width = (rect.width + padding * 2) + 'px';
        spotlight.style.height = (rect.height + padding * 2) + 'px';

        // Build tooltip content
        const isFirst = stepIndex === 0;
        const isLast = stepIndex === steps.length - 1;

        tooltip.innerHTML = `
            <button class="tour-close" onclick="OnboardingTour.end()">&times;</button>
            <div class="tour-arrow ${getArrowPosition(step.position)}"></div>
            <div class="tour-tooltip-title">${step.title}</div>
            <div class="tour-tooltip-content">${step.content}</div>
            <div class="tour-tooltip-actions">
                <span class="tour-tooltip-progress">${stepIndex + 1} / ${steps.length}</span>
                <div style="display: flex; gap: 8px;">
                    ${!isFirst ? '<button class="tour-btn tour-btn-prev" onclick="OnboardingTour.prev()">Kembali</button>' : ''}
                    <button class="tour-btn ${isLast ? 'tour-btn-next' : 'tour-btn-next'}" onclick="OnboardingTour.next()">
                        ${isLast ? 'Selesai' : 'Lanjut'}
                    </button>
                </div>
            </div>
        `;

        // Position tooltip
        positionTooltip(rect, step.position);

        // Animate
        setTimeout(() => {
            tooltip.classList.add('active');
        }, 50);

        // Scroll target into view if needed
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function getArrowPosition(position) {
        switch (position) {
            case 'top': return 'bottom';
            case 'bottom': return 'top';
            case 'left': return 'right';
            case 'right': return 'left';
            default: return 'top';
        }
    }

    function positionTooltip(targetRect, position) {
        const tooltipRect = tooltip.getBoundingClientRect();
        const gap = 20;

        let top, left;

        switch (position) {
            case 'top':
                top = targetRect.top - tooltipRect.height - gap;
                left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
                break;
            case 'bottom':
                top = targetRect.bottom + gap;
                left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
                break;
            case 'left':
                top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
                left = targetRect.left - tooltipRect.width - gap;
                break;
            case 'right':
                top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
                left = targetRect.right + gap;
                break;
            default:
                top = targetRect.bottom + gap;
                left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
        }

        // Keep tooltip in viewport
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        if (left < 10) left = 10;
        if (left + tooltipRect.width > viewportWidth - 10) {
            left = viewportWidth - tooltipRect.width - 10;
        }
        if (top < 10) top = 10;
        if (top + tooltipRect.height > viewportHeight - 10) {
            top = viewportHeight - tooltipRect.height - 10;
        }

        tooltip.style.top = top + 'px';
        tooltip.style.left = left + 'px';
    }

    // ============================================
    // NAVIGATION
    // ============================================
    function nextStep() {
        tooltip.classList.remove('active');
        setTimeout(() => {
            showStep(currentStep + 1);
        }, TOUR_CONFIG.animationDuration);
    }

    function prevStep() {
        tooltip.classList.remove('active');
        setTimeout(() => {
            showStep(currentStep - 1);
        }, TOUR_CONFIG.animationDuration);
    }

    function endTour() {
        overlay.classList.remove('active');
        tooltip.classList.remove('active');
        spotlight.style.boxShadow = 'none';
        markTourCompleted();

        setTimeout(() => {
            overlay.remove();
            tooltip.remove();
            spotlight.remove();
        }, TOUR_CONFIG.animationDuration);
    }

    // ============================================
    // START TOUR
    // ============================================
    function startTour(forceStart = false) {
        if (!forceStart && !shouldShowTour()) {
            return;
        }

        const page = detectPage();
        if (!page || !TOUR_STEPS[page]) {
            return;
        }

        currentPageTour = TOUR_STEPS[page];
        createTourElements();
        showStep(0);
    }

    // ============================================
    // PUBLIC API
    // ============================================
    window.OnboardingTour = {
        start: () => startTour(true),
        end: endTour,
        next: nextStep,
        prev: prevStep,
        reset: () => {
            resetTour();
            console.log('Tour reset. Refresh page to see tour again.');
        }
    };

    // ============================================
    // AUTO-START ON PAGE LOAD
    // ============================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => startTour(), 1000);
        });
    } else {
        setTimeout(() => startTour(), 1000);
    }

    console.log('Onboarding Tour loaded. Use OnboardingTour.start() to restart.');
})();
