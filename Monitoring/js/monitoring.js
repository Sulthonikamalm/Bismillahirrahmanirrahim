// Monitoring System v5.0 - Dual Search (Kode/Email)

(function() {
  'use strict';

  // Debug mode
  const IS_DEBUG = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1';
  
  const logger = {
    log: (...args) => IS_DEBUG && console.log(...args),
    warn: (...args) => IS_DEBUG && console.warn(...args),
    error: (...args) => console.error(...args)
  };

  // State management
  const State = {
    currentReport: null,
    isSearching: false,
    searchType: null
  };

  // DOM elements
  const DOM = {
    reportIdInput: document.getElementById('reportIdInput'),
    searchBtn: document.getElementById('searchBtn'),
    searchLoader: document.getElementById('searchLoader'),
    errorMessage: document.getElementById('errorMessage'),
    errorText: document.getElementById('errorText'),
    timelineContainer: document.getElementById('timelineContainer'),
    timelineHeader: document.getElementById('timelineHeader'),
    timelineTitle: document.getElementById('timelineTitle'),
    timelineId: document.getElementById('timelineId'),
    timelineDate: document.getElementById('timelineDate'),
    statusBadge: document.getElementById('statusBadge'),
    statusText: document.getElementById('statusText'),
    timeline: document.getElementById('timeline'),
    particlesBg: document.getElementById('particlesBg'),
    centeredLoadingOverlay: document.getElementById('centeredLoadingOverlay')
  };

  // Konfigurasi
  const CONFIG = {
    searchDelay: 1200,
    centeredCubeDelay: 1500,
    apiEndpoint: '../api/get_laporan.php'
  };

  // Inisialisasi
  function init() {
    logger.log('🚀 Monitoring System v5.0 Initializing...');

    generateParticles();
    checkURLParameter();
    setupEventListeners();
    setupInputHints();

    logger.log('✅ Monitoring System Ready');
  }

  // Setup input hints
  function setupInputHints() {
    if (!DOM.reportIdInput) return;

    DOM.reportIdInput.addEventListener('input', function(e) {
      const value = e.target.value.trim();
      
      if (!value) {
        resetPlaceholder();
        return;
      }

      const isEmail = value.includes('@');
      
      if (isEmail) {
        DOM.reportIdInput.placeholder = 'Contoh: user@student.itb.ac.id';
        State.searchType = 'email';
      } else {
        DOM.reportIdInput.placeholder = 'Contoh: PPKPT228236148';
        DOM.reportIdInput.value = value.toUpperCase();
        State.searchType = 'kode';
      }
    });
  }

  function resetPlaceholder() {
    if (DOM.reportIdInput) {
      DOM.reportIdInput.placeholder = 'Masukkan Kode Laporan atau Email';
    }
  }

  // Generate particles
  function generateParticles() {
    const particlesContainer = DOM.particlesBg?.querySelector('.bottom-particles');
    if (!particlesContainer) return;

    const particleCount = window.innerWidth > 768 ? 50 : 30;

    for (let i = 0; i < particleCount; i++) {
      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      particlesContainer.appendChild(bubble);
    }

    logger.log(`🎈 Generated ${particleCount} particles`);
  }

  // Setup event listeners
  function setupEventListeners() {
    if (DOM.searchBtn) {
      DOM.searchBtn.addEventListener('click', handleSearch);
    }

    if (DOM.reportIdInput) {
      DOM.reportIdInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSearch();
        }
      });

      DOM.reportIdInput.addEventListener('focus', () => {
        hideError();
      });
    }
  }

  // Check URL parameter
  function checkURLParameter() {
    const urlParams = new URLSearchParams(window.location.search);
    const kode = urlParams.get('kode');
    const email = urlParams.get('email');
    const query = kode || email;

    if (query) {
      logger.log('🔍 Auto-search triggered:', query);
      DOM.reportIdInput.value = query;

      setTimeout(() => {
        handleSearch();
      }, 1000);
    }
  }

  // Handle search - Dual search (Kode/Email)
  async function handleSearch() {
    if (State.isSearching) {
      logger.log('Already processing...');
      return;
    }

    const query = DOM.reportIdInput?.value?.trim();

    if (!query) {
      showError('Silakan masukkan Kode Laporan atau Email.');
      return;
    }

    const isEmail = validateEmail(query);
    const searchType = isEmail ? 'email' : 'kode';
    const displayQuery = isEmail ? query : query.toUpperCase();

    logger.log(`Searching by ${searchType}:`, displayQuery);

    State.isSearching = true;
    State.searchType = searchType;
    disableInput();
    hideError();
    showSearchLoader();

    try {
      const url = `${CONFIG.apiEndpoint}?query=${encodeURIComponent(displayQuery)}`;
      
      logger.log('API Request:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      logger.log('Response Status:', response.status);

      const result = await response.json();
      logger.log('API Response:', result);

      // Hide loader FIRST
      hideSearchLoader();

      if (result.success && result.data) {
        logger.log('Report found:', result.data);
        State.currentReport = result.data;

        updateTimelineHeader();
        clearTimeline();
        showCenteredLoading();

        setTimeout(() => {
          hideCenteredLoading();
          displayCurrentStep();
          
          enableInput();
          State.isSearching = false;

          checkCompletionConfetti();
        }, CONFIG.centeredCubeDelay);

      } else {
        logger.log('Report not found');
        
        const errorMsg = searchType === 'email' 
          ? `Email "${query}" tidak ditemukan. Pastikan email yang digunakan sama dengan saat melapor.`
          : `Kode Laporan "${displayQuery}" tidak ditemukan. Silakan periksa kembali.`;
        
        showError(errorMsg);
        enableInput();
        State.isSearching = false;
      }

    } catch (error) {
      logger.error('Error fetching report:', error);
      hideSearchLoader();
      showError('Terjadi kesalahan saat mengambil data. Silakan coba lagi.');
      enableInput();
      State.isSearching = false;
    }
  }

  // Validate email
  function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Update header timeline
  function updateTimelineHeader() {
    if (!State.currentReport) return;

    DOM.timelineHeader.style.display = 'flex';
    DOM.timelineHeader.style.opacity = '0';
    DOM.timelineHeader.style.transform = 'translateY(-12px)';

    DOM.timelineTitle.textContent = `Progress Laporan`;
    DOM.timelineId.textContent = State.currentReport.id;

    const date = new Date(State.currentReport.createdAt);
    const formattedDate = date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    DOM.timelineDate.textContent = formattedDate;

    const isCompleted = State.currentReport.status === 'completed';
    DOM.statusBadge.className = `timeline-status-badge ${isCompleted ? 'status-completed' : ''}`;
    DOM.statusBadge.innerHTML = `
      <i class="fas ${isCompleted ? 'fa-check-circle' : 'fa-clock'}"></i>
      <span id="statusText">${isCompleted ? 'Selesai' : 'Dalam Proses'}</span>
    `;

    requestAnimationFrame(() => {
      DOM.timelineHeader.style.transition = 'all 0.6s cubic-bezier(0.22, 0.61, 0.36, 1)';
      DOM.timelineHeader.style.opacity = '1';
      DOM.timelineHeader.style.transform = 'translateY(0)';
    });
  }

  // Clear timeline
  function clearTimeline() {
    DOM.timeline.style.opacity = '0';

    setTimeout(() => {
      DOM.timeline.innerHTML = '';
      DOM.timeline.style.transition = 'opacity 0.4s ease';
      DOM.timeline.style.opacity = '1';
    }, 300);
  }

  // Loading overlay
  function showCenteredLoading() {
    if (DOM.centeredLoadingOverlay) {
      DOM.centeredLoadingOverlay.style.display = 'flex';
      DOM.centeredLoadingOverlay.style.opacity = '0';

      requestAnimationFrame(() => {
        DOM.centeredLoadingOverlay.style.transition = 'opacity 0.4s ease';
        DOM.centeredLoadingOverlay.style.opacity = '1';
      });
    }
  }

  function hideCenteredLoading() {
    if (DOM.centeredLoadingOverlay) {
      DOM.centeredLoadingOverlay.style.opacity = '0';

      setTimeout(() => {
        DOM.centeredLoadingOverlay.style.display = 'none';
      }, 400);
    }
  }

  // Display current step
  function displayCurrentStep() {
    if (!State.currentReport || !State.currentReport.steps || State.currentReport.steps.length === 0) {
      logger.error('❌ No steps to display');
      return;
    }

    const currentStep = State.currentReport.steps[State.currentReport.steps.length - 1];
    logger.log(`🔍 Displaying current step:`, currentStep);

    const stepElement = createStepElement(currentStep);
    DOM.timeline.innerHTML = '';
    DOM.timeline.appendChild(stepElement);

    requestAnimationFrame(() => {
      stepElement.style.opacity = '1';
      stepElement.style.transform = 'translateY(0) scale(1)';
    });
  }

  // Create step element
  function createStepElement(step) {
    const stepElement = document.createElement('div');
    stepElement.className = `timeline-item status-${step.status}`;
    stepElement.style.opacity = '0';
    stepElement.style.transform = 'translateY(24px) scale(0.95)';
    stepElement.style.transition = 'all 0.6s cubic-bezier(0.22, 0.61, 0.36, 1)';

    const marker = document.createElement('div');

    if (step.status === 'loading') {
      marker.className = 'timeline-marker marker-loading';
      marker.innerHTML = createSmallCubeHTML();
    } else if (step.status === 'success') {
      marker.className = 'timeline-marker marker-success';
      marker.innerHTML = step.icon || '✓';
    } else if (step.status === 'failed') {
      marker.className = 'timeline-marker marker-failed';
      marker.innerHTML = step.icon || '✗';
    } else {
      marker.className = 'timeline-marker marker-pending';
      marker.innerHTML = step.icon || '⏸';
    }

    const content = document.createElement('div');
    content.className = 'timeline-content';

    const title = document.createElement('div');
    title.className = 'timeline-content-title';
    title.textContent = step.title;

    const desc = document.createElement('p');
    desc.className = 'timeline-content-desc';
    desc.textContent = step.description;

    content.appendChild(title);
    content.appendChild(desc);

    stepElement.appendChild(marker);
    stepElement.appendChild(content);

    return stepElement;
  }

  // Create cube HTML
  function createSmallCubeHTML() {
    return `
      <div class="cube-wrapper small">
        <div class="cube">
          <div class="cube-faces">
            <div class="cube-face shadow"></div>
            <div class="cube-face bottom"></div>
            <div class="cube-face top"></div>
            <div class="cube-face left"></div>
            <div class="cube-face right"></div>
            <div class="cube-face back"></div>
            <div class="cube-face front"></div>
          </div>
        </div>
      </div>
    `;
  }

  // Check completion & confetti
  function checkCompletionConfetti() {
    if (!State.currentReport) return;

    const allSteps = State.currentReport.steps;
    const allSuccess = allSteps.every(s => s.status === 'success');

    if (allSuccess && State.currentReport.status === 'completed') {
      setTimeout(() => {
        logger.log('🎉 All steps completed! Starting confetti...');
        if (window.Confetti) {
          window.Confetti.start();
        }
      }, 800);
    }
  }

  // UI helpers
  function showSearchLoader() {
    DOM.searchLoader?.classList.add('show');
  }

  function hideSearchLoader() {
    DOM.searchLoader?.classList.remove('show');
  }

  function showError(message) {
    DOM.errorText.textContent = message;
    DOM.errorMessage.classList.add('show');
  }

  function hideError() {
    DOM.errorMessage.classList.remove('show');
  }

  function disableInput() {
    DOM.reportIdInput.disabled = true;
    DOM.searchBtn.disabled = true;
    DOM.searchBtn.classList.add('loading');
  }

  function enableInput() {
    DOM.reportIdInput.disabled = false;
    DOM.searchBtn.disabled = false;
    DOM.searchBtn.classList.remove('loading');
  }

  // Public API
  window.MonitoringSystem = {
    search: handleSearch,
    getState: () => ({ ...State }),
    version: '5.0.0'
  };

  // Inisialisasi
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();