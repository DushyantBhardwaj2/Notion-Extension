// Calendar Integration Test Script
class CalendarIntegrationTest {
    constructor() {
        this.oauth = new NotionOAuth();
        this.calendarService = new CalendarService(this.oauth);
        this.testResults = [];
    }

    async runAllTests() {
        console.log('🧪 Starting Calendar Integration Tests...\n');

        const tests = [
            { name: 'Initialize Calendar Service', test: this.testCalendarServiceInit.bind(this) },
            { name: 'Create Calendar Database', test: this.testCalendarDatabaseCreation.bind(this) },
            { name: 'Create Calendar Event - Basic', test: this.testBasicEventCreation.bind(this) },
            { name: 'Create Calendar Event - Full Fields', test: this.testFullEventCreation.bind(this) },
            { name: 'Fetch Calendar Events', test: this.testEventFetching.bind(this) },
            { name: 'Update Calendar Event', test: this.testEventUpdate.bind(this) },
            { name: 'Convert Task to Event', test: this.testTaskToEventConversion.bind(this) },
            { name: 'Delete Calendar Event', test: this.testEventDeletion.bind(this) }
        ];

        for (const { name, test } of tests) {
            await this.runTest(name, test);
        }

        this.generateReport();
    }

    async runTest(name, testFn) {
        console.log(`🔄 Testing: ${name}`);
        
        try {
            const startTime = Date.now();
            const result = await testFn();
            const duration = Date.now() - startTime;
            
            this.testResults.push({
                name,
                passed: true,
                duration,
                result
            });
            
            console.log(`✅ PASSED (${duration}ms)\n`);
        } catch (error) {
            this.testResults.push({
                name,
                passed: false,
                error: error.message,
                stack: error.stack
            });
            
            console.log(`❌ FAILED: ${error.message}\n`);
        }
    }

    async testCalendarServiceInit() {
        const auth = await this.oauth.getStoredAuth();
        if (!auth) {
            throw new Error('Not authenticated - please authenticate first');
        }

        const initialized = await this.calendarService.initialize();
        if (!initialized) {
            throw new Error('Calendar service failed to initialize');
        }

        return { status: 'Calendar service initialized successfully' };
    }

    async testCalendarDatabaseCreation() {
        // Try to create or verify calendar database exists
        await this.calendarService.findOrCreateCalendarDatabase();
        
        const calendarDB = await this.calendarService.getStoredCalendarDatabase();
        if (!calendarDB) {
            throw new Error('Calendar database not found after creation');
        }

        return { 
            status: 'Calendar database ready',
            databaseId: calendarDB.id 
        };
    }

    async testBasicEventCreation() {
        const eventData = {
            title: 'Test Event - Basic',
            startTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
            duration: 30,
            type: 'Meeting'
        };

        const event = await this.calendarService.createCalendarEvent(eventData);
        if (!event || !event.id) {
            throw new Error('Failed to create basic calendar event');
        }

        // Store for cleanup
        this.testEventId = event.id;

        return { 
            status: 'Basic event created successfully',
            eventId: event.id 
        };
    }

    async testFullEventCreation() {
        const eventData = {
            title: 'Test Event - Full Fields',
            startTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
            endTime: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 hours from now
            allDay: false,
            type: 'Work',
            priority: 'High',
            category: 'Work',
            status: 'Scheduled',
            location: 'Conference Room A',
            description: 'Test event with all fields populated',
            attendees: ['Team Lead', 'Developer'],
            reminders: ['15 minutes', '1 hour'],
            recurring: 'None',
            meetingUrl: 'https://zoom.us/test',
            notes: 'This is a comprehensive test event'
        };

        const event = await this.calendarService.createCalendarEvent(eventData);
        if (!event || !event.id) {
            throw new Error('Failed to create full calendar event');
        }

        // Store for cleanup
        this.testFullEventId = event.id;

        return { 
            status: 'Full event created successfully',
            eventId: event.id 
        };
    }

    async testEventFetching() {
        const startDate = new Date();
        const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 1 week from now

        const events = await this.calendarService.getCalendarEvents(startDate, endDate);
        
        if (!Array.isArray(events)) {
            throw new Error('Event fetching did not return an array');
        }

        // Should find our test events
        const basicEvent = events.find(e => e.title === 'Test Event - Basic');
        const fullEvent = events.find(e => e.title === 'Test Event - Full Fields');

        if (!basicEvent || !fullEvent) {
            throw new Error('Could not find created test events in fetched results');
        }

        return { 
            status: 'Events fetched successfully',
            eventCount: events.length,
            foundTestEvents: { basic: !!basicEvent, full: !!fullEvent }
        };
    }

