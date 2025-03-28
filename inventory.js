// RestroTrack - Inventory Management JavaScript

// DOM Elements
const inventoryTableBody = document.getElementById('inventory-table-body');
const addItemBtn = document.getElementById('add-item-btn');
const addItemModal = document.getElementById('add-item-modal');
const addItemForm = document.getElementById('add-item-form');
const categoryFilter = document.getElementById('category-filter');
const stockFilter = document.getElementById('stock-filter');
const expiryFilter = document.getElementById('expiry-filter');
const inventorySearch = document.getElementById('inventory-search');

// State Management
let inventoryItems = [];
let currentPage = 1;
const itemsPerPage = 10;
let filteredItems = [];

// Initialize inventory page
async function initializeInventory() {
    try {
        // Load items from localStorage
        const storedItems = localStorage.getItem('inventoryItems');
        inventoryItems = storedItems ? JSON.parse(storedItems) : [];
        filteredItems = [...inventoryItems];
        updateInventoryTable();
        updatePagination();
    } catch (error) {
        console.error('Error initializing inventory:', error);
        restroTrack.showNotification('Failed to load inventory items', 'error');
    }
}

// Format currency in Indian Rupees
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

// Update inventory table
function updateInventoryTable() {
    const tableBody = document.getElementById('inventory-table-body');
    const noItemsMessage = document.getElementById('no-items-message');
    
    if (!tableBody || !noItemsMessage) return;

    tableBody.innerHTML = '';

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const itemsToShow = filteredItems.slice(start, end);

    if (itemsToShow.length === 0) {
        noItemsMessage.style.display = 'block';
        return;
    }

    noItemsMessage.style.display = 'none';

    itemsToShow.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.category}</td>
            <td>${item.quantity} ${item.unit}</td>
            <td>${item.unit}</td>
            <td>
                <span class="stock-status ${getStockStatusClass(item.quantity)}">
                    ${getStockStatusLabel(item.quantity)}
                </span>
            </td>
            <td>
                <span class="expiry-status ${getExpiryStatusClass(item.expiryDate)}">
                    ${formatDate(item.expiryDate)}
                </span>
            </td>
            <td>${formatCurrency(item.price)}</td>
            <td>
                <div class="action-buttons">
                    <button class="edit-btn" data-id="${item.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn" data-id="${item.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;

        // Add event listeners for edit and delete buttons
        const editBtn = row.querySelector('.edit-btn');
        const deleteBtn = row.querySelector('.delete-btn');

        editBtn.addEventListener('click', () => editItem(item));
        deleteBtn.addEventListener('click', () => deleteItem(item.id));

        tableBody.appendChild(row);
    });
}

// Get stock status
function getStockStatus(quantity, threshold) {
    if (quantity <= threshold * 0.25) {
        return { label: 'Critical', class: 'status-critical' };
    } else if (quantity <= threshold * 0.5) {
        return { label: 'Low', class: 'status-warning' };
    } else {
        return { label: 'Good', class: 'status-success' };
    }
}

// Get expiry status class
function getExpiryStatusClass(daysLeft) {
    if (daysLeft <= 2) {
        return 'status-critical';
    } else if (daysLeft <= 4) {
        return 'status-warning';
    } else if (daysLeft <= 7) {
        return 'status-upcoming';
    }
    return '';
}

// Add new item
async function addItem(formData) {
    try {
        // Create an object from form data
        const itemData = {
            id: Date.now().toString(),
            name: formData.get('name'),
            category: formData.get('category'),
            quantity: formData.get('quantity') || 0,
            unit: formData.get('unit') || 'pieces',
            price: formData.get('price') || 0,
            expiryDate: formData.get('expiryDate') || '',
            notes: formData.get('notes') || '',
            createdAt: new Date().toISOString()
        };

        // Add the item to the inventory
        inventoryItems.push(itemData);
        
        // Update the filtered items
        filteredItems = [...inventoryItems];
        
        // Save to localStorage
        localStorage.setItem('inventoryItems', JSON.stringify(inventoryItems));
        
        // Update the table display
        updateInventoryTable();
        updatePagination();
        
        // Show success message
        restroTrack.showNotification('Item added successfully', 'success');
        
        // Close the modal and reset form
        const modal = document.getElementById('add-item-modal');
        closeModal(modal);
        
        return true;
    } catch (error) {
        console.error('Error adding item:', error);
        restroTrack.showNotification('Failed to add item', 'error');
        return false;
    }
}

// Edit item
async function editItem(item) {
    // Populate edit form with item data
    const editForm = document.getElementById('edit-item-form');
    for (const [key, value] of Object.entries(item)) {
        const input = editForm.querySelector(`[name="${key}"]`);
        if (input) {
            input.value = value;
        }
    }

    // Show edit modal
    const editModal = document.getElementById('edit-item-modal');
    editModal.style.display = 'flex';
}

