// Notion Todo Extension - Service Worker
// Modern OAuth-based implementation

const NOTION_API_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

// Extension installation
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Notion Todo Extension installed/updated');
    
    if (details.reason === 'install') {
        // Create context menu
        chrome.contextMenus.create({
            id: 'addToNotion',
            title: 'Add to Notion Tasks',
            contexts: ['selection', 'page']
        });
        
        console.log('Extension ready - OAuth authentication required');
    }
});

// Context menu handler
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'addToNotion') {
        const selectedText = info.selectionText || tab.title || 'New Task';
        
        try {
            // Check if user is authenticated
            const authData = await getStoredAuth();
            
            if (!authData || !authData.authenticated) {
                // Open popup for authentication
                chrome.action.openPopup();
                return;
            }
            
            await addQuickTask(selectedText, tab.url, authData);
            
            // Show notification
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon48.png',
                title: 'Task Added',
                message: `"${selectedText}" added to your Notion database`
            });
            
        } catch (error) {
            console.error('Failed to add task:', error);
            
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon48.png',
                title: 'Error',
                message: 'Failed to add task to Notion'
            });
        }
    }
});

// Get stored authentication data
async function getStoredAuth() {
    const result = await chrome.storage.sync.get([
        'notionAccessToken', 'notionDatabaseId', 'authenticated', 'authMethod'
    ]);
    
    if (result.authenticated && result.authMethod === 'oauth' && result.notionAccessToken) {
        return {
            accessToken: result.notionAccessToken,
            databaseId: result.notionDatabaseId,
            authenticated: true
        };
    }
    return null;
}

// Quick task addition function with OAuth
async function addQuickTask(title, sourceUrl = null, authData) {
    if (!authData || !authData.databaseId) {
        throw new Error('No database configured. Please set up through the extension popup.');
    }

    const taskData = {
        parent: { database_id: authData.databaseId },
        properties: {
            "Task": {
                title: [{ text: { content: title } }]
            },
            "Status": {
                select: { name: "📋 Not Started" }
            },
            "Priority": {
                select: { name: "📊 Medium" }
            },
            "Category": {
                select: { name: "💼 Work" }
            },
            "Context": {
                select: { name: "💻 Computer" }
            },
            "Energy": {
                select: { name: "🪫 Low Energy" }
            }
        }
    };

    // Add description with source URL if available
    if (sourceUrl) {
        taskData.properties["Description"] = {
            rich_text: [
                {
                    text: { content: `Added from browser: ${sourceUrl}` }
                }
            ]
        };
    }

    const response = await fetch(`${NOTION_API_BASE}/pages`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${authData.accessToken}`,
            'Notion-Version': NOTION_VERSION,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskData)
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`HTTP ${response.status}: ${error}`);
    }

    return await response.json();
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'addTask') {
        (async () => {
            try {
                const authData = await getStoredAuth();
                if (!authData) {
                    throw new Error('Authentication required. Please sign in through the extension popup.');
                }
                
                const result = await addQuickTask(request.title, request.url, authData);
                sendResponse({ success: true, data: result });
            } catch (error) {
                console.error('Error adding task:', error);
                sendResponse({ success: false, error: error.message });
            }
        })();
        
        return true; // Keep message channel open for async response
    }
    
    if (request.action === 'getTaskStats') {
        (async () => {
            try {
                const authData = await getStoredAuth();
                if (!authData) {
                    throw new Error('Authentication required. Please sign in through the extension popup.');
                }
                
                const stats = await getTaskStats(authData);
                sendResponse({ success: true, data: stats });
            } catch (error) {
                console.error('Error getting stats:', error);
                sendResponse({ success: false, error: error.message });
            }
        })();
        
        return true;
    }
});

// Get task statistics with OAuth
async function getTaskStats(authData) {
    if (!authData || !authData.databaseId) {
        throw new Error('No database configured');
    }

    try {
        const response = await fetch(`${NOTION_API_BASE}/databases/${authData.databaseId}/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authData.accessToken}`,
                'Notion-Version': NOTION_VERSION,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                page_size: 100 // Get more for stats
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const tasks = data.results;

        // Calculate statistics using new property names
        const stats = {
            total: tasks.length,
            notStarted: 0,
            inProgress: 0,
            completed: 0,
            onHold: 0,
            overdue: 0
        };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        tasks.forEach(task => {
            const status = task.properties.Status?.select?.name || '📋 Not Started';
            const dueDate = task.properties['Due Date']?.date?.start;

            // Count by status using new status names
            if (status.includes('Not Started')) {
                stats.notStarted++;
            } else if (status.includes('In Progress')) {
                stats.inProgress++;
            } else if (status.includes('Completed')) {
                stats.completed++;
            } else if (status.includes('On Hold')) {
                stats.onHold++;
            }

            // Check for overdue (not completed tasks past due date)
            if (dueDate && !status.includes('Completed')) {
                const taskDueDate = new Date(dueDate);
                if (taskDueDate < today) {
                    stats.overdue++;
                }
            }
        });

        return stats;

    } catch (error) {
        console.error('Error getting task stats:', error);
        throw error;
    }
}

// Periodic sync (check for updates every 15 minutes)
chrome.alarms.create('syncTasks', { periodInMinutes: 15 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'syncTasks') {
        try {
            const authData = await getStoredAuth();
            
            if (!authData) {
                // User not authenticated, clear badge
                chrome.action.setBadgeText({ text: '' });
                chrome.action.setTitle({ title: 'Notion Todo Extension - Sign in required' });
                return;
            }
            
            const stats = await getTaskStats(authData);
            
            // Update badge with overdue count
            if (stats.overdue > 0) {
                chrome.action.setBadgeText({ text: stats.overdue.toString() });
                chrome.action.setBadgeBackgroundColor({ color: '#ff4444' });
                chrome.action.setTitle({ title: `${stats.overdue} overdue tasks` });
            } else {
                chrome.action.setBadgeText({ text: '' });
                chrome.action.setTitle({ title: 'Notion Todo Extension' });
            }
            
        } catch (error) {
            console.error('Sync failed:', error);
            // Clear badge on error
            chrome.action.setBadgeText({ text: '' });
        }
    }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
    console.log('Notion Todo Extension started');
});
// Clean up on extension uninstall
chrome.runtime.onSuspend.addListener(() => {
    console.log('Notion Todo Extension suspended');
});