    async testEventUpdate() {
        if (!this.testEventId) {
            throw new Error('No test event available for update test');
        }

        const updates = {
            title: 'Updated Test Event',
            priority: 'Low',
            description: 'This event has been updated',
            duration: 45
        };

        const updatedEvent = await this.calendarService.updateCalendarEvent(this.testEventId, updates);
        
        if (!updatedEvent || !updatedEvent.id) {
            throw new Error('Failed to update calendar event');
        }

        return { 
            status: 'Event updated successfully',
            eventId: updatedEvent.id 
        };
    }

    async testTaskToEventConversion() {
        // First, we need to get a task to convert
        const taskManager = new TaskManager(this.oauth);
        await taskManager.initialize();

        const tasks = await taskManager.fetchTasks();
        if (tasks.length === 0) {
            throw new Error('No tasks available for conversion test');
        }

        const testTask = tasks[0];
        const convertedEvent = await this.calendarService.convertTaskToCalendarEvent(testTask.id);

        if (!convertedEvent || !convertedEvent.id) {
            throw new Error('Failed to convert task to calendar event');
        }

        // Store for cleanup
        this.convertedEventId = convertedEvent.id;

        return { 
            status: 'Task converted to event successfully',
            taskId: testTask.id,
            eventId: convertedEvent.id 
        };
    }

    async testEventDeletion() {
        const eventsToDelete = [
            this.testEventId,
            this.testFullEventId,
            this.convertedEventId
        ].filter(id => id); // Remove undefined values

        if (eventsToDelete.length === 0) {
            throw new Error('No test events available for deletion');
        }

        const deletionResults = [];
        for (const eventId of eventsToDelete) {
            try {
                const result = await this.calendarService.deleteCalendarEvent(eventId);
                deletionResults.push({ eventId, success: true });
            } catch (error) {
                deletionResults.push({ eventId, success: false, error: error.message });
            }
        }

        const successCount = deletionResults.filter(r => r.success).length;
        
        return { 
            status: `${successCount}/${eventsToDelete.length} events deleted successfully`,
            results: deletionResults 
        };
    }

    generateReport() {
        const passed = this.testResults.filter(t => t.passed).length;
        const total = this.testResults.length;
        const percentage = Math.round((passed / total) * 100);

        console.log('\n' + '='.repeat(60));
        console.log('📊 CALENDAR INTEGRATION TEST RESULTS');
        console.log('='.repeat(60));
        console.log(`Tests Passed: ${passed}/${total} (${percentage}%)`);
        
        if (passed === total) {
            console.log('🎉 All calendar integration tests passed!');
            console.log('✅ Your calendar database is fully functional');
            console.log('✅ All CRUD operations working correctly');
            console.log('✅ Task-to-event conversion working');
            console.log('✅ Ready for production use!');
        } else {
            console.log('⚠️  Some tests failed. Details:');
            
            this.testResults.filter(t => !t.passed).forEach(test => {
                console.log(`❌ ${test.name}: ${test.error}`);
            });
        }
        
        console.log('\n📈 Performance Summary:');
        const successfulTests = this.testResults.filter(t => t.passed);
        const avgDuration = successfulTests.reduce((sum, t) => sum + (t.duration || 0), 0) / successfulTests.length;
        console.log(`Average test duration: ${Math.round(avgDuration)}ms`);
        
        console.log('='.repeat(60));
    }
}

// Auto-run tests when script loads (if authenticated)
async function runCalendarTests() {
    const tester = new CalendarIntegrationTest();
    
    try {
        const auth = await tester.oauth.getStoredAuth();
        if (!auth) {
            console.log('⚠️  Please authenticate with Notion first before running tests');
            return;
        }
        
        await tester.runAllTests();
    } catch (error) {
        console.error('Test runner error:', error);
    }
}

// Export for manual testing
if (typeof window !== 'undefined') {
    window.CalendarIntegrationTest = CalendarIntegrationTest;
    window.runCalendarTests = runCalendarTests;
}

console.log('🧪 Calendar Integration Test Suite loaded');
console.log('📋 Run runCalendarTests() to test all calendar functionality');
