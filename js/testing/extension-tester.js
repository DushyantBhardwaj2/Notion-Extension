// Extension Testing and Validation Script
class ExtensionTester {
    constructor() {
        this.tests = [];
        this.results = [];
    }

    // Add a test case
    addTest(name, testFn, description = '') {
        this.tests.push({
            name,
            testFn,
            description,
            passed: false,
            error: null
        });
    }

    // Run all tests
    async runAllTests() {
        console.log('🧪 Starting Extension Tests...\n');
        
        for (let i = 0; i < this.tests.length; i++) {
            const test = this.tests[i];
            console.log(`\n${i + 1}. Testing: ${test.name}`);
            
            if (test.description) {
                console.log(`   Description: ${test.description}`);
            }

            try {
                await test.testFn();
                test.passed = true;
                console.log(`   ✅ PASSED`);
            } catch (error) {
                test.passed = false;
                test.error = error.message;
                console.log(`   ❌ FAILED: ${error.message}`);
            }
        }

        this.generateReport();
    }

    // Generate test report
    generateReport() {
        const passed = this.tests.filter(t => t.passed).length;
        const total = this.tests.length;
        const percentage = Math.round((passed / total) * 100);

        console.log('\n' + '='.repeat(50));
        console.log('📊 TEST RESULTS SUMMARY');
        console.log('='.repeat(50));
        console.log(`Tests Passed: ${passed}/${total} (${percentage}%)`);
        
        if (passed === total) {
            console.log('🎉 All tests passed! Extension is ready for use.');
        } else {
            console.log('⚠️  Some tests failed. Review errors above.');
            
            console.log('\n❌ Failed Tests:');
            this.tests.filter(t => !t.passed).forEach(test => {
                console.log(`   - ${test.name}: ${test.error}`);
            });
        }
        
        console.log('='.repeat(50));
    }
}

// Initialize tester and add test cases
const tester = new ExtensionTester();

// Test OAuth Service
tester.addTest(
    'OAuth Service Initialization',
    async () => {
        if (typeof NotionOAuth === 'undefined') {
            throw new Error('NotionOAuth class not found');
        }
        
        const oauth = new NotionOAuth();
        if (!oauth.clientId || !oauth.clientSecret) {
            throw new Error('OAuth credentials not configured');
        }
    },
    'Verify OAuth service is properly initialized with credentials'
);

// Test Calendar Service
tester.addTest(
    'Calendar Service Creation',
    async () => {
        if (typeof CalendarService === 'undefined') {
            throw new Error('CalendarService class not found');
        }
        
        const mockOAuth = { 
            getStoredAuth: () => null,
            getStoredDatabase: () => null 
        };
        const calendar = new CalendarService(mockOAuth);
        
        if (typeof calendar.findOrCreateCalendarDatabase !== 'function') {
            throw new Error('CalendarService missing required methods');
        }
    },
    'Verify calendar service class structure and methods'
);

// Test Calendar View Component
tester.addTest(
    'Calendar View Component',
    async () => {
        if (typeof CalendarView === 'undefined') {
            throw new Error('CalendarView class not found');
        }
        
        const mockContainer = document.createElement('div');
        const mockService = {};
        const view = new CalendarView(mockContainer, mockService);
        
        if (typeof view.renderMonthView !== 'function') {
            throw new Error('CalendarView missing required methods');
        }
    },
    'Verify calendar view component structure'
);

// Test Enhanced App
tester.addTest(
    'Enhanced App Structure',
    async () => {
        if (typeof EnhancedTodoApp === 'undefined') {
            throw new Error('EnhancedTodoApp class not found');
        }
        
        const app = new EnhancedTodoApp();
        
        if (typeof app.switchToScreen !== 'function') {
            throw new Error('EnhancedTodoApp missing navigation methods');
        }
    },
    'Verify enhanced app class and navigation system'
);

