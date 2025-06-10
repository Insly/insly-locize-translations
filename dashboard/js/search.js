// Translation browser functionality
let currentLanguage = '';
let currentFilter = 'all';
let allTranslationItems = [];

// Load translation browser for a language
function loadTranslationBrowser(language) {
    currentLanguage = language;
    const referenceData = translations[referenceLanguage] || {};
    const languageData = translations[language] || {};
    
    // Build translation items
    allTranslationItems = [];
    
    Object.keys(referenceData).forEach(key => {
        const referenceValue = referenceData[key];
        const translationValue = languageData[key] || '';
        const isTranslated = translationValue && translationValue !== referenceValue;
        const isIdentical = translationValue === referenceValue;
        const isMissing = !translationValue;
        
        allTranslationItems.push({
            key,
            reference: referenceValue,
            translation: translationValue,
            status: isMissing ? 'missing' : (isIdentical ? 'identical' : 'translated'),
            isNumeric: /^\d+$/.test(key)
        });
    });
    
    // Apply current filter and search
    applyFilter(currentFilter);
}

// Apply filter to translation items
function applyFilter(filter) {
    currentFilter = filter;
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    let filteredItems = allTranslationItems;
    
    // Apply status filter
    if (filter !== 'all') {
        filteredItems = filteredItems.filter(item => item.status === filter);
    }
    
    // Apply search filter
    if (searchTerm) {
        filteredItems = filteredItems.filter(item => 
            item.key.toLowerCase().includes(searchTerm) ||
            item.reference.toLowerCase().includes(searchTerm) ||
            item.translation.toLowerCase().includes(searchTerm)
        );
    }
    
    renderTranslationList(filteredItems);
}

// Render translation list
function renderTranslationList(items) {
    const list = document.getElementById('translationList');
    list.innerHTML = '';
    
    if (items.length === 0) {
        list.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-secondary);">No translations found</div>';
        return;
    }
    
    // Limit to first 500 items for performance
    const displayItems = items.slice(0, 500);
    
    displayItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'translation-item';
        
        const keyDiv = document.createElement('div');
        keyDiv.className = 'translation-key';
        keyDiv.textContent = item.key;
        
        const referenceDiv = document.createElement('div');
        referenceDiv.className = 'translation-value';
        referenceDiv.textContent = item.reference;
        
        const translationDiv = document.createElement('div');
        translationDiv.className = `translation-value ${item.status === 'missing' ? 'translation-missing' : ''}`;
        translationDiv.textContent = item.translation || '[Missing]';
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'translation-actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-sm btn-primary';
        editBtn.textContent = 'Edit';
        editBtn.onclick = () => openEditModal(item.key, item.reference, item.translation);
        
        actionsDiv.appendChild(editBtn);
        
        div.appendChild(keyDiv);
        div.appendChild(referenceDiv);
        div.appendChild(translationDiv);
        div.appendChild(actionsDiv);
        
        list.appendChild(div);
    });
    
    if (items.length > 500) {
        const notice = document.createElement('div');
        notice.style.padding = '1rem';
        notice.style.textAlign = 'center';
        notice.style.color = 'var(--text-secondary)';
        notice.textContent = `Showing first 500 of ${items.length.toLocaleString()} items`;
        list.appendChild(notice);
    }
}

// Search functionality
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;
    
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            applyFilter(currentFilter);
        }, 300);
    });
});

// Export functions for charts
function getTranslationStats() {
    const stats = {
        languages: [],
        totalKeys: Object.keys(translations[referenceLanguage] || {}).length
    };
    
    Object.keys(translations).forEach(lang => {
        if (lang === referenceLanguage) return;
        
        const langStats = getLanguageStats(lang);
        stats.languages.push({
            code: lang,
            name: languageNames[lang] || lang,
            ...langStats,
            coverage: calculateCoverage(lang)
        });
    });
    
    return stats;
}

