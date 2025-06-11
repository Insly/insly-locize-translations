// Global state
let translations = {};
let metadata = {};
let referenceLanguage = 'en';
let modifiedTranslations = {};

// Language names mapping
const languageNames = {
    'en': 'English',
    'da': 'Danish',
    'de': 'German',
    'en-US': 'English (US)',
    'en-CA': 'English (Canada)',
    'es': 'Spanish',
    'et': 'Estonian',
    'fi': 'Finnish',
    'fr': 'French',
    'it': 'Italian',
    'nb': 'Norwegian',
    'nl': 'Dutch',
    'pl': 'Polish',
    'pt': 'Portuguese',
    'sv': 'Swedish'
};

// Language flags
const languageFlags = {
    'en': '🇬🇧',
    'en-US': '🇺🇸',
    'en-CA': '🇨🇦',
    'it': '🇮🇹',
    'de': '🇩🇪',
    'fr': '🇫🇷',
    'es': '🇪🇸',
    'pt': '🇵🇹',
    'nl': '🇳🇱',
    'da': '🇩🇰',
    'sv': '🇸🇪',
    'nb': '🇳🇴',
    'fi': '🇫🇮',
    'pl': '🇵🇱',
    'et': '🇪🇪'
};

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    await loadTranslations();
    setupEventListeners();
    updateHeaderStats();
    renderLanguageGrid();
    populateLanguageSelector();
    hideLoading();
});

// Load all translations
async function loadTranslations() {
    try {
        // Load metadata - using relative path from dashboard
        const metaResponse = await fetch('../translations/current/_metadata.json');
        metadata = await metaResponse.json();
        
        // Load all language files
        for (const lang of metadata.languages) {
            const response = await fetch(`../translations/current/${lang.code}.json`);
            translations[lang.code] = await response.json();
        }
    } catch (error) {
        console.error('Error loading translations:', error);
        alert('Error loading translations. Please make sure you are running this from a web server.');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
    
    // Language selector
    document.getElementById('languageSelector').addEventListener('change', (e) => {
        if (e.target.value) {
            loadTranslationBrowser(e.target.value);
        }
    });
    
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyFilter(btn.dataset.filter);
        });
    });
    
    // Export buttons
    document.getElementById('exportModified').addEventListener('click', exportModifiedTranslations);
    document.getElementById('exportMissing').addEventListener('click', exportMissingTranslations);
    document.getElementById('exportReport').addEventListener('click', exportFullReport);
    
    // Modal close
    document.querySelector('.modal-close').addEventListener('click', closeEditModal);
}

// Switch tabs
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === tabName);
    });
    
    // Initialize analytics if switching to that tab
    if (tabName === 'analytics') {
        renderCharts();
    }
}

// Update header statistics
function updateHeaderStats() {
    const totalKeys = translations[referenceLanguage] ? Object.keys(translations[referenceLanguage]).length : 0;
    const totalLanguages = Object.keys(translations).length - 1; // Exclude reference language
    
    // Calculate average coverage
    let totalCoverage = 0;
    let languageCount = 0;
    
    Object.keys(translations).forEach(lang => {
        if (lang !== referenceLanguage) {
            const coverage = calculateCoverage(lang);
            totalCoverage += coverage;
            languageCount++;
        }
    });
    
    const avgCoverage = languageCount > 0 ? Math.round(totalCoverage / languageCount) : 0;
    
    document.getElementById('totalKeys').textContent = totalKeys.toLocaleString();
    document.getElementById('totalLanguages').textContent = totalLanguages;
    document.getElementById('avgCoverage').textContent = `${avgCoverage}%`;
}

// Calculate coverage for a language
function calculateCoverage(language) {
    const referenceKeys = Object.keys(translations[referenceLanguage] || {});
    const languageKeys = Object.keys(translations[language] || {});
    
    if (referenceKeys.length === 0) return 0;
    
    let translatedCount = 0;
    referenceKeys.forEach(key => {
        if (translations[language] && translations[language][key] && 
            translations[language][key] !== translations[referenceLanguage][key]) {
            translatedCount++;
        }
    });
    
    return Math.round((translatedCount / referenceKeys.length) * 100);
}

// Render language grid
function renderLanguageGrid() {
    const grid = document.getElementById('languageGrid');
    grid.innerHTML = '';
    
    Object.keys(translations).forEach(lang => {
        if (lang === referenceLanguage) return;
        
        const coverage = calculateCoverage(lang);
        const stats = getLanguageStats(lang);
        
        const card = document.createElement('div');
        card.className = 'language-card';
        card.onclick = () => {
            switchTab('browser');
            document.getElementById('languageSelector').value = lang;
            loadTranslationBrowser(lang);
        };
        
        card.innerHTML = `
            <div class="language-header">
                <div class="language-name">
                    ${languageFlags[lang] || '🌐'}
                    ${languageNames[lang] || lang}
                    <span class="language-code">${lang}</span>
                </div>
                <span class="coverage-badge ${getCoverageClass(coverage)}">${coverage}%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill ${getCoverageColor(coverage)}" style="width: ${coverage}%"></div>
            </div>
            <div class="language-stats">
                <span>${stats.translated.toLocaleString()} translated</span>
                <span>${stats.missing.toLocaleString()} missing</span>
            </div>
        `;
        
        grid.appendChild(card);
    });
}

// Get language statistics
function getLanguageStats(language) {
    const referenceKeys = Object.keys(translations[referenceLanguage] || {});
    const languageData = translations[language] || {};
    
    let translated = 0;
    let missing = 0;
    
    referenceKeys.forEach(key => {
        if (languageData[key] && languageData[key] !== translations[referenceLanguage][key]) {
            translated++;
        } else {
            missing++;
        }
    });
    
    return { translated, missing, total: referenceKeys.length };
}

// Get coverage class for styling
function getCoverageClass(coverage) {
    if (coverage >= 80) return 'coverage-high';
    if (coverage >= 50) return 'coverage-medium';
    return 'coverage-low';
}

// Get coverage color for progress bar
function getCoverageColor(coverage) {
    if (coverage >= 80) return '#10b981';
    if (coverage >= 50) return '#f59e0b';
    return '#ef4444';
}

// Populate language selector
function populateLanguageSelector() {
    const selector = document.getElementById('languageSelector');
    
    Object.keys(translations).forEach(lang => {
        if (lang === referenceLanguage) return;
        
        const option = document.createElement('option');
        option.value = lang;
        option.textContent = `${languageFlags[lang] || '🌐'} ${languageNames[lang] || lang} (${lang})`;
        selector.appendChild(option);
    });
}

// Hide loading overlay
function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('active');
}

// Show loading overlay
function showLoading(message = 'Loading...') {
    const overlay = document.getElementById('loadingOverlay');
    overlay.querySelector('p').textContent = message;
    overlay.classList.add('active');
}

// Store modifications in localStorage
function saveModification(language, key, value) {
    if (!modifiedTranslations[language]) {
        modifiedTranslations[language] = {};
    }
    modifiedTranslations[language][key] = value;
    localStorage.setItem('modifiedTranslations', JSON.stringify(modifiedTranslations));
}

// Load modifications from localStorage
function loadModifications() {
    const saved = localStorage.getItem('modifiedTranslations');
    if (saved) {
        modifiedTranslations = JSON.parse(saved);
    }
}