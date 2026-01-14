/**
 * Sistem Monitoring Laporan v5.0
 * Mendukung pencarian dual: Kode Laporan & Email
 */

(function() {
  'use strict';

  // Mode debug
  const IS_DEBUG = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  const logger = {
    log: (...args) => IS_DEBUG && console.log(...args),
    warn: (...args) => IS_DEBUG && console.warn(...args),
    error: (...args) => console.error(...args)
  };

  // State
  const State = {
    currentReport: null,
    isSearching: false,
    searchType: null
  };

  // Elemen DOM
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
    logger.log('🚀 Monitoring System v5.0 dimulai');
    checkURLParameter();
    setupEventListeners();
    setupInputHints();
    logger.log('✅ Monitoring System siap');
  }

  // Setup hint input
  function setupInputHints() {
    if (!DOM.reportIdInput) return;

    DOM.reportIdInput.addEventListener('input', function(e) {
      const value = e.target.value.trim();
      
      if (!value) {
        DOM.reportIdInput.placeholder = 'Masukkan Kode Laporan atau Email';
        return;
      }

      if (value.includes('@')) {
        DOM.reportIdInput.placeholder = 'Contoh: user@student.itb.ac.id';
        State.searchType = 'email';
      } else {
        DOM.reportIdInput.placeholder = 'Contoh: PPKPT228236148';
        DOM.reportIdInput.value = value.toUpperCase();
        State.searchType = 'kode';
      }
    });
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

      DOM.reportIdInput.addEventListener('focus', hideError);
    }
  }

  // Cek parameter URL
  function checkURLParameter() {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('kode') || urlParams.get('email');

    if (query) {
      logger.log('🔍 Auto-search:', query);
      DOM.reportIdInput.value = query;
      setTimeout(handleSearch, 1000);
    }
  }

  // Handle pencarian
  async function handleSearch() {
    if (State.isSearching) return;

    const query = DOM.reportIdInput?.value?.trim();
    if (!query) {
      showError('Silakan masukkan Kode Laporan atau Email.');
      return;
    }

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query);
    const searchType = isEmail ? 'email' : 'kode';
    const displayQuery = isEmail ? query : query.toUpperCase();

    logger.log(`Mencari dengan ${searchType}:`, displayQuery);

    State.isSearching = true;
    State.searchType = searchType;
    disableInput();
    hideError();
    showSearchLoader();

    try {
      const url = `${CONFIG.apiEndpoint}?query=${encodeURIComponent(displayQuery)}`;
      const response = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
      const result = await response.json();

      hideSearchLoader();

      if (result.success && result.data) {
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
        const errorMsg = searchType === 'email' 
          ? `Email "${query}" tidak ditemukan. Pastikan email yang digunakan sama dengan saat melapor.`
          : `Kode Laporan "${displayQuery}" tidak ditemukan. Silakan periksa kembali.`;
        
        showError(errorMsg);
        enableInput();
        State.isSearching = false;
      }
    } catch (error) {
      logger.error('Error mengambil laporan:', error);
      hideSearchLoader();
      showError('Terjadi kesalahan saat mengambil data. Silakan coba lagi.');
      enableInput();
      State.isSearching = false;
    }
  }

  // Update header timeline
  function updateTimelineHeader() {
    if (!State.currentReport) return;

    DOM.timelineHeader.style.display = 'flex';
    DOM.timelineHeader.style.opacity = '0';
    DOM.timelineHeader.style.transform = 'translateY(-12px)';

    DOM.timelineTitle.textContent = 'Progress Laporan';
    DOM.timelineId.textContent = State.currentReport.id;

    const date = new Date(State.currentReport.createdAt);
    DOM.timelineDate.textContent = date.toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const isCompleted = State.currentReport.status === 'completed';
    DOM.statusBadge.className = `timeline-status-badge ${isCompleted ? 'status-completed' : ''}`;
    DOM.statusBadge.innerHTML = `
      <i class="fas ${isCompleted ? 'fa-check-circle' : 'fa-clock'}"></i>
      <span>${isCompleted ? 'Selesai' : 'Dalam Proses'}</span>
    `;

    requestAnimationFrame(() => {
      DOM.timelineHeader.style.transition = 'all 0.6s cubic-bezier(0.22, 0.61, 0.36, 1)';
      DOM.timelineHeader.style.opacity = '1';
      DOM.timelineHeader.style.transform = 'translateY(0)';
    });
  }

  // Bersihkan timeline
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
      setTimeout(() => { DOM.centeredLoadingOverlay.style.display = 'none'; }, 400);
    }
  }

  // Tampilkan step saat ini
  function displayCurrentStep() {
    if (!State.currentReport?.steps?.length) {
      logger.error('Tidak ada step untuk ditampilkan');
      return;
    }

    const currentStep = State.currentReport.steps[State.currentReport.steps.length - 1];
    const stepElement = createStepElement(currentStep);
    
    DOM.timeline.innerHTML = '';
    DOM.timeline.appendChild(stepElement);

    requestAnimationFrame(() => {
      stepElement.style.opacity = '1';
      stepElement.style.transform = 'translateY(0) scale(1)';
    });
  }

  // Buat elemen step
  function createStepElement(step) {
    const stepElement = document.createElement('div');
    stepElement.className = `timeline-item status-${step.status}`;
    stepElement.style.cssText = 'opacity: 0; transform: translateY(24px) scale(0.95); transition: all 0.6s cubic-bezier(0.22, 0.61, 0.36, 1);';

    const marker = document.createElement('div');
    
    const markerConfig = {
      loading: { class: 'marker-loading', content: createSmallCubeHTML() },
      success: { class: 'marker-success', content: step.icon || '✓' },
      failed: { class: 'marker-failed', content: step.icon || '✗' },
      pending: { class: 'marker-pending', content: step.icon || '⏸' }
    };

    const config = markerConfig[step.status] || markerConfig.pending;
    marker.className = `timeline-marker ${config.class}`;
    marker.innerHTML = config.content;

    const content = document.createElement('div');
    content.className = 'timeline-content';
    content.innerHTML = `
      <div class="timeline-content-title">${step.title}</div>
      <p class="timeline-content-desc">${step.description}</p>
    `;

    stepElement.appendChild(marker);
    stepElement.appendChild(content);
    return stepElement;
  }

  // Buat HTML cube kecil
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

  // Cek konfeti jika selesai
  function checkCompletionConfetti() {
    if (!State.currentReport) return;

    const allSuccess = State.currentReport.steps.every(s => s.status === 'success');
    if (allSuccess && State.currentReport.status === 'completed') {
      setTimeout(() => {
        logger.log('🎉 Semua step selesai! Memulai konfeti...');
        window.Confetti?.start();
      }, 800);
    }
  }

  // Helper UI
  function showSearchLoader() { DOM.searchLoader?.classList.add('show'); }
  function hideSearchLoader() { DOM.searchLoader?.classList.remove('show'); }
  function showError(message) { DOM.errorText.textContent = message; DOM.errorMessage.classList.add('show'); }
  function hideError() { DOM.errorMessage.classList.remove('show'); }
  function disableInput() { DOM.reportIdInput.disabled = true; DOM.searchBtn.disabled = true; DOM.searchBtn.classList.add('loading'); }
  function enableInput() { DOM.reportIdInput.disabled = false; DOM.searchBtn.disabled = false; DOM.searchBtn.classList.remove('loading'); }

  // API Publik
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