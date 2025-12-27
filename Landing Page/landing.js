/* ============================================
   LANDING PAGE SPECIFIC LOGIC
   ============================================ */

(function () {
    'use strict';
  
    console.log('✅ Landing Page JS Loaded');

    // ============================================
    // STABILO/HIGHLIGHTER ANIMATION ON SCROLL
    // ============================================
    
    function initScrollAnimations() {
      // Elements to animate: highlight texts + stat cards + proses section elements + roadmap
      const highlightElements = document.querySelectorAll('.highlight-animate');
      const statCards = document.querySelectorAll('.transparansi-stat-box');
      const prosesElements = document.querySelectorAll('.proses-oleh-animate, .proses-description-animate');
      const roadmapElements = document.querySelectorAll('.roadmap-animate');
      
      // Combine all elements
      const allElements = [...highlightElements, ...statCards, ...prosesElements, ...roadmapElements];
      
      if (allElements.length === 0) return;
      
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // Add in-view class to trigger animation
            entry.target.classList.add('in-view');
            // Stop observing after animation triggered
            observer.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.2, // Lower threshold for earlier trigger
        rootMargin: '0px 0px -50px 0px'
      });
      
      allElements.forEach(el => observer.observe(el));
      console.log('✅ Scroll animations initialized:', allElements.length, 'elements');
    }
    
    // ============================================
    // CONTINUOUS LINE DRAWING ON SCROLL
    // Line follows scroll position precisely
    // ============================================
    
    function initContinuousLineDrawing() {
      const drawingLine = document.querySelector('.timeline-drawing-line');
      const timeline = document.querySelector('.process-timeline');
      
      if (!drawingLine || !timeline) return;
      
      function updateLineHeight() {
        const timelineRect = timeline.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const viewportCenter = windowHeight * 0.6; // Line follows this point
        
        // Calculate where the "pen" is based on scroll
        const timelineTop = timelineRect.top;
        const timelineHeight = timelineRect.height;
        
        // How far has the viewport center traveled into the timeline
        const distanceIntoTimeline = viewportCenter - timelineTop;
        
        // No line if we haven't entered yet
        if (distanceIntoTimeline <= 0) {
          drawingLine.style.height = '0px';
          return;
        }
        
        // Calculate line height - directly proportional to scroll
        // Line should reach max when viewport center is near bottom of timeline
        const maxLineHeight = timelineHeight - 100;
        let lineHeight = distanceIntoTimeline;
        
        // Clamp to max height
        lineHeight = Math.min(lineHeight, maxLineHeight);
        lineHeight = Math.max(0, lineHeight);
        
        drawingLine.style.height = `${lineHeight}px`;
      }
      
      // Update on scroll with requestAnimationFrame for smooth performance
      let ticking = false;
      function onScroll() {
        if (!ticking) {
          requestAnimationFrame(() => {
            updateLineHeight();
            ticking = false;
          });
          ticking = true;
        }
      }
      
      // Listen to scroll
      window.addEventListener('scroll', onScroll, { passive: true });
      
      // Initial update
      updateLineHeight();
      
      console.log('✅ Continuous line drawing initialized');
    }
    
    // ============================================
    // VIDEO PLAYER CONTROL - YouTube IFrame API
    // ============================================
    
    function initVideoPlayer() {
      const playBtn = document.getElementById('videoPlayBtn');
      const playIcon = document.getElementById('playIconTriangle');
      const pauseIcon = document.getElementById('pauseIconBars');
      const iframe = document.getElementById('ppkptVideo');
      const videoContainer = document.querySelector('.video-inner-container');
      const coverOverlay = document.getElementById('videoCoverOverlay');
      
      if (!playBtn || !iframe) return;
      
      let player = null;
      let isPlaying = false;
      let hasPlayedOnce = false; // Track if video has been played
      
      // Load YouTube IFrame API
      if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      }
      
      // Initialize player when API is ready
      window.onYouTubeIframeAPIReady = function() {
        player = new YT.Player('ppkptVideo', {
          events: {
            'onStateChange': onPlayerStateChange
          }
        });
      };
      
      // If API already loaded
      if (window.YT && window.YT.Player) {
        player = new YT.Player('ppkptVideo', {
          events: {
            'onStateChange': onPlayerStateChange
          }
        });
      }
      
      function onPlayerStateChange(event) {
        if (event.data === YT.PlayerState.PLAYING) {
          isPlaying = true;
          hasPlayedOnce = true; // Mark that video has been played
          updateUI();
        } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
          isPlaying = false;
          updateUI();
        }
      }
      
      function updateUI() {
        if (isPlaying) {
          // Video playing - hide cover, show pause icon
          playIcon.classList.add('hidden');
          pauseIcon.classList.add('active');
          if (videoContainer) videoContainer.classList.add('playing');
          if (coverOverlay) coverOverlay.classList.add('hidden');
        } else {
          // Video paused - show play icon, but DON'T show cover again
          playIcon.classList.remove('hidden');
          pauseIcon.classList.remove('active');
          if (videoContainer) videoContainer.classList.remove('playing');
          // Cover stays hidden after first play
        }
      }
      
      function playVideo() {
        if (player && player.playVideo) {
          player.playVideo();
        }
      }
      
      function pauseVideo() {
        if (player && player.pauseVideo) {
          player.pauseVideo();
        }
      }
      
      // Play button click
      playBtn.addEventListener('click', function() {
        if (isPlaying) {
          pauseVideo();
        } else {
          playVideo();
        }
      });
      
      // Cover overlay click - start video
      if (coverOverlay) {
        coverOverlay.addEventListener('click', function() {
          playVideo();
        });
      }
      
      console.log('✅ Video player initialized');
    }
    
    // Initialize on DOM ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        initScrollAnimations();
        initContinuousLineDrawing();
        initVideoPlayer();
      });
    } else {
      initScrollAnimations();
      initContinuousLineDrawing();
      initVideoPlayer();
    }


    // ============================================
    // FETCH STATISTICS FROM DATABASE
    // Fetch on load, but animate only when in view
    // ============================================

    // Store fetched data
    let statisticsData = null;
    let countersAnimated = false;
    
    async function fetchStatistics() {
      const API_URL = '../api/get_public_statistics.php';
      
      try {
        const response = await fetch(API_URL, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch statistics');
        }

        const result = await response.json();

        if (result.status === 'success' && result.data) {
          // Store data, don't animate yet
          statisticsData = result.data;
          console.log('✅ Statistics fetched (waiting for scroll):', result.data);
          
          // Setup observer to animate when in view
          setupCounterObserver();
        } else {
          console.warn('Statistics API returned unexpected format:', result);
        }

      } catch (error) {
        console.error('❌ Failed to fetch statistics:', error);
        const totalCasesEl = document.getElementById('total-cases');
        const casesCompletedEl = document.getElementById('cases-completed');
        if (totalCasesEl) totalCasesEl.textContent = '-';
        if (casesCompletedEl) casesCompletedEl.textContent = '-';
      }
    }

    // Observer to trigger counter animation when stats section is visible
    function setupCounterObserver() {
      const statsGrid = document.querySelector('.transparansi-stats-grid');
      if (!statsGrid || countersAnimated) return;

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !countersAnimated && statisticsData) {
            countersAnimated = true;
            
            // Now animate the counters
            const totalCasesEl = document.getElementById('total-cases');
            const casesCompletedEl = document.getElementById('cases-completed');
            
            if (totalCasesEl) {
              animateCounter(totalCasesEl, statisticsData.cases_received || 0);
            }
            if (casesCompletedEl) {
              animateCounter(casesCompletedEl, statisticsData.cases_completed || 0);
            }
            
            console.log('✅ Counter animation started (in view)');
            observer.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.3
      });

      observer.observe(statsGrid);
    }

    // Animated counter effect
    function animateCounter(element, target) {
      const duration = 1500; // 1.5 seconds
      const start = 0;
      const startTime = performance.now();

      function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-out)
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(start + (target - start) * easeOut);
        
        element.textContent = current;
        element.removeAttribute('data-loading');

        if (progress < 1) {
          requestAnimationFrame(update);
        } else {
          element.textContent = target;
        }
      }

      requestAnimationFrame(update);
    }

    // Fetch statistics when DOM is ready (but don't animate yet)
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fetchStatistics);
    } else {
      fetchStatistics();
    }


    // ============================================
    // CHECK PROGRESS FUNCTIONALITY
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
          progressStatusDiv.innerHTML = '<span style="color: #d32f2f;">Silakan masukkan kode laporan terlebih dahulu.</span>';
          return;
        }
  
        if (kode.length < 3) {
          progressStatusDiv.innerHTML = '<span style="color: #d32f2f;">Kode laporan minimal 3 karakter.</span>';
          return;
        }
  
        // Disable button
        checkBtn.disabled = true;
  
        // Show loading
        const spinner = document.createElement('span');
        spinner.className = 'spinner';
        spinner.setAttribute('aria-hidden', 'true');
        spinner.style.cssText = 'display:inline-block;width:16px;height:16px;border:3px solid #ccc;border-top-color:#667eea;border-radius:50%;animation:spin 0.8s linear infinite;vertical-align:middle;margin-right:8px;';
        
        // Add minimal spin animation if not present in main CSS
        if (!document.getElementById('spinner-style')) {
            const style = document.createElement('style');
            style.id = 'spinner-style';
            style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
            document.head.appendChild(style);
        }

        const loadingText = document.createElement('span');
        loadingText.textContent = 'Memeriksa...';
        
        progressStatusDiv.appendChild(spinner);
        progressStatusDiv.appendChild(loadingText);
  
        const API_URL = '../api/check_progress.php';
        
        fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ query: kode })
        })
        .then(response => {
          if (!response.ok) {
            throw new Error('Terjadi masalah pada server.');
          }
          return response.json();
        })
        .then(data => {
          if (data.status === 'ditemukan') {
            // SUCCESS
            progressStatusDiv.innerHTML = '<span style="color: #2e7d32; font-weight:bold;"><i class="fas fa-check-circle"></i> Laporan ditemukan! Mengarahkan...</span>';
  
            // Redirect to monitoring page
            setTimeout(() => {
              window.location.href = `../Monitoring/monitoring.html?kode=${data.kode_laporan}`;
            }, 800);
  
          } else {
            // FAIL
            progressStatusDiv.innerHTML = `<span style="color: #ef6c00;"><i class="fas fa-exclamation-circle"></i> Kode atau email tidak ditemukan.</span>`;
            checkBtn.disabled = false;
  
            // Clear error after 3s
            setTimeout(() => {
              if (progressStatusDiv.innerHTML.includes('tidak ditemukan')) {
                   progressStatusDiv.innerHTML = '';
              }
            }, 3000);
          }
        })
        .catch(error => {
          // ERROR
          console.error('Error fetching:', error);
          progressStatusDiv.innerHTML = `<span style="color: #d32f2f;"><i class="fas fa-times-circle"></i> ${error.message || 'Gagal terhubung.'}</span>`;
          checkBtn.disabled = false;
        });
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
  
  })();

