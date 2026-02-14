/**
 * ============================================================
 * SIGAP PPKPT - Manual Input JavaScript
 * File: assets/js/manual-input.js
 * Description: Handles manual case input form with file upload
 * ============================================================
 */

(function() {
    'use strict';

    // ========================================
    // CONFIGURATION
    // ========================================
    const API_URL = '../../../api/cases/manual_input.php';
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm'];

    // Store selected files
    let selectedFiles = [];

    // ========================================
    // INITIALIZATION
    // ========================================
    document.addEventListener('DOMContentLoaded', function() {
        initForm();
        setDefaultDate();
        initFileUpload();
    });

    /**
     * Initialize form handling
     */
    function initForm() {
        const form = document.getElementById('manualInputForm');
        if (!form) return;

        form.addEventListener('submit', handleSubmit);
    }

    /**
     * Set default date to today
     */
    function setDefaultDate() {
        const dateInput = document.querySelector('input[name="waktu_kejadian"]');
        if (dateInput && !dateInput.value) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.value = today;
        }
    }

    /**
     * Initialize file upload functionality
     */
    function initFileUpload() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        if (!uploadArea || !fileInput) return;

        // Click to select files
        uploadArea.addEventListener('click', function() {
            fileInput.click();
        });

        // File input change
        fileInput.addEventListener('change', function(e) {
            handleFiles(e.target.files);
        });

        // Drag and drop events
        uploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', function(e) {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.remove('dragover');
            handleFiles(e.dataTransfer.files);
        });
    }

    /**
     * Handle selected files
     */
    function handleFiles(files) {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            // Validate file type
            if (!ALLOWED_TYPES.includes(file.type)) {
                showToast(`File "${file.name}" tidak didukung. Gunakan format gambar (JPG, PNG) atau video (MP4).`, 'error');
                continue;
            }

            // Validate file size
            if (file.size > MAX_FILE_SIZE) {
                showToast(`File "${file.name}" terlalu besar. Maksimal 10MB per file.`, 'error');
                continue;
            }

            // Check for duplicates
            if (selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
                showToast(`File "${file.name}" sudah ditambahkan.`, 'error');
                continue;
            }

            selectedFiles.push(file);
            addFilePreview(file);
        }

        // Clear file input to allow re-selecting same file
        document.getElementById('fileInput').value = '';
    }

    /**
     * Add file preview to the preview list
     */
    function addFilePreview(file) {
        const previewList = document.getElementById('filePreviewList');
        if (!previewList) return;

        const fileItem = document.createElement('div');
        fileItem.className = 'file-preview-item';
        fileItem.setAttribute('data-filename', file.name);

        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');

        if (isImage) {
            const img = document.createElement('img');
            img.alt = file.name;
            const reader = new FileReader();
            reader.onload = function(e) {
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
            fileItem.appendChild(img);
        } else if (isVideo) {
            const videoIcon = document.createElement('div');
            videoIcon.className = 'video-icon';
            videoIcon.innerHTML = '<i class="bi bi-play-circle"></i>';
            fileItem.appendChild(videoIcon);
        }

        // File info
        const fileInfo = document.createElement('div');
        fileInfo.className = 'file-info';
        fileInfo.textContent = truncateFilename(file.name, 15);
        fileItem.appendChild(fileInfo);

        // Remove button
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'remove-file';
        removeBtn.innerHTML = '<i class="bi bi-x"></i>';
        removeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            removeFile(file.name);
        });
        fileItem.appendChild(removeBtn);

        previewList.appendChild(fileItem);
    }

    /**
     * Remove file from selection
     */
    function removeFile(filename) {
        selectedFiles = selectedFiles.filter(f => f.name !== filename);

        const previewItem = document.querySelector(`.file-preview-item[data-filename="${filename}"]`);
        if (previewItem) {
            previewItem.remove();
        }
    }

    /**
     * Truncate filename for display
     */
    function truncateFilename(filename, maxLength) {
        if (filename.length <= maxLength) return filename;

        const ext = filename.split('.').pop();
        const name = filename.substring(0, filename.length - ext.length - 1);
        const truncatedName = name.substring(0, maxLength - ext.length - 4) + '...';

        return truncatedName + '.' + ext;
    }

    async function handleSubmit(e) {
        e.preventDefault();

        const form = e.target;
        const submitBtn = document.getElementById('btnSubmit');

        if (!validateForm(form)) {
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Menyimpan...';

        try {
            const encryptionChoice = await encryptionModal.show();

            let finalFormData; // ✅ Changed to let instead of const

            if (encryptionChoice.encrypt) {
                const password = encryptionChoice.password;

                submitBtn.innerHTML = '<i class="bi bi-lock-fill"></i> Mengenkripsi...';

                const caseData = {
                    tingkat_kekhawatiran: new FormData(form).get('tingkat_kekhawatiran'),
                    gender_korban: new FormData(form).get('gender_korban'),
                    usia_korban: new FormData(form).get('usia_korban'),
                    email_korban: new FormData(form).get('email_korban'),
                    whatsapp_korban: new FormData(form).get('whatsapp_korban'),
                    korban_sebagai: new FormData(form).get('korban_sebagai'),
                    status_disabilitas: new FormData(form).get('status_disabilitas'),
                    pelaku_kekerasan: new FormData(form).get('pelaku_kekerasan'),
                    waktu_kejadian: new FormData(form).get('waktu_kejadian'),
                    lokasi_kejadian: new FormData(form).get('lokasi_kejadian'),
                    detail_kejadian: new FormData(form).get('detail_kejadian'),
                    status_laporan: new FormData(form).get('status_laporan'),
                    catatan_admin: new FormData(form).get('catatan_admin')
                };

                const secureHandler = new SecureReportHandler(password);
                const encryptedData = await secureHandler.encryptReport(caseData);

                console.log('🔒 Encryption Status:', {
                    is_encrypted: encryptedData.is_encrypted,
                    fields_encrypted: secureHandler.sensitiveFields
                });

                finalFormData = new FormData();
                Object.keys(encryptedData).forEach(key => {
                    if (encryptedData[key] !== null && encryptedData[key] !== undefined) {
                        finalFormData.append(key, encryptedData[key]);
                    }
                });

                selectedFiles.forEach(file => {
                    finalFormData.append('bukti[]', file);
                });
            } else {
                finalFormData = new FormData(form);
                finalFormData.delete('bukti[]');
                selectedFiles.forEach(file => {
                    finalFormData.append('bukti[]', file);
                });
            }

            submitBtn.innerHTML = '<i class="bi bi-cloud-upload"></i> Mengirim...';

            const response = await fetch(API_URL, {
                method: 'POST',
                credentials: 'same-origin',
                body: finalFormData
            });

            const result = await response.json();

            if (result.success) {
                const encryptionStatus = encryptionChoice.encrypt ? ' (Terenkripsi 🔒)' : '';
                showToast(`✅ Kasus berhasil disimpan${encryptionStatus}! Kode: ${result.data.kode_pelaporan}`, 'success');

                setTimeout(() => {
                    window.location.href = 'cases.html';
                }, 2000);
            } else {
                throw new Error(result.message || 'Gagal menyimpan kasus');
            }

        } catch (error) {
            console.error('Error submitting form:', error);
            
            if (error.message !== 'User cancelled encryption') {
                showToast(error.message || 'Terjadi kesalahan saat menyimpan', 'error');
            }

            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-check-lg"></i> Simpan Kasus';
        }
    }

    /**
     * Validate form before submission
     */
    function validateForm(form) {
        // Check required fields
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                isValid = false;
                field.classList.add('is-invalid');

                // Remove invalid class on input
                field.addEventListener('input', function() {
                    this.classList.remove('is-invalid');
                }, { once: true });
            }
        });

        // Check tingkat kekhawatiran
        const kekhawatiranChecked = form.querySelector('input[name="tingkat_kekhawatiran"]:checked');
        if (!kekhawatiranChecked) {
            isValid = false;
            showToast('Pilih tingkat kekhawatiran', 'error');
        }

        if (!isValid) {
            showToast('Lengkapi semua field yang wajib diisi', 'error');
        }

        return isValid;
    }

    /**
     * Show toast notification
     */
    function showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="bi bi-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i>
            <span>${message}</span>
        `;

        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

})();
