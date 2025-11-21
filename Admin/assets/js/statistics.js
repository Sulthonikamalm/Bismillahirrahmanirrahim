/**
 * ============================================================
 * SIGAP PPKS - Statistics Page JavaScript
 * File: assets/js/statistics.js
 * Description: Fetches statistics from API and renders charts
 * Version: 2.0 - Professional UI Update
 * ============================================================
 */

(function() {
    'use strict';

    // ========================================
    // CONFIGURATION
    // ========================================
    const API_BASE = '../../../api/cases/';
    const DEBUG_MODE = false;

    // Chart Colors
    const COLORS = {
        gender: {
            male: '#3b82f6',
            female: '#ec4899'
        },
        worry: {
            sedikit: '#10b981',
            khawatir: '#f59e0b',
            sangat: '#ef4444'
        },
        status: {
            process: '#f59e0b',
            inProgress: '#3b82f6',
            completed: '#10b981'
        }
    };

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

    /**
     * Prepare gender data for charts
     */
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

    /**
     * Prepare worry level data for charts
     */
    function prepareWorryData(byKekhawatiran) {
        const data = { sedikit: 0, khawatir: 0, sangat: 0 };

        if (byKekhawatiran && Array.isArray(byKekhawatiran)) {
            if (DEBUG_MODE) {
                console.log('DEBUG kekhawatiran raw data:', JSON.stringify(byKekhawatiran));
            }

            byKekhawatiran.forEach(item => {
                const level = (item.tingkat_kekhawatiran || '').toLowerCase().trim();
                const count = parseInt(item.count) || 0;

                if (DEBUG_MODE) {
                    console.log(`DEBUG: level="${level}", count=${count}`);
                }

                // Exact match first (database values: sedikit, khawatir, sangat)
                if (level === 'sedikit') {
                    data.sedikit += count;
                } else if (level === 'sangat') {
                    data.sangat += count;
                } else if (level === 'khawatir') {
                    data.khawatir += count;
                }
                // Fallback: includes match for other formats
                else if (level.includes('sedikit') || level === '1' || level === 'rendah' || level === 'low') {
                    data.sedikit += count;
                } else if (level.includes('sangat') || level.includes('darurat') || level === '3' || level === 'tinggi' || level === 'high' || level === 'emergency') {
                    data.sangat += count;
                } else if (level.includes('khawatir') || level === '2' || level === 'sedang' || level === 'medium') {
                    data.khawatir += count;
                }
            });

            if (DEBUG_MODE) {
                console.log('DEBUG kekhawatiran result:', data);
            }
        }

        return data;
    }

    /**
     * Prepare status data for charts
     */
    function prepareStatusData(byStatus) {
        const data = { process: 0, inProgress: 0, completed: 0 };

        if (byStatus && Array.isArray(byStatus)) {
            byStatus.forEach(item => {
                const status = (item.status_laporan || '').toLowerCase();
                const count = parseInt(item.count) || 0;
                if (status === 'process') {
                    data.process = count;
                } else if (status === 'in progress' || status === 'investigation') {
                    data.inProgress = count;
                } else if (status === 'resolved' || status === 'closed' || status === 'completed') {
                    data.completed = count;
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

        if (genderChart) {
            genderChart.destroy();
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
                    borderWidth: 4,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: hasData,
                        backgroundColor: '#1e293b',
                        titleFont: { size: 13, weight: '600' },
                        bodyFont: { size: 12 },
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed || 0;
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${value} laporan (${percentage}%)`;
                            }
                        }
                    }
                }
            },
            plugins: hasData ? [] : [{
                id: 'noData',
                afterDraw: function(chart) {
                    const { ctx, width, height } = chart;
                    ctx.save();
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.font = '14px Inter, sans-serif';
                    ctx.fillStyle = '#94a3b8';
                    ctx.fillText('Belum ada data', width / 2, height / 2);
                    ctx.restore();
                }
            }]
        });
    }

    /**
     * Create Worry Level Donut Chart
     */
    function createWorryLevelChart(data) {
        const ctx = document.getElementById('worryLevelChart');
        if (!ctx) return;

        if (worryLevelChart) {
            worryLevelChart.destroy();
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
                    borderWidth: 4,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: hasData,
                        backgroundColor: '#1e293b',
                        titleFont: { size: 13, weight: '600' },
                        bodyFont: { size: 12 },
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed || 0;
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${value} laporan (${percentage}%)`;
                            }
                        }
                    }
                }
            },
            plugins: hasData ? [] : [{
                id: 'noData',
                afterDraw: function(chart) {
                    const { ctx, width, height } = chart;
                    ctx.save();
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.font = '14px Inter, sans-serif';
                    ctx.fillStyle = '#94a3b8';
                    ctx.fillText('Belum ada data', width / 2, height / 2);
                    ctx.restore();
                }
            }]
        });
    }

    /**
     * Create Status Bar Chart
     */
    function createStatusChart(data) {
        const ctx = document.getElementById('statusChart');
        if (!ctx) return;

        if (statusChart) {
            statusChart.destroy();
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
                    borderRadius: 8,
                    barThickness: 80,
                    maxBarThickness: 100
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        titleFont: { size: 13, weight: '600' },
                        bodyFont: { size: 12 },
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed.y || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${value} laporan (${percentage}%)`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            font: { size: 12, family: 'Inter' },
                            color: '#64748b'
                        },
                        grid: {
                            color: '#e2e8f0',
                            drawBorder: false
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: {
                            font: { size: 13, weight: '500', family: 'Inter' },
                            color: '#1e293b'
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
     * Update summary cards
     */
    function updateSummaryCards(total, statusData) {
        updateElement('totalReports', total || 0);
        updateElement('summaryProcess', statusData.process || 0);
        updateElement('summaryInProgress', statusData.inProgress || 0);
        updateElement('summaryCompleted', statusData.completed || 0);
    }

    /**
     * Update gender legend
     */
    function updateGenderLegend(data) {
        const total = data.male + data.female;
        updateLegendItem('stat-male', data.male, total);
        updateLegendItem('stat-female', data.female, total);
    }

    /**
     * Update worry level legend
     */
    function updateWorryLegend(data) {
        const total = data.sedikit + data.khawatir + data.sangat;
        updateLegendItem('stat-sedikit', data.sedikit, total);
        updateLegendItem('stat-khawatir', data.khawatir, total);
        updateLegendItem('stat-sangat', data.sangat, total);
    }

    /**
     * Update status legend
     */
    function updateStatusLegend(data) {
        const total = data.process + data.inProgress + data.completed;
        updateLegendItem('stat-process', data.process, total);
        updateLegendItem('stat-inprogress', data.inProgress, total);
        updateLegendItem('stat-completed', data.completed, total);
    }

    /**
     * Update legend item (count and percent)
     */
    function updateLegendItem(baseId, value, total) {
        const countEl = document.getElementById(`${baseId}-count`);
        const percentEl = document.getElementById(`${baseId}-percent`);

        if (countEl) countEl.textContent = value;
        if (percentEl) {
            const percent = total > 0 ? ((value / total) * 100).toFixed(0) : 0;
            percentEl.textContent = `${percent}%`;
        }
    }

    /**
     * Update element text content
     */
    function updateElement(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    // ========================================
    // UI STATE FUNCTIONS
    // ========================================

    /**
     * Show loading state
     */
    function showLoadingState() {
        const cards = document.querySelectorAll('.summary-card, .chart-card');
        cards.forEach(card => {
            card.style.opacity = '0.6';
        });

        // Show loading in summary cards
        ['totalReports', 'summaryProcess', 'summaryInProgress', 'summaryCompleted'].forEach(id => {
            updateElement(id, '...');
        });
    }

    /**
     * Hide loading state
     */
    function hideLoadingState() {
        const cards = document.querySelectorAll('.summary-card, .chart-card');
        cards.forEach(card => {
            card.style.opacity = '1';
            card.style.transition = 'opacity 0.3s ease';
        });
    }

    /**
     * Show error state
     */
    function showErrorState(message) {
        console.error('Statistics error:', message);

        // Update summary cards with error
        ['totalReports', 'summaryProcess', 'summaryInProgress', 'summaryCompleted'].forEach(id => {
            updateElement(id, '-');
        });

        // Update legends with error
        document.querySelectorAll('[id$="-count"]').forEach(el => {
            el.textContent = '-';
        });
        document.querySelectorAll('[id$="-percent"]').forEach(el => {
            el.textContent = '-';
        });

        hideLoadingState();
        showToast('Gagal memuat statistik: ' + message, 'error');
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

        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 10);

        // Remove after delay
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
