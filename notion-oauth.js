// Notion OAuth Service - Clean Implementation
// Handles all OAuth authentication and workspace setup

class NotionOAuth {
    constructor() {
        this.CLIENT_ID = '232d872b-594c-80bc-9127-00374dc9bf69';
        this.CLIENT_SECRET = 'secret_6eLa0s1lUSAoebKBaMAa8TfIgyNSzgTT3v9JLqwx8Gb';
        this.REDIRECT_URI = chrome.identity.getRedirectURL();
        this.NOTION_API_BASE = 'https://api.notion.com/v1';
        this.NOTION_VERSION = '2022-06-28';
        
        console.log('🔐 NotionOAuth initialized');
        console.log('Redirect URI:', this.REDIRECT_URI);
    }

    // Main authentication flow
    async authenticate() {
        try {
            console.log('🚀 Starting Notion OAuth authentication...');
            
            // Check if already authenticated
            const existingAuth = await this.getStoredAuth();
            if (existingAuth && await this.validateToken(existingAuth.accessToken)) {
                console.log('✅ Valid existing authentication found');
                return existingAuth;
            }

            // Start OAuth flow
            const authCode = await this.getAuthorizationCode();
            const tokens = await this.exchangeCodeForTokens(authCode);
            const userInfo = await this.getUserInfo(tokens.access_token);
            
            // Store authentication
            const authData = {
                accessToken: tokens.access_token,
                workspaceId: tokens.workspace_id,
                workspaceName: userInfo.workspace?.name || 'Notion Workspace',
                userId: userInfo.user?.id,
                userName: userInfo.user?.name,
                userEmail: userInfo.user?.person?.email,
                authenticated: true,
                authMethod: 'oauth',
                tokenType: tokens.token_type || 'bearer',
                expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
            };

            await this.storeAuth(authData);
            
            // Setup workspace
            await this.setupWorkspace(authData);
            
            console.log('🎉 OAuth authentication completed successfully!');
            return authData;

        } catch (error) {
            console.error('❌ OAuth authentication failed:', error);
            throw new Error(`Authentication failed: ${error.message}`);
        }
    }

    // Get authorization code from Notion
    async getAuthorizationCode() {
        console.log('🔗 Getting authorization code...');
        
        const state = this.generateSecureState();
        const authUrl = `${this.NOTION_API_BASE}/oauth/authorize?` +
            `client_id=${encodeURIComponent(this.CLIENT_ID)}&` +
            `response_type=code&` +
            `owner=user&` +
            `redirect_uri=${encodeURIComponent(this.REDIRECT_URI)}&` +
            `state=${encodeURIComponent(state)}`;

        console.log('🌐 Launching OAuth flow...');
        
        const responseUrl = await chrome.identity.launchWebAuthFlow({
            url: authUrl,
            interactive: true
        });

        // Parse response
        const urlParams = new URLSearchParams(new URL(responseUrl).search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');

        if (error) {
            throw new Error(`OAuth error: ${error}`);
        }

        if (!code) {
            throw new Error('No authorization code received');
        }

        console.log('✅ Authorization code received');
        return code;
    }

    // Exchange code for access tokens
    async exchangeCodeForTokens(code) {
        console.log('🔄 Exchanging code for tokens...');
        
        const response = await fetch(`${this.NOTION_API_BASE}/oauth/token`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Basic ${btoa(`${this.CLIENT_ID}:${this.CLIENT_SECRET}`)}`
            },
            body: JSON.stringify({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: this.REDIRECT_URI
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Token exchange error:', errorText);
            throw new Error(`Token exchange failed: ${response.status}`);
        }

        const tokens = await response.json();
        console.log('✅ Tokens received successfully');
        return tokens;
    }

    // Get user and workspace information
    async getUserInfo(accessToken) {
        console.log('👤 Getting user information...');
        
        const response = await fetch(`${this.NOTION_API_BASE}/users/me`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Notion-Version': this.NOTION_VERSION
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to get user info: ${response.status}`);
        }

        const userInfo = await response.json();
        console.log('✅ User information retrieved');
        return userInfo;
    }

    // Setup workspace with template database
    async setupWorkspace(authData) {
        console.log('🏗️ Setting up workspace...');
        
        try {
            // Check if we already have a database
            const existingDb = await this.getStoredDatabase();
            if (existingDb) {
                console.log('📊 Existing database found:', existingDb.name);
                return existingDb;
            }

            // Create template database
            const database = await this.createTemplateDatabase(authData.accessToken);
            
            // Store database info
            await chrome.storage.sync.set({
                notionDatabaseId: database.id,
                notionDatabaseName: database.title?.[0]?.plain_text || 'Todo Database',
                notionDatabaseUrl: database.url
            });

            console.log('✅ Workspace setup completed');
            return database;

        } catch (error) {
            console.error('⚠️ Workspace setup failed:', error);
            // Don't fail authentication if workspace setup fails
        }
    }

