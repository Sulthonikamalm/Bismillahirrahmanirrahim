document.addEventListener('DOMContentLoaded', () => {

    // ====================================
    // 1. Inisialisasi AOS (Animate On Scroll)
    // ====================================
    // Ini penting agar efek 'reveal' dan data-aos="fade-up" berfungsi
    AOS.init({
        duration: 1000,
        once: true,
        offset: 100
    });


    // ====================================
    // 2. Fungsionalitas Menu Hamburger
    // ====================================
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            const isExpanded = hamburger.getAttribute('aria-expanded') === 'true' || false;
            hamburger.setAttribute('aria-expanded', !isExpanded);
            navLinks.classList.toggle('active');
        });

        // Tutup menu saat link diklik
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                if (navLinks.classList.contains('active')) {
                    hamburger.setAttribute('aria-expanded', 'false');
                    navLinks.classList.remove('active');
                }
            });
        });
    }

    // ====================================
    // 3. Fungsionalitas Tab (Cara Lapor)
    // ====================================
    const tabButtons = document.querySelectorAll('.tab-nav .btn-tab');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => {
                btn.setAttribute('aria-selected', 'false');
            });
            button.setAttribute('aria-selected', 'true');
            // Logika penggantian konten tab bisa ditambahkan di sini
        });
    });
    
    // ====================================
    // 4. Inisialisasi Swiper Slider (Kapan Harus Lapor)
    // ====================================
    // Pastikan class .mySwiper di HTML sudah benar
    const swiperKapanLapor = new Swiper(".mySwiper", {
        slidesPerView: 1, 
        spaceBetween: 20, 
        loop: true,
        
        navigation: {
            nextEl: ".swiper-button-next",
            prevEl: ".swiper-button-prev",
        },
        
        pagination: {
            el: ".swiper-pagination",
            clickable: true,
        },

        // Breakpoints untuk responsivitas (jumlah kartu yang terlihat)
        breakpoints: {
            640: {
                slidesPerView: 2, 
                spaceBetween: 30,
            },
            1024: {
                slidesPerView: 3, 
                spaceBetween: 40,
            },
            1200: {
                slidesPerView: 4, 
                spaceBetween: 40,
            },
        },
    });

});