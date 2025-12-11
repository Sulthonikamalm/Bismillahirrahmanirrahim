/**
 * @fileoverview Logic for fetching and rendering single blog article in Deep Reading mode.
 */

const CONFIG = {
    API_DETAIL: '../api/blog/get_blog_detail.php',
    API_LIST: '../api/blog/get_blogs.php', // For related articles
    DEFAULT_IMAGE: 'https://via.placeholder.com/800x450/e07b8a/ffffff?text=Image+Not+Found',
    HOME_URL: '../Wawasan/wawasan.html#kabar-sigap'
};

// Utils: Image Path Fixer
function fixImagePath(path) {
    if (!path) return CONFIG.DEFAULT_IMAGE;
    if (path.startsWith('http') || path.startsWith('../')) return path;
    if (path.startsWith('/')) return '..' + path;
    return '../' + path;
}

// Utils: HTML Sanitizer (Basic)
function sanitizeHTML(str) {
    if (!str) return '';
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

// Utils: Date Formatter
function formatDate(dateStr) {
    try {
        return new Date(dateStr).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'});
    } catch(e) { return dateStr; }
}

// Utils: Calculate Reading Time
function calculateReadingTime(text) {
    const wpm = 200;
    const words = text.trim().split(/\s+/).length;
    const time = Math.ceil(words / wpm);
    return time < 1 ? 1 : time;
}

// Feature: Share Link
function initShareButton() {
    const btn = document.getElementById('btnShareLink');
    if(btn) {
        btn.addEventListener('click', () => {
             navigator.clipboard.writeText(window.location.href).then(() => {
                 const msg = document.getElementById('shareMessage');
                 msg.style.opacity = '1';
                 setTimeout(() => { msg.style.opacity = '0'; }, 2000);
             });
        });
    }
}

// Feature: Related Articles
async function fetchRelated(currentId) {
    try {
        // Fetch 4 items, we will filter out current one and show 3
        const res = await fetch(`${CONFIG.API_LIST}?limit=4`);
        const result = await res.json();
        
        if (result.status === 'success' && result.data.blogs) {
            const container = document.getElementById('related-grid');
            const relatedSection = document.getElementById('related-section');
            
            // Filter out current article
            const filtered = result.data.blogs.filter(b => b.id != currentId).slice(0, 3);
            
            if (filtered.length > 0) {
                relatedSection.style.display = 'block';
                container.innerHTML = filtered.map(blog => {
                    const img = fixImagePath(blog.gambar_header_url);
                    return `
                    <div class="related-card" onclick="window.location.href='?id=${blog.id}'">
                        <img src="${img}" alt="${blog.judul}" class="related-image" onerror="this.src='${CONFIG.DEFAULT_IMAGE}'">
                        <div class="related-content">
                            <h4 class="related-title">${blog.judul}</h4>
                            <div class="related-date">${formatDate(blog.created_at)}</div>
                        </div>
                    </div>
                    `;
                }).join('');
            }
        }
    } catch (e) {
        console.warn('Failed to load related articles', e);
    }
}

// Main: Render Article
function renderArticle(blog) {
    const container = document.getElementById('article-area');
    
    // Metadata
    const title = blog.judul; // Already HTML safe from API if needed, or we trust our sanitizer? API sends Raw HTML for content but chars for title.
    // Actually API title is htmlspeciachars escaped.
    const author = blog.author ? blog.author.name : 'Admin';
    const date = formatDate(blog.created_at);
    // Content is RAW HTML from API (as per my previous fix)
    const content = blog.isi_postingan || ''; 
    const image = fixImagePath(blog.gambar_header_url);
    
    // Reading Time
    // Strip tags to count words
    const plainText = content.replace(/<[^>]*>/g, '');
    const readTime = calculateReadingTime(plainText);
    
    document.title = `${title} - Sigap PPKS`;

    const html = `
        <header class="article-header-immersive" data-aos="fade-down">
            <h1 class="article-title">${title}</h1>
            <div class="article-meta-modern">
                <span class="meta-item"><i class="fas fa-user-circle"></i> ${author}</span>
                <div class="meta-separator"></div>
                <span class="meta-item"><i class="far fa-calendar"></i> ${date}</span>
                <div class="meta-separator"></div>
                 <span class="meta-item"><i class="far fa-clock"></i> ${readTime} min baca</span>
            </div>
        </header>

        <div class="hero-image-container" data-aos="fade-up">
            <img src="${image}" alt="${title}" class="hero-image" onerror="this.src='${CONFIG.DEFAULT_IMAGE}'">
        </div>

        <main class="deep-reading-content" data-aos="fade-up" data-aos-delay="100">
            ${content}
        </main>
    `;
    
    container.innerHTML = html;
    
    // Show Share Section
    document.getElementById('share-section').style.display = 'flex';
    
    // Refresh animations
    if(window.AOS) setTimeout(()=> window.AOS.refresh(), 500);
}

// Main: Fetch Detail
async function fetchDetail() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) {
        window.location.href = CONFIG.HOME_URL;
        return;
    }

    try {
        const response = await fetch(`${CONFIG.API_DETAIL}?id=${id}`);
        const result = await response.json();

        if (result.status === 'success' && result.data) {
            renderArticle(result.data);
            fetchRelated(id);
            initShareButton();
        } else {
             document.getElementById('article-area').innerHTML = `
                <div class="error-container">
                    <h3>Artikel tidak ditemukan</h3>
                    <p>Maaf, artikel yang Anda cari tidak tersedia.</p>
                    <a href="${CONFIG.HOME_URL}" class="btn btn-primary mt-20">Kembali ke Wawasan</a>
                </div>
             `;
        }
    } catch (error) {
        console.error(error);
        document.getElementById('article-area').innerHTML = `
            <div class="error-container">
                <h3>Terjadi Kesalahan</h3>
                <p>Gagal memuat artikel. Silakan cek koneksi internet Anda.</p>
                <button onclick="window.location.reload()" class="btn btn-primary mt-20">Coba Lagi</button>
            </div>
         `;
    }
}

// Init
document.addEventListener('DOMContentLoaded', fetchDetail);
