// Initialize orders data in localStorage if not exists
if (!localStorage.getItem('orders')) {
    localStorage.setItem('orders', JSON.stringify({
        pending: [],
        completed: []
    }));
}

// DOM Elements
const addOrderBtn = document.getElementById('add-order-btn');
const addOrderModal = document.getElementById('add-order-modal');
const addOrderForm = document.getElementById('add-order-form');
const closeBtn = addOrderModal.querySelector('.close');
const viewPendingBtn = document.getElementById('view-pending');
const viewCompletedBtn = document.getElementById('view-completed');
const pendingOrdersSection = document.getElementById('pending-orders-section');
const completedOrdersSection = document.getElementById('completed-orders-section');
const editOrderModal = document.getElementById('edit-order-modal');
const editOrderForm = document.getElementById('edit-order-form');
const editCloseBtn = editOrderModal.querySelector('.close');

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    updateOrdersDisplay();
    updateOverviewCards();
});

addOrderBtn.addEventListener('click', () => {
    addOrderModal.style.display = 'block';
    // Set minimum date as today for delivery date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('delivery-date').min = today;
});

closeBtn.addEventListener('click', () => {
    addOrderModal.style.display = 'none';
    addOrderForm.reset();
});

addOrderForm.addEventListener('submit', (e) => {
    e.preventDefault();
    addNewOrder();
});

viewPendingBtn.addEventListener('click', () => {
    viewPendingBtn.classList.add('active');
    viewCompletedBtn.classList.remove('active');
    pendingOrdersSection.style.display = 'block';
    completedOrdersSection.style.display = 'none';
});

viewCompletedBtn.addEventListener('click', () => {
    viewCompletedBtn.classList.add('active');
    viewPendingBtn.classList.remove('active');
    completedOrdersSection.style.display = 'block';
    pendingOrdersSection.style.display = 'none';
});

editCloseBtn.addEventListener('click', () => {
    editOrderModal.style.display = 'none';
    editOrderForm.reset();
});

editOrderForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveOrderChanges();
});

// Functions
function addNewOrder() {
    const formData = new FormData(addOrderForm);
    const order = {
        id: generateOrderId(),
        name: formData.get('name'),
        category: formData.get('category'),
        quantity: parseInt(formData.get('quantity')),
        unit: formData.get('unit'),
        price: parseFloat(formData.get('price')),
        deliveryDate: formData.get('deliveryDate'),
        supplier: formData.get('supplier'),
        notes: formData.get('notes'),
        status: 'Pending',
        orderDate: new Date().toISOString(),
        completionDate: null
    };

    const orders = JSON.parse(localStorage.getItem('orders'));
    orders.pending.push(order);
    localStorage.setItem('orders', JSON.stringify(orders));

    addOrderModal.style.display = 'none';
    addOrderForm.reset();
    updateOrdersDisplay();
    updateOverviewCards();
    showNotification('Order added successfully!', 'success');
}

function updateOrdersDisplay() {
    const orders = JSON.parse(localStorage.getItem('orders'));
    
    // Update Pending Orders Table
    const pendingTableBody = document.getElementById('pending-orders-table');
    pendingTableBody.innerHTML = '';
    
    orders.pending.forEach(order => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${order.name}</td>
            <td>${order.category}</td>
            <td>${order.quantity} ${order.unit}</td>
            <td>${formatCurrency(order.price)}</td>
            <td>${formatDate(order.deliveryDate)}</td>
            <td>${order.supplier}</td>
            <td><span class="status-badge ${getStatusClass(order.status)}">${order.status}</span></td>
            <td>
                <div class="action-buttons-container">
                    <button onclick="editOrder('${order.id}', 'pending')" class="action-btn edit-btn">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="completeOrder('${order.id}')" class="action-btn complete-btn">
                        <i class="fas fa-check"></i>
                    </button>
                    <button onclick="removeOrder('${order.id}', 'pending')" class="action-btn delete-btn">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        pendingTableBody.appendChild(row);
    });

    // Update Completed Orders Table
    const completedTableBody = document.getElementById('completed-orders-table');
    completedTableBody.innerHTML = '';
    
    orders.completed.forEach(order => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${order.name}</td>
            <td>${order.category}</td>
            <td>${order.quantity} ${order.unit}</td>
            <td>${formatCurrency(order.price)}</td>
            <td>${formatDate(order.deliveryDate)}</td>
            <td>${order.supplier}</td>
            <td>${formatDate(order.completionDate)}</td>
            <td>
                <div class="action-buttons-container">
                    <button onclick="editOrder('${order.id}', 'completed')" class="action-btn edit-btn">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="removeOrder('${order.id}', 'completed')" class="action-btn delete-btn">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        completedTableBody.appendChild(row);
    });
}

