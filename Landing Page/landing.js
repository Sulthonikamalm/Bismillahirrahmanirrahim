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
      // Elements to animate: highlight texts + stat cards
      const highlightElements = document.querySelectorAll('.highlight-animate');
      const statCards = document.querySelectorAll('.transparansi-stat-box');
      
      // Combine all elements
      const allElements = [...highlightElements, ...statCards];
      
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
        threshold: 0.3, // Trigger when 30% visible
        rootMargin: '0px 0px -30px 0px'
      });
      
      allElements.forEach(el => observer.observe(el));
      console.log('✅ Scroll animations initialized:', allElements.length, 'elements');
    }
    
    // Initialize on DOM ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initScrollAnimations);
    } else {
      initScrollAnimations();
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
