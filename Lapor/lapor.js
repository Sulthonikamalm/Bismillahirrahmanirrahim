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
    // INITIALIZE
    // ============================================
    function init() {
        initChoiceCards();
        initStep1();
        initStep2();
        initStep3();
        initStep4();
        initStep5();
        injectModalStyles();
        console.log('✅ Lapor Form Initialized (Backend Integrated)');
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
        const btnLanjutkan1 = document.getElementById('btnLanjutkan1');
        
        if (btnLanjutkan1) {
            btnLanjutkan1.addEventListener('click', function() {
                if (formData.statusDarurat === 'darurat') {
                    redirectToWhatsApp();
                } else if (formData.statusDarurat === 'tidak') {
                    goToStep(2);
                }
            });
        }
    }

    function handleStep1Selection() {
        const btnLanjutkan1 = document.getElementById('btnLanjutkan1');
        if (btnLanjutkan1 && formData.statusDarurat) {
            btnLanjutkan1.disabled = false;
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
                    console.log('Step 2 Complete:', formData);
                    goToStep(3);
                }
            });
        }
    }

    function handleStep2Selection(groupName) {
        if (groupName === 'korban') {
            step2Status.korban = true;
        } else if (groupName === 'kehawatiran') {
            step2Status.kehawatiran = true;
        }
        
        const btnLanjutkan2 = document.getElementById('btnLanjutkan2');
        if (step2Status.korban && step2Status.kehawatiran) {
            if (btnLanjutkan2) {
                btnLanjutkan2.disabled = false;
            }
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
                    console.log('Step 3 Complete:', formData);
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
    // INITIALIZE ON DOM READY
    // ============================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();