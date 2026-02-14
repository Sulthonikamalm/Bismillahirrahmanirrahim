// ============================================
// ABOUT.JS – About Page Specific Scripts
// Statistics counter handled by global index.js
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Statistics animation is handled by ../index.js
  // No need for duplicate logic here
  
  console.log('📄 About Page scripts loaded');

  // ============================================
  // SCROLL VELOCITY ANIMATION
  // Harmony, Excellence, Integrity
  // ============================================

  const scrollVelocityTracks = document.querySelectorAll('.scroll-velocity-track');

  if (scrollVelocityTracks.length > 0) {
    const trackData = [];

    scrollVelocityTracks.forEach((track) => {
      const content = track.querySelector('.scroll-velocity-content');
      if (!content) return;

      const direction = track.dataset.direction === 'right' ? 1 : -1;

      // Clone content multiple times for seamless loop
      const clone1 = content.cloneNode(true);
      const clone2 = content.cloneNode(true);
      track.appendChild(clone1);
      track.appendChild(clone2);

      const totalWidth = content.offsetWidth;

      trackData.push({
        track: track,
        direction: direction,
        position: direction === 1 ? -totalWidth : 0,
        width: totalWidth,
        speed: 0.5
      });
    });

    // Animation loop
    function animateScrollVelocity() {
      trackData.forEach((data) => {
        data.position += data.speed * data.direction;

        // Reset position for seamless loop
        if (data.direction === -1 && Math.abs(data.position) >= data.width) {
          data.position = 0;
        } else if (data.direction === 1 && data.position >= 0) {
          data.position = -data.width;
        }

        data.track.style.transform = `translateX(${data.position}px)`;
      });

      requestAnimationFrame(animateScrollVelocity);
    }

    animateScrollVelocity();
  }

  // ============================================
  // PILAR BACKGROUND TEXT & HEADER SCROLL ANIMATION
  // Both animate together when section appears
  // ============================================

  const pilarBgText = document.querySelector('.pilar-bg-text');
  const pilarHeader = document.querySelector('.pilar-header');

  if (pilarBgText || pilarHeader) {
    const pilarObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Animate both PILAR text and header together
          if (pilarBgText) {
            pilarBgText.classList.add('animate-in');
          }
          if (pilarHeader) {
            pilarHeader.classList.add('animate-in');
          }
          pilarObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.2,
      rootMargin: '0px 0px -100px 0px'
    });

    const pilarSection = document.querySelector('.pilar-section');
    if (pilarSection) {
      pilarObserver.observe(pilarSection);
    }
  }

  // ============================================
  // SINERGI BACKGROUND TEXT & HEADER & DESCRIPTION ANIMATION
  // All animate together when section appears
  // ============================================

  const sinergiBgText = document.querySelector('.sinergi-bg-text');
  const sinergiHeader = document.querySelector('.sinergi-header');
  const sinergiDescription = document.querySelector('.sinergi-description');

  if (sinergiBgText || sinergiHeader || sinergiDescription) {
    const sinergiObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Animate all elements together
          if (sinergiBgText) {
            sinergiBgText.classList.add('animate-in');
          }
          if (sinergiHeader) {
            sinergiHeader.classList.add('animate-in');
          }
          if (sinergiDescription) {
            sinergiDescription.classList.add('animate-in');
          }
          sinergiObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.2,
      rootMargin: '0px 0px -100px 0px'
    });

    const sinergiSection = document.querySelector('.sinergi-section');
    if (sinergiSection) {
      sinergiObserver.observe(sinergiSection);
    }
  }

  // ============================================
  // DAMPAK BACKGROUND TEXT & HEADER & DESCRIPTION ANIMATION
  // All animate together when section appears
  // ============================================

  const dampakBgText = document.querySelector('.dampak-bg-text');
  const dampakHeader = document.querySelector('.dampak-header');
  const dampakDescription = document.querySelector('.dampak-description');

  if (dampakBgText || dampakHeader || dampakDescription) {
    const dampakObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Animate all elements together
          if (dampakBgText) {
            dampakBgText.classList.add('animate-in');
          }
          if (dampakHeader) {
            dampakHeader.classList.add('animate-in');
          }
          if (dampakDescription) {
            dampakDescription.classList.add('animate-in');
          }
          dampakObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.2,
      rootMargin: '0px 0px -100px 0px'
    });

    const dampakSection = document.querySelector('.dampak-section');
    if (dampakSection) {
      dampakObserver.observe(dampakSection);
    }
  }
});

