// Advanced functionality for translation management
let keysToDelete = [];
let aiTranslations = {};

// Update summary cards
function updateSummaryCards(stats) {
    // Calculate totals
    let totalTranslated = 0;
    let totalMissing = 0;
    let totalNumeric = 0;
    let bestLanguage = null;
    let bestCoverage = 0;
    
    // Count numeric keys in reference
    const referenceData = translations[referenceLanguage] || {};
    Object.keys(referenceData).forEach(key => {
        if (/^\d+$/.test(key)) totalNumeric++;
    });
    
    stats.languages.forEach(lang => {
        totalTranslated += lang.translated;
        totalMissing += lang.missing;
        
        if (lang.coverage > bestCoverage) {
            bestCoverage = lang.coverage;
            bestLanguage = lang;
        }
    });
    
    // Update UI
    document.getElementById('totalTranslated').textContent = totalTranslated.toLocaleString();
    document.getElementById('totalMissing').textContent = totalMissing.toLocaleString();
    document.getElementById('totalNumeric').textContent = totalNumeric.toLocaleString();
    
    if (bestLanguage) {
        document.getElementById('bestLanguage').textContent = 
            `${languageFlags[bestLanguage.code] || '🌐'} ${bestLanguage.name} (${bestCoverage}%)`;
    }
}

// Show delete numeric keys modal
function showDeleteNumericKeys() {
    const numericKeys = [];
    const referenceData = translations[referenceLanguage] || {};
    
    Object.keys(referenceData).forEach(key => {
        if (/^\d+$/.test(key)) {
            numericKeys.push(key);
        }
    });
    
    document.getElementById('numericKeyCount').textContent = numericKeys.length;
    const keysList = document.getElementById('numericKeysList');
    
    // Show preview of keys
    keysList.innerHTML = numericKeys.slice(0, 100).join(', ');
    if (numericKeys.length > 100) {
        keysList.innerHTML += `\n... and ${numericKeys.length - 100} more`;
    }
    
    keysToDelete = numericKeys;
    document.getElementById('deleteNumericModal').classList.add('active');
}

// Show AI translate modal
function showAITranslate() {
    if (!currentLanguage) {
        alert('Please select a language first');
        return;
    }
    
    const missingKeys = allTranslationItems.filter(item => item.status === 'missing');
    
    document.getElementById('missingCount').textContent = missingKeys.length;
    document.getElementById('aiLanguage').textContent = 
        `${languageFlags[currentLanguage] || '🌐'} ${languageNames[currentLanguage] || currentLanguage}`;
    
    document.getElementById('aiTranslateModal').classList.add('active');
    
    // Update confidence value display
    const confidenceSlider = document.getElementById('aiConfidence');
    const confidenceValue = document.getElementById('confidenceValue');
    confidenceSlider.oninput = () => {
        confidenceValue.textContent = confidenceSlider.value + '%';
    };
}

// Show bulk delete modal
function showBulkDelete() {
    analyzeBulkDelete();
    document.getElementById('bulkDeleteModal').classList.add('active');
}

// Analyze keys for bulk deletion
function analyzeBulkDelete() {
    const toDelete = {
        numeric: [],
        empty: [],
        test: [],
        uuid: []
    };
    
    const referenceData = translations[referenceLanguage] || {};
    
    Object.entries(referenceData).forEach(([key, value]) => {
        // Numeric keys
        if (/^\d+$/.test(key)) {
            toDelete.numeric.push(key);
        }
        
        // Empty values
        if (!value || value.trim() === '') {
            toDelete.empty.push(key);
        }
        
        // Test keys
        if (/test|demo|example|sample|dummy/i.test(key) || /test|demo|example|sample|dummy/i.test(value)) {
            toDelete.test.push(key);
        }
        
        // UUID-like keys
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) {
            toDelete.uuid.push(key);
        }
    });
    
    updateDeletePreview();
}

// Update delete preview
function updateDeletePreview() {
    let count = 0;
    keysToDelete = [];
    
    if (document.getElementById('deleteNumeric').checked) {
        const numericKeys = [];
        Object.keys(translations[referenceLanguage] || {}).forEach(key => {
            if (/^\d+$/.test(key)) numericKeys.push(key);
        });
        keysToDelete = keysToDelete.concat(numericKeys);
        count += numericKeys.length;
    }
    
    if (document.getElementById('deleteEmpty').checked) {
        const emptyKeys = [];
        Object.entries(translations[referenceLanguage] || {}).forEach(([key, value]) => {
            if (!value || value.trim() === '') emptyKeys.push(key);
        });
        keysToDelete = keysToDelete.concat(emptyKeys);
        count += emptyKeys.length;
    }
    
    if (document.getElementById('deleteTest').checked) {
        const testKeys = [];
        Object.entries(translations[referenceLanguage] || {}).forEach(([key, value]) => {
            if (/test|demo|example|sample|dummy/i.test(key) || /test|demo|example|sample|dummy/i.test(value)) {
                testKeys.push(key);
            }
        });
        keysToDelete = keysToDelete.concat(testKeys);
        count += testKeys.length;
    }
    
    if (document.getElementById('deleteUUID').checked) {
        const uuidKeys = [];
        Object.keys(translations[referenceLanguage] || {}).forEach(key => {
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) {
                uuidKeys.push(key);
            }
        });
        keysToDelete = keysToDelete.concat(uuidKeys);
        count += uuidKeys.length;
    }
    
    // Remove duplicates
    keysToDelete = [...new Set(keysToDelete)];
    
    document.getElementById('deleteCount').textContent = keysToDelete.length;
}

