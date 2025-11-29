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

  // ============================================
  // STATISTICS CARDS - Backend Integration
  // Fetch real-time data from API/Database
  // ============================================

  // Configuration - Update API endpoint sesuai backend Anda
  const STATS_API_CONFIG = {
    endpoint: '/api/statistics', // Ganti dengan endpoint API backend Anda
    fallbackData: {
      korban: 6239,
      laporan: 120,
      perlindungan: 390
    }
  };

  // Fetch statistics data from backend
  async function fetchStatistics() {
    try {
      const response = await fetch(STATS_API_CONFIG.endpoint);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.warn('Failed to fetch statistics from backend. Using fallback data.', error);
      // Return fallback data if API fails
      return STATS_API_CONFIG.fallbackData;
    }
  }

  // Animate counter from 0 to target value
  function animateCounter(element, target) {
    const duration = 2000; // 2 seconds
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(Math.ceil(increment * step), target);

      // Format number with thousands separator
      element.textContent = current.toLocaleString('id-ID');

      if (step >= steps) {
        clearInterval(timer);
        element.textContent = target.toLocaleString('id-ID');
      }
    }, duration / steps);
  }

  // Update statistics cards with data
  function updateStatisticsCards(data) {
    const statKorban = document.getElementById('stat-korban');
    const statLaporan = document.getElementById('stat-laporan');
    const statPerlindungan = document.getElementById('stat-perlindungan');

    if (statKorban && data.korban !== undefined) {
      animateCounter(statKorban, data.korban);
    }

    if (statLaporan && data.laporan !== undefined) {
      animateCounter(statLaporan, data.laporan);
    }

    if (statPerlindungan && data.perlindungan !== undefined) {
      animateCounter(statPerlindungan, data.perlindungan);
    }
  }

  // Initialize statistics with IntersectionObserver
  const statsSection = document.querySelector('.stats-section');

  if (statsSection) {
    let statsLoaded = false;

    const statsObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !statsLoaded) {
          statsLoaded = true;

          // Fetch and update statistics
          fetchStatistics().then(data => {
            updateStatisticsCards(data);
          });

          statsObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.3,
      rootMargin: '0px 0px -50px 0px'
    });

    statsObserver.observe(statsSection);
  }

  // Optional: Auto-refresh statistics every 5 minutes
  // Uncomment jika ingin auto-refresh
  /*
  setInterval(() => {
    fetchStatistics().then(data => {
      updateStatisticsCards(data);
    });
  }, 5 * 60 * 1000); // 5 minutes
  */
});

