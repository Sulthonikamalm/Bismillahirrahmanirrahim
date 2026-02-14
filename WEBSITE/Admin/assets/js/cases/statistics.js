/**
 * ============================================================
 * SIGAP PPKPT - Statistics Page JavaScript
 * File: assets/js/statistics.js
 * Version: 2.1 - Fixed resize bug & website theme colors
 * ============================================================
 */

(function() {
    'use strict';

    // ========================================
    // CONFIGURATION
    // ========================================
    const API_BASE = '../../../api/cases/';
    const DEBUG_MODE = false;

    // Website Theme Colors
    const COLORS = {
        gender: {
            male: '#547e9b',      // Mid blue
            female: '#ec4899'     // Pink
        },
        worry: {
            sedikit: '#1abc9c',   // Success green
            khawatir: '#f39c12',  // Warning orange
            sangat: '#e74c3c'     // Danger red
        },
        status: {
            process: '#f39c12',   // Warning orange
            inProgress: '#547e9b', // Mid blue
            completed: '#1abc9c'   // Success green
        }
    };

    // ========================================
    // STATE
    // ========================================
    let statisticsData = null;
    let genderChart = null;
    let worryLevelChart = null;
    let statusChart = null;
    let resizeTimeout = null;

    // ========================================
    // INITIALIZATION
    // ========================================
    document.addEventListener('DOMContentLoaded', function() {
        loadStatistics();
        initResizeHandler();
    });

    // ========================================
    // RESIZE HANDLER - Fix for mobile/desktop switch bug
    // ========================================

    /**
     * Initialize resize handler with debounce
     */
    function initResizeHandler() {
        window.addEventListener('resize', function() {
            // Debounce resize events
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(function() {
                if (statisticsData) {
                    redrawAllCharts();
                }
            }, 250);
        });

        // Also handle orientation change for mobile
        window.addEventListener('orientationchange', function() {
            setTimeout(function() {
                if (statisticsData) {
                    redrawAllCharts();
                }
            }, 300);
        });
    }

    /**
     * Redraw all charts (used after resize)
     */
    function redrawAllCharts() {
        const genderData = prepareGenderData(statisticsData.by_gender);
        const worryData = prepareWorryData(statisticsData.by_kekhawatiran);
        const statusData = prepareStatusData(statisticsData.by_status);

        createGenderChart(genderData);
        createWorryLevelChart(worryData);
        createStatusChart(statusData);
    }

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

        // Prepare chart data
        const genderData = prepareGenderData(statisticsData.by_gender);
        const worryData = prepareWorryData(statisticsData.by_kekhawatiran);
        const statusData = prepareStatusData(statisticsData.by_status);

        // Update summary cards
        updateSummaryCards(statisticsData.total_cases, statusData);

        // Create charts
        createGenderChart(genderData);
        createWorryLevelChart(worryData);
        createStatusChart(statusData);

        // Update legends
        updateGenderLegend(genderData);
        updateWorryLegend(worryData);
        updateStatusLegend(statusData);

        hideLoadingState();
    }

    // ========================================
    // DATA PREPARATION FUNCTIONS
    // ========================================

    function prepareGenderData(byGender) {
        const data = { male: 0, female: 0 };

        if (byGender && Array.isArray(byGender)) {
            byGender.forEach(item => {
                const gender = (item.gender_korban || '').toLowerCase();
                const count = parseInt(item.count) || 0;
                if (gender === 'laki-laki' || gender === 'male' || gender === 'pria') {
                    data.male = count;
                } else if (gender === 'perempuan' || gender === 'female' || gender === 'wanita') {
                    data.female = count;
                }
            });
        }

        return data;
    }

    function prepareWorryData(byKekhawatiran) {
        const data = { sedikit: 0, khawatir: 0, sangat: 0 };

        if (byKekhawatiran && Array.isArray(byKekhawatiran)) {
            byKekhawatiran.forEach(item => {
                const level = (item.tingkat_kekhawatiran || '').toLowerCase().trim();
                const count = parseInt(item.count) || 0;

                // Exact match first
                if (level === 'sedikit') {
                    data.sedikit += count;
                } else if (level === 'sangat') {
                    data.sangat += count;
                } else if (level === 'khawatir') {
                    data.khawatir += count;
                }
                // Fallback
                else if (level.includes('sedikit') || level === '1' || level === 'rendah') {
                    data.sedikit += count;
                } else if (level.includes('sangat') || level.includes('darurat') || level === '3') {
                    data.sangat += count;
                } else if (level.includes('khawatir') || level === '2' || level === 'sedang') {
                    data.khawatir += count;
                }
            });
        }

        return data;
    }

    function prepareStatusData(byStatus) {
        const data = { process: 0, inProgress: 0, completed: 0, other: 0 };

        if (byStatus && Array.isArray(byStatus)) {
            byStatus.forEach(item => {
                const status = (item.status_laporan || '').toLowerCase().trim();
                const count = parseInt(item.count) || 0;
                if (status === 'process') {
                    data.process += count;
                } else if (status === 'in progress' || status === 'investigation') {
                    data.inProgress += count;
                } else if (status === 'resolved' || status === 'closed' || status === 'completed') {
                    data.completed += count;
                } else {
                    // NULL, empty, or unknown status - treat as pending/process
                    data.other += count;
                }
            });
        }

        // Add 'other' (unknown/null status) to process count for display
        // These are records that haven't been assigned a proper status yet
        data.process += data.other;

        return data;
    }

    // ========================================
    // CHART CREATION FUNCTIONS
    // ========================================

    function createGenderChart(data) {
        const ctx = document.getElementById('genderChart');
        if (!ctx) return;

        // Always destroy existing chart first
        if (genderChart) {
            genderChart.destroy();
            genderChart = null;
        }

        const total = data.male + data.female;
        const hasData = total > 0;

        genderChart = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Laki-laki', 'Perempuan'],
                datasets: [{
                    data: hasData ? [data.male, data.female] : [1],
                    backgroundColor: hasData ? [COLORS.gender.male, COLORS.gender.female] : ['#e2e8f0'],
                    borderColor: '#ffffff',
                    borderWidth: 3,
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '68%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: hasData,
                        backgroundColor: '#132338',
                        titleFont: { size: 12, weight: '600' },
                        bodyFont: { size: 11 },
                        padding: 10,
                        cornerRadius: 6,
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed || 0;
                                const pct = total > 0 ? ((value / total) * 100).toFixed(0) : 0;
                                return `${value} laporan (${pct}%)`;
                            }
                        }
                    }
                }
            },
            plugins: hasData ? [] : [noDataPlugin]
        });
    }

    function createWorryLevelChart(data) {
        const ctx = document.getElementById('worryLevelChart');
        if (!ctx) return;

        if (worryLevelChart) {
            worryLevelChart.destroy();
            worryLevelChart = null;
        }

        const total = data.sedikit + data.khawatir + data.sangat;
        const hasData = total > 0;

        worryLevelChart = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Sedikit Khawatir', 'Khawatir', 'Sangat Khawatir'],
                datasets: [{
                    data: hasData ? [data.sedikit, data.khawatir, data.sangat] : [1],
                    backgroundColor: hasData ? [COLORS.worry.sedikit, COLORS.worry.khawatir, COLORS.worry.sangat] : ['#e2e8f0'],
                    borderColor: '#ffffff',
                    borderWidth: 3,
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '68%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: hasData,
                        backgroundColor: '#132338',
                        titleFont: { size: 12, weight: '600' },
                        bodyFont: { size: 11 },
                        padding: 10,
                        cornerRadius: 6,
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed || 0;
                                const pct = total > 0 ? ((value / total) * 100).toFixed(0) : 0;
                                return `${value} laporan (${pct}%)`;
                            }
                        }
                    }
                }
            },
            plugins: hasData ? [] : [noDataPlugin]
        });
    }

    function createStatusChart(data) {
        const ctx = document.getElementById('statusChart');
        if (!ctx) return;

        if (statusChart) {
            statusChart.destroy();
            statusChart = null;
        }

        statusChart = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Process', 'In Progress', 'Completed'],
                datasets: [{
                    label: 'Jumlah Laporan',
                    data: [data.process, data.inProgress, data.completed],
                    backgroundColor: [
                        COLORS.status.process,
                        COLORS.status.inProgress,
                        COLORS.status.completed
                    ],
                    borderRadius: 6,
                    barThickness: 60,
                    maxBarThickness: 80
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#132338',
                        titleFont: { size: 12, weight: '600' },
                        bodyFont: { size: 11 },
                        padding: 10,
                        cornerRadius: 6,
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed.y || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = total > 0 ? ((value / total) * 100).toFixed(0) : 0;
                                return `${value} laporan (${pct}%)`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            font: { size: 11 },
                            color: '#6c757d'
                        },
                        grid: {
                            color: '#e2e8f0',
                            drawBorder: false
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: {
                            font: { size: 12, weight: '500' },
                            color: '#132338'
                        }
                    }
                }
            }
        });
    }

    // No data plugin for charts
    const noDataPlugin = {
        id: 'noData',
        afterDraw: function(chart) {
            const { ctx, width, height } = chart;
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '13px Inter, -apple-system, sans-serif';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText('Belum ada data', width / 2, height / 2);
            ctx.restore();
        }
    };

    // ========================================
    // UPDATE FUNCTIONS
    // ========================================

    function updateSummaryCards(total, statusData) {
        updateElement('totalReports', total || 0);
        updateElement('summaryProcess', statusData.process || 0);
        updateElement('summaryInProgress', statusData.inProgress || 0);
        updateElement('summaryCompleted', statusData.completed || 0);
    }

    function updateGenderLegend(data) {
        const total = data.male + data.female;
        updateLegendItem('stat-male', data.male, total);
        updateLegendItem('stat-female', data.female, total);
    }

    function updateWorryLegend(data) {
        const total = data.sedikit + data.khawatir + data.sangat;
        updateLegendItem('stat-sedikit', data.sedikit, total);
        updateLegendItem('stat-khawatir', data.khawatir, total);
        updateLegendItem('stat-sangat', data.sangat, total);
    }

    function updateStatusLegend(data) {
        const total = data.process + data.inProgress + data.completed;
        updateLegendItem('stat-process', data.process, total);
        updateLegendItem('stat-inprogress', data.inProgress, total);
        updateLegendItem('stat-completed', data.completed, total);
    }

    function updateLegendItem(baseId, value, total) {
        const countEl = document.getElementById(`${baseId}-count`);
        const percentEl = document.getElementById(`${baseId}-percent`);

        if (countEl) countEl.textContent = value;
        if (percentEl) {
            const percent = total > 0 ? ((value / total) * 100).toFixed(0) : 0;
            percentEl.textContent = `${percent}%`;
        }
    }

    function updateElement(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    // ========================================
    // UI STATE FUNCTIONS
    // ========================================

    function showLoadingState() {
        const cards = document.querySelectorAll('.summary-card, .chart-card');
        cards.forEach(card => {
            card.style.opacity = '0.6';
        });

        ['totalReports', 'summaryProcess', 'summaryInProgress', 'summaryCompleted'].forEach(id => {
            updateElement(id, '...');
        });
    }

    function hideLoadingState() {
        const cards = document.querySelectorAll('.summary-card, .chart-card');
        cards.forEach(card => {
            card.style.opacity = '1';
            card.style.transition = 'opacity 0.3s ease';
        });
    }

    function showErrorState(message) {
        console.error('Statistics error:', message);

        ['totalReports', 'summaryProcess', 'summaryInProgress', 'summaryCompleted'].forEach(id => {
            updateElement(id, '-');
        });

        document.querySelectorAll('[id$="-count"]').forEach(el => {
            el.textContent = '-';
        });
        document.querySelectorAll('[id$="-percent"]').forEach(el => {
            el.textContent = '-';
        });

        hideLoadingState();
        showToast('Gagal memuat statistik', 'error');
    }

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

    // ========================================
    // EXPORT
    // ========================================
    window.StatisticsManager = {
        loadStatistics: loadStatistics,
        showToast: showToast
    };

})();
