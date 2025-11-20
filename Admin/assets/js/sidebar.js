/**
 * SIGAP PPKS - Sidebar & Auth Global Logic (Final Version)
 * File: Admin/assets/js/sidebar.js
 */

document.addEventListener('DOMContentLoaded', function() {
    // ============================================
    // 1. LOGIKA TAMPILAN SIDEBAR (DARI KODE LAMA ANDA)
    // ============================================
    const sidebar = document.getElementById('sidebar');
    const toggleButton = document.getElementById('sidebarToggle');
    const mainContent = document.getElementById('mainContent');

    if (sidebar && toggleButton) {
        toggleButton.addEventListener('click', function(event) {
            event.stopPropagation();
            sidebar.classList.toggle('active');
        });
    }

    // Tutup sidebar jika klik di luar (untuk mobile)
    if (mainContent) {
        mainContent.addEventListener('click', function() {
            if (window.innerWidth <= 991 && sidebar && sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
            }
        });
    }
    
    // Reset sidebar saat layar dibesarkan
    window.addEventListener('resize', function() {
        if (window.innerWidth > 991 && sidebar) {
            sidebar.classList.remove('active');
        }
    });


    // ============================================
    // 2. LOGIKA KEAMANAN (BARU)
    // ============================================
    
    // JALANKAN CEK LOGIN OTOMATIS
    checkAuthSession();

    // LOGIC TOMBOL LOGOUT
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', function(e) {
            e.preventDefault();
            handleLogout();
        });
    }
});

// Fungsi Cek Sesi ke Backend
async function checkAuthSession() {
    try {
        // Jangan cek sesi jika kita sedang di halaman login agar tidak loop
        if (window.location.pathname.includes('login.html')) return;

        // Naik 2 level folder untuk mencapai api/
        const response = await fetch('../../api/auth_check.php');
        const data = await response.json();

        if (data.status === 'unauthorized') {
            // Tendang ke halaman login jika belum login
            window.location.href = '../auth/login.html';
        } else if (data.status === 'authenticated') {
            // Update nama user di sidebar jika ada elemennya
            const userNameElement = document.querySelector('.user-name');
            if (userNameElement && data.user.name) {
                userNameElement.textContent = data.user.name;
            }
        }
    } catch (error) {
        console.error('Gagal mengecek sesi:', error);
    }
}

// Fungsi Logout
async function handleLogout() {
    const confirmLogout = confirm("Apakah Anda yakin ingin keluar?");
    if (!confirmLogout) return;

    try {
        const response = await fetch('../../api/auth_logout.php');
        const data = await response.json();

        if (data.status === 'success') {
            window.location.href = '../auth/login.html';
        }
    } catch (error) {
        alert("Gagal logout. Periksa koneksi server.");
    }
}