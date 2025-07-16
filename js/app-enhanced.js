// Enhanced Multi-Screen Application
class EnhancedTodoApp {
    constructor() {
        this.oauth = new NotionOAuth();
        this.calendarService = new CalendarService(this.oauth);
        this.currentAuth = null;
        this.currentScreen = 'tasks';
        this.taskData = [];
        this.calendarView = null;
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Enhanced Todo App...');
        
        // Check authentication status
        await this.checkAuthStatus();
        
        // Initialize calendar service if authenticated
        if (this.currentAuth) {
            await this.calendarService.initialize();
        }
        
        console.log('✅ Enhanced Todo App initialized');
    }

    async checkAuthStatus() {
        try {
            this.showLoading('Checking authentication...');
            
            const auth = await this.oauth.getStoredAuth();
            
            if (auth && auth.authenticated) {
                const isValid = await this.oauth.validateToken(auth.notionAccessToken);
                
                if (isValid) {
                    this.currentAuth = auth;
                    this.showMainInterface();
                    await this.loadInitialData();
                } else {
                    await this.oauth.clearAuth();
                    this.showAuthInterface();
                }
            } else {
                this.showAuthInterface();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.showAuthInterface();
            this.showStatus('Error checking authentication', 'error');
        }
    }

    showMainInterface() {
        document.body.innerHTML = this.getMainInterfaceHTML();
        this.setupMainEventListeners();
        this.switchToScreen(this.currentScreen);
    }

    getMainInterfaceHTML() {
        return `
            <div class="app-container">
                <div class="app-header">
                    <div class="app-title">
                        <h1>📝 Notion Tasks</h1>
                        <div class="user-info" id="userInfo"></div>
                    </div>
                    <div class="header-actions">
                        <button class="action-btn" id="syncBtn" title="Sync Now">🔄</button>
                        <button class="action-btn" id="settingsBtn" title="Settings">⚙️</button>
                    </div>
                </div>

                <nav class="tab-navigation">
                    <button class="tab-btn ${this.currentScreen === 'tasks' ? 'active' : ''}" data-screen="tasks">
                        📋 Tasks
                    </button>
                    <button class="tab-btn ${this.currentScreen === 'calendar' ? 'active' : ''}" data-screen="calendar">
                        📅 Calendar
                    </button>
                    <button class="tab-btn ${this.currentScreen === 'analytics' ? 'active' : ''}" data-screen="analytics">
                        📊 Analytics
                    </button>
                </nav>

                <main class="app-content" id="appContent">
                    <div class="loading">Loading...</div>
                </main>

                <div class="status-bar" id="statusBar"></div>
            </div>
        `;
    }

    setupMainEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchToScreen(e.target.dataset.screen);
            });
        });

        // Header actions
        document.getElementById('syncBtn').addEventListener('click', () => this.forceSync());
        document.getElementById('settingsBtn').addEventListener('click', () => this.switchToScreen('settings'));
    }

    async switchToScreen(screenName) {
        this.currentScreen = screenName;
        
        // Update tab states
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.screen === screenName);
        });

        // Render screen content
        const contentDiv = document.getElementById('appContent');
        contentDiv.innerHTML = '<div class="loading">Loading...</div>';

        try {
            switch (screenName) {
                case 'tasks':
                    await this.renderTasksScreen(contentDiv);
                    break;
                case 'calendar':
                    await this.renderCalendarScreen(contentDiv);
                    break;
                case 'analytics':
                    await this.renderAnalyticsScreen(contentDiv);
                    break;
                case 'settings':
                    await this.renderSettingsScreen(contentDiv);
                    break;
                default:
                    contentDiv.innerHTML = '<div class="error">Unknown screen</div>';
            }
        } catch (error) {
            console.error(`Failed to render ${screenName} screen:`, error);
            contentDiv.innerHTML = `<div class="error">Failed to load ${screenName} screen</div>`;
        }
    }

    // TASKS SCREEN
    async renderTasksScreen(container) {
        await this.loadTaskData();
        
        container.innerHTML = `
            <div class="tasks-screen">
                <div class="tasks-header">
                    <div class="task-actions">
                        <button class="primary-btn" id="addTaskBtn">+ Add Task</button>
                        <button class="secondary-btn" id="filtersBtn">🔍 Filters</button>
                    </div>
                    <div class="task-search">
                        <input type="text" id="taskSearch" placeholder="Search tasks..." />
                    </div>
                </div>

                <div class="task-views">
                    <div class="view-selector">
                        <button class="view-btn active" data-view="today">Today</button>
                        <button class="view-btn" data-view="week">This Week</button>
                        <button class="view-btn" data-view="all">All Tasks</button>
                        <button class="view-btn" data-view="completed">Completed</button>
                    </div>
                </div>

                <div class="task-content">
                    ${this.renderTaskGroups()}
                </div>
            </div>
        `;

        this.setupTasksEventListeners(container);
    }

    renderTaskGroups() {
        const today = new Date();
        const todayTasks = this.getTasksForDate(today);
        const overdueTasks = this.getOverdueTasks();
        const upcomingTasks = this.getUpcomingTasks();

        return `
            ${overdueTasks.length > 0 ? `
                <div class="task-group overdue">
                    <div class="group-header">
                        <h3>⚠️ Overdue (${overdueTasks.length})</h3>
                        <button class="group-action">Reschedule All</button>
                    </div>
                    <div class="task-list">
                        ${overdueTasks.map(task => this.renderTaskItem(task)).join('')}
                    </div>
                </div>
            ` : ''}

            <div class="task-group today">
                <div class="group-header">
                    <h3>🔥 Today (${todayTasks.length})</h3>
                    <div class="group-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${this.getCompletionRate(todayTasks)}%"></div>
                        </div>
                        <span>${this.getCompletionRate(todayTasks).toFixed(0)}%</span>
                    </div>
                </div>
                <div class="task-list">
                    ${todayTasks.length > 0 ? 
                        todayTasks.map(task => this.renderTaskItem(task)).join('') :
                        '<div class="empty-state">No tasks due today. Great job! 🎉</div>'
                    }
                </div>
            </div>

            <div class="task-group upcoming">
                <div class="group-header">
                    <h3>📅 This Week (${upcomingTasks.length})</h3>
                    <button class="group-action">Plan Week</button>
                </div>
                <div class="task-list">
                    ${upcomingTasks.map(task => this.renderTaskItem(task)).join('')}
                </div>
            </div>
        `;
    }

    renderTaskItem(task) {
        const dueDate = task.dueDate ? new Date(task.dueDate) : null;
        const isOverdue = dueDate && dueDate < new Date() && task.status !== 'Completed';
        const priorityClass = `priority-${task.priority?.toLowerCase() || 'medium'}`;
        
        return `
            <div class="task-item ${task.status?.toLowerCase() || 'not-started'} ${priorityClass} ${isOverdue ? 'overdue' : ''}" 
                 data-task-id="${task.id}">
                <div class="task-checkbox">
                    <input type="checkbox" ${task.status === 'Completed' ? 'checked' : ''} 
                           onchange="app.toggleTaskComplete('${task.id}', this.checked)" />
                </div>
                <div class="task-content" onclick="app.openTaskDetail('${task.id}')">
                    <div class="task-title">${task.title}</div>
                    <div class="task-meta">
                        <span class="task-priority ${priorityClass}">${task.priority || 'Medium'}</span>
                        ${task.category ? `<span class="task-category">${task.category}</span>` : ''}
                        ${dueDate ? `<span class="task-due ${isOverdue ? 'overdue' : ''}">${this.formatDate(dueDate)}</span>` : ''}
                        ${task.estimate ? `<span class="task-estimate">${task.estimate}h</span>` : ''}
                    </div>
                    ${task.description ? `<div class="task-description">${task.description.substring(0, 100)}...</div>` : ''}
                </div>
                <div class="task-actions">
                    <button class="action-btn" onclick="app.rescheduleTask('${task.id}')" title="Reschedule">📅</button>
                    <button class="action-btn" onclick="app.convertTaskToEvent('${task.id}')" title="Add to Calendar">🗓️</button>
                    <button class="action-btn" onclick="app.duplicateTask('${task.id}')" title="Duplicate">📋</button>
                </div>
            </div>
        `;
    }

    setupTasksEventListeners(container) {
        // Add task button
        container.querySelector('#addTaskBtn').addEventListener('click', () => this.showAddTaskModal());
        
        // Search functionality
        const searchInput = container.querySelector('#taskSearch');
        searchInput.addEventListener('input', (e) => this.filterTasks(e.target.value));

        // View selector
        container.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                container.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.filterTaskView(e.target.dataset.view);
            });
        });
    }

    // CALENDAR SCREEN
    async renderCalendarScreen(container) {
        if (!this.calendarView) {
            this.calendarView = new CalendarView(this.calendarService);
            window.calendarView = this.calendarView; // Make available globally
        }

        // Create calendar screen wrapper
        const calendarScreenHtml = `
            <div class="calendar-screen">
                <div class="calendar-header">
                    <h2>📅 Calendar</h2>
                    <div class="calendar-actions">
                        <button class="btn btn-primary" id="addEventBtn">
                            ➕ Add Event
                        </button>
                        <button class="btn btn-secondary" id="refreshCalendarBtn">
                            🔄 Refresh
                        </button>
                    </div>
                </div>
                <div class="calendar-container" id="calendarContainer">
                    <div class="loading">Loading calendar...</div>
                </div>
            </div>
        `;

        container.innerHTML = calendarScreenHtml;

        // Set up event listeners for calendar actions
        const addEventBtn = container.querySelector('#addEventBtn');
        const refreshBtn = container.querySelector('#refreshCalendarBtn');
        const calendarContainer = container.querySelector('#calendarContainer');

        addEventBtn.addEventListener('click', () => {
            this.showEventForm();
        });

        refreshBtn.addEventListener('click', async () => {
            this.showStatus('Refreshing calendar...', 'info');
            await this.renderCalendarScreen(container);
            this.showStatus('Calendar refreshed', 'success');
        });

        // Render the actual calendar view
        try {
            const calendarElement = await this.calendarView.render();
            calendarContainer.innerHTML = '';
            calendarContainer.appendChild(calendarElement);

            // Set up calendar event listeners
            this.setupCalendarEventListeners(calendarContainer);
        } catch (error) {
            console.error('Failed to render calendar:', error);
            calendarContainer.innerHTML = `
                <div class="error-message">
                    <p>Failed to load calendar</p>
                    <button class="btn btn-secondary" onclick="location.reload()">Retry</button>
                </div>
            `;
        }
    }

    // Show event creation/editing form
    showEventForm(eventData = null) {
        // Create modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.style.zIndex = '10000';

        // Create form container
        const formContainer = document.createElement('div');
        formContainer.style.display = 'flex';
        formContainer.style.alignItems = 'center';
        formContainer.style.justifyContent = 'center';
        formContainer.style.minHeight = '100vh';
        formContainer.style.padding = '20px';

        // Initialize event form
        const eventForm = new CalendarEventForm(formContainer, this.calendarService);
        
        // Set up form event listeners
        formContainer.addEventListener('eventSaved', async (e) => {
            modalOverlay.remove();
            this.showStatus('Event saved successfully!', 'success');
            
            // Refresh calendar view
            const contentDiv = document.getElementById('appContent');
            if (contentDiv && this.currentScreen === 'calendar') {
                await this.renderCalendarScreen(contentDiv);
            }
        });

        formContainer.addEventListener('eventDeleted', async (e) => {
            modalOverlay.remove();
            this.showStatus('Event deleted successfully!', 'success');
            
            // Refresh calendar view
            const contentDiv = document.getElementById('appContent');
            if (contentDiv && this.currentScreen === 'calendar') {
                await this.renderCalendarScreen(contentDiv);
            }
        });

        formContainer.addEventListener('formCancelled', () => {
            modalOverlay.remove();
        });

        // Render the form
        eventForm.render(eventData);

        // Add to modal and show
        modalOverlay.appendChild(formContainer);
        document.body.appendChild(modalOverlay);

        // Close on overlay click
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.remove();
            }
        });
    }

    // Setup calendar-specific event listeners
    setupCalendarEventListeners(container) {
        // Listen for calendar event clicks
        container.addEventListener('click', (e) => {
            const eventElement = e.target.closest('.calendar-event');
            if (eventElement && eventElement.dataset.eventId) {
                this.handleCalendarEventClick(eventElement.dataset.eventId);
            }
        });

        // Listen for date clicks to create new events
        container.addEventListener('click', (e) => {
            const dateCell = e.target.closest('.calendar-day');
            if (dateCell && dateCell.dataset.date && !e.target.closest('.calendar-event')) {
                this.handleDateClick(dateCell.dataset.date);
            }
        });
    }

    // Handle clicking on an existing calendar event
    async handleCalendarEventClick(eventId) {
        try {
            this.showStatus('Loading event details...', 'info');
            
            // Fetch event details from calendar service
            const events = await this.calendarService.getCalendarEvents(
                new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
                new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)  // 30 days from now
            );
            
            const event = events.find(e => e.id === eventId);
            if (event) {
                this.showEventForm(event);
            } else {
                this.showStatus('Event not found', 'error');
            }
        } catch (error) {
            console.error('Failed to load event details:', error);
            this.showStatus('Failed to load event details', 'error');
        }
    }

    // Handle clicking on a date to create new event
    handleDateClick(dateString) {
        const selectedDate = new Date(dateString);
        const eventData = {
            startTime: selectedDate,
            allDay: false
        };
        this.showEventForm(eventData);
    }

    // ANALYTICS SCREEN
    async renderAnalyticsScreen(container) {
        const analyticsData = await this.generateAnalytics();
        
        container.innerHTML = `
            <div class="analytics-screen">
                <div class="analytics-header">
                    <h2>📊 Productivity Analytics</h2>
                    <div class="time-range-selector">
                        <button class="range-btn active" data-range="week">This Week</button>
                        <button class="range-btn" data-range="month">This Month</button>
                        <button class="range-btn" data-range="quarter">This Quarter</button>
                    </div>
                </div>

                <div class="analytics-grid">
                    <div class="analytics-card">
                        <h3>📈 Completion Stats</h3>
                        <div class="stat-big">
                            <span class="stat-number">${analyticsData.completionRate}%</span>
                            <span class="stat-label">Completion Rate</span>
                        </div>
                        <div class="stat-details">
                            <div class="stat-item">
                                <span class="stat-value">${analyticsData.completedTasks}</span>
                                <span class="stat-label">Completed</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-value">${analyticsData.totalTasks}</span>
                                <span class="stat-label">Total</span>
                            </div>
                        </div>
                    </div>

                    <div class="analytics-card">
                        <h3>⏰ Time Analysis</h3>
                        <div class="stat-big">
                            <span class="stat-number">${analyticsData.avgTaskTime}</span>
                            <span class="stat-label">Avg Task Time</span>
                        </div>
                        <div class="productivity-chart">
                            ${this.renderProductivityChart(analyticsData.dailyStats)}
                        </div>
                    </div>

                    <div class="analytics-card">
                        <h3>🎯 Focus Areas</h3>
                        <div class="category-breakdown">
                            ${analyticsData.categories.map(cat => `
                                <div class="category-item">
                                    <div class="category-bar">
                                        <div class="category-fill" style="width: ${cat.percentage}%"></div>
                                    </div>
                                    <span class="category-name">${cat.name}</span>
                                    <span class="category-count">${cat.count}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="analytics-card">
                        <h3>💡 Insights</h3>
                        <div class="insights-list">
                            ${analyticsData.insights.map(insight => `
                                <div class="insight-item">
                                    <div class="insight-icon">${insight.icon}</div>
                                    <div class="insight-text">${insight.text}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // SETTINGS SCREEN
    async renderSettingsScreen(container) {
        const auth = this.currentAuth;
        
        container.innerHTML = `
            <div class="settings-screen">
                <div class="settings-header">
                    <h2>⚙️ Settings</h2>
                </div>

                <div class="settings-sections">
                    <div class="settings-section">
                        <h3>👤 Account</h3>
                        <div class="setting-item">
                            <div class="setting-info">
                                <div class="setting-label">Connected Account</div>
                                <div class="setting-value">${auth.workspaceName || 'Personal Workspace'}</div>
                            </div>
                            <button class="secondary-btn" onclick="app.disconnect()">Disconnect</button>
                        </div>
                        <div class="setting-item">
                            <div class="setting-info">
                                <div class="setting-label">Database</div>
                                <div class="setting-value">Task Manager (Auto-created)</div>
                            </div>
                            <button class="secondary-btn" onclick="app.openInNotion()">Open in Notion</button>
                        </div>
                    </div>

                    <div class="settings-section">
                        <h3>🔔 Notifications</h3>
                        <div class="setting-item">
                            <label class="setting-toggle">
                                <input type="checkbox" checked />
                                <span class="toggle-slider"></span>
                                <span class="setting-label">Desktop notifications</span>
                            </label>
                        </div>
                        <div class="setting-item">
                            <label class="setting-toggle">
                                <input type="checkbox" checked />
                                <span class="toggle-slider"></span>
                                <span class="setting-label">Due date reminders</span>
                            </label>
                        </div>
                    </div>

                    <div class="settings-section">
                        <h3>🔄 Sync</h3>
                        <div class="setting-item">
                            <div class="setting-info">
                                <div class="setting-label">Auto-sync interval</div>
                                <select class="setting-select">
                                    <option value="5">Every 5 minutes</option>
                                    <option value="15">Every 15 minutes</option>
                                    <option value="30">Every 30 minutes</option>
                                </select>
                            </div>
                        </div>
                        <div class="setting-item">
                            <div class="setting-info">
                                <div class="setting-label">Last sync</div>
                                <div class="setting-value">2 minutes ago</div>
                            </div>
                            <button class="secondary-btn" onclick="app.forceSync()">Sync Now</button>
                        </div>
                    </div>

                    <div class="settings-section">
                        <h3>🎨 Appearance</h3>
                        <div class="setting-item">
                            <div class="setting-info">
                                <div class="setting-label">Theme</div>
                                <div class="theme-selector">
                                    <label><input type="radio" name="theme" value="light" /> Light</label>
                                    <label><input type="radio" name="theme" value="dark" checked /> Dark</label>
                                    <label><input type="radio" name="theme" value="auto" /> Auto</label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Task management methods
    async loadTaskData() {
        try {
            const database = await this.oauth.getStoredDatabase();
            if (!database) return;

            const auth = await this.oauth.getStoredAuth();
            const response = await fetch(`https://api.notion.com/v1/databases/${database.id}/query`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${auth.notionAccessToken}`,
                    'Content-Type': 'application/json',
                    'Notion-Version': '2022-06-28'
                },
                body: JSON.stringify({
                    sorts: [
                        {
                            property: 'Due Date',
                            direction: 'ascending'
                        }
                    ]
                })
            });

            if (!response.ok) throw new Error(`Failed to fetch tasks: ${response.status}`);

            const data = await response.json();
            this.taskData = this.parseTaskData(data.results);
            
        } catch (error) {
            console.error('Failed to load task data:', error);
            this.taskData = [];
        }
    }

    parseTaskData(results) {
        return results.map(task => ({
            id: task.id,
            title: task.properties.Task?.title?.[0]?.plain_text || 'Untitled',
            status: task.properties.Status?.status?.name || 'Not started',
            priority: task.properties.Priority?.select?.name || 'Medium',
            dueDate: task.properties['Due Date']?.date?.start,
            category: task.properties.Category?.select?.name,
            estimate: task.properties.Estimate?.number,
            energy: task.properties['Energy Level']?.select?.name,
            context: task.properties.Context?.select?.name,
            description: task.properties.Description?.rich_text?.[0]?.plain_text,
            notion_url: task.url
        }));
    }

    getTasksForDate(date) {
        const dateStr = date.toISOString().split('T')[0];
        return this.taskData.filter(task => {
            if (!task.dueDate) return false;
            const taskDate = task.dueDate.split('T')[0];
            return taskDate === dateStr;
        });
    }

    getOverdueTasks() {
        const today = new Date().toISOString().split('T')[0];
        return this.taskData.filter(task => {
            if (!task.dueDate || task.status === 'Completed') return false;
            const taskDate = task.dueDate.split('T')[0];
            return taskDate < today;
        });
    }

    getUpcomingTasks() {
        const today = new Date();
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);
        
        return this.taskData.filter(task => {
            if (!task.dueDate || task.status === 'Completed') return false;
            const taskDate = new Date(task.dueDate);
            return taskDate > today && taskDate <= weekEnd;
        });
    }

    getCompletionRate(tasks) {
        if (tasks.length === 0) return 100;
        const completed = tasks.filter(task => task.status === 'Completed').length;
        return (completed / tasks.length) * 100;
    }

    formatDate(date) {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
        
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    // Analytics methods
    async generateAnalytics() {
        const totalTasks = this.taskData.length;
        const completedTasks = this.taskData.filter(task => task.status === 'Completed').length;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        // Category breakdown
        const categoryStats = {};
        this.taskData.forEach(task => {
            const cat = task.category || 'Uncategorized';
            categoryStats[cat] = (categoryStats[cat] || 0) + 1;
        });

        const categories = Object.entries(categoryStats)
            .map(([name, count]) => ({
                name,
                count,
                percentage: Math.round((count / totalTasks) * 100)
            }))
            .sort((a, b) => b.count - a.count);

        return {
            completionRate,
            completedTasks,
            totalTasks,
            avgTaskTime: '2.3h',
            categories,
            dailyStats: [],
            insights: [
                { icon: '🎯', text: 'You complete most tasks on Tuesday and Wednesday' },
                { icon: '⚡', text: 'High-energy tasks work best in the morning' },
                { icon: '📈', text: 'Your completion rate improved 15% this month' }
            ]
        };
    }

    renderProductivityChart(dailyStats) {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const values = [8, 6, 6, 4, 6, 3, 2]; // Sample data
        const maxValue = Math.max(...values);

        return days.map((day, index) => {
            const height = (values[index] / maxValue) * 100;
            return `
                <div class="chart-bar">
                    <div class="bar-fill" style="height: ${height}%"></div>
                    <div class="bar-label">${day}</div>
                </div>
            `;
        }).join('');
    }

    // Utility methods
    async loadInitialData() {
        await this.loadTaskData();
        this.updateUserInfo();
    }

    updateUserInfo() {
        const userInfo = document.getElementById('userInfo');
        if (userInfo && this.currentAuth) {
            userInfo.textContent = this.currentAuth.workspaceName || 'Personal Workspace';
        }
    }

    async forceSync() {
        this.showStatus('Syncing...', 'info');
        await this.loadTaskData();
        this.showStatus('Sync complete', 'success');
        
        // Refresh current screen
        if (this.currentScreen === 'tasks') {
            this.switchToScreen('tasks');
        }
    }

    showLoading(message) {
        document.body.innerHTML = `
            <div class="loading-screen">
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">${message}</div>
                </div>
            </div>
        `;
    }

    showAuthInterface() {
        document.body.innerHTML = `
            <div class="auth-screen">
                <div class="auth-content">
                    <h1>📝 Notion Task Manager</h1>
                    <p>Connect your Notion workspace to get started</p>
                    <button class="primary-btn" onclick="app.signIn()">Connect to Notion</button>
                    <div class="auth-status" id="authStatus"></div>
                </div>
            </div>
        `;
    }

    async signIn() {
        try {
            this.showLoading('Connecting to Notion...');
            const auth = await this.oauth.authenticate();
            this.currentAuth = auth;
            await this.calendarService.initialize();
            this.showMainInterface();
            await this.loadInitialData();
            this.showStatus('Successfully connected!', 'success');
        } catch (error) {
            console.error('Sign in failed:', error);
            this.showAuthInterface();
            this.showStatus('Sign in failed: ' + error.message, 'error', 'authStatus');
        }
    }

    async disconnect() {
        await this.oauth.disconnect();
        this.currentAuth = null;
        this.showAuthInterface();
    }

    showStatus(message, type, elementId = 'statusBar') {
        const statusElement = document.getElementById(elementId);
        if (statusElement) {
            statusElement.innerHTML = `<div class="status ${type}">${message}</div>`;
            setTimeout(() => {
                statusElement.innerHTML = '';
            }, 3000);
        }
    }

    // Task action methods (stubs for now)
    async toggleTaskComplete(taskId, completed) {
        console.log('Toggle task complete:', taskId, completed);
    }

    openTaskDetail(taskId) {
        console.log('Open task detail:', taskId);
    }

    rescheduleTask(taskId) {
        console.log('Reschedule task:', taskId);
    }

    duplicateTask(taskId) {
        console.log('Duplicate task:', taskId);
    }

    showAddTaskModal() {
        console.log('Show add task modal');
    }

    filterTasks(query) {
        console.log('Filter tasks:', query);
    }

    filterTaskView(view) {
        console.log('Filter task view:', view);
    }

    openInNotion() {
        if (this.currentAuth) {
            chrome.tabs.create({ url: 'https://notion.so' });
        }
    }

    // Convert task to calendar event
    async convertTaskToEvent(taskId) {
        try {
            this.showStatus('Converting task to calendar event...', 'info');
            
            // Use calendar service to convert task
            const calendarEvent = await this.calendarService.convertTaskToCalendarEvent(taskId);
            
            if (calendarEvent) {
                this.showStatus('Task converted to calendar event successfully!', 'success');
                
                // Show option to open event form for editing
                const shouldEdit = await UIComponents.showConfirmation(
                    'Task has been added to your calendar. Would you like to edit the event details?',
                    'Edit Calendar Event'
                );
                
                if (shouldEdit) {
                    // Switch to calendar screen and show event form
                    this.switchToScreen('calendar');
                    setTimeout(() => {
                        this.handleCalendarEventClick(calendarEvent.id);
                    }, 500);
                }
            }
        } catch (error) {
            console.error('Failed to convert task to calendar event:', error);
            this.showStatus(`Failed to convert task: ${error.message}`, 'error');
        }
    }

    // Bulk convert multiple tasks to events
    async bulkConvertTasksToEvents(taskIds) {
        const results = {
            success: [],
            errors: []
        };

        this.showStatus(`Converting ${taskIds.length} tasks to calendar events...`, 'info');

        for (const taskId of taskIds) {
            try {
                const calendarEvent = await this.calendarService.convertTaskToCalendarEvent(taskId);
                results.success.push({ taskId, eventId: calendarEvent.id });
            } catch (error) {
                results.errors.push({ taskId, error: error.message });
            }
        }

        const successCount = results.success.length;
        const errorCount = results.errors.length;

        if (successCount > 0 && errorCount === 0) {
            this.showStatus(`Successfully converted ${successCount} tasks to calendar events!`, 'success');
        } else if (successCount > 0 && errorCount > 0) {
            this.showStatus(`Converted ${successCount} tasks, ${errorCount} failed.`, 'warning');
        } else {
            this.showStatus('Failed to convert tasks to calendar events.', 'error');
        }

        return results;
    }
}

// Initialize the enhanced app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new EnhancedTodoApp();
    window.app = app; // Make available globally
});
