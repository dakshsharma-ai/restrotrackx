// Dashboard Data Processing and Display

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard();
});

// Main initialization function
async function initializeDashboard() {
    try {
        // Load inventory data from localStorage
        const inventoryData = JSON.parse(localStorage.getItem('inventoryItems')) || [];
        
        // Update overview cards
        updateOverviewCards(inventoryData);
        
        // Update charts
        updateCategoryChart(inventoryData);
        updateStockStatus(inventoryData);
        updateExpiryTracking(inventoryData);
        updateCategoryValueAnalysis(inventoryData);
        
        // Update items needing attention
        updateAttentionItems(inventoryData);
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showError('Failed to load dashboard data');
    }
}

// Update overview cards with summary data
function updateOverviewCards(data) {
    // Total items
    document.getElementById('total-items-count').textContent = data.length;
    
    // Total value calculation
    const totalValue = data.reduce((sum, item) => {
        // Remove ₹ symbol and commas, then parse as float
        const priceString = item.price.toString().replace(/[₹,\s]/g, '');
        const price = parseFloat(priceString);
        const quantity = parseFloat(item.quantity);
        
        // Check if values are valid numbers
        if (!isNaN(price) && !isNaN(quantity)) {
            return sum + price;  // We don't multiply by quantity as price is per item
        }
        return sum;
    }, 0);
    
    document.getElementById('total-value').textContent = formatCurrency(totalValue);
    
    // Low stock items
    const lowStockCount = data.filter(item => isLowStock(item)).length;
    document.getElementById('low-stock-count').textContent = lowStockCount;
    
    // Expiring soon
    const expiringSoonCount = data.filter(item => isExpiringSoon(item)).length;
    document.getElementById('expiring-soon-count').textContent = expiringSoonCount;
}

// Update category distribution chart
function updateCategoryChart(data) {
    const categories = {};
    data.forEach(item => {
        categories[item.category] = (categories[item.category] || 0) + 1;
    });

    const ctx = document.getElementById('category-chart').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(categories),
            datasets: [{
                data: Object.values(categories),
                backgroundColor: [
                    '#FF6B6B', '#4ECDC4', '#45B7D1',
                    '#96CEB4', '#FFEEAD', '#D4A5A5',
                    '#9FA8DA'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#fff'
                    }
                }
            }
        }
    });
}

// Update stock status
function updateStockStatus(data) {
    const stockStatus = {
        critical: 0,
        warning: 0,
        good: 0,
        out: 0
    };

    data.forEach(item => {
        const quantity = parseFloat(item.quantity);
        if (quantity === 0) stockStatus.out++;
        else if (quantity <= 5) stockStatus.critical++;
        else if (quantity <= 10) stockStatus.warning++;
        else stockStatus.good++;
    });

    document.getElementById('critical-stock-count').textContent = stockStatus.critical;
    document.getElementById('warning-stock-count').textContent = stockStatus.warning;
    document.getElementById('good-stock-count').textContent = stockStatus.good;
    document.getElementById('out-stock-count').textContent = stockStatus.out;
}

// Update expiry tracking
function updateExpiryTracking(data) {
    const expiryStatus = {
        critical: 0,
        warning: 0,
        upcoming: 0
    };

    data.forEach(item => {
        const daysUntilExpiry = getDaysUntilExpiry(item.expiryDate);
        if (daysUntilExpiry <= 2) expiryStatus.critical++;
        else if (daysUntilExpiry <= 4) expiryStatus.warning++;
        else if (daysUntilExpiry <= 7) expiryStatus.upcoming++;
    });

    document.getElementById('critical-expiry-count').textContent = expiryStatus.critical;
    document.getElementById('warning-expiry-count').textContent = expiryStatus.warning;
    document.getElementById('upcoming-expiry-count').textContent = expiryStatus.upcoming;

    // Update expiry chart
    const ctx = document.getElementById('expiry-chart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Critical (≤2 days)', 'Warning (≤4 days)', 'Upcoming (≤7 days)'],
            datasets: [{
                label: 'Items',
                data: [expiryStatus.critical, expiryStatus.warning, expiryStatus.upcoming],
                backgroundColor: ['#FF6B6B', '#FFD93D', '#6BCB77']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#fff'
                    }
                },
                x: {
                    ticks: {
                        color: '#fff'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Update category value analysis
function updateCategoryValueAnalysis(data) {
    const categoryValues = {};
    const categoryQuantities = {};

    data.forEach(item => {
        // Remove ₹ symbol and commas, then parse as float
        const priceString = item.price.toString().replace(/[₹,\s]/g, '');
        const price = parseFloat(priceString);
        const quantity = parseFloat(item.quantity);
        
        // Only process if we have valid numbers
        if (!isNaN(price) && !isNaN(quantity)) {
            const value = price;  // Price is already the total value per item
            
            if (!categoryValues[item.category]) {
                categoryValues[item.category] = 0;
                categoryQuantities[item.category] = 0;
            }
            
            categoryValues[item.category] += value;
            categoryQuantities[item.category] += quantity;
        }
    });

    // Update most valuable category
    if (Object.keys(categoryValues).length > 0) {
        const mostValuable = Object.entries(categoryValues)
            .sort(([,a], [,b]) => b - a)[0];
        document.getElementById('most-valuable-category').textContent = 
            `${mostValuable[0]} (${formatCurrency(mostValuable[1])})`;
    }

    // Update most stocked category
    if (Object.keys(categoryQuantities).length > 0) {
        const mostStocked = Object.entries(categoryQuantities)
            .sort(([,a], [,b]) => b - a)[0];
        document.getElementById('most-stocked-category').textContent = 
            `${mostStocked[0]} (${mostStocked[1]} items)`;
    }

    // Update category needing attention
    const attentionCategory = findCategoryNeedingAttention(data);
    document.getElementById('attention-category').textContent = attentionCategory;

    // Create category value chart
    const ctx = document.getElementById('category-value-chart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(categoryValues),
            datasets: [{
                label: 'Category Value',
                data: Object.values(categoryValues),
                backgroundColor: '#4ECDC4'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => formatCurrency(value),
                        color: '#fff'
                    }
                },
                x: {
                    ticks: {
                        color: '#fff'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return formatCurrency(context.raw);
                        }
                    }
                }
            }
        }
    });
}

