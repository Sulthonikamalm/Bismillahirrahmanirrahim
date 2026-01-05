// Blog Detail Reader

const CONFIG = {
    API_DETAIL: '../api/blog/get_blog_detail.php',
    API_LIST: '../api/blog/get_blogs.php', // For related articles
    DEFAULT_IMAGE: 'https://via.placeholder.com/800x450/e07b8a/ffffff?text=Image+Not+Found',
    HOME_URL: '../Wawasan/wawasan.html#kabar-sigap'
};

// Fix image path
function fixImagePath(path) {
    if (!path) return CONFIG.DEFAULT_IMAGE;
    if (path.startsWith('http') || path.startsWith('../')) return path;
    if (path.startsWith('/')) return '..' + path;
    return '../' + path;
}

// Sanitize HTML
function sanitizeHTML(str) {
    if (!str) return '';
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

// Format tanggal
function formatDate(dateStr) {
    try {
        return new Date(dateStr).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'});
    } catch(e) { return dateStr; }
}

// Hitung waktu baca
function calculateReadingTime(text) {
    const wpm = 200;
    const words = text.trim().split(/\s+/).length;
    const time = Math.ceil(words / wpm);
    return time < 1 ? 1 : time;
}

// Share link functionality
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

// Fetch artikel terkait
async function fetchRelated(currentId) {
    try {
        const res = await fetch(`${CONFIG.API_LIST}?limit=4`);
        const result = await res.json();
        
        if (result.status === 'success' && result.data.blogs) {
            const container = document.getElementById('related-grid');
            const relatedSection = document.getElementById('related-section');
            
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

// Render artikel
function renderArticle(blog) {
    const container = document.getElementById('article-area');
    
    const tempTitle = document.createElement('div');
    tempTitle.innerHTML = blog.judul;
    const title = tempTitle.textContent || tempTitle.innerText || "";
    const cleanTitle = title.replace(/<[^>]*>?/gm, '');

    const author = blog.author ? blog.author.name : 'Admin';
    const date = formatDate(blog.created_at);
    const content = blog.isi_postingan || ''; 
    const image = fixImagePath(blog.gambar_header_url);
    
    const plainText = content.replace(/<[^>]*>/g, '');
    const readTime = calculateReadingTime(plainText);
    
    document.title = `${cleanTitle} - Sigap PPKS`;

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
    
    document.getElementById('share-section').style.display = 'flex';
    
    if(window.AOS) setTimeout(()=> window.AOS.refresh(), 500);
}

// Fetch detail artikel
async function fetchDetail() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const isPreview = params.get('preview') === 'true';

    if (isPreview) {
        try {
            const localData = localStorage.getItem('blog_preview_data');
            if (localData) {
                const blogData = JSON.parse(localData);
                
                // Add Preview Banner
                const banner = document.createElement('div');
                banner.style.cssText = 'position:fixed; top:0; left:0; width:100%; background:#ffc107; color:#000; text-align:center; padding:10px; z-index:9999; font-weight:bold; box-shadow:0 2px 10px rgba(0,0,0,0.1);';
                banner.innerText = 'PREVIEW MODE - This content is not yet published.';
                document.body.prepend(banner);
                document.body.style.paddingTop = '50px'; // Push down

                renderArticle(blogData);
                
                const shareSection = document.getElementById('share-section');
                if(shareSection) shareSection.style.display = 'none';

                const allInteractables = document.querySelectorAll('a, button, .btn');
                allInteractables.forEach(el => {
                     if (el.classList.contains('btn-back')) return; 

                     el.addEventListener('click', (e) => {
                         if (el.classList.contains('btn-back') || el.innerText.includes('Close Preview')) return;
                         
                         e.preventDefault();
                         e.stopPropagation();
                         alert('Fitur ini dinonaktifkan dalam Mode Preview.\n(This feature is disabled in Preview Mode)');
                     }, true);
                     
                     el.style.cursor = 'not-allowed';
                     el.style.opacity = '0.6';
                     el.title = 'Disabled in Preview Mode';
                });

                const navItems = document.querySelectorAll('.nav-item, .logo');
                navItems.forEach(item => {
                    item.style.pointerEvents = 'none';
                    item.style.opacity = '0.5';
                });

                const closeBtn = document.createElement('button');
                closeBtn.innerHTML = '<i class="bi bi-x-lg"></i> Close Preview';
                closeBtn.className = 'btn btn-danger shadow-lg';
                closeBtn.style.position = 'fixed';
                closeBtn.style.bottom = '20px';
                closeBtn.style.right = '20px';
                closeBtn.style.zIndex = '10000';
                closeBtn.style.padding = '10px 20px';
                closeBtn.style.borderRadius = '50px';
                closeBtn.style.fontWeight = 'bold';
                closeBtn.onclick = function() {
                    window.close();
                };
                document.body.appendChild(closeBtn);

                const existingBack = document.querySelector('.btn-back');
                if (existingBack) existingBack.style.display = 'none';

                return;
                
                return;
            } else {
                alert('No preview data found.');
                window.close();
            }
        } catch(e) {
            console.error('Preview error', e);
        }
    }

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
