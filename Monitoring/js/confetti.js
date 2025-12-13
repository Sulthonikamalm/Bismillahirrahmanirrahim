// ============================================
// CONFETTI.JS
// Beautiful confetti celebration effect
// Optimized canvas-based particle system
// ============================================

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    particleCount: 150,
    colors: [
      '#8ED4D1', // Teal calm
      '#4b8a7b', // Teal secondary
      '#f39c12', // Orange
      '#e74c3c', // Red
      '#3498db', // Blue
      '#9b59b6', // Purple
      '#f1c40f', // Yellow
      '#e67e22'  // Orange dark
    ],
    shapes: ['circle', 'square', 'triangle'],
    gravity: 0.5,
    drag: 0.98,
    duration: 5000 // ms
  };

  let canvas, ctx;
  let particles = [];
  let animationId = null;
  let isActive = false;

  /**
   * Particle class
   */
  class Particle {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.velocityX = (Math.random() - 0.5) * 15;
      this.velocityY = Math.random() * -20 - 10;
      this.rotation = Math.random() * 360;
      this.rotationSpeed = (Math.random() - 0.5) * 10;
      this.size = Math.random() * 10 + 5;
      this.color = CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)];
      this.shape = CONFIG.shapes[Math.floor(Math.random() * CONFIG.shapes.length)];
      this.opacity = 1;
      this.gravity = CONFIG.gravity;
      this.drag = CONFIG.drag;
    }

    update() {
      // Apply physics
      this.velocityY += this.gravity;
      this.velocityX *= this.drag;
      this.velocityY *= this.drag;
      
      this.x += this.velocityX;
      this.y += this.velocityY;
      this.rotation += this.rotationSpeed;
      
      // Fade out near bottom
      if (this.y > canvas.height * 0.8) {
        this.opacity -= 0.02;
      }
    }

    draw() {
      ctx.save();
      ctx.globalAlpha = this.opacity;
      ctx.translate(this.x, this.y);
      ctx.rotate((this.rotation * Math.PI) / 180);
      ctx.fillStyle = this.color;

      switch (this.shape) {
        case 'circle':
          ctx.beginPath();
          ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
          ctx.fill();
          break;
          
        case 'square':
          ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
          break;
          
        case 'triangle':
          ctx.beginPath();
          ctx.moveTo(0, -this.size / 2);
          ctx.lineTo(-this.size / 2, this.size / 2);
          ctx.lineTo(this.size / 2, this.size / 2);
          ctx.closePath();
          ctx.fill();
          break;
      }

      ctx.restore();
    }

    isDead() {
      return this.opacity <= 0 || this.y > canvas.height + 50;
    }
  }

  /**
   * Initialize canvas
   */
  function initCanvas() {
    canvas = document.getElementById('confettiCanvas');
    if (!canvas) {
      console.warn('⚠️ Confetti canvas not found');
      return false;
    }

    ctx = canvas.getContext('2d');
    resizeCanvas();
    
    // Handle window resize
    window.addEventListener('resize', resizeCanvas);
    
    return true;
  }

  /**
   * Resize canvas to window size
   */
  function resizeCanvas() {
    if (!canvas) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  /**
   * Create particles at position
   */
  function createParticles(x, y, count = CONFIG.particleCount) {
    for (let i = 0; i < count; i++) {
      particles.push(new Particle(x, y));
    }
  }

  /**
   * Animation loop
   */
  function animate() {
    if (!ctx || !canvas) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Update and draw particles
    particles.forEach((particle, index) => {
      particle.update();
      particle.draw();
      
      // Remove dead particles
      if (particle.isDead()) {
        particles.splice(index, 1);
      }
    });
    
    // Continue animation if particles exist
    if (particles.length > 0) {
      animationId = requestAnimationFrame(animate);
    } else {
      stop();
    }
  }

  /**
   * Start confetti celebration
   * @param {Object} options - Configuration options
   */
  function start(options = {}) {
    // Prevent multiple instances
    if (isActive) {
      console.log('🎉 Confetti already active');
      return;
    }

    // Merge options with defaults
    const config = { ...CONFIG, ...options };
    
    // Initialize if needed
    if (!canvas && !initCanvas()) {
      console.error('❌ Failed to initialize confetti canvas');
      return;
    }

    isActive = true;
    canvas.classList.add('active');
    
    console.log('🎉 Starting confetti celebration!');
    
    // Create particles from multiple points
    const positions = [
      { x: canvas.width * 0.25, y: canvas.height * 0.5 },
      { x: canvas.width * 0.5, y: canvas.height * 0.3 },
      { x: canvas.width * 0.75, y: canvas.height * 0.5 }
    ];
    
    positions.forEach((pos, index) => {
      setTimeout(() => {
        createParticles(pos.x, pos.y, config.particleCount / positions.length);
      }, index * 150);
    });
    
    // Start animation
    animate();
    
    // Auto-stop after duration
    setTimeout(() => {
      if (isActive) {
        // Fade out remaining particles
        particles.forEach(p => {
          p.gravity = CONFIG.gravity * 2; // Speed up falling
        });
      }
    }, config.duration);
  }

  /**
   * Stop confetti
   */
  function stop() {
    if (!isActive) return;
    
    isActive = false;
    
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    
    particles = [];
    
    if (canvas) {
      canvas.classList.remove('active');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    
    console.log('🎊 Confetti stopped');
  }

  /**
   * Burst confetti at specific point
   */
  function burst(x, y, count = 50) {
    if (!canvas && !initCanvas()) return;
    
    if (!isActive) {
      canvas.classList.add('active');
      isActive = true;
    }
    
    createParticles(x, y, count);
    
    if (!animationId) {
      animate();
    }
  }

  /**
   * Rain confetti from top
   */
  function rain(duration = 3000) {
    if (!canvas && !initCanvas()) return;
    
    canvas.classList.add('active');
    isActive = true;
    
    const interval = setInterval(() => {
      const x = Math.random() * canvas.width;
      createParticles(x, -20, 3);
      
      if (!animationId) {
        animate();
      }
    }, 100);
    
    setTimeout(() => {
      clearInterval(interval);
      setTimeout(stop, 2000); // Let particles fall
    }, duration);
  }

  // Export to global scope
  window.Confetti = {
    start,
    stop,
    burst,
    rain,
    config: CONFIG
  };

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCanvas);
  } else {
    initCanvas();
  }

  console.log('🎊 Confetti module loaded');

})();