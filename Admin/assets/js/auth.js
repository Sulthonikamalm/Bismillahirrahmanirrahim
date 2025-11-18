/**
 * SIGAP PPKS - Authentication
 * File: assets/js/auth.js
 *
 * Handles login authentication and validation
 */

document.addEventListener('DOMContentLoaded', function() {
    const passwordField = document.getElementById('password');
    const toggleIconContainer = document.getElementById('togglePasswordIcon');
    const eyeIcon = document.getElementById('eyeIcon');
    const loginForm = document.getElementById('loginForm');
    const emailField = document.getElementById('email');
    const errorMessage = document.getElementById('errorMessage');
    const loginButton = loginForm.querySelector('button[type="submit"]');

    // Create toast container if not exists
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }

    // === PASSWORD VISIBILITY TOGGLE ===

    // Show/hide toggle icon based on password field content
    passwordField.addEventListener('input', function() {
        toggleIconContainer.style.display = (passwordField.value.length > 0) ? 'flex' : 'none';
    });

    // Toggle password visibility
    toggleIconContainer.addEventListener('click', function() {
        const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordField.setAttribute('type', type);

        // Update icon
        if (type === 'text') {
            eyeIcon.classList.remove('bi-eye-slash');
            eyeIcon.classList.add('bi-eye');
        } else {
            eyeIcon.classList.remove('bi-eye');
            eyeIcon.classList.add('bi-eye-slash');
        }
    });

    // === LOGIN FORM VALIDATION ===

    loginForm.addEventListener('submit', function(event) {
        event.preventDefault(); // Prevent form submission

        // Hide error message
        errorMessage.classList.add('d-none');

        // Get form values
        const email = emailField.value.trim();
        const password = passwordField.value;

        // Basic validation
        if (!email || !password) {
            showError('Email dan password tidak boleh kosong!');
            shakeButton();
            return;
        }

        // Email format validation
        if (!isValidEmail(email)) {
            showError('Format email tidak valid!');
            shakeButton();
            return;
        }

        // TEMPORARY: Hardcoded credentials for testing
        // TODO: Replace with actual API call to backend
        const correctEmail = "admin@sigap.com";
        const correctPassword = "admin123";

        if (email === correctEmail && password === correctPassword) {
            // Login successful
            // TODO: Store session token
            showToast('Login Berhasil!', 'Mengarahkan ke Dashboard...', 'success');
            setTimeout(() => {
                window.location.href = "../dashboard/cases.html";
            }, 1500);
        } else {
            showError('Email atau Password salah!');
            shakeButton();
        }
    });

    // === HELPER FUNCTIONS ===

    /**
     * Show error message
     * @param {string} message - Error message to display
     */
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('d-none');
    }

    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} True if valid, false otherwise
     */
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Shake login button animation for error
     */
    function shakeButton() {
        loginButton.classList.add('shake');
        setTimeout(() => {
            loginButton.classList.remove('shake');
        }, 500);
    }

    /**
     * Show toast notification with slide animation
     * @param {string} title - Toast title
     * @param {string} message - Toast message
     * @param {string} type - Toast type: 'success' or 'error'
     */
    function showToast(title, message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icon = type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill';

        toast.innerHTML = `
            <i class="bi ${icon}"></i>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
        `;

        toastContainer.appendChild(toast);

        // Auto remove after 3 seconds
        setTimeout(() => {
            toast.classList.add('toast-hide');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }
});