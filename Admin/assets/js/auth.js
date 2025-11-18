/**
 * ============================================================
 * SIGAP PPKS - Login Page JavaScript (Pure JS - No Bootstrap)
 * Version: 7.0 - Clean & Modern
 * File: assets/js/auth.js
 * ============================================================
 */

// ========================================
// CONFIGURATION
// ========================================
const CONFIG = {
    CREDENTIALS: {
        EMAIL: 'admin@sigap.com',
        PASSWORD: 'admin123'
    },
    ROUTES: {
        DASHBOARD: '../dashboard/cases.html'
    }
};

// ========================================
// STATE
// ========================================
const state = {
    isSubmitting: false,
    passwordVisible: false
};

// ========================================
// DOM ELEMENTS
// ========================================
const elements = {
    form: null,
    email: null,
    password: null,
    togglePassword: null,
    eyeIcon: null,
    errorMessage: null,
    errorText: null,
    loginButton: null
};

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    initElements();
    attachListeners();
});

function initElements() {
    elements.form = document.getElementById('loginForm');
    elements.email = document.getElementById('email');
    elements.password = document.getElementById('password');
    elements.togglePassword = document.getElementById('togglePassword');
    elements.eyeIcon = document.getElementById('eyeIcon');
    elements.errorMessage = document.getElementById('errorMessage');
    elements.errorText = document.getElementById('errorText');
    elements.loginButton = elements.form?.querySelector('.login-button');
    
    if (!elements.form || !elements.password) {
        console.error('Required elements not found');
        return false;
    }
    
    return true;
}

// ========================================
// EVENT LISTENERS
// ========================================
function attachListeners() {
    // Show/hide toggle password button
    elements.password.addEventListener('input', handlePasswordInput);
    
    // Toggle password visibility
    if (elements.togglePassword) {
        elements.togglePassword.addEventListener('click', togglePasswordVisibility);
    }
    
    // Form submit
    elements.form.addEventListener('submit', handleSubmit);
}

// ========================================
// PASSWORD TOGGLE
// ========================================
function handlePasswordInput() {
    const hasValue = elements.password.value.length > 0;
    
    if (hasValue && elements.togglePassword) {
        elements.togglePassword.style.display = 'flex';
    } else if (elements.togglePassword) {
        elements.togglePassword.style.display = 'none';
    }
}

function togglePasswordVisibility() {
    state.passwordVisible = !state.passwordVisible;
    
    // Change input type
    elements.password.type = state.passwordVisible ? 'text' : 'password';
    
    // Change icon
    if (state.passwordVisible) {
        // Show "eye" icon (password visible)
        elements.eyeIcon.innerHTML = `
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
        `;
    } else {
        // Show "eye-slash" icon (password hidden)
        elements.eyeIcon.innerHTML = `
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
        `;
    }
}

// ========================================
// FORM SUBMISSION
// ========================================
async function handleSubmit(event) {
    event.preventDefault();
    
    if (state.isSubmitting) return;
    
    // Hide previous errors
    hideError();
    
    // Get values
    const email = elements.email.value.trim();
    const password = elements.password.value;
    
    // Validate
    const validation = validateInputs(email, password);
    if (!validation.valid) {
        showError(validation.message);
        return;
    }
    
    // Attempt login
    await attemptLogin(email, password);
}

// ========================================
// VALIDATION
// ========================================
function validateInputs(email, password) {
    if (!email || !password) {
        return {
            valid: false,
            message: 'Email dan password tidak boleh kosong!'
        };
    }
    
    if (!isValidEmail(email)) {
        return {
            valid: false,
            message: 'Format email tidak valid!'
        };
    }
    
    if (password.length < 6) {
        return {
            valid: false,
            message: 'Password minimal 6 karakter!'
        };
    }
    
    return { valid: true };
}

function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

// ========================================
// LOGIN LOGIC
// ========================================
async function attemptLogin(email, password) {
    console.log('Attempting login with:', email);
    console.log('Expected credentials:', CONFIG.CREDENTIALS);
    
    state.isSubmitting = true;
    setLoadingState(true);
    
    try {
        // Simulate API delay
        await sleep(800);
        
        // Check credentials
        const emailMatch = email === CONFIG.CREDENTIALS.EMAIL;
        const passwordMatch = password === CONFIG.CREDENTIALS.PASSWORD;
        
        console.log('Email match:', emailMatch);
        console.log('Password match:', passwordMatch);
        
        if (emailMatch && passwordMatch) {
            console.log('Credentials valid! Calling handleLoginSuccess...');
            handleLoginSuccess({ email });
        } else {
            console.log('Credentials invalid!');
            handleLoginError('Email atau password salah!');
        }
    } catch (error) {
        handleLoginError('Terjadi kesalahan. Silakan coba lagi.');
        console.error('Login error:', error);
    } finally {
        state.isSubmitting = false;
        setLoadingState(false);
    }
}

function handleLoginSuccess(user) {
    console.log('Login berhasil! User:', user);
    
    // Store session
    sessionStorage.setItem('user', JSON.stringify({
        email: user.email,
        nama: 'Admin PPKS',
        role: 'Administrator'
    }));
    
    console.log('Session stored:', sessionStorage.getItem('user'));
    
    // Show success
    showSuccess('Login Berhasil! Mengarahkan ke Dashboard...');
    
    // Redirect
    const dashboardPath = CONFIG.ROUTES.DASHBOARD;
    console.log('Redirecting to:', dashboardPath);
    
    setTimeout(() => {
        window.location.href = dashboardPath;
    }, 1500);
}

function handleLoginError(message) {
    showError(message);
    
    // Shake animation
    elements.form.classList.add('shake');
    setTimeout(() => {
        elements.form.classList.remove('shake');
    }, 500);
}

// ========================================
// UI UPDATES
// ========================================
function setLoadingState(isLoading) {
    elements.loginButton.disabled = isLoading;
    elements.email.disabled = isLoading;
    elements.password.disabled = isLoading;
    
    if (isLoading) {
        elements.loginButton.textContent = 'Memproses...';
    } else {
        elements.loginButton.textContent = 'Log in';
    }
}

function showError(message) {
    elements.errorText.textContent = message;
    elements.errorMessage.classList.remove('hidden');
    
    // Auto hide after 5 seconds
    setTimeout(hideError, 5000);
}

function hideError() {
    if (elements.errorMessage) {
        elements.errorMessage.classList.add('hidden');
    }
}

function showSuccess(message) {
    // Create success message element
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9 12l2 2 4-4" stroke="white" stroke-width="2" fill="none"/>
        </svg>
        <span>${message}</span>
    `;
    
    // Insert before button
    elements.loginButton.parentNode.insertBefore(successDiv, elements.loginButton);
    
    // Add styles dynamically if not exists
    if (!document.getElementById('successStyles')) {
        const style = document.createElement('style');
        style.id = 'successStyles';
        style.textContent = `
            .success-message {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 1rem 1.25rem;
                background-color: #d1fae5;
                color: #10b981;
                border-left: 4px solid #10b981;
                border-radius: 0.75rem;
                margin-bottom: 1rem;
                font-size: 0.95rem;
                animation: slideDown 0.3s ease;
            }
        `;
        document.head.appendChild(style);
    }
}

// ========================================
// UTILITY
// ========================================
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}