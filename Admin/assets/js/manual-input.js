/**
 * ============================================================
 * SIGAP PPKS - Manual Input JavaScript
 * File: assets/js/manual-input.js
 * Description: Handles manual case input form submission
 * ============================================================
 */

(function() {
    'use strict';

    // ========================================
    // CONFIGURATION
    // ========================================
    const API_URL = '../../../api/cases/manual_input.php';

    // ========================================
    // INITIALIZATION
    // ========================================
    document.addEventListener('DOMContentLoaded', function() {
        initForm();
        setDefaultDate();
    });

    /**
     * Initialize form handling
     */
    function initForm() {
        const form = document.getElementById('manualInputForm');
        if (!form) return;

        form.addEventListener('submit', handleSubmit);
    }

    /**
     * Set default date to today
     */
    function setDefaultDate() {
        const dateInput = document.querySelector('input[name="waktu_kejadian"]');
        if (dateInput && !dateInput.value) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.value = today;
        }
    }

    /**
     * Handle form submission
     */
    async function handleSubmit(e) {
        e.preventDefault();

        const form = e.target;
        const submitBtn = document.getElementById('btnSubmit');

        // Validate form
        if (!validateForm(form)) {
            return;
        }

        // Disable submit button
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Menyimpan...';

        try {
            // Collect form data
            const formData = new FormData(form);
            const data = {};

            formData.forEach((value, key) => {
                data[key] = value;
            });

            // Send request
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin',
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                showToast(`Kasus berhasil disimpan! Kode: ${result.data.kode_pelaporan}`, 'success');

                // Redirect to cases page after 2 seconds
                setTimeout(() => {
                    window.location.href = 'cases.html';
                }, 2000);
            } else {
                throw new Error(result.message || 'Gagal menyimpan kasus');
            }

        } catch (error) {
            console.error('Error submitting form:', error);
            showToast(error.message || 'Terjadi kesalahan saat menyimpan', 'error');

            // Re-enable submit button
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-check-lg"></i> Simpan Kasus';
        }
    }

    /**
     * Validate form before submission
     */
    function validateForm(form) {
        // Check required fields
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                isValid = false;
                field.classList.add('is-invalid');

                // Remove invalid class on input
                field.addEventListener('input', function() {
                    this.classList.remove('is-invalid');
                }, { once: true });
            }
        });

        // Check tingkat kekhawatiran
        const kekhawatiranChecked = form.querySelector('input[name="tingkat_kekhawatiran"]:checked');
        if (!kekhawatiranChecked) {
            isValid = false;
            showToast('Pilih tingkat kekhawatiran', 'error');
        }

        if (!isValid) {
            showToast('Lengkapi semua field yang wajib diisi', 'error');
        }

        return isValid;
    }

    /**
     * Show toast notification
     */
    function showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="bi bi-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i>
            <span>${message}</span>
        `;

        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

})();
