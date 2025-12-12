class EncryptionModal {
    constructor() {
        this.modal = null;
        this.resolve = null;
        this.reject = null;
        this.createModal();
    }

    createModal() {
        const modalHTML = `
            <div class="encryption-modal-overlay" id="encryptionModalOverlay">
                <div class="encryption-modal">
                    <div class="encryption-modal-header">
                        <div class="encryption-modal-icon">
                            <i class="bi bi-shield-lock-fill"></i>
                        </div>
                        <h3>Keamanan Data Sensitif</h3>
                        <p>Pilih metode penyimpanan untuk laporan ini</p>
                    </div>
                    
                    <div class="encryption-modal-body">
                        <!-- Option 1: With Encryption -->
                        <div class="encryption-option selected" data-option="encrypted">
                            <input type="radio" name="encryption-choice" value="encrypted" checked id="optionEncrypted">
                            <label for="optionEncrypted" class="encryption-option-label">
                                <div class="encryption-option-icon">
                                    <i class="bi bi-lock-fill"></i>
                                </div>
                                <div class="encryption-option-content">
                                    <h4>Enkripsi Data Sensitif</h4>
                                    <p>Detail pelaku dan kejadian akan dienkripsi dengan AES-256 untuk keamanan maksimal</p>
                                    <span class="badge">Recommended</span>
                                </div>
                            </label>
                        </div>

                        <!-- Option 2: No Encryption -->
                        <div class="encryption-option no-encryption" data-option="plain">
                            <input type="radio" name="encryption-choice" value="plain" id="optionPlain">
                            <label for="optionPlain" class="encryption-option-label">
                                <div class="encryption-option-icon">
                                    <i class="bi bi-unlock-fill"></i>
                                </div>
                                <div class="encryption-option-content">
                                    <h4>Simpan Tanpa Enkripsi</h4>
                                    <p>Data disimpan apa adanya, dapat dibaca langsung oleh admin database</p>
                                </div>
                            </label>
                        </div>

                        <!-- Password Input (shown when encrypted is selected) -->
                        <div class="password-input-wrapper show" id="passwordInputWrapper">
                            <label class="password-input-label">
                                <i class="bi bi-key-fill"></i> Password Enkripsi
                            </label>
                            <div class="password-input-group">
                                <input 
                                    type="password" 
                                    id="encryptionPasswordInput" 
                                    placeholder="Masukkan password enkripsi"
                                    autocomplete="off"
                                >
                                <button type="button" class="password-toggle-btn" id="passwordToggleBtn">
                                    <i class="bi bi-eye-fill"></i>
                                </button>
                            </div>
                            <div class="password-strength" id="passwordStrength">
                                <div class="password-strength-bar"></div>
                                <div class="password-strength-bar"></div>
                                <div class="password-strength-bar"></div>
                                <div class="password-strength-bar"></div>
                            </div>
                            <div class="password-hint">
                                <i class="bi bi-info-circle-fill"></i>
                                Gunakan password default dari supervisor atau minimal 8 karakter dengan kombinasi huruf dan angka.
                            </div>
                        </div>
                    </div>

                    <div class="encryption-modal-footer">
                        <button type="button" class="btn-cancel" id="encryptionModalCancel">
                            Batal
                        </button>
                        <button type="button" class="btn-primary" id="encryptionModalConfirm">
                            <i class="bi bi-check-lg"></i> Lanjutkan
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.getElementById('encryptionModalOverlay');
        this.attachEventListeners();
    }

    attachEventListeners() {
        const options = this.modal.querySelectorAll('.encryption-option');
        const passwordWrapper = this.modal.querySelector('#passwordInputWrapper');
        const passwordInput = this.modal.querySelector('#encryptionPasswordInput');
        const passwordToggle = this.modal.querySelector('#passwordToggleBtn');
        const confirmBtn = this.modal.querySelector('#encryptionModalConfirm');
        const cancelBtn = this.modal.querySelector('#encryptionModalCancel');

        options.forEach(option => {
            option.addEventListener('click', () => {
                options.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                option.querySelector('input').checked = true;

                const isEncrypted = option.dataset.option === 'encrypted';
                if (isEncrypted) {
                    passwordWrapper.classList.add('show');
                    setTimeout(() => passwordInput.focus(), 100);
                } else {
                    passwordWrapper.classList.remove('show');
                }
            });
        });

        passwordToggle.addEventListener('click', () => {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            passwordToggle.querySelector('i').className = type === 'password' ? 'bi bi-eye-fill' : 'bi bi-eye-slash-fill';
        });

        passwordInput.addEventListener('input', (e) => {
            this.updatePasswordStrength(e.target.value);
        });

        confirmBtn.addEventListener('click', () => {
            this.handleConfirm();
        });

        cancelBtn.addEventListener('click', () => {
            this.close();
            if (this.reject) this.reject(new Error('User cancelled encryption'));
        });

        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
                if (this.reject) this.reject(new Error('User cancelled encryption'));
            }
        });

        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleConfirm();
            }
        });
    }

    updatePasswordStrength(password) {
        const bars = this.modal.querySelectorAll('.password-strength-bar');
        bars.forEach(bar => {
            bar.classList.remove('active', 'weak', 'medium', 'strong');
        });

        if (password.length === 0) return;

        let strength = 0;
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[^a-zA-Z0-9]/.test(password)) strength++;

        const level = strength <= 2 ? 'weak' : strength <= 3 ? 'medium' : 'strong';
        const activeBars = Math.min(Math.ceil(strength / 1.25), 4);

        for (let i = 0; i < activeBars; i++) {
            bars[i].classList.add('active', level);
        }
    }

    handleConfirm() {
        const selectedOption = this.modal.querySelector('input[name="encryption-choice"]:checked').value;
        
        if (selectedOption === 'encrypted') {
            const password = this.modal.querySelector('#encryptionPasswordInput').value.trim();
            
            if (!password) {
                this.showError('Password enkripsi diperlukan');
                return;
            }

            if (password.length < 8) {
                this.showError('Password minimal 8 karakter untuk keamanan');
                return;
            }

            if (this.resolve) {
                this.resolve({
                    encrypt: true,
                    password: password
                });
            }
        } else {
            if (this.resolve) {
                this.resolve({
                    encrypt: false,
                    password: null
                });
            }
        }

        this.close();
    }

    showError(message) {
        const passwordInput = this.modal.querySelector('#encryptionPasswordInput');
        passwordInput.style.borderColor = '#ef4444';
        passwordInput.focus();
        
        const existingError = this.modal.querySelector('.error-message');
        if (existingError) existingError.remove();

        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = 'color: #ef4444; font-size: 0.875rem; margin-top: 0.5rem; font-weight: 500;';
        errorDiv.innerHTML = `<i class="bi bi-exclamation-circle-fill"></i> ${message}`;
        
        passwordInput.parentElement.parentElement.appendChild(errorDiv);

        setTimeout(() => {
            passwordInput.style.borderColor = '';
            if (errorDiv.parentElement) errorDiv.remove();
        }, 3000);
    }

    show() {
        return new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
            
            this.modal.querySelector('#encryptionPasswordInput').value = '';
            this.modal.querySelector('.encryption-option[data-option="encrypted"]').classList.add('selected');
            this.modal.querySelector('#optionEncrypted').checked = true;
            this.modal.querySelector('#passwordInputWrapper').classList.add('show');
            this.updatePasswordStrength('');
            
            setTimeout(() => {
                this.modal.classList.add('show');
                setTimeout(() => {
                    this.modal.querySelector('#encryptionPasswordInput').focus();
                }, 300);
            }, 10);
        });
    }

    close() {
        this.modal.classList.remove('show');
    }
}

const encryptionModal = new EncryptionModal();