// Close modal
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Confirm delete numeric keys
function confirmDeleteNumeric() {
    if (keysToDelete.length === 0) return;
    
    // Export deletion list
    const deletionData = {
        action: 'delete_numeric_keys',
        timestamp: new Date().toISOString(),
        keys: keysToDelete,
        count: keysToDelete.length
    };
    
    downloadJSON(deletionData, `delete-numeric-keys-${new Date().toISOString().split('T')[0]}.json`);
    
    // Remove from local data
    keysToDelete.forEach(key => {
        Object.keys(translations).forEach(lang => {
            if (translations[lang] && translations[lang][key]) {
                delete translations[lang][key];
            }
        });
    });
    
    // Refresh UI
    if (currentLanguage) {
        loadTranslationBrowser(currentLanguage);
    }
    
    showNotification(`Marked ${keysToDelete.length} numeric keys for deletion`);
    closeModal('deleteNumericModal');
}

// Confirm bulk delete
function confirmBulkDelete() {
    if (keysToDelete.length === 0) return;
    
    // Export deletion list
    const deletionData = {
        action: 'bulk_delete_keys',
        timestamp: new Date().toISOString(),
        keys: keysToDelete,
        count: keysToDelete.length,
        criteria: {
            numeric: document.getElementById('deleteNumeric').checked,
            empty: document.getElementById('deleteEmpty').checked,
            test: document.getElementById('deleteTest').checked,
            uuid: document.getElementById('deleteUUID').checked
        }
    };
    
    downloadJSON(deletionData, `bulk-delete-keys-${new Date().toISOString().split('T')[0]}.json`);
    
    // Remove from local data
    keysToDelete.forEach(key => {
        Object.keys(translations).forEach(lang => {
            if (translations[lang] && translations[lang][key]) {
                delete translations[lang][key];
            }
        });
    });
    
    // Refresh UI
    if (currentLanguage) {
        loadTranslationBrowser(currentLanguage);
    }
    
    showNotification(`Marked ${keysToDelete.length} keys for deletion`);
    closeModal('bulkDeleteModal');
}

// Start AI translation
async function startAITranslation() {
    if (!currentLanguage) return;
    
    const missingKeys = allTranslationItems.filter(item => item.status === 'missing');
    const context = document.getElementById('aiContext').value;
    const confidence = parseInt(document.getElementById('aiConfidence').value);
    
    document.getElementById('aiProgress').style.display = 'block';
    const progressBar = document.getElementById('aiProgressBar');
    const statusText = document.getElementById('aiStatus');
    
    aiTranslations = {};
    
    // Simulate AI translation process
    for (let i = 0; i < missingKeys.length; i++) {
        const item = missingKeys[i];
        const progress = ((i + 1) / missingKeys.length) * 100;
        
        progressBar.style.width = progress + '%';
        statusText.textContent = `Translating ${i + 1} of ${missingKeys.length}...`;
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Generate mock translation (in real app, this would call AI API)
        const translatedText = await mockAITranslate(item.reference, currentLanguage, context);
        
        // Only include if above confidence threshold
        const mockConfidence = 70 + Math.random() * 30; // 70-100%
        if (mockConfidence >= confidence) {
            aiTranslations[item.key] = {
                original: item.reference,
                translation: translatedText,
                confidence: mockConfidence,
                context: context
            };
        }
    }
    
    statusText.textContent = `Completed! ${Object.keys(aiTranslations).length} translations generated.`;
    
    // Export AI translations
    const exportData = {
        language: currentLanguage,
        timestamp: new Date().toISOString(),
        context: context,
        confidenceThreshold: confidence,
        translations: aiTranslations
    };
    
    downloadJSON(exportData, `ai-translations-${currentLanguage}-${new Date().toISOString().split('T')[0]}.json`);
    
    setTimeout(() => {
        closeModal('aiTranslateModal');
        showNotification(`Generated ${Object.keys(aiTranslations).length} AI translations`);
    }, 1500);
}

// Mock AI translation function
async function mockAITranslate(text, targetLang, context) {
    // In a real implementation, this would call an AI API
    // For demo, we'll add language-specific prefixes
    const prefixes = {
        'it': '[IT] ',
        'de': '[DE] ',
        'fr': '[FR] ',
        'es': '[ES] ',
        'pt': '[PT] ',
        'nl': '[NL] ',
        'da': '[DA] ',
        'sv': '[SV] ',
        'nb': '[NO] ',
        'fi': '[FI] ',
        'pl': '[PL] ',
        'et': '[ET] '
    };
    
    const prefix = prefixes[targetLang] || '[TR] ';
    
    // Add context-specific modifications
    if (context === 'insurance') {
        return prefix + text.replace(/policy/gi, 'insurance policy')
                          .replace(/claim/gi, 'insurance claim');
    }
    
    return prefix + text;
}

// Add event listeners for bulk delete checkboxes
document.addEventListener('DOMContentLoaded', () => {
    ['deleteNumeric', 'deleteEmpty', 'deleteTest', 'deleteUUID'].forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.addEventListener('change', updateDeletePreview);
        }
    });
});