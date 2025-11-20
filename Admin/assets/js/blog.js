/**
 * ============================================================
 * SIGAP PPKS - Blog Management JavaScript
 * File: assets/js/blog.js
 * Description: Handles blog list checkbox functionality
 * ============================================================
 */

(function() {
    'use strict';

    // ========================================
    // DOM ELEMENTS
    // ========================================
    let checkAllBtn = null;
    let blogCheckboxes = null;
    let deleteBtn = null;

    // ========================================
    // INITIALIZATION
    // ========================================
    document.addEventListener('DOMContentLoaded', function() {
        initElements();
        attachEventListeners();
    });

    /**
     * Initialize DOM element references
     */
    function initElements() {
        checkAllBtn = document.getElementById('checkAllBlogs');
        blogCheckboxes = document.querySelectorAll('.blog-checkbox');
        deleteBtn = document.getElementById('btnDeleteBlogs');
    }

    /**
     * Attach event listeners
     */
    function attachEventListeners() {
        // Check all functionality
        if (checkAllBtn) {
            checkAllBtn.addEventListener('change', toggleAllCheckboxes);
        }

        // Individual checkbox listeners
        if (blogCheckboxes) {
            blogCheckboxes.forEach(checkbox => {
                checkbox.addEventListener('change', updateCheckAllState);

                // Prevent checkbox click from triggering parent link (if wrapped)
                checkbox.addEventListener('click', function(e) {
                    e.stopPropagation();
                });
            });
        }

        // Delete button
        if (deleteBtn) {
            deleteBtn.addEventListener('click', handleDelete);
        }
    }

    // ========================================
    // CHECKBOX FUNCTIONALITY
    // ========================================

    /**
     * Toggle all checkboxes
     */
    function toggleAllCheckboxes(event) {
        const isChecked = event.target.checked;

        blogCheckboxes.forEach(checkbox => {
            checkbox.checked = isChecked;
        });

        updateDeleteButtonVisibility();
    }

    /**
     * Update check all state based on individual checkboxes
     */
    function updateCheckAllState() {
        const allChecked = Array.from(blogCheckboxes).every(cb => cb.checked);
        const someChecked = Array.from(blogCheckboxes).some(cb => cb.checked);

        if (checkAllBtn) {
            checkAllBtn.checked = allChecked;
            checkAllBtn.indeterminate = someChecked && !allChecked;
        }

        updateDeleteButtonVisibility();
    }

    /**
     * Show/hide delete button based on selection
     */
    function updateDeleteButtonVisibility() {
        const checkedCount = getCheckedBlogIds().length;

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

    /**
     * Get all checked blog IDs
     */
    function getCheckedBlogIds() {
        const checkedIds = [];

        blogCheckboxes.forEach(checkbox => {
            if (checkbox.checked) {
                const blogId = checkbox.getAttribute('data-blog-id');
                if (blogId) {
                    checkedIds.push(blogId);
                }
            }
        });

        return checkedIds;
    }

    // ========================================
    // DELETE FUNCTIONALITY
    // ========================================

    /**
     * Handle delete button click
     */
    function handleDelete() {
        const checkedIds = getCheckedBlogIds();

        if (checkedIds.length === 0) {
            showToast('Pilih blog yang ingin dihapus', 'error');
            return;
        }

        const confirmMessage = `Apakah Anda yakin ingin menghapus ${checkedIds.length} blog terpilih?\n\nBlog yang dihapus: ${checkedIds.join(', ')}`;

        if (confirm(confirmMessage)) {
            // TODO: Implement actual delete API call
            console.log('Deleting blogs:', checkedIds);
            showToast(`${checkedIds.length} blog berhasil dihapus`, 'success');

            // Reset checkboxes
            uncheckAll();
        }
    }

    /**
     * Uncheck all checkboxes
     */
    function uncheckAll() {
        if (checkAllBtn) {
            checkAllBtn.checked = false;
            checkAllBtn.indeterminate = false;
        }

        blogCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });

        updateDeleteButtonVisibility();
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
            toastContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
            `;
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 20px;
            background: ${type === 'success' ? '#1abc9c' : '#e74c3c'};
            color: white;
            border-radius: 8px;
            margin-bottom: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease;
        `;

        const icon = type === 'success' ? 'check-circle-fill' : 'exclamation-circle-fill';

        toast.innerHTML = `
            <i class="bi bi-${icon}" style="font-size: 1.2rem;"></i>
            <div>${message}</div>
        `;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);

    // ========================================
    // EXPORT (if needed)
    // ========================================
    window.BlogManager = {
        getCheckedBlogIds: getCheckedBlogIds,
        uncheckAll: uncheckAll,
        showToast: showToast
    };

})();
