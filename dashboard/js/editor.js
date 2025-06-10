// Translation editor functionality
let currentEditKey = '';
let currentEditLanguage = '';

// Open edit modal
function openEditModal(key, reference, translation) {
    currentEditKey = key;
    currentEditLanguage = currentLanguage;
    
    document.getElementById('editKey').value = key;
    document.getElementById('editReference').value = reference;
    document.getElementById('editTranslation').value = translation || '';
    
    document.getElementById('editModal').classList.add('active');
    document.getElementById('editTranslation').focus();
}

// Close edit modal
function closeEditModal() {
    document.getElementById('editModal').classList.remove('active');
    currentEditKey = '';
    currentEditLanguage = '';
}

// Save translation
function saveTranslation() {
    const newValue = document.getElementById('editTranslation').value;
    
    if (!currentEditKey || !currentEditLanguage) return;
    
    // Update in memory
    if (!translations[currentEditLanguage]) {
        translations[currentEditLanguage] = {};
    }
    translations[currentEditLanguage][currentEditKey] = newValue;
    
    // Save to localStorage as modified
    saveModification(currentEditLanguage, currentEditKey, newValue);
    
    // Update the UI
    loadTranslationBrowser(currentEditLanguage);
    
    // Close modal
    closeEditModal();
    
    // Show success message
    showNotification('Translation saved locally');
}

// Export modified translations
function exportModifiedTranslations() {
    loadModifications();
    
    if (Object.keys(modifiedTranslations).length === 0) {
        showNotification('No modified translations to export');
        return;
    }
    
    // Create export data
    const exportData = {};
    Object.keys(modifiedTranslations).forEach(lang => {
        exportData[lang] = {
            language: lang,
            timestamp: new Date().toISOString(),
            translations: modifiedTranslations[lang]
        };
    });
    
    // Download file
    downloadJSON(exportData, `modified-translations-${new Date().toISOString().split('T')[0]}.json`);
    
    // Log export
    logExport(`Exported ${Object.keys(modifiedTranslations).length} modified language(s)`);
}

// Export missing translations
function exportMissingTranslations() {
    const missingByLanguage = {};
    
    Object.keys(translations).forEach(lang => {
        if (lang === referenceLanguage) return;
        
        const missing = [];
        const referenceData = translations[referenceLanguage];
        const languageData = translations[lang] || {};
        
        Object.keys(referenceData).forEach(key => {
            if (!languageData[key] || languageData[key] === referenceData[key]) {
                missing.push({
                    key,
                    reference: referenceData[key],
                    current: languageData[key] || null
                });
            }
        });
        
        if (missing.length > 0) {
            missingByLanguage[lang] = {
                language: lang,
                languageName: languageNames[lang] || lang,
                missingCount: missing.length,
                translations: missing
            };
        }
    });
    
    // Download file
    downloadJSON(missingByLanguage, `missing-translations-${new Date().toISOString().split('T')[0]}.json`);
    
    // Log export
    const totalMissing = Object.values(missingByLanguage).reduce((sum, lang) => sum + lang.missingCount, 0);
    logExport(`Exported ${totalMissing.toLocaleString()} missing translations across ${Object.keys(missingByLanguage).length} languages`);
}

// Export full coverage report
function exportFullReport() {
    const report = {
        generated: new Date().toISOString(),
        summary: {
            totalKeys: Object.keys(translations[referenceLanguage] || {}).length,
            languages: []
        },
        details: {}
    };
    
    // Generate language summaries
    Object.keys(translations).forEach(lang => {
        if (lang === referenceLanguage) return;
        
        const stats = getLanguageStats(lang);
        const coverage = calculateCoverage(lang);
        
        report.summary.languages.push({
            code: lang,
            name: languageNames[lang] || lang,
            coverage: coverage,
            translated: stats.translated,
            missing: stats.missing,
            total: stats.total
        });
        
        // Add detailed breakdown
        report.details[lang] = {
            missing: [],
            identical: [],
            translated: []
        };
        
        const referenceData = translations[referenceLanguage];
        const languageData = translations[lang] || {};
        
        Object.keys(referenceData).forEach(key => {
            const refValue = referenceData[key];
            const langValue = languageData[key];
            
            if (!langValue) {
                report.details[lang].missing.push({ key, reference: refValue });
            } else if (langValue === refValue) {
                report.details[lang].identical.push({ key, value: refValue });
            } else {
                report.details[lang].translated.push({ key, reference: refValue, translation: langValue });
            }
        });
    });
    
    // Sort languages by coverage
    report.summary.languages.sort((a, b) => a.coverage - b.coverage);
    
    // Download file
    downloadJSON(report, `translation-report-${new Date().toISOString().split('T')[0]}.json`);
    
    // Log export
    logExport(`Exported full translation report for ${report.summary.languages.length} languages`);
}

// Download JSON file
function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Log export action
function logExport(message) {
    const log = document.getElementById('exportLog');
    const timestamp = new Date().toLocaleTimeString();
    log.textContent = `[${timestamp}] ${message}\n${log.textContent}`;
}

// Show notification
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: var(--primary-color);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 1002;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('editModal').classList.contains('active')) {
        closeEditModal();
    }
    
    if (e.ctrlKey || e.metaKey) {
        if (e.key === 's' && document.getElementById('editModal').classList.contains('active')) {
            e.preventDefault();
            saveTranslation();
        }
    }
});