// ============================================
// KABAR SIGAP / WAWASAN CAROUSEL
// ============================================

// ============================================
// KABAR SIGAP / WAWASAN CAROUSEL
// ============================================

(function initKabarSigapCarousel() {
  const track = document.getElementById('kabarCarouselTrack');
  const pagination = document.getElementById('kabarPagination');
  const prevBtn = document.getElementById('kabarPrevBtn');
  const nextBtn = document.getElementById('kabarNextBtn');
  const wrapper = document.querySelector('.kabar-carousel-wrapper');
  
  if (!track || !pagination) return;
  
  // Articles Data
  const articlesData = [
    {
      title: 'Mengenali Tanda-Tanda Kekerasan di Lingkungan Kampus',
      category: 'Edukasi',
      desc: 'Pelajari bentuk-bentuk kekerasan yang mungkin terjadi di sekitar Anda untuk pencegahan dini.',
      image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80',
      link: '../Blog/artikel-1.html'
    },
    {
      title: 'Langkah-Langkah Melaporkan Insiden dengan Aman',
      category: 'Panduan',
      desc: 'Panduan lengkap cara melaporkan insiden dengan tetap menjaga kerahasiaan dan keamanan diri.',
      image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80',
      link: '../Blog/artikel-2.html'
    },
    {
      title: 'Dampak Psikologis Kekerasan dan Cara Mengatasinya',
      category: 'Kesehatan Mental',
      desc: 'Memahami trauma psikologis akibat kekerasan dan strategi pemulihan yang efektif.',
      image: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=800&q=80',
      link: '../Blog/artikel-3.html'
    },
    {
      title: 'Peran Mahasiswa dalam Menciptakan Kampus Aman',
      category: 'Komunitas',
      desc: 'Bagaimana mahasiswa dapat berkontribusi aktif dalam menciptakan lingkungan kampus yang aman.',
      image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80',
      link: '../Blog/artikel-4.html'
    },
    {
      title: 'Kekerasan Digital: Ancaman Nyata di Era Modern',
      category: 'Teknologi',
      desc: 'Waspadai bentuk kekerasan berbasis gender online (KBGO) dan cara melindunginya.',
      image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80',
      link: '../Blog/artikel-5.html'
    }
  ];
  
  let activeIndex = 0;
  let isAnimating = false;
  
  // Detect if mobile
  function isMobile() {
    return window.innerWidth <= 1024;
  }

  // Render cards for DESKTOP (stacked carousel)
  function renderDesktopCarousel() {
    track.innerHTML = '';
    pagination.innerHTML = '';
    
    for (let i = 0; i < articlesData.length; i++) {
      let relativeIndex = (i - activeIndex + articlesData.length) % articlesData.length;
      const article = articlesData[i];
      const cardEl = document.createElement('div');
      
      let stateClass = relativeIndex <= 3 ? `state-${relativeIndex}` : 'state-hidden';
      
      cardEl.className = `kabar-card ${stateClass}`;
      cardEl.style.backgroundImage = `url(${article.image})`;
      
      // All cards get gradient and info
      if (relativeIndex === 0) {
        cardEl.innerHTML = `
          <div class="kabar-card-gradient"></div>
          <div class="kabar-info-box">
            <div>
              <span class="kabar-card-category">${article.category}</span>
              <h3 class="kabar-info-title">${article.title}</h3>
              <p class="kabar-info-desc">${article.desc}</p>
            </div>
          </div>
          <div class="kabar-card-btn" onclick="window.location.href='${article.link}'">
            <svg viewBox="0 0 24 24">
              <path d="M9 18L15 12L9 6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            </svg>
          </div>
        `;
      } else {
        cardEl.innerHTML = `
          <div class="kabar-card-gradient"></div>
          <div class="kabar-card-info-mini">
            <span class="kabar-card-category-mini">${article.category}</span>
            <h4 class="kabar-card-title-mini">${article.title}</h4>
          </div>
        `;
        cardEl.style.cursor = 'pointer';
        cardEl.addEventListener('click', () => {
          if (!isAnimating) goToSlide(i);
        });
      }
      
      track.appendChild(cardEl);
    }
    
    // Render Dots
    articlesData.forEach((_, idx) => {
      const dot = document.createElement('button');
      dot.className = `kabar-dot ${idx === activeIndex ? 'active' : ''}`;
      dot.onclick = () => goToSlide(idx);
      pagination.appendChild(dot);
    });
  }

  // Render cards for MOBILE (horizontal scroll)
  function renderMobileCarousel() {
    track.innerHTML = '';
    pagination.innerHTML = '';
    
    articlesData.forEach((article, idx) => {
      const cardEl = document.createElement('div');
      cardEl.className = 'kabar-card mobile-card';
      cardEl.style.backgroundImage = `url(${article.image})`;
      cardEl.setAttribute('data-index', idx);
      
      cardEl.innerHTML = `
        <div class="kabar-card-gradient"></div>
        <div class="kabar-card-info-mini">
          <span class="kabar-card-category-mini">${article.category}</span>
          <h4 class="kabar-card-title-mini">${article.title}</h4>
        </div>
      `;
      
      // Click to open article
      cardEl.style.cursor = 'pointer';
      cardEl.addEventListener('click', () => {
        window.location.href = article.link;
      });
      
      track.appendChild(cardEl);
    });
    
    // Render Dots
    articlesData.forEach((_, idx) => {
      const dot = document.createElement('button');
      dot.className = `kabar-dot ${idx === 0 ? 'active' : ''}`;
      dot.onclick = () => scrollToCard(idx);
      pagination.appendChild(dot);
    });
    
    // Update dots on scroll
    if (wrapper) {
      wrapper.addEventListener('scroll', updateDotsOnScroll, { passive: true });
    }
  }
  
  // Scroll to specific card (mobile)
  function scrollToCard(idx) {
    if (!wrapper) return;
    const cards = track.querySelectorAll('.kabar-card');
    if (cards[idx]) {
      // Get the card's position relative to the track
      const card = cards[idx];
      const cardRect = card.getBoundingClientRect();
      const wrapperRect = wrapper.getBoundingClientRect();
      const currentScroll = wrapper.scrollLeft;
      
      // Calculate target scroll position to center the card
      const cardCenter = card.offsetLeft + (card.offsetWidth / 2);
      const wrapperCenter = wrapper.offsetWidth / 2;
      const targetScroll = cardCenter - wrapperCenter;
      
      wrapper.scrollTo({ 
        left: Math.max(0, targetScroll), 
        behavior: 'smooth' 
      });
    }
  }
  
  // Update dots based on scroll position
  function updateDotsOnScroll() {
    if (!wrapper) return;
    const cards = track.querySelectorAll('.kabar-card');
    const dots = pagination.querySelectorAll('.kabar-dot');
    const scrollLeft = wrapper.scrollLeft;
    const cardWidth = cards[0]?.offsetWidth || 280;
    const gap = 16;
    
    let currentIdx = Math.round(scrollLeft / (cardWidth + gap));
    currentIdx = Math.max(0, Math.min(currentIdx, articlesData.length - 1));
    
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === currentIdx);
    });
  }

  function renderCarousel() {
    if (isMobile()) {
      renderMobileCarousel();
    } else {
      renderDesktopCarousel();
    }
  }
  
  function goToSlide(index) {
    if (isAnimating || index === activeIndex) return;
    isAnimating = true;
    activeIndex = index;
    renderCarousel();
    setTimeout(() => { isAnimating = false; }, 600);
  }

  function nextSlide() {
    if (isMobile()) {
      const currentDot = pagination.querySelector('.kabar-dot.active');
      const dots = Array.from(pagination.querySelectorAll('.kabar-dot'));
      const currentIdx = dots.indexOf(currentDot);
      const nextIdx = (currentIdx + 1) % articlesData.length;
      scrollToCard(nextIdx);
    } else {
      if (isAnimating) return;
      isAnimating = true;
      activeIndex = (activeIndex + 1) % articlesData.length;
      renderCarousel();
      setTimeout(() => { isAnimating = false; }, 600);
    }
  }

  function prevSlide() {
    if (isMobile()) {
      const currentDot = pagination.querySelector('.kabar-dot.active');
      const dots = Array.from(pagination.querySelectorAll('.kabar-dot'));
      const currentIdx = dots.indexOf(currentDot);
      const prevIdx = (currentIdx - 1 + articlesData.length) % articlesData.length;
      scrollToCard(prevIdx);
    } else {
      if (isAnimating) return;
      isAnimating = true;
      activeIndex = (activeIndex - 1 + articlesData.length) % articlesData.length;
      renderCarousel();
      setTimeout(() => { isAnimating = false; }, 600);
    }
  }

  // Event Listeners
  if (prevBtn) prevBtn.addEventListener('click', prevSlide);
  if (nextBtn) nextBtn.addEventListener('click', nextSlide);

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    const section = document.getElementById('kabarSigap');
    if (!section) return;
    const rect = section.getBoundingClientRect();
    const isInView = rect.top < window.innerHeight && rect.bottom > 0;
    
    if (isInView) {
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
    }
  });

  // Re-render on resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      renderCarousel();
    }, 250);
  });

  // Initial render
  renderCarousel();

  // --- DRAG / SWIPE SUPPORT ---
  let startX = 0;
  let isDragging = false;
  let startTime = 0;

  function handleDragStart(e) {
    if (isAnimating) return;
    startX = e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
    isDragging = true;
    startTime = new Date().getTime();
    track.style.cursor = 'grabbing';
  }

  function handleDragMove(e) {
    if (!isDragging) return;
    e.preventDefault(); // Prevent scrolling while swiping
  }

  function handleDragEnd(e) {
    if (!isDragging) return;
    const endX = e.type.includes('mouse') ? e.pageX : e.changedTouches[0].clientX;
    const diffX = startX - endX;
    const timeElapsed = new Date().getTime() - startTime;
    
    // Threshold for swipe: 50px distance or fast swipe
    if (Math.abs(diffX) > 50 || (Math.abs(diffX) > 20 && timeElapsed < 300)) {
      if (diffX > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
    
    isDragging = false;
    track.style.cursor = 'grab';
  }

  // Mouse Events
  track.addEventListener('mousedown', handleDragStart);
  track.addEventListener('mousemove', handleDragMove);
  track.addEventListener('mouseup', handleDragEnd);
  track.addEventListener('mouseleave', () => {
    if (isDragging) {
      isDragging = false;
      track.style.cursor = 'grab';
    }
  });

  // Touch Events
  track.addEventListener('touchstart', handleDragStart, { passive: true });
  track.addEventListener('touchmove', handleDragMove, { passive: false });
  track.addEventListener('touchend', handleDragEnd);

  console.log('✅ Kabar Sigap Carousel Initialized with Swipe Support');
})();

