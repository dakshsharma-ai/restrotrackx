// RestroTrack - Main JavaScript File

// DOM Elements
const sidebar = document.querySelector('.sidebar');
const mainContent = document.querySelector('.main-content');
const aiAssistantButton = document.querySelector('.ai-assistant-button');
const aiAssistantPanel = document.querySelector('.ai-assistant-panel');
const closeAssistantButton = document.querySelector('.close-assistant');
const aiInputField = document.getElementById('ai-input-field');
const aiSendButton = document.getElementById('ai-send-button');
const aiMessages = document.getElementById('ai-messages');

// Theme Management
const theme = {
    init() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.body.setAttribute('data-theme', savedTheme);
    },

    toggle() {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }
};

// Mobile Navigation
function toggleSidebar() {
    sidebar.classList.toggle('active');
}

// AI Assistant Panel
function toggleAIAssistant() {
    aiAssistantPanel.style.display = aiAssistantPanel.style.display === 'none' ? 'block' : 'none';
}

function closeAIAssistant() {
    aiAssistantPanel.style.display = 'none';
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Format date
function formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }).format(new Date(date));
}

// Calculate days between dates
function calculateDaysLeft(targetDate) {
    const today = new Date();
    const target = new Date(targetDate);
    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

// Format relative time
function formatRelativeTime(date) {
    const now = new Date();
    const then = new Date(date);
    const diffSeconds = Math.floor((now - then) / 1000);

    if (diffSeconds < 60) {
        return 'just now';
    } else if (diffSeconds < 3600) {
        const minutes = Math.floor(diffSeconds / 60);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffSeconds < 86400) {
        const hours = Math.floor(diffSeconds / 3600);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
        return formatDate(date);
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Handle API Requests
async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(endpoint, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('API Request Error:', error);
        showNotification(error.message, 'error');
        throw error;
    }
}

// Data Storage Utilities
const storage = {
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('Storage Error:', e);
        }
    },

    get(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.error('Storage Error:', e);
            return null;
        }
    },

    remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error('Storage Error:', e);
        }
    }
};

// Form Validation
function validateForm(formData, rules) {
    const errors = {};

    for (const [field, value] of formData.entries()) {
        if (rules[field]) {
            if (rules[field].required && !value) {
                errors[field] = `${field} is required`;
            }
            if (rules[field].min && value < rules[field].min) {
                errors[field] = `${field} must be at least ${rules[field].min}`;
            }
            if (rules[field].max && value > rules[field].max) {
                errors[field] = `${field} must be less than ${rules[field].max}`;
            }
            if (rules[field].pattern && !rules[field].pattern.test(value)) {
                errors[field] = `${field} format is invalid`;
            }
        }
    }

    return Object.keys(errors).length === 0 ? null : errors;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme
    theme.init();

    // Mobile navigation toggle
    const mobileMenuButton = document.createElement('button');
    mobileMenuButton.className = 'mobile-menu-button';
    mobileMenuButton.innerHTML = '<i class="fas fa-bars"></i>';
    mainContent.insertBefore(mobileMenuButton, mainContent.firstChild);
    mobileMenuButton.addEventListener('click', toggleSidebar);

    // AI Assistant
    aiAssistantButton?.addEventListener('click', toggleAIAssistant);
    closeAssistantButton?.addEventListener('click', closeAIAssistant);

    // Handle AI Assistant Input
    aiSendButton?.addEventListener('click', () => {
        const message = aiInputField.value.trim();
        if (message) {
            // Add user message to chat
            addMessageToChat('user', message);
            // Clear input field
            aiInputField.value = '';
            // TODO: Send message to AI backend
            // For now, simulate response
            setTimeout(() => {
                addMessageToChat('ai', 'I received your message: ' + message);
            }, 1000);
        }
    });

    // Handle Enter key in AI Assistant Input
    aiInputField?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            aiSendButton.click();
        }
    });
});

// Add message to AI chat
function addMessageToChat(type, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    const avatar = document.createElement('div');
    avatar.className = type === 'ai' ? 'ai-avatar' : 'user-avatar';
    
    if (type === 'ai') {
        avatar.innerHTML = '<i class="fas fa-robot"></i>';
    } else {
        avatar.innerHTML = '<img src="images/user.png" alt="User">';
    }
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.innerHTML = `<p>${content}</p>`;
    
    if (type === 'ai') {
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
    } else {
        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(avatar);
    }
    
    aiMessages.appendChild(messageDiv);
    aiMessages.scrollTop = aiMessages.scrollHeight;
}

// Export utilities for use in other files
window.restroTrack = {
    formatCurrency,
    formatDate,
    formatRelativeTime,
    calculateDaysLeft,
    showNotification,
    apiRequest,
    storage,
    validateForm,
    theme
}; 