    // Create template database for todos
    async createTemplateDatabase(accessToken) {
        console.log('📊 Creating comprehensive template database...');
        
        try {
            const parentPageId = await this.getOrCreateRootPage(accessToken);
            
            const databaseData = {
                parent: {
                    type: "page_id",
                    page_id: parentPageId
                },
                title: [
                    {
                        type: "text",
                        text: {
                            content: "📝 Todo Extension Database"
                        }
                    }
                ],
                properties: {
                    // Primary task title
                    "Task": {
                        title: {}
                    },
                    
                    // Task status with comprehensive options
                    "Status": {
                        select: {
                            options: [
                                { name: "📋 Not Started", color: "gray" },
                                { name: "🚀 In Progress", color: "yellow" },
                                { name: "⏸️ On Hold", color: "orange" },
                                { name: "🔄 In Review", color: "blue" },
                                { name: "✅ Completed", color: "green" },
                                { name: "❌ Cancelled", color: "red" }
                            ]
                        }
                    },
                    
                    // Priority levels
                    "Priority": {
                        select: {
                            options: [
                                { name: "🔥 Urgent", color: "red" },
                                { name: "⚡ High", color: "orange" },
                                { name: "📊 Medium", color: "yellow" },
                                { name: "📝 Low", color: "blue" },
                                { name: "❄️ Someday", color: "gray" }
                            ]
                        }
                    },
                    
                    // Categories/Tags
                    "Category": {
                        select: {
                            options: [
                                { name: "💼 Work", color: "blue" },
                                { name: "🏠 Personal", color: "green" },
                                { name: "🎯 Project", color: "purple" },
                                { name: "📚 Learning", color: "yellow" },
                                { name: "🏃 Health", color: "red" },
                                { name: "💰 Finance", color: "orange" },
                                { name: "🛒 Shopping", color: "pink" },
                                { name: "📞 Calls", color: "brown" }
                            ]
                        }
                    },
                    
                    // Due date
                    "Due Date": {
                        date: {}
                    },
                    
                    // Start date
                    "Start Date": {
                        date: {}
                    },
                    
                    // Estimated time to complete
                    "Estimate": {
                        select: {
                            options: [
                                { name: "⚡ 15 min", color: "green" },
                                { name: "🕐 30 min", color: "blue" },
                                { name: "⏰ 1 hour", color: "yellow" },
                                { name: "🕒 2-3 hours", color: "orange" },
                                { name: "📅 Half day", color: "red" },
                                { name: "🗓️ Full day", color: "purple" },
                                { name: "📆 Multiple days", color: "gray" }
                            ]
                        }
                    },
                    
                    // Progress percentage
                    "Progress": {
                        number: {
                            format: "percent"
                        }
                    },
                    
                    // Task description
                    "Description": {
                        rich_text: {}
                    },
                    
                    // Notes/Comments
                    "Notes": {
                        rich_text: {}
                    },
                    
                    // Related URL/Link
                    "Link": {
                        url: {}
                    },
                    
                    // Assigned to (for shared workspaces)
                    "Assigned": {
                        people: {}
                    },
                    
                    // Project/Epic grouping
                    "Project": {
                        relation: {
                            database_id: "", // Will be filled if projects database exists
                            single_property: "Name"
                        }
                    },
                    
                    // Tags (multi-select for flexibility)
                    "Tags": {
                        multi_select: {
                            options: [
                                { name: "urgent", color: "red" },
                                { name: "important", color: "orange" },
                                { name: "quick-win", color: "green" },
                                { name: "blocked", color: "gray" },
                                { name: "waiting", color: "blue" },
                                { name: "recurring", color: "purple" },
                                { name: "research", color: "yellow" },
                                { name: "meeting", color: "pink" }
                            ]
                        }
                    },
                    
                    // Energy level required
                    "Energy": {
                        select: {
                            options: [
                                { name: "🔋 High Energy", color: "red" },
                                { name: "⚡ Medium Energy", color: "yellow" },
                                { name: "🪫 Low Energy", color: "green" },
                                { name: "🧠 Focus Required", color: "blue" },
                                { name: "🤝 Social", color: "purple" }
                            ]
                        }
                    },
                    
                    // Context/Location
                    "Context": {
                        select: {
                            options: [
                                { name: "💻 Computer", color: "blue" },
                                { name: "📱 Phone", color: "green" },
                                { name: "🏢 Office", color: "orange" },
                                { name: "🏠 Home", color: "purple" },
                                { name: "🚗 Errands", color: "red" },
                                { name: "🗣️ Calls", color: "yellow" },
                                { name: "📧 Email", color: "pink" },
                                { name: "👥 Meeting", color: "brown" }
                            ]
                        }
                    },
                    
                    // Auto-populated timestamps
                    "Created": {
                        created_time: {}
                    },
                    
                    "Last Modified": {
                        last_edited_time: {}
                    },
                    
                    "Created By": {
                        created_by: {}
                    },
                    
                    "Modified By": {
                        last_edited_by: {}
                    },
                    
                    // Completion date
                    "Completed Date": {
                        date: {}
                    },
                    
                    // Recurring task pattern
                    "Recurring": {
                        select: {
                            options: [
                                { name: "None", color: "gray" },
                                { name: "Daily", color: "green" },
                                { name: "Weekly", color: "blue" },
                                { name: "Monthly", color: "purple" },
                                { name: "Quarterly", color: "orange" },
                                { name: "Yearly", color: "red" }
                            ]
                        }
                    },
                    
                    // Dependencies
                    "Blocked By": {
                        relation: {
                            database_id: "", // Self-reference, will be updated after creation
                            single_property: "Task"
                        }
                    }
                }
            };

            const response = await fetch(`${this.NOTION_API_BASE}/databases`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'Notion-Version': this.NOTION_VERSION
                },
                body: JSON.stringify(databaseData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Database creation failed:', errorText);
                
                // Try to use an existing database instead
                return await this.findExistingDatabase(accessToken);
            }

            const database = await response.json();
            console.log('✅ Comprehensive template database created:', database.id);
            
            // Update the self-reference for "Blocked By" relation
            await this.updateSelfReference(accessToken, database.id);
            
            // Create some sample tasks to demonstrate the system
            await this.createSampleTasks(accessToken, database.id);
            
            return database;

        } catch (error) {
            console.error('Database creation error:', error);
            // Try to find an existing database as fallback
            return await this.findExistingDatabase(accessToken);
        }
    }

