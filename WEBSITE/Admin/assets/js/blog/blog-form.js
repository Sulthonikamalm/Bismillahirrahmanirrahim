(function() {
    'use strict';

    const API_BASE = '../../../api/blog/';
    const DEBUG_MODE = false; // Matikan untuk production

    let isEditMode = false;
    let blogId = null;
    let csrfToken = '';
    let uploadedImageUrl = '';
    let isSubmitting = false;

    let postForm = null;
    let imageUpload = null;
    let imagePreview = null;
    let imageUploadLabel = null;
    let postJudul = null;
    let postKategori = null;
    let postIsi = null;
    let imageError = null;
    let judulError = null;
    let kategoriError = null;
    let isiError = null;
    let submitBtn = null;

    document.addEventListener('DOMContentLoaded', async function() {
        initElements();
        detectMode();
        attachEventListeners();

        if (isEditMode) {
            await loadBlogData();
        } else {
            // Get CSRF token for create mode
            await getCsrfToken();
        }
    });

    /**
     * Initialize DOM elements
     */
    function initElements() {
        postForm = document.getElementById('postForm');
        imageUpload = document.getElementById('imageUpload');
        imagePreview = document.getElementById('imagePreview');
        imageUploadLabel = document.getElementById('imageUploadLabel');
        postJudul = document.getElementById('postJudul');
        postKategori = document.getElementById('postKategori');
        postIsi = document.getElementById('postIsi');
        imageError = document.getElementById('imageError');
        judulError = document.getElementById('judulError');
        kategoriError = document.getElementById('kategoriError');
        isiError = document.getElementById('isiError');
        submitBtn = postForm ? postForm.querySelector('button[type="submit"]') : null;
    }

    /**
     * Detect if we're in create or edit mode
     */
    function detectMode() {
        const urlParams = new URLSearchParams(window.location.search);
        blogId = urlParams.get('id');

        if (blogId) {
            isEditMode = true;
            blogId = parseInt(blogId);

            if (DEBUG_MODE) {
                console.log('Edit mode detected. Blog ID:', blogId);
            }
        }
    }

    /**
     * Attach event listeners
     */
    function attachEventListeners() {
        // Image upload preview
        if (imageUpload) {
            imageUpload.addEventListener('change', handleImagePreview);
        }

        // Form submit
        if (postForm) {
            postForm.addEventListener('submit', handleFormSubmit);
        }
    }

    // ========================================
    // IMAGE HANDLING
    // ========================================

    /**
     * Handle image preview
     */
    function handleImagePreview(event) {
        const file = event.target.files[0];

        if (!file) return;

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            showError(imageError, 'Format gambar tidak valid. Gunakan JPEG, PNG, GIF, atau WebP.');
            imageUpload.value = '';
            return;
        }

        // Validate file size (5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            showError(imageError, 'Ukuran gambar maksimal 5MB.');
            imageUpload.value = '';
            return;
        }

        // Show preview
        const reader = new FileReader();
        reader.onload = function(e) {
            imagePreview.src = e.target.result;
            imageUploadLabel.classList.add('has-image');
            hideError(imageError);
        };
        reader.readAsDataURL(file);
    }

    /**
     * Upload image to server
     */
    async function uploadImage() {
        const file = imageUpload.files[0];

        if (!file) {
            // If editing and no new image, use existing URL
            return null;
        }

        try {
            const formData = new FormData();
            formData.append('image', file);
            formData.append('csrf_token', csrfToken);

            const response = await fetch(`${API_BASE}upload_image.php`, {
                method: 'POST',
                credentials: 'same-origin',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (DEBUG_MODE) {
                console.log('Image upload response:', data);
            }

            if (data.status === 'success') {
                // Handle both response formats: data.url or data.data.url
                const imageUrl = data.url || (data.data && data.data.url);
                if (!imageUrl) {
                    throw new Error('No image URL in response');
                }
                return imageUrl;
            } else {
                throw new Error(data.message || 'Failed to upload image');
            }

        } catch (error) {
            console.error('Error uploading image:', error);
            throw new Error('Gagal upload gambar: ' + error.message);
        }
    }

    // ========================================
    // FORM HANDLING
    // ========================================

    /**
     * Load blog data for editing
     */
    async function loadBlogData() {
        try {
            const response = await fetch(`${API_BASE}get_blog_detail.php?id=${blogId}`, {
                method: 'GET',
                credentials: 'same-origin',
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (DEBUG_MODE) {
                console.log('Blog detail response:', data);
            }

            if (data.status === 'success') {
                populateForm(data.data);

                // Store CSRF token
                if (data.csrf_token) {
                    csrfToken = data.csrf_token;
                }
            } else {
                throw new Error(data.message || 'Failed to load blog');
            }

        } catch (error) {
            console.error('Error loading blog:', error);
            alert('Gagal memuat data blog: ' + error.message);
            window.location.href = 'blog-list.html';
        }
    }

    /**
     * Populate form with blog data
     */
    function populateForm(blog) {
        if (postJudul) {
            postJudul.value = blog.judul;
        }

        if (postKategori && blog.kategori) {
            postKategori.value = blog.kategori;
        }

        if (postIsi) {
            postIsi.value = blog.isi_postingan;
        }

        // Populate rich text editor if available
        if (window.editorContent && blog.isi_postingan) {
            window.editorContent.innerHTML = blog.isi_postingan;
        }

        if (blog.gambar_header_url) {
            uploadedImageUrl = blog.gambar_header_url;

            if (imagePreview) {
                imagePreview.src = blog.gambar_header_url;
                imageUploadLabel.classList.add('has-image');
            }
        }
    }

    /**
     * Validate form
     */
    function validateForm() {
        let isValid = true;

        // Hide all errors first
        hideError(judulError);
        hideError(kategoriError);
        hideError(isiError);
        hideError(imageError);

        // Validate judul
        const judul = postJudul.value.trim();
        if (judul === '') {
            showError(judulError, 'Judul tidak boleh kosong.');
            isValid = false;
        } else if (judul.length < 5) {
            showError(judulError, 'Judul minimal 5 karakter.');
            isValid = false;
        } else if (judul.length > 255) {
            showError(judulError, 'Judul maksimal 255 karakter.');
            isValid = false;
        }

        // Validate kategori
        if (postKategori) {
            const kategori = postKategori.value;
            if (kategori === '') {
                showError(kategoriError, 'Kategori tidak boleh kosong.');
                isValid = false;
            }
        }

        // Validate isi
        const isi = postIsi.value.trim();
        if (isi === '') {
            showError(isiError, 'Isi postingan tidak boleh kosong.');
            isValid = false;
        } else if (isi.length < 50) {
            showError(isiError, 'Isi postingan minimal 50 karakter.');
            isValid = false;
        }

        // Validate image (only required for create mode)
        if (!isEditMode && imageUpload.files.length === 0) {
            showError(imageError, 'Gambar tidak boleh kosong.');
            isValid = false;
        }

        return isValid;
    }

    /**
     * Handle form submission
     */
    async function handleFormSubmit(event) {
        event.preventDefault();

        if (isSubmitting) {
            return; // Prevent double submission
        }

        // Validate form
        if (!validateForm()) {
            return;
        }

        isSubmitting = true;
        setSubmitButtonState(true);

        try {
            // Step 1: Upload image if new file selected
            let imageUrl = uploadedImageUrl;

            if (imageUpload.files.length > 0) {
                imageUrl = await uploadImage();
            }

            // Step 2: Submit blog data
            // SANITIZE CONTENT: Remove image resizer artifacts before sending
            const rawContent = postIsi.value.trim();
            const cleanContent = sanitizeBlogContent(rawContent);

            const blogData = {
                judul: postJudul.value.trim(),
                isi_postingan: cleanContent,
                gambar_header_url: imageUrl || '',
                kategori: postKategori ? postKategori.value : '',
                csrf_token: csrfToken
            };

            if (isEditMode) {
                blogData.id = blogId;
                await updateBlog(blogData);
            } else {
                await createBlog(blogData);
            }

        } catch (error) {
            console.error('Error submitting form:', error);
            alert(error.message || 'Terjadi kesalahan saat menyimpan blog');
            isSubmitting = false;
            setSubmitButtonState(false);
        }
    }

    /**
     * Create new blog
     */
    async function createBlog(blogData) {
        try {
            const response = await fetch(`${API_BASE}create_blog.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin',
                body: JSON.stringify(blogData)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (DEBUG_MODE) {
                console.log('Create blog response:', data);
            }

            if (data.status === 'success') {
                // Show success message
                alert('✅ Blog berhasil dibuat!');

                // Redirect to blog list
                window.location.href = 'blog-list.html';
            } else {
                throw new Error(data.message || 'Failed to create blog');
            }

        } catch (error) {
            console.error('Error creating blog:', error);
            throw new Error('Gagal membuat blog: ' + error.message);
        }
    }

    /**
     * Update existing blog
     */
    async function updateBlog(blogData) {
        try {
            const response = await fetch(`${API_BASE}update_blog.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin',
                body: JSON.stringify(blogData)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (DEBUG_MODE) {
                console.log('Update blog response:', data);
            }

            if (data.status === 'success') {
                // Show success message
                alert('✅ Blog berhasil diperbarui!');

                // Redirect to blog list
                window.location.href = 'blog-list.html';
            } else {
                throw new Error(data.message || 'Failed to update blog');
            }

        } catch (error) {
            console.error('Error updating blog:', error);
            throw new Error('Gagal memperbarui blog: ' + error.message);
        }
    }

    /**
     * Set submit button state
     */
    function setSubmitButtonState(loading) {
        if (!submitBtn) return;

        if (loading) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `
                <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Menyimpan...
            `;
        } else {
            submitBtn.disabled = false;
            submitBtn.textContent = isEditMode ? 'Simpan Perubahan' : 'Posting';
        }
    }

    // ========================================
    // UTILITY FUNCTIONS
    // ========================================

    /**
     * Show error message
     */
    function showError(element, message) {
        if (!element) return;

        element.textContent = message;
        element.style.display = 'block';
    }

    /**
     * Hide error message
     */
    function hideError(element) {
        if (!element) return;

        element.style.display = 'none';
    }

    // ========================================
    // GET CSRF TOKEN ON LOAD
    // ========================================

    /**
     * Get CSRF token from auth_check API
     */
    async function getCsrfToken() {
        try {
            const response = await fetch('../../../api/auth/check.php', {
                method: 'GET',
                credentials: 'same-origin',
                cache: 'no-store'
            });

            const data = await response.json();

            // Get CSRF token from response (try both locations)
            if (data.csrf_token) {
                csrfToken = data.csrf_token;
            } else if (data.session && data.session.csrf_token) {
                csrfToken = data.session.csrf_token;
            }

            if (DEBUG_MODE) {
                console.log('CSRF token obtained:', csrfToken);
            }

            if (!csrfToken) {
                console.warn('No CSRF token received from auth_check');
            }
        } catch (error) {
            console.error('Error getting CSRF token:', error);
        }
    }

    /**
     * Helper: Sanitize content remove editor artifacts
     */
    function sanitizeBlogContent(html) {
        if (!html) return '';
        const div = document.createElement('div');
        div.innerHTML = html;

        // 1. Unwrap Resizable Images
        div.querySelectorAll('.resizable-image-wrapper').forEach(wrapper => {
            const img = wrapper.querySelector('img');
            if (img) {
                // Transfer alignment classes to inline styles
                if (wrapper.classList.contains('align-center')) {
                    img.style.display = 'block';
                    img.style.margin = '2rem auto';
                } else if (wrapper.classList.contains('align-right')) {
                    img.style.float = 'right';
                    img.style.marginLeft = '1.5rem';
                    img.style.marginBottom = '1rem';
                } else if (wrapper.classList.contains('align-left')) {
                    img.style.float = 'left';
                    img.style.marginRight = '1.5rem';
                    img.style.marginBottom = '1rem';
                }
                
                // Cleanup attrs
                img.removeAttribute('data-wrapped');
                img.style.maxWidth = '100%'; 
                
                wrapper.parentNode.replaceChild(img, wrapper);
            } else {
                wrapper.remove();
            }
        });

        // 2. Remove any leftover artifacts
        div.querySelectorAll('.image-toolbar, .image-size-info, .resize-handle, .image-delete-btn').forEach(el => el.remove());

        return div.innerHTML;
    }

})();
