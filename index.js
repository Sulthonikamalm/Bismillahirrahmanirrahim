// ===============================================
// DOKUMENTASI UMUM INDEX.JS
// File ini menangani interaksi utama situs, termasuk smooth scroll, navbar scroll, reveal on scroll, mobile menu, tabs, accordion, loading state, dan parallax.
// Semua fitur dibungkus dalam IIFE untuk menghindari polusi global scope.
// Responsivitas dipertimbangkan dengan prefers-reduced-motion untuk mengurangi animasi pada user yang sensitif.
// ================================================

(function () {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ============================================
  // SMOOTH SCROLL FOR INTERNAL ANCHORS
  // Dokumentasi: Menangani klik pada anchor internal (#id) untuk smooth scroll, dengan fallback ke auto jika reduced motion aktif. Juga fokus elemen target untuk aksesibilitas.
  // ============================================
  document.addEventListener('click', function (e) {
    const target = e.target.closest('a[href^="#"]');
    if (!target) return;
    const id = target.getAttribute('href');
    if (id === '#' || id.length < 2) return;
    const el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
    setTimeout(() => {
      el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: true });
    }, prefersReduced ? 0 : 300);
  });

  // ============================================
  // NAVBAR TRANSPARENCY ON SCROLL
  // Dokumentasi: Menambahkan class 'scrolled' pada navbar saat window scroll > 8px untuk efek transparansi, menggunakan passive listener untuk performance.
  // ============================================
  const navbar = document.querySelector('.navbar');
  const updateNav = () => {
    if (!navbar) return;
    if (window.scrollY > 8) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');
  };
  updateNav();
  window.addEventListener('scroll', updateNav, { passive: true });

  // ============================================
  // REVEAL ON SCROLL AND COUNTERS
  // Dokumentasi: Menggunakan IntersectionObserver untuk reveal elemen saat masuk viewport, dengan stagger delay untuk grup. Juga animasi count-up untuk statistik menggunakan easing cubic.
  // ============================================
  const revealEls = Array.from(document.querySelectorAll('[data-reveal]'));
  const statEls = Array.from(document.querySelectorAll('.stat-number'));
  const formatId = new Intl.NumberFormat('id-ID');

  // ============================================
  // DYNAMIC STATISTICS LOADING FROM DATABASE
  // Dokumentasi: Fetch statistik dari API backend dan update elemen dengan animasi count-up
  // Helper untuk mendapatkan path API yang benar dari mana saja
  const getBaseApiUrl = () => {
    // Cek apakah kita berada di dalam subfolder "Page"
    const path = window.location.pathname;
    if (path.includes('/Landing Page/') || path.includes('/About Page/')) {
      return '../api/';
    }
    // Default asumsi di root /Bismillahirrahmanirrahim/
    return 'api/';
  };

  const loadStatistics = async () => {
    const apiEndpoint = getBaseApiUrl() + 'get_public_statistics.php';
    console.log('[Statistics] Fetching from:', apiEndpoint);

    try {
      const response = await fetch(apiEndpoint);
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      
      const result = await response.json();
      if (result.status !== 'success' || !result.data) throw new Error('Invalid data format');

      // Helper untuk update elemen jika ada
      const updateElement = (id, value) => {
        const el = document.getElementById(id);
        if (el) {
          el.setAttribute('data-target', value);
          el.textContent = '0'; // Reset ke 0 sebelum animasi
          el.removeAttribute('data-loading');
        }
      };

      // Update Landing Page & About Page elements
      const { total_cases, cases_received, cases_completed } = result.data;

      // Landing Page
      updateElement('total-cases', total_cases);
      updateElement('cases-received', cases_received);
      updateElement('cases-completed', cases_completed);

      // About Page (Specific IDs)
      updateElement('about-cases-received', cases_received);
      updateElement('about-cases-completed', cases_completed);

    } catch (error) {
      console.warn('[Statistics] Failed to load:', error);
      
      // Fallback: Set semua ke 0 dan remove loading state
      const ids = [
        'total-cases', 'cases-received', 'cases-completed',
        'about-cases-received', 'about-cases-completed'
      ];
      
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.setAttribute('data-target', '0');
          el.textContent = '0';
          el.removeAttribute('data-loading');
        }
      });
    }
  };

  // Load statistics immediately on page load
  loadStatistics();

  const animateCount = (el) => {
    if (el.dataset.counted === 'true') return;
    
    // Jika masih loading, tunggu data dari API
    if (el.hasAttribute('data-loading')) {
      setTimeout(() => animateCount(el), 100);
      return;
    }
    
    // Gunakan data-target jika ada, atau parse dari textContent
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
    
    const duration = prefersReduced ? 0 : 2000; // Increased duration untuk animasi lebih smooth
    const start = performance.now();
    el.dataset.counted = 'true';
    
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      // Easing function: easeOutExpo untuk efek yang lebih dramatis
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
    revealEls.forEach((el) => io.observe(el));
    statEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
    statEls.forEach((el) => animateCount(el));
  }


  // ============================================
  // MOBILE MENU
  // Dokumentasi: Menangani toggle menu mobile dengan hamburger button, lock body scroll saat open, dan fokus pertama item saat dibuka. Tutup dengan Escape atau klik item.
  // ============================================
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
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
    primaryNav.addEventListener('click', (e) => { if (e.target.closest('.nav-item')) closeMenu(); });
  }

  // ============================================
  // TABS
  // Dokumentasi: Menangani tab navigasi dengan ARIA attributes, switch active tab on click, dan navigasi keyboard (ArrowLeft/Right).
  // ============================================
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

  // ============================================
  // ACCORDION / FAQ
  // Dokumentasi: Accordion dengan animasi height menggunakan requestAnimationFrame, ARIA attributes, dan navigasi keyboard (Enter/Space untuk toggle, ArrowUp/Down untuk nav). Hanya satu open sekaligus.
  // ============================================
  const faqButtons = Array.from(document.querySelectorAll('.faq-button'));
  const getAnswer = (btn) => btn.nextElementSibling;
  const collapse = (answer, btn) => {
    if (!answer || !answer.classList.contains('show')) return;
    btn && btn.setAttribute('aria-expanded', 'false');
    const startHeight = answer.scrollHeight;
    answer.style.height = startHeight + 'px';
    answer.classList.add('animating');
    requestAnimationFrame(() => { answer.style.height = '0px'; answer.classList.remove('show'); });
    answer.addEventListener('transitionend', () => { answer.classList.remove('animating'); answer.style.height = ''; }, { once: true });
  };
  const expand = (answer, btn) => {
    if (!answer || answer.classList.contains('show')) return;
    btn && btn.setAttribute('aria-expanded', 'true');
    answer.classList.add('show', 'animating');
    answer.style.height = '0px';
    const targetHeight = answer.scrollHeight;
    requestAnimationFrame(() => { answer.style.height = targetHeight + 'px'; });
    answer.addEventListener('transitionend', () => { answer.classList.remove('animating'); answer.style.height = ''; }, { once: true });
  };
  if (faqButtons.length) {
    faqButtons.forEach((btn, i) => {
      const answer = getAnswer(btn);
      const open = answer && answer.classList.contains('show');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (answer && !answer.id) answer.id = `faq-${i + 1}`;
      if (answer) btn.setAttribute('aria-controls', answer.id);
      btn.addEventListener('click', () => {
        faqButtons.forEach((other) => { if (other !== btn) collapse(getAnswer(other), other); });
        const ans = getAnswer(btn);
        if (ans.classList.contains('show')) collapse(ans, btn); else expand(ans, btn);
      });
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          const dir = e.key === 'ArrowDown' ? 1 : -1;
          const idx = faqButtons.indexOf(btn);
          const next = (idx + dir + faqButtons.length) % faqButtons.length;
          faqButtons[next].focus();
        }
      });
    });
  }

  // ============================================
  // LOADING STATE FOR MONITORING
  // Dokumentasi: Menangani tombol cek progress dengan validasi input, tampilkan spinner loading, redirect ke monitoring page jika valid, atau error jika tidak ditemukan.
  // ============================================
  const checkBtn = document.getElementById('checkProgressBtn');
  const progressStatusDiv = document.getElementById('progressStatus');
  const kodeInput = document.getElementById('kodeLaporan');
  if (checkBtn && progressStatusDiv && kodeInput) {
    checkBtn.addEventListener('click', function () {
      const kode = kodeInput.value.trim().toUpperCase();
      progressStatusDiv.innerHTML = '';

      // Validation
      if (kode === '') {
        progressStatusDiv.innerHTML = '<span style="color: #a94442;">Silakan masukkan kode laporan terlebih dahulu.</span>';
        return;
      }

      if (kode.length < 3) {
        progressStatusDiv.innerHTML = '<span style="color: #a94442;">Kode laporan minimal 3 karakter.</span>';
        return;
      }

      // Disable button
      checkBtn.disabled = true;

      // Show loading
      const spinner = document.createElement('span');
      spinner.className = 'spinner';
      spinner.setAttribute('aria-hidden', 'true');
      spinner.style.cssText = 'display:inline-block;width:16px;height:16px;border:3px solid #ccc;border-top-color:#667eea;border-radius:50%;animation:spin 0.8s linear infinite;';
      const loadingText = document.createElement('span');
      loadingText.style.marginLeft = '8px';
      loadingText.textContent = 'Memeriksa...';
      progressStatusDiv.appendChild(spinner);
      progressStatusDiv.appendChild(loadingText);

      // ==========================================================
      // PANGGILAN BACKEND API ASLI
      // ==========================================================
      // Kita menggunakan 'POST' agar lebih aman dan fleksibel,
      // mengirim JSON yang berisi 'query' (bisa ID atau Email).
      // Backend PHP akan memproses dan mengembalikan JSON berisi
      
      fetch('../api/check_progress.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        // 'kode' adalah nilai dari input, bisa berupa ID atau Email
        body: JSON.stringify({ query: kode })
      })
      .then(response => {
        if (!response.ok) {
          // Tangani jika server PHP error (misal: 500)
          throw new Error('Terjadi masalah pada server.');
        }
        return response.json();
      })
      .then(data => {
        // Backend PHP diharapkan mengembalikan JSON:
        // Jika sukses: { status: 'ditemukan', kode_laporan: 'GNJ34' }
        // Jika gagal:   { status: 'tidak_ditemukan' }

        if (data.status === 'ditemukan') {
          // SUKSES: Laporan ditemukan!
          progressStatusDiv.innerHTML = '<span style="color: #2e7d32;"><i class="fas fa-check-circle"></i> Laporan ditemukan! Mengarahkan...</span>';

          // Redirect ke halaman monitoring dengan KODE Laporan
          // (Bahkan jika user mencari via email, kita redirect pakai KODE)
          setTimeout(() => {
            window.location.href = `../Monitoring/monitoring.html?kode=${data.kode_laporan}`;
          }, 500);

        } else {
          // GAGAL: Laporan tidak ditemukan
          progressStatusDiv.innerHTML = `<span style="color: #ef6c00;"><i class="fas fa-exclamation-circle"></i> Kode atau email tidak ditemukan. Silakan periksa kembali.</span>`;
          checkBtn.disabled = false; // Aktifkan tombol lagi

          // Hapus pesan error setelah 5 detik
          setTimeout(() => {
            progressStatusDiv.innerHTML = '';
          }, 5000);
        }
      })
      .catch(error => {
        // GAGAL: Error jaringan atau server
        console.error('Error fetching:', error);
        progressStatusDiv.innerHTML = `<span style="color: #a94442;"><i class="fas fa-times-circle"></i> ${error.message || 'Tidak dapat terhubung ke server.'}</span>`;
        checkBtn.disabled = false; // Aktifkan tombol lagi
      });
      // ==========================================================
      // AKHIR PANGGILAN BACKEND API
      // ==========================================================
    });
    
    // Auto-uppercase input
    kodeInput.addEventListener('input', function() {
      kodeInput.value = kodeInput.value.toUpperCase();
    });
    
    // Enter key support
    kodeInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        checkBtn.click();
      }
    });
  }

  // ============================================
  // SUBTLE PARALLAX
  // Dokumentasi: Efek parallax sederhana pada elemen .box-blue saat scroll, dinonaktifkan jika reduced motion.
  // ============================================
  const boxBlue = document.querySelector('.box-blue');
  if (boxBlue && !prefersReduced) {
    const onScroll = () => {
      boxBlue.style.transform = `translateY(${window.scrollY * 0.06}px)`;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ============================================
  // LAPOR BUTTON NAVIGATION
  // Dokumentasi: Event listeners untuk tombol LAPOR yang mengarah ke halaman pelaporan.
  // Menggantikan inline onclick handlers untuk clean code dan aksesibilitas.
  // ============================================
  const laporButtons = document.querySelectorAll('.js-lapor-nav, .js-lapor-hero, .js-lapor-monitoring, .js-lapor-about');
  laporButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      window.location.href = '../Lapor/lapor.html';
    });
  });

  // LAPOR button on the Lapor page itself (stays on same page)
  const laporBtnSamePage = document.querySelector('.js-lapor-btn');
  if (laporBtnSamePage) {
    laporBtnSamePage.addEventListener('click', function(e) {
      e.preventDefault();
      window.location.href = 'lapor.html';
    });
  }

})();