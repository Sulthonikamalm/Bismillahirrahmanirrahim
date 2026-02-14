// Modul Text-to-Speech (Mode Hover, Performa Tinggi)

(function() {
  'use strict';

  // Konfigurasi
  const CONFIG = {
    debounceTime: 300,
    lang: 'id-ID',
    fallbackLang: 'id_ID',
    pitch: 1.0,
    volume: 1.0,
  };

  // State management
  let isActive = false;
  let currentSpeed = 1.0;
  let synthesis = null;
  let selectedVoice = null;
  let hoverTimeout = null;
  let hoveredElements = new Set();
  let isVoiceLoaded = false;

  // Selector elemen
  const TEXT_SELECTORS = [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'li', 'a', 'button', 'span', 'div',
    'td', 'th', 'label', '.description',
    '.card-text', '.card-title', '.stat-label',
    '.section-title', '.main-title', '.btn',
    '.nav-item', '.faq-question', '.faq-answer'
  ].join(', ');

  const SKIP_SELECTORS = [
    'script', 'style', 'noscript',
    '.fab-sigap-container', '[aria-hidden="true"]',
    '.sr-only', '#tts-active-indicator'
  ];

  // Pemilihan voice
  function loadVoices() {
    if (!synthesis) return;
    
    let voices = synthesis.getVoices();
    
    voices = voices.sort((a, b) => {
      if (a.localService && !b.localService) return -1;
      if (!a.localService && b.localService) return 1;
      return 0;
    });

    selectedVoice = voices.find(v => v.lang.includes('id') || v.lang.includes('ID'));
    if (!selectedVoice) {
      console.warn('TTS: No Indonesian voice found. Using default.');
      selectedVoice = null;
    } else {
      console.log(`TTS Voice Loaded: ${selectedVoice.name} (Local: ${selectedVoice.localService})`);
    }

    isVoiceLoaded = true;
  }

  function initSynthesis() {
    if ('speechSynthesis' in window) {
      synthesis = window.speechSynthesis;
      
      if (synthesis.onvoiceschanged !== undefined) {
        synthesis.onvoiceschanged = loadVoices;
      }
      
      loadVoices();
      return true;
    } else {
      console.error('Speech Synthesis NOT supported');
      return false;
    }
  }

  // Parsing teks & caching
  function getCleanText(element) {
    if (element.dataset.ttsCache) {
      return element.dataset.ttsCache;
    }

    if (shouldSkipElement(element)) return '';

    let text = element.innerText || element.textContent;
    
    if ((element.tagName === 'BUTTON' || element.tagName === 'A') && element.getAttribute('aria-label')) {
      text = element.getAttribute('aria-label');
    }

    text = text
            .replace(/[\n\r]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

    if (text.length > 2) {
      element.dataset.ttsCache = text;
    }

    return text;
  }

  function shouldSkipElement(element) {
    if(element.closest(SKIP_SELECTORS.join(','))) return true;
    
    const text = element.textContent.trim();
    if (!text || text.length < 2) return true;
    if (text.match(/^[\d\s\p{P}]+$/u)) return true;
    
    return false;
  }

  // Engine suara
  function speak(text) {
    if (!synthesis || !text) return;
    
    synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    utterance.lang = CONFIG.lang;
    utterance.rate = currentSpeed;
    utterance.pitch = CONFIG.pitch;
    utterance.volume = CONFIG.volume;

    utterance.onerror = (e) => {
      console.error('TTS Playback Error:', e);
    };

    synthesis.speak(utterance);
  }

  function stop() {
    if (synthesis) {
      synthesis.cancel();
      if (hoverTimeout) clearTimeout(hoverTimeout);
    }
  }

  // Handler hover dengan debounce
  function handleMouseEnter(event) {
    if (!isActive) return;

    const element = event.currentTarget;
    
    if (hoverTimeout) clearTimeout(hoverTimeout);
    
    element.style.backgroundColor = 'rgba(47, 128, 237, 0.1)';
    
    const text = getCleanText(element);
    if (!text) return;

    hoverTimeout = setTimeout(() => {
        speak(text);
    }, CONFIG.debounceTime);
  }

  function handleMouseLeave(event) {
    if (!isActive) return;

    const element = event.currentTarget;
    
    element.style.backgroundColor = '';

    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      hoverTimeout = null;
    }
    
    stop();
  }

  // Setup listener
  function addHoverListeners() {
    const elements = document.querySelectorAll(TEXT_SELECTORS);
    
    elements.forEach(element => {
      if (hoveredElements.has(element)) return;
      if (shouldSkipElement(element)) return;

      hoveredElements.add(element);
      element.addEventListener('mouseenter', handleMouseEnter);
      element.addEventListener('mouseleave', handleMouseLeave);
      element.style.transition = 'background-color 0.15s ease';
    });
  }

  function removeHoverListeners() {
    hoveredElements.forEach(element => {
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
      element.style.backgroundColor = '';
      delete element.dataset.ttsCache;
    });
    hoveredElements.clear();
  }

  // Public API / Lifecycle
  function activate() {
    if (!synthesis && !initSynthesis()) return;
    if (isActive) return;

    isActive = true;
    addHoverListeners();
    showActiveIndicator();
    console.log('TTS Engine: Active (Optimized Mode)');
  }

  function deactivate() {
    if (!isActive) return;
    
    isActive = false;
    stop();
    removeHoverListeners();
    hideActiveIndicator();
    console.log('TTS Engine: Deactivated');
  }

  function setSpeed(speed) {
    currentSpeed = parseFloat(speed);
  }

  function getStatus() {
    return {
      isActive,
      speed: currentSpeed,
      voiceName: selectedVoice ? selectedVoice.name : 'System Default',
      isLocal: selectedVoice ? selectedVoice.localService : 'Unknown'
    };
  }

  // Indicator UI
  function showActiveIndicator() {
    let indicator = document.getElementById('tts-active-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'tts-active-indicator';
      indicator.innerHTML = `<div style="position:fixed;top:85px;right:25px;background:#2563eb;color:#fff;padding:6px 14px;border-radius:50px;font-size:12px;font-weight:600;box-shadow:0 4px 15px rgba(37,99,235,0.3);z-index:10000;pointer-events:none;display:flex;align-items:center;gap:6px;"><span>🔊</span><span>Mode Suara Aktif</span></div>`;
      document.body.appendChild(indicator);
    }
    indicator.style.display = 'block';
  }

  function hideActiveIndicator() {
    const indicator = document.getElementById('tts-active-indicator');
    if (indicator) indicator.style.display = 'none';
  }

  let observer = new MutationObserver(() => {
    if (isActive) addHoverListeners();
  });

  function init() {
    initSynthesis();
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export
  window.TTSModule = { activate, deactivate, setSpeed, getStatus, stop };

})();
