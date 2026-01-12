

// Inisialisasi AOS (Animate On Scroll) - Optimized for Professional Feel
AOS.init({
    duration: 400,           // Faster - feels snappy
    easing: 'ease-out',      // Smooth deceleration
    once: true,              // Only animate once
    offset: 50,              // Trigger earlier
    delay: 0,                // No global delay
    disable: 'mobile'        // Disable on mobile for performance
});

let activeCard = null;
let originalStyles = {};

document.addEventListener('click', function(e) {
    if (activeCard && activeCard.classList.contains('is-expanded')) {
        if (!activeCard.contains(e.target)) {
            closeCard(e);
        }
    }
});

function toggleCard(card) {
    if (card.classList.contains('is-expanded')) return;
    
    if (activeCard && activeCard !== card) {
        closeCard(null, null);
        if (window.innerWidth <= 900) {
            activeCard = null;
        }
    }

    const isMobile = window.innerWidth <= 900;
    const grid = document.getElementById('gridContainer');
    
    if (isMobile) {
        card.style = ''; 
        card.classList.add('is-expanded');
        
        activeCard = card;
        
        const img = card.querySelector('img');
        if (img) {
            const newImg = img.cloneNode(true);
            img.parentNode.replaceChild(newImg, img);
            
            newImg.addEventListener('click', function(e) {
                e.stopPropagation();
                closeCard(e);
            });
        }
        
        return; 
    }

    if (!grid) return;

    const gridRect = grid.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();

    const startTop = cardRect.top - gridRect.top;
    const startLeft = cardRect.left - gridRect.left;
    const startWidth = cardRect.width;
    const startHeight = cardRect.height;

    originalStyles = {
        width: card.style.width,
        height: card.style.height,
        top: card.style.top,
        left: card.style.left,
        position: card.style.position,
        zIndex: card.style.zIndex,
        transition: card.style.transition // Save transition
    };


    card.style.position = 'absolute';
    card.style.top = startTop + 'px';
    card.style.left = startLeft + 'px';
    card.style.width = startWidth + 'px';
    card.style.height = startHeight + 'px';
    card.style.zIndex = '100';
    
    document.querySelectorAll('.card').forEach(c => {
        if (c !== card) c.classList.add('is-inactive');
    });

    activeCard = card;

    requestAnimationFrame(() => {
        card.classList.add('is-expanded');
        
        card.style.top = '0';
        card.style.left = '0';
        card.style.width = '100%';
        card.style.height = '100%';
        
        setTimeout(() => {
            const content = card.querySelector('.card-content');
            if (content) {
                content.scrollTop = 0;
            }
        }, 50);
    });
    
    if(typeof event !== 'undefined') event.stopPropagation();
}

function closeCard(event, btn) {
    if(event) event.stopPropagation();
    
    if (!activeCard) return;

    const card = activeCard;
    const isMobile = window.innerWidth <= 900;
    const grid = document.getElementById('gridContainer');

    card.classList.remove('is-expanded');
    
    document.body.style.overflow = '';

    if (isMobile) {
        card.style = '';
    } else {
        card.style.width = '';
        card.style.height = '';
        card.style.top = '';
        card.style.left = '';
        card.style.position = '';
        card.style.zIndex = '';
        
        document.querySelectorAll('.card').forEach(c => {
            c.classList.remove('is-inactive');
        });
    }

    activeCard = null;
}



document.addEventListener('DOMContentLoaded', function() {
    const tabButtons = document.querySelectorAll('.btn-tab');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');

            tabButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-selected', 'false');
            });
            
            tabPanes.forEach(pane => {
                pane.classList.remove('active');
            });

            this.classList.add('active');
            this.setAttribute('aria-selected', 'true');
            
            const targetPane = document.getElementById(`tab-${tabId}`);
            if (targetPane) {
                targetPane.classList.add('active');
            }
        });
    });

    // FAQ Accordion Functionality
    const faqQuestions = document.querySelectorAll('.faq-question');

    faqQuestions.forEach(question => {
        question.addEventListener('click', function() {
            const faqItem = this.parentElement;
            const isActive = faqItem.classList.contains('active');

            document.querySelectorAll('.faq-item').forEach(item => {
                item.classList.remove('active');
                item.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
            });

            // Open clicked item if it wasn't active
            if (!isActive) {
                faqItem.classList.add('active');
                this.setAttribute('aria-expanded', 'true');
            }
        });
    });

    const mulaiButton = document.querySelector('.hero-buttons .btn-primary');
    if (mulaiButton) {
        mulaiButton.addEventListener('click', function() {
            const targetSection = document.getElementById('edukasi-section');
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }

    const laporButtons = document.querySelectorAll('.js-lapor-wawasan, .hero-buttons .btn-outline-light');
    laporButtons.forEach(button => {
        button.addEventListener('click', function() {
            window.location.href = '../Lapor/lapor.html';
        });
    });

    // ============================================
    // PROFESSIONAL REVEAL ANIMATIONS
    // Using IntersectionObserver for smooth scroll reveals
    // ============================================
    const revealElements = document.querySelectorAll(
        '.section-header, .bento-grid, .steps-grid, .artikel-grid, .tab-content, .tab-nav, .text-center'
    );

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                // Stop observing once revealed
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15,      // Trigger when 15% visible
        rootMargin: '0px 0px -50px 0px'  // Slight offset from bottom
    });

    revealElements.forEach(el => revealObserver.observe(el));
});

window.addEventListener('load', function() {
    document.body.classList.add('loaded');
    
    AOS.refresh();
});
