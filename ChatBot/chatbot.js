// ============================================
// CHATBOT.JS - FIXED VERSION
// ============================================
// Fixes:
// 1. Emergency shows buttons (not auto breathing)
// 2. Better error handling
// 3. Session tracking for database
// ============================================

(function () {
  "use strict";

  console.log("🤖 TemanKu ChatBot Loading...");

  // ============================================
  // CONFIGURATION
  // ============================================
  const CONFIG = {
    apiEndpoint: "/Bismillahirrahmanirrahim/api/chat.php",
    emergencyPhone: "6282188467793",
    typingDelay: 1000,
    welcomeMessage:
      "Halo, saya TemanKu 💙\n\nSaya di sini untuk mendengarkan Anda. Ruang ini aman dan rahasia. Ceritakan apa yang Anda rasakan...",
  };

  // ============================================
  // STATE
  // ============================================
  let isOpen = false;
  let isTyping = false;
  let sessionActive = false;
  let sessionId = null; // Track session ID from backend
  
  // Voice Recognition State
  let isRecording = false;
  let recognition = null;
  let voiceSupported = false;
  
  // Conversation History for Export
  let conversationHistory = [];

  // ============================================
  // DOM ELEMENTS
  // ============================================
  let modalOverlay, chatMessages, chatInput, btnSendChat, typingIndicator;
  let chatInterfaceScreen;
  let btnVoiceInput, voiceRecordingMode, btnStopRecording, chatInputWrapper;

  // ============================================
  // INIT
  // ============================================
  function init() {
    modalOverlay = document.getElementById("chatbotModalOverlay");
    chatInterfaceScreen = document.getElementById("chatInterfaceScreen");
    chatMessages = document.getElementById("chatMessages");
    chatInput = document.getElementById("chatInput");
    btnSendChat = document.getElementById("btnSendChat");
    typingIndicator = document.getElementById("typingIndicator");
    
    // Voice Recording Elements
    btnVoiceInput = document.getElementById("btnVoiceInput");
    voiceRecordingMode = document.getElementById("voiceRecordingMode");
    btnStopRecording = document.getElementById("btnStopRecording");
    chatInputWrapper = document.getElementById("chatInputWrapper");

    if (!modalOverlay) {
      console.error("ChatBot modal not found!");
      return;
    }

    setupEventListeners();
    initVoiceRecognition();
    
    console.log("ChatBot initialized with Voice-to-Text support");
  }

  // ============================================
  // SETUP EVENT LISTENERS
  // ============================================
  function setupEventListeners() {
    // Close buttons
    const closeButtons = document.querySelectorAll(
      ".btn-close-chatbot, .btn-minimize-chat"
    );
    closeButtons.forEach((btn) => {
      btn.addEventListener("click", close);
    });

    // Send button
    if (btnSendChat) {
      btnSendChat.addEventListener("click", sendMessage);
    }

    // Enter key
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
    
    // Voice Recording Buttons
    if (btnVoiceInput) {
      btnVoiceInput.addEventListener("click", startVoiceRecording);
    }
    
    if (btnStopRecording) {
      btnStopRecording.addEventListener("click", stopVoiceRecording);
    }

    // Listen for FABsigap chat button
    document.addEventListener("click", (e) => {
      if (e.target.closest('[data-action="chat-temanku"]')) {
        e.preventDefault();
        open();
      }
    });
  }

  // ============================================
  // OPEN CHATBOT
  // ============================================
  function open() {
    if (isOpen) return;

    isOpen = true;
    modalOverlay.classList.add("active");

    if (chatInterfaceScreen) {
      chatInterfaceScreen.style.display = "flex";
    }

    // Show welcome message on first open
    if (!sessionActive) {
      sessionActive = true;
      setTimeout(() => {
        addBotMessage(CONFIG.welcomeMessage);
      }, 500);
    }

    if (chatInput) {
      setTimeout(() => chatInput.focus(), 300);
    }

    console.log("✅ ChatBot opened");
  }

  // ============================================
  // CLOSE CHATBOT - CLEAR EVERYTHING
  // ============================================
  function close() {
    isOpen = false;
    modalOverlay.classList.remove("active");

    // CLEAR CHAT COMPLETELY
    clearChat();

    console.log("✅ ChatBot closed (chat cleared)");
  }

  // ============================================
  // CLEAR CHAT
  // ============================================
  function clearChat() {
    if (chatMessages) {
      chatMessages.innerHTML = "";
    }
    sessionActive = false;
    sessionId = null;
    conversationHistory = []; // Clear conversation for export

    // Reset session on backend
    fetch(CONFIG.apiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset" }),
    }).catch((e) => console.error("Reset error:", e));

    console.log("Chat cleared");
  }
  
  // ============================================
  // VOICE-TO-TEXT: Initialize Speech Recognition
  // ============================================
  function initVoiceRecognition() {
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      voiceSupported = false;
      console.log("Voice recognition not supported in this browser");
      
      // Hide voice button if not supported
      if (btnVoiceInput) {
        btnVoiceInput.style.display = "none";
      }
      return;
    }
    
    voiceSupported = true;
    recognition = new SpeechRecognition();
    
    // Configuration
    recognition.lang = "id-ID"; // Indonesian
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    
    // Event handlers
    recognition.onstart = () => {
      isRecording = true;
      console.log("Voice recording started");
      showVoiceRecordingUI();
    };
    
    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      
      // Show interim results in input
      if (interimTranscript && chatInput) {
        chatInput.value = interimTranscript;
        chatInput.placeholder = "Sedang mendengarkan...";
      }
      
      // Finalize when done
      if (finalTranscript && chatInput) {
        chatInput.value = finalTranscript;
        btnSendChat.disabled = false;
        console.log("Voice transcribed:", finalTranscript);
      }
    };
    
    recognition.onerror = (event) => {
      console.error("Voice recognition error:", event.error);
      stopVoiceRecording();
      
      if (event.error === "not-allowed") {
        alert("Izin microphone ditolak. Silakan aktifkan di pengaturan browser.");
      } else if (event.error === "no-speech") {
        // Silent - no need to alert
      }
    };
    
    recognition.onend = () => {
      if (isRecording) {
        stopVoiceRecording();
      }
    };
    
    console.log("Voice recognition initialized (Indonesian)");
  }
  
  // ============================================
  // VOICE-TO-TEXT: Start Recording
  // ============================================
  function startVoiceRecording() {
    if (!voiceSupported || !recognition) {
      alert("Voice recognition tidak didukung di browser ini. Gunakan Chrome atau Edge.");
      return;
    }
    
    if (isRecording) {
      stopVoiceRecording();
      return;
    }
    
    try {
      recognition.start();
    } catch (e) {
      console.error("Error starting voice recognition:", e);
    }
  }
  
  // ============================================
  // VOICE-TO-TEXT: Stop Recording
  // ============================================
  function stopVoiceRecording() {
    isRecording = false;
    
    if (recognition) {
      try {
        recognition.stop();
      } catch (e) {
        // Already stopped
      }
    }
    
    hideVoiceRecordingUI();
    
    if (chatInput) {
      chatInput.placeholder = "Ketik pesan...";
    }
    
    console.log("Voice recording stopped");
  }
  
  // ============================================
  // VOICE-TO-TEXT: UI Helpers
  // ============================================
  function showVoiceRecordingUI() {
    if (voiceRecordingMode) {
      voiceRecordingMode.style.display = "flex";
    }
    if (chatInputWrapper) {
      chatInputWrapper.style.display = "none";
    }
    if (btnVoiceInput) {
      btnVoiceInput.classList.add("recording");
    }
  }
  
  function hideVoiceRecordingUI() {
    if (voiceRecordingMode) {
      voiceRecordingMode.style.display = "none";
    }
    if (chatInputWrapper) {
      chatInputWrapper.style.display = "flex";
    }
    if (btnVoiceInput) {
      btnVoiceInput.classList.remove("recording");
    }
  }
  
  // ============================================
  // EXPORT CHAT TRANSCRIPT
  // ============================================
  function exportChatTranscript() {
    if (conversationHistory.length === 0) {
      alert("Tidak ada percakapan untuk diekspor.");
      return;
    }
    
    const timestamp = new Date().toLocaleString("id-ID");
    let transcript = `=== TRANSKRIP PERCAKAPAN TEMANKU ===\n`;
    transcript += `Tanggal: ${timestamp}\n`;
    transcript += `Session ID: ${sessionId || "N/A"}\n`;
    transcript += `${"=".repeat(40)}\n\n`;
    
    conversationHistory.forEach((msg) => {
      const prefix = msg.role === "user" ? "Anda" : "TemanKu";
      transcript += `[${msg.time}] ${prefix}:\n${msg.content}\n\n`;
    });
    
    transcript += `${"=".repeat(40)}\n`;
    transcript += `Total Pesan: ${conversationHistory.length}\n`;
    transcript += `Diekspor: ${timestamp}\n`;
    transcript += `\n⚠️ DOKUMEN INI BERSIFAT RAHASIA`;
    
    // Create and download file
    const blob = new Blob([transcript], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat_temanku_${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log("Chat transcript exported");
  }
  
  // ============================================
  // CONVERSATION SUMMARY (AI-Generated Summary)
  // ============================================
  function showConversationSummary() {
    if (conversationHistory.length < 3) {
      return;
    }
    
    // Count user messages only
    const userMessages = conversationHistory.filter(m => m.role === "user").length;
    
    // Create summary card
    const summaryDiv = document.createElement("div");
    summaryDiv.className = "message bot-message summary-message";
    summaryDiv.innerHTML = `
      <div class="message-avatar">
        <i class="fas fa-file-alt"></i>
      </div>
      <div class="message-bubble summary-bubble">
        <div class="summary-header">
          <i class="fas fa-clipboard-list"></i>
          <strong>Ringkasan Percakapan</strong>
        </div>
        <div class="summary-content">
          <p><strong>Total Pesan:</strong> ${conversationHistory.length}</p>
          <p><strong>Durasi Sesi:</strong> ${calculateSessionDuration()}</p>
          <p><strong>Session ID:</strong> ${sessionId || "N/A"}</p>
        </div>
        <div class="summary-actions">
          <button class="btn-export-chat" onclick="TemanKuChatbot.exportTranscript()">
            <i class="fas fa-download"></i> Simpan Transkrip
          </button>
        </div>
      </div>
    `;
    
    if (chatMessages) {
      chatMessages.appendChild(summaryDiv);
      scrollToBottom();
    }
  }
  
  function calculateSessionDuration() {
    if (conversationHistory.length < 2) return "< 1 menit";
    
    const first = conversationHistory[0].timestamp;
    const last = conversationHistory[conversationHistory.length - 1].timestamp;
    const diffMs = last - first;
    const diffMins = Math.round(diffMs / 60000);
    
    if (diffMins < 1) return "< 1 menit";
    if (diffMins === 1) return "1 menit";
    return `${diffMins} menit`;
  }

  // ============================================
  // SEND MESSAGE (ENHANCED - Smart Autofill Integration)
  // ============================================
  async function sendMessage() {
    const message = chatInput.value.trim();

    if (!message || isTyping) return;

    addUserMessage(message);
    chatInput.value = "";
    btnSendChat.disabled = true;

    showTyping();

    try {
      const requestBody = { 
        message, 
        action: "chat"
      };
      
      // Include session ID if we have it
      if (sessionId) {
        requestBody.session_id = sessionId;
      }

      console.log("📤 Sending:", requestBody);

      const response = await fetch(CONFIG.apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      console.log("📥 Response status:", response.status);

      if (!response.ok) {
        // Get error details
        const errorText = await response.text();
        console.error("❌ Server error:", errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log("📦 Response data:", data);

      hideTyping();

      if (data.success) {
        // Store session ID if provided
        if (data.session_id) {
          sessionId = data.session_id;
          console.log("✅ Session ID:", sessionId);
        }

        // ============================================================
        // SMART AUTOFILL: Detect redirect action and handle payload
        // ============================================================
        if (data.action === 'redirect_to_form' && data.payload) {
          console.log("🔄 Autofill redirect detected");
          handleAutoFillRedirect(data.payload, data.response);
          return; // Stop normal flow
        }

        if (data.phase === "emergency") {
          handleEmergency(data.response);
        } else {
          addBotMessage(data.response);
        }

        if (data.kode_laporan) {
          setTimeout(() => showReportCode(data.kode_laporan), 1000);
        }
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (error) {
      console.error("❌ Error:", error);
      hideTyping();
      addBotMessage(
        "😔 Maaf, terjadi kesalahan. Silakan coba lagi.\n\n" +
          "Detail: " + error.message + "\n\n" +
          "Jika masalah berlanjut, hubungi: 0821-8846-7793"
      );
    }
  }

  // ============================================
  // SMART AUTOFILL: Handle Redirect to Form
  // ============================================
  async function handleAutoFillRedirect(extractedData, botMessage) {
    console.log("🔄 Handling autofill redirect...");
    console.log("📦 Extracted data:", extractedData);
    
    // Show transition message
    addBotMessage(botMessage);
    
    setTimeout(async () => {
      addBotMessage(
        "✅ Data kamu sudah aku siapkan. Sekarang aku akan arahkan kamu ke formulir. " +
        "Beberapa field sudah terisi otomatis berdasarkan ceritamu, tapi kamu tetap bisa mengubahnya ya."
      );
      
      try {
        // ============================================================
        // PRIVACY-FIRST: Encrypt data before storage
        // Uses existing shared encryption module (Web Crypto API)
        // ============================================================
        const dataToStore = JSON.stringify(extractedData);
        
        // Generate ephemeral session key for this transfer
        const sessionKey = generateEphemeralKey();
        
        // Use shared encryption if available, fallback to simple base64
        let encryptedData;
        if (window.sharedEncryption) {
          encryptedData = await window.sharedEncryption.encrypt(dataToStore, sessionKey);
        } else {
          // Fallback: Simple base64 encoding (less secure but functional)
          encryptedData = btoa(unescape(encodeURIComponent(dataToStore)));
        }
        
        // Store encrypted data in sessionStorage (auto-clears on tab close)
        sessionStorage.setItem('_chatbot_autofill', encryptedData);
        sessionStorage.setItem('_autofill_timestamp', Date.now().toString());
        sessionStorage.setItem('_autofill_key', sessionKey);
        
        console.log("✅ Autofill data encrypted and stored");
        
        // Show loading animation
        showRedirectAnimation();
        
        // Redirect after 2.5 seconds
        setTimeout(() => {
          window.location.href = '../Lapor/lapor.html?source=chatbot';
        }, 2500);
        
      } catch (error) {
        console.error("❌ Autofill storage error:", error);
        
        // Fallback: Store unencrypted (still uses sessionStorage for privacy)
        sessionStorage.setItem('_chatbot_autofill', btoa(JSON.stringify(extractedData)));
        sessionStorage.setItem('_autofill_timestamp', Date.now().toString());
        
        setTimeout(() => {
          window.location.href = '../Lapor/lapor.html?source=chatbot';
        }, 2500);
      }
      
    }, 1500);
  }

  // ============================================
  // GENERATE EPHEMERAL KEY
  // ============================================
  function generateEphemeralKey() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }

  // ============================================
  // SHOW REDIRECT ANIMATION
  // ============================================
  function showRedirectAnimation() {
    const redirectDiv = document.createElement("div");
    redirectDiv.className = "redirect-animation";
    redirectDiv.innerHTML = `
      <div class="redirect-content">
        <div class="redirect-spinner"></div>
        <p>Mengarahkan ke formulir laporan...</p>
      </div>
    `;
    chatMessages.appendChild(redirectDiv);
    scrollToBottom();
  }

  // ============================================
  // HANDLE EMERGENCY - FIXED: SHOW BUTTONS ONLY
  // ============================================
  function handleEmergency(message) {
    addBotMessage(message, "emergency");

    // ALWAYS show emergency actions - don't auto-start breathing
    setTimeout(() => {
      showEmergencyActions();
    }, 1500);
  }

  // ============================================
  // SHOW EMERGENCY ACTIONS
  // ============================================
  function showEmergencyActions() {
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "bot-message-actions";
    actionsDiv.innerHTML = `
      <button class="btn-emergency-action" onclick="TemanKuChatbot.startBreathing()">
        <i class="fas fa-wind"></i>
        Latihan Napas
      </button>
      <button class="btn-emergency-action" onclick="TemanKuChatbot.contactProfessional()">
        <i class="fas fa-phone"></i>
        Hubungi Profesional
      </button>
      <button class="btn-emergency-action secondary" onclick="TemanKuChatbot.continueChatting()">
        <i class="fas fa-comment"></i>
        Lanjut Chat
      </button>
    `;

    chatMessages.appendChild(actionsDiv);
    scrollToBottom();
  }

  // ============================================
  // START BREATHING EXERCISE
  // ============================================
  function startBreathing() {
    if (window.BreathingExercise) {
      window.BreathingExercise.start();

      document.addEventListener(
        "breathing-completed",
        () => {
          addBotMessage(
            "Bagus! Apakah Anda merasa sedikit lebih tenang? 💙\n\n" +
              "Jika butuh berbicara dengan profesional, kami siap membantu."
          );
          
          // Show actions again after breathing
          showEmergencyActions();
        },
        { once: true }
      );
    } else {
      addBotMessage(
        "Maaf, fitur latihan napas tidak tersedia saat ini.\n\n" +
        "Silakan hubungi profesional kami."
      );
      showEmergencyActions();
    }
  }

  // ============================================
  // CONTACT PROFESSIONAL
  // ============================================
  function contactProfessional() {
    const message = encodeURIComponent(
      "Halo, saya butuh bantuan segera. Referensi dari ChatBot TemanKu."
    );

    window.open(
      `https://wa.me/${CONFIG.emergencyPhone}?text=${message}`,
      "_blank"
    );

    addBotMessage(
      "✅ Menghubungkan Anda dengan profesional via WhatsApp.\n\n" +
        "Nomor: **0821-8846-7793**"
    );
  }

  // ============================================
  // CONTINUE CHATTING
  // ============================================
  function continueChatting() {
    addBotMessage(
      "Saya tetap di sini untuk mendengarkan. Ceritakan apa yang Anda rasakan..."
    );
    if (chatInput) chatInput.focus();
  }

  // ============================================
  // SHOW REPORT CODE
  // ============================================
  function showReportCode(kode) {
    const codeDiv = document.createElement("div");
    codeDiv.className = "report-code-display";
    codeDiv.innerHTML = `
      <div class="report-code-card">
        <div class="report-code-icon">
          <i class="fas fa-check-circle"></i>
        </div>
        <h4>Kode Laporan Anda</h4>
        <div class="report-code">${kode}</div>
        <p class="report-code-hint">
          Simpan kode ini untuk tracking di <strong>Monitoring</strong>
        </p>
        <button class="btn-copy-code" onclick="TemanKuChatbot.copyCode('${kode}')">
          <i class="fas fa-copy"></i> Salin Kode
        </button>
      </div>
    `;

    chatMessages.appendChild(codeDiv);
    scrollToBottom();
  }

  // ============================================
  // COPY CODE
  // ============================================
  function copyCode(kode) {
    navigator.clipboard
      .writeText(kode)
      .then(() => {
        alert("✅ Kode disalin: " + kode);
      })
      .catch(() => {
        prompt("Salin kode ini:", kode);
      });
  }

  // ============================================
  // ADD USER MESSAGE
  // ============================================
  function addUserMessage(text) {
    const div = document.createElement("div");
    div.className = "chat-message user-message";
    const time = getTime();
    div.innerHTML = `
      <div class="message-bubble">
        <div class="message-text">${escapeHtml(text)}</div>
        <div class="message-time">${time}</div>
      </div>
    `;

    chatMessages.appendChild(div);
    scrollToBottom();
    
    // Save to conversation history for export
    conversationHistory.push({
      role: "user",
      content: text,
      time: time,
      timestamp: Date.now()
    });
  }

  // ============================================
  // ADD BOT MESSAGE
  // ============================================
  function addBotMessage(text, type = "normal") {
    const div = document.createElement("div");
    div.className = `chat-message bot-message ${
      type === "emergency" ? "emergency" : ""
    }`;

    const formatted = formatText(text);
    const time = getTime();

    div.innerHTML = `
      <div class="message-avatar">
        <i class="fas fa-robot"></i>
      </div>
      <div class="message-bubble">
        <div class="message-text">${formatted}</div>
        <div class="message-time">${time}</div>
      </div>
    `;

    chatMessages.appendChild(div);
    scrollToBottom();
    
    // Save to conversation history for export
    conversationHistory.push({
      role: "bot",
      content: text,
      time: time,
      timestamp: Date.now()
    });
  }

  // ============================================
  // FORMAT TEXT - IMPROVED
  // ============================================
  function formatText(text) {
    let formatted = escapeHtml(text);
    
    // Bold text
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    
    // Code blocks (inline)
    formatted = formatted.replace(/`(.*?)`/g, "<code>$1</code>");
    
    // Line breaks
    formatted = formatted.replace(/\n/g, "<br>");
    
    return formatted;
  }

  // ============================================
  // SHOW/HIDE TYPING - ENHANCED REALISM
  // ============================================
  let typingTextInterval = null;
  const typingPhrases = [
    "TemanKu sedang mengetik",
    "Sedang memikirkan respons",
    "TemanKu sedang membaca",
    "Memproses pesan kamu"
  ];
  
  function showTyping() {
    isTyping = true;
    if (typingIndicator) {
      typingIndicator.style.display = "flex";
      
      // Find or create typing text element
      let typingText = typingIndicator.querySelector(".typing-text");
      if (!typingText) {
        typingText = document.createElement("span");
        typingText.className = "typing-text";
        const typingBubble = typingIndicator.querySelector(".typing-bubble");
        if (typingBubble) {
          typingBubble.appendChild(typingText);
        }
      }
      
      // Randomize typing text for realism
      let phraseIndex = 0;
      typingText.textContent = typingPhrases[0] + "...";
      
      typingTextInterval = setInterval(() => {
        phraseIndex = (phraseIndex + 1) % typingPhrases.length;
        typingText.textContent = typingPhrases[phraseIndex] + "...";
      }, 2000);
      
      scrollToBottom();
    }
  }

  function hideTyping() {
    isTyping = false;
    if (typingIndicator) {
      typingIndicator.style.display = "none";
    }
    
    // Clear typing text interval
    if (typingTextInterval) {
      clearInterval(typingTextInterval);
      typingTextInterval = null;
    }
  }

  // ============================================
  // UTILITIES
  // ============================================
  function scrollToBottom() {
    if (chatMessages) {
      setTimeout(() => {
        chatMessages.parentElement.scrollTop =
          chatMessages.parentElement.scrollHeight;
      }, 100);
    }
  }

  function getTime() {
    return new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // ============================================
  // ENHANCED STT INTEGRATION FOR CHATBOT
  // ============================================
  
  /**
   * Initialize Enhanced STT for chatbot
   */
  function initEnhancedSTTForChat() {
    if (!window.EnhancedSTT) {
      console.log("ℹ️ EnhancedSTT not available for chatbot");
      return;
    }
    
    const initialized = window.EnhancedSTT.init({
      language: 'id-ID',
      emotionDetectionEnabled: true,
      audioEventDetectionEnabled: true
    });
    
    if (initialized) {
      window.EnhancedSTT.setCallbacks({
        onEmotionDetected: handleChatEmotionDetected,
        onAudioEvent: handleChatAudioEvent
      });
      console.log("✅ EnhancedSTT integrated with chatbot");
    }
  }
  
  /**
   * Handle emotion detected in chat
   */
  function handleChatEmotionDetected(emotionData) {
    console.log("🎭 Chat emotion detected:", emotionData);
    
    // Store emotion data for potential use in response
    if (emotionData.primary === 'putusAsa') {
      // Trigger emergency response for crisis keywords
      handleEmergency("Saya sangat khawatir dengan kondisimu. Ingat, kamu tidak sendirian. " +
        "Bantuan profesional tersedia untukmu 24 jam. Apakah kamu ingin berbicara dengan konselor sekarang?");
    } else if (emotionData.primary === 'takut' || emotionData.primary === 'sedih') {
      // Add supportive context to conversation
      showEmotionSupportBubble(emotionData.primary);
    }
  }
  
  /**
   * Handle audio events in chat
   */
  function handleChatAudioEvent(eventData) {
    console.log("🔊 Chat audio event:", eventData);
    
    if (eventData.type === 'crying') {
      showEmotionSupportBubble('crying');
    } else if (eventData.type === 'scream' || eventData.type === 'distress') {
      if (eventData.confidence > 0.6) {
        handleEmergency("Saya merasakan kamu sedang dalam kondisi yang sulit. " +
          "Apakah kamu membutuhkan bantuan segera?");
      }
    }
  }
  
  /**
   * Show supportive bubble based on detected emotion
   */
  function showEmotionSupportBubble(emotionType) {
    const supportMessages = {
      sedih: "💙 Saya merasakan kesedihanmu. Tidak apa-apa untuk merasa sedih.",
      takut: "💙 Saya di sini bersamamu. Kamu aman untuk berbagi.",
      marah: "💙 Perasaan marahmu valid. Ceritakan apa yang membuatmu marah.",
      crying: "💙 Menangis adalah cara yang sehat untuk melepaskan emosi. Saya di sini."
    };
    
    const message = supportMessages[emotionType];
    if (message && !isTyping) {
      // Small delay before showing support message
      setTimeout(() => {
        addBotMessage(message);
      }, 1000);
    }
  }
  
  // Initialize EnhancedSTT for chat on load
  setTimeout(initEnhancedSTTForChat, 200);

  // ============================================
  // PUBLIC API
  // ============================================
  window.TemanKuChatbot = {
    open,
    close,
    clearChat,
    startBreathing,
    contactProfessional,
    continueChatting,
    copyCode,
    exportTranscript: exportChatTranscript,
    showSummary: showConversationSummary
  };

  // ============================================
  // AUTO-INIT
  // ============================================
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  console.log("✅ TemanKu ChatBot Loaded");
})();