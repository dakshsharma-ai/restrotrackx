// Register ChartJS plugins
Chart.register(ChartDataLabels);

// DOM Elements
const totalInventoryValue = document.getElementById('total-inventory-value');
const totalOrdersValue = document.getElementById('total-orders-value');
const avgOrderValue = document.getElementById('avg-order-value');
const lowStockValue = document.getElementById('low-stock-value');
const wasteValue = document.getElementById('waste-value');
const inventoryEfficiency = document.getElementById('inventory-efficiency');

// Initialize charts when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    updateAnalytics();
    initializeCharts();
    setupTimeFilter();
    setupModalHandlers();
    generateInsights();
    
    // Set up refresh button
    const refreshButton = document.getElementById('refresh-insights');
    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            refreshButton.style.transform = 'rotate(360deg)';
            generateInsights();
            setTimeout(() => {
                refreshButton.style.transform = 'rotate(0deg)';
            }, 1000);
        });
    }

    // Set up real-time updates
    const storageKeys = ['inventoryItems', 'orders'];
    storageKeys.forEach(key => {
        window.addEventListener('storage', (e) => {
            if (e.key === key) {
                generateInsights();
            }
        });
    });

    // Periodic refresh every 5 minutes
    setInterval(generateInsights, 300000);
});

// Format currency in Indian Rupees
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

function updateAnalytics() {
    try {
        // Get inventory data
        const inventoryData = localStorage.getItem('inventoryItems');
        const inventory = inventoryData ? JSON.parse(inventoryData) : [];
        console.log('Inventory Data:', inventory); // Debug log

        // Get orders data
        const ordersData = localStorage.getItem('orders');
        const orders = ordersData ? JSON.parse(ordersData) : { pending: [], completed: [] };
        const allOrders = [...orders.pending, ...orders.completed];
        console.log('Orders Data:', orders); // Debug log

        // Calculate total inventory value (sum of prices)
        const inventoryTotal = inventory.reduce((sum, item) => {
            const price = parseFloat(item.price) || 0;
            console.log(`Item: ${item.name}, Price: ${price}`); // Debug log
            return sum + price;
        }, 0);
        console.log('Total Inventory Value:', inventoryTotal); // Debug log
        totalInventoryValue.textContent = formatCurrency(inventoryTotal);

        // Calculate total orders value
        const ordersTotal = allOrders.reduce((sum, order) => {
            const price = parseFloat(order.price) || 0;
            return sum + price;
        }, 0);
        totalOrdersValue.textContent = formatCurrency(ordersTotal);

        // Calculate average order value
        const avgOrder = allOrders.length > 0 ? ordersTotal / allOrders.length : 0;
        avgOrderValue.textContent = formatCurrency(avgOrder);

        // Calculate low stock value (items with quantity <= 10)
        const lowStockItems = inventory.filter(item => {
            const quantity = parseFloat(item.quantity) || 0;
            return quantity <= 10;
        });
        const lowStockTotal = lowStockItems.reduce((sum, item) => {
            const price = parseFloat(item.price) || 0;
            return sum + price;
        }, 0);
        lowStockValue.textContent = formatCurrency(lowStockTotal);

        // Calculate waste value (items that expired)
        const wasteTotal = calculateWasteValue(inventory);
        wasteValue.textContent = formatCurrency(wasteTotal);

        // Calculate inventory efficiency
        const efficiency = calculateInventoryEfficiency(inventory, allOrders);
        inventoryEfficiency.textContent = `${Math.round(efficiency)}%`;
    } catch (error) {
        console.error('Error updating analytics:', error);
    }
}

