// Setup script for Notion Todo Extension
document.addEventListener('DOMContentLoaded', function() {
    const apiKeyInput = document.getElementById('apiKey');
    const databaseIdInput = document.getElementById('databaseId');
    const setupBtn = document.getElementById('setupBtn');
    const skipBtn = document.getElementById('skipBtn');
    const setupStatus = document.getElementById('setupStatus');

    // Default values (fallback)
    const DEFAULT_API_KEY = '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';
    const DEFAULT_DATABASE_ID = '22856a75337c80c8a913e4130ca6dc0d';

    // Load existing settings
    loadExistingSettings();

    // Event listeners
    setupBtn.addEventListener('click', saveSettings);
    skipBtn.addEventListener('click', useDefaultSettings);
    
    // Allow Enter key to save
    [apiKeyInput, databaseIdInput].forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                saveSettings();
            }
        });
    });

    async function loadExistingSettings() {
        try {
            const result = await chrome.storage.sync.get(['notionApiKey', 'notionDatabaseId']);
            
            if (result.notionApiKey) {
                apiKeyInput.value = result.notionApiKey;
            }
            
            if (result.notionDatabaseId) {
                databaseIdInput.value = result.notionDatabaseId;
            }

            // If both are set, show they can update
            if (result.notionApiKey && result.notionDatabaseId) {
                showStatus('Settings loaded! You can update them below.', 'success');
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async function saveSettings() {
        const apiKey = apiKeyInput.value.trim();
        const databaseId = databaseIdInput.value.trim();

        if (!apiKey || !databaseId) {
            showStatus('Please enter both API key and Database ID', 'error');
            return;
        }

        setupBtn.disabled = true;
        setupBtn.textContent = '🔄 Saving...';

        try {
            // Test the connection first
            const isValid = await testConnection(apiKey, databaseId);
            
            if (!isValid) {
                showStatus('❌ Connection failed. Please check your API key and Database ID.', 'error');
                setupBtn.disabled = false;
                setupBtn.textContent = '💾 Save & Continue';
                return;
            }

            // Save to Chrome storage
            await chrome.storage.sync.set({
                notionApiKey: apiKey,
                notionDatabaseId: databaseId,
                setupCompleted: true
            });

            showStatus('✅ Settings saved successfully!', 'success');
            
            // Redirect to main popup after delay
            setTimeout(() => {
                window.location.href = 'popup.html';
            }, 1500);

        } catch (error) {
            console.error('Error saving settings:', error);
            showStatus(`❌ Error: ${error.message}`, 'error');
            setupBtn.disabled = false;
            setupBtn.textContent = '💾 Save & Continue';
        }
    }

    async function useDefaultSettings() {
        setupBtn.disabled = true;
        skipBtn.disabled = true;
        showStatus('🔄 Using default settings...', 'success');

        try {
            await chrome.storage.sync.set({
                notionApiKey: DEFAULT_API_KEY,
                notionDatabaseId: DEFAULT_DATABASE_ID,
                setupCompleted: true
            });

            showStatus('✅ Default settings applied!', 'success');
            
            setTimeout(() => {
                window.location.href = 'popup.html';
            }, 1000);

        } catch (error) {
            console.error('Error applying default settings:', error);
            showStatus(`❌ Error: ${error.message}`, 'error');
            setupBtn.disabled = false;
            skipBtn.disabled = false;
        }
    }

    async function testConnection(apiKey, databaseId) {
        try {
            const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Notion-Version': '2022-06-28',
                    'Content-Type': 'application/json'
                }
            });

            return response.ok;
        } catch (error) {
            console.error('Connection test failed:', error);
            return false;
        }
    }

    function showStatus(message, type = '') {
        setupStatus.textContent = message;
        setupStatus.className = `setup-status ${type}`;
        setupStatus.style.display = 'block';
    }
});