// Update items needing attention table
function updateAttentionItems(data) {
    const attentionItems = data.filter(item => 
        isLowStock(item) || isExpiringSoon(item)
    ).sort((a, b) => {
        // Sort by criticality (low stock and expiring soon first)
        const aScore = (isLowStock(a) ? 2 : 0) + (isExpiringSoon(a) ? 1 : 0);
        const bScore = (isLowStock(b) ? 2 : 0) + (isExpiringSoon(b) ? 1 : 0);
        return bScore - aScore;
    }).slice(0, 5); // Show top 5 items needing attention

    const tbody = document.getElementById('attention-items');
    tbody.innerHTML = '';

    attentionItems.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.name}</td>
            <td>${item.category}</td>
            <td>
                <span class="status-badge ${getStockStatusClass(item)}">
                    ${getStockStatusLabel(item)}
                </span>
            </td>
            <td>
                <span class="status-badge ${getExpiryStatusClass(item)}">
                    ${formatDate(item.expiryDate)}
                </span>
            </td>
            <td>
                <button class="action-btn" onclick="location.href='inventory.html'">
                    View Details
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Helper Functions
function formatCurrency(amount) {
    // Ensure amount is a number and not NaN
    if (typeof amount !== 'number' || isNaN(amount)) {
        amount = 0;
    }
    
    // Format as Indian Rupees with proper grouping
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function formatDate(dateString) {
    if (!dateString) return 'No date';
    return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function getDaysUntilExpiry(expiryDate) {
    if (!expiryDate) return Infinity;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function isLowStock(item) {
    return parseFloat(item.quantity) <= 10;
}

function isExpiringSoon(item) {
    return getDaysUntilExpiry(item.expiryDate) <= 7;
}

function getStockStatusClass(item) {
    const quantity = parseFloat(item.quantity);
    if (quantity === 0) return 'status-critical';
    if (quantity <= 5) return 'status-warning';
    if (quantity <= 10) return 'status-upcoming';
    return 'status-good';
}

function getStockStatusLabel(item) {
    const quantity = parseFloat(item.quantity);
    if (quantity === 0) return 'Out of Stock';
    if (quantity <= 5) return 'Critical Stock';
    if (quantity <= 10) return 'Low Stock';
    return 'Well Stocked';
}

function getExpiryStatusClass(item) {
    const days = getDaysUntilExpiry(item.expiryDate);
    if (days <= 2) return 'status-critical';
    if (days <= 4) return 'status-warning';
    if (days <= 7) return 'status-upcoming';
    return '';
}

function findCategoryNeedingAttention(data) {
    const categoryIssues = {};
    
    data.forEach(item => {
        if (!categoryIssues[item.category]) {
            categoryIssues[item.category] = {
                lowStock: 0,
                expiringSoon: 0,
                total: 0
            };
        }
        
        if (isLowStock(item)) categoryIssues[item.category].lowStock++;
        if (isExpiringSoon(item)) categoryIssues[item.category].expiringSoon++;
        categoryIssues[item.category].total++;
    });

    // Find category with highest percentage of issues
    let worstCategory = null;
    let worstScore = 0;

    Object.entries(categoryIssues).forEach(([category, issues]) => {
        const score = (issues.lowStock + issues.expiringSoon) / issues.total;
        if (score > worstScore) {
            worstScore = score;
            worstCategory = category;
        }
    });

    return worstCategory || 'None';
}

function showError(message) {
    // You can implement your own error display logic here
    console.error(message);
} 