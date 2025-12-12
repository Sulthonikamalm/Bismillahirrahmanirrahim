/**
 * ============================================================
 * SIGAP PPKPT - Case Management JavaScript
 * File: assets/js/cases.js
 * Description: Handles case list, filtering, and CRUD operations
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
    let currentTab = 'active'; // 'active' or 'completed'
    let allCases = [];
    let csrfToken = '';

    // ========================================
    // DOM ELEMENTS
    // ========================================
    let tabButtons = null;
    let listActive = null;
    let listCompleted = null;
    let checkAllBtn = null;
    let deleteBtn = null;
    let countActive = null;
    let countCompleted = null;

    // ========================================
    // INITIALIZATION
    // ========================================
    document.addEventListener('DOMContentLoaded', function() {
        initElements();
        attachEventListeners();
        loadCases();
    });

    /**
     * Initialize DOM elements
     */
    function initElements() {
        tabButtons = document.querySelectorAll('.tab-btn');
        listActive = document.getElementById('list-active');
        listCompleted = document.getElementById('list-completed');
        checkAllBtn = document.getElementById('checkAll');
        deleteBtn = document.getElementById('btnDeleteTrash');
        countActive = document.getElementById('count-active');
        countCompleted = document.getElementById('count-completed');
    }

    /**
     * Attach event listeners
     */
    function attachEventListeners() {
        // Tab switching
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => switchTab(btn.dataset.tab));
        });

        // Check all checkbox
        if (checkAllBtn) {
            checkAllBtn.addEventListener('change', toggleAllCheckboxes);
        }

        // Delete button
        if (deleteBtn) {
            deleteBtn.addEventListener('click', handleDelete);
        }
    }

    // ========================================
    // API FUNCTIONS
    // ========================================

    /**
     * Load cases from API
     */
    async function loadCases() {
        try {
            showLoadingState();

            const response = await fetch(`${API_BASE}get_cases.php?limit=100`, {
                method: 'GET',
                credentials: 'same-origin',
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (DEBUG_MODE) {
                console.log('Cases API Response:', data);
            }

            if (data.status === 'success') {
                allCases = data.data.cases;

                // Store CSRF token
                if (data.csrf_token) {
                    csrfToken = data.csrf_token;
                }

                // Render cases
                renderCases();
                updateCounts();
            } else {
                throw new Error(data.message || 'Failed to load cases');
            }

        } catch (error) {
            console.error('Error loading cases:', error);
            showErrorState(error.message);
        }
    }

    /**
     * Render cases in both tabs
     */
    function renderCases() {
        // Separate cases by status
        const activeCases = allCases.filter(c =>
            c.status_laporan === 'Process' ||
            c.status_laporan === 'In Progress'
        );
        const completedCases = allCases.filter(c =>
            c.status_laporan === 'Resolved' ||
            c.status_laporan === 'Closed' ||
            c.status_laporan === 'Completed'
        );

        // Render active cases
        renderCaseList(listActive, activeCases);

        // Render completed cases
        renderCaseList(listCompleted, completedCases);
    }

    /**
     * Render case list to container
     */
    function renderCaseList(container, cases) {
        if (!container) return;

        if (cases.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-inbox" style="font-size: 3rem; color: #ccc;"></i>
                    <p class="text-muted mt-3">Tidak ada kasus</p>
                </div>
            `;
            return;
        }

        const casesHTML = cases.map(caseItem => {
            const worryClass = getWorryClass(caseItem.tingkat_kekhawatiran);
            const statusClass = getStatusClass(caseItem.status_laporan);
            const formattedDate = formatDate(caseItem.created_at);

            return `
                <a href="case-detail.html?id=${caseItem.id}" class="case-item-link" data-status="${caseItem.status_laporan.toLowerCase().replace(' ', '-')}">
                    <div class="case-item">
                        <div class="case-content">
                            <div class="case-checkbox">
                                <input class="form-check-input case-checkbox-input" type="checkbox" data-case-id="${caseItem.id}" onclick="event.stopPropagation();">
                            </div>
                            <div class="case-id">#${escapeHtml(caseItem.kode_pelaporan)}</div>
                            <div class="case-worry">
                                <div class="khawatir-bar ${worryClass}"></div>
                            </div>
                            <div class="case-email">
                                <i class="bi bi-envelope-fill"></i>
                                <span>${escapeHtml(caseItem.email_korban || 'N/A')}</span>
                            </div>
                            <div class="case-date">
                                <i class="bi bi-calendar-event-fill"></i>
                                <span>${formattedDate}</span>
                            </div>
                            <div class="case-status">
                                <span class="status-badge status-${statusClass}">${escapeHtml(caseItem.status_laporan)}</span>
                            </div>
                        </div>
                    </div>
                </a>
            `;
        }).join('');

        container.innerHTML = casesHTML;

        // Attach checkbox listeners
        attachCheckboxListeners(container);
    }

    /**
     * Update case counts in tabs
     */
    function updateCounts() {
        const activeCount = allCases.filter(c =>
            c.status_laporan === 'Process' ||
            c.status_laporan === 'In Progress'
        ).length;

        const completedCount = allCases.filter(c =>
            c.status_laporan === 'Resolved' ||
            c.status_laporan === 'Closed' ||
            c.status_laporan === 'Completed'
        ).length;

        if (countActive) countActive.textContent = activeCount;
        if (countCompleted) countCompleted.textContent = completedCount;
    }

    // ========================================
    // TAB FUNCTIONALITY
    // ========================================

    /**
     * Switch between tabs
     */
    function switchTab(tab) {
        currentTab = tab;

        // Update tab buttons
        tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        // Show/hide lists
        if (listActive) listActive.style.display = tab === 'active' ? 'block' : 'none';
        if (listCompleted) listCompleted.style.display = tab === 'completed' ? 'block' : 'none';

        // Reset checkboxes
        if (checkAllBtn) checkAllBtn.checked = false;
        updateDeleteButtonVisibility();
    }

    // ========================================
    // CHECKBOX FUNCTIONALITY
    // ========================================

    /**
     * Attach checkbox listeners
     */
    function attachCheckboxListeners(container) {
        const checkboxes = container.querySelectorAll('.case-checkbox-input');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', updateDeleteButtonVisibility);
        });
    }

    /**
     * Toggle all checkboxes in current tab
     */
    function toggleAllCheckboxes(event) {
        const isChecked = event.target.checked;
        const currentList = currentTab === 'active' ? listActive : listCompleted;

        if (currentList) {
            const checkboxes = currentList.querySelectorAll('.case-checkbox-input');
            checkboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
            });
        }

        updateDeleteButtonVisibility();
    }

    /**
     * Get checked case IDs
     */
    function getCheckedCaseIds() {
        const currentList = currentTab === 'active' ? listActive : listCompleted;
        const checkedIds = [];

        if (currentList) {
            const checkboxes = currentList.querySelectorAll('.case-checkbox-input:checked');
            checkboxes.forEach(checkbox => {
                checkedIds.push(parseInt(checkbox.dataset.caseId));
            });
        }

        return checkedIds;
    }

    /**
     * Update delete button visibility
     */
    function updateDeleteButtonVisibility() {
        const checkedCount = getCheckedCaseIds().length;

        if (deleteBtn) {
            if (checkedCount > 0) {
                deleteBtn.classList.remove('d-none');
                const btnText = deleteBtn.querySelector('.btn-text');
                if (btnText) {
                    btnText.textContent = `Hapus (${checkedCount})`;
                }
            } else {
                deleteBtn.classList.add('d-none');
            }
        }
    }

    // ========================================
    // DELETE FUNCTIONALITY
    // ========================================

    /**
     * Handle delete button click
     */
    async function handleDelete() {
        const checkedIds = getCheckedCaseIds();

        if (checkedIds.length === 0) {
            showToast('Pilih kasus yang ingin dihapus', 'error');
            return;
        }

        const confirmMessage = `Apakah Anda yakin ingin menghapus ${checkedIds.length} kasus terpilih?\n\nTindakan ini tidak dapat dibatalkan!`;

        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            if (deleteBtn) {
                deleteBtn.disabled = true;
                const btnText = deleteBtn.querySelector('.btn-text');
                if (btnText) btnText.textContent = 'Menghapus...';
            }

            const response = await fetch(`${API_BASE}delete_case.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({
                    ids: checkedIds,
                    csrf_token: csrfToken
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.status === 'success') {
                showToast(data.message || `${checkedIds.length} kasus berhasil dihapus`, 'success');

                // Reload cases
                setTimeout(() => loadCases(), 500);
            } else {
                throw new Error(data.message || 'Gagal menghapus kasus');
            }

        } catch (error) {
            console.error('Error deleting cases:', error);
            showToast(error.message || 'Gagal menghapus kasus', 'error');
        } finally {
            if (deleteBtn) {
                deleteBtn.disabled = false;
                updateDeleteButtonVisibility();
            }
        }
    }

    // ========================================
    // UI STATE FUNCTIONS
    // ========================================

    /**
     * Show loading state
     */
    function showLoadingState() {
        const loadingHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="text-muted mt-3">Memuat data kasus...</p>
            </div>
        `;

        if (listActive) listActive.innerHTML = loadingHTML;
        if (listCompleted) listCompleted.innerHTML = loadingHTML;
    }

    /**
     * Show error state
     */
    function showErrorState(message) {
        const errorHTML = `
            <div class="text-center py-5">
                <i class="bi bi-exclamation-triangle text-danger" style="font-size: 3rem;"></i>
                <p class="text-danger mt-3">${escapeHtml(message)}</p>
                <button class="btn btn-primary btn-sm" onclick="location.reload()">
                    <i class="bi bi-arrow-clockwise me-2"></i>Muat Ulang
                </button>
            </div>
        `;

        if (listActive) listActive.innerHTML = errorHTML;
        if (listCompleted) listCompleted.innerHTML = errorHTML;
    }

    // ========================================
    // UTILITY FUNCTIONS
    // ========================================

    /**
     * Get worry level CSS class
     */
    function getWorryClass(tingkatKekhawatiran) {
        if (!tingkatKekhawatiran) return 'sedikit';

        const level = tingkatKekhawatiran.toLowerCase();
        if (level.includes('sangat') || level.includes('darurat')) return 'sangat';
        if (level.includes('khawatir')) return 'khawatir';
        return 'sedikit';
    }

    /**
     * Get status CSS class
     */
    function getStatusClass(status) {
        if (!status) return 'process';

        const s = status.toLowerCase().replace(' ', '-');
        if (s === 'resolved' || s === 'completed' || s === 'closed') return 'completed';
        if (s === 'in-progress' || s === 'investigation') return 'investigation';
        return 'process';
    }

    /**
     * Format date
     */
    function formatDate(dateString) {
        const date = new Date(dateString);
        const options = { day: '2-digit', month: 'short', year: 'numeric' };
        return date.toLocaleDateString('id-ID', options);
    }

    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.toString().replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * Show toast notification
     */
    function showToast(message, type = 'success') {
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            toastContainer.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999;';
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement('div');
        toast.style.cssText = `
            display: flex; align-items: center; gap: 12px; padding: 12px 20px;
            background: ${type === 'success' ? '#1abc9c' : '#e74c3c'}; color: white;
            border-radius: 8px; margin-bottom: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease;
        `;

        const icon = type === 'success' ? 'check-circle-fill' : 'exclamation-circle-fill';
        toast.innerHTML = `<i class="bi bi-${icon}" style="font-size: 1.2rem;"></i><div>${escapeHtml(message)}</div>`;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(400px); opacity: 0; } }
    `;
    document.head.appendChild(style);

    // ========================================
    // EXPORT
    // ========================================
    window.CaseManager = {
        loadCases: loadCases,
        getCheckedCaseIds: getCheckedCaseIds,
        showToast: showToast
    };

})();
