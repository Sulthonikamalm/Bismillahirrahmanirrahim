// Blog List Manager

const CONFIG = {
    API_LIST: '../api/blog/get_blogs.php',
    READ_URL: 'baca.html',
    DEFAULT_IMAGE: 'https://via.placeholder.com/400x250/e07b8a/ffffff?text=Image+Not+Found',
    LIMIT: 9
};

let currentPage = 1;
let currentSearch = '';

// Buat skeleton loading
function createSkeleton(count) {
    let html = '';
    for(let i=0; i<count; i++) {
        html += `
        <article class="artikel-card skeleton-card">
            <div class="skeleton-image skeleton-anim"></div>
            <div class="artikel-content">
                <div class="skeleton-title skeleton-anim"></div>
                <div class="skeleton-desc skeleton-anim"></div>
            </div>
        </article>`;
    }
    return html;
}

// Format tanggal
function formatDate(dateStr) {
    try {
        return new Date(dateStr).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'});
    } catch(e) { return dateStr; }
}

// Render pagination
function renderPagination(meta) {
    const container = document.getElementById('pagination');
    if (!meta || meta.total_pages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';
    if(meta.has_prev) {
        html += `<button class="page-btn" onclick="changePage(${meta.current_page - 1})"><i class="fas fa-chevron-left"></i></button>`;
    }
    
    for(let i=1; i<=meta.total_pages; i++) {
        if (i === 1 || i === meta.total_pages || (i >= meta.current_page - 1 && i <= meta.current_page + 1)) {
             html += `<button class="page-btn ${i === meta.current_page ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
        } else if (i === meta.current_page - 2 || i === meta.current_page + 2) {
            html += `<span style="align-self:end">...</span>`;
        }
    }

    if(meta.has_next) {
        html += `<button class="page-btn" onclick="changePage(${meta.current_page + 1})"><i class="fas fa-chevron-right"></i></button>`;
    }

    container.innerHTML = html;
}

// Ganti halaman
window.changePage = (page) => {
    currentPage = page;
    fetchBlogs();
    window.scrollTo({top: 0, behavior: 'smooth'});
};

// Render blog cards
function renderBlogs(blogs) {
    const container = document.getElementById('blog-grid');
    if (!blogs || blogs.length === 0) {
        container.innerHTML = `<div class="empty-state text-center" style="grid-column: 1/-1;"><h3>Tidak ada artikel ditemukan.</h3></div>`;
        return;
    }

    container.innerHTML = blogs.map((blog, idx) => {
        const delay = (idx % 3) * 100;
        let img = blog.gambar_header_url || CONFIG.DEFAULT_IMAGE;
        
        if (img && !img.startsWith('http') && !img.startsWith('../')) {
             if (img.startsWith('/')) {
                img = '..' + img;
            } else {
                img = '../' + img;
            }
        }
        
        return `
        <article class="artikel-card" data-aos="fade-up" data-aos-delay="${delay}" 
                 onclick="window.location.href='${CONFIG.READ_URL}?id=${blog.id}'" style="cursor:pointer">
            <div class="artikel-image">
                <img src="${img}" alt="${blog.judul}" onerror="this.src='${CONFIG.DEFAULT_IMAGE}'" loading="lazy">
            </div>
            <div class="artikel-content">
                <div class="artikel-category">${blog.kategori || 'Umum'}</div>
                <div class="artikel-meta">
                     <span><i class="fas fa-calendar"></i> ${formatDate(blog.created_at)}</span>
                </div>
                <h3 class="artikel-title">${blog.judul}</h3>
                <p class="artikel-excerpt">${blog.excerpt || ''}</p>
            </div>
        </article>
        `;
    }).join('');
    
    if(window.AOS) {
        setTimeout(() => {
            window.AOS.refresh();
        }, 150);
    }
}

// Fetch blogs dari API
async function fetchBlogs() {
    const container = document.getElementById('blog-grid');
    container.innerHTML = createSkeleton(3);
    
    try {
        const url = `${CONFIG.API_LIST}?page=${currentPage}&limit=${CONFIG.LIMIT}&search=${encodeURIComponent(currentSearch)}`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.status === 'success') {
            renderBlogs(data.data.blogs);
            renderPagination(data.pagination);
        } else {
             container.innerHTML = `<div class="error-state text-center" style="grid-column:1/-1"><p>${data.message}</p></div>`;
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = `<div class="error-state text-center" style="grid-column:1/-1">Gagal memuat berita.</div>`;
    }
}

// Search handler (debounced)
let debounceTimer;
document.getElementById('searchInput').addEventListener('input', (e) => {
    const term = e.target.value;
    
    clearTimeout(debounceTimer);
    
    debounceTimer = setTimeout(() => {
        if (term !== currentSearch) {
            currentSearch = term;
            currentPage = 1;
            fetchBlogs();
        }
    }, 500);
});

document.getElementById('searchBtn').addEventListener('click', () => {
    const term = document.getElementById('searchInput').value;
    if (term !== currentSearch) {
        currentSearch = term;
        currentPage = 1;
        fetchBlogs();
    }
});

// Inisialisasi
document.addEventListener('DOMContentLoaded', fetchBlogs);
