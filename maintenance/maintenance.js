// Maintenance Page

(function() {
    'use strict';
    
    // Timer maintenance (opsional)
    // Uncomment untuk mengaktifkan
    
    function initTimer() {
        const timerSection = document.getElementById('timerSection');
        if (!timerSection) return;
        
        timerSection.style.display = 'flex';
        
        const startTime = new Date().getTime();
        
        setInterval(() => {
            const now = new Date().getTime();
            const elapsed = now - startTime;
            
            const hours = Math.floor(elapsed / (1000 * 60 * 60));
            const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);
            
            document.getElementById('hours').textContent = hours.toString().padStart(2, '0');
            document.getElementById('minutes').textContent = minutes.toString().padStart(2, '0');
            document.getElementById('seconds').textContent = seconds.toString().padStart(2, '0');
        }, 1000);
    }
    
    // Uncomment untuk mengaktifkan timer
    // initTimer();
    
})();
