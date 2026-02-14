
(function() {
    'use strict';

    // ========================================
    // CONFIGURATION
    // ========================================
    const API_BASE = '../../../api/blog/';
    const DEBUG_MODE = false;

    // ========================================
    // STATE
    // ========================================
    let currentPage = 1;
    let totalPages = 1;
    let blogsPerPage = 10;
    let searchQuery = '';
    let csrfToken = '';

    // ========================================
    // DOM ELEMENTS
    // ========================================
    let checkAllBtn = null;
    let checkAllBtnMobile = null;
    let blogCheckboxes = null;
    let deleteBtn = null;
    let blogListContainer = null;
    let searchInput = null;
    let paginationContainer = null;

    // ========================================
    // INITIALIZATION
    // ========================================
    document.addEventListener('DOMContentLoaded', function() {
        initElements();
        attachEventListeners();
        loadBlogs(); // Load blogs from API
    });

    /**
     * Initialize DOM element references
     */
    function initElements() {
        checkAllBtn = document.getElementById('checkAllBlogs');
        checkAllBtnMobile = document.getElementById('checkAllBlogsMobile');
        blogListContainer = document.querySelector('.blog-list');
        deleteBtn = document.getElementById('btnDeleteBlogs');

        // Note: blogCheckboxes will be initialized after rendering blogs
    }

    /**
     * Attach event listeners
     */
    function attachEventListeners() {
        // Check all functionality (Desktop)
        if (checkAllBtn) {
            checkAllBtn.addEventListener('change', toggleAllCheckboxes);
        }

        // Check all functionality (Mobile)
        if (checkAllBtnMobile) {
            checkAllBtnMobile.addEventListener('change', toggleAllCheckboxes);
        }

        // Delete button
        if (deleteBtn) {
            deleteBtn.addEventListener('click', handleDelete);
        }

        // Note: Individual checkbox listeners will be attached after rendering blogs
    }

    /**
     * Attach checkbox listeners (called after rendering)
     */
    function attachCheckboxListeners() {
        blogCheckboxes = document.querySelectorAll('.blog-checkbox');

        if (blogCheckboxes) {
            blogCheckboxes.forEach(checkbox => {
                checkbox.addEventListener('change', updateCheckAllState);

                // Prevent checkbox click from triggering parent link or other events
                checkbox.addEventListener('click', function(e) {
                    e.stopPropagation();
                });

                // Add explicit touch support for mobile
                checkbox.addEventListener('touchend', function(e) {
                    // Prevent default to disable zooming but allow state change
                    // e.preventDefault(); 
                    e.stopPropagation();
                    // Toggle manually if needed, but usually touchend -> click works if verify click didn't fire
                }, {passive: false});
            });
        }
    }

    // ========================================
    // API FUNCTIONS
    // ========================================

    /**
     * Load blogs from API
     */
    async function loadBlogs() {
        try {
            // Show loading state
            showLoadingState();

            const params = new URLSearchParams({
                page: currentPage,
                limit: blogsPerPage
            });

            if (searchQuery) {
                params.append('search', searchQuery);
            }

            const response = await fetch(`${API_BASE}get_blogs.php?${params.toString()}`, {
                method: 'GET',
                credentials: 'same-origin',
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (DEBUG_MODE) {
                console.log('Blog API Response:', data);
            }

            if (data.status === 'success') {
                renderBlogs(data.data.blogs);
                renderPagination(data.pagination);

                // Store CSRF token if provided
                if (data.csrf_token) {
                    csrfToken = data.csrf_token;
                }
            } else {
                throw new Error(data.message || 'Failed to load blogs');
            }

        } catch (error) {
            console.error('Error loading blogs:', error);
            showErrorState(error.message);
        }
    }

    /**
     * Render blogs in the list
     */
    function renderBlogs(blogs) {
        if (!blogListContainer) return;

        if (blogs.length === 0) {
            blogListContainer.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-inbox" style="font-size: 3rem; color: #ccc;"></i>
                    <p class="text-muted mt-3">Belum ada blog. <a href="blog-create.html">Buat blog pertama Anda!</a></p>
                </div>
            `;
            return;
        }

        const blogsHTML = blogs.map((blog, index) => {
            const blogNumber = (currentPage - 1) * blogsPerPage + index + 1;
            const updatedDate = formatDate(blog.updated_at);

            return `
                <div class="blog-item">
                    <div class="row g-0 align-items-center w-100 position-relative">
                        <!-- Checkbox Column -->
                        <div class="col-auto col-checkbox me-3">
                            <div class="form-check d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
                                <input class="form-check-input blog-checkbox" type="checkbox" data-blog-id="${blog.id}" style="transform: scale(1.3); cursor: pointer;">
                            </div>
                        </div>
                        
                        <!-- ID Column -->
                        <div class="col-lg-1 col-id"><span class="blog-no">#${blog.id}</span></div>
                        
                        <!-- Title Column -->
                        <div class="col-lg-5 col-title"><span class="blog-title">${escapeHtml(blog.judul)}</span></div>
                        
                        <!-- Date Column -->
                        <div class="col-lg-2 text-center col-date"><i class="bi bi-calendar-event-fill me-2 text-muted"></i> ${updatedDate}</div>
                        
                        <!-- Action Column -->
                        <div class="col-lg-2 text-center col-action">
                            <a href="blog-edit.html?id=${blog.id}" class="btn btn-sm btn-light-success">Edit</a>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        blogListContainer.innerHTML = blogsHTML;

        // Attach checkbox listeners after rendering
        attachCheckboxListeners();

        // Reset check all state
        if (checkAllBtn) {
            checkAllBtn.checked = false;
            checkAllBtn.indeterminate = false;
        }
        if (checkAllBtnMobile) {
            checkAllBtnMobile.checked = false;
            checkAllBtnMobile.indeterminate = false;
        }
    }

    /**
     * Render pagination
     */
    function renderPagination(pagination) {
        totalPages = pagination.total_pages;
        currentPage = pagination.current_page;

        // You can add pagination UI here if needed
        // For now, we'll keep it simple
    }

    /**
     * Show loading state
     */
    function showLoadingState() {
        if (!blogListContainer) return;

        blogListContainer.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="text-muted mt-3">Memuat blog...</p>
            </div>
        `;
    }

    /**
     * Show error state
     */
    function showErrorState(message) {
        if (!blogListContainer) return;

        blogListContainer.innerHTML = `
            <div class="text-center py-5">
                <i class="bi bi-exclamation-triangle text-danger" style="font-size: 3rem;"></i>
                <p class="text-danger mt-3">${escapeHtml(message)}</p>
                <button class="btn btn-primary btn-sm" onclick="location.reload()">
                    <i class="bi bi-arrow-clockwise me-2"></i>Muat Ulang
                </button>
            </div>
        `;
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
        const checkedBoxes = Array.from(blogCheckboxes).filter(cb => cb.checked);
        const totalBoxes = blogCheckboxes.length;
        const checkedCount = checkedBoxes.length;

        // Update desktop checkbox
        if (checkAllBtn) {
            if (checkedCount === 0) {
                // None checked
                checkAllBtn.checked = false;
                checkAllBtn.indeterminate = false;
            } else if (checkedCount === totalBoxes) {
                // All checked
                checkAllBtn.checked = true;
                checkAllBtn.indeterminate = false;
            } else {
                // Some checked (indeterminate state)
                checkAllBtn.checked = false;
                checkAllBtn.indeterminate = true;
            }
        }

        // Sync mobile checkbox state
        if (checkAllBtnMobile) {
            if (checkedCount === 0) {
                checkAllBtnMobile.checked = false;
                checkAllBtnMobile.indeterminate = false;
            } else if (checkedCount === totalBoxes) {
                checkAllBtnMobile.checked = true;
                checkAllBtnMobile.indeterminate = false;
            } else {
                checkAllBtnMobile.checked = false;
                checkAllBtnMobile.indeterminate = true;
            }
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
    async function handleDelete() {
        const checkedIds = getCheckedBlogIds();

        if (checkedIds.length === 0) {
            showToast('Pilih blog yang ingin dihapus', 'error');
            return;
        }

        const confirmMessage = `Apakah Anda yakin ingin menghapus ${checkedIds.length} blog terpilih?\n\nTindakan ini tidak dapat dibatalkan!`;

        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            // Disable delete button while processing
            if (deleteBtn) {
                deleteBtn.disabled = true;
                const btnText = deleteBtn.querySelector('.btn-text');
                if (btnText) {
                    btnText.textContent = 'Menghapus...';
                }
            }

            const response = await fetch(`${API_BASE}delete_blog.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    ids: checkedIds.map(id => parseInt(id)),
                    csrf_token: csrfToken
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (DEBUG_MODE) {
                console.log('Delete Response:', data);
            }

            if (data.status === 'success') {
                showToast(data.message || `${checkedIds.length} blog berhasil dihapus`, 'success');

                // Reset checkboxes and reload blogs
                uncheckAll();

                // Reload the blog list
                setTimeout(() => {
                    loadBlogs();
                }, 500);
            } else {
                throw new Error(data.message || 'Gagal menghapus blog');
            }

        } catch (error) {
            console.error('Error deleting blogs:', error);
            showToast(error.message || 'Gagal menghapus blog', 'error');
        } finally {
            // Re-enable delete button
            if (deleteBtn) {
                deleteBtn.disabled = false;
                updateDeleteButtonVisibility();
            }
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

        if (checkAllBtnMobile) {
            checkAllBtnMobile.checked = false;
            checkAllBtnMobile.indeterminate = false;
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
     * Format date to readable format
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
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

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
        loadBlogs: loadBlogs,
        getCheckedBlogIds: getCheckedBlogIds,
        uncheckAll: uncheckAll,
        showToast: showToast,
        getCsrfToken: () => csrfToken
    };

})();