function calculateWasteValue(inventory) {
    const expiredItems = inventory.filter(item => {
        const daysUntilExpiry = calculateDaysUntilExpiry(item.expiryDate);
        return daysUntilExpiry < 0;
    });
    return expiredItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function calculateInventoryEfficiency(inventory, orders) {
    if (inventory.length === 0) return 0;
    const totalInventoryValue = inventory.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalOrdersValue = orders.reduce((sum, order) => sum + order.price, 0);
    return (totalOrdersValue / totalInventoryValue) * 100;
}

function initializeCharts() {
    try {
        const inventory = JSON.parse(localStorage.getItem('inventoryItems') || '[]');
        const orders = JSON.parse(localStorage.getItem('orders') || '{ "pending": [], "completed": [] }');

        createInventoryTrendChart(inventory);
        createCategoryDistributionChart(inventory);
        createOrderTrendChart(orders);
        createTopItemsChart(inventory);
        createExpiryAnalysisChart(inventory);
        createWasteTrendChart(inventory);
        createCategoryPerformanceChart(inventory, orders);
    } catch (error) {
        console.error('Error initializing charts:', error);
    }
}

function createInventoryTrendChart(inventory) {
    try {
        const ctx = document.getElementById('inventory-trend-chart').getContext('2d');
        if (!ctx) {
            console.error('Inventory trend chart canvas not found');
            return;
        }

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: getLast30Days(),
                datasets: [{
                    label: 'Inventory Value',
                    data: calculateDailyInventoryValue(inventory),
                    borderColor: '#4ECDC4',
                    backgroundColor: 'rgba(78, 205, 196, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: getChartOptions('currency')
        });
    } catch (error) {
        console.error('Error creating inventory trend chart:', error);
    }
}

function createCategoryDistributionChart(inventory) {
    try {
        const ctx = document.getElementById('category-distribution-chart').getContext('2d');
        if (!ctx) {
            console.error('Category distribution chart canvas not found');
            return;
        }

        const categories = {};
        inventory.forEach(item => {
            const category = item.category || 'Uncategorized';
            const price = parseFloat(item.price) || 0;
            categories[category] = (categories[category] || 0) + price;
        });

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(categories),
                datasets: [{
                    data: Object.values(categories),
                    backgroundColor: [
                        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
                        '#FFEEAD', '#D4A5A5', '#9FA0FF', '#A8E6CF'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: '#fff' }
                    },
                    datalabels: {
                        color: '#fff',
                        formatter: (value, ctx) => {
                            const sum = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value * 100) / sum).toFixed(1);
                            return percentage + '%';
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating category distribution chart:', error);
    }
}

function createOrderTrendChart(orders) {
    try {
        const ctx = document.getElementById('order-trend-chart').getContext('2d');
        if (!ctx) {
            console.error('Order trend chart canvas not found');
            return;
        }

        const orderData = calculateDailyOrderValue(orders);

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: getLast30Days(),
                datasets: [{
                    label: 'Order Value',
                    data: orderData,
                    borderColor: '#4ECDC4',
                    backgroundColor: 'rgba(78, 205, 196, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: getChartOptions('currency')
        });
    } catch (error) {
        console.error('Error creating order trend chart:', error);
    }
}

function createTopItemsChart(inventory) {
    try {
        const ctx = document.getElementById('top-items-chart').getContext('2d');
        if (!ctx) {
            console.error('Top items chart canvas not found');
            return;
        }

        const sortedItems = [...inventory]
            .map(item => ({
                name: item.name,
                value: parseFloat(item.price) || 0
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedItems.map(item => item.name),
                datasets: [{
                    label: 'Item Value',
                    data: sortedItems.map(item => item.value),
                    backgroundColor: '#4ECDC4',
                    borderRadius: 5
                }]
            },
            options: getChartOptions('currency')
        });
    } catch (error) {
        console.error('Error creating top items chart:', error);
    }
}

function createExpiryAnalysisChart(inventory) {
    try {
        const ctx = document.getElementById('expiry-analysis-chart').getContext('2d');
        if (!ctx) {
            console.error('Expiry analysis chart canvas not found');
            return;
        }

        const expiryData = {
            'Expired': 0,
            'This Week': 0,
            'This Month': 0,
            'Next Month': 0,
            'Later': 0
        };

        inventory.forEach(item => {
            if (!item.expiryDate) return;
            const days = calculateDaysUntilExpiry(item.expiryDate);
            if (days < 0) expiryData['Expired']++;
            else if (days <= 7) expiryData['This Week']++;
            else if (days <= 30) expiryData['This Month']++;
            else if (days <= 60) expiryData['Next Month']++;
            else expiryData['Later']++;
        });

        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(expiryData),
                datasets: [{
                    data: Object.values(expiryData),
                    backgroundColor: [
                        '#FF6B6B', '#FFD93D', '#4ECDC4', '#45B7D1', '#95A5A6'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: '#fff' }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating expiry analysis chart:', error);
    }
}

function createWasteTrendChart(inventory) {
    try {
        const ctx = document.getElementById('waste-trend-chart').getContext('2d');
        if (!ctx) {
            console.error('Waste trend chart canvas not found');
            return;
        }

        const wasteData = calculateDailyWasteValue(inventory);

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: getLast30Days(),
                datasets: [{
                    label: 'Waste Value',
                    data: wasteData,
                    borderColor: '#FF6B6B',
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: getChartOptions('currency')
        });
    } catch (error) {
        console.error('Error creating waste trend chart:', error);
    }
}

function createCategoryPerformanceChart(inventory, orders) {
    try {
        const ctx = document.getElementById('category-performance-chart');
        if (!ctx) {
            console.error('Category performance chart canvas not found');
            return;
        }

        // Get all unique categories from both inventory and orders
        const categories = new Set([
            ...inventory.map(item => item.category || 'Uncategorized'),
            ...orders.pending.map(order => order.category || 'Uncategorized'),
            ...orders.completed.map(order => order.category || 'Uncategorized')
        ]);

        // Calculate performance metrics for each category
        const categoryMetrics = {};
        const allOrders = [...orders.pending, ...orders.completed];

        categories.forEach(category => {
            const categoryOrders = allOrders.filter(order => order.category === category);
            const totalOrders = categoryOrders.length;
            const totalValue = categoryOrders.reduce((sum, order) => sum + (parseFloat(order.price) || 0), 0);
            const completedOrders = orders.completed.filter(order => order.category === category).length;
            const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

            categoryMetrics[category] = {
                totalOrders,
                totalValue,
                completionRate
            };
        });

        // Sort categories by total value
        const sortedCategories = Array.from(categories)
            .sort((a, b) => categoryMetrics[b].totalValue - categoryMetrics[a].totalValue);

        createCategoryPerformanceChart(sortedCategories, categoryMetrics);
    } catch (error) {
        console.error('Error creating category performance chart:', error);
    }
}

function createCategoryPerformanceChart(categories, metrics) {
    const ctx = document.getElementById('category-performance-chart');
    if (!ctx) return;

    // Sort categories by total value
    const sortedCategories = [...categories].sort((a, b) => 
        (metrics[b]?.totalValue || 0) - (metrics[a]?.totalValue || 0)
    );

    // Define gradient colors
    const valueGradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
    valueGradient.addColorStop(0, 'rgba(78, 205, 196, 0.8)');
    valueGradient.addColorStop(1, 'rgba(78, 205, 196, 0.2)');

    const orderGradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
    orderGradient.addColorStop(0, 'rgba(255, 107, 107, 0.8)');
    orderGradient.addColorStop(1, 'rgba(255, 107, 107, 0.2)');

    const rateGradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
    rateGradient.addColorStop(0, 'rgba(255, 230, 109, 0.8)');
    rateGradient.addColorStop(1, 'rgba(255, 230, 109, 0.2)');

    const data = {
        labels: sortedCategories,
        datasets: [
            {
                label: 'Total Value (₹)',
                data: sortedCategories.map(cat => metrics[cat]?.totalValue || 0),
                backgroundColor: valueGradient,
                borderColor: 'rgba(78, 205, 196, 1)',
                borderWidth: 2,
                tension: 0.4,
                yAxisID: 'y',
                order: 1
            },
            {
                label: 'Order Count',
                data: sortedCategories.map(cat => metrics[cat]?.orderCount || 0),
                backgroundColor: orderGradient,
                borderColor: 'rgba(255, 107, 107, 1)',
                borderWidth: 2,
                tension: 0.4,
                yAxisID: 'y1',
                order: 2
            },
            {
                label: 'Completion Rate (%)',
                data: sortedCategories.map(cat => (metrics[cat]?.completionRate || 0) * 100),
                backgroundColor: rateGradient,
                borderColor: 'rgba(255, 230, 109, 1)',
                borderWidth: 2,
                tension: 0.4,
                yAxisID: 'y2',
                order: 3
            }
        ]
    };

    const options = {
        responsive: true,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: {
                display: true,
                position: 'top',
                labels: {
                    color: '#fff',
                    font: {
                        size: 12
                    },
                    usePointStyle: true,
                    padding: 20
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#fff',
                bodyColor: '#fff',
                padding: 12,
                displayColors: true,
                callbacks: {
                    label: function(context) {
                        const label = context.dataset.label || '';
                        const value = context.parsed.y;
                        if (label.includes('₹')) {
                            return `${label}: ₹${value.toLocaleString('en-IN')}`;
                        } else if (label.includes('%')) {
                            return `${label}: ${value.toFixed(1)}%`;
                        } else {
                            return `${label}: ${value}`;
                        }
                    }
                }
            }
        },
        scales: {
            x: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)',
                },
                ticks: {
                    color: '#fff'
                }
            },
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)',
                },
                ticks: {
                    color: '#fff',
                    callback: value => `₹${value.toLocaleString('en-IN')}`
                }
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                grid: {
                    drawOnChartArea: false,
                },
                ticks: {
                    color: '#fff'
                }
            },
            y2: {
                type: 'linear',
                display: true,
                position: 'right',
                grid: {
                    drawOnChartArea: false,
                },
                ticks: {
                    color: '#fff',
                    callback: value => `${value}%`
                }
            }
        }
    };

    if (window.categoryPerformanceChart) {
        window.categoryPerformanceChart.destroy();
    }

    window.categoryPerformanceChart = new Chart(ctx, {
        type: 'line',
        data: data,
        options: options
    });
}

