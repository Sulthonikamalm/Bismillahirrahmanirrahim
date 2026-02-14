// Modul latihan pernapasan (Box Breathing 4-4-4-4)

(function() {
  'use strict';

  // State
  let isActive = false;
  let currentCycle = 0;
  let currentPhase = 0;
  let breathingInterval = null;

  // Fase pernapasan (Box Breathing)
  const phases = [
    { name: 'Tarik napas dalam...', duration: 4000, scale: 1.5 },
    { name: 'Tahan...', duration: 4000, scale: 1.5 },
    { name: 'Hembuskan perlahan...', duration: 4000, scale: 1 },
    { name: 'Tahan...', duration: 4000, scale: 1 }
  ];

  const totalCycles = 3;

  // Membuat UI latihan pernapasan
  function createBreathingUI() {
    const existingUI = document.getElementById('breathing-exercise');
    if (existingUI) {
      existingUI.remove();
    }

    const breathingDiv = document.createElement('div');
    breathingDiv.id = 'breathing-exercise';
    breathingDiv.className = 'breathing-modal';
    breathingDiv.innerHTML = `
      <div class="breathing-container">
        <div class="breathing-header">
          <h3>🧘 Latihan Pernapasan</h3>
          <button class="breathing-close" id="breathing-close" aria-label="Tutup">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="breathing-content">
          <div class="breathing-circle-container">
            <div class="breathing-circle" id="breathing-circle"></div>
            <div class="breathing-pulse"></div>
          </div>

          <div class="breathing-instruction" id="breathing-instruction">
            Bersiap...
          </div>

          <div class="breathing-progress">
            <div class="breathing-progress-text" id="breathing-progress">
              Siklus <span id="breathing-cycle">0</span> dari ${totalCycles}
            </div>
            <div class="breathing-progress-bar">
              <div class="breathing-progress-fill" id="breathing-progress-fill"></div>
            </div>
          </div>

          <div class="breathing-controls">
            <button class="btn btn-primary" id="breathing-start">
              Mulai
            </button>
            <button class="btn btn-outline-secondary" id="breathing-skip" style="display:none;">
              Lewati
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(breathingDiv);

    // Add styles
    addBreathingStyles();

    // Init event listeners
    initBreathingEvents();
  }

  // Tambahkan styles
  function addBreathingStyles() {
    if (document.getElementById('breathing-styles')) return;

    const style = document.createElement('style');
    style.id = 'breathing-styles';
    style.textContent = `
      .breathing-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
        padding: 20px;
        animation: fadeIn 0.3s ease;
      }

      .breathing-container {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 24px;
        padding: 40px;
        max-width: 500px;
        width: 100%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      .breathing-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 32px;
      }

      .breathing-header h3 {
        color: white;
        font-size: 24px;
        font-weight: 600;
        margin: 0;
      }

      .breathing-close {
        width: 36px;
        height: 36px;
        border: none;
        background: rgba(255, 255, 255, 0.2);
        color: white;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
      }

      .breathing-close:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: rotate(90deg);
      }

      .breathing-content {
        text-align: center;
      }

      .breathing-circle-container {
        position: relative;
        width: 200px;
        height: 200px;
        margin: 0 auto 32px;
      }

      .breathing-circle {
        width: 100%;
        height: 100%;
        background: radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%);
        border-radius: 50%;
        transition: transform 4s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 0 40px rgba(255, 255, 255, 0.5);
        position: relative;
        z-index: 2;
      }

      .breathing-pulse {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%);
        border-radius: 50%;
        animation: pulse 2s ease-in-out infinite;
        z-index: 1;
      }

      @keyframes pulse {
        0%, 100% {
          transform: scale(1);
          opacity: 1;
        }
        50% {
          transform: scale(1.1);
          opacity: 0.5;
        }
      }

      .breathing-instruction {
        font-size: 24px;
        font-weight: 600;
        color: white;
        margin-bottom: 24px;
        min-height: 32px;
        animation: fadeIn 0.5s ease;
      }

      .breathing-progress {
        margin-bottom: 24px;
      }

      .breathing-progress-text {
        color: rgba(255, 255, 255, 0.9);
        font-size: 14px;
        margin-bottom: 12px;
      }

      .breathing-progress-bar {
        width: 100%;
        height: 8px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 10px;
        overflow: hidden;
      }

      .breathing-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #51CF66 0%, #4ECDC4 100%);
        border-radius: 10px;
        width: 0%;
        transition: width 0.3s ease;
      }

      .breathing-controls {
        display: flex;
        gap: 12px;
        justify-content: center;
      }

      .breathing-controls .btn {
        padding: 12px 32px;
        font-size: 16px;
        font-weight: 600;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.3s ease;
        border: none;
      }

      .breathing-controls .btn-primary {
        background: white;
        color: #667eea;
      }

      .breathing-controls .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(255, 255, 255, 0.3);
      }

      .breathing-controls .btn-outline-secondary {
        background: transparent;
        color: white;
        border: 2px solid rgba(255, 255, 255, 0.5);
      }

      .breathing-controls .btn-outline-secondary:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      @media (max-width: 480px) {
        .breathing-container {
          padding: 24px;
        }

        .breathing-circle-container {
          width: 160px;
          height: 160px;
        }

        .breathing-instruction {
          font-size: 20px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  // Inisialisasi event listener
  function initBreathingEvents() {
    const startBtn = document.getElementById('breathing-start');
    const closeBtn = document.getElementById('breathing-close');
    const skipBtn = document.getElementById('breathing-skip');

    if (startBtn) {
      startBtn.addEventListener('click', startExercise);
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', close);
    }

    if (skipBtn) {
      skipBtn.addEventListener('click', skipExercise);
    }
  }

  // Mulai latihan
  function startExercise() {
    isActive = true;
    currentCycle = 1;
    currentPhase = 0;

    // Hide start button, show skip
    document.getElementById('breathing-start').style.display = 'none';
    document.getElementById('breathing-skip').style.display = 'block';

    // Start breathing cycle
    nextPhase();
  }

  // Fase berikutnya
  function nextPhase() {
    if (!isActive) return;

    const phase = phases[currentPhase];
    const circle = document.getElementById('breathing-circle');
    const instruction = document.getElementById('breathing-instruction');
    const cycleText = document.getElementById('breathing-cycle');
    const progressFill = document.getElementById('breathing-progress-fill');

    // Update instruction
    instruction.textContent = phase.name;

    // Animate circle
    circle.style.transform = `scale(${phase.scale})`;

    // Update progress
    const totalPhases = totalCycles * phases.length;
    const currentProgress = ((currentCycle - 1) * phases.length) + currentPhase + 1;
    const progressPercent = (currentProgress / totalPhases) * 100;
    progressFill.style.width = progressPercent + '%';

    // Update cycle count
    cycleText.textContent = currentCycle;

    // Move to next phase
    breathingInterval = setTimeout(() => {
      currentPhase++;

      if (currentPhase >= phases.length) {
        currentPhase = 0;
        currentCycle++;

        if (currentCycle > totalCycles) {
          finishExercise();
          return;
        }
      }

      nextPhase();
    }, phase.duration);
  }

  // Selesai latihan
  function finishExercise() {
    isActive = false;

    const instruction = document.getElementById('breathing-instruction');
    instruction.textContent = '🎉 Selesai! Bagus!';

    // Show message in chatbot
    setTimeout(() => {
      close();
      
      if (window.TemanKuChatbot) {
        // This will be called by chatbot module
        const event = new CustomEvent('breathing-completed');
        document.dispatchEvent(event);
      }
    }, 2000);
  }

  // Lewati latihan
  function skipExercise() {
    if (confirm('Yakin ingin melewati latihan pernapasan?')) {
      isActive = false;
      clearTimeout(breathingInterval);
      close();
    }
  }

  // Mulai (public)
  function start() {
    createBreathingUI();
    console.log('✅ Breathing Exercise Started');
  }

  // Tutup
  function close() {
    isActive = false;
    clearTimeout(breathingInterval);
    
    const breathingUI = document.getElementById('breathing-exercise');
    if (breathingUI) {
      breathingUI.remove();
    }

    console.log('Breathing Exercise Closed');
  }

  // Export public API
  window.BreathingExercise = {
    start: start,
    close: close
  };

  console.log('Breathing Exercise Module Loaded');

})();