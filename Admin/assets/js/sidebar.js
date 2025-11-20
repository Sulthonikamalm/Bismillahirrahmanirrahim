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
    // 1B. USER PROFILE DROPDOWN TOGGLE
    // ============================================
    const userProfileToggle = document.getElementById('userProfileToggle');
    const userDropdownMenu = document.getElementById('userDropdownMenu');

    if (userProfileToggle && userDropdownMenu) {
        userProfileToggle.addEventListener('click', function(event) {
            event.stopPropagation();
            userDropdownMenu.classList.toggle('show');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function(event) {
            if (!userProfileToggle.contains(event.target) && !userDropdownMenu.contains(event.target)) {
                userDropdownMenu.classList.remove('show');
            }
        });
    }

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

        // Naik 3 level folder untuk mencapai api/ (dashboard → pages → Admin → root → api)
        const response = await fetch('../../../api/auth_check.php');
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

// Fungsi Logout - Professional Implementation
async function handleLogout() {
    // User confirmation
    const confirmLogout = confirm("Apakah Anda yakin ingin keluar?");
    if (!confirmLogout) return;

    // Get logout button reference
    const btnLogout = document.getElementById('btnLogout');
    const originalText = btnLogout ? btnLogout.innerHTML : '';

    try {
        // Show loading state
        if (btnLogout) {
            btnLogout.disabled = true;
            btnLogout.innerHTML = '<i class="bi bi-hourglass-split me-2"></i><span>Logging out...</span>';
        }

        // DEBUG MODE: Use debug version for detailed logging
        const DEBUG_MODE = true;
        const logoutEndpoint = DEBUG_MODE ?
            '../../../api/auth_logout_debug.php' :
            '../../../api/auth_logout.php';

        console.log('Using logout endpoint:', logoutEndpoint);

        // Call logout API with POST method (as required by backend)
        const response = await fetch(logoutEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin', // Include cookies
        });

        // Get response as text first for debugging
        const responseText = await response.text();
        console.log('Logout response text:', responseText);
        console.log('Logout response status:', response.status);

        // Try to parse as JSON
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (jsonError) {
            console.error('JSON parse error:', jsonError);
            console.error('Response was:', responseText);
            throw new Error(
                'Server returned invalid response.\n\n' +
                'Expected JSON but got: ' + responseText.substring(0, 100)
            );
        }

        // Handle response based on status
        if (response.ok && data.status === 'success') {
            // Show success feedback briefly
            if (btnLogout) {
                btnLogout.innerHTML = '<i class="bi bi-check-circle me-2"></i><span>Success!</span>';
            }

            // Log success
            console.log('Logout successful:', data.message);

            // Redirect to login page after brief delay
            setTimeout(() => {
                window.location.href = data.redirect || '../auth/login.html';
            }, 500);

        } else {
            // Handle error response
            throw new Error(data.message || 'Logout failed');
        }

    } catch (error) {
        // Log error
        console.error('Logout error:', error);

        // Show user-friendly error message
        alert('Gagal logout: ' + error.message + '\n\nSilakan coba lagi atau hubungi administrator.');

        // Restore button state
        if (btnLogout) {
            btnLogout.disabled = false;
            btnLogout.innerHTML = originalText;
        }
    }
}