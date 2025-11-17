// ============================================
// TEXT-TO-SPEECH MODULE - HOVER TO SPEAK
// Saat ON: Hover teks → berbunyi
// Tetap aktif meskipun FAB ditutup
// ============================================

(function() {
  'use strict';

  // ============================================
  // STATE MANAGEMENT
  // ============================================
  let isActive = false;
  let currentSpeed = 1.0;
  let synthesis = null;
  let currentUtterance = null;
  let hoveredElements = new Set();
  let isCurrentlySpeaking = false;

  // ============================================
  // SELECTORS - Text elements yang bisa di-hover
  // ============================================
  const TEXT_SELECTORS = [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p',
    'li',
    'a',
    'button',
    'span',
    'div',
    'td', 'th',
    'label',
    '.description',
    '.card-text',
    '.card-title',
    '.stat-label',
    '.section-title',
    '.main-title',
    '.btn',
    '.nav-item',
    '.faq-question',
    '.faq-answer'
  ].join(', ');

  // Elements to SKIP
  const SKIP_SELECTORS = [
    'script',
    'style',
    'noscript',
    '.fab-sigap-container',
    '[aria-hidden="true"]',
    '.sr-only'
  ];

  // ============================================
  // INITIALIZE SPEECH SYNTHESIS
  // ============================================
  function initSynthesis() {
    if ('speechSynthesis' in window) {
      synthesis = window.speechSynthesis;
      console.log('✅ Speech Synthesis Available');
      return true;
    } else {
      console.error('❌ Speech Synthesis NOT supported');
      return false;
    }
  }

  // ============================================
  // CHECK IF ELEMENT SHOULD BE SKIPPED
  // ============================================
  function shouldSkipElement(element) {
    // Check if element is inside skip selectors
    for (let selector of SKIP_SELECTORS) {
      if (element.closest(selector)) {
        return true;
      }
    }
    
    // Skip empty text
    const text = element.textContent.trim();
    if (!text || text.length < 2) {
      return true;
    }
    
    // Skip if no actual text content (only icons, etc)
    if (text.match(/^[\s\u00A0\u2000-\u200B\u202F\u205F\u3000\uFEFF]*$/)) {
      return true;
    }
    
    return false;
  }

  // ============================================
  // SPEAK FUNCTION - Read text on hover
  // ============================================
  function speak(text) {
    if (!synthesis || !text) return;

    // Cancel any ongoing speech
    synthesis.cancel();
    isCurrentlySpeaking = true;

    // Create utterance
    currentUtterance = new SpeechSynthesisUtterance(text);
    currentUtterance.rate = currentSpeed;
    currentUtterance.pitch = 1.0;
    currentUtterance.volume = 1.0;
    currentUtterance.lang = 'id-ID';

    // Event handlers
    currentUtterance.onend = function() {
      isCurrentlySpeaking = false;
      currentUtterance = null;
    };

    currentUtterance.onerror = function(event) {
      console.error('TTS Error:', event.error);
      isCurrentlySpeaking = false;
      currentUtterance = null;
    };

    // Speak
    synthesis.speak(currentUtterance);
  }

  // ============================================
  // STOP FUNCTION
  // ============================================
  function stop() {
    if (synthesis) {
      synthesis.cancel();
      isCurrentlySpeaking = false;
      currentUtterance = null;
    }
  }

  // ============================================
  // ADD HOVER LISTENERS TO ELEMENTS
  // ============================================
  function addHoverListeners() {
    const elements = document.querySelectorAll(TEXT_SELECTORS);
    
    elements.forEach(element => {
      if (shouldSkipElement(element) || hoveredElements.has(element)) {
        return;
      }

      // Mark as processed
      hoveredElements.add(element);

      // Add hover event
      element.addEventListener('mouseenter', handleMouseEnter);
      element.addEventListener('mouseleave', handleMouseLeave);
      
      // Add visual indicator
      element.style.transition = 'background-color 0.2s ease';
    });

    console.log(`✅ Added hover listeners to ${hoveredElements.size} elements`);
  }

  // ============================================
  // REMOVE HOVER LISTENERS
  // ============================================
  function removeHoverListeners() {
    hoveredElements.forEach(element => {
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
      
      // Remove visual indicator
      element.style.transition = '';
      element.style.backgroundColor = '';
    });
    
    hoveredElements.clear();
    console.log('🔇 Removed all hover listeners');
  }

  // ============================================
  // MOUSE ENTER HANDLER
  // ============================================
  function handleMouseEnter(event) {
    if (!isActive) return;

    const element = event.currentTarget;
    
    // Get text content
    let text = element.textContent.trim();
    
    // For buttons, get aria-label if available
    if (element.tagName === 'BUTTON' && element.getAttribute('aria-label')) {
      text = element.getAttribute('aria-label');
    }
    
    // Clean text
    text = text.replace(/\s+/g, ' ').trim();
    
    if (text && text.length > 0) {
      // Visual feedback - subtle highlight
      element.style.backgroundColor = 'rgba(47, 128, 237, 0.1)';
      
      // Speak
      speak(text);
    }
  }

  // ============================================
  // MOUSE LEAVE HANDLER
  // ============================================
  function handleMouseLeave(event) {
    if (!isActive) return;

    const element = event.currentTarget;
    
    // Remove highlight
    element.style.backgroundColor = '';
    
    // Stop speaking when mouse leaves
    // (Optional - comment out if you want it to finish)
    stop();
  }

  // ============================================
  // ACTIVATE TTS (HOVER MODE)
  // ============================================
  function activate() {
    if (!synthesis && !initSynthesis()) {
      return;
    }

    if (isActive) {
      console.log('TTS already active');
      return;
    }

    isActive = true;
    
    // Add hover listeners to all text elements
    addHoverListeners();
    
    // Show indicator
    showActiveIndicator();
    
    console.log('🔊 TTS Hover Mode ACTIVATED');
  }

  // ============================================
  // DEACTIVATE TTS
  // ============================================
  function deactivate() {
    if (!isActive) {
      console.log('TTS already inactive');
      return;
    }

    isActive = false;
    
    // Stop any ongoing speech
    stop();
    
    // Remove all hover listeners
    removeHoverListeners();
    
    // Hide indicator
    hideActiveIndicator();
    
    console.log('🔇 TTS Hover Mode DEACTIVATED');
  }

  // ============================================
  // SHOW ACTIVE INDICATOR (Visual feedback)
  // ============================================
  function showActiveIndicator() {
    // Create floating indicator
    let indicator = document.getElementById('tts-active-indicator');
    
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'tts-active-indicator';
      indicator.innerHTML = `
        <div style="
          position: fixed;
          top: 80px;
          right: 24px;
          background: rgba(47, 128, 237, 0.95);
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 9998;
          pointer-events: none;
          animation: slideInRight 0.3s ease;
        ">
          🔊 Hover untuk Mendengar
        </div>
      `;
      document.body.appendChild(indicator);
      
      // Add animation
      const style = document.createElement('style');
      style.textContent = `
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `;
      document.head.appendChild(style);
    }
    
    indicator.style.display = 'block';
  }

  // ============================================
  // HIDE ACTIVE INDICATOR
  // ============================================
  function hideActiveIndicator() {
    const indicator = document.getElementById('tts-active-indicator');
    if (indicator) {
      indicator.style.display = 'none';
    }
  }

  // ============================================
  // SET SPEED
  // ============================================
  function setSpeed(speed) {
    currentSpeed = parseFloat(speed);
    console.log(`⚡ Speed set to ${currentSpeed}x`);
  }

  // ============================================
  // GET STATUS
  // ============================================
  function getStatus() {
    return {
      isActive: isActive,
      isSpeaking: isCurrentlySpeaking,
      speed: currentSpeed,
      listeningElements: hoveredElements.size
    };
  }

  // ============================================
  // OBSERVER - Watch for new elements (dynamic content)
  // ============================================
  let observer = null;

  function startObserver() {
    if (observer) return;

    observer = new MutationObserver((mutations) => {
      if (isActive) {
        // Add listeners to new elements
        addHoverListeners();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function stopObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  // ============================================
  // AUTO-INITIALIZE
  // ============================================
  function init() {
    initSynthesis();
    startObserver(); // Watch for dynamic content
    console.log('✅ TTS Hover Module Initialized');
  }

  // Initialize when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ============================================
  // EXPORT PUBLIC API
  // ============================================
  window.TTSModule = {
    activate: activate,
    deactivate: deactivate,
    setSpeed: setSpeed,
    getStatus: getStatus,
    stop: stop
  };

  // ============================================
  // CLEANUP ON PAGE UNLOAD
  // ============================================
  window.addEventListener('beforeunload', function() {
    if (isActive) {
      deactivate();
    }
    stopObserver();
  });

  console.log('📢 TTS Hover Module Loaded');

})();