    // Update self-reference for task dependencies
    async updateSelfReference(accessToken, databaseId) {
        try {
            console.log('🔗 Setting up task dependencies...');
            
            const updateData = {
                properties: {
                    "Blocked By": {
                        relation: {
                            database_id: databaseId,
                            single_property: "Task"
                        }
                    }
                }
            };

            await fetch(`${this.NOTION_API_BASE}/databases/${databaseId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'Notion-Version': this.NOTION_VERSION
                },
                body: JSON.stringify(updateData)
            });

            console.log('✅ Task dependencies configured');
        } catch (error) {
            console.error('Failed to update self-reference:', error);
        }
    }

    // Create sample tasks to demonstrate the system
    async createSampleTasks(accessToken, databaseId) {
        try {
            console.log('📝 Creating sample tasks...');
            
            const sampleTasks = [
                {
                    "Task": { title: [{ text: { content: "🎉 Welcome to your Todo Extension!" } }] },
                    "Status": { select: { name: "✅ Completed" } },
                    "Priority": { select: { name: "📊 Medium" } },
                    "Category": { select: { name: "🎯 Project" } },
                    "Description": { rich_text: [{ text: { content: "This is your first task! Your database is now set up and ready to use. You can edit or delete this task." } }] },
                    "Tags": { multi_select: [{ name: "quick-win" }] },
                    "Energy": { select: { name: "🪫 Low Energy" } },
                    "Context": { select: { name: "💻 Computer" } },
                    "Progress": { number: 100 },
                    "Completed Date": { date: { start: new Date().toISOString().split('T')[0] } }
                },
                {
                    "Task": { title: [{ text: { content: "📚 Learn about task management features" } }] },
                    "Status": { select: { name: "📋 Not Started" } },
                    "Priority": { select: { name: "📝 Low" } },
                    "Category": { select: { name: "📚 Learning" } },
                    "Estimate": { select: { name: "🕐 30 min" } },
                    "Description": { rich_text: [{ text: { content: "Explore all the fields and options available in your new task database." } }] },
                    "Tags": { multi_select: [{ name: "important" }, { name: "research" }] },
                    "Energy": { select: { name: "🧠 Focus Required" } },
                    "Context": { select: { name: "💻 Computer" } },
                    "Progress": { number: 0 }
                }
            ];

            for (const taskData of sampleTasks) {
                const taskPayload = {
                    parent: { database_id: databaseId },
                    properties: taskData
                };

                await fetch(`${this.NOTION_API_BASE}/pages`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                        'Notion-Version': this.NOTION_VERSION
                    },
                    body: JSON.stringify(taskPayload)
                });
            }

            console.log('✅ Sample tasks created');
        } catch (error) {
            console.error('Failed to create sample tasks:', error);
        }
    }

    async findExistingDatabase(accessToken) {
        console.log('🔍 Looking for existing databases...');
        
        const response = await fetch(`${this.NOTION_API_BASE}/search`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Notion-Version': this.NOTION_VERSION
            },
            body: JSON.stringify({
                filter: {
                    property: "object",
                    value: "database"
                },
                page_size: 10
            })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                // Use the first available database
                const database = data.results[0];
                console.log('✅ Using existing database:', database.id);
                return database;
            }
        }

        throw new Error('Unable to create or find a database. Please create a database in your Notion workspace manually.');
    }

    // Get or create root page for the database
    async getOrCreateRootPage(accessToken) {
        try {
            // Create a new page specifically for our extension
            const pageData = {
                parent: {
                    type: "page_id",
                    page_id: await this.getUsersFirstPage(accessToken)
                },
                properties: {
                    title: {
                        title: [
                            {
                                text: {
                                    content: "Todo Extension Workspace"
                                }
                            }
                        ]
                    }
                }
            };

            const response = await fetch(`${this.NOTION_API_BASE}/pages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'Notion-Version': this.NOTION_VERSION
                },
                body: JSON.stringify(pageData)
            });

