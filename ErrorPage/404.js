/**
 * 404 Page - Premium Animation Controller
 * Organic, physics-based animations for a professional feel
 */

document.addEventListener('DOMContentLoaded', () => {
    initStars();
    initBubbles();
    initParallax();
});

/**
 * Generate realistic night sky with varying star sizes and timings
 */
function initStars() {
    const starsContainer = document.getElementById('stars');
    if (!starsContainer) return;

    const starCount = window.innerWidth < 768 ? 60 : 120;
    
    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        
        // Random position
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;
        
        // Varying star sizes (small, medium, large)
        const sizeClass = Math.random();
        let size;
        if (sizeClass < 0.6) {
            size = Math.random() * 1.5 + 0.5; // Small stars (most common)
        } else if (sizeClass < 0.9) {
            size = Math.random() * 2 + 1.5; // Medium stars
        } else {
            size = Math.random() * 2.5 + 2.5; // Large bright stars (rare)
        }
        
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        
        // Staggered animation for organic feel
        const delay = Math.random() * 4;
        const duration = 2 + Math.random() * 3;
        star.style.animationDelay = `${delay}s`;
        star.style.animationDuration = `${duration}s`;
        
        starsContainer.appendChild(star);
    }
}

/**
 * Generate organic bubbles with realistic physics
 */
function initBubbles() {
    const bubblesContainer = document.getElementById('bubbles');
    if (!bubblesContainer) return;

    const bubbleCount = window.innerWidth < 768 ? 12 : 25;
    
    // Initial bubbles
    for (let i = 0; i < bubbleCount; i++) {
        createBubble(bubblesContainer, true);
    }
    
    // Continuously spawn new bubbles
    setInterval(() => {
        if (document.hidden) return; // Don't spawn when tab is not visible
        createBubble(bubblesContainer, false);
    }, 2000);
}

/**
 * Create a single bubble with organic properties
 */
function createBubble(container, isInitial) {
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    
    // Random horizontal position
    bubble.style.left = `${Math.random() * 100}%`;
    
    // Varying bubble sizes with realistic distribution
    const sizeRandom = Math.random();
    let size;
    if (sizeRandom < 0.5) {
        size = Math.random() * 8 + 4; // Small bubbles (most common)
    } else if (sizeRandom < 0.85) {
        size = Math.random() * 15 + 10; // Medium bubbles
    } else {
        size = Math.random() * 25 + 20; // Large bubbles (rare)
    }
    
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    
    // Animation timing - smaller bubbles rise faster
    const baseDuration = 8 + (size / 5); // 8-13 seconds based on size
    const duration = baseDuration + Math.random() * 4;
    const delay = isInitial ? Math.random() * 10 : 0;
    
    bubble.style.animationDuration = `${duration}s`;
    bubble.style.animationDelay = `${delay}s`;
    
    // Slight horizontal drift variation
    const drift = (Math.random() - 0.5) * 30;
    bubble.style.setProperty('--drift', `${drift}px`);
    
    container.appendChild(bubble);
    
    // Remove bubble after animation completes
    setTimeout(() => {
        bubble.remove();
    }, (duration + delay) * 1000);
}

/**
 * Subtle parallax effect for depth perception
 */
function initParallax() {
    const lifebuoy = document.querySelector('.lifebuoy');
    const boat = document.querySelector('.paper-boat');
    
    if (!lifebuoy || !boat) return;
    
    // Only enable on desktop for performance
    if (window.innerWidth < 768) return;
    
    let mouseX = 0;
    let mouseY = 0;
    let currentX = 0;
    let currentY = 0;
    
    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });
    
    function animate() {
        // Smooth interpolation
        currentX += (mouseX - currentX) * 0.05;
        currentY += (mouseY - currentY) * 0.05;
        
        // Apply subtle movement
        lifebuoy.style.transform = `translate(${currentX * 10}px, ${currentY * 5}px)`;
        boat.style.transform = `translate(${-currentX * 8}px, ${currentY * 4}px)`;
        
        requestAnimationFrame(animate);
    }
    
    animate();
}

// Visibility API to pause animations when tab is not visible
document.addEventListener('visibilitychange', () => {
    const bubbles = document.querySelectorAll('.bubble');
    bubbles.forEach(bubble => {
        bubble.style.animationPlayState = document.hidden ? 'paused' : 'running';
    });
});
