document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const chatMessages = document.getElementById('ai-chat-messages');
    const userInput = document.getElementById('ai-input-field');
    const sendButton = document.getElementById('ai-send-button');
    const voiceButton = document.getElementById('voice-input-btn');
    const clearChatButton = document.getElementById('clear-chat-btn');
    const exportChatButton = document.getElementById('export-chat-btn');
    const newChatButton = document.getElementById('new-conversation-btn');
    const chatHistory = document.getElementById('chat-history');

    // Initialize Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';

    let isListening = false;

    // Chat History Management
    let currentChatId = localStorage.getItem('lastChatId') || Date.now().toString();
    let chats = JSON.parse(localStorage.getItem('chatHistory')) || {};
    
    // Load last chat or create new one
    function initializeChat() {
        if (currentChatId && chats[currentChatId]) {
            loadChat(currentChatId);
        } else {
            newChat();
        }
        updateChatHistorySidebar();
    }

    function updateChatHistorySidebar() {
        chatHistory.innerHTML = '';
        Object.values(chats)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .forEach(chat => {
                const chatItem = document.createElement('div');
                chatItem.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`;
                chatItem.innerHTML = `
                    <div class="chat-item-icon">
                        <i class="fas fa-comment"></i>
                    </div>
                    <div class="chat-item-content">
                        <h3>${chat.title || 'New Chat'}</h3>
                        <p>${formatDate(chat.timestamp)}</p>
                    </div>
                `;
                chatItem.addEventListener('click', () => loadChat(chat.id));
                chatHistory.appendChild(chatItem);
            });
    }

    function loadChat(chatId) {
        currentChatId = chatId;
        localStorage.setItem('lastChatId', chatId);
        chatMessages.innerHTML = '';
        if (chats[chatId] && chats[chatId].messages) {
            chats[chatId].messages.forEach(msg => {
                addMessageToUI(msg.content, msg.isUser, false);
            });
        }
        updateChatHistorySidebar();
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function newChat() {
        currentChatId = Date.now().toString();
        chats[currentChatId] = {
            id: currentChatId,
            title: 'New Chat',
            timestamp: new Date().toISOString(),
            messages: []
        };
        saveChats();
        loadChat(currentChatId);
        addMessageToUI("Hello! I'm your RestroTrack AI Assistant. I can help you with inventory, orders, expiry tracking, and analytics. What would you like to know?", false);
    }

    function saveChats() {
        localStorage.setItem('chatHistory', JSON.stringify(chats));
        localStorage.setItem('lastChatId', currentChatId);
    }

    // Helper Functions
    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        
        return date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    // Data Access Functions
    function getInventoryData() {
        const data = JSON.parse(localStorage.getItem('inventoryItems')) || [];
        console.log('Fetched inventory data:', data);
        return data;
    }

    function getOrdersData() {
        try {
            const orders = JSON.parse(localStorage.getItem('orders')) || { pending: [], completed: [] };
            
            // Ensure proper data structure and validate order entries
            const validatedOrders = {
                pending: (orders.pending || []).filter(order => order && order.name && order.price),
                completed: (orders.completed || []).filter(order => order && order.name && order.price),
            };

            // Add computed properties for quick access
            validatedOrders.all = [...validatedOrders.pending, ...validatedOrders.completed];
            validatedOrders.pendingValue = calculateOrdersValue(validatedOrders.pending);
            validatedOrders.completedValue = calculateOrdersValue(validatedOrders.completed);
            validatedOrders.totalValue = validatedOrders.pendingValue + validatedOrders.completedValue;

            console.log('Fetched and validated orders data:', validatedOrders);
            return validatedOrders;
        } catch (error) {
            console.error('Error fetching orders data:', error);
            return { pending: [], completed: [], all: [], pendingValue: 0, completedValue: 0, totalValue: 0 };
        }
    }

    // Calculate inventory value correctly
    function calculateInventoryValue(inventory) {
        const total = inventory.reduce((sum, item) => {
            const price = parseFloat(item.price) || 0;
            return sum + price;
        }, 0);
        console.log('Calculated inventory value:', total);
        return total;
    }

    // Calculate order value
    function calculateOrdersValue(orders) {
        try {
            if (!Array.isArray(orders)) {
                console.error('Invalid orders data:', orders);
                return 0;
            }

            const total = orders.reduce((sum, order) => {
                if (!order || typeof order !== 'object') {
                    console.warn('Invalid order entry:', order);
                    return sum;
                }

                // Ensure we're working with valid numbers
                const price = typeof order.price === 'string' ? 
                    parseFloat(order.price.replace(/[^0-9.-]+/g, '')) : 
                    parseFloat(order.price) || 0;

                // Don't multiply by quantity - just sum the prices
                return sum + price;
            }, 0);

            console.log('Calculated orders value:', total, 'from orders:', orders);
            return total;
        } catch (error) {
            console.error('Error calculating orders value:', error);
            return 0;
        }
    }

    // Improved item search with partial matching
    function findItemInAllData(query) {
        const inventory = getInventoryData();
        const orders = getOrdersData();
        const itemName = extractItemName(query);
        
        console.log('Searching for item:', itemName);
        
        if (!itemName || itemName.length < 2) {
            console.log('Item name too short or empty');
            return null;
        }

        // Try exact match in inventory first
        let inventoryItem = inventory.find(item => 
            item.name && item.name.toLowerCase() === itemName.toLowerCase()
        );
        
        // If no exact match, try partial match
        if (!inventoryItem) {
            inventoryItem = inventory.find(item => 
                item.name && item.name.toLowerCase().includes(itemName.toLowerCase())
            );
        }
        
        // If still no match, try word by word matching
        if (!inventoryItem && itemName.includes(' ')) {
            const words = itemName.toLowerCase().split(/\s+/);
            inventoryItem = inventory.find(item => {
                if (!item.name) return false;
                const itemNameLower = item.name.toLowerCase();
                return words.some(word => itemNameLower.includes(word));
            });
        }
        
        if (inventoryItem) {
            console.log('Found in inventory:', inventoryItem);
            return { item: inventoryItem, source: 'inventory' };
        }

        // Then check orders with similar matching logic
        // First try exact matches
        const pendingOrderItem = orders.pending.find(order => 
            order.name && order.name.toLowerCase() === itemName.toLowerCase()
        );
        if (pendingOrderItem) {
            console.log('Found in pending orders:', pendingOrderItem);
            return { item: pendingOrderItem, source: 'pending orders' };
        }
        
        // Try partial matches in pending orders
        const pendingOrderPartial = orders.pending.find(order => 
            order.name && order.name.toLowerCase().includes(itemName.toLowerCase())
        );
        if (pendingOrderPartial) {
            console.log('Found in pending orders (partial match):', pendingOrderPartial);
            return { item: pendingOrderPartial, source: 'pending orders' };
        }
        
        // Then exact matches in completed orders
        const completedOrderItem = orders.completed.find(order => 
            order.name && order.name.toLowerCase() === itemName.toLowerCase()
        );
        if (completedOrderItem) {
            console.log('Found in completed orders:', completedOrderItem);
            return { item: completedOrderItem, source: 'completed orders' };
        }
        
        // Partial matches in completed orders
        const completedOrderPartial = orders.completed.find(order => 
            order.name && order.name.toLowerCase().includes(itemName.toLowerCase())
        );
        if (completedOrderPartial) {
            console.log('Found in completed orders (partial match):', completedOrderPartial);
            return { item: completedOrderPartial, source: 'completed orders' };
        }

        console.log('Item not found:', itemName);
        return null;
    }

    function extractItemName(query) {
        // More comprehensive filtering of common words
        const commonWords = [
            'what', 'is', 'the', 'of', 'for', 'in', 'how', 'many', 'much', 'stock', 
            'price', 'supplier', 'who', 'supplies', 'supplied', 'by', 'value', 
            'tell', 'me', 'about', 'details', 'info', 'information', 'and', 'a', 'an',
            'do', 'we', 'have', 'left', 'remaining', 'current', 'currently', 'now',
            'available', 'quantity', 'pieces', 'units', 'on', 'hand', 'i', 'want',
            'to', 'know', 'number', 'count', 'total', 'all', 'what\'s', 'whats'
        ];
        
        // Check for specific question patterns first
        // Price pattern
        const pricePattern = /(?:what's|what is|whats) (?:the )?price of (.*?)(?:\?|$)/i;
        const priceMatch = query.match(pricePattern);
        if (priceMatch && priceMatch[1]) {
            console.log('Matched price pattern with:', priceMatch[1]);
            return priceMatch[1].trim();
        }
        
        // Quantity pattern
        const quantityMatch = query.match(/how many (.*?) do we have/i);
        if (quantityMatch && quantityMatch[1]) {
            console.log('Matched quantity pattern with:', quantityMatch[1]);
            return quantityMatch[1].trim();
        }
        
        // Stock pattern
        const stockMatch = query.match(/(?:stock|inventory) of (.*?)(?:\?|$)/i);
        if (stockMatch && stockMatch[1]) {
            console.log('Matched stock pattern with:', stockMatch[1]);
            return stockMatch[1].trim();
        }
        
        // Extract relevant words from the query as fallback
        const words = query.toLowerCase()
            .split(/\s+/)
            .filter(word => !commonWords.includes(word) && word.length > 1);
        
        // Join remaining words
        const result = words.join(' ').trim();
        console.log('Extracted item name using word filtering:', result);
        return result;
    }

    // Updated process message to handle "How many X do we have?" questions better
    async function processUserMessage(message) {
        console.log('Processing message:', message);
        const lowerMessage = message.toLowerCase();
        const inventory = getInventoryData();
        const orders = getOrdersData();

        try {
            // Category breakdown and analysis - check this first for specific queries
            if (lowerMessage.includes('inventory value by category') || 
                lowerMessage.includes('category breakdown') || 
                lowerMessage.includes('value by category') ||
                lowerMessage.match(/show .* category/i) && lowerMessage.includes('value')) {
                
                console.log('Processing category breakdown query');
                const categoryValues = {};
                let totalValue = 0;
                
                // Calculate values by category
                inventory.forEach(item => {
                    const category = item.category || 'Uncategorized';
                    const price = typeof item.price === 'string' ? 
                        parseFloat(item.price.replace(/[^0-9.-]+/g, '')) : 
                        parseFloat(item.price) || 0;
                    
                    if (!categoryValues[category]) {
                        categoryValues[category] = {
                            value: 0,
                            itemCount: 0,
                            items: []
                        };
                    }
                    
                    categoryValues[category].value += price;
                    categoryValues[category].itemCount++;
                    categoryValues[category].items.push({
                        name: item.name,
                        price: price
                    });
                    
                    totalValue += price;
                });
                
                // Sort categories by value (highest first)
                const sortedCategories = Object.entries(categoryValues)
                    .sort((a, b) => b[1].value - a[1].value);
                
                let response = `Inventory Value by Category (Total: ${formatCurrency(totalValue)}):\n\n`;
                
                sortedCategories.forEach(([category, data], index) => {
                    const percentage = totalValue > 0 ? 
                        ((data.value / totalValue) * 100).toFixed(1) : 
                        "0.0";
                    
                    response += `${index + 1}. ${category}: ${formatCurrency(data.value)} (${percentage}%)\n`;
                    response += `   Items: ${data.itemCount}\n`;
                    
                    // Add top 3 items by value for each category
                    if (data.items.length > 0) {
                        response += `   Top items: `;
                        data.items
                            .sort((a, b) => b.price - a.price)
                            .slice(0, 3)
                            .forEach((item, itemIndex) => {
                                response += `${item.name} (${formatCurrency(item.price)})`;
                                if (itemIndex < Math.min(data.items.length, 3) - 1) {
                                    response += ', ';
                                }
                            });
                        response += '\n';
                    }
                    
                    response += '\n';
                });
                
                return response;
            }
            
            // Price query - check this before other queries
            if (lowerMessage.includes('price of') || 
                lowerMessage.match(/what(?:'s| is) the (?:price|cost) of/i) ||
                lowerMessage.match(/how much (?:does|is) .* cost/i)) {
                
                console.log('Detected price query:', message);
                const result = findItemInAllData(message);
                
                if (result && result.item) {
                    if (result.source === 'inventory') {
                        return `The price of ${result.item.name} is ${formatCurrency(result.item.price)}.`;
                    } else {
                        return `${result.item.name} was last ordered at ${formatCurrency(result.item.price)}.`;
                    }
                } else {
                    // Try direct pattern extraction for a second attempt
                    const pricePattern = /(?:what's|what is|whats) (?:the )?price of (.*?)(?:\?|$)/i;
                    const priceMatch = message.match(pricePattern);
                    
                    if (priceMatch && priceMatch[1]) {
                        const itemName = priceMatch[1].trim();
                        console.log('Direct price pattern match:', itemName);
                        
                        // Search again with just the extracted item name
                        const directResult = findItemByName(itemName, inventory, orders);
                        if (directResult && directResult.item) {
                            if (directResult.source === 'inventory') {
                                return `The price of ${directResult.item.name} is ${formatCurrency(directResult.item.price)}.`;
                            } else {
                                return `${directResult.item.name} was last ordered at ${formatCurrency(directResult.item.price)}.`;
                            }
                        }
                    }
                    
                    // If we get here, we couldn't find the item
                    const itemName = extractItemName(message);
                    return `I couldn't find price information for "${itemName}". Is it in your inventory?`;
                }
            }
            
            // Better handling for item quantity queries
            if (lowerMessage.match(/how many (.*?) (?:do we have|in stock)/i) || 
                lowerMessage.match(/(?:quantity|stock) of (.*?)(?:\?|$)/i)) {
                const result = findItemInAllData(message);
                
                if (result && result.item) {
                    if (result.source === 'inventory') {
                        const item = result.item;
                        return `There are ${item.quantity} ${item.unit || 'units'} of ${item.name} in stock.`;
                    } else {
                        return `${result.item.name} was found in ${result.source}, not in inventory stock.`;
                    }
                } else {
                    // Handle the case where no item was found
                    const patterns = [
                        /how many (.*?) do we have/i,
                        /how many (.*?) in stock/i,
                        /(?:quantity|stock) of (.*?)(?:\?|$)/i
                    ];
                    
                    let extractedName = null;
                    for (const pattern of patterns) {
                        const match = message.match(pattern);
                        if (match && match[1]) {
                            extractedName = match[1].trim();
                            break;
                        }
                    }
                    
                    if (!extractedName) {
                        extractedName = "that item";
                    }
                    
                    return `I couldn't find "${extractedName}" in your inventory. Would you like to add it to your inventory?`;
                }
            }
            
            // Handle order-specific queries first
            if (lowerMessage.includes('order') || lowerMessage.includes('delivery')) {
                const orderResponse = processOrderQuery(message, orders);
                if (orderResponse) return orderResponse;
            }
            
            // Direct inventory value query
            if (lowerMessage.includes('total inventory value') || 
                lowerMessage.match(/what is the (?:total |)value of(?: the|) inventory/) ||
                lowerMessage.match(/inventory worth/)) {
                const totalValue = calculateInventoryValue(inventory);
                return `The total inventory value is ${formatCurrency(totalValue)}.`;
            }
            
            // Direct order value query
            if (lowerMessage.includes('total order value') || 
                lowerMessage.match(/what is the (?:total |)value of(?: the|) orders/) ||
                lowerMessage.match(/orders worth/)) {
                const pendingValue = calculateOrdersValue(orders.pending);
                const completedValue = calculateOrdersValue(orders.completed);
                const totalValue = pendingValue + completedValue;
                return `The total value of all orders is ${formatCurrency(totalValue)}.`;
            }

            // Supplier related queries
            if (lowerMessage.includes('supplier') || 
                lowerMessage.includes('who supplies') || 
                lowerMessage.includes('supplied by')) {
                const result = findItemInAllData(message);
                
                if (result) {
                    const { item, source } = result;
                    if (item.supplier) {
                        return `${item.name} is supplied by ${item.supplier}.`;
                    } else {
                        return `I found ${item.name} in ${source} but it doesn't have supplier information recorded.`;
                    }
                } else {
                    const itemName = extractItemName(message);
                    return `I couldn't find an item matching "${itemName}" in your inventory or orders.`;
                }
            }
            
            // Quick inventory quantity check
            if (lowerMessage.match(/how many (\w+)/) || 
                lowerMessage.match(/quantity of (\w+)/) ||
                lowerMessage.match(/stock of (\w+)/)) {
                const result = findItemInAllData(message);
                
                if (result && result.item) {
                    if (result.source === 'inventory') {
                        return `There are ${result.item.quantity} ${result.item.unit || 'units'} of ${result.item.name} in stock.`;
                    } else {
                        return `${result.item.name} was found in ${result.source}, not in inventory stock.`;
                    }
                } else {
                    const itemName = extractItemName(message);
                    return `I couldn't find an item matching "${itemName}" in the inventory.`;
                }
            }
            
            // Analytics summary query
            if (lowerMessage.includes('analytics summary') || 
                lowerMessage.match(/summarize analytics/) ||
                lowerMessage.match(/analytics overview/)) {
                const inventoryValue = calculateInventoryValue(inventory);
                const pendingValue = calculateOrdersValue(orders.pending);
                const completedValue = calculateOrdersValue(orders.completed);
                
                return `Analytics Summary:\n` +
                       `• Inventory Value: ${formatCurrency(inventoryValue)}\n` +
                       `• Pending Orders Value: ${formatCurrency(pendingValue)}\n` +
                       `• Completed Orders Value: ${formatCurrency(completedValue)}\n` +
                       `• Total Items in Inventory: ${inventory.length}`;
            }
            
            // Category analysis query
            if (lowerMessage.includes('category analysis') || 
                lowerMessage.match(/analyze categories/) ||
                lowerMessage.match(/category breakdown/)) {
                const categoryBreakdown = {};
                
                inventory.forEach(item => {
                    const category = item.category || 'Uncategorized';
                    if (!categoryBreakdown[category]) {
                        categoryBreakdown[category] = {
                            count: 0,
                            value: 0
                        };
                    }
                    categoryBreakdown[category].count++;
                    categoryBreakdown[category].value += parseFloat(item.price) || 0;
                });
                
                let response = `Category Breakdown:\n`;
                Object.entries(categoryBreakdown)
                    .sort((a, b) => b[1].count - a[1].count)
                    .forEach(([category, data]) => {
                        response += `• ${category}: ${data.count} items, ${formatCurrency(data.value)}\n`;
                    });
                    
                return response;
            }
            
            // Inventory details queries (more detailed responses)
            if (lowerMessage.includes('details') || lowerMessage.includes('information about') || lowerMessage.includes('tell me about')) {
                const result = findItemInAllData(message);
                
                if (result) {
                    let response = `${result.item.name} Details:\n`;
                    
                    if (result.source === 'inventory') {
                        response += `• Quantity: ${result.item.quantity} ${result.item.unit || 'units'}\n`;
                        response += `• Price: ${formatCurrency(result.item.price)}\n`;
                        response += `• Category: ${result.item.category || 'Uncategorized'}\n`;
                        if (result.item.expiryDate) {
                            const daysUntilExpiry = Math.ceil((new Date(result.item.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                            response += `• Expiry: ${formatDate(result.item.expiryDate)} (${daysUntilExpiry} days left)\n`;
                        }
                    } else {
                        response += `• Found in: ${result.source}\n`;
                        response += `• Price: ${formatCurrency(result.item.price)}\n`;
                        if (result.item.orderDate || result.item.deliveryDate) {
                            response += `• Date: ${formatDate(result.item.orderDate || result.item.deliveryDate)}\n`;
                        }
                    }
                    
                    if (result.item.supplier) {
                        response += `• Supplier: ${result.item.supplier}`;
                    }
                    return response;
                } else {
                    const itemName = extractItemName(message);
                    return `I couldn't find an item matching "${itemName}" in the inventory or orders.`;
                }
            }

            // Expiry queries
            if (lowerMessage.includes('expir') || lowerMessage.includes('expire') || lowerMessage.includes('expired')) {
                if (lowerMessage.includes('count') || lowerMessage.match(/how many (?:items are|products are) expiring/)) {
                    const today = new Date();
                    const expiringItems = inventory.filter(item => {
                        if (!item.expiryDate) return false;
                        const daysUntilExpiry = Math.ceil((new Date(item.expiryDate) - today) / (1000 * 60 * 60 * 24));
                        return daysUntilExpiry <= 7;
                    });
                    return `There are ${expiringItems.length} items expiring within the next week.`;
                }
                
                // Full expiry report
                const today = new Date();
                const expiringItems = inventory.filter(item => {
                    if (!item.expiryDate) return false;
                    const daysUntilExpiry = Math.ceil((new Date(item.expiryDate) - today) / (1000 * 60 * 60 * 24));
                    return daysUntilExpiry <= 7;
                });

                if (expiringItems.length > 0) {
                    const criticalItems = expiringItems.filter(item => {
                        const daysUntilExpiry = Math.ceil((new Date(item.expiryDate) - today) / (1000 * 60 * 60 * 24));
                        return daysUntilExpiry <= 2;
                    });

                    const warningItems = expiringItems.filter(item => {
                        const daysUntilExpiry = Math.ceil((new Date(item.expiryDate) - today) / (1000 * 60 * 60 * 24));
                        return daysUntilExpiry > 2 && daysUntilExpiry <= 7;
                    });

                    let response = `Expiring Items Report:\n\n`;
                    
                    if (criticalItems.length > 0) {
                        response += `Critical (0-2 days):\n`;
                        criticalItems.forEach(item => {
                            const daysLeft = Math.ceil((new Date(item.expiryDate) - today) / (1000 * 60 * 60 * 24));
                            response += `• ${item.name}: ${formatDate(item.expiryDate)} (${daysLeft} days left)\n`;
                        });
                        response += '\n';
                    }

                    if (warningItems.length > 0) {
                        response += `Warning (3-7 days):\n`;
                        warningItems.forEach(item => {
                            const daysLeft = Math.ceil((new Date(item.expiryDate) - today) / (1000 * 60 * 60 * 24));
                            response += `• ${item.name}: ${formatDate(item.expiryDate)} (${daysLeft} days left)\n`;
                        });
                    }

                    const totalValue = calculateInventoryValue(expiringItems);
                    response += `\nTotal value of expiring items: ${formatCurrency(totalValue)}`;
                    return response;
                } else {
                    return "Good news! I don't see any items expiring within the next week.";
                }
            }

            // Order count query
            if (lowerMessage.match(/how many orders|number of orders|count of orders/i)) {
                const pendingCount = orders.pending.length;
                const completedCount = orders.completed.length;
                return `You have ${pendingCount} pending orders and ${completedCount} completed orders (${pendingCount + completedCount} total).`;
            }

            // Order status queries
            if (lowerMessage.includes('order') || lowerMessage.includes('delivery')) {
                // Orders by specific supplier
                const supplierMatch = lowerMessage.match(/orders from (\w+)/i) || lowerMessage.match(/(\w+) orders/i);
                if (supplierMatch) {
                    const supplierName = supplierMatch[1].toLowerCase();
                    const supplierOrders = orders.all.filter(order => 
                        order.supplier && order.supplier.toLowerCase().includes(supplierName)
                    );
                    
                    if (supplierOrders.length > 0) {
                        let response = `Found ${supplierOrders.length} orders from suppliers matching "${supplierName}":\n\n`;
                        supplierOrders.forEach(order => {
                            response += `• ${order.name}: ${formatCurrency(order.price)} (${formatDate(order.orderDate || order.deliveryDate)})\n`;
                        });
                        return response;
                    } else {
                        return `I couldn't find any orders from suppliers matching "${supplierName}".`;
                    }
                }
                
                // Order by status
                if (lowerMessage.includes('pending orders')) {
                    const pendingOrders = orders.pending;
                    if (pendingOrders.length === 0) return "You have no pending orders.";
                    
                    let response = `Pending Orders (${pendingOrders.length}):\n`;
                    pendingOrders.forEach(order => {
                        response += `• ${order.name}: ${formatCurrency(order.price)} (Due: ${formatDate(order.deliveryDate)})\n`;
                    });
                    return response;
                }
                
                if (lowerMessage.includes('completed orders')) {
                    const completedOrders = orders.completed;
                    if (completedOrders.length === 0) return "You have no completed orders.";
                    
                    let response = `Completed Orders (${completedOrders.length}):\n`;
                    completedOrders.slice(0, 5).forEach(order => {
                        response += `• ${order.name}: ${formatCurrency(order.price)} (Completed: ${formatDate(order.deliveryDate)})\n`;
                    });
                    
                    if (completedOrders.length > 5) {
                        response += `\n... and ${completedOrders.length - 5} more.`;
                    }
                    
                    return response;
                }
                
                // Full order report
                const pendingOrders = orders.pending;
                const completedOrders = orders.completed;
                const today = new Date();

                // Calculate total values
                const pendingValue = calculateOrdersValue(pendingOrders);
                const completedValue = calculateOrdersValue(completedOrders);

                let response = `Order Status Overview:\n\n`;
                response += `Current Status:\n`;
                response += `• Pending Orders: ${pendingOrders.length} (Value: ${formatCurrency(pendingValue)})\n`;
                response += `• Completed Orders: ${completedOrders.length} (Value: ${formatCurrency(completedValue)})\n\n`;

                if (pendingOrders.length > 0) {
                    response += `Recent Pending Orders:\n`;
                    pendingOrders
                        .sort((a, b) => new Date(a.deliveryDate) - new Date(b.deliveryDate))
                        .slice(0, 5)
                        .forEach(order => {
                            const daysUntilDelivery = Math.ceil((new Date(order.deliveryDate) - today) / (1000 * 60 * 60 * 24));
                            response += `• ${order.name} - ${formatCurrency(order.price)}\n  Due: ${formatDate(order.deliveryDate)} (${daysUntilDelivery} days left)\n`;
                        });
                }

                // Add recent completed orders
                const recentCompletedOrders = completedOrders
                    .sort((a, b) => new Date(b.deliveryDate) - new Date(a.deliveryDate))
                    .slice(0, 3);

                if (recentCompletedOrders.length > 0) {
                    response += `\nRecently Completed Orders:\n`;
                    recentCompletedOrders.forEach(order => {
                        response += `• ${order.name} - ${formatCurrency(order.price)} (Completed: ${formatDate(order.deliveryDate)})\n`;
                    });
                }
                
                return response;
            }

            // Quick inventory summary
            if (lowerMessage.includes('inventory summary') || lowerMessage.match(/summarize inventory/i)) {
                const totalValue = calculateInventoryValue(inventory);
                const lowStockItems = inventory.filter(item => parseInt(item.quantity) <= 10);
                const expiringItems = inventory.filter(item => {
                    if (!item.expiryDate) return false;
                    const daysUntilExpiry = Math.ceil((new Date(item.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                    return daysUntilExpiry <= 7;
                });
                
                return `Inventory Summary:\n• Total Items: ${inventory.length}\n• Total Value: ${formatCurrency(totalValue)}\n• Low Stock Items: ${lowStockItems.length}\n• Expiring Soon: ${expiringItems.length}`;
            }

            // Analytics queries
            if (lowerMessage.includes('analytics') || lowerMessage.includes('report')) {
                const totalInventoryValue = calculateInventoryValue(inventory);
                const pendingOrdersValue = calculateOrdersValue(orders.pending);
                const completedOrdersValue = calculateOrdersValue(orders.completed);
                const categoryValues = {};
                const lowStockItems = inventory.filter(item => parseInt(item.quantity) <= 10);
                
                // Calculate category values
                inventory.forEach(item => {
                    const category = item.category || 'Uncategorized';
                    if (!categoryValues[category]) {
                        categoryValues[category] = {
                            value: 0,
                            itemCount: 0,
                            totalQuantity: 0
                        };
                    }
                    categoryValues[category].value += parseFloat(item.price) || 0;
                    categoryValues[category].itemCount++;
                    categoryValues[category].totalQuantity += parseFloat(item.quantity) || 0;
                });

                let response = `Inventory Analytics Report:\n\n`;
                response += `Overall Summary:\n`;
                response += `• Total Inventory Value: ${formatCurrency(totalInventoryValue)}\n`;
                response += `• Total Orders Value: ${formatCurrency(pendingOrdersValue + completedOrdersValue)}\n`;
                response += `• Total Items: ${inventory.length}\n`;
                response += `• Low Stock Items: ${lowStockItems.length}\n\n`;

                response += `Category Analysis:\n`;
                Object.entries(categoryValues)
                    .sort((a, b) => b[1].value - a[1].value)
                    .forEach(([category, data]) => {
                        const percentage = totalInventoryValue > 0 ? ((data.value / totalInventoryValue) * 100).toFixed(1) : "0.0";
                        response += `• ${category}:\n`;
                        response += `  - Value: ${formatCurrency(data.value)} (${percentage}%)\n`;
                        response += `  - Items: ${data.itemCount}\n`;
                    });

                if (lowStockItems.length > 0) {
                    response += `\nLow Stock Alert:\n`;
                    lowStockItems.slice(0, 5).forEach(item => {
                        response += `• ${item.name}: ${item.quantity} ${item.unit || 'units'} remaining\n`;
                    });
                    
                    if (lowStockItems.length > 5) {
                        response += `... and ${lowStockItems.length - 5} more items\n`;
                    }
                }
                
                return response;
            }

            // Default response
            return "I can help you with information about:\n\n" +
                  "• Inventory Status (e.g., 'How many sprite do we have?')\n" +
                  "• Item Details (e.g., 'What's the price of coca cola?')\n" +
                  "• Supplier Information (e.g., 'Who supplies pepsi?')\n" +
                  "• Expiring Items (e.g., 'Show items expiring soon')\n" +
                  "• Order Status (e.g., 'Show pending orders')\n" +
                  "• Analytics Reports (e.g., 'Show inventory value by category')\n\n" +
                  "Please ask me about any of these topics!";
        } catch (error) {
            console.error('Error processing message:', error);
            return "I encountered an error while processing your request. Please try again or ask a different question.";
        }
    }

    // Enhanced order processing function
    function processOrderQuery(message, orders) {
        const lowerMessage = message.toLowerCase();
        
        // Status specific queries (moved to top priority)
        if (lowerMessage.includes('pending orders') || lowerMessage.includes('show pending')) {
            if (orders.pending.length === 0) return "No pending orders found.";
            
            let response = `Pending Orders (${orders.pending.length}):\n`;
            response += `Total Value: ${formatCurrency(orders.pendingValue)}\n\n`;
            
            orders.pending
                .sort((a, b) => new Date(a.deliveryDate || a.orderDate) - new Date(b.deliveryDate || b.orderDate))
                .forEach(order => {
                    const date = order.deliveryDate || order.orderDate;
                    const price = typeof order.price === 'string' ? 
                        parseFloat(order.price.replace(/[^0-9.-]+/g, '')) : 
                        parseFloat(order.price) || 0;
                    
                    response += `• ${order.name}\n`;
                    response += `  - Price: ${formatCurrency(price)}\n`;
                    if (date) response += `  - Due: ${formatDate(date)}\n`;
                    if (order.supplier) response += `  - Supplier: ${order.supplier}\n`;
                    response += '\n';
                });
            
            return response;
        }

        if (lowerMessage.includes('completed orders') || lowerMessage.includes('show completed')) {
            if (orders.completed.length === 0) return "No completed orders found.";
            
            let response = `Completed Orders (${orders.completed.length}):\n`;
            response += `Total Value: ${formatCurrency(orders.completedValue)}\n\n`;
            
            const recentOrders = orders.completed
                .sort((a, b) => new Date(b.deliveryDate || b.orderDate) - new Date(a.deliveryDate || a.orderDate))
                .slice(0, 5);
                
            response += `Recent Completions:\n`;
            recentOrders.forEach(order => {
                const date = order.deliveryDate || order.orderDate;
                const price = typeof order.price === 'string' ? 
                    parseFloat(order.price.replace(/[^0-9.-]+/g, '')) : 
                    parseFloat(order.price) || 0;
                
                response += `• ${order.name}\n`;
                response += `  - Price: ${formatCurrency(price)}\n`;
                if (date) response += `  - Completed: ${formatDate(date)}\n`;
                if (order.supplier) response += `  - Supplier: ${order.supplier}\n`;
                response += '\n';
            });
            
            if (orders.completed.length > 5) {
                response += `... and ${orders.completed.length - 5} more completed orders`;
            }
            
            return response;
        }

        // Order value queries
        if (lowerMessage.includes('total order value') || 
            lowerMessage.match(/what is the (?:total |)value of(?: the|) orders/) ||
            lowerMessage.match(/orders worth/)) {
            return `Order Values:\n` +
                   `• Pending Orders: ${formatCurrency(orders.pendingValue)}\n` +
                   `• Completed Orders: ${formatCurrency(orders.completedValue)}\n` +
                   `• Total Value: ${formatCurrency(orders.totalValue)}`;
        }

        // Order count queries
        if (lowerMessage.match(/how many orders|number of orders|count of orders/i)) {
            return `Order Counts:\n` +
                   `• Pending Orders: ${orders.pending.length}\n` +
                   `• Completed Orders: ${orders.completed.length}\n` +
                   `• Total Orders: ${orders.all.length}`;
        }

        // Supplier specific orders (moved to lower priority)
        const supplierMatch = lowerMessage.match(/orders from (\w+)/i) || lowerMessage.match(/(\w+)(?:'s| )orders/i);
        if (supplierMatch) {
            const supplierName = supplierMatch[1].toLowerCase();
            const supplierOrders = orders.all.filter(order => 
                order.supplier && order.supplier.toLowerCase().includes(supplierName)
            );
            
            if (supplierOrders.length > 0) {
                const totalValue = calculateOrdersValue(supplierOrders);
                let response = `Orders from "${supplierName}":\n`;
                response += `Total Orders: ${supplierOrders.length}\n`;
                response += `Total Value: ${formatCurrency(totalValue)}\n\n`;
                
                const pendingSupplierOrders = supplierOrders.filter(order => 
                    orders.pending.some(p => p.name === order.name && p.supplier === order.supplier)
                );
                
                if (pendingSupplierOrders.length > 0) {
                    response += `Pending Orders:\n`;
                    pendingSupplierOrders.forEach(order => {
                        response += `• ${order.name}: ${formatCurrency(order.price * (order.quantity || 1))} `;
                        response += `(${order.quantity || 1} ${order.unit || 'units'})\n`;
                    });
                }
                
                return response;
            }
            return `No orders found from supplier matching "${supplierName}".`;
        }

        return null;
    }

    // UI Functions
    function addMessageToUI(message, isUser = false, shouldSave = true) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
        
        const avatar = document.createElement('div');
        avatar.className = isUser ? 'user-avatar' : 'ai-avatar';
        
        if (isUser) {
            avatar.innerHTML = '<i class="fas fa-user"></i>';
        } else {
            avatar.innerHTML = '<i class="fas fa-robot"></i>';
        }
        
        const content = document.createElement('div');
        content.className = 'message-content';
        content.innerHTML = `<p>${message.replace(/\n/g, '<br>')}</p>`;
        
        if (isUser) {
            messageDiv.appendChild(content);
            messageDiv.appendChild(avatar);
        } else {
            messageDiv.appendChild(avatar);
            messageDiv.appendChild(content);
        }
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Save to chat history
        if (shouldSave && chats[currentChatId]) {
            chats[currentChatId].messages.push({
                content: message,
                isUser: isUser,
                timestamp: new Date().toISOString()
            });
            
            // Update chat title if it's the first user message
            if (isUser && chats[currentChatId].messages.length === 1) {
                chats[currentChatId].title = message.slice(0, 30) + (message.length > 30 ? '...' : '');
            }
            
            saveChats();
            updateChatHistorySidebar();
        }
    }

    // Helper function to find item directly by name
    function findItemByName(itemName, inventory, orders) {
        if (!itemName || itemName.length < 2) {
            console.log('Item name too short or empty');
            return null;
        }
        
        console.log('Direct search for item by name:', itemName);
        
        // Try exact match in inventory first
        let inventoryItem = inventory.find(item => 
            item.name && item.name.toLowerCase() === itemName.toLowerCase()
        );
        
        // If no exact match, try partial match
        if (!inventoryItem) {
            inventoryItem = inventory.find(item => 
                item.name && item.name.toLowerCase().includes(itemName.toLowerCase())
            );
        }
        
        // If still no match, try word by word matching for multi-word items
        if (!inventoryItem && itemName.includes(' ')) {
            const words = itemName.toLowerCase().split(/\s+/);
            
            // Try to match with the first meaningful word
            for (const word of words) {
                if (word.length > 2) { // Skip very short words
                    inventoryItem = inventory.find(item => 
                        item.name && item.name.toLowerCase().includes(word)
                    );
                    if (inventoryItem) break;
                }
            }
        }
        
        if (inventoryItem) {
            console.log('Found in inventory by direct name search:', inventoryItem);
            return { item: inventoryItem, source: 'inventory' };
        }

        // Then check orders with similar matching logic
        // First check pending orders
        let orderItem = (orders.pending || []).find(order => 
            order.name && order.name.toLowerCase().includes(itemName.toLowerCase())
        );
        
        if (orderItem) {
            console.log('Found in pending orders by direct name search:', orderItem);
            return { item: orderItem, source: 'pending orders' };
        }
        
        // Then check completed orders
        orderItem = (orders.completed || []).find(order => 
            order.name && order.name.toLowerCase().includes(itemName.toLowerCase())
        );
        
        if (orderItem) {
            console.log('Found in completed orders by direct name search:', orderItem);
            return { item: orderItem, source: 'completed orders' };
        }

        console.log('Item not found by direct name search:', itemName);
        return null;
    }

    // Voice Input Handling
    function toggleVoiceInput() {
        if (isListening) {
            recognition.stop();
            voiceButton.classList.remove('listening');
        } else {
            recognition.start();
            voiceButton.classList.add('listening');
        }
        isListening = !isListening;
    }

    // Event Listeners
    sendButton.addEventListener('click', async () => {
        const message = userInput.value.trim();
        if (message) {
            addMessageToUI(message, true);
            userInput.value = '';
            const response = await processUserMessage(message);
            addMessageToUI(response, false);
        }
    });

    userInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendButton.click();
        }
    });

    voiceButton.addEventListener('click', toggleVoiceInput);

    recognition.onresult = (event) => {
        const message = event.results[0][0].transcript;
        userInput.value = message;
        sendButton.click();
    };

    recognition.onend = () => {
        isListening = false;
        voiceButton.classList.remove('listening');
    };

    clearChatButton.addEventListener('click', () => {
        newChat();
    });

    exportChatButton.addEventListener('click', () => {
        if (chats[currentChatId]) {
            const chatData = chats[currentChatId].messages
                .map(msg => `${msg.isUser ? 'You' : 'AI'}: ${msg.content}`)
                .join('\n\n');
            
            const blob = new Blob([chatData], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `chat-export-${new Date().toISOString().split('T')[0]}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    });

    newChatButton.addEventListener('click', newChat);

    // Initialize
    initializeChat();
}); 