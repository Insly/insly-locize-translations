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
    OUTPUT_FILE: options.output || 'coverage-report.json',
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
 * Calculate coverage statistics
 */
function calculateCoverage(referenceKeys, targetTranslations) {
    const targetKeys = Object.keys(targetTranslations || {});
    const translated = targetKeys.filter(key => referenceKeys.includes(key)).length;
    const missing = referenceKeys.filter(key => !targetKeys.includes(key)).length;
    const coverage = referenceKeys.length > 0 ? (translated / referenceKeys.length * 100) : 0;
    
    return {
        total: referenceKeys.length,
        translated,
        missing,
        coverage: coverage.toFixed(2)
    };
}

/**
 * Analyze translation types
 */
function analyzeTranslationTypes(translations) {
    const types = {
        numeric: 0,
        identical: 0,
        translated: 0,
        empty: 0
    };
    
    Object.entries(translations || {}).forEach(([key, value]) => {
        if (!value || value.trim() === '') {
            types.empty++;
        } else if (/^\d+$/.test(key.trim()) && /^\d+$/.test(value.trim())) {
            types.numeric++;
        } else if (key.trim() === value.trim()) {
            types.identical++;
        } else {
            types.translated++;
        }
    });
    
    return types;
}

/**
 * Main analysis function
 */
async function analyzeCoverage() {
    console.log('📊 Translation Coverage Analyzer');
    console.log('================================\n');

    // Load metadata if available
    const metadataPath = path.join(CONFIG.TRANSLATIONS_DIR, '_metadata.json');
    const metadata = fs.existsSync(metadataPath) 
        ? JSON.parse(fs.readFileSync(metadataPath, 'utf8'))
        : null;

    // Load reference language
    const referenceTranslations = loadTranslations(CONFIG.REFERENCE_LANGUAGE);
    if (!referenceTranslations) {
        console.error(`❌ Reference language '${CONFIG.REFERENCE_LANGUAGE}' not found`);
        process.exit(1);
    }
    
    const referenceKeys = Object.keys(referenceTranslations);
    console.log(`Reference language: ${CONFIG.REFERENCE_LANGUAGE}`);
    console.log(`Total keys: ${referenceKeys.length}\n`);

    // Analyze each language
    const languages = [];
    const files = fs.readdirSync(CONFIG.TRANSLATIONS_DIR)
        .filter(f => f.endsWith('.json') && !f.startsWith('_'));
    
    let totalCoverage = 0;
    let languageCount = 0;

    for (const file of files) {
        const language = path.basename(file, '.json');
        if (language === CONFIG.REFERENCE_LANGUAGE) continue;
        
        const translations = loadTranslations(language);
        if (!translations) continue;
        
        const coverage = calculateCoverage(referenceKeys, translations);
        const types = analyzeTranslationTypes(translations);
        
        const languageData = {
            code: language,
            name: metadata?.languages?.find(l => l.code === language)?.name || language,
            ...coverage,
            types
        };
        
        languages.push(languageData);
        totalCoverage += parseFloat(coverage.coverage);
        languageCount++;
        
        // Console output
        const coverageColor = coverage.coverage > 80 ? '🟢' : coverage.coverage > 50 ? '🟡' : '🔴';
        console.log(`${coverageColor} ${language}: ${coverage.coverage}% (${coverage.translated}/${coverage.total})`);
    }

    // Calculate summary statistics
    const summary = {
        totalKeys: referenceKeys.length,
        totalLanguages: languageCount + 1,
        targetLanguages: languageCount,
        averageCoverage: languageCount > 0 ? (totalCoverage / languageCount).toFixed(2) : '0.00',
        lastUpdated: metadata?.timestamp || new Date().toISOString()
    };

    // Identify problem areas
    const lowCoverageLanguages = languages.filter(l => parseFloat(l.coverage) < 50);
    const highIdenticalLanguages = languages.filter(l => 
        l.types.identical > (l.translated * 0.5) // More than 50% identical
    );

    // Generate report
    const report = {
        summary,
        referenceLanguage: {
            code: CONFIG.REFERENCE_LANGUAGE,
            totalKeys: referenceKeys.length,
            types: analyzeTranslationTypes(referenceTranslations)
        },
        languages: languages.sort((a, b) => b.coverage - a.coverage),
        alerts: {
            lowCoverage: lowCoverageLanguages.map(l => ({
                code: l.code,
                coverage: l.coverage,
                missing: l.missing
            })),
            highIdentical: highIdenticalLanguages.map(l => ({
                code: l.code,
                identical: l.types.identical,
                percentage: ((l.types.identical / l.translated) * 100).toFixed(2)
            }))
        }
    };

    // Save report
    fs.writeFileSync(CONFIG.OUTPUT_FILE, JSON.stringify(report, null, 2));
    
    // Summary output
    console.log('\n📈 Summary');
    console.log('==========');
    console.log(`Languages: ${summary.targetLanguages}`);
    console.log(`Average coverage: ${summary.averageCoverage}%`);
    
    if (lowCoverageLanguages.length > 0) {
        console.log(`\n⚠️  ${lowCoverageLanguages.length} languages below 50% coverage`);
    }
    
    console.log(`\n✅ Report saved to: ${CONFIG.OUTPUT_FILE}`);
}

// Run the analyzer
analyzeCoverage();