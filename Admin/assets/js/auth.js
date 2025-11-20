/**
 * SIGAP PPKS - Login Logic (Final Version)
 * File: Admin/assets/js/auth.js
 */

// Function to show success notification
function showSuccessNotification(userName) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'notification-overlay';
    document.body.appendChild(overlay);

    // Create notification
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.innerHTML = `
        <div class="success-icon">
            <i class="bi bi-check-lg"></i>
        </div>
        <h3>Login Berhasil!</h3>
        <p>Selamat datang, ${userName}</p>
    `;
    document.body.appendChild(notification);

    // Show with animation
    setTimeout(() => {
        overlay.classList.add('show');
        notification.classList.add('show');
    }, 10);
}

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
                // DEBUG MODE: Change to auth_login_debug.php for detailed logging
                // Set to true to enable debug mode
                const DEBUG_MODE = true;
                const apiEndpoint = DEBUG_MODE ?
                    '../../../api/auth_login_debug.php' :
                    '../../../api/auth_login.php';

                console.log('Using endpoint:', apiEndpoint);

                // Kirim request ke Backend
                const response = await fetch(apiEndpoint, {
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
                    // Show success notification
                    showSuccessNotification(data.data.name || 'Admin');

                    // Redirect after delay
                    setTimeout(() => {
                        window.location.href = '../dashboard/statistics.html';
                    }, 1500);
                } else {
                    throw new Error(data.message || 'Login gagal');
                }

            } catch (error) {
                // Shake animation for form
                if(loginForm) {
                    loginForm.classList.add('shake');
                    setTimeout(() => {
                        loginForm.classList.remove('shake');
                    }, 600);
                }

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