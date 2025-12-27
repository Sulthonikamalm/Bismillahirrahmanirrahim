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