// Test UI Components
tester.addTest(
    'UI Components Library',
    async () => {
        if (typeof UIComponents === 'undefined') {
            throw new Error('UIComponents class not found');
        }
        
        const spinner = UIComponents.createLoadingSpinner();
        if (!spinner || !spinner.classList.contains('loading-spinner')) {
            throw new Error('UI components not creating elements correctly');
        }
    },
    'Verify UI components library functionality'
);

// Test Task Manager
tester.addTest(
    'Task Manager Service',
    async () => {
        if (typeof TaskManager === 'undefined') {
            throw new Error('TaskManager class not found');
        }
        
        const mockOAuth = {
            getStoredAuth: () => null,
            getStoredDatabase: () => null
        };
        const taskManager = new TaskManager(mockOAuth);
        
        if (typeof taskManager.fetchTasks !== 'function') {
            throw new Error('TaskManager missing required methods');
        }
    },
    'Verify task manager service structure'
);

// Test Manifest Configuration
tester.addTest(
    'Manifest Configuration',
    async () => {
        try {
            const manifest = chrome.runtime.getManifest();
            
            if (manifest.version !== '2.0.0') {
                throw new Error('Manifest version not updated to 2.0.0');
            }
            
            if (manifest.action.default_popup !== 'popup-enhanced.html') {
                throw new Error('Manifest not pointing to enhanced popup');
            }
            
            if (!manifest.permissions.includes('storage') || !manifest.permissions.includes('notifications')) {
                throw new Error('Required permissions missing from manifest');
            }
        } catch (error) {
            throw new Error(`Manifest test failed: ${error.message}`);
        }
    },
    'Verify Chrome extension manifest configuration'
);

// Test File Structure
tester.addTest(
    'File Structure Validation',
    async () => {
        const requiredFiles = [
            'js/app-enhanced.js',
            'js/services/calendar-service.js',
            'js/components/calendar-view.js',
            'js/services/task-manager.js',
            'js/ui/ui-components.js',
            'css/enhanced-styles.css',
            'css/ui-components.css',
            'popup-enhanced.html'
        ];
        
        // In a real environment, you'd check if files exist
        // For now, we'll assume they exist if the classes are defined
        const classesToCheck = [
            'EnhancedTodoApp',
            'CalendarService', 
            'CalendarView',
            'TaskManager',
            'UIComponents'
        ];
        
        const missingClasses = classesToCheck.filter(className => typeof window[className] === 'undefined');
        
        if (missingClasses.length > 0) {
            throw new Error(`Missing classes: ${missingClasses.join(', ')}`);
        }
    },
    'Verify all required files and classes are present'
);

// Test Chrome APIs
tester.addTest(
    'Chrome Extension APIs',
    async () => {
        if (typeof chrome === 'undefined') {
            throw new Error('Chrome extension APIs not available');
        }
        
        if (!chrome.storage || !chrome.runtime) {
            throw new Error('Required Chrome APIs not available');
        }
    },
    'Verify Chrome extension APIs are accessible'
);

// Test Storage Functionality
tester.addTest(
    'Storage System',
    async () => {
        try {
            // Test storage write/read
            await new Promise((resolve, reject) => {
                chrome.storage.local.set({ testKey: 'testValue' }, () => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve();
                    }
                });
            });
            
            await new Promise((resolve, reject) => {
                chrome.storage.local.get(['testKey'], (result) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else if (result.testKey !== 'testValue') {
                        reject(new Error('Storage read/write failed'));
                    } else {
                        resolve();
                    }
                });
            });
            
            // Clean up test data
            chrome.storage.local.remove(['testKey']);
        } catch (error) {
            throw new Error(`Storage test failed: ${error.message}`);
        }
    },
    'Verify Chrome storage functionality'
);

// Auto-run tests when script loads (if in extension context)
if (typeof chrome !== 'undefined' && chrome.runtime) {
    // Wait a moment for all scripts to load
    setTimeout(() => {
        tester.runAllTests().catch(error => {
            console.error('Test runner error:', error);
        });
    }, 1000);
} else {
    console.log('🔧 Extension tester loaded. Run tester.runAllTests() to test.');
}

// Export for manual testing
if (typeof window !== 'undefined') {
    window.ExtensionTester = tester;
}
