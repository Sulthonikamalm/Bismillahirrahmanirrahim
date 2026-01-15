/* ============================================
   LANDING PAGE SPECIFIC LOGIC
   ============================================ */

(function () {
    'use strict';
  
    // ============================================
    // ENVIRONMENT & DEBUG CONFIGURATION
    // Set to false for production deployment
    // ============================================
    const IS_DEBUG = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1';
    
    // Safe logger - only logs in development
    const logger = {
      log: (...args) => IS_DEBUG && console.log(...args),
      warn: (...args) => IS_DEBUG && console.warn(...args),
      error: (...args) => console.error(...args) // Always log errors
    };
    
    logger.log('âœ… Landing Page JS Loaded');

    // ============================================
    // CENTRALIZED CONFIGURATION
    // All constants, API endpoints, and settings
    // ============================================
    
    const CONFIG = {
      // API Endpoints
      API: {
        BASE_PATH: '../api',
        ENDPOINTS: {
          STATISTICS: '/public/get_statistics.php',
          CHECK_PROGRESS: '/monitoring/check_progress.php'
        },
        getUrl: function(endpoint) {
          return this.BASE_PATH + this.ENDPOINTS[endpoint];
        }
      },
      
      // Animation Settings
      ANIMATION: {
        SCROLL_THRESHOLD: 0.2,
        SCROLL_ROOT_MARGIN: '0px 0px -50px 0px',
        COUNTER_DURATION: 1500,
        REDIRECT_DELAY: 800,
        ERROR_CLEAR_DELAY: 3000,
        STATS_OBSERVER_THRESHOLD: 0.3
      },
      
      // Timeline Drawing
      TIMELINE: {
        VIEWPORT_CENTER_RATIO: 0.6,
        MAX_HEIGHT_OFFSET: 100
      },
      
      // Input Validation
      VALIDATION: {
        MIN_KODE_LENGTH: 3
      },
      
      // YouTube Video
      VIDEO: {
        ID: 'HJX38VEPzrM',
        THUMBNAIL_QUALITY: 'maxresdefault', // Options: default, mqdefault, hqdefault, sddefault, maxresdefault
        getEmbedUrl: function() {
          return `https://www.youtube.com/embed/${this.ID}?enablejsapi=1&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&fs=0&playsinline=1&autoplay=1`;
        },
        getThumbnailUrl: function() {
          return `https://img.youtube.com/vi/${this.ID}/${this.THUMBNAIL_QUALITY}.jpg`;
        }
      },
      
      // CSS Classes
      CLASSES: {
        IN_VIEW: 'in-view',
        HIDDEN: 'hidden',
        ACTIVE: 'active',
        PLAYING: 'playing'
      },
      
      // Colors for status messages
      COLORS: {
        ERROR: '#d32f2f',
        WARNING: '#ef6c00',
        SUCCESS: '#2e7d32'
      }
    };

    // ============================================
    // UTILITY FUNCTIONS (Safe DOM Operations)
    // ============================================
    
    /**
     * Safely creates and returns a status message element
     * @param {string} message - Text content (safe, not HTML)
     * @param {string} type - 'error' | 'warning' | 'success'
     * @param {string} [iconClass] - Optional FontAwesome icon class
     * @returns {HTMLElement} - Safe span element
     */
    function createStatusMessage(message, type, iconClass) {
      const span = document.createElement('span');
      span.style.fontWeight = type === 'success' ? 'bold' : 'normal';
      
      switch(type) {
        case 'error':
          span.style.color = CONFIG.COLORS.ERROR;
          break;
        case 'warning':
          span.style.color = CONFIG.COLORS.WARNING;
          break;
        case 'success':
          span.style.color = CONFIG.COLORS.SUCCESS;
          break;
        default:
          span.style.color = 'inherit';
      }
      
      // Add icon if provided (using DOM, not innerHTML)
      if (iconClass) {
        const icon = document.createElement('i');
        icon.className = iconClass;
        icon.style.marginRight = '6px';
        icon.setAttribute('aria-hidden', 'true');
        span.appendChild(icon);
      }
      
      // Add text content safely (no XSS risk)
      const textNode = document.createTextNode(message);
      span.appendChild(textNode);
      
      return span;
    }
    
    /**
     * Safely clears an element's children
     * @param {HTMLElement} element - Element to clear
     */
    function clearElement(element) {
      while (element.firstChild) {
        element.removeChild(element.firstChild);
      }
    }
    
    /**
     * Creates a loading spinner element
     * @returns {HTMLElement} - Spinner element
     */
    function createSpinner() {
      const spinner = document.createElement('span');
      spinner.className = 'spinner';
      spinner.setAttribute('aria-hidden', 'true');
      spinner.style.cssText = 'display:inline-block;width:16px;height:16px;border:3px solid #ccc;border-top-color:#667eea;border-radius:50%;animation:spin 0.8s linear infinite;vertical-align:middle;margin-right:8px;';
      
      // Ensure spin animation exists
      if (!document.getElementById('spinner-style')) {
        const style = document.createElement('style');
        style.id = 'spinner-style';
        style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
        document.head.appendChild(style);
      }
      
      return spinner;
    }

    // ============================================
    // INPUT SANITIZATION UTILITIES
    // ============================================
    
    /**
     * Sanitize user input - Remove dangerous characters
     * Allow only: A-Z, 0-9, hyphen, underscore
     * @param {string} input - Raw user input
     * @returns {string} - Sanitized safe input
     */
    function sanitizeInput(input) {
      if (typeof input !== 'string') return '';
      
      // Remove all characters except alphanumeric, hyphen, underscore
      // Pattern: Keep only A-Z, a-z, 0-9, -, _
      const sanitized = input.replace(/[^A-Za-z0-9\-_]/g, '');
      
      // Limit length to prevent DoS
      const maxLength = 50;
      return sanitized.substring(0, maxLength);
    }
    
    /**
     * Validate kode format
     * @param {string} kode - Sanitized kode
     * @returns {boolean} - Is valid format
     */
    function isValidKodeFormat(kode) {
      // Kode must be 3-20 characters, alphanumeric only
      const pattern = /^[A-Z0-9\-_]{3,20}$/;
      return pattern.test(kode);
    }

    // ============================================
    // STABILO/HIGHLIGHTER ANIMATION ON SCROLL
    // ============================================
    
    function initScrollAnimations() {
      // Elements to animate: highlight texts + stat cards + proses section elements
      const highlightElements = document.querySelectorAll('.highlight-animate');
      const statCards = document.querySelectorAll('.transparansi-stat-box');
      const prosesElements = document.querySelectorAll('.proses-oleh-animate, .proses-description-animate');
      
      // Monitoring section reveal elements
      const revealFade = document.querySelectorAll('.reveal-fade');
      const revealSlideLeft = document.querySelectorAll('.reveal-slide-left');
      const revealSlideRight = document.querySelectorAll('.reveal-slide-right');
      
      // Combine elements (roadmap is now handled by initContinuousLineDrawing)
      const allElements = [...highlightElements, ...statCards, ...prosesElements, ...revealFade, ...revealSlideLeft, ...revealSlideRight];
      
      if (allElements.length === 0) return;
      
      // Observer for regular elements (individual trigger)
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add(CONFIG.CLASSES.IN_VIEW);
            observer.unobserve(entry.target);
          }
        });
      }, {
        threshold: CONFIG.ANIMATION.SCROLL_THRESHOLD,
        rootMargin: CONFIG.ANIMATION.SCROLL_ROOT_MARGIN
      });
      
      allElements.forEach(el => observer.observe(el));
      
      logger.log('✅ Scroll animations initialized:', allElements.length, 'elements');
    }
    
    // ============================================
    // CONTINUOUS LINE DRAWING ON SCROLL
    // Line follows scroll position precisely
    // Cards appear when line reaches their bullet point
    // ============================================
    
    function initContinuousLineDrawing() {
      const drawingLine = document.querySelector('.timeline-drawing-line');
      const timeline = document.querySelector('.process-timeline');
      const processSteps = document.querySelectorAll('.process-step');
      
      if (!drawingLine || !timeline) return;
      
      // Track which steps have been revealed
      const revealedSteps = new Set();
      
      function updateLineAndCards() {
        const timelineRect = timeline.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const viewportCenter = windowHeight * CONFIG.TIMELINE.VIEWPORT_CENTER_RATIO;
        
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
        const maxLineHeight = timelineHeight - CONFIG.TIMELINE.MAX_HEIGHT_OFFSET;
        let lineHeight = distanceIntoTimeline;
        
        // Clamp to max height
        lineHeight = Math.min(lineHeight, maxLineHeight);
        lineHeight = Math.max(0, lineHeight);
        
        drawingLine.style.height = `${lineHeight}px`;
        
        // ============================================
        // CARD REVEAL: Show card when line reaches bullet
        // ============================================
        
        processSteps.forEach((step, index) => {
          // Skip if already revealed
          if (revealedSteps.has(index)) return;
          
          // Get the step-number (bullet point) position
          const stepNumber = step.querySelector('.step-number');
          if (!stepNumber) return;
          
          const stepRect = stepNumber.getBoundingClientRect();
          const timelineTopAbsolute = timeline.getBoundingClientRect().top;
          
          // Calculate bullet position relative to timeline top
          const bulletCenterY = stepRect.top + (stepRect.height / 2);
          const bulletPositionInTimeline = bulletCenterY - timelineTopAbsolute;
          
          // Check if line has reached this bullet point
          // Add small offset (20px) so card appears slightly before line touches center
          if (lineHeight >= bulletPositionInTimeline - 20) {
            // Reveal this step
            step.classList.add(CONFIG.CLASSES.IN_VIEW);
            revealedSteps.add(index);
            
            logger.log(`✅ Step ${index + 1} revealed (line reached bullet)`);
          }
        });
      }
      
      // Update on scroll with requestAnimationFrame for smooth performance
      let ticking = false;
      function onScroll() {
        if (!ticking) {
          requestAnimationFrame(() => {
            updateLineAndCards();
            ticking = false;
          });
          ticking = true;
        }
      }
      
      // Listen to scroll
      window.addEventListener('scroll', onScroll, { passive: true });
      
      // Initial update
      updateLineAndCards();
      
      logger.log('✅ Continuous line drawing initialized with card sync');
    }
    
    // ============================================
    // VIDEO PLAYER CONTROL - Lazy Loading Facade
    // YouTube iframe only loads when user clicks play
    // ============================================
    
    function initVideoPlayer() {
      const playBtn = document.getElementById('videoPlayBtn');
      const playIcon = document.getElementById('playIconTriangle');
      const pauseIcon = document.getElementById('pauseIconBars');
      const videoContainer = document.querySelector('.video-inner-container');
      const coverOverlay = document.getElementById('videoCoverOverlay');
      
      // Check for essential elements
      if (!playBtn || !videoContainer) {
        console.warn('âš ï¸ Video player elements not found');
        return;
      }
      
      let player = null;
      let isPlaying = false;
      let iframeLoaded = false; // Track if iframe has been lazy loaded
      let apiReady = false; // Track if YouTube API is ready
      
      // ============================================
      // LAZY LOADING: Don't load iframe immediately
      // Instead, show a thumbnail as placeholder
      // ============================================
      
      /**
       * Initialize the video container with a thumbnail placeholder
       * No iframe is loaded until user interaction
       */
      function initThumbnailPlaceholder() {
        // Check if iframe already exists (for backwards compatibility)
        const existingIframe = document.getElementById('ppkptVideo');
        
        if (existingIframe) {
          // Remove the pre-existing iframe to enable lazy loading
          // This converts existing implementation to lazy loading
          existingIframe.remove();
          logger.log('âœ… Removed pre-loaded iframe for lazy loading optimization');
        }
        
        // Create thumbnail background using CONFIG
        videoContainer.style.backgroundImage = `url("${CONFIG.VIDEO.getThumbnailUrl()}")`;
        videoContainer.style.backgroundSize = 'cover';
        videoContainer.style.backgroundPosition = 'center';
        videoContainer.style.backgroundColor = '#000';
      }
      
      /**
       * Load the YouTube IFrame API only when needed
       * @returns {Promise} Resolves when API is ready
       */
      function loadYouTubeAPI() {
        return new Promise((resolve, reject) => {
          // If already loaded
          if (window.YT && window.YT.Player) {
            apiReady = true;
            resolve();
            return;
          }
          
          // Check if script already loading
          if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
            // Wait for it to load
            const checkInterval = setInterval(() => {
              if (window.YT && window.YT.Player) {
                apiReady = true;
                clearInterval(checkInterval);
                resolve();
              }
            }, 100);
            
            // Timeout after 10 seconds
            setTimeout(() => {
              clearInterval(checkInterval);
              if (!apiReady) {
                reject(new Error('YouTube API load timeout'));
              }
            }, 10000);
            return;
          }
          
          // Load the API
          const tag = document.createElement('script');
          tag.src = 'https://www.youtube.com/iframe_api';
          tag.onerror = () => reject(new Error('Failed to load YouTube API'));
          
          // Store original callback if exists
          const originalCallback = window.onYouTubeIframeAPIReady;
          
          window.onYouTubeIframeAPIReady = function() {
            apiReady = true;
            if (originalCallback) originalCallback();
            resolve();
          };
          
          document.head.appendChild(tag);
        });
      }
      
      /**
       * Create and insert the YouTube iframe (only on first play)
       */
      function createIframe() {
        if (iframeLoaded) return;
        
        const iframe = document.createElement('iframe');
        iframe.id = 'ppkptVideo';
        iframe.src = CONFIG.VIDEO.getEmbedUrl();
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullscreen = true;
        iframe.style.cssText = 'position:absolute;top:-12%;left:-12%;width:124%;height:124%;border:none;pointer-events:none;';
        
        // Clear thumbnail and add iframe
        videoContainer.style.backgroundImage = '';
        videoContainer.appendChild(iframe);
        iframeLoaded = true;
        
        logger.log('âœ… YouTube iframe lazy loaded on user interaction');
      }
      
      /**
       * Initialize YouTube player after iframe is created and API is ready
       */
      function initializePlayer() {
        return new Promise((resolve) => {
          // Wait a bit for iframe to be ready
          setTimeout(() => {
            player = new YT.Player('ppkptVideo', {
              events: {
                'onReady': () => {
                  logger.log('âœ… YouTube player ready');
                  resolve();
                },
                'onStateChange': onPlayerStateChange
              }
            });
          }, 100);
        });
      }
      
      function onPlayerStateChange(event) {
        if (event.data === YT.PlayerState.PLAYING) {
          isPlaying = true;
          updateUI();
        } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
          isPlaying = false;
          updateUI();
        }
      }
      
      function updateUI() {
        if (isPlaying) {
          // Video playing - hide cover, show pause icon
          if (playIcon) playIcon.classList.add(CONFIG.CLASSES.HIDDEN);
          if (pauseIcon) pauseIcon.classList.add(CONFIG.CLASSES.ACTIVE);
          if (videoContainer) videoContainer.classList.add(CONFIG.CLASSES.PLAYING);
          if (coverOverlay) coverOverlay.classList.add(CONFIG.CLASSES.HIDDEN);
        } else {
          // Video paused - show play icon
          if (playIcon) playIcon.classList.remove(CONFIG.CLASSES.HIDDEN);
          if (pauseIcon) pauseIcon.classList.remove(CONFIG.CLASSES.ACTIVE);
          if (videoContainer) videoContainer.classList.remove(CONFIG.CLASSES.PLAYING);
          // Cover stays hidden after first play
        }
      }
      
      /**
       * Main play function - handles lazy loading
       */
      async function playVideo() {
        try {
          // First time: load everything
          if (!iframeLoaded) {
            // Show loading state on overlay
            if (coverOverlay) {
              const content = coverOverlay.querySelector('.video-cover-content span');
              if (content) content.textContent = 'Memuat video...';
            }
            
            // Load API and create iframe in parallel
            await loadYouTubeAPI();
            createIframe();
            await initializePlayer();
          }
          
          // Now play
          if (player && player.playVideo) {
            player.playVideo();
          }
        } catch (error) {
          console.error('âŒ Failed to play video:', error);
          // Show error state
          if (coverOverlay) {
            const content = coverOverlay.querySelector('.video-cover-content span');
            if (content) content.textContent = 'Gagal memuat video';
          }
        }
      }
      
      function pauseVideo() {
        if (player && player.pauseVideo) {
          player.pauseVideo();
        }
      }
      
      // Event: Play button click
      playBtn.addEventListener('click', function() {
        if (isPlaying) {
          pauseVideo();
        } else {
          playVideo();
        }
      });
      
      // Event: Cover overlay click - start video
      if (coverOverlay) {
        coverOverlay.addEventListener('click', function() {
          playVideo();
        });
      }
      
      // Initialize with thumbnail placeholder (no iframe loaded yet)
      initThumbnailPlaceholder();
      
      // ============================================
      // PRELOAD OPTIMIZATION: Load YouTube API early
      // This reduces delay when user clicks play
      // ============================================
      
      // Preload API when browser is idle (doesn't block main thread)
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          loadYouTubeAPI().then(() => {
            logger.log('âœ… YouTube API preloaded during idle time');
          }).catch(() => {
            // Silent fail - will retry when user clicks play
          });
        }, { timeout: 3000 });
      } else {
        // Fallback: preload after 2 seconds
        setTimeout(() => {
          loadYouTubeAPI().catch(() => {});
        }, 2000);
      }
      
      // Also preload on hover/touch of video section
      const videoSection = document.querySelector('.video-card-section');
      if (videoSection) {
        let hoverPreloaded = false;
        videoSection.addEventListener('mouseenter', () => {
          if (!hoverPreloaded && !apiReady) {
            hoverPreloaded = true;
            loadYouTubeAPI().catch(() => {});
          }
        }, { once: true });
      }
      logger.log('âœ… Video player initialized with lazy loading (iframe deferred until play)');
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
      const API_URL = CONFIG.API.getUrl('STATISTICS');
      
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
          logger.log('âœ… Statistics fetched (waiting for scroll):', result.data);
          
          // Setup observer to animate when in view
          setupCounterObserver();
        } else {
          console.warn('Statistics API returned unexpected format:', result);
        }

      } catch (error) {
        console.error('âŒ Failed to fetch statistics:', error);
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
              animateCounter(totalCasesEl, statisticsData.total_cases || 0);
            }
            if (casesCompletedEl) {
              animateCounter(casesCompletedEl, statisticsData.cases_completed || 0);
            }
            
            logger.log('âœ… Counter animation started (in view)');
            observer.unobserve(entry.target);
          }
        });
      }, {
        threshold: CONFIG.ANIMATION.STATS_OBSERVER_THRESHOLD
      });

      observer.observe(statsGrid);
    }

    // Animated counter effect
    function animateCounter(element, target) {
      const duration = CONFIG.ANIMATION.COUNTER_DURATION;
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
        // ========== STEP 1: GET RAW INPUT ==========
        const rawInput = kodeInput.value.trim();
        clearElement(progressStatusDiv);
  
        // ========== STEP 2: BASIC VALIDATION ==========
        if (rawInput === '') {
          const errorMsg = createStatusMessage(
            'Silakan masukkan kode laporan terlebih dahulu.', 
            'error'
          );
          progressStatusDiv.appendChild(errorMsg);
          return;
        }
  
        // ========== STEP 3: SANITIZE INPUT âœ… ==========
        const sanitizedKode = sanitizeInput(rawInput.toUpperCase());
        
        // Check if sanitization removed characters (suspicious input)
        if (sanitizedKode !== rawInput.toUpperCase().replace(/\s/g, '')) {
          const errorMsg = createStatusMessage(
            'Kode laporan hanya boleh berisi huruf, angka, dan tanda hubung.', 
            'error'
          );
          progressStatusDiv.appendChild(errorMsg);
          return;
        }
  
        // ========== STEP 4: FORMAT VALIDATION âœ… ==========
        if (!isValidKodeFormat(sanitizedKode)) {
          const errorMsg = createStatusMessage(
            'Format kode laporan tidak valid. Gunakan 3-20 karakter (huruf/angka).', 
            'error'
          );
          progressStatusDiv.appendChild(errorMsg);
          return;
        }
  
        // ========== STEP 5: LENGTH VALIDATION ==========
        if (sanitizedKode.length < CONFIG.VALIDATION.MIN_KODE_LENGTH) {
          const errorMsg = createStatusMessage(
            `Kode laporan minimal ${CONFIG.VALIDATION.MIN_KODE_LENGTH} karakter.`, 
            'error'
          );
          progressStatusDiv.appendChild(errorMsg);
          return;
        }
  
        // Disable button
        checkBtn.disabled = true;
  
        // Show loading using utility function
        const spinner = createSpinner();
        const loadingText = document.createElement('span');
        loadingText.textContent = 'Memeriksa...';
        
        progressStatusDiv.appendChild(spinner);
        progressStatusDiv.appendChild(loadingText);
  
        // Use CONFIG for API URL
        const API_URL = CONFIG.API.getUrl('CHECK_PROGRESS');
        
        // ========== STEP 6: SEND SANITIZED INPUT âœ… ==========
        fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          // âœ… NOW SENDING SANITIZED INPUT
          body: JSON.stringify({ query: sanitizedKode })
        })
        .then(response => {
          if (!response.ok) {
            throw new Error('Terjadi masalah pada server.');
          }
          return response.json();
        })
        .then(data => {
          // Clear previous content safely
          clearElement(progressStatusDiv);
          
          if (data.status === 'ditemukan') {
            // SUCCESS - Using safe DOM methods
            const successMsg = createStatusMessage(
              'Laporan ditemukan! Mengarahkan...', 
              'success', 
              'fas fa-check-circle'
            );
            progressStatusDiv.appendChild(successMsg);
  
            // ========== STEP 7: SANITIZE REDIRECT URL âœ… ==========
            // Double-encode for extra safety
            const safeKode = encodeURIComponent(
              sanitizeInput(data.kode_laporan || '')
            );
            
            setTimeout(() => {
              window.location.href = `../Monitoring/monitoring.html?kode=${safeKode}`;
            }, CONFIG.ANIMATION.REDIRECT_DELAY);
  
          } else {
            // FAIL - Using safe DOM methods
            const warningMsg = createStatusMessage(
              'Kode atau email tidak ditemukan.', 
              'warning', 
              'fas fa-exclamation-circle'
            );
            progressStatusDiv.appendChild(warningMsg);
            checkBtn.disabled = false;
  
            // Clear error after delay using CONFIG
            setTimeout(() => {
              // Check if still showing the warning message
              if (progressStatusDiv.textContent.includes('tidak ditemukan')) {
                clearElement(progressStatusDiv);
              }
            }, CONFIG.ANIMATION.ERROR_CLEAR_DELAY);
          }
        })
        .catch(error => {
          // ========== STEP 8: SAFE ERROR HANDLING âœ… ==========
          console.error('Error fetching:', error);
          clearElement(progressStatusDiv);
          
          // âœ… DON'T show error.message directly (could be malicious)
          // Use predefined safe message
          const errorMsg = createStatusMessage(
            'Gagal terhubung ke server. Silakan coba lagi.', 
            'error', 
            'fas fa-times-circle'
          );
          progressStatusDiv.appendChild(errorMsg);
          checkBtn.disabled = false;
        });
      });
      
      // Auto-uppercase input + live sanitization
      kodeInput.addEventListener('input', function() {
        // Get current value
        let value = kodeInput.value.toUpperCase();
        
        // âœ… Live sanitization - remove invalid chars as user types
        value = value.replace(/[^A-Z0-9\-_]/g, '');
        
        // Update input value
        kodeInput.value = value;
        
        // Visual feedback for valid format
        if (value.length >= 3 && isValidKodeFormat(value)) {
          kodeInput.style.borderColor = '#4ade80'; // Green
        } else if (value.length > 0) {
          kodeInput.style.borderColor = '#ef4444'; // Red
        } else {
          kodeInput.style.borderColor = '#e5e7eb'; // Default
        }
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
  let cardsInitialized = false; // Track if cards are already in DOM
  
  // Detect if mobile
  function isMobile() {
    return window.innerWidth <= 1024;
  }

  // ============================================
  // DESKTOP CAROUSEL - Smooth CSS Transitions
  // Cards are created once, only classes update
  // ============================================
  
  /**
   * Initialize desktop cards once (called on first load)
   */
  function initDesktopCards() {
    track.innerHTML = '';
    
    articlesData.forEach((article, i) => {
      const cardEl = document.createElement('div');
      cardEl.className = 'kabar-card';
      cardEl.setAttribute('data-index', i);
      cardEl.style.backgroundImage = `url(${article.image})`;
      
      // Add gradient overlay
      const gradient = document.createElement('div');
      gradient.className = 'kabar-card-gradient';
      cardEl.appendChild(gradient);
      
      // Add info box (for active card)
      const infoBox = document.createElement('div');
      infoBox.className = 'kabar-info-box';
      infoBox.innerHTML = `
        <div>
          <span class="kabar-card-category">${article.category}</span>
          <h3 class="kabar-info-title">${article.title}</h3>
          <p class="kabar-info-desc">${article.desc}</p>
        </div>
      `;
      cardEl.appendChild(infoBox);
      
      // Add mini info (for non-active cards)
      const miniInfo = document.createElement('div');
      miniInfo.className = 'kabar-card-info-mini';
      miniInfo.innerHTML = `
        <span class="kabar-card-category-mini">${article.category}</span>
        <h4 class="kabar-card-title-mini">${article.title}</h4>
      `;
      cardEl.appendChild(miniInfo);
      
      // Add button
      const btn = document.createElement('div');
      btn.className = 'kabar-card-btn';
      btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M9 18L15 12L9 6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.location.href = article.link;
      });
      cardEl.appendChild(btn);
      
      // Click on non-active cards to navigate (only if not swiping)
      let cardClickStart = 0;
      cardEl.addEventListener('mousedown', () => {
        cardClickStart = Date.now();
      });
      cardEl.addEventListener('click', (e) => {
        // Ignore if it was a swipe (mouse held > 200ms or moved)
        const clickDuration = Date.now() - cardClickStart;
        if (clickDuration > 200) return;
        
        const cardIndex = parseInt(cardEl.getAttribute('data-index'));
        if (cardIndex !== activeIndex && !isAnimating) {
          goToSlide(cardIndex);
        }
      });
      
      track.appendChild(cardEl);
    });
    
    cardsInitialized = true;
  }
  
  /**
   * Update card states - Only 3 cards visible at a time
   * Cards entering/exiting are instant (no animation)
   */
  function updateDesktopCardStates() {
    const cards = track.querySelectorAll('.kabar-card');
    
    cards.forEach((card) => {
      const cardIndex = parseInt(card.getAttribute('data-index'));
      const relativeIndex = (cardIndex - activeIndex + articlesData.length) % articlesData.length;
      
      // Check if card is currently visible (has transition)
      const isCurrentlyVisible = card.classList.contains('state-0') || 
                                  card.classList.contains('state-1') || 
                                  card.classList.contains('state-2');
      
      // Check if card will be visible
      const willBeVisible = relativeIndex <= 2;
      
      // If card is entering or exiting visibility, disable transition temporarily
      if (isCurrentlyVisible !== willBeVisible) {
        card.style.transition = 'none';
        // Force reflow
        card.offsetHeight;
      }
      
      // Remove all state classes
      card.classList.remove('state-0', 'state-1', 'state-2', 'state-hidden');
      
      // Add appropriate state class
      if (relativeIndex === 0) {
        card.classList.add('state-0');
      } else if (relativeIndex === 1) {
        card.classList.add('state-1');
      } else if (relativeIndex === 2) {
        card.classList.add('state-2');
      } else {
        card.classList.add('state-hidden');
      }
      
      // Re-enable transition after a frame (only for visible cards)
      if (willBeVisible) {
        requestAnimationFrame(() => {
          card.style.transition = '';
        });
      }
      
      // Update cursor for non-active cards
      card.style.cursor = relativeIndex === 0 ? 'default' : 'pointer';
    });
    
    // Update pagination dots
    updatePaginationDots();
  }
  
  /**
   * Update pagination dots to reflect current active index
   */
  function updatePaginationDots() {
    const dots = pagination.querySelectorAll('.kabar-dot');
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === activeIndex);
    });
  }
  
  /**
   * Initialize pagination dots (called once)
   */
  function initPaginationDots() {
    pagination.innerHTML = '';
    
    articlesData.forEach((_, idx) => {
      const dot = document.createElement('button');
      dot.className = `kabar-dot ${idx === activeIndex ? 'active' : ''}`;
      dot.setAttribute('aria-label', `Go to slide ${idx + 1}`);
      dot.addEventListener('click', () => goToSlide(idx));
      pagination.appendChild(dot);
    });
  }

  // Render cards for DESKTOP (stacked carousel)
  function renderDesktopCarousel() {
    // Only initialize cards once
    if (!cardsInitialized || track.children.length === 0) {
      initDesktopCards();
      initPaginationDots();
    }
    
    // Always update states (this is what enables smooth CSS transitions)
    updateDesktopCardStates();
  }

  // Render cards for MOBILE (horizontal scroll)
  let mobileCurrentIndex = 0; // Track current mobile index
  let mobileScrollListenerAdded = false; // Prevent duplicate listeners
  
  function renderMobileCarousel() {
    track.innerHTML = '';
    pagination.innerHTML = '';
    mobileCurrentIndex = 0; // Reset to first card
    
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
      dot.className = `kabar-dot ${idx === mobileCurrentIndex ? 'active' : ''}`;
      dot.setAttribute('aria-label', `Slide ${idx + 1}`);
      dot.addEventListener('click', () => scrollToCard(idx));
      pagination.appendChild(dot);
    });
    
    // Add scroll listener once
    if (wrapper && !mobileScrollListenerAdded) {
      wrapper.addEventListener('scroll', updateDotsOnScroll, { passive: true });
      mobileScrollListenerAdded = true;
    }
  }
  
  // Scroll to specific card (mobile) - FIXED
  function scrollToCard(idx) {
    if (!wrapper) return;
    const cards = track.querySelectorAll('.kabar-card');
    if (!cards[idx]) return;
    
    const card = cards[idx];
    
    // Calculate target scroll position to center the card
    const cardCenter = card.offsetLeft + (card.offsetWidth / 2);
    const wrapperCenter = wrapper.offsetWidth / 2;
    const targetScroll = cardCenter - wrapperCenter;
    
    // Update current index immediately
    mobileCurrentIndex = idx;
    
    // Update dots immediately (don't wait for scroll event)
    updateDots(idx);
    
    wrapper.scrollTo({ 
      left: Math.max(0, targetScroll), 
      behavior: 'smooth' 
    });
  }
  
  // Update dots visual state
  function updateDots(activeIdx) {
    const dots = pagination.querySelectorAll('.kabar-dot');
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === activeIdx);
    });
  }
  
  // Update dots based on scroll position
  function updateDotsOnScroll() {
    if (!wrapper || !isMobile()) return;
    
    const cards = track.querySelectorAll('.kabar-card');
    if (cards.length === 0) return;
    
    const scrollLeft = wrapper.scrollLeft;
    const wrapperCenter = wrapper.offsetWidth / 2;
    
    // Find which card is closest to center
    let closestIdx = 0;
    let closestDist = Infinity;
    
    cards.forEach((card, idx) => {
      const cardCenter = card.offsetLeft + (card.offsetWidth / 2);
      const dist = Math.abs((cardCenter - scrollLeft) - wrapperCenter);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = idx;
      }
    });
    
    if (closestIdx !== mobileCurrentIndex) {
      mobileCurrentIndex = closestIdx;
      updateDots(closestIdx);
    }
  }

  function renderCarousel() {
    if (isMobile()) {
      mobileScrollListenerAdded = false; // Reset for fresh listener
      renderMobileCarousel();
    } else {
      renderDesktopCarousel();
    }
  }
  
  function goToSlide(index) {
    if (isAnimating || index === activeIndex) return;
    isAnimating = true;
    activeIndex = index;
    
    if (isMobile()) {
      scrollToCard(index);
      setTimeout(() => { isAnimating = false; }, 400);
    } else {
      updateDesktopCardStates();
      setTimeout(() => { isAnimating = false; }, 650);
    }
  }

  function nextSlide() {
    if (isMobile()) {
      const nextIdx = (mobileCurrentIndex + 1) % articlesData.length;
      scrollToCard(nextIdx);
    } else {
      if (isAnimating) return;
      isAnimating = true;
      activeIndex = (activeIndex + 1) % articlesData.length;
      updateDesktopCardStates();
      setTimeout(() => { isAnimating = false; }, 650);
    }
  }

  function prevSlide() {
    if (isMobile()) {
      const prevIdx = (mobileCurrentIndex - 1 + articlesData.length) % articlesData.length;
      scrollToCard(prevIdx);
    } else {
      if (isAnimating) return;
      isAnimating = true;
      activeIndex = (activeIndex - 1 + articlesData.length) % articlesData.length;
      updateDesktopCardStates();
      setTimeout(() => { isAnimating = false; }, 650);
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

  // Re-render on resize (reset flags when switching modes)
  let resizeTimer;
  let wasMobile = isMobile();
  
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const nowMobile = isMobile();
      // Reset cards if switching between mobile and desktop
      if (nowMobile !== wasMobile) {
        cardsInitialized = false;
        wasMobile = nowMobile;
      }
      renderCarousel();
    }, 250);
  });

  // Initial render
  renderCarousel();

  // --- SWIPE GESTURE SUPPORT ---
  // Geser jari/mouse di card area untuk pindah slide
  // Swipe kiri → next, Swipe kanan → prev
  
  let touchStartX = 0;
  let touchStartY = 0;
  let isSwiping = false;
  let mouseDown = false;
  
  function handleSwipeStart(e) {
    if (isAnimating) return;
    isSwiping = true;
    
    if (e.touches) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    } else {
      touchStartX = e.clientX;
      touchStartY = e.clientY;
    }
  }
  
  function handleSwipeMove(e) {
    if (!isSwiping) return;
    
    let currentX, currentY;
    if (e.touches) {
      currentX = e.touches[0].clientX;
      currentY = e.touches[0].clientY;
    } else {
      currentX = e.clientX;
      currentY = e.clientY;
    }
    
    const diffX = Math.abs(touchStartX - currentX);
    const diffY = Math.abs(touchStartY - currentY);
    
    // Jika geser horizontal lebih dominan, prevent scroll vertikal
    if (diffX > diffY && diffX > 15) {
      if (e.cancelable) e.preventDefault();
    }
  }
  
  function handleSwipeEnd(e) {
    if (!isSwiping) return;
    isSwiping = false;
    
    let endX;
    if (e.changedTouches) {
      endX = e.changedTouches[0].clientX;
    } else {
      endX = e.clientX;
    }
    
    const swipeDistance = touchStartX - endX;
    const minSwipe = 50; // Minimum 50px untuk trigger
    
    if (Math.abs(swipeDistance) >= minSwipe) {
      if (swipeDistance > 0) {
        nextSlide(); // Geser KIRI → Next
      } else {
        prevSlide(); // Geser KANAN → Prev
      }
    }
  }
  
  function handleMouseDown(e) {
    // Ignore jika klik pada button
    if (e.target.closest('.kabar-card-btn')) return;
    
    mouseDown = true;
    handleSwipeStart(e);
    e.preventDefault(); // Prevent text selection
  }
  
  function handleMouseMove(e) {
    if (mouseDown) handleSwipeMove(e);
  }
  
  function handleMouseUp(e) {
    if (mouseDown) {
      mouseDown = false;
      handleSwipeEnd(e);
    }
  }
  
  // Touch events (HP/Tablet) - pada wrapper
  if (wrapper) {
    wrapper.addEventListener('touchstart', handleSwipeStart, { passive: true });
    wrapper.addEventListener('touchmove', handleSwipeMove, { passive: false });
    wrapper.addEventListener('touchend', handleSwipeEnd);
  }
  
  // Touch events pada track juga
  track.addEventListener('touchstart', handleSwipeStart, { passive: true });
  track.addEventListener('touchmove', handleSwipeMove, { passive: false });
  track.addEventListener('touchend', handleSwipeEnd);
  
  // Mouse events (Desktop) - pada wrapper dan track
  if (wrapper) {
    wrapper.addEventListener('mousedown', handleMouseDown);
  }
  track.addEventListener('mousedown', handleMouseDown);
  
  // Mouse move dan up pada document untuk tracking yang lebih baik
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  
  // Juga attach ke setiap card yang ada (untuk desktop)
  function attachSwipeToCards() {
    const cards = track.querySelectorAll('.kabar-card');
    cards.forEach(card => {
      // Remove existing listeners first (prevent duplicates)
      card.removeEventListener('mousedown', handleMouseDown);
      card.removeEventListener('touchstart', handleSwipeStart);
      
      // Add listeners
      card.addEventListener('mousedown', handleMouseDown);
      card.addEventListener('touchstart', handleSwipeStart, { passive: true });
    });
  }
  
  // Attach setelah render dan setiap kali re-render
  attachSwipeToCards();
  
  // Override renderCarousel untuk attach swipe setelah render
  const originalRenderCarousel = renderCarousel;
  renderCarousel = function() {
    originalRenderCarousel();
    // Attach swipe ke cards baru setelah render
    setTimeout(attachSwipeToCards, 100);
  };

  logger.log('✅ Kabar Sigap Carousel - Swipe Gesture Ready');
})();


