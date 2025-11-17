/**
 * SIGAP PPKS - Sidebar Toggle
 * File: assets/js/sidebar.js
 * 
 * Reusable sidebar toggle functionality for all dashboard pages
 */

document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('sidebar');
    const toggleButton = document.getElementById('sidebarToggle');
    const mainContent = document.getElementById('mainContent');

    if (!sidebar || !toggleButton || !mainContent) {
        console.error('Sidebar elements not found');
        return;
    }

    // Toggle sidebar on button click
    toggleButton.addEventListener('click', function(event) {
        event.stopPropagation();
        sidebar.classList.toggle('active');
    });

    // Close sidebar when clicking on main content (mobile only)
    mainContent.addEventListener('click', function() {
        if (window.innerWidth <= 991 && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
        }
    });

    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 991) {
            sidebar.classList.remove('active');
        }
    });
});