// Render charts
function renderCharts() {
    const stats = getTranslationStats();
    
    // Coverage chart
    const coverageCanvas = document.getElementById('coverageChart');
    const coverageCtx = coverageCanvas.getContext('2d');
    
    // Clear canvas
    coverageCtx.clearRect(0, 0, coverageCanvas.width, coverageCanvas.height);
    
    // Sort languages by coverage
    const sortedLanguages = stats.languages.sort((a, b) => b.coverage - a.coverage);
    
    // Draw bars
    const barWidth = (coverageCanvas.width - 60) / sortedLanguages.length;
    const maxHeight = coverageCanvas.height - 60;
    
    sortedLanguages.forEach((lang, index) => {
        const x = 30 + index * barWidth;
        const height = (lang.coverage / 100) * maxHeight;
        const y = coverageCanvas.height - 30 - height;
        
        // Draw bar
        coverageCtx.fillStyle = getCoverageColor(lang.coverage);
        coverageCtx.fillRect(x + barWidth * 0.1, y, barWidth * 0.8, height);
        
        // Draw percentage
        coverageCtx.fillStyle = '#333';
        coverageCtx.font = '12px sans-serif';
        coverageCtx.textAlign = 'center';
        coverageCtx.fillText(`${lang.coverage}%`, x + barWidth / 2, y - 5);
        
        // Draw language code
        coverageCtx.save();
        coverageCtx.translate(x + barWidth / 2, coverageCanvas.height - 5);
        coverageCtx.rotate(-Math.PI / 4);
        coverageCtx.textAlign = 'right';
        coverageCtx.fillText(lang.code, 0, 0);
        coverageCtx.restore();
    });
    
    // Status distribution chart
    renderStatusChart();
    
    // Missing summary
    renderMissingSummary(stats);
}

// Render status distribution chart
function renderStatusChart() {
    const statusCanvas = document.getElementById('statusChart');
    const ctx = statusCanvas.getContext('2d');
    
    ctx.clearRect(0, 0, statusCanvas.width, statusCanvas.height);
    
    // Calculate totals
    let translated = 0;
    let identical = 0;
    let missing = 0;
    
    allTranslationItems.forEach(item => {
        if (item.status === 'translated') translated++;
        else if (item.status === 'identical') identical++;
        else if (item.status === 'missing') missing++;
    });
    
    const total = translated + identical + missing;
    if (total === 0) return;
    
    // Draw pie chart
    const centerX = statusCanvas.width / 2;
    const centerY = statusCanvas.height / 2;
    const radius = Math.min(centerX, centerY) - 40;
    
    const segments = [
        { label: 'Translated', value: translated, color: '#10b981' },
        { label: 'Identical', value: identical, color: '#f59e0b' },
        { label: 'Missing', value: missing, color: '#ef4444' }
    ];
    
    let currentAngle = -Math.PI / 2;
    
    segments.forEach(segment => {
        const angle = (segment.value / total) * 2 * Math.PI;
        
        // Draw segment
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + angle);
        ctx.closePath();
        ctx.fillStyle = segment.color;
        ctx.fill();
        
        // Draw label
        const labelAngle = currentAngle + angle / 2;
        const labelX = centerX + Math.cos(labelAngle) * (radius + 20);
        const labelY = centerY + Math.sin(labelAngle) * (radius + 20);
        
        ctx.fillStyle = '#333';
        ctx.font = '12px sans-serif';
        ctx.textAlign = labelX < centerX ? 'right' : 'left';
        ctx.fillText(`${segment.label} (${Math.round(segment.value / total * 100)}%)`, labelX, labelY);
        
        currentAngle += angle;
    });
}

// Render missing translations summary
function renderMissingSummary(stats) {
    const summary = document.getElementById('missingSummary');
    summary.innerHTML = '<h3>Missing Translations by Language</h3>';
    
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.innerHTML = `
        <thead>
            <tr style="border-bottom: 2px solid var(--border);">
                <th style="text-align: left; padding: 0.5rem;">Language</th>
                <th style="text-align: right; padding: 0.5rem;">Missing</th>
                <th style="text-align: right; padding: 0.5rem;">Coverage</th>
                <th style="text-align: right; padding: 0.5rem;">Action</th>
            </tr>
        </thead>
        <tbody>
        </tbody>
    `;
    
    const tbody = table.querySelector('tbody');
    
    stats.languages
        .filter(lang => lang.missing > 0)
        .sort((a, b) => b.missing - a.missing)
        .forEach(lang => {
            const row = document.createElement('tr');
            row.style.borderBottom = '1px solid var(--border)';
            row.innerHTML = `
                <td style="padding: 0.5rem;">${languageFlags[lang.code] || '🌐'} ${lang.name}</td>
                <td style="text-align: right; padding: 0.5rem;">${lang.missing.toLocaleString()}</td>
                <td style="text-align: right; padding: 0.5rem;">
                    <span class="coverage-badge ${getCoverageClass(lang.coverage)}">${lang.coverage}%</span>
                </td>
                <td style="text-align: right; padding: 0.5rem;">
                    <button class="btn btn-sm btn-primary" onclick="viewMissingTranslations('${lang.code}')">
                        View Missing
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    
    summary.appendChild(table);
}

// View missing translations for a language
function viewMissingTranslations(language) {
    switchTab('browser');
    document.getElementById('languageSelector').value = language;
    loadTranslationBrowser(language);
    
    // Set filter to missing
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === 'missing');
    });
    currentFilter = 'missing';
    applyFilter('missing');
}