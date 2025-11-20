/**
 * ============================================================
 * SIGAP PPKS - Cases Page JavaScript
 * File: assets/js/cases.js
 * Description: Handles case management functionality
 * ============================================================
 */

(function() {
    'use strict';

    // ========================================
    // DOM ELEMENTS
    // ========================================
    const elements = {
        listActive: null,
        listCompleted: null,
        rawDataStorage: null,
        countActive: null,
        countCompleted: null,
        tabButtons: null,
        checkAllBtn: null,
        deleteTrashBtn: null
    };

    // ========================================
    // STATE
    // ========================================
    const state = {
        currentTab: 'active',
        activeCases: [],
        completedCases: []
    };

    // ========================================
    // INITIALIZATION
    // ========================================
    document.addEventListener('DOMContentLoaded', function() {
        initElements();
        organizeCases();
        attachEventListeners();
    });

    /**
     * Initialize DOM element references
     */
    function initElements() {
        elements.listActive = document.getElementById('list-active');
        elements.listCompleted = document.getElementById('list-completed');
        elements.rawDataStorage = document.getElementById('raw-data-storage');
        elements.countActive = document.getElementById('count-active');
        elements.countCompleted = document.getElementById('count-completed');
        elements.tabButtons = document.querySelectorAll('.tab-btn');
        elements.checkAllBtn = document.getElementById('checkAll');
        elements.deleteTrashBtn = document.getElementById('btnDeleteTrash');
    }

    /**
     * Attach event listeners
     */
    function attachEventListeners() {
        // Tab switching
        elements.tabButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                const tabName = this.getAttribute('data-tab');
                switchTab(tabName);
            });
        });

        // Check all functionality
        if (elements.checkAllBtn) {
            elements.checkAllBtn.addEventListener('change', toggleAllCheckboxes);
        }

        // Prevent checkbox clicks from triggering navigation
        document.addEventListener('click', function(e) {
            if (e.target.type === 'checkbox' && e.target.closest('.case-item')) {
                e.stopPropagation();
            }
        });
    }

    // ========================================
    // CASE ORGANIZATION
    // ========================================

    /**
     * Organize cases into active and completed lists
     */
    function organizeCases() {
        if (!elements.rawDataStorage) {
            console.error('Raw data storage not found');
            return;
        }

        const rawCases = elements.rawDataStorage.querySelectorAll('.case-item-link');
        
        if (rawCases.length === 0) {
            showEmptyState('active');
            showEmptyState('completed');
            return;
        }

        let countActive = 0;
        let countCompleted = 0;

        rawCases.forEach(caseLink => {
            const item = caseLink.cloneNode(true);
            const statusBadge = item.querySelector('.status-badge');
            
            if (!statusBadge) return;

            const statusText = statusBadge.textContent.trim().toLowerCase();
            
            if (statusText === 'completed' || statusText === 'selesai') {
                elements.listCompleted.appendChild(item);
                state.completedCases.push(item);
                countCompleted++;
            } else {
                elements.listActive.appendChild(item);
                state.activeCases.push(item);
                countActive++;
            }
        });

        // Update badge counts
        updateBadgeCount('active', countActive);
        updateBadgeCount('completed', countCompleted);

        // Show empty state if no cases
        if (countActive === 0) {
            showEmptyState('active');
        }

        if (countCompleted === 0) {
            showEmptyState('completed');
        }
    }

    /**
     * Update badge count for a tab
     */
    function updateBadgeCount(tab, count) {
        const badge = document.getElementById(`count-${tab}`);
        if (badge) {
            badge.textContent = count;
        }
    }

    /**
     * Show empty state message
     */
    function showEmptyState(listType) {
        const list = listType === 'active' ? elements.listActive : elements.listCompleted;
        const message = listType === 'active' 
            ? 'Tidak ada kasus aktif saat ini.' 
            : 'Belum ada kasus yang diselesaikan.';
        
        const emptyElement = document.createElement('p');
        emptyElement.className = 'text-center text-muted py-4';
        emptyElement.textContent = message;
        
        list.appendChild(emptyElement);
    }

    // ========================================
    // TAB SWITCHING
    // ========================================

    /**
     * Switch between active and completed tabs
     */
    function switchTab(tabName) {
        if (!tabName || (tabName !== 'active' && tabName !== 'completed')) {
            console.error('Invalid tab name:', tabName);
            return;
        }

        state.currentTab = tabName;

        // Update active state on buttons
        elements.tabButtons.forEach(btn => {
            if (btn.getAttribute('data-tab') === tabName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Show/hide lists
        if (tabName === 'active') {
            elements.listActive.style.display = 'block';
            elements.listCompleted.style.display = 'none';
            
            // Hide delete button (safety feature)
            if (elements.deleteTrashBtn) {
                elements.deleteTrashBtn.classList.add('d-none');
            }
        } else {
            elements.listActive.style.display = 'none';
            elements.listCompleted.style.display = 'block';
            
            // Show delete button for completed cases
            if (elements.deleteTrashBtn) {
                elements.deleteTrashBtn.classList.remove('d-none');
            }
        }

        // Uncheck "check all" when switching tabs
        if (elements.checkAllBtn) {
            elements.checkAllBtn.checked = false;
        }
    }

    // ========================================
    // CHECKBOX FUNCTIONALITY
    // ========================================

    /**
     * Toggle all checkboxes in current view
     */
    function toggleAllCheckboxes(event) {
        const isChecked = event.target.checked;
        const currentList = state.currentTab === 'active' 
            ? elements.listActive 
            : elements.listCompleted;
        
        const checkboxes = currentList.querySelectorAll('.case-item input[type="checkbox"]');
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = isChecked;
        });
    }

    /**
     * Get all checked case IDs in current view
     */
    function getCheckedCaseIds() {
        const currentList = state.currentTab === 'active' 
            ? elements.listActive 
            : elements.listCompleted;
        
        const checkedBoxes = currentList.querySelectorAll('.case-item input[type="checkbox"]:checked');
        const caseIds = [];

        checkedBoxes.forEach(checkbox => {
            const caseItem = checkbox.closest('.case-item-link');
            if (caseItem) {
                const caseId = caseItem.getAttribute('href').split('id=')[1];
                if (caseId) {
                    caseIds.push(caseId);
                }
            }
        });

        return caseIds;
    }

    // ========================================
    // UTILITY FUNCTIONS
    // ========================================

    /**
     * Show toast notification
     */
    function showToast(message, type = 'success') {
        // Create toast container if not exists
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        const icon = type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill';
        
        toast.innerHTML = `
            <i class="bi ${icon}"></i>
            <div class="toast-content">
                <div class="toast-message">${message}</div>
            </div>
        `;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('toast-hide');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ========================================
    // EXPORT FUNCTIONS (for external use)
    // ========================================

    // Make functions available globally if needed
    window.CasesManager = {
        switchTab: switchTab,
        getCheckedCaseIds: getCheckedCaseIds,
        showToast: showToast
    };

})();