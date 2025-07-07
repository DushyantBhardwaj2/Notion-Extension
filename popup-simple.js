console.log('🚀 Advanced popup loading...');

// Configuration
let API_KEY = '';
let DATABASE_ID = '';
const NOTION_API_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

// Global variables
let allTasks = [];
let currentTaskId = null;
let filtersVisible = false;

// DOM elements
let taskInput, prioritySelect, dueDateInput, descriptionInput, addBtn, clearBtn;
let todayBtn, tomorrowBtn, weekBtn, nextWeekBtn;
let taskListDiv, statusDiv, refreshBtn, toggleFiltersBtn, controlsSection;
let filterStatus, filterPriority, sortBy, sortOrder, searchInput, clearFiltersBtn;

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 Advanced popup DOM loaded');
    
    // Get DOM elements
    initializeDOMElements();
    
    // Set load status
    updateStatus('🚀 Loading extension...');
    
    // Check setup status
    const isSetupComplete = await checkSetupStatus();
    if (!isSetupComplete) {
        updateStatus('⚠️ Setup required - click Settings to configure');
    } else {
        updateStatus('✅ Ready to add tasks!');
    }
    
    // Set default due date to today at 9:00 AM
    if (dueDateInput) {
        const today = new Date();
        today.setHours(9, 0, 0, 0);
        dueDateInput.value = today.toISOString().slice(0, 16);
    }
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize navigation system
    initializeNavigation();
    
    // Initialize sort order labels
    updateSortOrderLabels();
    
    // Initialize task list height class
    if (taskListDiv) {
        taskListDiv.classList.add('filters-hidden');
    }
    
    console.log('🎉 Advanced popup fully initialized');
});

function initializeDOMElements() {
    // Add Task form elements
    taskInput = document.getElementById('taskInput');
    prioritySelect = document.getElementById('prioritySelect');
    dueDateInput = document.getElementById('dueDateInput');
    descriptionInput = document.getElementById('descriptionInput');
    addBtn = document.getElementById('addBtn');
    clearBtn = document.getElementById('clearBtn');
    statusDiv = document.getElementById('status');
    
    // Quick action buttons
    todayBtn = document.getElementById('todayBtn');
    tomorrowBtn = document.getElementById('tomorrowBtn');
    weekBtn = document.getElementById('weekBtn');
    nextWeekBtn = document.getElementById('nextWeekBtn');
    
    // Tasks list elements
    taskListDiv = document.getElementById('taskList');
    refreshBtn = document.getElementById('refreshBtn');
    toggleFiltersBtn = document.getElementById('toggleFiltersBtn');
    controlsSection = document.getElementById('controlsSection');
    
    // Filter elements
    filterStatus = document.getElementById('filterStatus');
    filterPriority = document.getElementById('filterPriority');
    sortBy = document.getElementById('sortBy');
    sortOrder = document.getElementById('sortOrder');
    searchInput = document.getElementById('searchInput');
    clearFiltersBtn = document.getElementById('clearFiltersBtn');
    
    // Settings button
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            window.location.href = 'setup.html';
        });
    }
    
    console.log('✅ DOM elements initialized:', {
        taskInput: !!taskInput,
        addBtn: !!addBtn,
        statusDiv: !!statusDiv,
        taskListDiv: !!taskListDiv
    });
}

function setupEventListeners() {
    // Add task button listeners
    if (addBtn) {
        addBtn.addEventListener('click', addTask);
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', clearForm);
    }
    
    // Quick action button listeners
    if (todayBtn) {
        todayBtn.addEventListener('click', () => quickAddTask('today'));
    }
    
    if (tomorrowBtn) {
        tomorrowBtn.addEventListener('click', () => quickAddTask('tomorrow'));
    }
    
    if (weekBtn) {
        weekBtn.addEventListener('click', () => quickAddTask('thisweek'));
    }
    
    if (nextWeekBtn) {
        nextWeekBtn.addEventListener('click', () => quickAddTask('nextweek'));
    }
    
    // Task list refresh button
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadRecentTasks);
    }
    
    // Filter and sort event listeners
    if (filterStatus) {
        filterStatus.addEventListener('change', applyFiltersAndSort);
    }
    
    if (filterPriority) {
        filterPriority.addEventListener('change', applyFiltersAndSort);
    }
    
    if (sortBy) {
        sortBy.addEventListener('change', () => {
            updateSortOrderLabels();
            applyFiltersAndSort();
        });
    }
    
    if (sortOrder) {
        sortOrder.addEventListener('change', applyFiltersAndSort);
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', applyFiltersAndSort);
    }
    
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearAllFilters);
    }
    
    // Toggle filters button
    if (toggleFiltersBtn) {
        toggleFiltersBtn.addEventListener('click', toggleFilters);
    }
    
    if (taskInput) {
        taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addTask();
            }
        });
    }
    
    console.log('✅ Event listeners attached');
}