function getChartOptions(type = 'currency') {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                },
                ticks: {
                    color: '#fff',
                    callback: value => type === 'currency' ? formatCurrency(value) : value
                }
            },
            x: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                },
                ticks: {
                    color: '#fff'
                }
            }
        }
    };
}

function getLast30Days() {
    const dates = [];
    for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date.toLocaleDateString());
    }
    return dates;
}

function calculateDailyInventoryValue(inventory) {
    const dates = getLast30Days();
    return dates.map(() => {
        return inventory.reduce((sum, item) => {
            const price = parseFloat(item.price) || 0;
            return sum + price;
        }, 0);
    });
}

function calculateDailyOrderValue(orders) {
    const dates = getLast30Days();
    const allOrders = [...orders.pending, ...orders.completed];
    return dates.map(date => {
        const dayOrders = allOrders.filter(order => 
            new Date(order.orderDate).toLocaleDateString() === date
        );
        return dayOrders.reduce((sum, order) => {
            const price = parseFloat(order.price) || 0;
            return sum + price;
        }, 0);
    });
}

function calculateDailyWasteValue(inventory) {
    const dates = getLast30Days();
    return dates.map(() => calculateWasteValue(inventory) / 30);
}

function calculateDaysUntilExpiry(expiryDate) {
    if (!expiryDate) return Infinity;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function setupTimeFilter() {
    const timePeriod = document.getElementById('time-period');
    const customDateRange = document.getElementById('custom-date-range');
    
    timePeriod.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            customDateRange.style.display = 'flex';
        } else {
            customDateRange.style.display = 'none';
            updateAnalytics();
            initializeCharts();
        }
    });

    document.getElementById('apply-date-range').addEventListener('click', () => {
        updateAnalytics();
        initializeCharts();
    });
}

