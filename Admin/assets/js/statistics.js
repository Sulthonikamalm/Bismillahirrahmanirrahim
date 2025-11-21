/**
 * ============================================================
 * SIGAP PPKS - Statistics Page JavaScript
 * File: assets/js/statistics.js
 * Description: Fetches statistics from API and renders charts
 * ============================================================
 */

(function() {
    'use strict';

    // ========================================
    // CONFIGURATION
    // ========================================
    const API_BASE = '../../../api/cases/';
    const DEBUG_MODE = false;

    // ========================================
    // STATE
    // ========================================
    let statisticsData = null;
    let genderChart = null;
    let worryLevelChart = null;
    let statusChart = null;

    // ========================================
    // INITIALIZATION
    // ========================================
    document.addEventListener('DOMContentLoaded', function() {
        loadStatistics();
    });

    // ========================================
    // API FUNCTIONS
    // ========================================

    /**
     * Load statistics from API
     */
    async function loadStatistics() {
        try {
            showLoadingState();

            const response = await fetch(`${API_BASE}get_statistics.php`, {
                method: 'GET',
                credentials: 'same-origin',
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (DEBUG_MODE) {
                console.log('Statistics API Response:', data);
            }

            if (data.status === 'success') {
                statisticsData = data.data;
                renderStatistics();
            } else {
                throw new Error(data.message || 'Failed to load statistics');
            }

        } catch (error) {
            console.error('Error loading statistics:', error);
            showErrorState(error.message);
        }
    }

    /**
     * Render all statistics
     */
    function renderStatistics() {
        if (!statisticsData) return;

        // Update summary card
        updateSummaryCard(statisticsData.total_cases);

        // Prepare chart data
        const genderData = prepareGenderData(statisticsData.by_gender);
        const worryData = prepareWorryData(statisticsData.by_kekhawatiran);
        const statusData = prepareStatusData(statisticsData.by_status);

        // Create charts
        createGenderChart(genderData);
        createWorryLevelChart(worryData);
        createStatusChart(statusData);

        // Update tables
        updateGenderTable(genderData, statisticsData.total_cases);
        updateWorryLevelTable(worryData, statisticsData.total_cases);
        updateStatusTable(statusData, statisticsData.total_cases);

        hideLoadingState();
    }

    // ========================================
    // DATA PREPARATION FUNCTIONS
    // ========================================

    /**
     * Prepare gender data for charts
     */
    function prepareGenderData(byGender) {
        const data = { male: 0, female: 0 };

        if (byGender && Array.isArray(byGender)) {
            byGender.forEach(item => {
                const gender = (item.gender_korban || '').toLowerCase();
                if (gender === 'laki-laki' || gender === 'male' || gender === 'pria') {
                    data.male = item.count;
                } else if (gender === 'perempuan' || gender === 'female' || gender === 'wanita') {
                    data.female = item.count;
                }
            });
        }

        return data;
    }

    /**
     * Prepare worry level data for charts
     */
    function prepareWorryData(byKekhawatiran) {
        const data = { sedikit: 0, khawatir: 0, sangat: 0 };

        if (byKekhawatiran && Array.isArray(byKekhawatiran)) {
            byKekhawatiran.forEach(item => {
                const level = (item.tingkat_kekhawatiran || '').toLowerCase();
                if (level.includes('sedikit')) {
                    data.sedikit = item.count;
                } else if (level.includes('sangat') || level.includes('darurat')) {
                    data.sangat = item.count;
                } else if (level.includes('khawatir')) {
                    data.khawatir = item.count;
                }
            });
        }

        return data;
    }

    /**
     * Prepare status data for charts
     */
    function prepareStatusData(byStatus) {
        const data = { process: 0, investigation: 0, completed: 0 };

        if (byStatus && Array.isArray(byStatus)) {
            byStatus.forEach(item => {
                const status = (item.status_laporan || '').toLowerCase();
                if (status === 'process') {
                    data.process = item.count;
                } else if (status === 'in progress' || status === 'investigation') {
                    data.investigation = item.count;
                } else if (status === 'resolved' || status === 'closed' || status === 'completed') {
                    data.completed = item.count;
                }
            });
        }

        return data;
    }

    // ========================================
    // CHART CREATION FUNCTIONS
    // ========================================

    /**
     * Create Gender Donut Chart
     */
    function createGenderChart(data) {
        const ctx = document.getElementById('genderChart');
        if (!ctx) return;

        // Destroy existing chart
        if (genderChart) {
            genderChart.destroy();
        }

        genderChart = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Laki-laki', 'Perempuan'],
                datasets: [{
                    data: [data.male, data.female],
                    backgroundColor: ['#3b82f6', '#ec4899'],
                    borderColor: ['#ffffff', '#ffffff'],
                    borderWidth: 4,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Create Worry Level Donut Chart
     */
    function createWorryLevelChart(data) {
        const ctx = document.getElementById('worryLevelChart');
        if (!ctx) return;

        // Destroy existing chart
        if (worryLevelChart) {
            worryLevelChart.destroy();
        }

        worryLevelChart = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Sedikit Khawatir', 'Khawatir', 'Sangat Khawatir'],
                datasets: [{
                    data: [data.sedikit, data.khawatir, data.sangat],
                    backgroundColor: ['#1abc9c', '#f39c12', '#e74c3c'],
                    borderColor: ['#ffffff', '#ffffff', '#ffffff'],
                    borderWidth: 4,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Create Status Bar Chart
     */
    function createStatusChart(data) {
        const ctx = document.getElementById('statusChart');
        if (!ctx) return;

        // Destroy existing chart
        if (statusChart) {
            statusChart.destroy();
        }

        statusChart = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Process', 'In Progress', 'Completed'],
                datasets: [{
                    label: 'Jumlah Laporan',
                    data: [data.process, data.investigation, data.completed],
                    backgroundColor: ['#f39c12', '#2196f3', '#1abc9c'],
                    borderRadius: 8,
                    barThickness: 60
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed.y || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `Jumlah: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 5,
                            font: {
                                size: 12
                            }
                        },
                        grid: {
                            display: true,
                            drawBorder: false
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        }
                    }
                }
            }
        });
    }

    // ========================================
    // UPDATE FUNCTIONS
    // ========================================

    /**
     * Update summary card with total reports
     */
    function updateSummaryCard(total) {
        const totalElement = document.getElementById('totalReports');
        if (totalElement) {
            totalElement.textContent = total || 0;
        }
    }

    /**
     * Update gender statistics table
     */
    function updateGenderTable(data, total) {
        const genderTotal = data.male + data.female;
        updateTableCell('stat-male', data.male, genderTotal);
        updateTableCell('stat-female', data.female, genderTotal);
        updateTableCell('stat-gender-total', genderTotal);
    }

    /**
     * Update worry level statistics table
     */
    function updateWorryLevelTable(data, total) {
        const worryTotal = data.sedikit + data.khawatir + data.sangat;
        updateTableCell('stat-sedikit', data.sedikit, worryTotal);
        updateTableCell('stat-khawatir', data.khawatir, worryTotal);
        updateTableCell('stat-sangat', data.sangat, worryTotal);
        updateTableCell('stat-worry-total', worryTotal);
    }

    /**
     * Update status statistics table
     */
    function updateStatusTable(data, total) {
        const statusTotal = data.process + data.investigation + data.completed;
        updateTableCell('stat-process', data.process, statusTotal);
        updateTableCell('stat-investigation', data.investigation, statusTotal);
        updateTableCell('stat-completed', data.completed, statusTotal);
        updateTableCell('stat-status-total', statusTotal);
    }

    /**
     * Update table cell with value and percentage
     */
    function updateTableCell(elementId, value, total) {
        const element = document.getElementById(elementId);
        if (!element) return;

        if (total && elementId.indexOf('total') === -1) {
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            element.textContent = `${value} (${percentage}%)`;
        } else {
            element.textContent = value;
        }
    }

    // ========================================
    // UI STATE FUNCTIONS
    // ========================================

    /**
     * Show loading state
     */
    function showLoadingState() {
        // Add loading class to charts
        const chartContainers = document.querySelectorAll('.chart-container, .stat-card');
        chartContainers.forEach(container => {
            container.style.opacity = '0.5';
        });

        // Update total with loading indicator
        const totalElement = document.getElementById('totalReports');
        if (totalElement) {
            totalElement.textContent = '...';
        }
    }

    /**
     * Hide loading state
     */
    function hideLoadingState() {
        const chartContainers = document.querySelectorAll('.chart-container, .stat-card');
        chartContainers.forEach(container => {
            container.style.opacity = '1';
        });
    }

    /**
     * Show error state
     */
    function showErrorState(message) {
        console.error('Statistics error:', message);

        // Show error in total reports
        const totalElement = document.getElementById('totalReports');
        if (totalElement) {
            totalElement.textContent = '-';
        }

        // Update table cells with error
        const tableCells = document.querySelectorAll('[id^="stat-"]');
        tableCells.forEach(cell => {
            cell.textContent = '-';
        });

        // Hide loading
        hideLoadingState();

        // Show toast notification if available
        if (typeof showToast === 'function') {
            showToast('Gagal memuat statistik: ' + message, 'error');
        }
    }

    // ========================================
    // EXPORT
    // ========================================
    window.StatisticsManager = {
        loadStatistics: loadStatistics
    };

})();