// Initialize navigation system
function initializeNavigation() {
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');
            
            // Remove active class from all tabs and contents
            navTabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            const targetContent = document.getElementById(`${targetTab}-tab`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
            
            // Focus task input when switching to add tab
            if (targetTab === 'add' && taskInput) {
                setTimeout(() => taskInput.focus(), 100);
            }
            
            // Refresh tasks when switching to tasks tab
            if (targetTab === 'tasks') {
                loadRecentTasks();
            }
        });
    });
}

// Check setup status
async function checkSetupStatus() {
    try {
        const result = await chrome.storage.sync.get(['notionApiKey', 'notionDatabaseId', 'setupCompleted']);
        
        if (result.setupCompleted && result.notionApiKey && result.notionDatabaseId) {
            API_KEY = result.notionApiKey;
            DATABASE_ID = result.notionDatabaseId;
            console.log('✅ Loaded stored API credentials');
            return true;
        }
        
        console.log('❌ Setup not completed or missing credentials');
        return false;
    } catch (error) {
        console.error('Error checking setup status:', error);
        return false;
    }
}

// Update status message
function updateStatus(message, isError = false) {
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className = isError ? 'status status-error' : 'status';
    }
    console.log('Status:', message);
}

// Clear form
function clearForm() {
    if (taskInput) taskInput.value = '';
    if (descriptionInput) descriptionInput.value = '';
    if (prioritySelect) prioritySelect.value = 'Medium';
    if (dueDateInput) {
        const today = new Date();
        today.setHours(9, 0, 0, 0);
        dueDateInput.value = today.toISOString().slice(0, 16);
    }
    if (taskInput) taskInput.focus();
    updateStatus('Form cleared! 🧹');
}