function setupModalHandlers() {
    const modal = document.getElementById('chart-detail-modal');
    const expandButtons = document.querySelectorAll('.expand-btn');
    const closeModal = document.querySelector('.close-modal');

    expandButtons.forEach(button => {
        button.addEventListener('click', () => {
            const card = button.closest('.analytics-card');
            const title = card.querySelector('h3').textContent;
            document.getElementById('detail-chart-title').textContent = title;
            modal.style.display = 'block';
        });
    });

    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// AI Insights Functions
function generateInsights() {
    try {
        const inventory = JSON.parse(localStorage.getItem('inventoryItems') || '[]');
        const orders = JSON.parse(localStorage.getItem('orders') || '{ "pending": [], "completed": [] }');
        const allOrders = [...orders.pending, ...orders.completed];

        const insights = [];

        // 1. Business Overview (Most Important)
        const totalValue = inventory.reduce((sum, item) => sum + parseFloat(item.price || 0), 0);
        const completionRate = (orders.completed.length / allOrders.length) * 100 || 0;
        insights.push({
            icon: 'analytics',
            title: 'Business Overview',
            description: `Current inventory value: ${formatCurrency(totalValue)}. Order completion rate: ${completionRate.toFixed(0)}%`
        });

        // 2. Stock Status (Critical Information)
        const lowStockItems = inventory.filter(item => parseFloat(item.quantity) <= 10);
        const expiringItems = inventory.filter(item => {
            const daysUntilExpiry = calculateDaysUntilExpiry(item.expiryDate);
            return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
        });

        if (lowStockItems.length > 0 || expiringItems.length > 0) {
            insights.push({
                icon: 'warning',
                title: 'Inventory Alerts',
                description: `${lowStockItems.length} items low on stock${expiringItems.length > 0 ? ` and ${expiringItems.length} items expiring soon` : ''}.`
            });
        }

        // 3. Order Trends (Business Intelligence)
        const today = new Date();
        const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const recentOrders = allOrders.filter(order => {
            const orderDate = new Date(order.orderDate);
            return orderDate >= lastWeek;
        });

        const totalRecentValue = recentOrders.reduce((sum, order) => sum + parseFloat(order.price || 0), 0);
        const averageOrderValue = totalRecentValue / (recentOrders.length || 1);
        const orderTrend = recentOrders.length > 0 
            ? `${recentOrders.length} orders in the last 7 days, averaging ${formatCurrency(averageOrderValue)} per order`
            : 'No orders in the last 7 days';

        insights.push({
            icon: 'trending_up',
            title: 'Recent Order Activity',
            description: orderTrend
        });

        updateInsightsUI(insights);
    } catch (error) {
        console.error('Error generating insights:', error);
    }
}

function updateInsightsUI(insights) {
    const container = document.querySelector('.insights-container');
    if (!container) return;

    container.innerHTML = insights.map(insight => `
        <div class="insight-card">
            <div class="insight-icon">
                <span class="material-icons">${insight.icon}</span>
            </div>
            <div class="insight-content">
                <h4 class="insight-title">${insight.title}</h4>
                <p class="insight-description">${insight.description}</p>
            </div>
        </div>
    `).join('');
} 