/* ============================================
   LANDING PAGE SPECIFIC LOGIC
   ============================================ */

(function () {
    'use strict';
  
    console.log('✅ Landing Page JS Loaded');
  
    const checkBtn = document.getElementById('checkProgressBtn');
    const progressStatusDiv = document.getElementById('progressStatus');
    const kodeInput = document.getElementById('kodeLaporan');
  
    if (checkBtn && progressStatusDiv && kodeInput) {
      checkBtn.addEventListener('click', function () {
        const kode = kodeInput.value.trim().toUpperCase();
        progressStatusDiv.innerHTML = '';
  
        // Validation
        if (kode === '') {
          progressStatusDiv.innerHTML = '<span style="color: #d32f2f;">Silakan masukkan kode laporan terlebih dahulu.</span>';
          return;
        }
  
        if (kode.length < 3) {
          progressStatusDiv.innerHTML = '<span style="color: #d32f2f;">Kode laporan minimal 3 karakter.</span>';
          return;
        }
  
        // Disable button
        checkBtn.disabled = true;
  
        // Show loading
        const spinner = document.createElement('span');
        spinner.className = 'spinner';
        spinner.setAttribute('aria-hidden', 'true');
        spinner.style.cssText = 'display:inline-block;width:16px;height:16px;border:3px solid #ccc;border-top-color:#667eea;border-radius:50%;animation:spin 0.8s linear infinite;vertical-align:middle;margin-right:8px;';
        
        // Add minimal spin animation if not present in main CSS
        if (!document.getElementById('spinner-style')) {
            const style = document.createElement('style');
            style.id = 'spinner-style';
            style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
            document.head.appendChild(style);
        }

        const loadingText = document.createElement('span');
        loadingText.textContent = 'Memeriksa...';
        
        progressStatusDiv.appendChild(spinner);
        progressStatusDiv.appendChild(loadingText);
  
        const API_URL = '../api/check_progress.php';
        
        fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ query: kode })
        })
        .then(response => {
          if (!response.ok) {
            throw new Error('Terjadi masalah pada server.');
          }
          return response.json();
        })
        .then(data => {
          if (data.status === 'ditemukan') {
            // SUCCESS
            progressStatusDiv.innerHTML = '<span style="color: #2e7d32; font-weight:bold;"><i class="fas fa-check-circle"></i> Laporan ditemukan! Mengarahkan...</span>';
  
            // Redirect to monitoring page
            setTimeout(() => {
              window.location.href = `../Monitoring/monitoring.html?kode=${data.kode_laporan}`;
            }, 800);
  
          } else {
            // FAIL
            progressStatusDiv.innerHTML = `<span style="color: #ef6c00;"><i class="fas fa-exclamation-circle"></i> Kode atau email tidak ditemukan.</span>`;
            checkBtn.disabled = false;
  
            // Clear error after 3s
            setTimeout(() => {
              if (progressStatusDiv.innerHTML.includes('tidak ditemukan')) {
                   progressStatusDiv.innerHTML = '';
              }
            }, 3000);
          }
        })
        .catch(error => {
          // ERROR
          console.error('Error fetching:', error);
          progressStatusDiv.innerHTML = `<span style="color: #d32f2f;"><i class="fas fa-times-circle"></i> ${error.message || 'Gagal terhubung.'}</span>`;
          checkBtn.disabled = false;
        });
      });
      
      // Auto-uppercase input
      kodeInput.addEventListener('input', function() {
        kodeInput.value = kodeInput.value.toUpperCase();
      });
      
      // Enter key support
      kodeInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          checkBtn.click();
        }
      });
    }
  
  })();
