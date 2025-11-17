/**
 * SIGAP PPKS - Statistics Page
 * File: assets/js/statistics.js
 * 
 * Handles charts and statistics visualization
 * Uses Chart.js library
 */

document.addEventListener('DOMContentLoaded', function() {
    
    // === DATA INITIALIZATION ===
    // TODO: Replace with actual data from database via API
    
    const statisticsData = {
        worryLevels: {
            sedikit: 15,
            khawatir: 25,
            sangat: 12  // Includes darurat cases
        },
        status: {
            process: 20,
            investigation: 18,
            completed: 14
        }
    };
    
    // Calculate totals
    const totalReports = Object.values(statisticsData.worryLevels).reduce((a, b) => a + b, 0);
    
    // === UPDATE SUMMARY CARD ===
    updateSummaryCard(totalReports);
    
    // === CREATE CHARTS ===
    createWorryLevelChart(statisticsData.worryLevels);
    createStatusChart(statisticsData.status);
    
    // === UPDATE TABLES ===
    updateWorryLevelTable(statisticsData.worryLevels, totalReports);
    updateStatusTable(statisticsData.status, totalReports);
    
    // ========================================
    // CHART CREATION FUNCTIONS
    // ========================================
    
    /**
     * Create Worry Level Donut Chart
     * @param {Object} data - Worry level data
     */
    function createWorryLevelChart(data) {
        const ctx = document.getElementById('worryLevelChart');
        if (!ctx) return;
        
        new Chart(ctx.getContext('2d'), {
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
                                const percentage = ((value / total) * 100).toFixed(1);
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
     * @param {Object} data - Status data
     */
    function createStatusChart(data) {
        const ctx = document.getElementById('statusChart');
        if (!ctx) return;
        
        new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Process', 'Investigation', 'Completed'],
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
                                const percentage = ((value / total) * 100).toFixed(1);
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
     * @param {number} total - Total number of reports
     */
    function updateSummaryCard(total) {
        const totalElement = document.getElementById('totalReports');
        if (totalElement) {
            totalElement.textContent = total;
        }
    }
    
    /**
     * Update worry level statistics table
     * @param {Object} data - Worry level data
     * @param {number} total - Total reports
     */
    function updateWorryLevelTable(data, total) {
        updateTableCell('stat-sedikit', data.sedikit, total);
        updateTableCell('stat-khawatir', data.khawatir, total);
        updateTableCell('stat-sangat', data.sangat, total);
        updateTableCell('stat-worry-total', total);
    }
    
    /**
     * Update status statistics table
     * @param {Object} data - Status data
     * @param {number} total - Total reports
     */
    function updateStatusTable(data, total) {
        updateTableCell('stat-process', data.process, total);
        updateTableCell('stat-investigation', data.investigation, total);
        updateTableCell('stat-completed', data.completed, total);
        updateTableCell('stat-status-total', total);
    }
    
    /**
     * Update table cell with value and percentage
     * @param {string} elementId - ID of the element to update
     * @param {number} value - Value to display
     * @param {number} total - Total for percentage calculation (optional)
     */
    function updateTableCell(elementId, value, total = null) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        if (total && elementId.indexOf('total') === -1) {
            const percentage = ((value / total) * 100).toFixed(1);
            element.textContent = `${value} (${percentage}%)`;
        } else {
            element.textContent = value;
        }
    }
    
    // ========================================
    // DATA LOADING FUNCTION (For Future Use)
    // ========================================
    
    /**
     * Load statistics from API
     * TODO: Implement when backend is ready
     */
    function loadStatistics() {
        // Example API call structure:
        /*
        fetch('api/cases/get-statistics.php')
            .then(response => response.json())
            .then(data => {
                // Update charts and tables with real data
                console.log('Statistics loaded:', data);
            })
            .catch(error => {
                console.error('Error loading statistics:', error);
            });
        */
    }
});