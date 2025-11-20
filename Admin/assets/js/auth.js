/**
 * SIGAP PPKS - Login Logic (Final Version)
 * File: Admin/assets/js/auth.js
 */

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    const loginButton = document.querySelector('.login-button');

    // Toggle Password
    const togglePassword = document.getElementById('togglePassword');
    if(togglePassword) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
        });
    }

    // Handle Submit
    if(loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Reset UI
            if(errorMessage) errorMessage.classList.add('hidden'); 
            if(errorMessage) errorMessage.style.display = 'none';
            if(loginButton) {
                loginButton.disabled = true;
                loginButton.innerText = 'Loading...';
            }

            const formData = new FormData();
            formData.append('email', emailInput.value);
            formData.append('password', passwordInput.value);

            try {
                // Kirim request ke Backend
                const response = await fetch('../../../api/auth_login.php', {
                    method: 'POST',
                    body: formData 
                });

                const data = await response.json();

                if (data.status === 'success') {
                    // Redirect jika sukses
                    window.location.href = '../dashboard/statistics.html';
                } else {
                    throw new Error(data.message || 'Login gagal');
                }

            } catch (error) {
                // Tampilkan Error
                if(errorMessage) {
                    errorMessage.classList.remove('hidden');
                    errorMessage.style.display = 'block';
                }
                if(errorText) errorText.innerText = error.message;
            } finally {
                if(loginButton) {
                    loginButton.disabled = false;
                    loginButton.innerText = 'Log in';
                }
            }
        });
    }
});