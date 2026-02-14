// Konfigurasi
const CONFIG = {
    API_ENDPOINT: '../api/blog/get_blogs.php',
    ARTICLE_LIMIT: 6,
    READ_PAGE_URL: '../Blog/baca.html',
    DEFAULT_IMAGE: 'https://via.placeholder.com/400x250/e07b8a/ffffff?text=Image+Not+Found',
    RETRY_DELAY: 1000
};

// Sanitasi string untuk XSS
function sanitizeHTML(str) {
    if (!str) return '';
    const tempDiv = document.createElement('div');
    tempDiv.textContent = str;
    return tempDiv.innerHTML;
}

// Format tanggal ke bahasa Indonesia
function formatDate(dateStr) {
    if (!dateStr) return '';
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    try {
        return new Date(dateStr).toLocaleDateString('id-ID', options);
    } catch (e) {
        return dateStr;
    }
}

// Buat skeleton loading
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

// Render error state
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

// Render empty state
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

// Render artikel ke DOM
function renderArticles(blogs) {
    const container = document.getElementById('blog-grid');
    if (!container) return;

    if (!Array.isArray(blogs) || blogs.length === 0) {
        renderEmptyState();
        return;
    }

    container.innerHTML = blogs.map((blog, index) => {
        const id = sanitizeHTML(blog.id);
        const title = sanitizeHTML(blog.judul);
        const category = sanitizeHTML(blog.kategori || 'Umum');
        let imageUrl = blog.gambar_header_url ? sanitizeHTML(blog.gambar_header_url) : CONFIG.DEFAULT_IMAGE;
        if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('../')) {
             if (imageUrl.startsWith('/')) {
                imageUrl = '..' + imageUrl;
            } else {
                imageUrl = '../' + imageUrl;
            }
        }
        const date = formatDate(blog.created_at);
        const excerpt = blog.excerpt || '';
        
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
                </div>
                <h3 class="artikel-title">${title}</h3>
                <p class="artikel-excerpt">
                    ${excerpt}
                </p>
            </div>
        </article>
        `;
    }).join('');

    if (window.AOS) {
        setTimeout(() => {
            window.AOS.refresh();
        }, 100);
    }
}

// Fetch artikel dari API
async function fetchArticles() {
    const container = document.getElementById('blog-grid');
    if (!container) return;

    container.innerHTML = createSkeleton(CONFIG.ARTICLE_LIMIT);

    try {
        const url = `${CONFIG.API_ENDPOINT}?limit=${CONFIG.ARTICLE_LIMIT}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = await response.json();

        await new Promise(resolve => setTimeout(resolve, 500));

        if (result.status === 'success' && result.data && Array.isArray(result.data.blogs)) {
            renderArticles(result.data.blogs);
        } else {
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

// Inisialisasi saat DOM ready
document.addEventListener('DOMContentLoaded', () => {
    fetchArticles();
});
