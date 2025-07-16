// Calendar Integration Service
class CalendarService {
    constructor(notionOAuth) {
        this.oauth = notionOAuth;
        this.calendarDatabase = null;
        this.taskDatabase = null;
    }

    // Initialize calendar service with databases
    async initialize() {
        try {
            this.taskDatabase = await this.oauth.getStoredDatabase();
            await this.findOrCreateCalendarDatabase();
            return true;
        } catch (error) {
            console.error('Calendar service initialization failed:', error);
            return false;
        }
    }

    // Find existing calendar database or create new one
    async findOrCreateCalendarDatabase() {
        const auth = await this.oauth.getStoredAuth();
        if (!auth) throw new Error('Not authenticated');

        try {
            // First, try to find existing calendar database
            const response = await fetch('https://api.notion.com/v1/search', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${auth.notionAccessToken}`,
                    'Content-Type': 'application/json',
                    'Notion-Version': '2022-06-28'
                },
                body: JSON.stringify({
                    query: 'Calendar',
                    filter: {
                        value: 'database',
                        property: 'object'
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Search failed: ${response.status}`);
            }

            const searchData = await response.json();
            const calendarDB = searchData.results.find(db => 
                db.title && db.title.some(t => t.plain_text.toLowerCase().includes('calendar'))
            );

            if (calendarDB) {
                this.calendarDatabase = calendarDB;
                await this.storeCalendarDatabase(calendarDB);
            } else {
                // Create new calendar database
                await this.createCalendarDatabase();
            }
        } catch (error) {
            console.error('Calendar database setup failed:', error);
            // Continue without calendar database for now
        }
    }

    // Create new calendar database
    async createCalendarDatabase() {
        const auth = await this.oauth.getStoredAuth();
        if (!auth) throw new Error('Not authenticated');

        const calendarSchema = {
            parent: {
                type: 'page_id',
                page_id: auth.workspaceId || auth.pageId
            },
            title: [
                {
                    type: 'text',
                    text: {
                        content: 'Calendar Events'
                    }
                }
            ],
            properties: {
                'Event Title': {
                    title: {}
                },
                'Start Time': {
                    date: {}
                },
                'End Time': {
                    date: {}
                },
                'All Day': {
                    checkbox: {}
                },
                'Event Type': {
                    select: {
                        options: [
                            { name: 'Meeting', color: 'blue' },
                            { name: 'Appointment', color: 'green' },
                            { name: 'Deadline', color: 'red' },
                            { name: 'Personal', color: 'purple' },
                            { name: 'Work', color: 'orange' },
                            { name: 'Break', color: 'gray' },
                            { name: 'Travel', color: 'yellow' },
                            { name: 'Review', color: 'pink' }
                        ]
                    }
                },
                'Priority': {
                    select: {
                        options: [
                            { name: 'High', color: 'red' },
                            { name: 'Medium', color: 'yellow' },
                            { name: 'Low', color: 'green' }
                        ]
                    }
                },
                'Status': {
                    select: {
                        options: [
                            { name: 'Scheduled', color: 'default' },
                            { name: 'Confirmed', color: 'green' },
                            { name: 'In Progress', color: 'yellow' },
                            { name: 'Completed', color: 'blue' },
                            { name: 'Cancelled', color: 'red' },
                            { name: 'Postponed', color: 'orange' }
                        ]
                    }
                },
                'Duration (minutes)': {
                    number: {
                        format: 'number'
                    }
                },
                'Location': {
                    rich_text: {}
                },
                'Description': {
                    rich_text: {}
                },
                'Attendees': {
                    multi_select: {
                        options: [
                            { name: 'Team Lead', color: 'blue' },
                            { name: 'Project Manager', color: 'green' },
                            { name: 'Developer', color: 'purple' },
                            { name: 'Designer', color: 'pink' },
                            { name: 'Client', color: 'orange' },
                            { name: 'Stakeholder', color: 'red' }
                        ]
                    }
                },
                'Category': {
                    select: {
                        options: [
                            { name: 'Work', color: 'blue' },
                            { name: 'Personal', color: 'green' },
                            { name: 'Health', color: 'red' },
                            { name: 'Learning', color: 'purple' },
                            { name: 'Social', color: 'yellow' },
                            { name: 'Travel', color: 'orange' }
                        ]
                    }
                },
                'Recurring': {
                    select: {
                        options: [
                            { name: 'None', color: 'default' },
                            { name: 'Daily', color: 'blue' },
                            { name: 'Weekly', color: 'green' },
                            { name: 'Monthly', color: 'yellow' },
                            { name: 'Yearly', color: 'red' }
                        ]
                    }
                },
                'Reminders': {
                    multi_select: {
                        options: [
                            { name: '5 minutes', color: 'red' },
                            { name: '15 minutes', color: 'orange' },
                            { name: '30 minutes', color: 'yellow' },
                            { name: '1 hour', color: 'green' },
                            { name: '1 day', color: 'blue' },
                            { name: '1 week', color: 'purple' }
                        ]
                    }
                },
                'Related Task': {
                    relation: {
                        database_id: this.taskDatabase?.id || '',
                        single_property: {}
                    }
                },
                'Meeting URL': {
                    url: {}
                },
                'Notes': {
                    rich_text: {}
                },
                'Created Date': {
                    created_time: {}
                },
                'Last Modified': {
                    last_edited_time: {}
                }
            }
        };

        try {
            const response = await fetch('https://api.notion.com/v1/databases', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${auth.notionAccessToken}`,
                    'Content-Type': 'application/json',
                    'Notion-Version': '2022-06-28'
                },
                body: JSON.stringify(calendarSchema)
            });

            if (!response.ok) {
                throw new Error(`Calendar database creation failed: ${response.status}`);
            }

            const calendarData = await response.json();
            this.calendarDatabase = calendarData;
            await this.storeCalendarDatabase(calendarData);
            
            // Create sample calendar events
            await this.createSampleEvents();
            
            return calendarData;
        } catch (error) {
            console.error('Failed to create calendar database:', error);
            throw error;
        }
    }

    // Store calendar database info
    async storeCalendarDatabase(database) {
        await chrome.storage.local.set({
            calendarDatabase: {
                id: database.id,
                title: database.title[0]?.plain_text || 'Calendar Events',
                created: new Date().toISOString()
            }
        });
    }

    // Get stored calendar database
    async getStoredCalendarDatabase() {
        const result = await chrome.storage.local.get('calendarDatabase');
        return result.calendarDatabase;
    }

    // Create sample calendar events
    async createSampleEvents() {
        const auth = await this.oauth.getStoredAuth();
        if (!auth || !this.calendarDatabase) return;

        const today = new Date();
        const sampleEvents = [
            {
                title: 'Team Standup',
                date: new Date(today.getTime() + 2 * 60 * 60 * 1000), // 2 hours from now
                type: 'Meeting',
                duration: 30,
                description: 'Daily team standup meeting',
                location: 'Conference Room A'
            },
            {
                title: 'Client Presentation',
                date: new Date(today.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
                type: 'Meeting',
                duration: 60,
                description: 'Q3 strategy presentation to client',
                location: 'Zoom'
            },
            {
                title: 'Project Deadline',
                date: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days
                type: 'Deadline',
                duration: 0,
                description: 'Marketing campaign delivery',
                location: ''
            }
        ];

        for (const event of sampleEvents) {
            await this.createCalendarEvent(event);
        }
    }

    // Create calendar event with all fields
    async createCalendarEvent(eventData) {
        const auth = await this.oauth.getStoredAuth();
        if (!auth || !this.calendarDatabase) {
            throw new Error('Not authenticated or calendar database not available');
        }

        // Validate required fields
        if (!eventData.title) {
            throw new Error('Event title is required');
        }

        // Prepare start and end times
        const startTime = eventData.startTime || eventData.date || new Date();
        const duration = eventData.duration || 60; // minutes
        const endTime = eventData.endTime || new Date(startTime.getTime() + duration * 60000);

        const eventProperties = {
            parent: {
                database_id: this.calendarDatabase.id
            },
            properties: {
                'Event Title': {
                    title: [
                        {
                            text: {
                                content: eventData.title
                            }
                        }
                    ]
                },
                'Start Time': {
                    date: {
                        start: startTime.toISOString(),
                        end: eventData.allDay ? null : endTime.toISOString(),
                        time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone
                    }
                },
                'End Time': {
                    date: {
                        start: endTime.toISOString(),
                        time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone
                    }
                },
                'All Day': {
                    checkbox: eventData.allDay || false
                },
                'Event Type': {
                    select: {
                        name: eventData.type || eventData.eventType || 'Meeting'
                    }
                },
                'Priority': {
                    select: {
                        name: eventData.priority || 'Medium'
                    }
                },
                'Status': {
                    select: {
                        name: eventData.status || 'Scheduled'
                    }
                },
                'Duration (minutes)': {
                    number: duration
                },
                'Location': {
                    rich_text: [
                        {
                            text: {
                                content: eventData.location || ''
                            }
                        }
                    ]
                },
                'Description': {
                    rich_text: [
                        {
                            text: {
                                content: eventData.description || ''
                            }
                        }
                    ]
                },
                'Category': {
                    select: {
                        name: eventData.category || 'Work'
                    }
                },
                'Recurring': {
                    select: {
                        name: eventData.recurring || 'None'
                    }
                },
                'Notes': {
                    rich_text: [
                        {
                            text: {
                                content: eventData.notes || ''
                            }
                        }
                    ]
                }
            }
        };

        // Add optional fields
        if (eventData.attendees && Array.isArray(eventData.attendees)) {
            eventProperties.properties['Attendees'] = {
                multi_select: eventData.attendees.map(attendee => ({ name: attendee }))
            };
        }

        if (eventData.reminders && Array.isArray(eventData.reminders)) {
            eventProperties.properties['Reminders'] = {
                multi_select: eventData.reminders.map(reminder => ({ name: reminder }))
            };
        }

        if (eventData.meetingUrl) {
            eventProperties.properties['Meeting URL'] = {
                url: eventData.meetingUrl
            };
        }

        if (eventData.relatedTaskId) {
            eventProperties.properties['Related Task'] = {
                relation: [{ id: eventData.relatedTaskId }]
            };
        }

        try {
            const response = await fetch('https://api.notion.com/v1/pages', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${auth.notionAccessToken}`,
                    'Content-Type': 'application/json',
                    'Notion-Version': '2022-06-28'
                },
                body: JSON.stringify(eventProperties)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Event creation error:', errorData);
                throw new Error(`Event creation failed: ${response.status} - ${errorData.message || 'Unknown error'}`);
            }

            const result = await response.json();
            console.log('Calendar event created successfully:', result.id);
            return result;
        } catch (error) {
            console.error('Failed to create calendar event:', error);
            throw error;
        }
    }

    // Fetch calendar events for date range with enhanced filtering
    async getCalendarEvents(startDate, endDate, filters = {}) {
        const auth = await this.oauth.getStoredAuth();
        if (!auth || !this.calendarDatabase) {
            console.warn('Calendar database not available');
            return [];
        }

        try {
            // Build filter conditions
            const filterConditions = [
                {
                    property: 'Start Time',
                    date: {
                        on_or_after: startDate.toISOString().split('T')[0]
                    }
                },
                {
                    property: 'Start Time',
                    date: {
                        on_or_before: endDate.toISOString().split('T')[0]
                    }
                }
            ];

            // Add optional filters
            if (filters.type && filters.type.length > 0) {
                if (filters.type.length === 1) {
                    filterConditions.push({
                        property: 'Event Type',
                        select: {
                            equals: filters.type[0]
                        }
                    });
                } else {
                    filterConditions.push({
                        or: filters.type.map(type => ({
                            property: 'Event Type',
                            select: {
                                equals: type
                            }
                        }))
                    });
                }
            }

            if (filters.status && filters.status.length > 0) {
                if (filters.status.length === 1) {
                    filterConditions.push({
                        property: 'Status',
                        select: {
                            equals: filters.status[0]
                        }
                    });
                } else {
                    filterConditions.push({
                        or: filters.status.map(status => ({
                            property: 'Status',
                            select: {
                                equals: status
                            }
                        }))
                    });
                }
            }

            if (filters.priority && filters.priority.length > 0) {
                if (filters.priority.length === 1) {
                    filterConditions.push({
                        property: 'Priority',
                        select: {
                            equals: filters.priority[0]
                        }
                    });
                } else {
                    filterConditions.push({
                        or: filters.priority.map(priority => ({
                            property: 'Priority',
                            select: {
                                equals: priority
                            }
                        }))
                    });
                }
            }

            if (filters.category && filters.category.length > 0) {
                if (filters.category.length === 1) {
                    filterConditions.push({
                        property: 'Category',
                        select: {
                            equals: filters.category[0]
                        }
                    });
                } else {
                    filterConditions.push({
                        or: filters.category.map(category => ({
                            property: 'Category',
                            select: {
                                equals: category
                            }
                        }))
                    });
                }
            }

            const queryBody = {
                filter: filterConditions.length === 1 ? filterConditions[0] : {
                    and: filterConditions
                },
                sorts: [
                    {
                        property: 'Start Time',
                        direction: 'ascending'
                    },
                    {
                        property: 'Priority',
                        direction: 'descending'
                    }
                ],
                page_size: 100
            };

            const response = await fetch(`https://api.notion.com/v1/databases/${this.calendarDatabase.id}/query`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${auth.notionAccessToken}`,
                    'Content-Type': 'application/json',
                    'Notion-Version': '2022-06-28'
                },
                body: JSON.stringify(queryBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Calendar fetch error:', errorData);
                throw new Error(`Failed to fetch events: ${response.status} - ${errorData.message || 'Unknown error'}`);
            }

            const data = await response.json();
            return this.parseCalendarEvents(data.results);
        } catch (error) {
            console.error('Failed to fetch calendar events:', error);
            return [];
        }
    }

    // Parse calendar events from Notion response with all fields
    parseCalendarEvents(results) {
        return results.map(event => {
            const startTime = event.properties['Start Time']?.date?.start;
            const endTime = event.properties['End Time']?.date?.start || 
                           event.properties['Start Time']?.date?.end;
            
            return {
                id: event.id,
                title: event.properties['Event Title']?.title?.[0]?.plain_text || 'Untitled Event',
                startTime: startTime ? new Date(startTime) : new Date(),
                endTime: endTime ? new Date(endTime) : null,
                allDay: event.properties['All Day']?.checkbox || false,
                type: event.properties['Event Type']?.select?.name || 'Meeting',
                priority: event.properties['Priority']?.select?.name || 'Medium',
                status: event.properties['Status']?.select?.name || 'Scheduled',
                duration: event.properties['Duration (minutes)']?.number || 60,
                location: event.properties['Location']?.rich_text?.[0]?.plain_text || '',
                description: event.properties['Description']?.rich_text?.[0]?.plain_text || '',
                category: event.properties['Category']?.select?.name || 'Work',
                recurring: event.properties['Recurring']?.select?.name || 'None',
                attendees: event.properties['Attendees']?.multi_select?.map(a => a.name) || [],
                reminders: event.properties['Reminders']?.multi_select?.map(r => r.name) || [],
                meetingUrl: event.properties['Meeting URL']?.url || '',
                notes: event.properties['Notes']?.rich_text?.[0]?.plain_text || '',
                relatedTask: event.properties['Related Task']?.relation?.[0]?.id || null,
                createdDate: event.properties['Created Date']?.created_time || event.created_time,
                lastModified: event.properties['Last Modified']?.last_edited_time || event.last_edited_time,
                notion_url: event.url,
                
                // Legacy support for old field names
                date: startTime ? new Date(startTime) : new Date()
            };
        });
    }

    // Update calendar event
    async updateCalendarEvent(eventId, updates) {
        const auth = await this.oauth.getStoredAuth();
        if (!auth) {
            throw new Error('Not authenticated');
        }

        const updateProperties = {};

        // Build update properties based on provided updates
        if (updates.title !== undefined) {
            updateProperties['Event Title'] = {
                title: [{ text: { content: updates.title } }]
            };
        }

        if (updates.startTime !== undefined) {
            const startTime = new Date(updates.startTime);
            const endTime = updates.endTime ? new Date(updates.endTime) : 
                           new Date(startTime.getTime() + (updates.duration || 60) * 60000);
            
            updateProperties['Start Time'] = {
                date: {
                    start: startTime.toISOString(),
                    end: updates.allDay ? null : endTime.toISOString(),
                    time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone
                }
            };
        }

        if (updates.endTime !== undefined) {
            updateProperties['End Time'] = {
                date: {
                    start: new Date(updates.endTime).toISOString(),
                    time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone
                }
            };
        }

        if (updates.allDay !== undefined) {
            updateProperties['All Day'] = { checkbox: updates.allDay };
        }

        if (updates.type !== undefined) {
            updateProperties['Event Type'] = { select: { name: updates.type } };
        }

        if (updates.priority !== undefined) {
            updateProperties['Priority'] = { select: { name: updates.priority } };
        }

        if (updates.status !== undefined) {
            updateProperties['Status'] = { select: { name: updates.status } };
        }

        if (updates.duration !== undefined) {
            updateProperties['Duration (minutes)'] = { number: updates.duration };
        }

        if (updates.location !== undefined) {
            updateProperties['Location'] = {
                rich_text: [{ text: { content: updates.location } }]
            };
        }

        if (updates.description !== undefined) {
            updateProperties['Description'] = {
                rich_text: [{ text: { content: updates.description } }]
            };
        }

        if (updates.category !== undefined) {
            updateProperties['Category'] = { select: { name: updates.category } };
        }

        if (updates.recurring !== undefined) {
            updateProperties['Recurring'] = { select: { name: updates.recurring } };
        }

        if (updates.notes !== undefined) {
            updateProperties['Notes'] = {
                rich_text: [{ text: { content: updates.notes } }]
            };
        }

        if (updates.attendees !== undefined) {
            updateProperties['Attendees'] = {
                multi_select: updates.attendees.map(attendee => ({ name: attendee }))
            };
        }

        if (updates.reminders !== undefined) {
            updateProperties['Reminders'] = {
                multi_select: updates.reminders.map(reminder => ({ name: reminder }))
            };
        }

        if (updates.meetingUrl !== undefined) {
            updateProperties['Meeting URL'] = { url: updates.meetingUrl };
        }

        if (updates.relatedTaskId !== undefined) {
            updateProperties['Related Task'] = {
                relation: updates.relatedTaskId ? [{ id: updates.relatedTaskId }] : []
            };
        }

        try {
            const response = await fetch(`https://api.notion.com/v1/pages/${eventId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${auth.notionAccessToken}`,
                    'Content-Type': 'application/json',
                    'Notion-Version': '2022-06-28'
                },
                body: JSON.stringify({
                    properties: updateProperties
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Event update error:', errorData);
                throw new Error(`Event update failed: ${response.status} - ${errorData.message || 'Unknown error'}`);
            }

            const result = await response.json();
            console.log('Calendar event updated successfully:', result.id);
            return result;
        } catch (error) {
            console.error('Failed to update calendar event:', error);
            throw error;
        }
    }

    // Delete calendar event
    async deleteCalendarEvent(eventId) {
        const auth = await this.oauth.getStoredAuth();
        if (!auth) {
            throw new Error('Not authenticated');
        }

        try {
            const response = await fetch(`https://api.notion.com/v1/pages/${eventId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${auth.notionAccessToken}`,
                    'Content-Type': 'application/json',
                    'Notion-Version': '2022-06-28'
                },
                body: JSON.stringify({
                    archived: true
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Event deletion error:', errorData);
                throw new Error(`Event deletion failed: ${response.status} - ${errorData.message || 'Unknown error'}`);
            }

            const result = await response.json();
            console.log('Calendar event deleted successfully:', result.id);
            return result;
        } catch (error) {
            console.error('Failed to delete calendar event:', error);
            throw error;
        }
    }

    // Convert task to calendar event
    async convertTaskToCalendarEvent(taskId, eventData = {}) {
        try {
            // Fetch task details
            const auth = await this.oauth.getStoredAuth();
            if (!auth) {
                throw new Error('Not authenticated');
            }

            const taskResponse = await fetch(`https://api.notion.com/v1/pages/${taskId}`, {
                headers: {
                    'Authorization': `Bearer ${auth.notionAccessToken}`,
                    'Notion-Version': '2022-06-28'
                }
            });

            if (!taskResponse.ok) {
                throw new Error(`Failed to fetch task: ${taskResponse.status}`);
            }

            const task = await taskResponse.json();
            
            // Extract task properties
            const taskTitle = task.properties.Task?.title?.[0]?.plain_text || 'Untitled Task';
            const taskDueDate = task.properties['Due Date']?.date?.start;
            const taskPriority = task.properties.Priority?.select?.name || 'Medium';
            const taskCategory = task.properties.Category?.select?.name || 'Work';
            const taskDescription = task.properties.Description?.rich_text?.[0]?.plain_text || '';
            const taskEstimate = task.properties.Estimate?.number || 1;

            // Create calendar event data
            const calendarEventData = {
                title: eventData.title || `Work on: ${taskTitle}`,
                startTime: eventData.startTime || (taskDueDate ? new Date(taskDueDate) : new Date()),
                duration: eventData.duration || (taskEstimate * 60), // Convert hours to minutes
                type: eventData.type || 'Work',
                priority: eventData.priority || taskPriority,
                category: eventData.category || taskCategory,
                description: eventData.description || `Task: ${taskDescription}`,
                status: 'Scheduled',
                relatedTaskId: taskId,
                ...eventData // Allow override of any properties
            };

            // Create the calendar event
            const calendarEvent = await this.createCalendarEvent(calendarEventData);
            
            console.log(`Task ${taskId} converted to calendar event ${calendarEvent.id}`);
            return calendarEvent;
        } catch (error) {
            console.error('Failed to convert task to calendar event:', error);
            throw error;
        }
    }

    // Batch create calendar events
    async batchCreateCalendarEvents(eventsData) {
        const results = [];
        const errors = [];

        for (const eventData of eventsData) {
            try {
                const result = await this.createCalendarEvent(eventData);
                results.push(result);
            } catch (error) {
                errors.push({
                    eventData,
                    error: error.message
                });
            }
        }

        return {
            success: results,
            errors: errors,
            total: eventsData.length,
            successCount: results.length,
            errorCount: errors.length
        };
    }

    // Get tasks for date range (from task database)
    async getTasksForDateRange(startDate, endDate) {
        const auth = await this.oauth.getStoredAuth();
        if (!auth || !this.taskDatabase) return [];

        try {
            const response = await fetch(`https://api.notion.com/v1/databases/${this.taskDatabase.id}/query`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${auth.notionAccessToken}`,
                    'Content-Type': 'application/json',
                    'Notion-Version': '2022-06-28'
                },
                body: JSON.stringify({
                    filter: {
                        and: [
                            {
                                property: 'Due Date',
                                date: {
                                    on_or_after: startDate.toISOString().split('T')[0]
                                }
                            },
                            {
                                property: 'Due Date',
                                date: {
                                    on_or_before: endDate.toISOString().split('T')[0]
                                }
                            }
                        ]
                    },
                    sorts: [
                        {
                            property: 'Due Date',
                            direction: 'ascending'
                        }
                    ]
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch tasks: ${response.status}`);
            }

            const data = await response.json();
            return this.parseTasksForCalendar(data.results);
        } catch (error) {
            console.error('Failed to fetch tasks for calendar:', error);
            return [];
        }
    }

    // Parse tasks for calendar display
    parseTasksForCalendar(results) {
        return results.map(task => ({
            id: task.id,
            title: task.properties.Task?.title?.[0]?.plain_text || 'Untitled Task',
            date: new Date(task.properties['Due Date']?.date?.start || new Date()),
            priority: task.properties.Priority?.select?.name || 'Medium',
            status: task.properties.Status?.status?.name || 'Not started',
            category: task.properties.Category?.select?.name || 'General',
            estimate: task.properties.Estimate?.number || 1,
            energy: task.properties['Energy Level']?.select?.name || 'Medium',
            context: task.properties.Context?.select?.name || 'General',
            type: 'task',
            notion_url: task.url
        }));
    }

    // Get combined calendar data (events + tasks)
    async getCalendarData(startDate, endDate) {
        const [events, tasks] = await Promise.all([
            this.getCalendarEvents(startDate, endDate),
            this.getTasksForDateRange(startDate, endDate)
        ]);

        return {
            events,
            tasks,
            combined: [...events, ...tasks].sort((a, b) => a.date - b.date)
        };
    }

    // Analyze workload for date range
    async analyzeWorkload(startDate, endDate) {
        const { tasks, events } = await this.getCalendarData(startDate, endDate);
        
        const dailyWorkload = {};
        const dateRange = [];
        
        // Generate date range
        const current = new Date(startDate);
        while (current <= endDate) {
            const dateKey = current.toISOString().split('T')[0];
            dailyWorkload[dateKey] = {
                date: new Date(current),
                tasks: 0,
                events: 0,
                totalHours: 0,
                items: []
            };
            dateRange.push(dateKey);
            current.setDate(current.getDate() + 1);
        }

        // Add tasks to daily workload
        tasks.forEach(task => {
            const dateKey = task.date.toISOString().split('T')[0];
            if (dailyWorkload[dateKey]) {
                dailyWorkload[dateKey].tasks++;
                dailyWorkload[dateKey].totalHours += task.estimate || 1;
                dailyWorkload[dateKey].items.push({ ...task, type: 'task' });
            }
        });

        // Add events to daily workload
        events.forEach(event => {
            const dateKey = event.date.toISOString().split('T')[0];
            if (dailyWorkload[dateKey]) {
                dailyWorkload[dateKey].events++;
                dailyWorkload[dateKey].totalHours += (event.duration || 60) / 60;
                dailyWorkload[dateKey].items.push({ ...event, type: 'event' });
            }
        });

        // Calculate workload levels
        const maxHours = Math.max(...Object.values(dailyWorkload).map(d => d.totalHours));
        Object.values(dailyWorkload).forEach(day => {
            if (day.totalHours === 0) {
                day.workloadLevel = 'light';
            } else if (day.totalHours <= maxHours * 0.3) {
                day.workloadLevel = 'light';
            } else if (day.totalHours <= maxHours * 0.7) {
                day.workloadLevel = 'medium';
            } else {
                day.workloadLevel = 'heavy';
            }
        });

        return {
            dailyWorkload,
            summary: {
                totalTasks: tasks.length,
                totalEvents: events.length,
                averageHoursPerDay: Object.values(dailyWorkload).reduce((sum, day) => sum + day.totalHours, 0) / dateRange.length,
                heavyDays: Object.values(dailyWorkload).filter(day => day.workloadLevel === 'heavy').length,
                lightDays: Object.values(dailyWorkload).filter(day => day.workloadLevel === 'light').length
            }
        };
    }

    // Get smart scheduling suggestions
    async getSchedulingSuggestions(task) {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 14); // Next 2 weeks
        
        const { dailyWorkload } = await this.analyzeWorkload(new Date(), endDate);
        
        const suggestions = [];
        
        // Find light days for scheduling
        const lightDays = Object.values(dailyWorkload)
            .filter(day => day.workloadLevel === 'light' && day.date >= new Date())
            .sort((a, b) => a.date - b.date)
            .slice(0, 5);

        lightDays.forEach(day => {
            suggestions.push({
                date: day.date,
                reason: `Light workload day (${day.totalHours.toFixed(1)}h scheduled)`,
                confidence: 'high',
                workloadHours: day.totalHours
            });
        });

        // Consider energy matching
        if (task.energy === 'High') {
            suggestions.forEach(suggestion => {
                const dayOfWeek = suggestion.date.getDay();
                if (dayOfWeek >= 1 && dayOfWeek <= 3) { // Monday to Wednesday
                    suggestion.reason += ' - Good for high-energy tasks';
                    suggestion.confidence = 'very-high';
                }
            });
        }

        return suggestions.slice(0, 3);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CalendarService;
}
