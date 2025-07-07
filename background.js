// Notion Todo Extension - Service Worker
// Connected to Database: 22856a75337c80c8a913e4130ca6dc0d

const API_KEY = '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';
const DATABASE_ID = '22856a75337c80c8a913e4130ca6dc0d';
const NOTION_API_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

// Property mappings based on your database schema
const PROPERTY_MAPPINGS = {
    title: 'Task name',
    status: 'Status',
    assignee: 'Assignee',
    dueDate: 'Due date',
    priority: 'Priority',
    taskType: 'Task type',
    description: 'Description',
    effortLevel: 'Effort level'
};

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
        
        console.log('Extension connected to database:', DATABASE_ID);
    }
});

// Context menu handler
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'addToNotion') {
        const selectedText = info.selectionText || tab.title || 'New Task';
        
        try {
            await addQuickTask(selectedText, tab.url);
            
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

// Quick task addition function
async function addQuickTask(title, sourceUrl = null) {
    const taskData = {
        parent: { database_id: DATABASE_ID },
        properties: {
            [PROPERTY_MAPPINGS.title]: {
                title: [{ text: { content: title } }]
            },
            [PROPERTY_MAPPINGS.status]: {
                select: { name: 'Not started' }
            },
            [PROPERTY_MAPPINGS.priority]: {
                select: { name: 'Medium' }
            }
        }
    };

    // Add description with source URL if available
    if (sourceUrl) {
        taskData.properties[PROPERTY_MAPPINGS.description] = {
            rich_text: [
                {
                    text: { content: `Added from: ${sourceUrl}` }
                }
            ]
        };
    }

    const response = await fetch(`${NOTION_API_BASE}/pages`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
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
        addQuickTask(request.title, request.url)
            .then(result => {
                sendResponse({ success: true, data: result });
            })
            .catch(error => {
                console.error('Error adding task:', error);
                sendResponse({ success: false, error: error.message });
            });
        
        return true; // Keep message channel open for async response
    }
    
    if (request.action === 'getTaskStats') {
        getTaskStats()
            .then(stats => {
                sendResponse({ success: true, data: stats });
            })
            .catch(error => {
                console.error('Error getting stats:', error);
                sendResponse({ success: false, error: error.message });
            });
        
        return true;
    }
});

// Get task statistics
async function getTaskStats() {
    try {
        const response = await fetch(`${NOTION_API_BASE}/databases/${DATABASE_ID}/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
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

        // Calculate statistics
        const stats = {
            total: tasks.length,
            notStarted: 0,
            inProgress: 0,
            done: 0,
            blocked: 0,
            overdue: 0
        };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        tasks.forEach(task => {
            const status = task.properties[PROPERTY_MAPPINGS.status]?.select?.name || 'Not started';
            const dueDate = task.properties[PROPERTY_MAPPINGS.dueDate]?.date?.start;

            // Count by status
            switch (status) {
                case 'Not started':
                    stats.notStarted++;
                    break;
                case 'In progress':
                    stats.inProgress++;
                    break;
                case 'Done':
                    stats.done++;
                    break;
                case 'Blocked':
                    stats.blocked++;
                    break;
            }

            // Check for overdue
            if (dueDate && status !== 'Done') {
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
            const stats = await getTaskStats();
            
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