// Load recent tasks from Notion
async function loadRecentTasks() {
    if (!taskListDiv) return;
    
    try {
        taskListDiv.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⏳</div>
                <div class="empty-state-title">Loading your tasks...</div>
            </div>
        `;
        
        const response = await fetch(`${NOTION_API_BASE}/databases/${DATABASE_ID}/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Notion-Version': NOTION_VERSION,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                page_size: 50,
                sorts: [
                    {
                        timestamp: 'created_time',
                        direction: 'descending'
                    }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        allTasks = data.results;
        applyFiltersAndSort();
        
    } catch (error) {
        console.error('Error loading tasks:', error);
        taskListDiv.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❌</div>
                <div class="empty-state-title">Failed to load tasks</div>
                <div class="empty-state-subtitle">${error.message}</div>
            </div>
        `;
    }
}

// Display tasks in the popup
function displayTasks(tasks) {
    if (!taskListDiv) return;
    
    if (!tasks || tasks.length === 0) {
        taskListDiv.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <div class="empty-state-title">No tasks found</div>
                <div class="empty-state-subtitle">Switch to "Add Task" tab to create your first task!</div>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    tasks.forEach(task => {
        const title = task.properties['Task name']?.title?.[0]?.plain_text || 'Untitled Task';
        const status = task.properties['Status']?.status?.name || 'No Status';
        const priority = task.properties['Priority']?.select?.name || 'No Priority';
        const dueDate = task.properties['Due date']?.date?.start;
        
        let dueDateText = '';
        if (dueDate) {
            const date = new Date(dueDate);
            const today = new Date();
            const diffTime = date - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            if (diffDays === 0) dueDateText = `📅 Due today at ${timeStr}`;
            else if (diffDays === 1) dueDateText = `🌅 Due tomorrow at ${timeStr}`;
            else if (diffDays === -1) dueDateText = `⚠️ Due yesterday at ${timeStr}`;
            else if (diffDays < 0) dueDateText = `⚠️ Overdue by ${Math.abs(diffDays)} days`;
            else if (diffDays <= 7) dueDateText = `📆 Due in ${diffDays} days at ${timeStr}`;
            else dueDateText = `🗓️ Due ${date.toLocaleDateString()} at ${timeStr}`;
        }
        
        const priorityClass = priority.toLowerCase();
        const displayTitle = title.length > 30 ? title.substring(0, 30) + '...' : title;
        
        html += `
            <div class="task-item ${priorityClass}" data-task-id="${task.id}">
                <div class="task-title">${displayTitle}</div>
                <div class="task-meta">
                    ${status} • ${priority} Priority
                    ${dueDateText ? `<br>${dueDateText}` : ''}
                </div>
            </div>
        `;
    });
    
    taskListDiv.innerHTML = html;
    
    // Add click event listeners to task items
    const taskItems = taskListDiv.querySelectorAll('.task-item');
    taskItems.forEach((item) => {
        const taskId = item.getAttribute('data-task-id');
        item.addEventListener('click', () => {
            if (taskId) {
                // For now, just show task details in status
                const task = allTasks.find(t => t.id === taskId);
                if (task) {
                    const title = task.properties['Task name']?.title?.[0]?.plain_text || 'Untitled';
                    updateStatus(`Selected task: "${title}" (Click refresh to see latest)`, false);
                }
            }
        });
    });
}

// Quick add task functionality
async function quickAddTask(timeframe) {
    const taskName = taskInput?.value?.trim();
    
    if (!taskName) {
        updateStatus('Enter a task name first! ⚠️', true);
        if (taskInput) taskInput.focus();
        return;
    }
    
    try {
        updateStatus(`Adding task for ${timeframe}... ⏳`);
        
        let dueDate, priority = 'Medium', description = '';
        const today = new Date();
        
        switch (timeframe) {
            case 'today':
                const todayDue = new Date(today);
                todayDue.setHours(17, 0, 0, 0);
                dueDate = todayDue.toISOString().slice(0, 16);
                priority = 'High';
                description = 'Due today - high priority task';
                break;
                
            case 'tomorrow':
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(9, 0, 0, 0);
                dueDate = tomorrow.toISOString().slice(0, 16);
                priority = 'Medium';
                description = 'Due tomorrow';
                break;
                
            case 'thisweek':
                const endOfWeek = new Date(today);
                endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
                endOfWeek.setHours(17, 0, 0, 0);
                dueDate = endOfWeek.toISOString().slice(0, 16);
                priority = 'Medium';
                description = 'Due end of this week';
                break;
                
            case 'nextweek':
                const nextWeek = new Date(today);
                nextWeek.setDate(today.getDate() + 7);
                nextWeek.setHours(12, 0, 0, 0);
                dueDate = nextWeek.toISOString().slice(0, 16);
                priority = 'Low';
                description = 'Due next week';
                break;
        }
        
        const taskData = {
            parent: { database_id: DATABASE_ID },
            properties: {
                'Task name': {
                    title: [{ text: { content: taskName } }]
                },
                'Status': { 
                    status: { name: 'Not started' } 
                },
                'Priority': {
                    select: { name: priority }
                }
            }
        };
        
        if (dueDate) {
            taskData.properties['Due date'] = {
                date: { start: dueDate }
            };
        }
        
        const userDescription = descriptionInput?.value?.trim();
        const finalDescription = userDescription ? `${userDescription}\n\n${description}` : description;
        
        if (finalDescription) {
            taskData.properties['Description'] = {
                rich_text: [{ text: { content: finalDescription } }]
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
            const errorData = await response.json();
            throw new Error(errorData.message || 'API Error');
        }
        
        updateStatus(`✅ Task added for ${timeframe.replace('thisweek', 'this week').replace('nextweek', 'next week')}!`);
        
        setTimeout(() => {
            clearForm();
            switchToTasksView();
        }, 1500);
        
    } catch (error) {
        console.error('Error adding quick task:', error);
        updateStatus(`Error: ${error.message} ❌`, true);
    }
}

// Add task to Notion
async function addTask() {
    const taskName = taskInput?.value?.trim();
    
    if (!taskName) {
        updateStatus('Please enter a task name! ⚠️', true);
        if (taskInput) taskInput.focus();
        return;
    }
    
    if (!API_KEY || !DATABASE_ID) {
        updateStatus('Please configure your API settings first! ⚙️', true);
        return;
    }
    
    try {
        updateStatus('Adding task... ⏳');
        
        const taskData = {
            parent: { database_id: DATABASE_ID },
            properties: {
                'Task name': {
                    title: [{ text: { content: taskName } }]
                },
                'Status': { 
                    status: { name: 'Not started' } 
                }
            }
        };
        
        const priorityValue = prioritySelect?.value || 'Medium';
        taskData.properties['Priority'] = {
            select: { name: priorityValue }
        };
        
        if (dueDateInput?.value) {
            taskData.properties['Due date'] = {
                date: { start: dueDateInput.value }
            };
        }
        
        if (descriptionInput?.value?.trim()) {
            taskData.properties['Description'] = {
                rich_text: [{ text: { content: descriptionInput.value.trim() } }]
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
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP ${response.status}`);
        }
        
        updateStatus('✅ Task added successfully!');
        
        setTimeout(() => {
            clearForm();
            switchToTasksView();
        }, 1000);
        
    } catch (error) {
        console.error('Error adding task:', error);
        updateStatus(`Error: ${error.message} ❌`, true);
    }
}

