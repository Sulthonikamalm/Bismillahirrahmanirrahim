/**
 * ============================================================
 * SIGAP PPKPT - Case Detail Page JavaScript
 * File: assets/js/case-detail.js
 * Description: Fetches and displays case details from API
 * ============================================================
 */

(function() {
    'use strict';

    // ========================================
    // CONFIGURATION
    // ========================================
    const API_BASE = '../../../api/cases/';
    const DEBUG_MODE = false;

    // ========================================
    // STATE
    // ========================================
    let caseData = null;
    let csrfToken = '';
    let caseId = null;

    // ========================================
    // DOM ELEMENTS
    // ========================================
    const elements = {
        // States
        loadingState: document.getElementById('loadingState'),
        errorState: document.getElementById('errorState'),
        errorMessage: document.getElementById('errorMessage'),
        caseContent: document.getElementById('caseContent'),

        // Header
        breadcrumbCode: document.getElementById('breadcrumbCode'),
        caseCode: document.getElementById('caseCode'),
        caseDate: document.getElementById('caseDate'),
        statusBadge: document.getElementById('statusBadge'),

        // Status Darurat
        statusDarurat: document.getElementById('statusDarurat'),
        tingkatKekhawatiran: document.getElementById('tingkatKekhawatiran'),

        // Korban Info
        korbanSebagai: document.getElementById('korbanSebagai'),
        genderKorban: document.getElementById('genderKorban'),
        usiaKorban: document.getElementById('usiaKorban'),
        statusDisabilitas: document.getElementById('statusDisabilitas'),
        jenisDisabilitasWrapper: document.getElementById('jenisDisabilitasWrapper'),
        jenisDisabilitas: document.getElementById('jenisDisabilitas'),

        // Kontak
        emailKorban: document.getElementById('emailKorban'),
        whatsappKorban: document.getElementById('whatsappKorban'),

        // Kejadian
        pelakuKekerasan: document.getElementById('pelakuKekerasan'),
        waktuKejadian: document.getElementById('waktuKejadian'),
        lokasiKejadian: document.getElementById('lokasiKejadian'),
        detailKejadian: document.getElementById('detailKejadian'),

        // Evidence
        evidenceList: document.getElementById('evidenceList'),
        noEvidence: document.getElementById('noEvidence'),

        // Actions
        btnDelete: document.getElementById('btnDelete'),
        statusMenu: document.getElementById('statusMenu'),

        // Modal
        deleteModal: document.getElementById('deleteModal'),
        modalCaseCode: document.getElementById('modalCaseCode'),
        btnCancelDelete: document.getElementById('btnCancelDelete'),
        btnConfirmDelete: document.getElementById('btnConfirmDelete'),

        // Toast
        toastContainer: document.getElementById('toastContainer')
    };

    // ========================================
    // INITIALIZATION
    // ========================================
    document.addEventListener('DOMContentLoaded', function() {
        // Get case ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        caseId = urlParams.get('id');

        if (!caseId) {
            showError('ID kasus tidak ditemukan dalam URL');
            return;
        }

        // Load case data
        loadCaseDetail();

        // Setup event listeners
        setupEventListeners();
    });

    // ========================================
    // API FUNCTIONS
    // ========================================

    /**
     * Load case detail from API
     */
    async function loadCaseDetail() {
        try {
            showLoading();

            const response = await fetch(`${API_BASE}get_case_detail.php?id=${caseId}`, {
                method: 'GET',
                credentials: 'same-origin',
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (DEBUG_MODE) {
                console.log('Case Detail API Response:', data);
            }

            if (data.status === 'success') {
                caseData = data.data;
                csrfToken = data.csrf_token || '';
                renderCaseDetail();
            } else {
                throw new Error(data.message || 'Gagal memuat data kasus');
            }

        } catch (error) {
            console.error('Error loading case detail:', error);
            showError(error.message);
        }
    }

    /**
     * Update case status
     */
    async function updateCaseStatus(newStatus) {
        try {
            const response = await fetch(`${API_BASE}update_case.php`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: caseId,
                    status_laporan: newStatus,
                    csrf_token: csrfToken
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.status === 'success') {
                // Update local data
                caseData.status_laporan = newStatus;
                csrfToken = data.csrf_token || csrfToken;

                // Update UI
                updateStatusBadge(newStatus);
                showToast('Berhasil', `Status berhasil diubah menjadi ${newStatus}`, 'success');
            } else {
                throw new Error(data.message || 'Gagal mengubah status');
            }

        } catch (error) {
            console.error('Error updating status:', error);
            showToast('Gagal', error.message, 'error');
        }
    }

    /**
     * Delete case
     */
    async function deleteCase() {
        try {
            elements.btnConfirmDelete.disabled = true;
            elements.btnConfirmDelete.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Menghapus...';

            const response = await fetch(`${API_BASE}delete_case.php`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ids: [parseInt(caseId)],
                    csrf_token: csrfToken
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.status === 'success') {
                showToast('Berhasil', 'Data kasus berhasil dihapus', 'success');

                // Redirect after 1.5 seconds
                setTimeout(() => {
                    window.location.href = 'cases.html';
                }, 1500);
            } else {
                throw new Error(data.message || 'Gagal menghapus data');
            }

        } catch (error) {
            console.error('Error deleting case:', error);
            showToast('Gagal', error.message, 'error');

            elements.btnConfirmDelete.disabled = false;
            elements.btnConfirmDelete.innerHTML = '<i class="bi bi-trash3 me-2"></i>Hapus';
            hideDeleteModal();
        }
    }

    // ========================================
    // RENDER FUNCTIONS
    // ========================================

    /**
     * Render case detail to UI
     */
    function renderCaseDetail() {
        if (!caseData) return;

        // Header
        const kode = caseData.kode_pelaporan || `#CASE-${caseData.id}`;
        elements.breadcrumbCode.textContent = kode;
        elements.caseCode.textContent = kode;
        elements.caseDate.textContent = `Dilaporkan: ${formatDate(caseData.created_at)}`;
        elements.modalCaseCode.textContent = kode;

        // Status Badge
        updateStatusBadge(caseData.status_laporan);

        // Status Darurat
        renderStatusDarurat(caseData.status_darurat);
        renderTingkatKekhawatiran(caseData.tingkat_kekhawatiran);

        // Korban Info
        elements.korbanSebagai.textContent = caseData.korban_sebagai || '-';
        elements.genderKorban.textContent = caseData.gender_korban || '-';
        elements.usiaKorban.textContent = caseData.usia_korban || '-';
        elements.statusDisabilitas.textContent = caseData.status_disabilitas || 'Tidak';

        // Show jenis disabilitas if applicable
        if (caseData.jenis_disabilitas && caseData.status_disabilitas &&
            caseData.status_disabilitas.toLowerCase() !== 'tidak') {
            elements.jenisDisabilitasWrapper.style.display = 'flex';
            elements.jenisDisabilitas.textContent = caseData.jenis_disabilitas;
        }

        // Kontak
        elements.emailKorban.textContent = caseData.email_korban || '-';
        elements.whatsappKorban.textContent = caseData.whatsapp_korban || '-';

        // Kejadian
        elements.pelakuKekerasan.textContent = caseData.pelaku_kekerasan || '-';
        elements.waktuKejadian.textContent = caseData.waktu_kejadian || '-';
        elements.lokasiKejadian.textContent = caseData.lokasi_kejadian || '-';
        elements.detailKejadian.textContent = caseData.detail_kejadian || 'Tidak ada detail kejadian.';

        // Evidence
        renderEvidence(caseData.bukti || []);

        // Show content
        hideLoading();
        elements.caseContent.style.display = 'block';
    }

    /**
     * Update status badge
     */
    function updateStatusBadge(status) {
        const statusLower = (status || 'process').toLowerCase().replace(' ', '-');
        const statusMap = {
            'process': { icon: 'bi-clock-history', text: 'Process', class: 'process' },
            'in-progress': { icon: 'bi-hourglass-split', text: 'In Progress', class: 'in-progress' },
            'completed': { icon: 'bi-check-circle', text: 'Completed', class: 'completed' }
        };

        const config = statusMap[statusLower] || statusMap['process'];

        elements.statusBadge.className = `status-badge-large ${config.class}`;
        elements.statusBadge.innerHTML = `<i class="bi ${config.icon}"></i><span>${config.text}</span>`;
    }

    /**
     * Render status darurat
     */
    function renderStatusDarurat(status) {
        const isDarurat = status && status.toLowerCase() === 'ya';

        if (isDarurat) {
            elements.statusDarurat.innerHTML = `
                <span class="urgency-indicator darurat">
                    <i class="bi bi-exclamation-triangle-fill"></i>
                    DARURAT
                </span>
            `;
        } else {
            elements.statusDarurat.innerHTML = `
                <span class="urgency-indicator tidak-darurat">
                    <i class="bi bi-check-circle-fill"></i>
                    Tidak Darurat
                </span>
            `;
        }
    }

    /**
     * Render tingkat kekhawatiran
     */
    function renderTingkatKekhawatiran(level) {
        const levelLower = (level || '').toLowerCase();
        let badgeClass = 'khawatir';
        let displayText = level || 'Tidak diketahui';

        if (levelLower.includes('sedikit')) {
            badgeClass = 'sedikit';
        } else if (levelLower.includes('sangat') || levelLower.includes('darurat')) {
            badgeClass = 'sangat';
        }

        elements.tingkatKekhawatiran.innerHTML = `
            <span class="worry-badge ${badgeClass}">${displayText}</span>
        `;
    }

    /**
     * Render evidence list
     */
    function renderEvidence(buktiList) {
        if (!buktiList || buktiList.length === 0) {
            elements.evidenceList.style.display = 'none';
            elements.noEvidence.style.display = 'block';
            return;
        }

        elements.noEvidence.style.display = 'none';
        elements.evidenceList.style.display = 'flex';

        elements.evidenceList.innerHTML = buktiList.map(bukti => {
            const fileType = getFileType(bukti.file_type || bukti.file_url);
            const fileName = bukti.file_url ? bukti.file_url.split('/').pop() : 'Bukti';
            const iconConfig = getFileIconConfig(fileType);

            // Adjust path based on whether it's absolute or relative
            let fileUrl = bukti.file_url;
            if (fileUrl && !fileUrl.startsWith('http') && !fileUrl.startsWith('/')) {
                // Relative path from database - add base path from current location
                fileUrl = '../../../' + fileUrl;
            }

            return `
                <div class="evidence-item">
                    <div class="evidence-icon ${iconConfig.class}">
                        <i class="bi ${iconConfig.icon}"></i>
                    </div>
                    <div class="evidence-info">
                        <div class="evidence-name">${fileName}</div>
                        <div class="evidence-meta">${fileType.toUpperCase()} - ${formatDate(bukti.created_at)}</div>
                    </div>
                    <div class="evidence-actions">
                        <button class="evidence-btn" onclick="window.open('${fileUrl}', '_blank')" title="Lihat">
                            <i class="bi bi-eye"></i>
                        </button>
                        <a href="${fileUrl}" download class="evidence-btn" title="Download">
                            <i class="bi bi-download"></i>
                        </a>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Get file type from mime type or URL
     */
    function getFileType(input) {
        if (!input) return 'document';

        const lower = input.toLowerCase();

        if (lower.includes('image') || lower.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
            return 'image';
        } else if (lower.includes('video') || lower.match(/\.(mp4|avi|mov|webm)$/)) {
            return 'video';
        } else if (lower.includes('pdf') || lower.match(/\.pdf$/)) {
            return 'document';
        }

        return 'document';
    }

    /**
     * Get icon config for file type
     */
    function getFileIconConfig(type) {
        const configs = {
            'image': { icon: 'bi-image', class: 'image' },
            'video': { icon: 'bi-play-circle', class: 'video' },
            'document': { icon: 'bi-file-earmark-text', class: 'document' }
        };

        return configs[type] || configs['document'];
    }

    // ========================================
    // EVENT LISTENERS
    // ========================================

    function setupEventListeners() {
        // Delete button
        if (elements.btnDelete) {
            elements.btnDelete.addEventListener('click', showDeleteModal);
        }

        // Modal cancel
        if (elements.btnCancelDelete) {
            elements.btnCancelDelete.addEventListener('click', hideDeleteModal);
        }

        // Modal confirm delete
        if (elements.btnConfirmDelete) {
            elements.btnConfirmDelete.addEventListener('click', deleteCase);
        }

        // Close modal on overlay click
        if (elements.deleteModal) {
            elements.deleteModal.addEventListener('click', function(e) {
                if (e.target === elements.deleteModal) {
                    hideDeleteModal();
                }
            });
        }

        // Status menu items
        if (elements.statusMenu) {
            elements.statusMenu.querySelectorAll('.dropdown-item').forEach(item => {
                item.addEventListener('click', function(e) {
                    e.preventDefault();
                    const newStatus = this.getAttribute('data-status');
                    updateCaseStatus(newStatus);
                });
            });
        }
    }

    // ========================================
    // UI HELPERS
    // ========================================

    function showLoading() {
        elements.loadingState.style.display = 'block';
        elements.errorState.style.display = 'none';
        elements.caseContent.style.display = 'none';
    }

    function hideLoading() {
        elements.loadingState.style.display = 'none';
    }

    function showError(message) {
        elements.loadingState.style.display = 'none';
        elements.caseContent.style.display = 'none';
        elements.errorState.style.display = 'block';
        elements.errorMessage.textContent = message;
    }

    function showDeleteModal() {
        elements.deleteModal.classList.add('show');
    }

    function hideDeleteModal() {
        elements.deleteModal.classList.remove('show');
    }

    function showToast(title, message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        const icon = type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill';

        toast.innerHTML = `
            <i class="bi ${icon}"></i>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
        `;

        elements.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('toast-hide');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function formatDate(dateString) {
        if (!dateString) return '-';

        try {
            const date = new Date(dateString);
            const options = {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            };
            return date.toLocaleDateString('id-ID', options);
        } catch (e) {
            return dateString;
        }
    }

    // ========================================
    // EXPORT
    // ========================================
    window.CaseDetailManager = {
        loadCaseDetail: loadCaseDetail,
        updateCaseStatus: updateCaseStatus,
        deleteCase: deleteCase
    };

})();
