(function () {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- SMOOTH SCROLL & FOCUS --- */
  document.addEventListener('click', function (e) {
    const target = e.target.closest('a[href^="#"]');
    if (!target) return;
    
    const id = target.getAttribute('href');
    if (id === '#' || id.length < 2) return;
    
    const el = document.querySelector(id);
    if (!el) return;
    
    e.preventDefault();
    el.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
    
    // Aksesibilitas: Pindahkan fokus
    setTimeout(() => {
      el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: true });
    }, prefersReduced ? 0 : 300);
  });

  /* --- SMOOTH NAVBAR SHRINK ON SCROLL --- */
  const navbar = document.querySelector('.navbar');
  
  // Scroll thresholds with hysteresis to prevent flickering
  const SCROLL_THRESHOLD_DOWN = 50;   // Add .scrolled when scrolling past this
  const SCROLL_THRESHOLD_UP = 20;     // Remove .scrolled when scrolling above this
  let isScrolled = false;
  let ticking = false;
  
  const updateNav = () => {
    if (!navbar) return;
    
    const scrollY = window.scrollY;
    
    // Hysteresis: different thresholds for adding vs removing
    if (!isScrolled && scrollY > SCROLL_THRESHOLD_DOWN) {
      navbar.classList.add('scrolled');
      isScrolled = true;
    } else if (isScrolled && scrollY < SCROLL_THRESHOLD_UP) {
      navbar.classList.remove('scrolled');
      isScrolled = false;
    }
    
    ticking = false;
  };
  
  const onScroll = () => {
    if (!ticking) {
      // Use requestAnimationFrame for smooth 60fps updates
      requestAnimationFrame(updateNav);
      ticking = true;
    }
  };
  
  if (navbar) {
    updateNav();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* --- STATISTIK LOADER --- */
  const loadStatistics = async () => {
    // Sesuaikan path API relatif dari root atau Landing Page
    const apiEndpoint = '../api/public/get_statistics.php';
    try {
      const response = await fetch(apiEndpoint);
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      
      const result = await response.json();
      if (result.status !== 'success' || !result.data) throw new Error('Invalid data format');

      // Update elemen statistik
      const updateElement = (id, value) => {
        const el = document.getElementById(id);
        if (el) {
          el.setAttribute('data-target', value);
          el.textContent = '0';
          el.removeAttribute('data-loading');
        }
      };

      const { total_cases, cases_received, cases_completed } = result.data;

      // Dashboard stats
      updateElement('total-cases', total_cases);
      updateElement('cases-received', cases_received);
      updateElement('cases-completed', cases_completed);
      
      // About page stats (jika ada)
      updateElement('about-cases-received', total_cases);
      updateElement('about-cases-completed', cases_completed);

    } catch (error) {
      console.warn('Gagal memuat statistik:', error);
      // Fallback ke 0 jika gagal
      ['total-cases', 'cases-received', 'cases-completed'].forEach(id => {
          const el = document.getElementById(id);
          if(el) {
              el.textContent = '0';
              el.removeAttribute('data-loading');
          }
      });
    }
  };

  loadStatistics();

  /* --- ANIMASI ANGKA STATISTIK --- */
  const formatId = new Intl.NumberFormat('id-ID');
  
  const animateCount = (el) => {
    if (el.dataset.counted === 'true') return;
    
    if (el.hasAttribute('data-loading')) {
      setTimeout(() => animateCount(el), 100);
      return;
    }
    
    const targetAttr = el.getAttribute('data-target');
    let target;
    
    if (targetAttr) {
      target = parseInt(targetAttr, 10);
    } else {
      const text = el.textContent.trim();
      const digits = text.replace(/[^0-9]/g, '');
      if (!digits) return;
      target = parseInt(digits, 10);
    }
    
    const duration = prefersReduced ? 0 : 2000;
    const start = performance.now();
    el.dataset.counted = 'true';
    
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      const current = Math.round(target * eased);
      el.textContent = formatId.format(current);
      
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = formatId.format(target);
      }
    };
    
    if (duration === 0) { 
      el.textContent = formatId.format(target); 
      return; 
    }
    requestAnimationFrame(step);
  };

  /* --- INTERSECTION OBSERVER (SCROLL REVEAL) --- */
  const revealEls = document.querySelectorAll('[data-reveal]');
  
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const parent = entry.target.parentElement;
            if (parent && !parent.dataset.staggered) {
              const group = Array.from(parent.querySelectorAll('[data-reveal]'));
              group.forEach((el, idx) => {
                el.style.transitionDelay = prefersReduced ? '0ms' : `${Math.min(idx * 100, 600)}ms`;
              });
              parent.dataset.staggered = 'true';
            }
            entry.target.classList.add('is-visible');
            if (entry.target.classList.contains('stat-number')) animateCount(entry.target);
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.15 }
    );
    
    revealEls.forEach(el => io.observe(el));
    // Observe stat elements secara terpisah jika perlu animasi angka
    document.querySelectorAll('.stat-number, .transparansi-stat').forEach(el => io.observe(el));
  } else {
    // Fallback untuk browser lama
    revealEls.forEach(el => el.classList.add('is-visible'));
  }

  /* --- MOBILE MENU --- */
  const hamburger = document.querySelector('.hamburger');
  const primaryNav = document.getElementById('primary-navigation');
  
  if (hamburger && primaryNav) {
    const closeMenu = () => {
      hamburger.setAttribute('aria-expanded', 'false');
      primaryNav.classList.remove('open');
      document.body.classList.remove('menu-open');
    };
    
    hamburger.addEventListener('click', () => {
      const expanded = hamburger.getAttribute('aria-expanded') === 'true';
      hamburger.setAttribute('aria-expanded', String(!expanded));
      
      if (!expanded) {
        primaryNav.classList.add('open');
        document.body.classList.add('menu-open');
        const firstItem = primaryNav.querySelector('.nav-item');
        if (firstItem) setTimeout(() => firstItem.focus(), 150);
      } else {
        closeMenu();
      }
    });

    // Close on Escape or Click Outside
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
    document.addEventListener('click', (e) => {
        if (!primaryNav.contains(e.target) && !hamburger.contains(e.target) && primaryNav.classList.contains('open')) {
            closeMenu();
        }
    });
  }

  /* TABS */
  const tabList = document.querySelector('.tab-nav');
  if (tabList) {
    const tabs = Array.from(tabList.querySelectorAll('[role="tab"]'));
    tabs.forEach((tab, idx) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
      });
      tab.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const dir = e.key === 'ArrowRight' ? 1 : -1;
          const next = (idx + dir + tabs.length) % tabs.length;
          tabs[next].focus();
        }
      });
    });
  }

  /* --- FAQ ACCORDION --- */
  const faqButtons = Array.from(document.querySelectorAll('.faq-button'));
  
  if (faqButtons.length) {
    faqButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const answer = btn.nextElementSibling;
        const isOpen = answer.classList.contains('show');
        
        // Tutup yang lain (accordion style)
        faqButtons.forEach(otherBtn => {
            if (otherBtn !== btn) {
                const otherAns = otherBtn.nextElementSibling;
                otherAns.classList.remove('show');
                otherAns.style.height = '';
                otherBtn.setAttribute('aria-expanded', 'false');
            }
        });

        // Toggle current
        if (isOpen) {
            answer.classList.remove('show');
            answer.style.height = '';
            btn.setAttribute('aria-expanded', 'false');
        } else {
            answer.classList.add('show');
            answer.style.height = answer.scrollHeight + 'px';
            btn.setAttribute('aria-expanded', 'true');
        }
      });
    });
  }

  /* --- PARALLAX EFFECT (DESKTOP ONLY) --- */
  const boxBlue = document.querySelector('.box-blue');
  if (boxBlue && !prefersReduced && window.innerWidth > 768) {
    window.addEventListener('scroll', () => {
      requestAnimationFrame(() => {
          boxBlue.style.transform = `translateY(${window.scrollY * 0.05}px)`;
      });
    }, { passive: true });
  }

  /* --- BUTTON NAVIGATION --- */
  const laporButtons = document.querySelectorAll('.js-lapor-nav, .js-lapor-hero, .js-lapor-monitoring, .js-lapor-about');
  laporButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      // Pastikan path benar relatif dari lokasi file ini dipanggil (Landing Page)
      window.location.href = '../Lapor/lapor.html';
    });
  });

  const laporBtnSamePage = document.querySelector('.js-lapor-btn');
  if (laporBtnSamePage) {
    laporBtnSamePage.addEventListener('click', function(e) {
      e.preventDefault();
      window.location.href = '../Lapor/lapor.html';
    });
  }

})();