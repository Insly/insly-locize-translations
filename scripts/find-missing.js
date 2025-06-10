#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {};
args.forEach((arg, i) => {
    if (arg.startsWith('--')) {
        const key = arg.slice(2);
        const value = args[i + 1];
        options[key] = value;
    }
});

const CONFIG = {
    TRANSLATIONS_DIR: options.input || 'translations/current',
    OUTPUT_FILE: options.output || 'missing-translations.json',
    LANGUAGES: options.languages ? options.languages.split(',') : null,
    REFERENCE_LANGUAGE: options.reference || 'en'
};

/**
 * Load translations from file
 */
function loadTranslations(language) {
    const filePath = path.join(CONFIG.TRANSLATIONS_DIR, `${language}.json`);
    if (!fs.existsSync(filePath)) {
        return null;
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * Find missing translations
 */
function findMissing(referenceTranslations, targetTranslations) {
    const missing = {};
    
    for (const [key, value] of Object.entries(referenceTranslations)) {
        if (!targetTranslations || !targetTranslations.hasOwnProperty(key)) {
            missing[key] = value;
        }
    }
    
    return missing;
}

/**
 * Categorize missing translations
 */
function categorizeMissing(missing) {
    const categories = {
        numeric: {},
        identical: {},
        text: {}
    };
    
    for (const [key, value] of Object.entries(missing)) {
        if (/^\d+$/.test(value.trim())) {
            categories.numeric[key] = value;
        } else if (key.trim() === value.trim()) {
            categories.identical[key] = value;
        } else {
            categories.text[key] = value;
        }
    }
    
    return categories;
}

/**
 * Main function
 */
async function findMissingTranslations() {
    console.log('🔍 Missing Translations Finder');
    console.log('==============================\n');

    // Load reference translations
    const referenceTranslations = loadTranslations(CONFIG.REFERENCE_LANGUAGE);
    if (!referenceTranslations) {
        console.error(`❌ Reference language '${CONFIG.REFERENCE_LANGUAGE}' not found`);
        process.exit(1);
    }
    
    console.log(`Reference language: ${CONFIG.REFERENCE_LANGUAGE}`);
    console.log(`Total keys: ${Object.keys(referenceTranslations).length}\n`);

    // Determine target languages
    let targetLanguages = CONFIG.LANGUAGES;
    if (!targetLanguages) {
        // Auto-detect languages
        const files = fs.readdirSync(CONFIG.TRANSLATIONS_DIR)
            .filter(f => f.endsWith('.json') && !f.startsWith('_'));
        targetLanguages = files
            .map(f => path.basename(f, '.json'))
            .filter(lang => lang !== CONFIG.REFERENCE_LANGUAGE);
    }

    console.log(`Target languages: ${targetLanguages.join(', ')}\n`);

    // Find missing for each language
    const missingByLanguage = {};
    const summary = {
        reference: CONFIG.REFERENCE_LANGUAGE,
        totalKeys: Object.keys(referenceTranslations).length,
        languages: {}
    };

    for (const language of targetLanguages) {
        console.log(`Analyzing ${language}...`);
        
        const targetTranslations = loadTranslations(language);
        if (!targetTranslations) {
            console.log(`  ⚠️  No translations found`);
            continue;
        }
        
        const missing = findMissing(referenceTranslations, targetTranslations);
        const categories = categorizeMissing(missing);
        
        missingByLanguage[language] = missing;
        
        summary.languages[language] = {
            total: Object.keys(targetTranslations).length,
            missing: Object.keys(missing).length,
            categories: {
                numeric: Object.keys(categories.numeric).length,
                identical: Object.keys(categories.identical).length,
                text: Object.keys(categories.text).length
            }
        };
        
        console.log(`  Missing: ${Object.keys(missing).length}`);
        console.log(`  - Numeric: ${Object.keys(categories.numeric).length}`);
        console.log(`  - Identical: ${Object.keys(categories.identical).length}`);
        console.log(`  - Text: ${Object.keys(categories.text).length}`);
    }

    // Save results
    const output = {
        timestamp: new Date().toISOString(),
        summary,
        missingByLanguage
    };
    
    fs.writeFileSync(CONFIG.OUTPUT_FILE, JSON.stringify(missingByLanguage, null, 2));
    console.log(`\n✅ Missing translations saved to: ${CONFIG.OUTPUT_FILE}`);
    
    // Save detailed report
    const reportPath = CONFIG.OUTPUT_FILE.replace('.json', '-detailed.json');
    fs.writeFileSync(reportPath, JSON.stringify(output, null, 2));
    console.log(`✅ Detailed report saved to: ${reportPath}`);

    // Print summary
    console.log('\n📊 Summary');
    console.log('==========');
    let totalMissing = 0;
    for (const [lang, data] of Object.entries(summary.languages)) {
        totalMissing += data.missing;
        const percentage = ((data.total / summary.totalKeys) * 100).toFixed(2);
        console.log(`${lang}: ${data.missing} missing (${percentage}% coverage)`);
    }
    console.log(`\nTotal missing across all languages: ${totalMissing}`);
}

// Run the finder
findMissingTranslations();