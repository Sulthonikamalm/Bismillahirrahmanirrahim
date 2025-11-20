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

                // Get response as text first for debugging
                const responseText = await response.text();

                // Log raw response for debugging
                console.log('Raw response:', responseText);
                console.log('Response status:', response.status);
                console.log('Response headers:', response.headers);

                // Try to parse as JSON
                let data;
                try {
                    data = JSON.parse(responseText);
                } catch (jsonError) {
                    console.error('JSON parse error:', jsonError);
                    console.error('Response text:', responseText);
                    throw new Error(
                        'Server error: Response is not valid JSON.\n\n' +
                        'Response status: ' + response.status + '\n' +
                        'Response preview: ' + responseText.substring(0, 200)
                    );
                }

                if (data.status === 'success') {
                    // Redirect jika sukses
                    window.location.href = '../dashboard/statistics.html';
                } else {
                    throw new Error(data.message || 'Login gagal');
                }

            } catch (error) {
                // Tampilkan Error
                console.error('Login error:', error);
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