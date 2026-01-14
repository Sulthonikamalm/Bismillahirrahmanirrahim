/**
 * Sistem Konfeti - Efek perayaan saat laporan selesai
 */

(function() {
  'use strict';

  const CONFIG = {
    particleCount: 150,
    colors: ['#8ED4D1', '#4b8a7b', '#f39c12', '#e74c3c', '#3498db', '#9b59b6', '#f1c40f', '#e67e22'],
    shapes: ['circle', 'square', 'triangle'],
    gravity: 0.5,
    drag: 0.98,
    duration: 5000
  };

  let canvas, ctx;
  let particles = [];
  let animationId = null;
  let isActive = false;

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
    }

    update() {
      this.velocityY += CONFIG.gravity;
      this.velocityX *= CONFIG.drag;
      this.velocityY *= CONFIG.drag;
      this.x += this.velocityX;
      this.y += this.velocityY;
      this.rotation += this.rotationSpeed;
      if (this.y > canvas.height * 0.8) this.opacity -= 0.02;
    }

    draw() {
      ctx.save();
      ctx.globalAlpha = this.opacity;
      ctx.translate(this.x, this.y);
      ctx.rotate((this.rotation * Math.PI) / 180);
      ctx.fillStyle = this.color;

      if (this.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (this.shape === 'square') {
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
      } else {
        ctx.beginPath();
        ctx.moveTo(0, -this.size / 2);
        ctx.lineTo(-this.size / 2, this.size / 2);
        ctx.lineTo(this.size / 2, this.size / 2);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    isDead() {
      return this.opacity <= 0 || this.y > canvas.height + 50;
    }
  }

  function initCanvas() {
    canvas = document.getElementById('confettiCanvas');
    if (!canvas) return false;
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return true;
  }

  function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function createParticles(x, y, count = CONFIG.particleCount) {
    for (let i = 0; i < count; i++) {
      particles.push(new Particle(x, y));
    }
  }

  function animate() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    particles.forEach((particle, index) => {
      particle.update();
      particle.draw();
      if (particle.isDead()) particles.splice(index, 1);
    });
    
    if (particles.length > 0) {
      animationId = requestAnimationFrame(animate);
    } else {
      stop();
    }
  }

  function start(options = {}) {
    if (isActive) return;
    const config = { ...CONFIG, ...options };
    
    if (!canvas && !initCanvas()) return;

    isActive = true;
    canvas.classList.add('active');
    
    const positions = [
      { x: canvas.width * 0.25, y: canvas.height * 0.5 },
      { x: canvas.width * 0.5, y: canvas.height * 0.3 },
      { x: canvas.width * 0.75, y: canvas.height * 0.5 }
    ];
    
    positions.forEach((pos, index) => {
      setTimeout(() => createParticles(pos.x, pos.y, config.particleCount / positions.length), index * 150);
    });
    
    animate();
    
    setTimeout(() => {
      if (isActive) particles.forEach(p => { p.gravity = CONFIG.gravity * 2; });
    }, config.duration);
  }

  function stop() {
    if (!isActive) return;
    isActive = false;
    if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
    particles = [];
    if (canvas) {
      canvas.classList.remove('active');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function burst(x, y, count = 50) {
    if (!canvas && !initCanvas()) return;
    if (!isActive) { canvas.classList.add('active'); isActive = true; }
    createParticles(x, y, count);
    if (!animationId) animate();
  }

  // API Publik
  window.Confetti = { start, stop, burst, config: CONFIG };

  // Inisialisasi
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCanvas);
  } else {
    initCanvas();
  }
})();