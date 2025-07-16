// Calendar View Component
class CalendarView {
    constructor(calendarService) {
        this.calendarService = calendarService;
        this.currentView = 'month'; // 'month', 'week', 'day'
        this.currentDate = new Date();
        this.selectedDate = new Date();
        this.calendarData = { events: [], tasks: [], combined: [] };
        this.workloadData = null;
    }

    // Render calendar screen
    async render() {
        const container = document.createElement('div');
        container.className = 'calendar-screen';
        container.innerHTML = this.getCalendarHTML();
        
        await this.loadCalendarData();
        this.setupEventListeners(container);
        this.renderCurrentView(container);
        
        return container;
    }

    // Get calendar HTML structure
    getCalendarHTML() {
        return `
            <div class="calendar-header">
                <div class="calendar-navigation">
                    <button class="nav-btn" id="prevPeriod">◀</button>
                    <h3 class="calendar-title" id="calendarTitle">${this.getCalendarTitle()}</h3>
                    <button class="nav-btn" id="nextPeriod">▶</button>
                </div>
                <div class="view-selector">
                    <button class="view-btn ${this.currentView === 'month' ? 'active' : ''}" data-view="month">Month</button>
                    <button class="view-btn ${this.currentView === 'week' ? 'active' : ''}" data-view="week">Week</button>
                    <button class="view-btn ${this.currentView === 'day' ? 'active' : ''}" data-view="day">Day</button>
                </div>
            </div>
            <div class="calendar-content" id="calendarContent">
                <div class="loading-calendar">Loading calendar data...</div>
            </div>
            <div class="calendar-summary" id="calendarSummary">
                <div class="summary-stats"></div>
                <div class="workload-indicator"></div>
            </div>
        `;
    }

