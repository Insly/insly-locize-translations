#!/usr/bin/env node

const https = require('https');
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
    PROJECT_ID: process.env.LOCIZE_PROJECT_ID,
    API_KEY: process.env.LOCIZE_READ_KEY,
    OUTPUT_DIR: options.output || 'translations/current',
    LANGUAGE: options.language || null
};

// Validate configuration
if (!CONFIG.PROJECT_ID || !CONFIG.API_KEY) {
    console.error('❌ Missing required environment variables: LOCIZE_PROJECT_ID, LOCIZE_READ_KEY');
    process.exit(1);
}

/**
 * Fetch available languages from Locize
 */
async function fetchLanguages() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.locize.app',
            path: `/languages/${CONFIG.PROJECT_ID}`,
            headers: { 'Authorization': `Bearer ${CONFIG.API_KEY}` }
        };

        https.get(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`Failed to fetch languages: HTTP ${res.statusCode}`));
                }
            });
        }).on('error', reject);
    });
}

/**
 * Download translations for a specific language
 */
async function downloadLanguage(language, namespace = 'translation') {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.locize.app',
            path: `/${CONFIG.PROJECT_ID}/latest/${language}/${namespace}`,
            headers: { 'Authorization': `Bearer ${CONFIG.API_KEY}` }
        };

        console.log(`📥 Downloading ${language}...`);

        https.get(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    const translations = JSON.parse(data);
                    resolve({ language, translations, count: Object.keys(translations).length });
                } else if (res.statusCode === 404) {
                    console.log(`⚠️  No translations found for ${language}`);
                    resolve({ language, translations: {}, count: 0 });
                } else {
                    reject(new Error(`Failed to download ${language}: HTTP ${res.statusCode}`));
                }
            });
        }).on('error', reject);
    });
}

/**
 * Save translations to file
 */
function saveTranslations(language, translations) {
    const outputPath = path.join(CONFIG.OUTPUT_DIR, `${language}.json`);
    
    // Ensure directory exists
    if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
        fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
    }
    
    // Save with proper formatting
    fs.writeFileSync(outputPath, JSON.stringify(translations, null, 2));
    console.log(`✅ Saved ${language} to ${outputPath}`);
}

/**
 * Main download function
 */
async function downloadTranslations() {
    try {
        console.log('🌐 Locize Translation Downloader');
        console.log('================================');
        console.log(`Project: ${CONFIG.PROJECT_ID}`);
        console.log(`Output: ${CONFIG.OUTPUT_DIR}`);
        console.log('');

        // Fetch available languages
        const languages = await fetchLanguages();
        const languageCodes = Object.keys(languages);
        
        console.log(`Found ${languageCodes.length} languages: ${languageCodes.join(', ')}\n`);

        // Determine which languages to download
        let targetLanguages = languageCodes;
        if (CONFIG.LANGUAGE) {
            if (languageCodes.includes(CONFIG.LANGUAGE)) {
                targetLanguages = [CONFIG.LANGUAGE];
            } else {
                console.error(`❌ Language '${CONFIG.LANGUAGE}' not found in project`);
                process.exit(1);
            }
        }

        // Download each language
        const results = [];
        for (const lang of targetLanguages) {
            try {
                const result = await downloadLanguage(lang);
                saveTranslations(lang, result.translations);
                results.push(result);
            } catch (error) {
                console.error(`❌ Error downloading ${lang}: ${error.message}`);
            }
        }

        // Summary
        console.log('\n📊 Download Summary');
        console.log('==================');
        results.forEach(result => {
            console.log(`${result.language}: ${result.count} translations`);
        });

        // Save metadata
        const metadata = {
            timestamp: new Date().toISOString(),
            projectId: CONFIG.PROJECT_ID,
            languages: results.map(r => ({
                code: r.language,
                name: languages[r.language].name,
                count: r.count
            }))
        };
        
        const metadataPath = path.join(CONFIG.OUTPUT_DIR, '_metadata.json');
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
        
        console.log(`\n✅ Download complete! Metadata saved to ${metadataPath}`);

    } catch (error) {
        console.error('❌ Download failed:', error.message);
        process.exit(1);
    }
}

// Run the downloader
downloadTranslations();