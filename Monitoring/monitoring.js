// ============================================
// MONITORING.JS - DUAL SEARCH VERSION
// Version: 5.0.0 (Production Ready)
// Connected to: api/get_laporan.php (v2.0)
// Supports: Kode Pelaporan OR Email
// ============================================

(function() {
  'use strict';

  // ============================================
  // STATE MANAGEMENT
  // ============================================
  const State = {
    currentReport: null,
    isSearching: false,
    searchType: null // 'kode' or 'email'
  };

  // ============================================
  // DOM ELEMENTS
  // ============================================
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

  // ============================================
  // CONFIGURATION
  // ============================================
  const CONFIG = {
    searchDelay: 1200,
    centeredCubeDelay: 1500,
    apiEndpoint: '../api/get_laporan.php' // v2.0 with dual search
  };

  // ============================================
  // INITIALIZATION
  // ============================================
  function init() {
    console.log('🚀 Monitoring System v5.0 Initializing (Dual Search: Kode OR Email)...');

    generateParticles();
    checkURLParameter();
    setupEventListeners();
    setupInputHints();

    console.log('✅ Monitoring System Ready');
  }

  // ============================================
  // SETUP INPUT HINTS (Auto-detect type)
  // ============================================
  function setupInputHints() {
    if (!DOM.reportIdInput) return;

    DOM.reportIdInput.addEventListener('input', function(e) {
      const value = e.target.value.trim();
      
      if (!value) {
        resetPlaceholder();
        return;
      }

      // Detect if email or kode
      const isEmail = value.includes('@');
      
      if (isEmail) {
        // User typing email
        DOM.reportIdInput.placeholder = 'Contoh: user@student.itb.ac.id';
        State.searchType = 'email';
      } else {
        // User typing kode
        DOM.reportIdInput.placeholder = 'Contoh: PPKS228236148';
        DOM.reportIdInput.value = value.toUpperCase(); // Auto uppercase for kode
        State.searchType = 'kode';
      }
    });
  }

  function resetPlaceholder() {
    if (DOM.reportIdInput) {
      DOM.reportIdInput.placeholder = 'Masukkan Kode Laporan atau Email';
    }
  }

  // ============================================
  // GENERATE PARTICLES
  // ============================================
  function generateParticles() {
    const particlesContainer = DOM.particlesBg?.querySelector('.bottom-particles');
    if (!particlesContainer) return;

    const particleCount = window.innerWidth > 768 ? 50 : 30;

    for (let i = 0; i < particleCount; i++) {
      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      particlesContainer.appendChild(bubble);
    }

    console.log(`🎈 Generated ${particleCount} particles`);
  }

  // ============================================
  // SETUP EVENT LISTENERS
  // ============================================
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

  // ============================================
  // CHECK URL PARAMETER
  // ============================================
  function checkURLParameter() {
    const urlParams = new URLSearchParams(window.location.search);
    const kode = urlParams.get('kode');
    const email = urlParams.get('email');
    const query = kode || email;

    if (query) {
      console.log('🔍 Auto-search triggered:', query);
      DOM.reportIdInput.value = query;

      setTimeout(() => {
        handleSearch();
      }, 1000);
    }
  }

  // ============================================
  // HANDLE SEARCH - DUAL SEARCH (Kode OR Email)
  // ============================================
  async function handleSearch() {
    if (State.isSearching) {
      console.log('⏳ Already processing...');
      return;
    }

    const query = DOM.reportIdInput.value.trim();

    if (!query) {
      showError('Silakan masukkan Kode Laporan atau Email.');
      return;
    }

    // Auto-detect search type
    const isEmail = validateEmail(query);
    const searchType = isEmail ? 'email' : 'kode';
    const displayQuery = isEmail ? query : query.toUpperCase();

    console.log(`🔎 Searching by ${searchType}:`, displayQuery);

    State.isSearching = true;
    State.searchType = searchType;
    disableInput();
    hideError();
    showSearchLoader();

    try {
      // ==========================================
      // CALL BACKEND API (v2.0 - Dual Search)
      // ==========================================
      const url = `${CONFIG.apiEndpoint}?query=${encodeURIComponent(displayQuery)}`;
      
      console.log('API Request:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      console.log('Response Status:', response.status);

      const result = await response.json();
      console.log('API Response:', result);

      hideSearchLoader();

      if (result.success && result.data) {
        // SUCCESS!
        console.log('✅ Report found:', result.data);
        console.log('📊 Searched by:', result.data.searchedBy);
        
        State.currentReport = result.data;

        updateTimelineHeader();
        clearTimeline();
        showCenteredLoading();

        setTimeout(() => {
          hideCenteredLoading();
          displayCurrentStep();
          State.isSearching = false;
          enableInput();

          checkCompletionConfetti();
        }, CONFIG.centeredCubeDelay);

      } else {
        // NOT FOUND
        console.log('❌ Report not found');
        
        const errorMsg = searchType === 'email' 
          ? `Email "${query}" tidak ditemukan. Pastikan email yang digunakan sama dengan saat melapor.`
          : `Kode Laporan "${displayQuery}" tidak ditemukan. Silakan periksa kembali.`;
        
        showError(errorMsg);
        enableInput();
        State.isSearching = false;
      }

    } catch (error) {
      console.error('❌ Error fetching report:', error);
      hideSearchLoader();
      showError('Terjadi kesalahan saat mengambil data. Silakan coba lagi.');
      enableInput();
      State.isSearching = false;
    }
  }

  // ============================================
  // VALIDATE EMAIL
  // ============================================
  function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // ============================================
  // UPDATE TIMELINE HEADER
  // ============================================
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

  // ============================================
  // CLEAR TIMELINE
  // ============================================
  function clearTimeline() {
    DOM.timeline.style.opacity = '0';

    setTimeout(() => {
      DOM.timeline.innerHTML = '';
      DOM.timeline.style.transition = 'opacity 0.4s ease';
      DOM.timeline.style.opacity = '1';
    }, 300);
  }

  // ============================================
  // SHOW/HIDE CENTERED LOADING
  // ============================================
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

  // ============================================
  // DISPLAY CURRENT STEP (LAST STEP IN TIMELINE)
  // ============================================
  function displayCurrentStep() {
    if (!State.currentReport || !State.currentReport.steps || State.currentReport.steps.length === 0) {
      console.error('❌ No steps to display');
      return;
    }

    // Get the LAST step (current progress)
    const currentStep = State.currentReport.steps[State.currentReport.steps.length - 1];
    console.log(`🔍 Displaying current step:`, currentStep);

    const stepElement = createStepElement(currentStep);
    DOM.timeline.innerHTML = '';
    DOM.timeline.appendChild(stepElement);

    requestAnimationFrame(() => {
      stepElement.style.opacity = '1';
      stepElement.style.transform = 'translateY(0) scale(1)';
    });
  }

  // ============================================
  // CREATE STEP ELEMENT
  // ============================================
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

  // ============================================
  // CREATE SMALL CUBE HTML
  // ============================================
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

  // ============================================
  // CHECK COMPLETION & CONFETTI
  // ============================================
  function checkCompletionConfetti() {
    if (!State.currentReport) return;

    const allSteps = State.currentReport.steps;
    const allSuccess = allSteps.every(s => s.status === 'success');

    if (allSuccess && State.currentReport.status === 'completed') {
      setTimeout(() => {
        console.log('🎉 All steps completed! Starting confetti...');
        if (window.Confetti) {
          window.Confetti.start();
        }
      }, 800);
    }
  }

  // ============================================
  // UI HELPERS
  // ============================================
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

  // ============================================
  // PUBLIC API
  // ============================================
  window.MonitoringSystem = {
    search: handleSearch,
    getState: () => ({ ...State }),
    version: '5.0.0'
  };

  // ============================================
  // INITIALIZE
  // ============================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();