// Helper function to switch to tasks view
function switchToTasksView() {
    const tasksTab = document.querySelector('[data-tab="tasks"]');
    const tasksContent = document.getElementById('tasks-tab');
    
    if (tasksTab && tasksContent) {
        document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        tasksTab.classList.add('active');
        tasksContent.classList.add('active');
        
        loadRecentTasks();
    }
}

// Filter and sort functionality
function toggleFilters() {
    const filterControls = document.getElementById('filterControls');
    if (filterControls) {
        filtersVisible = !filtersVisible;
        filterControls.classList.toggle('visible', filtersVisible);
        
        if (taskListDiv) {
            taskListDiv.classList.toggle('filters-visible', filtersVisible);
            taskListDiv.classList.toggle('filters-hidden', !filtersVisible);
        }
        
        if (toggleFiltersBtn) {
            toggleFiltersBtn.textContent = filtersVisible ? '🔍 Hide Filters' : '🔍 Show Filters';
        }
    }
}

function updateSortOrderLabels() {
    if (!sortBy || !sortOrder) return;
    
    const sortByValue = sortBy.value;
    const isAsc = sortOrder.value === 'asc';
    
    const labels = {
        'created': isAsc ? 'Oldest First' : 'Newest First',
        'updated': isAsc ? 'Oldest First' : 'Newest First',
        'due': isAsc ? 'Earliest First' : 'Latest First',
        'priority': isAsc ? 'Low to High' : 'High to Low',
        'name': isAsc ? 'A to Z' : 'Z to A'
    };
    
    sortOrder.innerHTML = `
        <option value="desc">${labels[sortByValue]?.split(' to ')[1] || 'Descending'}</option>
        <option value="asc">${labels[sortByValue]?.split(' to ')[0] || 'Ascending'}</option>
    `;
}

function applyFiltersAndSort() {
    if (!allTasks) return;
    
    let filteredTasks = [...allTasks];
    
    // Apply status filter
    if (filterStatus?.value) {
        filteredTasks = filteredTasks.filter(task => {
            const status = task.properties['Status']?.status?.name;
            return status === filterStatus.value;
        });
    }
    
    // Apply priority filter
    if (filterPriority?.value) {
        filteredTasks = filteredTasks.filter(task => {
            const priority = task.properties['Priority']?.select?.name;
            return priority === filterPriority.value;
        });
    }
    
    // Apply search filter
    if (searchInput?.value?.trim()) {
        const searchTerm = searchInput.value.trim().toLowerCase();
        filteredTasks = filteredTasks.filter(task => {
            const title = task.properties['Task name']?.title?.[0]?.plain_text?.toLowerCase() || '';
            return title.includes(searchTerm);
        });
    }
    
    // Apply sorting
    if (sortBy?.value && sortOrder?.value) {
        const sortField = sortBy.value;
        const isAsc = sortOrder.value === 'asc';
        
        filteredTasks.sort((a, b) => {
            let valueA, valueB;
            
            switch (sortField) {
                case 'created':
                    valueA = new Date(a.created_time);
                    valueB = new Date(b.created_time);
                    break;
                case 'updated':
                    valueA = new Date(a.last_edited_time);
                    valueB = new Date(b.last_edited_time);
                    break;
                case 'due':
                    valueA = a.properties['Due date']?.date?.start ? new Date(a.properties['Due date'].date.start) : new Date(0);
                    valueB = b.properties['Due date']?.date?.start ? new Date(b.properties['Due date'].date.start) : new Date(0);
                    break;
                case 'priority':
                    const priorityOrder = { 'Urgent': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
                    valueA = priorityOrder[a.properties['Priority']?.select?.name] || 0;
                    valueB = priorityOrder[b.properties['Priority']?.select?.name] || 0;
                    break;
                case 'name':
                    valueA = a.properties['Task name']?.title?.[0]?.plain_text?.toLowerCase() || '';
                    valueB = b.properties['Task name']?.title?.[0]?.plain_text?.toLowerCase() || '';
                    break;
                default:
                    return 0;
            }
            
            if (valueA < valueB) return isAsc ? -1 : 1;
            if (valueA > valueB) return isAsc ? 1 : -1;
            return 0;
        });
    }
    
    displayTasks(filteredTasks);
}

function clearAllFilters() {
    if (filterStatus) filterStatus.value = '';
    if (filterPriority) filterPriority.value = '';
    if (searchInput) searchInput.value = '';
    if (sortBy) sortBy.value = 'created';
    if (sortOrder) sortOrder.value = 'desc';
    updateSortOrderLabels();
    applyFiltersAndSort();
}

console.log('🔧 Advanced popup script loaded');
