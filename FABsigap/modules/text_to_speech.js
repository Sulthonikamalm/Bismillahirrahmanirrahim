// ============================================
// TEXT-TO-SPEECH MODULE - HOVER TO SPEAK (OPTIMIZED)
// High Performance & Low Latency
// ============================================

(function() {
  'use strict';

  // ============================================
  // CONFIGURATION
  // ============================================
  const CONFIG = {
    debounceTime: 300, // Wait 300ms before speaking (prevents accidental triggers)
    lang: 'id-ID',
    fallbackLang: 'id_ID',
    pitch: 1.0,
    volume: 1.0,
  };

  // ============================================
  // STATE MANAGEMENT
  // ============================================
  let isActive = false;
  let currentSpeed = 1.0;
  let synthesis = null;
  let selectedVoice = null;
  let hoverTimeout = null;
  let hoveredElements = new Set();
  let isVoiceLoaded = false;

  // ============================================
  // SELECTORS
  // ============================================
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

  // ============================================
  // 1. ADVANCED VOICE SELECTION (The Core Fix)
  // ============================================
  function loadVoices() {
    if (!synthesis) return;
    
    let voices = synthesis.getVoices();
    
    // Sort voices: Local Service first (Zero Latency), then Google/Online
    // We prioritize "localService" because it generates audio on the device.
    voices = voices.sort((a, b) => {
      if (a.localService && !b.localService) return -1;
      if (!a.localService && b.localService) return 1;
      return 0;
    });

    // Try to find an Indonesian voice
    selectedVoice = voices.find(v => v.lang.includes('id') || v.lang.includes('ID'));
    
    // Fallback: If no ID voice, try a generic English one but warn (or just use default)
    if (!selectedVoice) {
      // Logic: Just let browser decide if no specific ID voice found, 
      // but usually mdern browsers have one.
      console.warn('TTS: No Indonesian voice found. Using default.');
      selectedVoice = null; // System default
    } else {
      console.log(`TTS Voice Loaded: ${selectedVoice.name} (Local: ${selectedVoice.localService})`);
    }

    isVoiceLoaded = true;
  }

  function initSynthesis() {
    if ('speechSynthesis' in window) {
      synthesis = window.speechSynthesis;
      
      // Chrome loads voices asynchronously
      if (synthesis.onvoiceschanged !== undefined) {
        synthesis.onvoiceschanged = loadVoices;
      }
      
      loadVoices(); // Try loading immediately just in case
      return true;
    } else {
      console.error('Speech Synthesis NOT supported');
      return false;
    }
  }

  // ============================================
  // 2. SMART TEXT PARSING & CACHING
  // ============================================
  function getCleanText(element) {
    // Check cache first
    if (element.dataset.ttsCache) {
      return element.dataset.ttsCache;
    }

    if (shouldSkipElement(element)) return '';

    let text = element.innerText || element.textContent;
    
    // Priority: aria-label for interactive elements
    if ((element.tagName === 'BUTTON' || element.tagName === 'A') && element.getAttribute('aria-label')) {
      text = element.getAttribute('aria-label');
    }

    // Advanced cleanup
    text = text
            .replace(/[\n\r]+/g, ' ') // Remove newlines
            .replace(/\s+/g, ' ')     // Collapse whitespace
            .trim();

    // Cache it to avoid re-processing
    if (text.length > 2) { // Only cache meaningful text
      element.dataset.ttsCache = text;
    }

    return text;
  }

  function shouldSkipElement(element) {
    if(element.closest(SKIP_SELECTORS.join(','))) return true;
    
    // Skip purely numeric or symbol-only text
    const text = element.textContent.trim();
    if (!text || text.length < 2) return true;
    if (text.match(/^[\d\s\p{P}]+$/u)) return true; // Only numbers/punctuation
    
    return false;
  }

  // ============================================
  // 3. LOW LATENCY SPEAK ENGINE
  // ============================================
  function speak(text) {
    if (!synthesis || !text) return;
    
    // Cancel immediately to ensure "snappy" feel when switching
    synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    utterance.lang = CONFIG.lang;
    utterance.rate = currentSpeed;
    utterance.pitch = CONFIG.pitch;
    utterance.volume = CONFIG.volume;

    // Error handling
    utterance.onerror = (e) => {
      console.error('TTS Playback Error:', e);
      // If error is 'interrupted', it's normal (user moved mouse fast)
    };

    synthesis.speak(utterance);
  }

  function stop() {
    if (synthesis) {
      synthesis.cancel();
      // Clear any pending debounce
      if (hoverTimeout) clearTimeout(hoverTimeout);
    }
  }

  // ============================================
  // 4. DEBOUNCED HOVER HANDLERS
  // ============================================
  function handleMouseEnter(event) {
    if (!isActive) return;

    const element = event.currentTarget;
    
    // Clear any existing pending speech
    if (hoverTimeout) clearTimeout(hoverTimeout);

    // 1. Visual Feedback Immediate
    element.style.backgroundColor = 'rgba(47, 128, 237, 0.1)';
    
    // 2. Prepare text immediately (lazy cache)
    const text = getCleanText(element);
    if (!text) return;

    // 3. Schedule Speak (Debounce)
    // This is the Key to "No Lag" feeling. We ONLY speak if user STAYS.
    // If they move quickly, we skip speaking, saving the engine from choking.
    hoverTimeout = setTimeout(() => {
        speak(text);
    }, CONFIG.debounceTime);
  }

  function handleMouseLeave(event) {
    if (!isActive) return;

    const element = event.currentTarget;
    
    // Remove visual
    element.style.backgroundColor = '';

    // Cancel pending speech if they left before debounce time
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      hoverTimeout = null;
    }
    
    // Stop current speech immediately for snappy feel
    stop();
  }

  // ============================================
  // SETUP LISTENERS
  // ============================================
  function addHoverListeners() {
    const elements = document.querySelectorAll(TEXT_SELECTORS);
    
    elements.forEach(element => {
      if (hoveredElements.has(element)) return;
      if (shouldSkipElement(element)) return;

      hoveredElements.add(element);
      element.addEventListener('mouseenter', handleMouseEnter);
      element.addEventListener('mouseleave', handleMouseLeave);
      element.style.transition = 'background-color 0.15s ease'; // Faster transition
    });
  }

  function removeHoverListeners() {
    hoveredElements.forEach(element => {
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
      element.style.backgroundColor = '';
      delete element.dataset.ttsCache; // Clear cache
    });
    hoveredElements.clear();
  }

  // ============================================
  // PUBLIC API / LIFECYCLE
  // ============================================
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

  // Observer for dynamic content
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
