/**
 * @fileoverview Module for fetching and rendering dynamic blog content for Wawasan page.
 * Handles API communication, sanitization, skeletal loading, and error states.
 */

// Configuration
const CONFIG = {
    API_ENDPOINT: '../api/blog/get_blogs.php',
    ARTICLE_LIMIT: 6,
    READ_PAGE_URL: '../Blog/baca.html',
    DEFAULT_IMAGE: 'https://via.placeholder.com/400x250/e07b8a/ffffff?text=Image+Not+Found', // Fallback image
    RETRY_DELAY: 1000 // ms
};

/**
 * Sanitizes a string to prevent XSS attacks.
 * @param {string} str - The raw string to sanitize.
 * @returns {string} - The sanitized string.
 */
function sanitizeHTML(str) {
    if (!str) return '';
    const tempDiv = document.createElement('div');
    tempDiv.textContent = str;
    return tempDiv.innerHTML;
}

/**
 * Formats a date string to a readable format (e.g., "5 Desember 2024").
 * @param {string} dateStr - The date string from the database.
 * @returns {string} - Formatted date.
 */
function formatDate(dateStr) {
    if (!dateStr) return '';
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    try {
        return new Date(dateStr).toLocaleDateString('id-ID', options);
    } catch (e) {
        return dateStr;
    }
}

/**
 * Generates the HTML for skeleton loading state.
 * @param {number} count - Number of skeleton cards to generate.
 * @returns {string} - HTML string for skeletons.
 */
function createSkeleton(count = 3) {
    let html = '';
    for (let i = 0; i < count; i++) {
        html += `
        <article class="artikel-card skeleton-card">
            <div class="skeleton-image skeleton-anim"></div>
            <div class="artikel-content">
                <div class="skeleton-text skeleton-tag skeleton-anim"></div>
                <div class="skeleton-meta">
                    <div class="skeleton-text skeleton-sm skeleton-anim"></div>
                    <div class="skeleton-text skeleton-sm skeleton-anim"></div>
                </div>
                <div class="skeleton-text skeleton-title skeleton-anim"></div>
                <div class="skeleton-text skeleton-title skeleton-anim" style="width: 80%"></div>
                <div class="skeleton-text skeleton-desc skeleton-anim"></div>
                <div class="skeleton-text skeleton-desc skeleton-anim"></div>
            </div>
        </article>
        `;
    }
    return html;
}

/**
 * Renders the error state with a retry button.
 * @param {string} message - Error message to display.
 */
function renderError(message) {
    const container = document.getElementById('blog-grid');
    if (!container) return;

    container.innerHTML = `
        <div class="error-state text-center" style="grid-column: 1 / -1; padding: 3rem;">
            <i class="fas fa-exclamation-circle fa-3x text-danger mb-3"></i>
            <h3 class="h4">Gagal Memuat Berita</h3>
            <p class="text-muted mb-4">${sanitizeHTML(message)}</p>
            <button id="btnRetryFetch" class="btn btn-primary">
                <i class="fas fa-redo"></i> Coba Lagi
            </button>
        </div>
    `;

    document.getElementById('btnRetryFetch').addEventListener('click', () => {
        fetchArticles();
    });
}

/**
 * Renders the empty state if no articles are found.
 */
function renderEmptyState() {
    const container = document.getElementById('blog-grid');
    if (!container) return;

    container.innerHTML = `
        <div class="empty-state text-center" style="grid-column: 1 / -1; padding: 3rem;">
            <i class="fas fa-newspaper fa-3x text-muted mb-3"></i>
            <h3 class="h4">Belum Ada Kabar Sigap</h3>
            <p class="text-muted">Saat ini belum ada artikel yang dipublikasikan. Silakan cek kembali nanti.</p>
        </div>
    `;
}

/**
 * Renders the articles into the DOM.
 * @param {Array} blogs - Array of blog objects.
 */
function renderArticles(blogs) {
    const container = document.getElementById('blog-grid');
    if (!container) return;

    if (!Array.isArray(blogs) || blogs.length === 0) {
        renderEmptyState();
        return;
    }

    container.innerHTML = blogs.map((blog, index) => {
        // Safe access to properties and fallbacks
        const id = sanitizeHTML(blog.id);
        const title = sanitizeHTML(blog.judul);
        const category = sanitizeHTML(blog.kategori || 'Umum');
        // Use placeholder if null or empty, will also handle onError in img tag
        let imageUrl = blog.gambar_header_url ? sanitizeHTML(blog.gambar_header_url) : CONFIG.DEFAULT_IMAGE;
    
        // Fix Path Logic for Wawasan Page
        // Use logic similar to Blog/js/blog-list.js but Wawasan is in Wawasan/ folder
        // so ../uploads/ works the same.
        if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('../')) {
             if (imageUrl.startsWith('/')) {
                imageUrl = '..' + imageUrl;
            } else {
                imageUrl = '../' + imageUrl;
            }
        }

        const date = formatDate(blog.created_at); 
        // Use the pre-calculated excerpt from API which is cleaner and handles HTML tags correctly
        const excerpt = blog.excerpt || '';
        
        // Staggered animation delay: 100ms, 200ms, 300ms, etc.
        const delay = (index + 1) * 100;

        return `
        <article class="artikel-card" data-aos="fade-up" data-aos-delay="${delay}" onclick="window.location.href='${CONFIG.READ_PAGE_URL}?id=${id}'" style="cursor: pointer;">
            <div class="artikel-image">
                <img src="${imageUrl}" 
                     alt="${title}" 
                     loading="lazy"
                     onerror="this.onerror=null; this.src='${CONFIG.DEFAULT_IMAGE}';">
            </div>
            <div class="artikel-content">
                <div class="artikel-category">${category}</div>
                <div class="artikel-meta">
                    <span><i class="far fa-calendar"></i> ${date}</span>
                    <!-- <span><i class="far fa-clock"></i> 5 min baca</span> --> 
                </div>
                <h3 class="artikel-title">${title}</h3>
                <p class="artikel-excerpt">
                    ${excerpt}
                </p>
            </div>
        </article>
        `;
    }).join('');

    // Re-initialize animations after DOM injection
    if (window.AOS) {
        setTimeout(() => {
            window.AOS.refresh();
        }, 100);
    }
}

/**
 * Fetches articles from the API.
 */
async function fetchArticles() {
    const container = document.getElementById('blog-grid');
    if (!container) return;

    // Show Skeleton
    container.innerHTML = createSkeleton(CONFIG.ARTICLE_LIMIT);

    try {
        const url = `${CONFIG.API_ENDPOINT}?limit=${CONFIG.ARTICLE_LIMIT}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = await response.json();

        // Simulate minimum loading time for smooth UX (avoid layout flickering)
        await new Promise(resolve => setTimeout(resolve, 500));

        if (result.status === 'success' && result.data && Array.isArray(result.data.blogs)) {
            renderArticles(result.data.blogs);
        } else {
            // If API returns success but logic issue, or empty list
             if (result.status === 'success' && result.data && result.data.blogs.length === 0) {
                 renderEmptyState();
             } else {
                 throw new Error(result.message || 'Format respons tidak valid.');
             }
        }

    } catch (error) {
        console.error('Fetch Error:', error);
        renderError('Terjadi kesalahan saat memuat artikel. Periksa koneksi internet Anda atau coba lagi nanti.');
    }
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    fetchArticles();
});
