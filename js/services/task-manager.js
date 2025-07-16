// Task Management Utilities
class TaskManager {
    constructor(notionOAuth) {
        this.oauth = notionOAuth;
        this.database = null;
    }

    async initialize() {
        this.database = await this.oauth.getStoredDatabase();
        return this.database !== null;
    }

    // Fetch all tasks with filtering options
    async fetchTasks(filters = {}) {
        if (!this.database) {
            throw new Error('Database not initialized');
        }

        const auth = await this.oauth.getStoredAuth();
        if (!auth) {
            throw new Error('Not authenticated');
        }

        const queryBody = {
            sorts: [
                {
                    property: 'Due Date',
                    direction: 'ascending'
                },
                {
                    property: 'Priority',
                    direction: 'descending'
                }
            ]
        };

        // Add filters if provided
        if (Object.keys(filters).length > 0) {
            queryBody.filter = this.buildNotionFilter(filters);
        }

        try {
            const response = await fetch(`https://api.notion.com/v1/databases/${this.database.id}/query`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${auth.notionAccessToken}`,
                    'Content-Type': 'application/json',
                    'Notion-Version': '2022-06-28'
                },
                body: JSON.stringify(queryBody)
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch tasks: ${response.status}`);
            }

            const data = await response.json();
            return this.parseTaskData(data.results);
        } catch (error) {
            console.error('Error fetching tasks:', error);
            throw error;
        }
    }

    // Build Notion API filter from simple filter object
    buildNotionFilter(filters) {
        const conditions = [];

        if (filters.status && filters.status.length > 0) {
            if (filters.status.length === 1) {
                conditions.push({
                    property: 'Status',
                    status: {
                        equals: filters.status[0]
                    }
                });
            } else {
                conditions.push({
                    or: filters.status.map(status => ({
                        property: 'Status',
                        status: {
                            equals: status
                        }
                    }))
                });
            }
        }

        if (filters.priority && filters.priority.length > 0) {
            if (filters.priority.length === 1) {
                conditions.push({
                    property: 'Priority',
                    select: {
                        equals: filters.priority[0]
                    }
                });
            } else {
                conditions.push({
                    or: filters.priority.map(priority => ({
                        property: 'Priority',
                        select: {
                            equals: priority
                        }
                    }))
                });
            }
        }

        if (filters.dateRange) {
            const { start, end } = filters.dateRange;
            if (start && end) {
                conditions.push({
                    property: 'Due Date',
                    date: {
                        on_or_after: start.toISOString().split('T')[0],
                        on_or_before: end.toISOString().split('T')[0]
                    }
                });
            } else if (start) {
                conditions.push({
                    property: 'Due Date',
                    date: {
                        on_or_after: start.toISOString().split('T')[0]
                    }
                });
            } else if (end) {
                conditions.push({
                    property: 'Due Date',
                    date: {
                        on_or_before: end.toISOString().split('T')[0]
                    }
                });
            }
        }

        if (filters.search) {
            conditions.push({
                or: [
                    {
                        property: 'Task',
                        title: {
                            contains: filters.search
                        }
                    },
                    {
                        property: 'Description',
                        rich_text: {
                            contains: filters.search
                        }
                    }
                ]
            });
        }

        // Return appropriate filter structure
        if (conditions.length === 0) {
            return undefined;
        } else if (conditions.length === 1) {
            return conditions[0];
        } else {
            return {
                and: conditions
            };
        }
    }

    // Parse task data from Notion response
    parseTaskData(results) {
        return results.map(task => ({
            id: task.id,
            title: task.properties.Task?.title?.[0]?.plain_text || 'Untitled Task',
            status: task.properties.Status?.status?.name || 'Not started',
            priority: task.properties.Priority?.select?.name || 'Medium',
            dueDate: task.properties['Due Date']?.date?.start,
            category: task.properties.Category?.select?.name,
            estimate: task.properties.Estimate?.number,
            energy: task.properties['Energy Level']?.select?.name,
            context: task.properties.Context?.select?.name,
            description: task.properties.Description?.rich_text?.[0]?.plain_text,
            tags: task.properties.Tags?.multi_select?.map(tag => tag.name) || [],
            progress: task.properties.Progress?.number || 0,
            created: task.created_time,
            updated: task.last_edited_time,
            notion_url: task.url
        }));
    }

    // Update task status
    async updateTaskStatus(taskId, status) {
        const auth = await this.oauth.getStoredAuth();
        if (!auth) {
            throw new Error('Not authenticated');
        }

        try {
            const response = await fetch(`https://api.notion.com/v1/pages/${taskId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${auth.notionAccessToken}`,
                    'Content-Type': 'application/json',
                    'Notion-Version': '2022-06-28'
                },
                body: JSON.stringify({
                    properties: {
                        'Status': {
                            status: {
                                name: status
                            }
                        }
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to update task: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error updating task status:', error);
            throw error;
        }
    }

    // Update task due date
    async updateTaskDueDate(taskId, dueDate) {
        const auth = await this.oauth.getStoredAuth();
        if (!auth) {
            throw new Error('Not authenticated');
        }

        try {
            const response = await fetch(`https://api.notion.com/v1/pages/${taskId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${auth.notionAccessToken}`,
                    'Content-Type': 'application/json',
                    'Notion-Version': '2022-06-28'
                },
                body: JSON.stringify({
                    properties: {
                        'Due Date': {
                            date: dueDate ? {
                                start: dueDate.toISOString()
                            } : null
                        }
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to update task due date: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error updating task due date:', error);
            throw error;
        }
    }

    // Delete task
    async deleteTask(taskId) {
        const auth = await this.oauth.getStoredAuth();
        if (!auth) {
            throw new Error('Not authenticated');
        }

        try {
            const response = await fetch(`https://api.notion.com/v1/pages/${taskId}`, {
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
                throw new Error(`Failed to delete task: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error deleting task:', error);
            throw error;
        }
    }

    // Create new task
    async createTask(taskData) {
        const auth = await this.oauth.getStoredAuth();
        if (!auth || !this.database) {
            throw new Error('Not authenticated or database not initialized');
        }

        const taskProperties = {
            parent: {
                database_id: this.database.id
            },
            properties: {
                'Task': {
                    title: [
                        {
                            text: {
                                content: taskData.title || 'Untitled Task'
                            }
                        }
                    ]
                },
                'Status': {
                    status: {
                        name: taskData.status || 'Not started'
                    }
                },
                'Priority': {
                    select: {
                        name: taskData.priority || 'Medium'
                    }
                }
            }
        };

        // Add optional properties
        if (taskData.dueDate) {
            taskProperties.properties['Due Date'] = {
                date: {
                    start: taskData.dueDate.toISOString()
                }
            };
        }

        if (taskData.category) {
            taskProperties.properties['Category'] = {
                select: {
                    name: taskData.category
                }
            };
        }

        if (taskData.estimate) {
            taskProperties.properties['Estimate'] = {
                number: taskData.estimate
            };
        }

        if (taskData.energy) {
            taskProperties.properties['Energy Level'] = {
                select: {
                    name: taskData.energy
                }
            };
        }

        if (taskData.context) {
            taskProperties.properties['Context'] = {
                select: {
                    name: taskData.context
                }
            };
        }

        if (taskData.description) {
            taskProperties.properties['Description'] = {
                rich_text: [
                    {
                        text: {
                            content: taskData.description
                        }
                    }
                ]
            };
        }

        if (taskData.tags && taskData.tags.length > 0) {
            taskProperties.properties['Tags'] = {
                multi_select: taskData.tags.map(tag => ({ name: tag }))
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
                body: JSON.stringify(taskProperties)
            });

            if (!response.ok) {
                throw new Error(`Failed to create task: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error creating task:', error);
            throw error;
        }
    }

    // Get task statistics
    async getTaskStats() {
        try {
            const tasks = await this.fetchTasks();
            
            const stats = {
                total: tasks.length,
                completed: tasks.filter(t => t.status === 'Completed').length,
                inProgress: tasks.filter(t => t.status === 'In progress').length,
                notStarted: tasks.filter(t => t.status === 'Not started').length,
                overdue: tasks.filter(t => {
                    if (!t.dueDate || t.status === 'Completed') return false;
                    return new Date(t.dueDate) < new Date();
                }).length,
                dueToday: tasks.filter(t => {
                    if (!t.dueDate) return false;
                    const today = new Date().toISOString().split('T')[0];
                    return t.dueDate.split('T')[0] === today;
                }).length,
                dueThisWeek: tasks.filter(t => {
                    if (!t.dueDate) return false;
                    const taskDate = new Date(t.dueDate);
                    const today = new Date();
                    const weekEnd = new Date(today);
                    weekEnd.setDate(weekEnd.getDate() + 7);
                    return taskDate >= today && taskDate <= weekEnd;
                }).length
            };

            stats.completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
            
            return stats;
        } catch (error) {
            console.error('Error getting task stats:', error);
            return {
                total: 0,
                completed: 0,
                inProgress: 0,
                notStarted: 0,
                overdue: 0,
                dueToday: 0,
                dueThisWeek: 0,
                completionRate: 0
            };
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TaskManager;
}