function updateOverviewCards() {
    const orders = JSON.parse(localStorage.getItem('orders'));
    
    // Update total orders count
    const totalOrders = orders.pending.length + orders.completed.length;
    document.getElementById('total-orders-count').textContent = totalOrders;
    
    // Update pending orders count
    document.getElementById('pending-orders-count').textContent = orders.pending.length;
    
    // Update scheduled orders (orders with future delivery date)
    const today = new Date();
    const scheduledOrders = orders.pending.filter(order => 
        new Date(order.deliveryDate) > today
    ).length;
    document.getElementById('scheduled-orders-count').textContent = scheduledOrders;
    
    // Calculate total money spent (sum of all orders)
    const totalSpent = [...orders.pending, ...orders.completed]
        .reduce((sum, order) => sum + order.price, 0);
    document.getElementById('total-spent').textContent = formatCurrency(totalSpent);
}

function completeOrder(orderId) {
    const orders = JSON.parse(localStorage.getItem('orders'));
    const orderIndex = orders.pending.findIndex(order => order.id === orderId);
    
    if (orderIndex !== -1) {
        const completedOrder = orders.pending[orderIndex];
        completedOrder.status = 'Completed';
        completedOrder.completionDate = new Date().toISOString();
        
        orders.completed.push(completedOrder);
        orders.pending.splice(orderIndex, 1);
        
        localStorage.setItem('orders', JSON.stringify(orders));
        updateOrdersDisplay();
        updateOverviewCards();
        showNotification('Order marked as completed!', 'success');
    }
}

function editOrder(orderId, type) {
    const orders = JSON.parse(localStorage.getItem('orders'));
    const order = orders[type].find(order => order.id === orderId);
    
    if (order) {
        // Populate the edit form
        document.getElementById('edit-order-id').value = order.id;
        document.getElementById('edit-name').value = order.name;
        document.getElementById('edit-category').value = order.category;
        document.getElementById('edit-quantity').value = order.quantity;
        document.getElementById('edit-unit').value = order.unit;
        document.getElementById('edit-price').value = order.price;
        document.getElementById('edit-delivery-date').value = order.deliveryDate;
        document.getElementById('edit-supplier').value = order.supplier;
        document.getElementById('edit-notes').value = order.notes || '';
        
        // Show the edit modal
        editOrderModal.style.display = 'block';
    }
}

function saveOrderChanges() {
    const formData = new FormData(editOrderForm);
    const orderId = formData.get('orderId');
    const orders = JSON.parse(localStorage.getItem('orders'));
    
    // Find the order in either pending or completed arrays
    let orderType = 'pending';
    let orderIndex = orders.pending.findIndex(order => order.id === orderId);
    
    if (orderIndex === -1) {
        orderType = 'completed';
        orderIndex = orders.completed.findIndex(order => order.id === orderId);
    }
    
    if (orderIndex !== -1) {
        // Update the order with new values
        const updatedOrder = {
            ...orders[orderType][orderIndex],
            name: formData.get('name'),
            category: formData.get('category'),
            quantity: parseInt(formData.get('quantity')),
            unit: formData.get('unit'),
            price: parseFloat(formData.get('price')),
            deliveryDate: formData.get('deliveryDate'),
            supplier: formData.get('supplier'),
            notes: formData.get('notes')
        };
        
        orders[orderType][orderIndex] = updatedOrder;
        localStorage.setItem('orders', JSON.stringify(orders));
        
        editOrderModal.style.display = 'none';
        editOrderForm.reset();
        updateOrdersDisplay();
        updateOverviewCards();
        showNotification('Order updated successfully!', 'success');
    }
}

function removeOrder(orderId, type) {
    if (confirm('Are you sure you want to remove this order?')) {
        const orders = JSON.parse(localStorage.getItem('orders'));
        const orderIndex = orders[type].findIndex(order => order.id === orderId);
        
        if (orderIndex !== -1) {
            orders[type].splice(orderIndex, 1);
            localStorage.setItem('orders', JSON.stringify(orders));
            updateOrdersDisplay();
            updateOverviewCards();
            showNotification('Order removed successfully!', 'success');
        }
    }
}

// Utility Functions
function generateOrderId() {
    return 'order-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function getStatusClass(status) {
    switch (status.toLowerCase()) {
        case 'pending':
            return 'status-warning';
        case 'completed':
            return 'status-good';
        default:
            return '';
    }
}

function showNotification(message, type = 'info') {
    // You can implement a notification system here
    alert(message);
}

// Add CSS styles for the action buttons
const style = document.createElement('style');
style.textContent = `
    .action-buttons-container {
        display: flex;
        gap: 0.5rem;
    }

    .action-btn {
        padding: 0.5rem;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .edit-btn {
        background: var(--accent-primary);
        color: white;
    }

    .edit-btn:hover {
        background: var(--accent-secondary);
        transform: translateY(-2px);
        box-shadow: 0 0 15px rgba(78, 205, 196, 0.3);
    }

    .delete-btn {
        background: #FF6B6B;
        color: white;
    }

    .delete-btn:hover {
        background: #FF8787;
        transform: translateY(-2px);
        box-shadow: 0 0 15px rgba(255, 107, 107, 0.3);
    }
`;
document.head.appendChild(style); 