    // Get calendar title based on current view and date
    getCalendarTitle() {
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        switch (this.currentView) {
            case 'month':
                return `${monthNames[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
            case 'week':
                const weekStart = this.getWeekStart(this.currentDate);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);
                return `Week of ${monthNames[weekStart.getMonth()]} ${weekStart.getDate()}-${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
            case 'day':
                return `${monthNames[this.currentDate.getMonth()]} ${this.currentDate.getDate()}, ${this.currentDate.getFullYear()}`;
            default:
                return '';
        }
    }

    // Setup event listeners
    setupEventListeners(container) {
        // Navigation buttons
        container.querySelector('#prevPeriod').addEventListener('click', () => this.navigatePeriod(-1));
        container.querySelector('#nextPeriod').addEventListener('click', () => this.navigatePeriod(1));

        // View selector buttons
        container.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentView = e.target.dataset.view;
                this.updateViewButtons(container);
                this.renderCurrentView(container);
            });
        });
    }

    // Update view button states
    updateViewButtons(container) {
        container.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === this.currentView);
        });
    }

    // Navigate to previous/next period
    async navigatePeriod(direction) {
        switch (this.currentView) {
            case 'month':
                this.currentDate.setMonth(this.currentDate.getMonth() + direction);
                break;
            case 'week':
                this.currentDate.setDate(this.currentDate.getDate() + (direction * 7));
                break;
            case 'day':
                this.currentDate.setDate(this.currentDate.getDate() + direction);
                break;
        }

        await this.loadCalendarData();
        const container = document.querySelector('.calendar-screen');
        if (container) {
            container.querySelector('#calendarTitle').textContent = this.getCalendarTitle();
            this.renderCurrentView(container);
        }
    }

    // Load calendar data for current period
    async loadCalendarData() {
        const { startDate, endDate } = this.getPeriodDateRange();
        
        try {
            this.calendarData = await this.calendarService.getCalendarData(startDate, endDate);
            this.workloadData = await this.calendarService.analyzeWorkload(startDate, endDate);
        } catch (error) {
            console.error('Failed to load calendar data:', error);
            this.calendarData = { events: [], tasks: [], combined: [] };
            this.workloadData = null;
        }
    }

    // Get date range for current period and view
    getPeriodDateRange() {
        let startDate, endDate;

        switch (this.currentView) {
            case 'month':
                startDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
                endDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
                break;
            case 'week':
                startDate = this.getWeekStart(this.currentDate);
                endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + 6);
                break;
            case 'day':
                startDate = new Date(this.currentDate);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(this.currentDate);
                endDate.setHours(23, 59, 59, 999);
                break;
            default:
                startDate = new Date();
                endDate = new Date();
        }

        return { startDate, endDate };
    }

    // Get week start (Monday)
    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
        return new Date(d.setDate(diff));
    }

    // Render current view
    async renderCurrentView(container) {
        const contentDiv = container.querySelector('#calendarContent');
        const summaryDiv = container.querySelector('#calendarSummary');

        switch (this.currentView) {
            case 'month':
                contentDiv.innerHTML = this.renderMonthView();
                break;
            case 'week':
                contentDiv.innerHTML = this.renderWeekView();
                break;
            case 'day':
                contentDiv.innerHTML = this.renderDayView();
                break;
        }

        summaryDiv.innerHTML = this.renderSummary();
        this.attachCalendarEventListeners(contentDiv);
    }

    // Render month view
    renderMonthView() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = this.getWeekStart(firstDay);
        const today = new Date();

        let html = `
            <div class="month-view">
                <div class="month-header">
                    <div class="day-name">Sun</div>
                    <div class="day-name">Mon</div>
                    <div class="day-name">Tue</div>
                    <div class="day-name">Wed</div>
                    <div class="day-name">Thu</div>
                    <div class="day-name">Fri</div>
                    <div class="day-name">Sat</div>
                </div>
                <div class="month-grid">
        `;

        const current = new Date(startDate);
        for (let week = 0; week < 6; week++) {
            for (let day = 0; day < 7; day++) {
                const dateKey = current.toISOString().split('T')[0];
                const dayData = this.workloadData?.dailyWorkload[dateKey] || { tasks: 0, events: 0, items: [] };
                const isCurrentMonth = current.getMonth() === month;
                const isToday = current.toDateString() === today.toDateString();
                const isSelected = current.toDateString() === this.selectedDate.toDateString();

                html += `
                    <div class="calendar-day ${isCurrentMonth ? 'current-month' : 'other-month'} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${dayData.workloadLevel || ''}" 
                         data-date="${dateKey}" onclick="calendarView.selectDate('${dateKey}')">
                        <div class="day-number">${current.getDate()}</div>
                        <div class="day-content">
                            ${this.renderDayItems(dayData.items.slice(0, 3))}
                            ${dayData.items.length > 3 ? `<div class="more-items">+${dayData.items.length - 3} more</div>` : ''}
                        </div>
                    </div>
                `;

                current.setDate(current.getDate() + 1);
            }
        }

        html += `
                </div>
            </div>
        `;

        return html;
    }

    // Render week view
    renderWeekView() {
        const weekStart = this.getWeekStart(this.currentDate);
        const today = new Date();
        const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM

        let html = `
            <div class="week-view">
                <div class="week-header">
                    <div class="time-column">Time</div>
        `;

        // Day headers
        for (let i = 0; i < 7; i++) {
            const day = new Date(weekStart);
            day.setDate(day.getDate() + i);
            const isToday = day.toDateString() === today.toDateString();
            const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day.getDay()];
            
            html += `
                <div class="day-header ${isToday ? 'today' : ''}">
                    <div class="day-name">${dayName}</div>
                    <div class="day-date">${day.getDate()}</div>
                </div>
            `;
        }

        html += `
                </div>
                <div class="week-grid">
        `;

        // Time slots
        hours.forEach(hour => {
            html += `
                <div class="time-row">
                    <div class="time-label">${hour}:00</div>
            `;

            // Day columns
            for (let i = 0; i < 7; i++) {
                const day = new Date(weekStart);
                day.setDate(day.getDate() + i);
                const dateKey = day.toISOString().split('T')[0];
                const dayData = this.workloadData?.dailyWorkload[dateKey] || { items: [] };
                
                // Find items for this hour
                const hourItems = dayData.items.filter(item => {
                    const itemHour = item.date.getHours();
                    return itemHour === hour;
                });

                html += `
                    <div class="time-slot" data-date="${dateKey}" data-hour="${hour}">
                        ${this.renderTimeSlotItems(hourItems)}
                    </div>
                `;
            }

            html += `</div>`;
        });

        html += `
                </div>
            </div>
        `;

        return html;
    }

    // Render day view
    renderDayView() {
        const day = new Date(this.currentDate);
        const dateKey = day.toISOString().split('T')[0];
        const dayData = this.workloadData?.dailyWorkload[dateKey] || { items: [], totalHours: 0 };
        const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM

        let html = `
            <div class="day-view">
                <div class="day-header">
                    <h4>${day.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h4>
                    <div class="day-stats">
                        ${dayData.items.length} items • ${dayData.totalHours.toFixed(1)}h scheduled
                    </div>
                </div>
                <div class="day-timeline">
        `;

        hours.forEach(hour => {
            const hourItems = dayData.items.filter(item => {
                const itemHour = item.date.getHours();
                return itemHour === hour;
            });

            const hasItems = hourItems.length > 0;

            html += `
                <div class="hour-block ${hasItems ? 'has-items' : 'available'}">
                    <div class="hour-label">${hour}:00 ${hour < 12 ? 'AM' : 'PM'}</div>
                    <div class="hour-content">
                        ${hasItems ? this.renderHourItems(hourItems) : '<div class="available-time">Available</div>'}
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;

        return html;
    }

    // Render day items (for month view)
    renderDayItems(items) {
        return items.map(item => {
            const isTask = item.type === 'task';
            const priorityClass = isTask ? `priority-${item.priority?.toLowerCase()}` : 'event';
            
            return `
                <div class="day-item ${priorityClass}" title="${item.title}">
                    ${isTask ? '📋' : '📅'} ${item.title.substring(0, 15)}${item.title.length > 15 ? '...' : ''}
                </div>
            `;
        }).join('');
    }

    // Render time slot items (for week view)
    renderTimeSlotItems(items) {
        return items.map(item => {
            const isTask = item.type === 'task';
            const priorityClass = isTask ? `priority-${item.priority?.toLowerCase()}` : 'event';
            
            return `
                <div class="time-item ${priorityClass}" title="${item.title}">
                    ${isTask ? '📋' : '📅'} ${item.title}
                    ${isTask ? `<div class="item-meta">${item.priority} | ${item.estimate}h</div>` : 
                              `<div class="item-meta">${item.duration}m</div>`}
                </div>
            `;
        }).join('');
    }

    // Render hour items (for day view)
    renderHourItems(items) {
        return items.map(item => {
            const isTask = item.type === 'task';
            const priorityClass = isTask ? `priority-${item.priority?.toLowerCase()}` : 'event';
            
            return `
                <div class="hour-item ${priorityClass}">
                    <div class="item-icon">${isTask ? '📋' : '📅'}</div>
                    <div class="item-details">
                        <div class="item-title">${item.title}</div>
                        <div class="item-meta">
                            ${isTask ? 
                                `Priority: ${item.priority} | Est: ${item.estimate}h | Energy: ${item.energy}` :
                                `Duration: ${item.duration}m | Location: ${item.location}`
                            }
                        </div>
                        ${item.description ? `<div class="item-description">${item.description}</div>` : ''}
                    </div>
                    <div class="item-actions">
                        <button class="action-btn" onclick="calendarView.openItem('${item.id}', '${item.type}')">✏️</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Render summary section
    renderSummary() {
        if (!this.workloadData) {
            return '<div class="summary-loading">Loading summary...</div>';
        }

        const summary = this.workloadData.summary;
        
        return `
            <div class="summary-stats">
                <div class="stat-item">
                    <span class="stat-value">${summary.totalTasks}</span>
                    <span class="stat-label">Tasks</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${summary.totalEvents}</span>
                    <span class="stat-label">Events</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${summary.averageHoursPerDay.toFixed(1)}h</span>
                    <span class="stat-label">Avg/Day</span>
                </div>
            </div>
            <div class="workload-indicator">
                ${this.getWorkloadTips()}
            </div>
        `;
    }

    // Get workload tips
    getWorkloadTips() {
        if (!this.workloadData) return '';

        const summary = this.workloadData.summary;
        
        if (summary.heavyDays > 2) {
            return '💡 <strong>Tip:</strong> You have several overloaded days. Consider redistributing some tasks.';
        } else if (summary.lightDays > 4) {
            return '💡 <strong>Tip:</strong> You have good availability. Perfect time to tackle bigger projects!';
        } else {
            return '💡 <strong>Tip:</strong> Your workload looks well balanced this period.';
        }
    }

    // Attach calendar-specific event listeners
    attachCalendarEventListeners(container) {
        // Add click handlers for drag and drop, item selection, etc.
        container.querySelectorAll('.calendar-day').forEach(day => {
            day.addEventListener('click', (e) => {
                if (e.target.classList.contains('calendar-day')) {
                    const date = e.target.dataset.date;
                    this.selectDate(date);
                }
            });
        });
    }

    // Select a specific date
    selectDate(dateString) {
        this.selectedDate = new Date(dateString);
        
        // If in month view, switch to day view for selected date
        if (this.currentView === 'month') {
            this.currentDate = new Date(this.selectedDate);
            this.currentView = 'day';
            
            const container = document.querySelector('.calendar-screen');
            if (container) {
                this.updateViewButtons(container);
                container.querySelector('#calendarTitle').textContent = this.getCalendarTitle();
                this.renderCurrentView(container);
            }
        }
    }

    // Open item for editing
    openItem(itemId, itemType) {
        if (itemType === 'task') {
            // Open task detail view
            window.app?.openTaskDetail(itemId);
        } else {
            // Open calendar event in Notion
            const item = this.calendarData.combined.find(i => i.id === itemId);
            if (item?.notion_url) {
                chrome.tabs.create({ url: item.notion_url });
            }
        }
    }
}

// Make available globally for event handlers
window.calendarView = null;
