// ============================================
// LAPOR FORM JAVASCRIPT - FINAL VERSION
// Integrated with Backend API
// Fixed: waktuKejadian now supports date input
// ============================================

(function() {
    'use strict';

    // ============================================
    // STATE MANAGEMENT
    // ============================================
    let currentStep = 1;
    const totalSteps = 5;
    const formData = {};

    // Track step 2 selections (needs both)
    const step2Status = {
        korban: false,
        kehawatiran: false
    };

    // File upload state
    const uploadedFiles = [];
    const MAX_FILES = 5;
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
    const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
    const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime'];
    const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

    // ============================================
    // DOM ELEMENTS
    // ============================================
    const progressBar = document.getElementById('progressBar');
    const currentStepNumber = document.getElementById('currentStepNumber');
    const formSteps = document.querySelectorAll('.form-step');

    // ============================================
    // INITIALIZE (ENHANCED - Smart Autofill Integration)
    // ============================================
    function init() {
        initChoiceCards();
        initStep1();
        initStep2();
        initStep3();
        initStep4();
        initStep5();
        initVoiceInput(); // NEW: Voice-to-text feature
        injectModalStyles();
        injectAutofillStyles();
        injectVoiceInputStyles(); // NEW: Voice input styles
        
        // NEW: Check for autofill data from chatbot
        checkAndApplyAutoFill();
        
        console.log('✅ Lapor Form Initialized (Backend Integrated + Smart Autofill + Voice Input)');
    }

    // ============================================
    // SMART AUTOFILL ENGINE
    // ============================================
    
    /**
     * Check for autofill data and apply if valid
     */
    async function checkAndApplyAutoFill() {
        const encryptedData = sessionStorage.getItem('_chatbot_autofill');
        const timestamp = sessionStorage.getItem('_autofill_timestamp');
        const sessionKey = sessionStorage.getItem('_autofill_key');
        
        // Check URL source parameter
        const urlParams = new URLSearchParams(window.location.search);
        const source = urlParams.get('source');
        
        if (!encryptedData) {
            console.log('ℹ️ No autofill data found');
            return;
        }
        
        // Security: Expire data after 5 minutes (300000ms)
        if (timestamp && (Date.now() - parseInt(timestamp) > 300000)) {
            console.log('⚠️ Autofill data expired, clearing...');
            clearAutofillData();
            return;
        }
        
        try {
            let extractedData;
            
            // Try decryption with shared encryption module
            if (window.sharedEncryption && sessionKey) {
                try {
                    const decryptedJson = await window.sharedEncryption.decrypt(encryptedData, sessionKey);
                    extractedData = JSON.parse(decryptedJson);
                    console.log('✅ Autofill data decrypted successfully');
                } catch (decryptError) {
                    console.warn('⚠️ Decryption failed, trying base64 fallback');
                    extractedData = JSON.parse(decodeURIComponent(escape(atob(encryptedData))));
                }
            } else {
                // Fallback: Base64 decode
                extractedData = JSON.parse(decodeURIComponent(escape(atob(encryptedData))));
            }
            
            console.log('📦 Autofill data loaded:', extractedData);
            
            // Apply data to form
            applyAutoFillData(extractedData);
            
            // Show notification
            showAutoFillNotification(extractedData.confidence || {});
            
            // Self-destruct: Remove data immediately after use
            clearAutofillData();
            
        } catch (error) {
            console.error('❌ Autofill error:', error);
            clearAutofillData();
        }
    }
    
    /**
     * Clear autofill data from storage
     */
    function clearAutofillData() {
        sessionStorage.removeItem('_chatbot_autofill');
        sessionStorage.removeItem('_autofill_timestamp');
        sessionStorage.removeItem('_autofill_key');
        console.log('🗑️ Autofill data cleared');
    }
    
    /**
     * Apply extracted data to form fields
     */
    function applyAutoFillData(data) {
        console.log('🔄 Applying autofill data...');
        
        const fieldMappings = [
            { key: 'pelakuKekerasan', id: 'pelakuKekerasan', step: 4, type: 'select' },
            { key: 'waktuKejadian', id: 'waktuKejadian', step: 4, type: 'date', transform: formatDateForInput },
            { key: 'lokasiKejadian', id: 'lokasiKejadian', step: 4, type: 'select' },
            { key: 'detailKejadian', id: 'detailKejadian', step: 4, type: 'textarea' },
            { key: 'usiaKorban', id: 'usiaKorban', step: 5, type: 'select' },
            { key: 'genderKorban', id: 'genderKorban', step: 3, type: 'radio' },
            { key: 'tingkatKekhawatiran', id: 'kehawatiran', step: 2, type: 'choice-card' },
            { key: 'korbanSebagai', id: 'korban', step: 2, type: 'choice-card' }
        ];
        
        let filledCount = 0;
        
        fieldMappings.forEach(mapping => {
            let value = data[mapping.key];
            
            if (!value || value === 'null' || value === null) {
                console.log(`⏭️ Skipping ${mapping.key}: no value`);
                return;
            }
            
            // Apply transformation if needed
            if (mapping.transform) {
                value = mapping.transform(value);
                if (!value) {
                    console.log(`⏭️ Skipping ${mapping.key}: transform returned null`);
                    return;
                }
            }
            
            const filled = fillField(mapping, value, data.confidence);
            if (filled) {
                filledCount++;
                console.log(`✅ Filled ${mapping.key}: ${value}`);
            }
        });
        
        console.log(`✅ Autofill complete: ${filledCount} fields filled`);
        
        // Update form state
        updateFormStateAfterAutofill(data);
    }
    
    /**
     * Fill a single field based on its type
     */
    function fillField(mapping, value, confidence) {
        const element = document.getElementById(mapping.id);
        
        if (mapping.type === 'choice-card') {
            return fillChoiceCard(mapping.id, value, confidence);
        }
        
        if (!element) {
            console.warn(`⚠️ Element not found: ${mapping.id}`);
            return false;
        }
        
        // Add visual indicator for autofilled fields
        element.classList.add('autofilled');
        
        switch (mapping.type) {
            case 'select':
                return fillSelect(element, value, confidence, mapping.key);
                
            case 'date':
                element.value = value;
                element.dispatchEvent(new Event('change', { bubbles: true }));
                addConfidenceIndicator(element, confidence?.waktu || 0.7);
                return true;
                
            case 'textarea':
            case 'input':
                element.value = value;
                element.dispatchEvent(new Event('input', { bubbles: true }));
                addConfidenceIndicator(element, confidence?.detail || 0.8);
                return true;
                
            case 'radio':
                return fillRadio(mapping.id, value, confidence);
                
            default:
                element.value = value;
                return true;
        }
    }
    
    /**
     * Fill select dropdown
     */
    function fillSelect(element, value, confidence, fieldKey) {
        const normalizedValue = value.toLowerCase().trim();
        
        // Find matching option
        const option = Array.from(element.options).find(opt => {
            const optValue = opt.value.toLowerCase().trim();
            const optText = opt.textContent.toLowerCase().trim();
            return optValue === normalizedValue || 
                   optText === normalizedValue ||
                   optValue.includes(normalizedValue) ||
                   normalizedValue.includes(optValue);
        });
        
        if (option) {
            element.value = option.value;
            element.dispatchEvent(new Event('change', { bubbles: true }));
            addConfidenceIndicator(element, confidence?.[fieldKey] || 0.7);
            return true;
        }
        
        console.warn(`⚠️ No matching option for ${fieldKey}: ${value}`);
        return false;
    }
    
    /**
     * Fill radio button
     */
    function fillRadio(name, value, confidence) {
        const normalizedValue = value.toLowerCase().trim();
        const radios = document.querySelectorAll(`input[name="${name}"]`);
        
        for (const radio of radios) {
            const radioValue = radio.value.toLowerCase().trim();
            if (radioValue === normalizedValue || radioValue.includes(normalizedValue)) {
                radio.checked = true;
                radio.dispatchEvent(new Event('change', { bubbles: true }));
                radio.closest('.lapor-gender-option')?.classList.add('selected', 'autofilled');
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Fill choice card (step 2 selections)
     */
    function fillChoiceCard(groupName, value, confidence) {
        const normalizedValue = value.toLowerCase().trim();
        const cards = document.querySelectorAll(`[data-group="${groupName}"] .lapor-choice, .lapor-choice[data-group="${groupName}"]`);
        
        // Also try by radio name
        const radios = document.querySelectorAll(`input[name="${groupName}"]`);
        
        for (const radio of radios) {
            const card = radio.closest('.lapor-choice');
            if (!card) continue;
            
            const cardValue = card.getAttribute('data-value')?.toLowerCase().trim() || '';
            const radioValue = radio.value.toLowerCase().trim();
            
            if (cardValue === normalizedValue || 
                radioValue === normalizedValue ||
                cardValue.includes(normalizedValue) ||
                normalizedValue.includes(cardValue)) {
                
                // Simulate click
                card.classList.add('selected', 'autofilled');
                radio.checked = true;
                
                // Update step status
                if (groupName === 'korban') {
                    step2Status.korban = true;
                    formData.korban = card.getAttribute('data-value');
                } else if (groupName === 'kehawatiran') {
                    step2Status.kehawatiran = true;
                    formData.kehawatiran = card.getAttribute('data-value');
                }
                
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Update form state after autofill
     */
    function updateFormStateAfterAutofill(data) {
        // Update button states
        const btnLanjutkan2 = document.getElementById('btnLanjutkan2');
        if (btnLanjutkan2 && step2Status.korban && step2Status.kehawatiran) {
            btnLanjutkan2.disabled = false;
        }
        
        const btnLanjutkan3 = document.getElementById('btnLanjutkan3');
        if (btnLanjutkan3 && formData.genderKorban) {
            btnLanjutkan3.disabled = false;
        }
        
        // Update form data object
        if (data.pelakuKekerasan) formData.pelakuKekerasan = data.pelakuKekerasan;
        if (data.waktuKejadian) formData.waktuKejadian = formatDateForInput(data.waktuKejadian);
        if (data.lokasiKejadian) formData.lokasiKejadian = data.lokasiKejadian;
        if (data.detailKejadian) formData.detailKejadian = data.detailKejadian;
        if (data.genderKorban) formData.genderKorban = data.genderKorban;
        if (data.usiaKorban) formData.usiaKorban = data.usiaKorban;
        
        // Validate step 4 if we have data for it
        validateStep4();
    }
    
    /**
     * Format date for input field (YYYY-MM-DD)
     */
    function formatDateForInput(dateString) {
        if (!dateString) return '';
        
        // Already in correct format
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return dateString;
        }
        
        // Try parsing with Date
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
        }
        
        // Handle Indonesian relative dates
        const lower = dateString.toLowerCase();
        const today = new Date();
        
        if (lower.includes('hari ini') || lower.includes('tadi')) {
            return today.toISOString().split('T')[0];
        }
        
        if (lower.includes('kemarin')) {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            return yesterday.toISOString().split('T')[0];
        }
        
        return ''; // Invalid date, let user fill manually
    }
    
    /**
     * Add confidence indicator to field
     */
    function addConfidenceIndicator(element, score) {
        // Remove existing indicator
        const existingIndicator = element.parentElement?.querySelector('.confidence-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        const indicator = document.createElement('span');
        indicator.className = 'confidence-indicator';
        
        if (score >= 0.8) {
            indicator.innerHTML = '✓ <span>Tinggi</span>';
            indicator.classList.add('high');
        } else if (score >= 0.5) {
            indicator.innerHTML = '⚠️ <span>Sedang</span>';
            indicator.classList.add('medium');
        } else {
            indicator.innerHTML = '❓ <span>Rendah</span>';
            indicator.classList.add('low');
        }
        
        element.parentElement?.appendChild(indicator);
    }
    
    /**
     * Show autofill notification
     */
    function showAutoFillNotification(confidenceScores) {
        // Remove existing notification
        const existingNotif = document.querySelector('.autofill-notification');
        if (existingNotif) existingNotif.remove();
        
        const notification = document.createElement('div');
        notification.className = 'autofill-notification';
        notification.innerHTML = `
            <div class="autofill-header">
                <i class="fas fa-robot"></i>
                <h4>Formulir Terisi Otomatis</h4>
                <button class="autofill-close" onclick="this.closest('.autofill-notification').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <p>Data dari percakapanmu dengan TemanKu sudah diisi. Silakan periksa dan ubah jika perlu.</p>
            <div class="autofill-legend">
                <span class="legend-item high"><span class="dot"></span> Tinggi</span>
                <span class="legend-item medium"><span class="dot"></span> Sedang</span>
                <span class="legend-item low"><span class="dot"></span> Perlu Cek</span>
            </div>
            <div class="autofill-actions">
                <button class="btn-review" onclick="reviewAutoFilledFields()">
                    <i class="fas fa-search"></i> Periksa Field
                </button>
                <button class="btn-dismiss" onclick="this.closest('.autofill-notification').remove()">
                    Mengerti
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-dismiss after 15 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOutRight 0.3s ease-out forwards';
                setTimeout(() => notification.remove(), 300);
            }
        }, 15000);
    }
    
    /**
     * Review autofilled fields - highlight them
     */
    window.reviewAutoFilledFields = function() {
        const autofilledFields = document.querySelectorAll('.autofilled');
        
        if (autofilledFields.length === 0) {
            alert('Tidak ada field yang terisi otomatis.');
            return;
        }
        
        // Highlight all autofilled fields
        autofilledFields.forEach((field, index) => {
            setTimeout(() => {
                field.style.animation = 'highlightPulse 1.5s ease-in-out';
                field.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                setTimeout(() => {
                    field.style.animation = '';
                }, 1500);
            }, index * 800);
        });
        
        // Close notification
        const notif = document.querySelector('.autofill-notification');
        if (notif) notif.remove();
    };
    
    /**
     * Inject autofill-specific styles
     */
    function injectAutofillStyles() {
        if (document.getElementById('autofillStyles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'autofillStyles';
        styles.textContent = `
            /* Autofilled field styling */
            .lapor-input.autofilled,
            .lapor-textarea.autofilled,
            .lapor-select.autofilled {
                background: linear-gradient(90deg, rgba(102, 126, 234, 0.1) 0%, rgba(255, 255, 255, 1) 100%);
                border-left: 4px solid #667eea;
                animation: pulseGlow 1.5s ease-in-out;
            }
            
            .lapor-choice.autofilled {
                border-color: #667eea;
                background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
            }
            
            .lapor-gender-option.autofilled {
                border-color: #667eea;
            }
            
            @keyframes pulseGlow {
                0%, 100% { box-shadow: 0 0 0 0 rgba(102, 126, 234, 0); }
                50% { box-shadow: 0 0 15px 3px rgba(102, 126, 234, 0.3); }
            }
            
            @keyframes highlightPulse {
                0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(102, 126, 234, 0); }
                25% { transform: scale(1.02); box-shadow: 0 0 20px 5px rgba(102, 126, 234, 0.4); }
                75% { transform: scale(1.02); box-shadow: 0 0 20px 5px rgba(102, 126, 234, 0.4); }
            }
            
            /* Confidence indicator */
            .confidence-indicator {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                font-size: 11px;
                margin-left: 10px;
                padding: 3px 10px;
                border-radius: 12px;
                font-weight: 600;
                position: absolute;
                right: 10px;
                top: 50%;
                transform: translateY(-50%);
            }
            
            .confidence-indicator.high {
                background: rgba(76, 175, 80, 0.15);
                color: #2e7d32;
            }
            
            .confidence-indicator.medium {
                background: rgba(255, 193, 7, 0.15);
                color: #f57c00;
            }
            
            .confidence-indicator.low {
                background: rgba(244, 67, 54, 0.15);
                color: #c62828;
            }
            
            /* Input wrapper for confidence indicator positioning */
            .input-group {
                position: relative;
            }
            
            /* Autofill notification */
            .autofill-notification {
                position: fixed;
                top: 100px;
                right: 20px;
                max-width: 380px;
                background: white;
                border-radius: 16px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                padding: 20px;
                z-index: 10000;
                animation: slideInRight 0.4s ease-out;
                border-left: 4px solid #667eea;
            }
            
            @keyframes slideInRight {
                from { transform: translateX(420px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(420px); opacity: 0; }
            }
            
            .autofill-header {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 12px;
            }
            
            .autofill-header i.fa-robot {
                font-size: 24px;
                color: #667eea;
            }
            
            .autofill-header h4 {
                margin: 0;
                color: #333;
                font-size: 16px;
                flex: 1;
            }
            
            .autofill-close {
                background: none;
                border: none;
                color: #999;
                cursor: pointer;
                padding: 5px;
                font-size: 14px;
            }
            
            .autofill-close:hover {
                color: #333;
            }
            
            .autofill-notification p {
                color: #666;
                margin: 0 0 15px;
                font-size: 14px;
                line-height: 1.5;
            }
            
            .autofill-legend {
                display: flex;
                gap: 15px;
                margin-bottom: 15px;
                font-size: 12px;
            }
            
            .legend-item {
                display: flex;
                align-items: center;
                gap: 5px;
                color: #666;
            }
            
            .legend-item .dot {
                width: 10px;
                height: 10px;
                border-radius: 50%;
            }
            
            .legend-item.high .dot { background: #4caf50; }
            .legend-item.medium .dot { background: #ff9800; }
            .legend-item.low .dot { background: #f44336; }
            
            .autofill-actions {
                display: flex;
                gap: 10px;
            }
            
            .autofill-actions button {
                flex: 1;
                padding: 10px 15px;
                border: none;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 13px;
            }
            
            .btn-review {
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
            }
            
            .btn-review:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }
            
            .btn-dismiss {
                background: #f0f0f0;
                color: #666;
            }
            
            .btn-dismiss:hover {
                background: #e0e0e0;
            }
            
            /* Mobile responsive */
            @media (max-width: 480px) {
                .autofill-notification {
                    top: auto;
                    bottom: 20px;
                    left: 10px;
                    right: 10px;
                    max-width: none;
                }
                
                .confidence-indicator {
                    position: static;
                    transform: none;
                    margin-top: 5px;
                    display: inline-flex;
                }
            }
        `;
        document.head.appendChild(styles);
    }

    // ============================================
    // CHOICE CARDS HANDLER (Step 1 & 2)
    // ============================================
    function initChoiceCards() {
        const choiceCards = document.querySelectorAll('.lapor-choice');
        
        choiceCards.forEach(card => {
            card.addEventListener('click', function() {
                const radioInput = this.querySelector('input[type="radio"]');
                const radioName = radioInput.name;
                const groupName = this.getAttribute('data-group');
                
                // Remove selected from same group
                document.querySelectorAll(`input[name="${radioName}"]`).forEach(radio => {
                    radio.closest('.lapor-choice').classList.remove('selected');
                });
                
                // Add selected to clicked card
                this.classList.add('selected');
                radioInput.checked = true;
                
                // Store in formData
                formData[radioName] = this.getAttribute('data-value');
                
                // Handle different steps
                if (radioName === 'statusDarurat') {
                    handleStep1Selection();
                } else if (groupName) {
                    handleStep2Selection(groupName);
                }
            });
        });
    }

    // ============================================
    // STEP 1: KEADAAN DARURAT
    // ============================================
    function initStep1() {
        // Button still needed for manual navigation or accessibility
        const btnLanjutkan1 = document.getElementById('btnLanjutkan1');
        
        if (btnLanjutkan1) {
            btnLanjutkan1.addEventListener('click', function() {
                processStep1();
            });
        }
    }

    function handleStep1Selection() {
        const btnLanjutkan1 = document.getElementById('btnLanjutkan1');
        if (btnLanjutkan1 && formData.statusDarurat) {
            btnLanjutkan1.disabled = false;
        }

        // AUTO-ADVANCE LOGIC
        setTimeout(() => {
            processStep1();
        }, 300); // Small delay for visual feedback
    }

    function processStep1() {
        if (formData.statusDarurat === 'darurat') {
            redirectToWhatsApp();
        } else if (formData.statusDarurat === 'tidak') {
            goToStep(2);
        }
    }

    function redirectToWhatsApp() {
        const phoneNumber = '6281234567890';
        const message = encodeURIComponent('🚨 DARURAT! Saya membutuhkan bantuan segera dari Satgas PPKPT.');
        window.location.href = `https://wa.me/${phoneNumber}?text=${message}`;
    }

    // ============================================
    // STEP 2: KORBAN & KEHAWATIRAN
    // ============================================
    function initStep2() {
        const btnKembali2 = document.getElementById('btnKembali2');
        const btnLanjutkan2 = document.getElementById('btnLanjutkan2');
        
        if (btnKembali2) {
            btnKembali2.addEventListener('click', function() {
                resetStep2();
                goToStep(1);
            });
        }
        
        if (btnLanjutkan2) {
            btnLanjutkan2.addEventListener('click', function() {
                if (step2Status.korban && step2Status.kehawatiran) {
                    goToStep(3);
                }
            });
        }
    }

    function handleStep2Selection(groupName) {
        if (groupName === 'korban') {
            step2Status.korban = true;
            // Scroll to next section smoothly if worry level not picked yet
            if (!step2Status.kehawatiran) {
                const worrySection = document.querySelector('.lapor-choice[data-group="kehawatiran"]');
                if (worrySection) {
                    worrySection.closest('.form-group').scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        } else if (groupName === 'kehawatiran') {
            step2Status.kehawatiran = true;
        }
        
        const btnLanjutkan2 = document.getElementById('btnLanjutkan2');
        
        // AUTO-ADVANCE LOGIC
        if (step2Status.korban && step2Status.kehawatiran) {
            if (btnLanjutkan2) btnLanjutkan2.disabled = false;
            
            console.log('Step 2 Complete (Auto):', formData);
            setTimeout(() => {
                goToStep(3);
            }, 400); // Slightly longer delay to register the second click
        } else if (btnLanjutkan2 && (step2Status.korban || step2Status.kehawatiran)) {
            // Keep disabled until both are selected
             // but maybe highlight missing part?
        }
    }

    function resetStep2() {
        step2Status.korban = false;
        step2Status.kehawatiran = false;
        
        const btnLanjutkan2 = document.getElementById('btnLanjutkan2');
        if (btnLanjutkan2) {
            btnLanjutkan2.disabled = true;
        }
    }

    // ============================================
    // STEP 3: GENDER KORBAN
    // ============================================
    function initStep3() {
        const genderRadios = document.querySelectorAll('input[name="genderKorban"]');
        const btnKembali3 = document.getElementById('btnKembali3');
        const btnLanjutkan3 = document.getElementById('btnLanjutkan3');
        
        genderRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.checked) {
                    formData.genderKorban = this.value;
                    if (btnLanjutkan3) {
                        btnLanjutkan3.disabled = false;
                    }

                    // AUTO-ADVANCE LOGIC
                    console.log('Step 3 Complete (Auto):', formData);
                    setTimeout(() => {
                        goToStep(4);
                    }, 300);
                }
            });
        });
        
        if (btnKembali3) {
            btnKembali3.addEventListener('click', function() {
                goToStep(2);
            });
        }
        
        if (btnLanjutkan3) {
            btnLanjutkan3.addEventListener('click', function() {
                if (formData.genderKorban) {
                    goToStep(4);
                }
            });
        }
    }

    // ============================================
    // STEP 4: DATA KEJADIAN KEKERASAN - FIXED!
    // ============================================
    function initStep4() {
        const pelakuKekerasan = document.getElementById('pelakuKekerasan');
        const waktuKejadian = document.getElementById('waktuKejadian');
        const lokasiKejadian = document.getElementById('lokasiKejadian');
        const detailKejadian = document.getElementById('detailKejadian');
        const btnKembali4 = document.getElementById('btnKembali4');
        const btnLanjutkan4 = document.getElementById('btnLanjutkan4');
        
        // ========================================
        // NEW: Set max date to today for date input
        // ========================================
        if (waktuKejadian && waktuKejadian.type === 'date') {
            const today = new Date();
            const maxDate = today.toISOString().split('T')[0];
            waktuKejadian.setAttribute('max', maxDate);
            console.log('✅ Date input max set to:', maxDate);
        }
        // ========================================
        
        if (pelakuKekerasan) {
            pelakuKekerasan.addEventListener('change', function() {
                formData.pelakuKekerasan = this.value;
                validateStep4();
            });
            
            pelakuKekerasan.addEventListener('blur', function() {
                if (!this.value) {
                    showError('errorPelaku', this);
                } else {
                    hideError('errorPelaku', this);
                }
            });
        }
        
        // ========================================
        // FIXED: Handle date input properly
        // ========================================
        if (waktuKejadian) {
            waktuKejadian.addEventListener('change', function() {
                formData.waktuKejadian = this.value; // Already YYYY-MM-DD format
                
                // Validate: not future date
                const selectedDate = new Date(this.value);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                if (selectedDate > today) {
                    showError('errorWaktu', this);
                    document.getElementById('errorWaktu').textContent = 'Tanggal tidak boleh di masa depan';
                    formData.waktuKejadian = null;
                } else {
                    hideError('errorWaktu', this);
                }
                
                validateStep4();
            });
            
            waktuKejadian.addEventListener('blur', function() {
                if (!this.value) {
                    showError('errorWaktu', this);
                    document.getElementById('errorWaktu').textContent = 'Tanggal kejadian wajib diisi';
                }
            });
        }
        // ========================================
        
        if (lokasiKejadian) {
            lokasiKejadian.addEventListener('change', function() {
                formData.lokasiKejadian = this.value;
                validateStep4();
            });
            
            lokasiKejadian.addEventListener('blur', function() {
                if (!this.value) {
                    showError('errorLokasi', this);
                } else {
                    hideError('errorLokasi', this);
                }
            });
        }
        
        if (detailKejadian) {
            detailKejadian.addEventListener('input', function() {
                formData.detailKejadian = this.value;
                validateStep4();
            });
            
            detailKejadian.addEventListener('blur', function() {
                if (!this.value || this.value.length < 20) {
                    showError('errorDetail', this);
                } else {
                    hideError('errorDetail', this);
                }
            });
        }
        
        // File upload
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', handleFileUpload);
        }
        
        // Drag and drop
        const uploadArea = document.getElementById('uploadArea');
        const btnSelectFiles = document.getElementById('btnSelectFiles');
        
        if (uploadArea && fileInput) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, preventDefaults, false);
                document.body.addEventListener(eventName, preventDefaults, false);
            });
            
            ['dragenter', 'dragover'].forEach(eventName => {
                uploadArea.addEventListener(eventName, () => {
                    uploadArea.classList.add('dragover');
                }, false);
            });
            
            ['dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, () => {
                    uploadArea.classList.remove('dragover');
                }, false);
            });
            
            uploadArea.addEventListener('drop', (e) => {
                const dt = e.dataTransfer;
                const files = dt.files;
                handleFileUpload({ target: { files: files } });
            }, false);
            
            if (btnSelectFiles) {
                btnSelectFiles.addEventListener('click', () => {
                    fileInput.click();
                });
            }
            
            uploadArea.addEventListener('click', (e) => {
                if (e.target.closest('.btn-upload')) return;
                fileInput.click();
            });
        }
        
        if (btnKembali4) {
            btnKembali4.addEventListener('click', function() {
                goToStep(3);
            });
        }
        
        if (btnLanjutkan4) {
            btnLanjutkan4.addEventListener('click', function() {
                if (validateStep4()) {
                    console.log('Step 4 Complete:', formData);
                    goToStep(5);
                }
            });
        }
    }

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function validateStep4() {
        const pelaku = document.getElementById('pelakuKekerasan');
        const waktu = document.getElementById('waktuKejadian');
        const lokasi = document.getElementById('lokasiKejadian');
        const detail = document.getElementById('detailKejadian');
        const btnLanjutkan4 = document.getElementById('btnLanjutkan4');
        
        const isValid = pelaku && pelaku.value &&
                       waktu && waktu.value &&
                       lokasi && lokasi.value &&
                       detail && detail.value && detail.value.length >= 20;
        
        if (btnLanjutkan4) {
            btnLanjutkan4.disabled = !isValid;
        }
        
        return isValid;
    }

    function handleFileUpload(event) {
        const files = Array.from(event.target.files);
        
        files.forEach(file => {
            if (uploadedFiles.length >= MAX_FILES) {
                alert(`Maksimal ${MAX_FILES} file!`);
                return;
            }
            
            if (!ALLOWED_TYPES.includes(file.type)) {
                alert(`File ${file.name} tidak didukung. Hanya JPG, PNG, MP4, MOV yang diperbolehkan.`);
                return;
            }
            
            if (file.size > MAX_FILE_SIZE) {
                alert(`File ${file.name} terlalu besar. Maksimal 10MB.`);
                return;
            }
            
            uploadedFiles.push(file);
            displayFilePreview(file);
        });
        
        formData.buktiFiles = uploadedFiles;
        event.target.value = '';
    }

    function displayFilePreview(file) {
        const filePreviewContainer = document.getElementById('filePreviewContainer');
        if (!filePreviewContainer) return;
        
        const previewItem = document.createElement('div');
        previewItem.className = 'file-preview-item';
        previewItem.setAttribute('data-file-name', file.name);
        
        const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
        const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);
        
        if (isImage) {
            const reader = new FileReader();
            reader.onload = function(e) {
                previewItem.innerHTML = `
                    <img src="${e.target.result}" alt="${file.name}" class="file-preview-image">
                    <div class="file-preview-info">
                        <div class="file-preview-name">${file.name}</div>
                        <div class="file-preview-size">${formatFileSize(file.size)}</div>
                    </div>
                    <button class="file-preview-remove" onclick="window.removeFile('${file.name}')">
                        <i class="fas fa-times"></i>
                    </button>
                `;
            };
            reader.readAsDataURL(file);
        } else if (isVideo) {
            previewItem.innerHTML = `
                <video class="file-preview-video" controls>
                    <source src="${URL.createObjectURL(file)}" type="${file.type}">
                </video>
                <div class="file-preview-video-icon">
                    <i class="fas fa-play-circle"></i>
                </div>
                <div class="file-preview-info">
                    <div class="file-preview-name">${file.name}</div>
                    <div class="file-preview-size">${formatFileSize(file.size)}</div>
                </div>
                <button class="file-preview-remove" onclick="window.removeFile('${file.name}')">
                    <i class="fas fa-times"></i>
                </button>
            `;
        }
        
        filePreviewContainer.appendChild(previewItem);
        updateFileCountIndicator();
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    window.removeFile = function(fileName) {
        const index = uploadedFiles.findIndex(f => f.name === fileName);
        if (index > -1) {
            uploadedFiles.splice(index, 1);
            formData.buktiFiles = uploadedFiles;
        }
        
        const filePreviewContainer = document.getElementById('filePreviewContainer');
        const previewItem = filePreviewContainer.querySelector(`[data-file-name="${fileName}"]`);
        if (previewItem) {
            previewItem.style.opacity = '0';
            previewItem.style.transform = 'scale(0.8)';
            setTimeout(() => {
                previewItem.remove();
                updateFileCountIndicator();
            }, 300);
        }
        
        validateStep4();
    };

    function updateFileCountIndicator() {
        const filePreviewContainer = document.getElementById('filePreviewContainer');
        if (!filePreviewContainer) return;
        
        const existingIndicator = filePreviewContainer.querySelector('.file-count-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        if (uploadedFiles.length > 0) {
            const indicator = document.createElement('div');
            indicator.className = 'file-count-indicator';
            indicator.innerHTML = `
                <i class="fas fa-check-circle"></i>
                <span>${uploadedFiles.length} file diunggah (Max ${MAX_FILES})</span>
            `;
            filePreviewContainer.appendChild(indicator);
        }
    }

    // ============================================
    // STEP 5: DATA PRIBADI KORBAN
    // ============================================
    function initStep5() {
        const emailKorban = document.getElementById('emailKorban');
        const usiaKorban = document.getElementById('usiaKorban');
        const whatsappKorban = document.getElementById('whatsappKorban');
        const disabilitasRadios = document.querySelectorAll('input[name="disabilitasStatus"]');
        const jenisDisabilitasContainer = document.getElementById('jenisDisabilitasContainer');
        const jenisDisabilitas = document.getElementById('jenisDisabilitas');
        const btnKembali5 = document.getElementById('btnKembali5');
        const btnKirimPengaduan = document.getElementById('btnKirimPengaduan');
        
        if (emailKorban) {
            emailKorban.addEventListener('change', function() {
                formData.emailKorban = this.value;
                validateStep5();
            });
        }
        
        if (usiaKorban) {
            usiaKorban.addEventListener('change', function() {
                formData.usiaKorban = this.value;
                validateStep5();
            });
        }
        
        if (whatsappKorban) {
            whatsappKorban.addEventListener('change', function() {
                formData.whatsappKorban = this.value;
                validateStep5();
            });
        }
        
        disabilitasRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                formData.disabilitasStatus = this.value;
                
                if (jenisDisabilitasContainer) {
                    if (this.value === 'ya') {
                        jenisDisabilitasContainer.classList.remove('hidden');
                    } else {
                        jenisDisabilitasContainer.classList.add('hidden');
                        formData.jenisDisabilitas = null;
                        if (jenisDisabilitas) {
                            jenisDisabilitas.value = '';
                        }
                    }
                }
                
                validateStep5();
            });
        });
        
        if (jenisDisabilitas) {
            jenisDisabilitas.addEventListener('change', function() {
                formData.jenisDisabilitas = this.value;
                validateStep5();
            });
        }
        
        if (btnKembali5) {
            btnKembali5.addEventListener('click', function() {
                goToStep(4);
            });
        }
        
        if (btnKirimPengaduan) {
            btnKirimPengaduan.addEventListener('click', function(e) {
                e.preventDefault();
                if (validateStep5()) {
                    submitForm();
                }
            });
        }
    }

    function validateStep5() {
        const usia = document.getElementById('usiaKorban');
        const btnKirimPengaduan = document.getElementById('btnKirimPengaduan');
        
        const isValid = usia && usia.value;
        
        if (btnKirimPengaduan) {
            btnKirimPengaduan.disabled = !isValid;
        }
        
        return isValid;
    }

    // ============================================
    // FORM SUBMISSION - WITH FILE UPLOAD
    // ============================================
    async function submitForm() {
        console.log('=== FORM SUBMISSION START ===');
        console.log('Form Data (Frontend):', formData);

        const btnKirimPengaduan = document.getElementById('btnKirimPengaduan');

        if (btnKirimPengaduan) {
            btnKirimPengaduan.disabled = true;
            btnKirimPengaduan.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';
        }

        try {
            // Use FormData to support file uploads
            const submitData = new FormData();

            // Add form fields
            submitData.append('statusDarurat', formData.statusDarurat || '');
            submitData.append('korbanSebagai', formData.korban || '');
            submitData.append('tingkatKekhawatiran', formData.kehawatiran || '');
            submitData.append('genderKorban', formData.genderKorban || '');
            submitData.append('pelakuKekerasan', formData.pelakuKekerasan || '');
            submitData.append('waktuKejadian', formData.waktuKejadian || '');
            submitData.append('lokasiKejadian', formData.lokasiKejadian || '');
            submitData.append('detailKejadian', formData.detailKejadian || '');
            submitData.append('emailKorban', formData.emailKorban || '');
            submitData.append('usiaKorban', formData.usiaKorban || '');
            submitData.append('whatsappKorban', formData.whatsappKorban || '');
            submitData.append('statusDisabilitas', formData.disabilitasStatus || 'tidak');
            submitData.append('jenisDisabilitas', formData.jenisDisabilitas || '');

            // Add files if present
            if (uploadedFiles && uploadedFiles.length > 0) {
                console.log('📎 Adding files to upload:', uploadedFiles.length);
                uploadedFiles.forEach((file, index) => {
                    submitData.append('buktiFiles[]', file);
                    console.log(`  File ${index + 1}: ${file.name} (${formatFileSize(file.size)})`);
                });
            }

            console.log('Sending FormData to Backend...');

            const response = await fetch('../api/submit_laporan.php', {
                method: 'POST',
                // Don't set Content-Type header - browser will set it with boundary for multipart/form-data
                body: submitData
            });

            console.log('Response Status:', response.status);

            const result = await response.json();
            console.log('API Response:', result);

            if (result.success && result.data && result.data.kode_pelaporan) {
                const kodeLaporan = result.data.kode_pelaporan;
                const laporanId = result.data.laporan_id;
                const uploadedCount = result.data.uploaded_files || 0;

                console.log('✅ Laporan berhasil terkirim!');
                console.log('Kode Pelaporan:', kodeLaporan);
                console.log('Files Uploaded:', uploadedCount);

                formData.reportCode = kodeLaporan;
                formData.laporanId = laporanId;
                formData.timestamp = new Date().toISOString();
                formData.status = 'Process';
                saveToLocalStorage();

                showSuccessModal(kodeLaporan);

            } else {
                console.error('❌ Server Error:', result);

                if (result.errors) {
                    showValidationErrors(result.errors);
                } else {
                    throw new Error(result.message || 'Gagal mengirim laporan ke server');
                }
            }

        } catch (error) {
            console.error('❌ Error submitting form:', error);

            if (btnKirimPengaduan) {
                btnKirimPengaduan.disabled = false;
                btnKirimPengaduan.innerHTML = '<i class="fas fa-paper-plane"></i> Kirim Pengaduan';
            }

            showErrorModal(error.message);
        }
    }

    // ============================================
    // SUCCESS MODAL
    // ============================================
    function showSuccessModal(kodeLaporan) {
        const modalHTML = `
            <div class="success-modal-overlay" id="successModal">
                <div class="success-modal">
                    <div class="success-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <h2>Laporan Berhasil Dikirim!</h2>
                    <p>Terima kasih telah melaporkan. Tim kami akan segera menindaklanjuti laporan Anda.</p>
                    <div class="report-code-box">
                        <label>Kode Laporan Anda:</label>
                        <div class="report-code" id="reportCodeText">${kodeLaporan}</div>
                        <button class="btn-copy-code" id="btnCopyCode">
                            <i class="fas fa-copy"></i> Salin Kode
                        </button>
                    </div>
                    <p class="note">
                        <i class="fas fa-info-circle"></i>
                        Simpan kode ini untuk melacak progress laporan Anda di halaman Monitoring.
                    </p>
                    <button class="btn-close-modal" id="btnCloseModal">
                        Mengerti
                    </button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        document.getElementById('btnCopyCode').addEventListener('click', function() {
            copyReportCode(kodeLaporan, this);
        });

        document.getElementById('btnCloseModal').addEventListener('click', function() {
            closeSuccessModal();
            setTimeout(() => {
                window.location.href = `../Landing Page/Landing_Page.html?submitted=true&kode=${kodeLaporan}`;
            }, 300);
        });
    }

    function copyReportCode(code, button) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(code).then(() => {
                const originalHTML = button.innerHTML;
                button.innerHTML = '<i class="fas fa-check"></i> Tersalin!';
                button.style.background = '#4caf50';
                
                setTimeout(() => {
                    button.innerHTML = originalHTML;
                    button.style.background = '#667eea';
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy:', err);
                alert('Kode laporan: ' + code);
            });
        } else {
            alert('Kode laporan: ' + code);
        }
    }

    function closeSuccessModal() {
        const modal = document.getElementById('successModal');
        if (modal) {
            modal.style.animation = 'fadeOut 0.3s';
            setTimeout(() => modal.remove(), 300);
        }
    }

    // ============================================
    // ERROR HANDLING
    // ============================================
    function showValidationErrors(errors) {
        let errorMessage = '❌ Validasi Gagal:\n\n';
        for (const [field, message] of Object.entries(errors)) {
            errorMessage += `• ${message}\n`;
        }
        alert(errorMessage);
    }

    function showErrorModal(errorMessage) {
        alert(`❌ Gagal Mengirim Laporan!\n\n${errorMessage}\n\nSilakan coba lagi atau hubungi admin jika masalah berlanjut.`);
    }

    function showError(errorId, inputElement) {
        const errorElement = document.getElementById(errorId);
        if (errorElement) {
            errorElement.classList.add('show');
        }
        if (inputElement) {
            inputElement.classList.add('error');
        }
    }

    function hideError(errorId, inputElement) {
        const errorElement = document.getElementById(errorId);
        if (errorElement) {
            errorElement.classList.remove('show');
        }
        if (inputElement) {
            inputElement.classList.remove('error');
        }
    }

    // ============================================
    // NAVIGATION
    // ============================================
    function goToStep(stepNumber) {
        if (stepNumber < 1 || stepNumber > totalSteps) return;
        
        formSteps.forEach(step => {
            step.classList.remove('active');
        });
        
        const targetStep = document.getElementById(`step${stepNumber}`);
        if (targetStep) {
            targetStep.classList.add('active');
        }
        
        currentStep = stepNumber;
        updateProgress();
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function updateProgress() {
        const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;
        
        if (progressBar) {
            progressBar.style.width = progress + '%';
        }
        
        if (currentStepNumber) {
            currentStepNumber.textContent = currentStep;
        }
    }

    // ============================================
    // LOCAL STORAGE
    // ============================================
    function saveToLocalStorage() {
        try {
            const existingReports = JSON.parse(localStorage.getItem('laporFormData')) || [];
            existingReports.push(formData);
            localStorage.setItem('laporFormData', JSON.stringify(existingReports));
            console.log('✅ Form data saved to localStorage');
        } catch (error) {
            console.error('❌ Error saving to localStorage:', error);
        }
    }

    // ============================================
    // INJECT MODAL STYLES
    // ============================================
    function injectModalStyles() {
        if (document.getElementById('successModalStyles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'successModalStyles';
        styles.textContent = `
            .success-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.6);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.3s;
            }
            .success-modal {
                background: white;
                border-radius: 20px;
                padding: 40px;
                max-width: 500px;
                width: 90%;
                text-align: center;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                animation: slideUp 0.3s;
            }
            .success-icon {
                font-size: 80px;
                color: #4caf50;
                margin-bottom: 20px;
            }
            .success-modal h2 {
                color: #333;
                margin-bottom: 15px;
                font-size: 24px;
            }
            .success-modal p {
                color: #666;
                margin-bottom: 25px;
                line-height: 1.6;
            }
            .report-code-box {
                background: #f5f5f5;
                padding: 20px;
                border-radius: 12px;
                margin-bottom: 20px;
            }
            .report-code-box label {
                display: block;
                font-weight: 600;
                color: #666;
                margin-bottom: 10px;
                font-size: 14px;
            }
            .report-code {
                font-size: 28px;
                font-weight: 700;
                color: #667eea;
                font-family: 'Courier New', monospace;
                margin-bottom: 15px;
                letter-spacing: 2px;
            }
            .btn-copy-code {
                background: #667eea;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.2s;
                font-size: 14px;
            }
            .btn-copy-code:hover {
                background: #5568d3;
                transform: translateY(-2px);
            }
            .note {
                background: #fff3cd;
                border: 1px solid #ffc107;
                border-radius: 8px;
                padding: 12px;
                font-size: 13px;
                color: #856404;
            }
            .note i {
                margin-right: 5px;
            }
            .btn-close-modal {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 14px 40px;
                border-radius: 10px;
                cursor: pointer;
                font-weight: 600;
                font-size: 16px;
                margin-top: 10px;
                transition: all 0.2s;
            }
            .btn-close-modal:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
            @keyframes slideUp {
                from { transform: translateY(30px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }

    // ============================================
    // VOICE INPUT - SPEECH TO TEXT (UNLIMITED MODE)
    // No time limits, continuous recognition
    // ============================================
    
    let recognition = null;
    let isRecording = false;
    let finalTranscript = '';
    let interimTranscript = '';
    let audioStream = null;
    let shouldKeepRunning = false; // Changed to unlimited mode flag
    
    // Indonesian text correction dictionary (common STT errors)
    const CORRECTION_MAP = {
        // Common misheard words
        'di a': 'dia',
        'ke ras': 'keras',
        'me reka': 'mereka',
        'se kali': 'sekali',
        'ter jadi': 'terjadi',
        'ke jadian': 'kejadian',
        'pe laku': 'pelaku',
        'kor ban': 'korban',
        'ke kerasan': 'kekerasan',
        'sek sual': 'seksual',
        'pe lecehan': 'pelecehan',
        'ter paksa': 'terpaksa',
        'di paksa': 'dipaksa',
        'me nyentuh': 'menyentuh',
        'di sentuh': 'disentuh',
        'me lakukannya': 'melakukannya',
        'mem buat': 'membuat',
        'men coba': 'mencoba',
        'ber ulang': 'berulang',
        'se ring': 'sering',
        'ter us': 'terus',
        'men erus': 'menerus',
        'ke takutan': 'ketakutan',
        'ke cewa': 'kecewa',
        'ter tekanan': 'tertekan',
        'ter ancam': 'terancam',
        'di ancam': 'diancam',
        'men gancam': 'mengancam',
        'kam pus': 'kampus',
        'do sen': 'dosen',
        'maha siswa': 'mahasiswa',
        'te man': 'teman',
        'pa car': 'pacar',
        'atasan': 'atasan',
        'ker ja': 'kerja',
        'kan tor': 'kantor',
        'ru mah': 'rumah',
        'kos': 'kos',
        'ka mar': 'kamar',
        'ma lam': 'malam',
        'si ang': 'siang',
        'pa gi': 'pagi',
        'ke marin': 'kemarin',
        'ming gu': 'minggu',
        'bu lan': 'bulan',
        'ta hun': 'tahun',
        // Numbers
        'satu': 'satu',
        'du a': 'dua',
        'ti ga': 'tiga',
        'em pat': 'empat',
        'li ma': 'lima',
        // Punctuation hints
        'titik': '.',
        'koma': ',',
        'tanda tanya': '?',
        'tanda seru': '!',
    };
    
    // Common Indonesian filler words to clean
    const FILLER_WORDS = ['eh', 'uh', 'um', 'hmm', 'eee', 'emm', 'anu', 'ehm'];
    
    function initVoiceInput() {
        const btnVoiceInput = document.getElementById('btnVoiceInput');
        const btnStopRecording = document.getElementById('btnStopRecording');
        const detailKejadian = document.getElementById('detailKejadian');
        const voiceRecordingIndicator = document.getElementById('voiceRecordingIndicator');
        
        if (!btnVoiceInput || !detailKejadian) {
            console.log('⚠️ Voice input elements not found');
            return;
        }
        
        // Check browser support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.warn('❌ Speech Recognition not supported in this browser');
            btnVoiceInput.style.display = 'none';
            return;
        }
        
        // ============ MASTER CONFIGURATION ============
        recognition = new SpeechRecognition();
        
        // Core settings for maximum accuracy
        recognition.continuous = true;           // Keep listening continuously
        recognition.interimResults = true;       // Show real-time results
        recognition.lang = 'id-ID';              // Indonesian language
        recognition.maxAlternatives = 5;         // Get 5 alternatives, pick best one
        
        // ============ RESULT HANDLER (MASTER VERSION) ============
        recognition.onresult = function(event) {
            let bestTranscript = '';
            let highestConfidence = 0;
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                
                if (result.isFinal) {
                    // MASTER: Pick the best alternative based on confidence
                    for (let j = 0; j < result.length; j++) {
                        const alternative = result[j];
                        const confidence = alternative.confidence || 0;
                        
                        // Only accept if confidence > 0.6 (60%)
                        if (confidence > highestConfidence && confidence > 0.5) {
                            highestConfidence = confidence;
                            bestTranscript = alternative.transcript;
                        }
                    }
                    
                    // If no good confidence, use first result
                    if (!bestTranscript && result[0]) {
                        bestTranscript = result[0].transcript;
                    }
                    
                    if (bestTranscript) {
                        // Apply post-processing corrections
                        const correctedText = postProcessText(bestTranscript);
                        finalTranscript += correctedText + ' ';
                        
                        console.log(`✅ Final: "${correctedText}" (confidence: ${(highestConfidence * 100).toFixed(1)}%)`);
                    }
                    
                    // Reset for next
                    bestTranscript = '';
                    highestConfidence = 0;
                    
                } else {
                    // Interim results - show immediately for feedback
                    interimTranscript = result[0].transcript;
                }
            }
            
            // Update textarea
            updateTextarea(detailKejadian);
        };
        
        // ============ START HANDLER ============
        recognition.onstart = function() {
            isRecording = true;
            shouldKeepRunning = true;
            finalTranscript = '';
            interimTranscript = '';
            
            // UI Feedback
            btnVoiceInput.classList.add('recording');
            btnVoiceInput.innerHTML = '<i class="fas fa-stop"></i>';
            btnVoiceInput.title = 'Klik untuk berhenti';
            
            if (voiceRecordingIndicator) {
                voiceRecordingIndicator.style.display = 'flex';
            }
            
            console.log('🎤 Voice recording started (UNLIMITED MODE)');
        };
        
        // ============ END HANDLER - UNLIMITED AUTO-RESTART ============
        recognition.onend = function() {
            console.log('🎤 Recognition ended, shouldKeepRunning:', shouldKeepRunning);
            
            // ALWAYS auto-restart for UNLIMITED duration
            if (shouldKeepRunning && isRecording) {
                console.log('🔄 Auto-restarting for unlimited duration...');
                
                setTimeout(() => {
                    if (shouldKeepRunning) {
                        try {
                            recognition.start();
                        } catch (e) {
                            console.log('Restart failed, retrying...');
                            setTimeout(() => {
                                if (shouldKeepRunning) {
                                    try { recognition.start(); } catch(e2) {}
                                }
                            }, 200);
                        }
                    }
                }, 50); // Very short delay for seamless restart
                return;
            }
            
            finishRecording(btnVoiceInput, voiceRecordingIndicator, detailKejadian);
        };
        
        // ============ ERROR HANDLER - AUTO-RECOVER ============
        recognition.onerror = function(event) {
            console.warn('⚠️ Speech recognition error:', event.error);
            
            // DON'T stop on recoverable errors - just restart
            if (['no-speech', 'aborted', 'network'].includes(event.error)) {
                if (shouldKeepRunning && isRecording) {
                    console.log('🔄 Auto-recovering from error:', event.error);
                    return; // Let onend handle restart
                }
            }
            
            // Only stop for fatal errors
            switch (event.error) {
                case 'audio-capture':
                    showVoiceError('Mikrofon tidak ditemukan. Pastikan mikrofon terhubung.');
                    shouldKeepRunning = false;
                    break;
                    
                case 'not-allowed':
                    showVoiceError('Izin mikrofon ditolak. Klik ikon 🔒 di address bar untuk mengizinkan.');
                    shouldKeepRunning = false;
                    break;
                    
                default:
                    // Keep running for other errors
                    if (!shouldKeepRunning) {
                        finishRecording(btnVoiceInput, voiceRecordingIndicator, detailKejadian);
                    }
            }
        };
        
        // ============ AUDIO START (for better feedback) ============
        recognition.onaudiostart = function() {
            console.log('🎵 Audio capture started');
        };
        
        recognition.onspeechstart = function() {
            console.log('🗣️ Speech detected');
        };
        
        // ============ BUTTON HANDLERS ============
        btnVoiceInput.addEventListener('click', async function() {
            if (isRecording) {
                stopRecording();
            } else {
                await startRecording();
            }
        });
        
        if (btnStopRecording) {
            btnStopRecording.addEventListener('click', function() {
                stopRecording();
            });
        }
        
        console.log('✅ Voice Input initialized (MASTER MODE - Indonesian Optimized)');
    }
    
    /**
     * Post-process text for better accuracy
     */
    function postProcessText(text) {
        if (!text) return '';
        
        let processed = text.trim();
        
        // 1. Apply correction map
        Object.entries(CORRECTION_MAP).forEach(([wrong, correct]) => {
            const regex = new RegExp(wrong, 'gi');
            processed = processed.replace(regex, correct);
        });
        
        // 2. Remove filler words
        FILLER_WORDS.forEach(filler => {
            const regex = new RegExp(`\\b${filler}\\b`, 'gi');
            processed = processed.replace(regex, '');
        });
        
        // 3. Fix multiple spaces
        processed = processed.replace(/\s+/g, ' ');
        
        // 4. Fix common spacing issues
        processed = processed.replace(/\s+([.,!?])/g, '$1'); // Remove space before punctuation
        processed = processed.replace(/([.,!?])(\w)/g, '$1 $2'); // Add space after punctuation
        
        // 5. Capitalize first letter of sentences
        processed = processed.replace(/(^|[.!?]\s+)([a-z])/g, (match, p1, p2) => {
            return p1 + p2.toUpperCase();
        });
        
        // 6. Capitalize first letter if start of text
        if (processed.length > 0) {
            processed = processed.charAt(0).toUpperCase() + processed.slice(1);
        }
        
        return processed.trim();
    }
    
    /**
     * Update textarea with current transcription
     */
    function updateTextarea(textarea) {
        if (!textarea) return;
        
        // Get existing text that was typed before recording
        const existingText = textarea.getAttribute('data-pre-record-text') || '';
        
        // Combine: existing + final + interim
        let newValue = existingText;
        if (newValue && finalTranscript) newValue += ' ';
        newValue += finalTranscript;
        
        // Show interim in italics effect (will be replaced by final)
        if (interimTranscript) {
            newValue += interimTranscript;
        }
        
        textarea.value = newValue.trim();
        textarea.scrollTop = textarea.scrollHeight;
        
        // Trigger validation
        validateStep4();
    }
    
    /**
     * Finish recording and cleanup
     */
    function finishRecording(btnVoiceInput, voiceRecordingIndicator, detailKejadian) {
        isRecording = false;
        shouldKeepRunning = false;
        
        // UI Reset
        if (btnVoiceInput) {
            btnVoiceInput.classList.remove('recording');
            btnVoiceInput.innerHTML = '<i class="fas fa-microphone"></i>';
            btnVoiceInput.title = 'Rekam suara';
        }
        
        if (voiceRecordingIndicator) {
            voiceRecordingIndicator.style.display = 'none';
        }
        
        // Final cleanup of textarea
        if (detailKejadian) {
            const finalValue = detailKejadian.value.trim();
            if (finalValue) {
                detailKejadian.value = postProcessText(finalValue);
            }
            detailKejadian.removeAttribute('data-pre-record-text');
        }
        
        // Stop audio stream
        if (audioStream) {
            audioStream.getTracks().forEach(track => track.stop());
            audioStream = null;
        }
        
        console.log('🎤 Voice recording finished');
        validateStep4();
    }
    
    /**
     * Start recording with optimized audio settings
     */
    async function startRecording() {
        if (!recognition) {
            showVoiceError('Browser tidak mendukung fitur suara.');
            return;
        }
        
        const detailKejadian = document.getElementById('detailKejadian');
        
        // Save existing text before recording
        if (detailKejadian && detailKejadian.value.trim()) {
            detailKejadian.setAttribute('data-pre-record-text', detailKejadian.value.trim());
        }
        
        try {
            // Request microphone with OPTIMIZED audio settings for speech
            audioStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,      // Remove echo
                    noiseSuppression: true,      // Reduce background noise
                    autoGainControl: true,       // Auto volume adjustment
                    channelCount: 1,             // Mono for speech
                    sampleRate: 16000,           // Optimal for speech recognition
                }
            });
            
            console.log('🎵 Audio stream ready with noise suppression');
            
            // Reset state
            finalTranscript = '';
            interimTranscript = '';
            shouldKeepRunning = true;
            
            // Start recognition
            recognition.start();
            
        } catch (error) {
            console.error('❌ Microphone access error:', error);
            
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                showVoiceError('Izin mikrofon ditolak. Klik ikon 🔒 di address bar browser untuk mengizinkan.');
            } else if (error.name === 'NotFoundError') {
                showVoiceError('Mikrofon tidak ditemukan. Pastikan perangkat audio terhubung.');
            } else if (error.name === 'NotReadableError') {
                showVoiceError('Mikrofon sedang digunakan aplikasi lain.');
            } else {
                showVoiceError('Tidak dapat mengakses mikrofon. Pastikan mikrofon berfungsi.');
            }
        }
    }
    
    /**
     * Stop recording
     */
    function stopRecording() {
        shouldKeepRunning = false; // Stop auto-restart
        
        if (recognition && isRecording) {
            try {
                recognition.stop();
            } catch (e) {
                console.log('Stop error (ignoring):', e);
            }
        }
        
        // Force finish if stop doesn't trigger onend
        setTimeout(() => {
            if (isRecording) {
                const btnVoiceInput = document.getElementById('btnVoiceInput');
                const voiceRecordingIndicator = document.getElementById('voiceRecordingIndicator');
                const detailKejadian = document.getElementById('detailKejadian');
                finishRecording(btnVoiceInput, voiceRecordingIndicator, detailKejadian);
            }
        }, 500);
    }
    
    function showVoiceError(message) {
        // Remove existing error
        const existingError = document.querySelector('.voice-error-toast');
        if (existingError) existingError.remove();
        
        const toast = document.createElement('div');
        toast.className = 'voice-error-toast';
        toast.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        document.body.appendChild(toast);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.classList.add('fade-out');
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    }
    
    function injectVoiceInputStyles() {
        if (document.getElementById('voiceInputStyles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'voiceInputStyles';
        styles.textContent = `
            /* Voice Input Button */
            .textarea-voice-wrapper {
                position: relative;
            }
            
            .btn-voice-input {
                position: absolute;
                right: 12px;
                bottom: 12px;
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                transition: all 0.3s ease;
                z-index: 10;
            }
            
            .btn-voice-input:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
            }
            
            .btn-voice-input:active {
                transform: scale(0.95);
            }
            
            /* Recording State */
            .btn-voice-input.recording {
                background: linear-gradient(135deg, #f44336 0%, #e91e63 100%);
                animation: pulse-recording 1s ease-in-out infinite;
                box-shadow: 0 4px 20px rgba(244, 67, 54, 0.5);
            }
            
            @keyframes pulse-recording {
                0%, 100% { 
                    transform: scale(1);
                    box-shadow: 0 4px 20px rgba(244, 67, 54, 0.5);
                }
                50% { 
                    transform: scale(1.1);
                    box-shadow: 0 6px 30px rgba(244, 67, 54, 0.7);
                }
            }
            
            /* Recording Indicator */
            .voice-recording-indicator {
                display: none;
                align-items: center;
                gap: 12px;
                padding: 12px 20px;
                background: linear-gradient(135deg, rgba(244, 67, 54, 0.1) 0%, rgba(233, 30, 99, 0.1) 100%);
                border: 1px solid rgba(244, 67, 54, 0.3);
                border-radius: 12px;
                margin-top: 12px;
                animation: fadeIn 0.3s ease;
            }
            
            .recording-pulse {
                width: 16px;
                height: 16px;
                background: #f44336;
                border-radius: 50%;
                animation: pulse-dot 1s ease-in-out infinite;
            }
            
            @keyframes pulse-dot {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.5; transform: scale(0.8); }
            }
            
            .recording-text {
                flex: 1;
                font-weight: 600;
                color: #f44336;
                font-size: 14px;
            }
            
            .btn-stop-recording {
                background: #f44336;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 20px;
                font-weight: 600;
                font-size: 13px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 6px;
                transition: all 0.2s;
            }
            
            .btn-stop-recording:hover {
                background: #d32f2f;
                transform: scale(1.05);
            }
            
            .btn-stop-recording i {
                font-size: 12px;
            }
            
            /* Textarea with voice styling */
            .lapor-textarea {
                padding-right: 70px;
                min-height: 150px;
            }
            
            /* Voice Error Toast */
            .voice-error-toast {
                position: fixed;
                bottom: 30px;
                left: 50%;
                transform: translateX(-50%);
                background: #f44336;
                color: white;
                padding: 14px 20px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                gap: 12px;
                box-shadow: 0 6px 20px rgba(244, 67, 54, 0.4);
                z-index: 10001;
                animation: slideUpToast 0.3s ease;
                max-width: 90%;
            }
            
            @keyframes slideUpToast {
                from { 
                    transform: translateX(-50%) translateY(100px);
                    opacity: 0;
                }
                to { 
                    transform: translateX(-50%) translateY(0);
                    opacity: 1;
                }
            }
            
            .voice-error-toast.fade-out {
                animation: slideDownToast 0.3s ease forwards;
            }
            
            @keyframes slideDownToast {
                from { 
                    transform: translateX(-50%) translateY(0);
                    opacity: 1;
                }
                to { 
                    transform: translateX(-50%) translateY(100px);
                    opacity: 0;
                }
            }
            
            .voice-error-toast i:first-child {
                font-size: 20px;
            }
            
            .voice-error-toast span {
                flex: 1;
                font-size: 14px;
                line-height: 1.4;
            }
            
            .voice-error-toast button {
                background: none;
                border: none;
                color: white;
                opacity: 0.7;
                cursor: pointer;
                padding: 5px;
                font-size: 14px;
            }
            
            .voice-error-toast button:hover {
                opacity: 1;
            }
            
            /* Mobile responsive */
            @media (max-width: 480px) {
                .btn-voice-input {
                    width: 44px;
                    height: 44px;
                    font-size: 18px;
                    right: 10px;
                    bottom: 10px;
                }
                
                .voice-recording-indicator {
                    flex-wrap: wrap;
                    gap: 8px;
                    padding: 10px 15px;
                }
                
                .voice-error-toast {
                    bottom: 20px;
                    left: 10px;
                    right: 10px;
                    transform: none;
                    max-width: none;
                }
                
                @keyframes slideUpToast {
                    from { 
                        transform: translateY(100px);
                        opacity: 0;
                    }
                    to { 
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
            }
        `;
        document.head.appendChild(styles);
    }

    // ============================================
    // ENHANCED STT INTEGRATION
    // Emotion Detection & Audio Event Handling
    // ============================================
    
    /**
     * Initialize Enhanced STT if available
     */
    function initEnhancedSTT() {
        if (!window.EnhancedSTT) {
            console.log('ℹ️ EnhancedSTT module not loaded, using basic STT');
            return false;
        }
        
        // Initialize with callbacks
        const initialized = window.EnhancedSTT.init({
            language: 'id-ID',
            emotionDetectionEnabled: true,
            audioEventDetectionEnabled: true
        });
        
        if (!initialized) {
            console.log('⚠️ EnhancedSTT initialization failed');
            return false;
        }
        
        // Set up callbacks
        window.EnhancedSTT.setCallbacks({
            onEmotionDetected: handleEmotionDetected,
            onAudioEvent: handleAudioEvent
        });
        
        console.log('✅ EnhancedSTT integrated with emotion detection');
        return true;
    }
    
    /**
     * Handle detected emotion from text analysis
     */
    function handleEmotionDetected(emotionData) {
        console.log('🎭 Emotion detected:', emotionData);
        
        const emotionIndicator = document.getElementById('emotionIndicator');
        const emotionIcon = document.getElementById('emotionIcon');
        const emotionText = document.getElementById('emotionText');
        
        if (!emotionIndicator || !emotionIcon || !emotionText) return;
        
        // Map emotion to icon and message
        const emotionMap = {
            sedih: { icon: '😢', text: 'Saya merasakan kesedihan dalam ceritamu', class: 'sedih' },
            marah: { icon: '😠', text: 'Saya merasakan kemarahan di sini', class: 'marah' },
            takut: { icon: '😰', text: 'Kamu mungkin merasa takut atau cemas', class: 'takut' },
            putusAsa: { icon: '💔', text: 'Saya di sini untukmu. Kamu tidak sendiri.', class: 'putus-asa' },
            malu: { icon: '😶', text: 'Tidak apa-apa merasa malu, itu wajar', class: 'sedih' },
            bingung: { icon: '🤔', text: 'Saya mengerti kebingunganmu', class: 'sedih' },
            lega: { icon: '😌', text: 'Senang kamu merasa lebih baik', class: 'lega' },
            berharap: { icon: '🙏', text: 'Terima kasih sudah berbagi harapanmu', class: 'lega' }
        };
        
        const emotion = emotionMap[emotionData.primary] || { icon: '💙', text: 'Saya mendengarkanmu', class: '' };
        
        // Update indicator
        emotionIcon.textContent = emotion.icon;
        emotionText.textContent = emotion.text;
        
        // Remove old classes and add new
        emotionIndicator.className = 'emotion-indicator';
        if (emotion.class) {
            emotionIndicator.classList.add(emotion.class);
        }
        
        // Show indicator
        emotionIndicator.style.display = 'flex';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            emotionIndicator.style.display = 'none';
        }, 5000);
        
        // Special handling for crisis keywords
        if (emotionData.primary === 'putusAsa') {
            showCrisisSupport();
        }
    }
    
    /**
     * Handle audio events (crying, screaming, etc.)
     */
    function handleAudioEvent(eventData) {
        console.log('🔊 Audio event detected:', eventData);
        
        // Map audio event to toast display
        const eventMap = {
            crying: { icon: '😢', text: 'Tidak apa-apa menangis. Saya di sini.', class: 'crying' },
            sobbing: { icon: '😢', text: 'Saya merasakan kesedihanmu. Ceritakan saja.', class: 'crying' },
            laughing: { icon: '😊', text: '', class: 'laughing' }, // No need to show for laughing
            scream: { icon: '⚠️', text: 'Apakah kamu baik-baik saja?', class: 'scream' },
            distress: { icon: '💙', text: 'Saya merasakan kamu sedang dalam kesulitan', class: 'distress' }
        };
        
        const event = eventMap[eventData.type];
        if (!event || !event.text) return; // Skip if no message needed
        
        showAudioEventToast(event.icon, event.text, event.class);
        
        // Special handling for distress or screaming
        if (eventData.type === 'scream' || eventData.type === 'distress') {
            // Optionally show crisis support after a delay
            setTimeout(() => {
                if (eventData.confidence > 0.7) {
                    showCrisisSupport();
                }
            }, 3000);
        }
    }
    
    /**
     * Show audio event toast notification
     */
    function showAudioEventToast(icon, message, className) {
        // Remove existing toast
        const existingToast = document.querySelector('.audio-event-toast');
        if (existingToast) existingToast.remove();
        
        const toast = document.createElement('div');
        toast.className = `audio-event-toast ${className}`;
        toast.innerHTML = `
            <span class="audio-event-icon">${icon}</span>
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        // Auto-remove after 4 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(-50%) translateY(20px)';
                setTimeout(() => toast.remove(), 300);
            }
        }, 4000);
    }
    
    /**
     * Show crisis support modal for high-risk situations
     */
    function showCrisisSupport() {
        // Remove existing modal
        const existingModal = document.querySelector('.crisis-support-modal');
        if (existingModal) return; // Don't show multiple times
        
        const modal = document.createElement('div');
        modal.className = 'crisis-support-modal';
        modal.innerHTML = `
            <div class="crisis-support-content">
                <div class="crisis-icon">💙</div>
                <h3>Kamu Tidak Sendiri</h3>
                <p>Saya mendeteksi bahwa kamu mungkin sedang dalam kondisi yang sulit. 
                   Bantuan profesional tersedia untukmu.</p>
                <div class="crisis-actions">
                    <a href="tel:119" class="crisis-btn primary">
                        <i class="fas fa-phone"></i> Hubungi 119
                    </a>
                    <a href="https://wa.me/6282188467793" target="_blank" class="crisis-btn secondary">
                        <i class="fab fa-whatsapp"></i> Chat Konselor
                    </a>
                    <button class="crisis-btn tertiary" onclick="this.closest('.crisis-support-modal').remove()">
                        Saya Baik-baik Saja
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Inject styles if not exist
        if (!document.getElementById('crisisSupportStyles')) {
            const styles = document.createElement('style');
            styles.id = 'crisisSupportStyles';
            styles.textContent = `
                .crisis-support-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.6);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 99999;
                    animation: fadeIn 0.3s ease;
                }
                
                .crisis-support-content {
                    background: white;
                    padding: 40px;
                    border-radius: 24px;
                    max-width: 400px;
                    text-align: center;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    animation: slideUp 0.4s ease;
                }
                
                .crisis-icon {
                    font-size: 4rem;
                    margin-bottom: 20px;
                }
                
                .crisis-support-content h3 {
                    font-size: 1.5rem;
                    margin-bottom: 15px;
                    color: #333;
                }
                
                .crisis-support-content p {
                    color: #666;
                    line-height: 1.6;
                    margin-bottom: 25px;
                }
                
                .crisis-actions {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                
                .crisis-btn {
                    padding: 14px 24px;
                    border: none;
                    border-radius: 12px;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    text-decoration: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    transition: all 0.3s ease;
                }
                
                .crisis-btn.primary {
                    background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
                    color: white;
                }
                
                .crisis-btn.primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(231, 76, 60, 0.4);
                }
                
                .crisis-btn.secondary {
                    background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
                    color: white;
                }
                
                .crisis-btn.secondary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(37, 211, 102, 0.4);
                }
                
                .crisis-btn.tertiary {
                    background: #f0f0f0;
                    color: #666;
                }
                
                .crisis-btn.tertiary:hover {
                    background: #e0e0e0;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes slideUp {
                    from { 
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to { 
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `;
            document.head.appendChild(styles);
        }
    }
    
    // Try to initialize EnhancedSTT when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initEnhancedSTT);
    } else {
        // Small delay to ensure EnhancedSTT is loaded
        setTimeout(initEnhancedSTT, 100);
    }

    // ============================================
    // INITIALIZE ON DOM READY
    // ============================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();