// ============================================
// ABOUT.JS – Counter untuk Jumlah Pelapor
// Hanya dijalankan di halaman about
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const counters = document.querySelectorAll('.stat-number[data-target]');
  const speed = 120;

  const animateCounter = (counter) => {
    const target = +counter.getAttribute('data-target');
    const count = +counter.innerText;
    const inc = target / speed;

    if (count < target) {
      counter.innerText = Math.ceil(count + inc);
      setTimeout(() => animateCounter(counter), 15);
    } else {
      counter.innerText = target.toLocaleString('id-ID');
    }
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        counters.forEach(counter => animateCounter(counter));
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  const section = document.querySelector('.pelapor');
  if (section) observer.observe(section);

  // ============================================
  // SCROLL VELOCITY ANIMATION
  // Harmony, Excellence, Integrity
  // ============================================

  const scrollVelocityTracks = document.querySelectorAll('.scroll-velocity-track');

  if (scrollVelocityTracks.length > 0) {
    let lastScrollY = window.scrollY;
    let scrollVelocity = 0;
    const baseVelocity = 0.8;

    // Track positions for each content
    const trackData = [];

    scrollVelocityTracks.forEach((track) => {
      const content = track.querySelector('.scroll-velocity-content');
      if (!content) return;

      const direction = track.dataset.direction === 'right' ? -1 : 1;

      // Clone content for seamless loop
      const clone = content.cloneNode(true);
      track.appendChild(clone);

      // Set initial position for right-moving track
      const initialPos = direction === -1 ? -content.offsetWidth : 0;

      trackData.push({
        content: content,
        clone: clone,
        direction: direction,
        position: initialPos,
        width: content.offsetWidth
      });

      // Apply initial transform
      const transform = `translateX(${-initialPos}px)`;
      content.style.transform = transform;
      clone.style.transform = transform;
    });

    // Update scroll velocity on scroll
    window.addEventListener('scroll', () => {
      const currentScrollY = window.scrollY;
      scrollVelocity = (currentScrollY - lastScrollY) * 0.08;
      lastScrollY = currentScrollY;
    });

    // Animation loop
    function animateScrollVelocity() {
      scrollVelocity *= 0.92;

      trackData.forEach((data) => {
        const movement = (baseVelocity + Math.abs(scrollVelocity)) * data.direction;
        data.position += movement;

        // Reset position for seamless loop
        if (data.direction === 1 && data.position >= data.width) {
          data.position = data.position - data.width;
        } else if (data.direction === -1 && data.position <= -data.width) {
          data.position = data.position + data.width;
        }

        // Apply transform
        const transform = `translateX(${-data.position}px)`;
        data.content.style.transform = transform;
        data.clone.style.transform = transform;
      });

      requestAnimationFrame(animateScrollVelocity);
    }

    // Start animation
    animateScrollVelocity();

    // Update widths on resize
    window.addEventListener('resize', () => {
      trackData.forEach((data) => {
        data.width = data.content.offsetWidth;
      });
    });
  }
});