            if (response.ok) {
                const page = await response.json();
                return page.id;
            }

            // Fallback to user's first page
            return await this.getUsersFirstPage(accessToken);

        } catch (error) {
            console.error('Failed to create root page:', error);
            // Fallback to user's first page
            return await this.getUsersFirstPage(accessToken);
        }
    }

    async getUsersFirstPage(accessToken) {
        const response = await fetch(`${this.NOTION_API_BASE}/search`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Notion-Version': this.NOTION_VERSION
            },
            body: JSON.stringify({
                filter: {
                    property: "object",
                    value: "page"
                },
                sort: {
                    direction: "descending",
                    timestamp: "last_edited_time"
                },
                page_size: 1
            })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                return data.results[0].id;
            }
        }

        throw new Error('No accessible pages found. Please create a page in your Notion workspace first.');
    }

    // Utility methods
    generateSecureState() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    async validateToken(accessToken) {
        try {
            const response = await fetch(`${this.NOTION_API_BASE}/users/me`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Notion-Version': this.NOTION_VERSION
                }
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    async storeAuth(authData) {
        await chrome.storage.sync.set({
            notionAccessToken: authData.accessToken,
            notionWorkspaceId: authData.workspaceId,
            notionWorkspaceName: authData.workspaceName,
            notionUserId: authData.userId,
            notionUserName: authData.userName,
            notionUserEmail: authData.userEmail,
            authMethod: 'oauth',
            authenticated: true,
            expiresAt: authData.expiresAt
        });
    }

    async getStoredAuth() {
        const result = await chrome.storage.sync.get([
            'notionAccessToken', 'notionWorkspaceId', 'notionWorkspaceName',
            'notionUserId', 'notionUserName', 'notionUserEmail', 
            'authMethod', 'authenticated', 'expiresAt'
        ]);

        if (result.authenticated && result.authMethod === 'oauth' && result.notionAccessToken) {
            // Check if token is expired
            if (result.expiresAt && Date.now() > result.expiresAt) {
                await this.clearAuth();
                return null;
            }
            return result;
        }
        return null;
    }

    async getStoredDatabase() {
        const result = await chrome.storage.sync.get([
            'notionDatabaseId', 'notionDatabaseName', 'notionDatabaseUrl'
        ]);
        
        if (result.notionDatabaseId) {
            return {
                id: result.notionDatabaseId,
                name: result.notionDatabaseName,
                url: result.notionDatabaseUrl
            };
        }
        return null;
    }

    async clearAuth() {
        await chrome.storage.sync.remove([
            'notionAccessToken', 'notionWorkspaceId', 'notionWorkspaceName',
            'notionUserId', 'notionUserName', 'notionUserEmail',
            'authMethod', 'authenticated', 'expiresAt',
            'notionDatabaseId', 'notionDatabaseName', 'notionDatabaseUrl'
        ]);
    }

    async disconnect() {
        console.log('🔓 Disconnecting from Notion...');
        await this.clearAuth();
        console.log('✅ Disconnected successfully');
    }
}

// Make it globally available
window.NotionOAuth = NotionOAuth;
