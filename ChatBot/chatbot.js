/**
 * SIGAP PPKS - TemanKu Chatbot v4.0
 * 
 * Chatbot dengan fitur-fitur baru:
 * - Integrasi dengan ChatStorage untuk persistence terenkripsi
 * - Session continuity (lanjutkan chat sebelumnya)
 * - Context restoration dari localStorage
 * - Improved UX dengan session info
 * 
 * @package SIGAP_PPKS
 * @subpackage ChatBot
 */

(function () {
  "use strict";

  // ============================================
  // KONFIGURASI
  // ============================================
  const CONFIG = {
    apiEndpoint: "/Bismillahirrahmanirrahim/api/chatbot/chat.php",
    emergencyPhone: "6282188467793",
    loadingDelay: 600,
    welcomeMessage: "Halo, saya TemanKu 👋\n\nSaya di sini untuk mendengarkan Anda. Ruang ini aman dan rahasia. Ceritakan apa yang Anda rasakan...",
    continueMessage: "Selamat datang kembali! 👋\n\nAku masih ingat percakapan kita sebelumnya. Mau lanjutkan atau mulai yang baru?",
    enablePersistence: true,  // Aktifkan penyimpanan lokal
    autoRestoreSession: true  // Otomatis restore session sebelumnya
  };

  // Merge dengan config global jika ada
  if (window.CHATBOT_CONFIG) {
    Object.assign(CONFIG, window.CHATBOT_CONFIG);
  }

  // ============================================
  // STATE VARIABLES
  // ============================================
  let isOpen = false;
  let isTyping = false;
  let sessionActive = false;
  let sessionId = null;
  let hasRestoredSession = false;
  
  // Voice recording states
  let isRecording = false;
  let recognition = null;
  let voiceSupported = false;
  let chatRecordingStartTime = null;
  let chatTimerInterval = null;
  let shouldKeepRecording = false;
  let finalTranscriptAccumulated = '';
  let interimTranscript = '';
  
  // Conversation states
  let conversationHistory = [];
  let currentPhase = 'curhat';
  let currentTier = 0;

  // ============================================
  // DOM ELEMENTS
  // ============================================
  let modalOverlay, chatMessages, chatMessagesContainer, chatInput, btnSendChat, typingIndicator;
  let chatInterfaceScreen;
  let btnVoiceInput, voiceRecordingMode, btnStopRecording, chatInputWrapper;

  // ============================================
  // UI TEMPLATE
  // ============================================
  const CHATBOT_UI_TEMPLATE = `
    <div class="chatbot-modal-overlay" id="chatbotModalOverlay">
        <div class="chatbot-modal">
            <div class="chatbot-screen chat-interface-screen" id="chatInterfaceScreen">
                <div class="chat-header">
                    <div class="chat-header-info">
                        <h3 id="chatModeTitle">TemanKu</h3>
                        <p class="chat-mode-desc" id="chatModeDesc">Ruang aman untuk berbagi cerita</p>
                    </div>
                    <div class="chat-header-actions">
                        <button class="btn-clear-chat" id="btnClearChat" title="Hapus Riwayat">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                        <button class="btn-minimize-chat" id="btnMinimizeChat" title="Minimize">
                            <i class="fas fa-minus"></i>
                        </button>
                        <button class="btn-close-chatbot" id="btnCloseChatbot2" onclick="TemanKuChatbot.close()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>

                <div class="chat-messages-container" id="chatMessagesContainer">
                    <div class="chat-messages" id="chatMessages">
                    </div>

                    <div class="typing-indicator" id="typingIndicator">
                        <div class="typing-bubble">
                            <div class="typing-dots">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="chat-input-area">
                    <div class="chat-input-wrapper" id="chatInputWrapper">
                        <button type="button" class="btn-voice-input" id="btnVoiceInput" title="Rekam suara">
                            <i class="fas fa-microphone"></i>
                        </button>

                        <input type="text" class="chat-input" id="chatInput" placeholder="Ketik pesan Anda..." autocomplete="off" />
                        <button class="btn-send-chat" id="btnSendChat" disabled>
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>

                    <div class="voice-recording-mode" id="voiceRecordingMode">
                        <div class="recording-info">
                            <span class="recording-dot"></span>
                            <span class="recording-label">Merekam...</span>
                            <span class="recording-time" id="chatRecordingTimer">00:00</span>
                        </div>

                        <div class="live-transcript-preview" id="liveTranscriptPreview">
                            <span class="live-transcript-text placeholder" id="liveTranscriptText">Mulai berbicara...</span>
                        </div>

                        <div class="chat-waveform">
                            <div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div>
                            <div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div>
                        </div>

                        <button type="button" class="btn-stop-voice" id="btnStopRecording">
                            <i class="fas fa-check"></i>
                            <span>Selesai</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
  `;

  // ============================================
  // INITIALIZATION
  // ============================================
  
  /**
   * Inject UI template ke DOM
   */
  function injectChatbotUI() {
    if (!document.getElementById("chatbotModalOverlay")) {
      document.body.insertAdjacentHTML("beforeend", CHATBOT_UI_TEMPLATE);
    }
  }

  /**
   * Inisialisasi chatbot
   */
  async function init() {
    injectChatbotUI();

    // Ambil referensi DOM elements
    modalOverlay = document.getElementById("chatbotModalOverlay");
    chatInterfaceScreen = document.getElementById("chatInterfaceScreen");
    chatMessagesContainer = document.getElementById("chatMessagesContainer");
    chatMessages = document.getElementById("chatMessages");
    chatInput = document.getElementById("chatInput");
    btnSendChat = document.getElementById("btnSendChat");
    typingIndicator = document.getElementById("typingIndicator");
    
    btnVoiceInput = document.getElementById("btnVoiceInput");
    voiceRecordingMode = document.getElementById("voiceRecordingMode");
    btnStopRecording = document.getElementById("btnStopRecording");
    chatInputWrapper = document.getElementById("chatInputWrapper");

    if (!modalOverlay) return;

    setupEventListeners();
    initVoiceRecognition();
    
    // Inisialisasi ChatStorage
    if (CONFIG.enablePersistence && typeof ChatStorage !== 'undefined') {
      await ChatStorage.init();
    }
  }

  /**
   * Setup event listeners
   */
  function setupEventListeners() {
    // Close/minimize buttons
    const closeButtons = document.querySelectorAll(".btn-close-chatbot, .btn-minimize-chat");
    closeButtons.forEach((btn) => {
      btn.addEventListener("click", minimize);
    });
    
    // Clear chat button
    const btnClearChat = document.getElementById("btnClearChat");
    if (btnClearChat) {
      btnClearChat.addEventListener("click", confirmClearChat);
    }

    // Send button
    if (btnSendChat) {
      btnSendChat.addEventListener("click", sendMessage);
    }

    // Input field
    if (chatInput) {
      chatInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });

      chatInput.addEventListener("input", () => {
        btnSendChat.disabled = chatInput.value.trim().length === 0;
      });
    }
    
    // Voice recording
    if (btnVoiceInput) {
      btnVoiceInput.addEventListener("click", startVoiceRecording);
    }
    
    if (btnStopRecording) {
      btnStopRecording.addEventListener("click", stopVoiceRecording);
    }

    // Trigger untuk buka chatbot
    document.addEventListener("click", (e) => {
      if (e.target.closest('[data-action="chat-temanku"]')) {
        e.preventDefault();
        open();
      }
    });
  }

  // ============================================
  // OPEN / CLOSE / MINIMIZE
  // ============================================

  /**
   * Buka chatbot
   */
  async function open() {
    if (isOpen) return;

    isOpen = true;
    modalOverlay.classList.add("active");

    if (chatInterfaceScreen) {
      chatInterfaceScreen.style.display = "flex";
    }

    if (!sessionActive) {
      sessionActive = true;
      
      // Cek apakah ada session sebelumnya yang bisa di-restore
      if (CONFIG.autoRestoreSession && !hasRestoredSession) {
        await tryRestoreSession();
      } else {
        // Tampilkan welcome message
        showTyping();
        setTimeout(() => {
          hideTyping();
          addBotMessage(CONFIG.welcomeMessage);
        }, CONFIG.loadingDelay);
      }
    }

    if (chatInput) {
      setTimeout(() => chatInput.focus(), 400);
    }
  }

  /**
   * Coba restore session dari localStorage
   */
  async function tryRestoreSession() {
    if (!CONFIG.enablePersistence || typeof ChatStorage === 'undefined') {
      showWelcome();
      return;
    }
    
    try {
      const hasHistory = await ChatStorage.hasHistory();
      
      if (hasHistory) {
        const storedHistory = await ChatStorage.loadHistory();
        
        if (storedHistory && storedHistory.length > 0) {
          // Tampilkan continue message
          showContinuePrompt(storedHistory.length);
          hasRestoredSession = true;
          return;
        }
      }
    } catch (error) {
      console.error('[Chatbot] Restore error:', error);
    }
    
    showWelcome();
  }

  /**
   * Tampilkan prompt untuk melanjutkan atau mulai baru
   */
  function showContinuePrompt(messageCount) {
    addBotMessage(CONFIG.continueMessage);
    
    // Tambahkan tombol pilihan
    const optionsDiv = document.createElement("div");
    optionsDiv.className = "chat-message bot-message session-options-message";
    optionsDiv.innerHTML = `
      <div class="message-avatar">
        <i class="fas fa-history"></i>
      </div>
      <div class="message-bubble session-options">
        <p>📝 ${messageCount} pesan sebelumnya tersimpan</p>
        <div class="session-buttons">
          <button class="btn-session btn-continue" id="btnContinueSession">
            <i class="fas fa-play"></i> Lanjutkan
          </button>
          <button class="btn-session btn-new" id="btnNewSession">
            <i class="fas fa-plus"></i> Mulai Baru
          </button>
        </div>
      </div>
    `;
    
    if (chatMessages) {
      chatMessages.appendChild(optionsDiv);
      scrollToBottom();
      
      // Event listeners untuk tombol
      document.getElementById("btnContinueSession")?.addEventListener("click", () => {
        restorePreviousSession();
        optionsDiv.remove();
      });
      
      document.getElementById("btnNewSession")?.addEventListener("click", () => {
        startNewSession();
        optionsDiv.remove();
      });
    }
  }

  /**
   * Restore session sebelumnya
   */
  async function restorePreviousSession() {
    try {
      const storedHistory = await ChatStorage.loadHistory();
      
      if (storedHistory && storedHistory.length > 0) {
        // Render semua pesan
        storedHistory.forEach(msg => {
          if (msg.role === 'user') {
            addUserMessage(msg.content, false);
          } else {
            addBotMessage(msg.content, false);
          }
        });
        
        conversationHistory = storedHistory;
        
        // Sync ke server
        await restoreServerSession(storedHistory);
        
        addBotMessage("Aku sudah membaca percakapan kita sebelumnya. Apa yang ingin kamu ceritakan hari ini?");
      }
    } catch (error) {
      console.error('[Chatbot] Restore session error:', error);
      addBotMessage("Maaf, ada kendala memuat riwayat. Mari kita mulai dari awal.");
    }
  }

  /**
   * Restore server session dengan history
   */
  async function restoreServerSession(history) {
    try {
      const response = await fetch(CONFIG.apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "restore",
          history: history.slice(-20) // Kirim 20 pesan terakhir
        }),
      });
      
      const data = await response.json();
      if (data.session_id) {
        sessionId = data.session_id;
      }
    } catch (error) {
      console.error('[Chatbot] Server restore error:', error);
    }
  }

  /**
   * Mulai session baru
   */
  async function startNewSession() {
    // Clear local storage
    if (typeof ChatStorage !== 'undefined') {
      await ChatStorage.clearHistory();
    }
    
    conversationHistory = [];
    
    // Reset server session
    await fetch(CONFIG.apiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset" }),
    }).catch(console.error);
    
    addBotMessage("Baik, mari kita mulai dari awal. Aku di sini untuk mendengarkanmu. 💙");
  }

  /**
   * Tampilkan welcome message
   */
  function showWelcome() {
    showTyping();
    setTimeout(() => {
      hideTyping();
      addBotMessage(CONFIG.welcomeMessage);
    }, CONFIG.loadingDelay);
  }

  /**
   * Minimize chatbot (tutup tapi simpan state)
   */
  function minimize() {
    isOpen = false;
    modalOverlay.classList.remove("active");
    // Tidak clear session, biarkan user bisa lanjutkan
  }

  /**
   * Tutup chatbot sepenuhnya (clear session)
   */
  function close() {
    isOpen = false;
    modalOverlay.classList.remove("active");
    clearChat();
  }

  /**
   * Konfirmasi hapus riwayat
   */
  function confirmClearChat() {
    if (confirm("Hapus semua riwayat chat? Tindakan ini tidak dapat dibatalkan.")) {
      fullClear();
    }
  }

  /**
   * Clear chat secara penuh (termasuk localStorage)
   */
  async function fullClear() {
    if (chatMessages) {
      chatMessages.innerHTML = "";
    }
    
    sessionActive = false;
    sessionId = null;
    conversationHistory = [];
    hasRestoredSession = false;

    // Clear localStorage
    if (typeof ChatStorage !== 'undefined') {
      await ChatStorage.clearHistory();
    }

    // Reset server session
    fetch(CONFIG.apiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset" }),
    }).catch((e) => console.error("Reset error:", e));
    
    addBotMessage("Riwayat sudah dihapus. Ada yang bisa aku bantu? 💙");
  }

  /**
   * Clear chat (untuk minimize, tidak hapus localStorage)
   */
  function clearChat() {
    // Simpan ke localStorage sebelum clear UI
    saveToStorage();
    
    if (chatMessages) {
      chatMessages.innerHTML = "";
    }
    sessionActive = false;
    sessionId = null;
    conversationHistory = [];

    fetch(CONFIG.apiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset" }),
    }).catch((e) => console.error("Reset error:", e));
  }

  // ============================================
  // MESSAGING
  // ============================================

  /**
   * Kirim pesan ke server
   */
  async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message || isTyping) return;

    addUserMessage(message);
    chatInput.value = "";
    btnSendChat.disabled = true;

    showTyping();

    try {
      const requestBody = { message, action: "chat" };
      if (sessionId) requestBody.session_id = sessionId;

      const response = await fetch(CONFIG.apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      hideTyping();

      if (data.success) {
        if (data.session_id) sessionId = data.session_id;
        
        // Update phase dan tier
        currentPhase = data.phase || currentPhase;
        currentTier = data.tier || currentTier;

        // Handle redirect ke form
        if (data.action === 'redirect_to_form' && data.payload) {
          handleAutoFillRedirect(data.payload, data.response);
          return;
        }

        // Handle emergency
        if (data.phase === "emergency") {
          handleEmergency(data.response);
        } else {
          addBotMessage(data.response);
        }

        // Tampilkan kode laporan jika ada
        if (data.kode_laporan) {
          setTimeout(() => showReportCode(data.kode_laporan), 800);
        }
        
        // Simpan ke localStorage
        saveToStorage();
        
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (error) {
      console.error(error);
      hideTyping();
      addBotMessage("Maaf, terjadi kesalahan. Silakan coba lagi.");
    }
  }

  /**
   * Simpan ke localStorage
   */
  async function saveToStorage() {
    if (!CONFIG.enablePersistence || typeof ChatStorage === 'undefined') return;
    
    try {
      await ChatStorage.saveHistory(conversationHistory);
    } catch (error) {
      console.error('[Chatbot] Save error:', error);
    }
  }

  /**
   * Tambah pesan user ke UI
   */
  function addUserMessage(text, addToHistory = true) {
    const time = new Date().toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'});
    
    if (addToHistory) {
      conversationHistory.push({ 
        role: "user", 
        content: text, 
        timestamp: Date.now(), 
        time: time 
      });
    }
    
    const msgDiv = document.createElement("div");
    msgDiv.className = "chat-message user-message";
    msgDiv.innerHTML = `
      <div class="message-bubble">
        <div class="message-text">${escapeHtml(text)}</div>
        <span class="message-time">${time}</span>
      </div>
    `;
    
    if (chatMessages) {
      chatMessages.appendChild(msgDiv);
      scrollToBottom();
    }
  }

  /**
   * Tambah pesan bot ke UI
   */
  function addBotMessage(text, addToHistory = true) {
    const time = new Date().toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'});
    
    if (addToHistory) {
      conversationHistory.push({ 
        role: "assistant", 
        content: text, 
        timestamp: Date.now(), 
        time: time 
      });
    }

    const msgDiv = document.createElement("div");
    msgDiv.className = "chat-message bot-message";
    
    const formattedText = text.replace(/\n/g, "<br>");
    
    msgDiv.innerHTML = `
      <div class="message-avatar">
        <i class="fas fa-robot"></i>
      </div>
      <div class="message-bubble">
        <div class="message-text">${formattedText}</div>
        <span class="message-time">${time}</span>
      </div>
    `;
    
    if (chatMessages) {
      chatMessages.appendChild(msgDiv);
      scrollToBottom();
    }
  }

  // ============================================
  // SPECIAL HANDLERS
  // ============================================

  /**
   * Handle auto-fill redirect ke form
   */
  async function handleAutoFillRedirect(extractedData, botMessage) {
    addBotMessage(botMessage);
    
    setTimeout(async () => {
      addBotMessage(
        "Data kamu sudah aku siapkan ✨\n\nSekarang aku akan arahkan kamu ke formulir. Beberapa field sudah terisi otomatis."
      );
      
      try {
        const dataToStore = JSON.stringify(extractedData);
        let encryptedData; 
        
        if (window.sharedEncryption) {
          const sessionKey = generateEphemeralKey();
          encryptedData = await window.sharedEncryption.encrypt(dataToStore, sessionKey);
          sessionStorage.setItem('_autofill_key', sessionKey);
        } else {
          encryptedData = btoa(unescape(encodeURIComponent(dataToStore)));
        }
        
        sessionStorage.setItem('_chatbot_autofill', encryptedData);
        sessionStorage.setItem('_autofill_timestamp', Date.now().toString());
        
        showRedirectAnimation();
        
        setTimeout(() => {
          window.location.href = '../Lapor/lapor.html?source=chatbot';
        }, 2000);
        
      } catch (error) {
        sessionStorage.setItem('_chatbot_autofill', btoa(JSON.stringify(extractedData)));
        sessionStorage.setItem('_autofill_timestamp', Date.now().toString());
        
        setTimeout(() => {
          window.location.href = '../Lapor/lapor.html?source=chatbot';
        }, 2000);
      }
      
    }, 1200);
  }

  /**
   * Handle emergency
   */
  function handleEmergency(message) {
    addBotMessage(message);
    
    setTimeout(() => {
      const emergencyDiv = document.createElement("div");
      emergencyDiv.className = "chat-message bot-message emergency-options-message";
      emergencyDiv.innerHTML = `
        <div class="message-avatar">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <div class="message-bubble emergency-actions">
          <p><strong>🚨 Bantuan Darurat</strong></p>
          <div class="emergency-buttons">
              <a href="https://wa.me/${CONFIG.emergencyPhone}" target="_blank" class="btn-emergency btn-whatsapp">
                  <i class="fab fa-whatsapp"></i> WhatsApp Satgas
              </a>
              <a href="tel:${CONFIG.emergencyPhone}" class="btn-emergency btn-call">
                  <i class="fas fa-phone-alt"></i> Telepon Darurat
              </a>
              <a href="../Lapor/lapor.html" class="btn-emergency btn-form">
                  <i class="fas fa-file-alt"></i> Isi Formulir
              </a>
          </div>
        </div>
      `;
      
      if (chatMessages) {
        chatMessages.appendChild(emergencyDiv);
        scrollToBottom();
      }
    }, 600);
  }

  /**
   * Tampilkan kode laporan
   */
  function showReportCode(code) {
    const codeDiv = document.createElement("div");
    codeDiv.className = "chat-message bot-message report-code-message";
    codeDiv.innerHTML = `
      <div class="message-avatar">
        <i class="fas fa-check-circle"></i>
      </div>
      <div class="message-bubble report-code-bubble">
        <div class="report-icon">
          <i class="fas fa-clipboard-check"></i>
        </div>
        <div class="report-content">
          <h4>Laporan Tercatat ✅</h4>
          <p>Kode unik laporan:</p>
          <div class="code-display">
            <span id="reportCode">${code}</span>
            <button class="btn-copy-code" onclick="TemanKuChatbot.copyCode('${code}')" title="Salin">
              <i class="fas fa-copy"></i>
            </button>
          </div>
          <small>Simpan kode ini untuk cek status laporan</small>
        </div>
        <div class="report-actions">
          <a href="../Monitoring/monitoring.html" class="btn-check-status">
            <i class="fas fa-search"></i>
            Cek Status
          </a>
        </div>
      </div>
    `;
    
    if (chatMessages) {
      chatMessages.appendChild(codeDiv);
      scrollToBottom();
    }
  }

  /**
   * Copy kode laporan
   */
  function copyCode(code) {
    navigator.clipboard.writeText(code).then(() => {
      const btn = document.querySelector('.btn-copy-code');
      if (btn) {
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i>';
        btn.style.background = '#10b981';
        setTimeout(() => {
          btn.innerHTML = originalHTML;
          btn.style.background = '';
        }, 1500);
      }
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  }

  // ============================================
  // VOICE RECORDING
  // ============================================

  /**
   * Inisialisasi voice recognition
   */
  function initVoiceRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      voiceSupported = false;
      if (btnVoiceInput) {
        btnVoiceInput.style.display = "none";
      }
      return;
    }
    
    voiceSupported = true;
    recognition = new SpeechRecognition();
    
    recognition.lang = "id-ID";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 3;
    
    recognition.onstart = () => {
      isRecording = true;
      finalTranscriptAccumulated = chatInput ? chatInput.value : '';
      interimTranscript = '';
      showVoiceRecordingUI();
    };
    
    recognition.onresult = (event) => {
      let currentInterim = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        
        if (result.isFinal) {
          finalTranscriptAccumulated += transcript + ' ';
        } else {
          currentInterim += transcript;
        }
      }
      
      interimTranscript = currentInterim;
      const fullText = (finalTranscriptAccumulated + interimTranscript).trim();
      
      if (chatInput) {
        chatInput.value = fullText;
        chatInput.scrollLeft = chatInput.scrollWidth;
        
        if (btnSendChat) {
          btnSendChat.disabled = !fullText;
        }
      }
      
      const liveTranscriptText = document.getElementById("liveTranscriptText");
      if (liveTranscriptText) {
        liveTranscriptText.textContent = fullText || "Mulai berbicara...";
        liveTranscriptText.classList.toggle("placeholder", !fullText);
        
        const preview = document.getElementById("liveTranscriptPreview");
        if (preview) {
          preview.scrollTop = preview.scrollHeight;
        }
      }
    };
    
    recognition.onend = () => {
      if (shouldKeepRecording && isRecording) {
        setTimeout(() => {
          if (shouldKeepRecording) {
            try {
              recognition.start();
            } catch (e) {
              setTimeout(() => {
                if (shouldKeepRecording) {
                  try { recognition.start(); } catch(e2) {}
                }
              }, 200);
            }
          }
        }, 50);
        return;
      }
      
      if (isRecording) {
        stopVoiceRecording();
      }
    };
    
    recognition.onerror = (event) => {
      if (['no-speech', 'aborted', 'network'].includes(event.error)) {
        if (shouldKeepRecording && isRecording) {
          return;
        }
      }
      
      if (event.error === "not-allowed") {
        alert("Izin microphone ditolak. Silakan aktifkan di pengaturan browser.");
        shouldKeepRecording = false;
        stopVoiceRecording();
      } else if (event.error === "audio-capture") {
        alert("Mikrofon tidak ditemukan. Pastikan mikrofon terhubung.");
        shouldKeepRecording = false;
        stopVoiceRecording();
      }
    };
  }

  /**
   * Mulai voice recording
   */
  function startVoiceRecording() {
    if (!voiceSupported || !recognition) {
      alert("Voice recognition tidak didukung di browser ini. Gunakan Chrome atau Edge.");
      return;
    }
    
    if (isRecording) {
      stopVoiceRecording();
      return;
    }
    
    finalTranscriptAccumulated = '';
    interimTranscript = '';
    shouldKeepRecording = true;
    
    try {
      recognition.start();
    } catch (e) {
      console.error("Error starting voice recognition:", e);
      shouldKeepRecording = false;
    }
  }

  /**
   * Stop voice recording
   */
  function stopVoiceRecording() {
    shouldKeepRecording = false;
    isRecording = false;
    
    if (recognition) {
      try {
        recognition.stop();
      } catch (e) {}
    }
    
    hideVoiceRecordingUI();
    
    if (chatInput && chatInput.value.trim()) {
      btnSendChat.disabled = false;
    }
  }

  /**
   * Tampilkan UI voice recording
   */
  function showVoiceRecordingUI() {
    if (voiceRecordingMode) voiceRecordingMode.classList.add("active");
    if (chatInputWrapper) chatInputWrapper.style.display = "none";
    if (btnVoiceInput) btnVoiceInput.classList.add("recording");
    
    const liveTranscriptText = document.getElementById("liveTranscriptText");
    if (liveTranscriptText) {
      liveTranscriptText.textContent = "Mulai berbicara...";
      liveTranscriptText.classList.add("placeholder");
    }
    
    chatRecordingStartTime = Date.now();
    startChatRecordingTimer();
  }

  /**
   * Sembunyikan UI voice recording
   */
  function hideVoiceRecordingUI() {
    if (voiceRecordingMode) voiceRecordingMode.classList.remove("active");
    if (chatInputWrapper) chatInputWrapper.style.display = "flex";
    if (btnVoiceInput) btnVoiceInput.classList.remove("recording");
    
    if (chatTimerInterval) {
      clearInterval(chatTimerInterval);
      chatTimerInterval = null;
    }
    chatRecordingStartTime = null;
    
    const timerDisplay = document.getElementById("chatRecordingTimer");
    if (timerDisplay) {
      timerDisplay.textContent = "00:00";
    }
  }

  /**
   * Timer untuk recording
   */
  function startChatRecordingTimer() {
    const timerDisplay = document.getElementById("chatRecordingTimer");
    if (!timerDisplay) return;
    
    chatTimerInterval = setInterval(() => {
      if (!chatRecordingStartTime) return;
      
      const elapsed = Math.floor((Date.now() - chatRecordingStartTime) / 1000);
      const minutes = Math.floor(elapsed / 60).toString().padStart(2, "0");
      const seconds = (elapsed % 60).toString().padStart(2, "0");
      timerDisplay.textContent = `${minutes}:${seconds}`;
    }, 1000);
  }

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  /**
   * Tampilkan typing indicator
   */
  function showTyping() {
    isTyping = true;
    if (typingIndicator) {
      typingIndicator.classList.add('active');
      typingIndicator.style.display = "flex";
    }
    scrollToBottom();
  }

  /**
   * Sembunyikan typing indicator
   */
  function hideTyping() {
    isTyping = false;
    if (typingIndicator) {
      typingIndicator.classList.remove('active');
      typingIndicator.style.display = "none";
    }
  }

  /**
   * Scroll ke bawah
   */
  function scrollToBottom() {
    if (chatMessagesContainer) {
      requestAnimationFrame(() => {
        chatMessagesContainer.scrollTo({
          top: chatMessagesContainer.scrollHeight,
          behavior: 'smooth'
        });
      });
    }
  }

  /**
   * Animasi redirect
   */
  function showRedirectAnimation() {
    const animDiv = document.createElement("div");
    animDiv.className = "redirect-animation";
    animDiv.innerHTML = `
      <div class="redirect-content">
        <div class="redirect-spinner"></div>
        <p>Mengalihkan ke formulir...</p>
      </div>
    `;
    
    if (chatMessages) {
      chatMessages.appendChild(animDiv);
      scrollToBottom();
    }
  }

  /**
   * Generate random key
   */
  function generateEphemeralKey() {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  /**
   * Escape HTML untuk keamanan
   */
  function escapeHtml(text) {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  // ============================================
  // PUBLIC API
  // ============================================
  window.TemanKuChatbot = { 
    close, 
    open, 
    init, 
    copyCode,
    minimize,
    clearHistory: fullClear
  };

  // Auto init
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();