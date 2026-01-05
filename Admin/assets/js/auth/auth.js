function showSuccessNotification(userName) {
    const overlay = document.createElement('div');
    overlay.className = 'notification-overlay';
    document.body.appendChild(overlay);

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

    const urlParams = new URLSearchParams(window.location.search);
    const sessionParam = urlParams.get('session');
    const errorParam = urlParams.get('error');

    if (sessionParam === 'expired') {
        if (errorMessage && errorText) {
            errorText.innerHTML = '<i class="bi bi-clock-history me-2"></i>Sesi Anda telah berakhir. Silakan login kembali.';
            errorMessage.classList.remove('hidden');
            errorMessage.classList.remove('alert-danger');
            errorMessage.classList.add('alert-warning');
            errorMessage.style.display = 'block';
        }
        console.log('[Auth Guard] User redirected: Session expired');
    } else if (errorParam === 'auth_check_failed') {
        if (errorMessage && errorText) {
            errorText.innerHTML = '<i class="bi bi-shield-x me-2"></i>Tidak dapat memverifikasi sesi. Silakan login kembali.';
            errorMessage.classList.remove('hidden');
            errorMessage.classList.add('alert-danger');
            errorMessage.style.display = 'block';
        }
        console.log('[Auth Guard] User redirected: Auth check failed');
    }

    const togglePassword = document.getElementById('togglePassword');
    if(togglePassword) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
        });
    }

    if(loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
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
                const apiEndpoint = '/Bismillahirrahmanirrahim/api/auth_login.php';

                console.log('Using endpoint:', apiEndpoint);

                const response = await fetch(apiEndpoint, {
                    method: 'POST',
                    body: formData
                });

                const responseText = await response.text();
                console.log('Raw response:', responseText);
                console.log('Response status:', response.status);
                console.log('Response headers:', response.headers);

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
                    showSuccessNotification(data.data.name || 'Admin');

                    setTimeout(() => {
                        const redirectUrl = data.redirect || '/Bismillahirrahmanirrahim/Admin/pages/cases/cases.html';
                        console.log('Redirecting to:', redirectUrl);
                        window.location.href = redirectUrl;
                    }, 1500);
                } else {
                    throw new Error(data.message || 'Login gagal');
                }

            } catch (error) {
                if(loginForm) {
                    loginForm.classList.add('shake');
                    setTimeout(() => {
                        loginForm.classList.remove('shake');
                    }, 600);
                }

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