// Update item
async function updateItem(formData) {
    try {
        const itemId = formData.get('id');
        const itemData = {
            id: itemId,
            name: formData.get('name'),
            category: formData.get('category'),
            quantity: formData.get('quantity') || 0,
            unit: formData.get('unit') || 'pieces',
            price: formData.get('price') || 0,
            expiryDate: formData.get('expiryDate') || '',
            notes: formData.get('notes') || '',
            updatedAt: new Date().toISOString()
        };

        // Update item in the array
        const index = inventoryItems.findIndex(item => item.id === itemId);
        if (index !== -1) {
            inventoryItems[index] = { ...inventoryItems[index], ...itemData };
            filteredItems = [...inventoryItems];
            
            // Save to localStorage
            localStorage.setItem('inventoryItems', JSON.stringify(inventoryItems));
            
            // Update the display
            updateInventoryTable();
            updatePagination();
            
            // Show success message and close modal
            restroTrack.showNotification('Item updated successfully', 'success');
            closeModal(document.getElementById('edit-item-modal'));
        }
    } catch (error) {
        console.error('Error updating item:', error);
        restroTrack.showNotification('Failed to update item', 'error');
    }
}

// Delete item
async function deleteItem(itemId) {
    if (!confirm('Are you sure you want to delete this item?')) {
        return;
    }

    try {
        await restroTrack.apiRequest(`/api/inventory/${itemId}`, {
            method: 'DELETE'
        });

        inventoryItems = inventoryItems.filter(item => item.id !== itemId);
        filteredItems = [...inventoryItems];
        updateInventoryTable();
        restroTrack.showNotification('Item deleted successfully', 'success');
    } catch (error) {
        restroTrack.showNotification('Failed to delete item', 'error');
    }
}

// Filter inventory items
function filterItems() {
    const searchTerm = inventorySearch.value.toLowerCase();
    const category = categoryFilter.value;
    const stockLevel = stockFilter.value;
    const expiryStatus = expiryFilter.value;

    filteredItems = inventoryItems.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm) ||
                            item.category.toLowerCase().includes(searchTerm);
        const matchesCategory = category === 'all' || item.category === category;
        const matchesStock = stockLevel === 'all' || getStockStatus(item.quantity, item.threshold).label.toLowerCase() === stockLevel;
        const daysLeft = restroTrack.calculateDaysLeft(item.expiryDate);
        const matchesExpiry = expiryStatus === 'all' ||
                            (expiryStatus === 'critical' && daysLeft <= 2) ||
                            (expiryStatus === 'warning' && daysLeft <= 4) ||
                            (expiryStatus === 'upcoming' && daysLeft <= 7);

        return matchesSearch && matchesCategory && matchesStock && matchesExpiry;
    });

    currentPage = 1;
    updateInventoryTable();
    updatePagination();
}

// Update pagination
function updatePagination() {
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const pageNumbers = document.getElementById('page-numbers');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');

    pageNumbers.innerHTML = `<span class="current-page">${currentPage}</span> / ${totalPages}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    initializeInventory();

    // Add item form submission
    const addItemForm = document.getElementById('add-item-form');
    if (addItemForm) {
        addItemForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            await addItem(formData);
        });
    }

    // Edit item form submission
    const editItemForm = document.getElementById('edit-item-form');
    if (editItemForm) {
        editItemForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            await updateItem(formData);
        });
    }

    // Add item button
    const addItemBtn = document.getElementById('add-item-btn');
    if (addItemBtn) {
        addItemBtn.addEventListener('click', () => {
            const modal = document.getElementById('add-item-modal');
            if (modal) {
                modal.style.display = 'flex';
            }
        });
    }

    // Close modal buttons
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) {
                closeModal(modal);
            }
        });
    });

    // Filters
    inventorySearch?.addEventListener('input', filterItems);
    categoryFilter?.addEventListener('change', filterItems);
    stockFilter?.addEventListener('change', filterItems);
    expiryFilter?.addEventListener('change', filterItems);

    // Pagination
    document.getElementById('prev-page')?.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            updateInventoryTable();
            updatePagination();
        }
    });

    document.getElementById('next-page')?.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            updateInventoryTable();
            updatePagination();
        }
    });
});

// Close modal
function closeModal(modal) {
    modal.style.display = 'none';
    const form = modal.querySelector('form');
    if (form) {
        form.reset();
    }
}

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        closeModal(e.target);
    }
});

// Helper functions
function getStockStatusClass(quantity) {
    if (quantity <= 0) return 'status-critical';
    if (quantity <= 10) return 'status-warning';
    return 'status-success';
}

function getStockStatusLabel(quantity) {
    if (quantity <= 0) return 'Out of Stock';
    if (quantity <= 10) return 'Low Stock';
    return 'In Stock';
}

function formatDate(dateString) {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function getExpiryStatusClass(dateString) {
    if (!dateString) return '';
    const today = new Date();
    const expiryDate = new Date(dateString);
    const daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

    if (daysLeft <= 0) return 'status-critical';
    if (daysLeft <= 7) return 'status-warning';
    return '';
} 