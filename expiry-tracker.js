// DOM Elements
const criticalCount = document.getElementById('critical-count');
const warningCount = document.getElementById('warning-count');
const upcomingCount = document.getElementById('upcoming-count');
const expiringItemsTable = document.getElementById('expiring-items-table');

// Filter buttons
const showCriticalBtn = document.getElementById('show-critical');
const showWarningBtn = document.getElementById('show-warning');
const showUpcomingBtn = document.getElementById('show-upcoming');
const showAllBtn = document.getElementById('show-all');

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    updateExpiryTracker();
    setupFilterButtons();
});

function setupFilterButtons() {
    const buttons = [showCriticalBtn, showWarningBtn, showUpcomingBtn, showAllBtn];
    
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            buttons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            button.classList.add('active');
            // Update table with filtered items
            updateExpiryTable(button.id.replace('show-', ''));
        });
    });
}

function updateExpiryTracker() {
    const inventory = JSON.parse(localStorage.getItem('inventoryItems') || '[]');
    const today = new Date();
    
    // Initialize counters
    let critical = 0;
    let warning = 0;
    let upcoming = 0;
    
    // Process each inventory item
    inventory.forEach(item => {
        if (item.expiryDate) {
            const daysUntilExpiry = calculateDaysUntilExpiry(item.expiryDate);
            
            if (daysUntilExpiry <= 2) {
                critical++;
            } else if (daysUntilExpiry <= 4) {
                warning++;
            } else if (daysUntilExpiry <= 7) {
                upcoming++;
            }
        }
    });
    
    // Update the count displays with animation
    animateCount(criticalCount, critical);
    animateCount(warningCount, warning);
    animateCount(upcomingCount, upcoming);
    
    // Initially show critical items
    updateExpiryTable('critical');
}

function updateExpiryTable(filter = 'critical') {
    const inventory = JSON.parse(localStorage.getItem('inventoryItems') || '[]');
    expiringItemsTable.innerHTML = '';
    
    // Filter and sort items by expiry date
    const expiringItems = inventory
        .filter(item => item.expiryDate)
        .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
    
    expiringItems.forEach(item => {
        const daysUntilExpiry = calculateDaysUntilExpiry(item.expiryDate);
        let status = '';
        
        if (daysUntilExpiry <= 2) {
            status = 'critical';
        } else if (daysUntilExpiry <= 4) {
            status = 'warning';
        } else if (daysUntilExpiry <= 7) {
            status = 'upcoming';
        } else {
            return; // Skip items not expiring soon
        }
        
        // Apply filter
        if (filter === 'all' || filter === status) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${item.category}</td>
                <td>${item.quantity} ${item.unit}</td>
                <td>${formatDate(item.expiryDate)}</td>
                <td>${daysUntilExpiry} days</td>
                <td><span class="status-badge status-${status}">${capitalizeFirst(status)}</span></td>
                <td>
                    <div class="action-buttons">
                        <button onclick="viewItemDetails('${item.id}')" class="neon-button" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="markAsUsed('${item.id}')" class="neon-button" title="Mark as Used">
                            <i class="fas fa-check"></i>
                        </button>
                    </div>
                </td>
            `;
            expiringItemsTable.appendChild(row);
        }
    });
    
    // Show message if no items found
    if (expiringItemsTable.children.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="7" class="empty-message">
                No ${filter === 'all' ? 'expiring' : filter} items found
            </td>
        `;
        expiringItemsTable.appendChild(emptyRow);
    }
}

function calculateDaysUntilExpiry(expiryDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time part for accurate day calculation
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

function animateCount(element, target) {
    const duration = 1000;
    const start = parseInt(element.textContent) || 0;
    const increment = (target - start) / (duration / 16);
    let current = start;
    
    const animate = () => {
        current += increment;
        element.textContent = Math.round(current);
        
        if ((increment > 0 && current < target) || 
            (increment < 0 && current > target)) {
            requestAnimationFrame(animate);
        } else {
            element.textContent = target;
        }
    };
    
    requestAnimationFrame(animate);
}

function formatDate(dateString) {
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('en-IN', options);
}

function capitalizeFirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function viewItemDetails(itemId) {
    window.location.href = `inventory.html?item=${itemId}`;
}

function markAsUsed(itemId) {
    const inventory = JSON.parse(localStorage.getItem('inventoryItems') || '[]');
    const itemIndex = inventory.findIndex(item => item.id === itemId);
    
    if (itemIndex !== -1) {
        if (confirm('Mark this item as used and remove from inventory?')) {
            inventory.splice(itemIndex, 1);
            localStorage.setItem('inventoryItems', JSON.stringify(inventory));
            updateExpiryTracker();
            showNotification('Item marked as used and removed from inventory', 'success');
        }
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 100);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add notification styles
const style = document.createElement('style');
style.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        right: -300px;
        background: var(--card-bg);
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        display: flex;
        align-items: center;
        gap: 0.75rem;
        transition: transform 0.3s ease;
        z-index: 1000;
    }
    
    .notification.success {
        border-left: 4px solid #4ECDC4;
    }
    
    .notification.info {
        border-left: 4px solid #3498db;
    }
    
    .notification.show {
        transform: translateX(-320px);
    }
    
    .empty-message {
        text-align: center;
        padding: 2rem;
        color: var(--text-secondary);
    }
    
    .action-buttons {
        display: flex;
        gap: 0.5rem;
    }
    
    .action-buttons .neon-button {
        padding: 0.5rem;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
`;
document.head.appendChild(style); 