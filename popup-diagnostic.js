console.log('🚀 DIAGNOSTIC: Script loading...');

// Test basic functionality
function testButton() {
    console.log('✅ Button click works!');
    document.getElementById('testResults').textContent = '✅ Button clicks working!';
}

function testConsole() {
    console.log('✅ Console logging works!');
    console.warn('⚠️ This is a warning test');
    console.error('❌ This is an error test');
    document.getElementById('testResults').textContent = '✅ Console tests complete - check F12 console!';
}

function testForm() {
    const input = document.getElementById('testInput');
    const value = input.value;
    console.log('📝 Form input value:', value);
    document.getElementById('formResults').textContent = `📝 You typed: "${value}"`;
}

async function testStorage() {
    try {
        console.log('🔍 Testing Chrome storage...');
        const testData = { test: 'diagnostic-mode', timestamp: Date.now() };
        await chrome.storage.local.set(testData);
        const result = await chrome.storage.local.get('test');
        console.log('✅ Storage test result:', result);
        document.getElementById('extensionResults').textContent = '✅ Chrome storage working!';
    } catch (error) {
        console.error('❌ Storage error:', error);
        document.getElementById('extensionResults').textContent = `❌ Storage error: ${error.message}`;
    }
}

async function testNotionAPI() {
    try {
        console.log('🌐 Testing API access...');
        const response = await fetch('https://api.notion.com/v1', {
            method: 'GET',
            headers: {
                'User-Agent': 'Diagnostic Test'
            }
        });
        console.log('🌐 API response status:', response.status);
        document.getElementById('extensionResults').textContent = `🌐 API accessible (status: ${response.status})`;
    } catch (error) {
        console.error('❌ API error:', error);
        document.getElementById('extensionResults').textContent = `❌ API error: ${error.message}`;
    }
}

// Page load tests
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded successfully');
    document.getElementById('loadStatus').textContent = '✅ Page loaded successfully!';
    
    // Add event listeners to buttons
    document.getElementById('testButtonBtn').addEventListener('click', testButton);
    document.getElementById('testConsoleBtn').addEventListener('click', testConsole);
    document.getElementById('testFormBtn').addEventListener('click', testForm);
    document.getElementById('testStorageBtn').addEventListener('click', testStorage);
    document.getElementById('testNotionAPIBtn').addEventListener('click', testNotionAPI);
    
    // Count elements
    const elementCount = document.body.children.length;
    console.log('🔍 Body children count:', elementCount);
    
    // Test CSS
    const bodyStyle = window.getComputedStyle(document.body);
    console.log('🎨 Body background:', bodyStyle.backgroundColor);
    console.log('🎨 Body width:', bodyStyle.width);
    console.log('🎨 Body height:', bodyStyle.height);
    
    setTimeout(() => {
        document.getElementById('loadStatus').textContent = `✅ Diagnostic ready! (${elementCount} elements)`;
    }, 1000);
});

console.log('🔧 DIAGNOSTIC: Script setup complete');
