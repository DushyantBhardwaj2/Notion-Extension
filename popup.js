// Notion Todo Extension - Dynamic API Key Version
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
let detailTaskName, detailStatus, detailPriority, detailDueDate, detailDescription;
let detailCreated, detailUpdated, backBtn, saveBtn, testSaveBtn, detailStatusDiv;

// Setup and configuration functions
async function checkSetupStatus() {
    try {
        const result = await chrome.storage.sync.get(['notionApiKey', 'notionDatabaseId', 'setupCompleted']);
        
        if (result.setupCompleted && result.notionApiKey && result.notionDatabaseId) {
            // Load the stored credentials
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

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Extension loading...');
    console.log('📄 HTML loaded successfully');
    console.log('🔍 Body elements:', document.body.children.length);
    
    // Test if CSS is loading
    const bodyStyles = window.getComputedStyle(document.body);
    console.log('💄 Body width:', bodyStyles.width);
    console.log('💄 Body height:', bodyStyles.height);
    console.log('💄 Body background:', bodyStyles.background);
    
    // Test header visibility
    const header = document.querySelector('.header');
    if (header) {
        console.log('✅ Header found');
        console.log('📏 Header dimensions:', header.offsetWidth, 'x', header.offsetHeight);
    } else {
        console.error('❌ Header not found');
    }
    
    // Check for stored settings first
    const isSetupComplete = await checkSetupStatus();
    if (!isSetupComplete) {
        console.log('🔄 Redirecting to setup...');
        window.location.href = 'setup.html';
        return;
    }
    
    // Get DOM elements
    initializeDOMElements();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize navigation system
    initializeNavigation();
    
    // Set default due date to today at 9:00 AM
    if (dueDateInput) {
        const today = new Date();
        today.setHours(9, 0, 0, 0); // Set to 9:00 AM
        dueDateInput.value = today.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:MM
    }
    
    // Initialize sort order labels
    updateSortOrderLabels();
    
    // Initialize task list height class
    if (taskListDiv) {
        taskListDiv.classList.add('filters-hidden');
    }
    
    // Auto-load recent tasks on startup (since it's the main view)
    setTimeout(() => {
        loadRecentTasks();
    }, 500);
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
    
    // Detail view elements
    detailTaskName = document.getElementById('detailTaskName');
    detailStatus = document.getElementById('detailStatus');
    detailPriority = document.getElementById('detailPriority');
    detailDueDate = document.getElementById('detailDueDate');
    detailDescription = document.getElementById('detailDescription');
    detailCreated = document.getElementById('detailCreated');
    detailUpdated = document.getElementById('detailUpdated');
    backBtn = document.getElementById('backBtn');
    saveBtn = document.getElementById('saveBtn');
    testSaveBtn = document.getElementById('testSaveBtn');
    detailStatusDiv = document.getElementById('detailStatusMsg');
    
    // Settings button
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            window.location.href = 'setup.html';
        });
    }
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
    
    // Detail view event listeners
    if (backBtn) {
        backBtn.addEventListener('click', () => switchToTasksView());
    }
    
    if (saveBtn) {
        saveBtn.addEventListener('click', saveTaskChanges);
    }
    
    if (testSaveBtn) {
        testSaveBtn.addEventListener('click', testSaveFunction);
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

// Helper function to switch to tasks view
function switchToTasksView() {
    const tasksTab = document.querySelector('[data-tab="tasks"]');
    const tasksContent = document.getElementById('tasks-tab');
    
    if (tasksTab && tasksContent) {
        // Remove active class from all tabs and contents
        document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // Add active class to tasks tab
        tasksTab.classList.add('active');
        tasksContent.classList.add('active');
        
        // Reset current task ID
        currentTaskId = null;
        
        // Load recent tasks
        loadRecentTasks();
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
        today.setHours(9, 0, 0, 0); // Set to 9:00 AM
        dueDateInput.value = today.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:MM
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
                page_size: 50, // Increased to get more tasks for filtering
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
        allTasks = data.results; // Store all tasks
        applyFiltersAndSort(); // Apply current filters and display
        
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
        // Extract task properties
        const title = task.properties['Task name']?.title?.[0]?.plain_text || 'Untitled Task';
        const status = task.properties['Status']?.status?.name || 'No Status';
        const priority = task.properties['Priority']?.select?.name || 'No Priority';
        const dueDate = task.properties['Due date']?.date?.start;
        
        // Format due date
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
        
        // Get priority class for color coding
        const priorityClass = priority.toLowerCase();
        
        // Truncate long titles
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
    console.log('Found task items:', taskItems.length);
    taskItems.forEach((item, index) => {
        const taskId = item.getAttribute('data-task-id');
        console.log(`Task ${index} ID:`, taskId);
        item.addEventListener('click', () => {
            console.log('Task clicked:', taskId);
            if (taskId) {
                openTaskDetail(taskId);
            }
        });
    });
}

// Quick add task with preset dates and smart defaults
async function quickAddTask(timeframe) {
    const taskName = taskInput?.value?.trim();
    
    if (!taskName) {
        updateStatus('Enter a task name first! ⚠️', true);
        if (taskInput) taskInput.focus();
        return;
    }
    
    try {
        updateStatus(`Adding task for ${timeframe}... ⏳`);
        
        // Calculate dates based on timeframe
        let dueDate, priority = 'Medium', description = '';
        const today = new Date();
        
        switch (timeframe) {
            case 'today':
                const todayDue = new Date(today);
                todayDue.setHours(17, 0, 0, 0); // 5:00 PM today
                dueDate = todayDue.toISOString().slice(0, 16);
                priority = 'High';
                description = 'Due today - high priority task';
                break;
                
            case 'tomorrow':
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(9, 0, 0, 0); // 9:00 AM tomorrow
                dueDate = tomorrow.toISOString().slice(0, 16);
                priority = 'Medium';
                description = 'Due tomorrow';
                break;
                
            case 'thisweek':
                const endOfWeek = new Date(today);
                endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
                endOfWeek.setHours(17, 0, 0, 0); // 5:00 PM end of week
                dueDate = endOfWeek.toISOString().slice(0, 16);
                priority = 'Medium';
                description = 'Due end of this week';
                break;
                
            case 'nextweek':
                const nextWeek = new Date(today);
                nextWeek.setDate(today.getDate() + 7);
                nextWeek.setHours(12, 0, 0, 0); // 12:00 PM next week
                dueDate = nextWeek.toISOString().slice(0, 16);
                priority = 'Low';
                description = 'Due next week';
                break;
        }
        
        // Create task with smart defaults
        const taskData = {
            parent: { database_id: DATABASE_ID },
            properties: {
                'Task name': {
                    title: [{ text: { content: taskName } }]
                }
            }
        };
        
        // Add priority
        try {
            taskData.properties['Priority'] = {
                select: { name: priority }
            };
        } catch (e) {
            console.log('Priority field issue, skipping');
        }
        
        // Add due date
        if (dueDate) {
            taskData.properties['Due date'] = {
                date: { start: dueDate }
            };
        }
        
        // Add smart description (combine user description with auto description)
        const userDescription = descriptionInput?.value?.trim();
        const finalDescription = userDescription ? `${userDescription}\n\n${description}` : description;
        
        if (finalDescription) {
            taskData.properties['Description'] = {
                rich_text: [{ text: { content: finalDescription } }]
            };
        }
        
        console.log('Sending quick task data:', taskData);
        
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
            console.error('API Error:', errorData);
            throw new Error(errorData.message || 'API Error');
        }
        
        const result = await response.json();
        console.log('Quick task added successfully:', result);
        
        updateStatus(`✅ Task added for ${timeframe.replace('thisweek', 'this week').replace('nextweek', 'next week')}!`);
        
        // Clear form after success
        setTimeout(() => {
            clearForm();
            // Switch to tasks view to show the new task
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
    
    try {
        updateStatus('Adding task... ⏳');
        
        // Use the exact property names from your database schema
        const taskData = {
            parent: { database_id: DATABASE_ID },
            properties: {
                'Task name': {
                    title: [{ text: { content: taskName } }]
                }
            }
        };
        
        // Add Status with correct format for status property type
        taskData.properties['Status'] = { 
            status: { name: 'Not started' } 
        };
        
        // Try to add Priority
        const priorityValue = prioritySelect?.value || 'Medium';
        try {
            taskData.properties['Priority'] = {
                select: { name: priorityValue }
            };
        } catch (e) {
            console.log('Priority field issue, skipping');
        }
        
        // Add due date if provided
        if (dueDateInput?.value) {
            taskData.properties['Due date'] = {
                date: { start: dueDateInput.value }
            };
        }
        
        // Add description if provided
        if (descriptionInput?.value?.trim()) {
            taskData.properties['Description'] = {
                rich_text: [{ text: { content: descriptionInput.value.trim() } }]
            };
        }
        
        console.log('Sending task data:', taskData);
        
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
            console.error('API Error:', errorData);
            
            // Provide more specific error messages
            let errorMessage = 'Unknown error';
            if (errorData.message) {
                errorMessage = errorData.message;
            } else if (errorData.code) {
                errorMessage = `Error code: ${errorData.code}`;
            }
            
            throw new Error(errorMessage);
        }
        
        const result = await response.json();
        console.log('Task added successfully:', result);
        
        updateStatus('✅ Task added successfully!');
        
        // Clear form after success
        setTimeout(() => {
            clearForm();
            // Switch to tasks view to show the new task
            switchToTasksView();
        }, 1000);
        
    } catch (error) {
        console.error('Error adding task:', error);
        updateStatus(`Error: ${error.message} ❌`, true);
        
        // Show suggestion for common fixes
        if (error.message.includes('status')) {
            setTimeout(() => {
                updateStatus('💡 Tip: Check your Notion database Status field options', true);
            }, 3000);
        }
    }
}

// Open task detail view
async function openTaskDetail(taskId) {
    console.log('Opening task detail for ID:', taskId);
    currentTaskId = taskId;
    
    try {
        // Show loading state
        switchToDetailView();
        updateDetailStatus('Loading task details... ⏳');
        
        // Fetch task details from Notion
        console.log('Fetching task details from API...');
        const response = await fetch(`${NOTION_API_BASE}/pages/${taskId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Notion-Version': NOTION_VERSION,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Task detail response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Task detail error response:', errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const taskData = await response.json();
        console.log('Task data received:', taskData);
        
        populateDetailView(taskData);
        updateDetailStatus('Ready to edit task details');
        
    } catch (error) {
        console.error('Error loading task details:', error);
        updateDetailStatus(`Error loading task: ${error.message}`, true);
    }
}

// Populate the detail view with task data
function populateDetailView(taskData) {
    if (!taskData || !taskData.properties) {
        console.error('Invalid task data:', taskData);
        updateDetailStatus('Invalid task data received ❌', true);
        return;
    }
    
    console.log('Populating detail view with:', taskData.properties);
    
    // Extract task properties with detailed logging
    const title = taskData.properties['Task name']?.title?.[0]?.plain_text || '';
    const status = taskData.properties['Status']?.status?.name || 'Not started';
    const priority = taskData.properties['Priority']?.select?.name || 'Medium';
    const dueDate = taskData.properties['Due date']?.date?.start || '';
    const description = taskData.properties['Description']?.rich_text?.[0]?.plain_text || '';
    
    console.log('Extracted values:', { title, status, priority, dueDate, description });
    
    // Populate form fields with error checking
    if (detailTaskName) {
        detailTaskName.value = title;
        console.log('Set task name:', title);
    } else {
        console.error('detailTaskName element not found');
    }
    
    if (detailStatus) {
        detailStatus.value = status;
        console.log('Set status:', status);
    } else {
        console.error('detailStatus element not found');
    }
    
    if (detailPriority) {
        detailPriority.value = priority;
        console.log('Set priority:', priority);
    } else {
        console.error('detailPriority element not found');
    }
    
    if (detailDueDate) {
        // Handle both date-only and datetime formats
        if (dueDate) {
            // If it's just a date (YYYY-MM-DD), add default time
            if (dueDate.length === 10) {
                detailDueDate.value = dueDate + 'T09:00'; // Add 9:00 AM
            } else {
                // If it's already datetime, extract the datetime-local format
                detailDueDate.value = dueDate.slice(0, 16); // YYYY-MM-DDTHH:MM
            }
        } else {
            detailDueDate.value = '';
        }
        console.log('Set due date:', detailDueDate.value);
    } else {
        console.error('detailDueDate element not found');
    }
    
    if (detailDescription) {
        detailDescription.value = description;
        console.log('Set description:', description);
    } else {
        console.error('detailDescription element not found');
    }
    
    // Show timestamps
    if (detailCreated) {
        const created = new Date(taskData.created_time).toLocaleString();
        detailCreated.textContent = created;
        console.log('Set created time:', created);
    }
    
    if (detailUpdated) {
        const updated = new Date(taskData.last_edited_time).toLocaleString();
        detailUpdated.textContent = updated;
        console.log('Set updated time:', updated);
    }
    
    console.log('Detail view populated successfully');
}

// Save task changes
async function saveTaskChanges() {
    if (!currentTaskId) {
        updateDetailStatus('No task selected to save ❌', true);
        return;
    }
    
    try {
        updateDetailStatus('Saving changes... ⏳');
        console.log('Saving task with ID:', currentTaskId);
        
        // Prepare update data
        const updateData = {
            properties: {}
        };
        
        // Update task name
        if (detailTaskName?.value?.trim()) {
            updateData.properties['Task name'] = {
                title: [{ text: { content: detailTaskName.value.trim() } }]
            };
            console.log('Updating task name to:', detailTaskName.value.trim());
        }
        
        // Update status
        if (detailStatus?.value) {
            updateData.properties['Status'] = {
                status: { name: detailStatus.value }
            };
            console.log('Updating status to:', detailStatus.value);
        }
        
        // Update priority
        if (detailPriority?.value) {
            updateData.properties['Priority'] = {
                select: { name: detailPriority.value }
            };
            console.log('Updating priority to:', detailPriority.value);
        }
        
        // Update due date
        if (detailDueDate?.value) {
            updateData.properties['Due date'] = {
                date: { start: detailDueDate.value }
            };
            console.log('Updating due date to:', detailDueDate.value);
        } else {
            updateData.properties['Due date'] = null;
            console.log('Clearing due date');
        }
        
        // Update description
        if (detailDescription?.value?.trim()) {
            updateData.properties['Description'] = {
                rich_text: [{ text: { content: detailDescription.value.trim() } }]
            };
            console.log('Updating description to:', detailDescription.value.trim());
        } else {
            updateData.properties['Description'] = {
                rich_text: []
            };
            console.log('Clearing description');
        }
        
        console.log('Full update data:', JSON.stringify(updateData, null, 2));
        console.log('🔍 Status property format check:', updateData.properties['Status']);
        console.log('🔍 Expected format: { status: { name: "value" } }');
        
        const response = await fetch(`${NOTION_API_BASE}/pages/${currentTaskId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Notion-Version': NOTION_VERSION,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        console.log('Update response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Update Error Response:', errorText);
            
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch (e) {
                errorData = { message: errorText };
            }
            
            console.error('Update Error Data:', errorData);
            throw new Error(errorData.message || `HTTP ${response.status}: Failed to update task`);
        }
        
        const result = await response.json();
        console.log('Task updated successfully:', result);
        
        updateDetailStatus('✅ Task updated successfully!');
        
        // Refresh the task list in the background to show changes
        setTimeout(() => {
            loadRecentTasks();
        }, 500);
        
        // Go back to tasks view after a delay
        setTimeout(() => {
            switchToTasksView();
        }, 1500);
        
    } catch (error) {
        console.error('Error updating task:', error);
        updateDetailStatus(`Error: ${error.message} ❌`, true);
        
        // Show more detailed error information
        if (error.message.includes('validation')) {
            setTimeout(() => {
                updateDetailStatus('💡 Tip: Check that all field values match your Notion database options', true);
            }, 3000);
        }
    }
}

// Switch to detail view
function switchToDetailView() {
    console.log('Switching to detail view');
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Hide all tabs and contents
    navTabs.forEach(tab => tab.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    
    // Show detail view
    const detailContent = document.getElementById('detail-tab');
    console.log('Detail content element:', detailContent);
    if (detailContent) {
        detailContent.classList.add('active');
        console.log('Detail view activated');
    } else {
        console.error('Detail tab element not found!');
    }
}

// Update detail view status
function updateDetailStatus(message, isError = false) {
    if (detailStatusDiv) {
        detailStatusDiv.textContent = message;
        detailStatusDiv.className = isError ? 'status status-error' : 'status';
    }
    console.log('Detail Status:', message);
}

// Apply filters and sorting to tasks
function applyFiltersAndSort() {
    if (!allTasks || allTasks.length === 0) {
        displayTasks([]);
        return;
    }
    
    let filteredTasks = [...allTasks];
    
    // Apply status filter
    if (filterStatus && filterStatus.value) {
        filteredTasks = filteredTasks.filter(task => {
            const status = task.properties['Status']?.status?.name || 'Not started';
            return status === filterStatus.value;
        });
    }
    
    // Apply priority filter
    if (filterPriority && filterPriority.value) {
        filteredTasks = filteredTasks.filter(task => {
            const priority = task.properties['Priority']?.select?.name || 'Medium';
            return priority === filterPriority.value;
        });
    }
    
    // Apply search filter
    if (searchInput && searchInput.value.trim()) {
        const searchTerm = searchInput.value.trim().toLowerCase();
        filteredTasks = filteredTasks.filter(task => {
            const title = task.properties['Task name']?.title?.[0]?.plain_text || '';
            const description = task.properties['Description']?.rich_text?.[0]?.plain_text || '';
            return title.toLowerCase().includes(searchTerm) || 
                   description.toLowerCase().includes(searchTerm);
        });
    }
    
    // Apply sorting
    if (sortBy && sortBy.value) {
        const sortField = sortBy.value;
        const order = sortOrder && sortOrder.value === 'asc' ? 1 : -1;
        
        filteredTasks.sort((a, b) => {
            let aValue, bValue;
            
            switch (sortField) {
                case 'created_time':
                    aValue = new Date(a.created_time);
                    bValue = new Date(b.created_time);
                    break;
                case 'last_edited_time':
                    aValue = new Date(a.last_edited_time);
                    bValue = new Date(b.last_edited_time);
                    break;
                case 'due_date':
                    aValue = a.properties['Due date']?.date?.start ? new Date(a.properties['Due date'].date.start) : new Date(0);
                    bValue = b.properties['Due date']?.date?.start ? new Date(b.properties['Due date'].date.start) : new Date(0);
                    break;
                case 'priority':
                    const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
                    aValue = priorityOrder[a.properties['Priority']?.select?.name] || 2;
                    bValue = priorityOrder[b.properties['Priority']?.select?.name] || 2;
                    break;
                case 'title':
                    aValue = a.properties['Task name']?.title?.[0]?.plain_text || '';
                    bValue = b.properties['Task name']?.title?.[0]?.plain_text || '';
                    return order * aValue.localeCompare(bValue);
                default:
                    aValue = new Date(a.created_time);
                    bValue = new Date(b.created_time);
            }
            
            if (aValue < bValue) return -1 * order;
            if (aValue > bValue) return 1 * order;
            return 0;
        });
    }
    
    displayTasks(filteredTasks);
    
    // Update the header to show filtered count
    const headerSpan = document.querySelector('#tasks-tab .section-header span');
    if (headerSpan) {
        const totalTasks = allTasks.length;
        const filteredCount = filteredTasks.length;
        
        if (filteredCount === totalTasks) {
            headerSpan.textContent = `📋 Your Tasks (${totalTasks})`;
        } else {
            headerSpan.textContent = `📋 Your Tasks (${filteredCount}/${totalTasks})`;
        }
    }
}

// Clear all filters and search
function clearAllFilters() {
    if (filterStatus) filterStatus.value = '';
    if (filterPriority) filterPriority.value = '';
    if (searchInput) searchInput.value = '';
    if (sortBy) sortBy.value = 'created_time';
    if (sortOrder) sortOrder.value = 'desc';
    
    updateSortOrderLabels();
    applyFiltersAndSort();
}

// Update sort order labels based on selected sort field
function updateSortOrderLabels() {
    if (!sortBy || !sortOrder) return;
    
    const sortField = sortBy.value;
    const orderSelect = sortOrder;
    
    // Clear existing options
    orderSelect.innerHTML = '';
    
    switch (sortField) {
        case 'created_time':
        case 'last_edited_time':
            orderSelect.innerHTML = `
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
            `;
            break;
        case 'due_date':
            orderSelect.innerHTML = `
                <option value="asc">Due Soon First</option>
                <option value="desc">Due Later First</option>
            `;
            break;
        case 'priority':
            orderSelect.innerHTML = `
                <option value="desc">High to Low</option>
                <option value="asc">Low to High</option>
            `;
            break;
        case 'title':
            orderSelect.innerHTML = `
                <option value="asc">A to Z</option>
                <option value="desc">Z to A</option>
            `;
            break;
        default:
            orderSelect.innerHTML = `
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
            `;
    }
}

// Toggle filter controls visibility
function toggleFilters() {
    if (!controlsSection || !toggleFiltersBtn || !taskListDiv) return;
    
    filtersVisible = !filtersVisible;
    
    if (filtersVisible) {
        // Show filters
        controlsSection.style.display = 'block';
        setTimeout(() => {
            controlsSection.classList.remove('hidden');
        }, 10);
        
        toggleFiltersBtn.textContent = '🔧 Hide Filters';
        toggleFiltersBtn.classList.add('toggle-filters-active');
        taskListDiv.classList.remove('filters-hidden');
        taskListDiv.classList.add('filters-shown');
    } else {
        // Hide filters
        controlsSection.classList.add('hidden');
        setTimeout(() => {
            controlsSection.style.display = 'none';
        }, 300);
        
        toggleFiltersBtn.textContent = '🔧 Filters';
        toggleFiltersBtn.classList.remove('toggle-filters-active');
        taskListDiv.classList.remove('filters-shown');
        taskListDiv.classList.add('filters-hidden');
        
        // Clear all filters when hiding
        clearAllFilters();
    }
}

// Test save function for debugging
function testSaveFunction() {
    console.log('=== TESTING SAVE FUNCTION ===');
    console.log('Current task ID:', currentTaskId);
    console.log('Detail elements check:');
    console.log('- detailTaskName:', detailTaskName, detailTaskName?.value);
    console.log('- detailStatus:', detailStatus, detailStatus?.value);
    console.log('- detailPriority:', detailPriority, detailPriority?.value);
    console.log('- detailDueDate:', detailDueDate, detailDueDate?.value);
    console.log('- detailDescription:', detailDescription, detailDescription?.value);
    console.log('- saveBtn:', saveBtn);
    console.log('- detailStatusDiv:', detailStatusDiv);
    
    if (!currentTaskId) {
        updateDetailStatus('🧪 Test: No task ID set!', true);
        return;
    }
    
    updateDetailStatus('🧪 Test: All elements found, calling save...');
    
    // Call the actual save function
    setTimeout(() => {
        saveTaskChanges();
    }, 1000);
}
