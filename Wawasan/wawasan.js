

// Initialize AOS (Animate On Scroll) - Smooth animations
AOS.init({
    duration: 800,
    easing: 'ease-in-out',
    once: true,
    offset: 100,
    delay: 50
});

// Initialize Swiper for Education Slider
/* Bento Grid Interaction */
let activeCard = null;
let originalStyles = {};

// Setup Click Outside Listener
document.addEventListener('click', function(e) {
    if (activeCard && activeCard.classList.contains('is-expanded')) {
        // Cek apakah klik terjadi di luar kartu
        if (!activeCard.contains(e.target)) {
            closeCard(e);
        }
    }
});

function toggleCard(card) {
    // If clicking the same expanded card, ignore (or handle as close if desired)
    if (card.classList.contains('is-expanded')) return;
    
    // Auto-close existing active card if clicking a different one
    if (activeCard && activeCard !== card) {
        // Pass fake events or null to safely close
        closeCard(null, null);
        // Clean up immediately for mobile to prevent overlap issues
        if (window.innerWidth <= 900) {
            activeCard = null; // Ensure pointer is cleared
        }
    }

    // FOR MOBILE: Simpler logic to prevent freezing
    const isMobile = window.innerWidth <= 900;
    const grid = document.getElementById('gridContainer');
    
    if (isMobile) {
        // ACCORDION STYLE FOR MOBILE: Just toggle class and scroll
        
        // Reset style if any leftovers
        card.style = ''; 
        card.classList.add('is-expanded');
        
        activeCard = card;
        
        // Auto scroll sedikit agar header card pas di atas
        // setTimeout(() => {
        //     const offset = card.offsetTop - 80; 
        //     window.scrollTo({
        //         top: offset,
        //         behavior: 'smooth'
        //     });
        // }, 100);

        // TAP TO CLOSE ON IMAGE (Mobile Only)
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

    // FOR DESKTOP: Animation Logic
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

    // Lock Body
    // document.body.style.overflow = 'hidden'; // Removed per request

    // Set Initial Position for Animation
    card.style.position = 'absolute';
    card.style.top = startTop + 'px';
    card.style.left = startLeft + 'px';
    card.style.width = startWidth + 'px';
    card.style.height = startHeight + 'px';
    card.style.zIndex = '100';
    
    // Inactive other cards
    document.querySelectorAll('.card').forEach(c => {
        if (c !== card) c.classList.add('is-inactive');
    });

    activeCard = card;

    // Trigger Animation
    requestAnimationFrame(() => {
        card.classList.add('is-expanded');
        
        card.style.top = '0';
        card.style.left = '0';
        card.style.width = '100%';
        card.style.height = '100%';
        
        // Auto scroll fix
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
    
    // UNLOCK BODY SCROLL
    document.body.style.overflow = '';

    if (isMobile) {
        // Mobile clean up simply
        card.style = ''; // Bersihkan inline style
    } else {
        // Desktop clean up: Reset styles to original
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


// Tab Navigation Functionality
document.addEventListener('DOMContentLoaded', function() {
    const tabButtons = document.querySelectorAll('.btn-tab');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');

            // Remove active class from all buttons and panes
            tabButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-selected', 'false');
            });
            
            tabPanes.forEach(pane => {
                pane.classList.remove('active');
            });

            // Add active class to clicked button and corresponding pane
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

            // Close all FAQ items
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

    // Smooth Scroll for "Mulai Belajar" button
    const mulaiButton = document.querySelector('.hero-buttons .btn-primary');
    if (mulaiButton) {
        mulaiButton.addEventListener('click', function() {
            const targetSection = document.getElementById('edukasi-section');
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }

    // Handle "Langsung Lapor" button
    const laporButtons = document.querySelectorAll('.js-lapor-wawasan, .hero-buttons .btn-outline-light');
    laporButtons.forEach(button => {
        button.addEventListener('click', function() {
            window.location.href = '../Lapor/lapor.html';
        });
    });
});

// Add loading animation
window.addEventListener('load', function() {
    document.body.classList.add('loaded');
    
    // Refresh AOS
    AOS.refresh();
});
