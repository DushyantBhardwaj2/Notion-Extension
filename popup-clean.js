// Clean Popup Implementation
console.log('🚀 Clean popup loading...');

class TodoApp {
    constructor() {
        this.oauth = new NotionOAuth();
        this.currentAuth = null;
        this.init();
    }

    async init() {
        console.log('📱 Initializing Todo App...');
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Check authentication status
        await this.checkAuthStatus();
        
        // Set default due date
        this.setDefaultDueDate();
        
        console.log('✅ Todo App initialized');
    }

    setupEventListeners() {
        // Authentication
        document.getElementById('signInBtn').addEventListener('click', () => this.signIn());
        document.getElementById('disconnectBtn').addEventListener('click', () => this.disconnect());
        
        // Todo form
        document.getElementById('addTaskBtn').addEventListener('click', () => this.addTask());
        document.getElementById('clearFormBtn').addEventListener('click', () => this.clearForm());
        
        // Enter key for task input
        document.getElementById('taskTitle').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addTask();
            }
        });
    }

    async checkAuthStatus() {
        try {
            this.showLoading('Checking authentication...');
            
            const auth = await this.oauth.getStoredAuth();
            
            if (auth && auth.authenticated) {
                // Validate token
                const isValid = await this.oauth.validateToken(auth.notionAccessToken);
                
                if (isValid) {
                    this.currentAuth = auth;
                    this.showTodoInterface();
                    this.showUserInfo(auth);
                    this.loadRecentTasks();
                } else {
                    // Token invalid, clear and show auth
                    await this.oauth.clearAuth();
                    this.showAuthInterface();
                }
            } else {
                this.showAuthInterface();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.showAuthInterface();
            this.showStatus('Error checking authentication', 'error', 'authStatus');
        }
    }

    async signIn() {
        try {
            this.showLoading('Connecting to Notion...');
            this.showStatus('Starting authentication...', 'info', 'authStatus');
            
            const auth = await this.oauth.authenticate();
            
            this.currentAuth = auth;
            this.showTodoInterface();
            this.showUserInfo(auth);
            this.showStatus('Successfully connected to Notion!', 'success', 'todoStatus');
            
            // Load any existing tasks
            setTimeout(() => this.loadRecentTasks(), 1000);
            
        } catch (error) {
            console.error('Sign in failed:', error);
            this.showAuthInterface();
            this.showStatus(`Sign in failed: ${error.message}`, 'error', 'authStatus');
        }
    }

    async disconnect() {
        try {
            await this.oauth.disconnect();
            this.currentAuth = null;
            this.showAuthInterface();
            this.showStatus('Disconnected successfully', 'info', 'authStatus');
        } catch (error) {
            console.error('Disconnect failed:', error);
            this.showStatus(`Disconnect failed: ${error.message}`, 'error', 'todoStatus');
        }
    }

    async addTask() {
        if (!this.currentAuth) {
            this.showStatus('Please sign in first', 'error', 'todoStatus');
            return;
        }

        const title = document.getElementById('taskTitle').value.trim();
        const priority = document.getElementById('taskPriority').value;
        const category = document.getElementById('taskCategory').value;
        const dueDate = document.getElementById('taskDueDate').value;
        const estimate = document.getElementById('taskEstimate').value;
        const energy = document.getElementById('taskEnergy').value;
        const context = document.getElementById('taskContext').value;
        const description = document.getElementById('taskDescription').value.trim();
        const link = document.getElementById('taskLink').value.trim();
        
        // Get selected tags
        const tagSelect = document.getElementById('taskTags');
        const selectedTags = Array.from(tagSelect.selectedOptions).map(option => ({ name: option.value }));

        if (!title) {
            this.showStatus('Please enter a task title', 'error', 'todoStatus');
            return;
        }

        try {
            this.showStatus('Adding comprehensive task...', 'info', 'todoStatus');
            
            // Get database info
            const database = await this.oauth.getStoredDatabase();
            if (!database) {
                throw new Error('No database found. Please reconnect to setup workspace.');
            }

            // Create comprehensive task data
            const taskData = {
                parent: {
                    database_id: database.id
                },
                properties: {
                    "Task": {
                        title: [
                            {
                                text: {
                                    content: title
                                }
                            }
                        ]
                    },
                    "Status": {
                        select: {
                            name: "📋 Not Started"
                        }
                    },
                    "Priority": {
                        select: {
                            name: priority
                        }
                    },
                    "Category": {
                        select: {
                            name: category
                        }
                    },
                    "Energy": {
                        select: {
                            name: energy
                        }
                    },
                    "Context": {
                        select: {
                            name: context
                        }
                    },
                    "Progress": {
                        number: 0
                    }
                }
            };

            // Add estimate if specified
            if (estimate) {
                taskData.properties["Estimate"] = {
                    select: {
                        name: estimate
                    }
                };
            }

            // Add due date if specified
            if (dueDate) {
                taskData.properties["Due Date"] = {
                    date: {
                        start: new Date(dueDate).toISOString()
                    }
                };
            }

            // Add description if specified
            if (description) {
                taskData.properties["Description"] = {
                    rich_text: [
                        {
                            text: {
                                content: description
                            }
                        }
                    ]
                };
            }

            // Add link if specified
            if (link) {
                taskData.properties["Link"] = {
                    url: link
                };
            }

            // Add tags if selected
            if (selectedTags.length > 0) {
                taskData.properties["Tags"] = {
                    multi_select: selectedTags
                };
            }

            const response = await fetch('https://api.notion.com/v1/pages', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.currentAuth.notionAccessToken}`,
                    'Content-Type': 'application/json',
                    'Notion-Version': '2022-06-28'
                },
                body: JSON.stringify(taskData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to create task: ${errorText}`);
            }

            const task = await response.json();
            
            this.clearForm();
            this.showStatus('✅ Comprehensive task added successfully!', 'success', 'todoStatus');
            
            // Refresh recent tasks
            setTimeout(() => this.loadRecentTasks(), 500);
            
        } catch (error) {
            console.error('Add task failed:', error);
            this.showStatus(`Failed to add task: ${error.message}`, 'error', 'todoStatus');
        }
    }

    async loadRecentTasks() {
        if (!this.currentAuth) return;

        try {
            const database = await this.oauth.getStoredDatabase();
            if (!database) return;

            const response = await fetch(`https://api.notion.com/v1/databases/${database.id}/query`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.currentAuth.notionAccessToken}`,
                    'Content-Type': 'application/json',
                    'Notion-Version': '2022-06-28'
                },
                body: JSON.stringify({
                    sorts: [
                        {
                            property: "Created",
                            direction: "descending"
                        }
                    ],
                    page_size: 5
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.displayRecentTasks(data.results);
            }
        } catch (error) {
            console.error('Failed to load recent tasks:', error);
        }
    }

    displayRecentTasks(tasks) {
        const taskList = document.getElementById('taskList');
        const recentTasks = document.getElementById('recentTasks');

        if (!tasks || tasks.length === 0) {
            recentTasks.style.display = 'none';
            return;
        }

        taskList.innerHTML = '';
        
        tasks.forEach(task => {
            const title = task.properties.Task?.title?.[0]?.text?.content || 'Untitled';
            const priority = task.properties.Priority?.select?.name || '📊 Medium';
            const status = task.properties.Status?.select?.name || '📋 Not Started';
            const category = task.properties.Category?.select?.name || '';
            const estimate = task.properties.Estimate?.select?.name || '';
            const dueDate = task.properties['Due Date']?.date?.start;
            const progress = task.properties.Progress?.number || 0;
            const tags = task.properties.Tags?.multi_select || [];

            const taskElement = document.createElement('div');
            
            // Determine priority class for styling
            let priorityClass = 'low-priority';
            if (priority.includes('🔥') || priority.includes('Urgent')) priorityClass = 'urgent-priority';
            else if (priority.includes('⚡') || priority.includes('High')) priorityClass = 'high-priority';
            else if (priority.includes('📊') || priority.includes('Medium')) priorityClass = 'medium-priority';
            
            taskElement.className = `task-item ${priorityClass}`;
            
            // Build date info
            let dueDateText = '';
            if (dueDate) {
                const date = new Date(dueDate);
                const now = new Date();
                const isOverdue = date < now && !status.includes('Completed');
                const dateStr = date.toLocaleDateString();
                dueDateText = isOverdue ? ` • 🚨 Due: ${dateStr}` : ` • 📅 Due: ${dateStr}`;
            }

            // Build estimate info
            let estimateText = estimate ? ` • ${estimate}` : '';

            // Build category info
            let categoryText = category ? ` • ${category}` : '';

            // Build tags info
            let tagsText = tags.length > 0 ? ` • 🏷️ ${tags.map(tag => tag.name).join(', ')}` : '';

            // Build progress bar
            let progressBar = '';
            if (progress > 0) {
                progressBar = `<div style="background: rgba(255,255,255,0.2); height: 4px; border-radius: 2px; margin: 4px 0;"><div style="background: #10b981; height: 100%; width: ${progress}%; border-radius: 2px;"></div></div>`;
            }

            taskElement.innerHTML = `
                <h4>${title}</h4>
                <p style="font-size: 11px; opacity: 0.9;">${status} • ${priority}${categoryText}${estimateText}${dueDateText}${tagsText}</p>
                ${progressBar}
            `;
            
            taskList.appendChild(taskElement);
        });

        recentTasks.style.display = 'block';
    }

    clearForm() {
        document.getElementById('taskTitle').value = '';
        document.getElementById('taskPriority').value = '📊 Medium';
        document.getElementById('taskCategory').value = '🏠 Personal';
        document.getElementById('taskDueDate').value = '';
        document.getElementById('taskEstimate').value = '';
        document.getElementById('taskEnergy').value = '🪫 Low Energy';
        document.getElementById('taskContext').value = '💻 Computer';
        document.getElementById('taskDescription').value = '';
        document.getElementById('taskLink').value = '';
        
        // Clear tags selection
        const tagSelect = document.getElementById('taskTags');
        for (let option of tagSelect.options) {
            option.selected = false;
        }
        
        this.setDefaultDueDate();
    }

    setDefaultDueDate() {
        const dueDateInput = document.getElementById('taskDueDate');
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        dueDateInput.value = tomorrow.toISOString().slice(0, 16);
    }

    showAuthInterface() {
        document.getElementById('authSection').style.display = 'block';
        document.getElementById('loadingSection').style.display = 'none';
        document.getElementById('todoSection').style.display = 'none';
    }

    showTodoInterface() {
        document.getElementById('authSection').style.display = 'none';
        document.getElementById('loadingSection').style.display = 'none';
        document.getElementById('todoSection').style.display = 'block';
    }

    showLoading(message = 'Loading...') {
        document.getElementById('authSection').style.display = 'none';
        document.getElementById('todoSection').style.display = 'none';
        document.getElementById('loadingSection').style.display = 'block';
        document.querySelector('#loadingSection p').textContent = message;
    }

    showUserInfo(auth) {
        const userInfo = document.getElementById('userInfo');
        const userName = document.getElementById('userName');
        const workspaceName = document.getElementById('workspaceName');

        userName.textContent = auth.notionUserName || auth.notionUserEmail || 'Notion User';
        workspaceName.textContent = `📊 ${auth.notionWorkspaceName || 'Notion Workspace'}`;
        
        userInfo.style.display = 'block';
    }

    showStatus(message, type = 'info', elementId = 'todoStatus') {
        const statusElement = document.getElementById(elementId);
        if (!statusElement) return;

        statusElement.textContent = message;
        statusElement.className = `status ${type}`;
        statusElement.style.display = 'block';

        // Auto hide after 5 seconds for success messages
        if (type === 'success') {
            setTimeout(() => {
                statusElement.style.display = 'none';
            }, 5000);
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.todoApp = new TodoApp();
});
