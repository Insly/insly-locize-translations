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
    LANGUAGE: options.language || 'it',
    INPUT_FILE: options.input || 'missing-by-language.json',
    OUTPUT_FILE: options.output || `translations/pending/ai-suggestions/${options.language}_${new Date().toISOString().split('T')[0]}.json`,
    DICTIONARY_FILE: options.dictionary || `scripts/dictionaries/insurance-${options.language || 'it'}.json`,
    CONFIDENCE_THRESHOLD: parseFloat(options.confidence || '0.7')
};

/**
 * Load insurance dictionary
 */
function loadDictionary() {
    if (!fs.existsSync(CONFIG.DICTIONARY_FILE)) {
        console.warn(`⚠️  Dictionary not found: ${CONFIG.DICTIONARY_FILE}`);
        return {};
    }
    return JSON.parse(fs.readFileSync(CONFIG.DICTIONARY_FILE, 'utf8'));
}

/**
 * Load missing translations
 */
function loadMissingTranslations() {
    if (!fs.existsSync(CONFIG.INPUT_FILE)) {
        console.error(`❌ Input file not found: ${CONFIG.INPUT_FILE}`);
        process.exit(1);
    }
    const data = JSON.parse(fs.readFileSync(CONFIG.INPUT_FILE, 'utf8'));
    return data[CONFIG.LANGUAGE] || {};
}

/**
 * AI Translation Engine
 */
class AITranslator {
    constructor(dictionary) {
        this.dictionary = dictionary;
        this.patterns = this.loadPatterns();
    }

    /**
     * Load language-specific patterns
     */
    loadPatterns() {
        // Italian patterns example
        if (CONFIG.LANGUAGE === 'it') {
            return [
                { pattern: /annual premium/gi, replacement: 'premio annuale' },
                { pattern: /insurance policy/gi, replacement: 'polizza assicurativa' },
                { pattern: /deductible/gi, replacement: 'franchigia' },
                { pattern: /coverage limit/gi, replacement: 'massimale di copertura' },
                { pattern: /claim/gi, replacement: 'sinistro' },
                { pattern: /third party/gi, replacement: 'terzi' }
            ];
        }
        return [];
    }

    /**
     * Translate using dictionary
     */
    translateWithDictionary(text) {
        const lower = text.toLowerCase().trim();
        
        // Direct match
        if (this.dictionary[lower]) {
            return {
                translation: this.preserveCase(text, this.dictionary[lower]),
                confidence: 0.95,
                method: 'dictionary'
            };
        }

        // Partial match
        let translated = text;
        let matches = 0;
        const words = text.split(/\s+/);
        
        const translatedWords = words.map(word => {
            const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
            if (this.dictionary[cleanWord]) {
                matches++;
                return this.preserveCase(word, this.dictionary[cleanWord]);
            }
            return word;
        });

        if (matches > 0) {
            translated = translatedWords.join(' ');
            const confidence = Math.min(0.9, 0.7 + (matches / words.length) * 0.2);
            return {
                translation: translated,
                confidence,
                method: 'dictionary-partial'
            };
        }

        return null;
    }

    /**
     * Translate using patterns
     */
    translateWithPatterns(text) {
        let translated = text;
        let applied = false;

        for (const { pattern, replacement } of this.patterns) {
            if (pattern.test(text)) {
                translated = translated.replace(pattern, replacement);
                applied = true;
            }
        }

        if (applied && translated !== text) {
            return {
                translation: translated,
                confidence: 0.8,
                method: 'pattern'
            };
        }

        return null;
    }

    /**
     * Basic word-by-word translation
     */
    translateBasic(text) {
        const words = text.split(/\s+/);
        let translated = [];
        let translatedCount = 0;

        for (const word of words) {
            const clean = word.toLowerCase().replace(/[^a-z]/g, '');
            if (this.dictionary[clean]) {
                translated.push(this.preserveCase(word, this.dictionary[clean]));
                translatedCount++;
            } else {
                translated.push(word);
            }
        }

        if (translatedCount > 0) {
            return {
                translation: translated.join(' '),
                confidence: 0.6 + (translatedCount / words.length) * 0.2,
                method: 'basic'
            };
        }

        return null;
    }

    /**
     * Main translation method
     */
    translate(key, value) {
        // Skip numeric values
        if (/^\d+$/.test(value.trim())) {
            return null;
        }

        // Try different translation methods
        let result = this.translateWithDictionary(value) ||
                    this.translateWithPatterns(value) ||
                    this.translateBasic(value);

        if (!result) {
            return null;
        }

        // Add metadata
        result.key = key;
        result.original = value;
        result.timestamp = new Date().toISOString();
        result.needsReview = result.confidence < 0.8;

        return result;
    }

    /**
     * Preserve original case pattern
     */
    preserveCase(original, translated) {
        if (original[0] === original[0].toUpperCase()) {
            return translated.charAt(0).toUpperCase() + translated.slice(1);
        }
        return translated.toLowerCase();
    }
}

/**
 * Main function
 */
async function generateAITranslations() {
    console.log('🤖 AI Translation Generator');
    console.log('===========================');
    console.log(`Language: ${CONFIG.LANGUAGE}`);
    console.log(`Confidence threshold: ${CONFIG.CONFIDENCE_THRESHOLD}\n`);

    // Load resources
    const dictionary = loadDictionary();
    const missingTranslations = loadMissingTranslations();
    const translator = new AITranslator(dictionary);

    console.log(`Dictionary entries: ${Object.keys(dictionary).length}`);
    console.log(`Missing translations: ${Object.keys(missingTranslations).length}\n`);

    // Translate each missing key
    const results = {
        metadata: {
            language: CONFIG.LANGUAGE,
            timestamp: new Date().toISOString(),
            totalKeys: Object.keys(missingTranslations).length,
            threshold: CONFIG.CONFIDENCE_THRESHOLD
        },
        translations: {},
        statistics: {
            translated: 0,
            skipped: 0,
            byMethod: {
                dictionary: 0,
                'dictionary-partial': 0,
                pattern: 0,
                basic: 0
            },
            byConfidence: {
                high: 0,      // > 0.9
                medium: 0,    // 0.7 - 0.9
                low: 0        // < 0.7
            }
        }
    };

    // Process translations
    for (const [key, value] of Object.entries(missingTranslations)) {
        const translation = translator.translate(key, value);
        
        if (translation && translation.confidence >= CONFIG.CONFIDENCE_THRESHOLD) {
            results.translations[key] = translation;
            results.statistics.translated++;
            results.statistics.byMethod[translation.method]++;
            
            if (translation.confidence > 0.9) {
                results.statistics.byConfidence.high++;
            } else if (translation.confidence >= 0.7) {
                results.statistics.byConfidence.medium++;
            } else {
                results.statistics.byConfidence.low++;
            }
            
            // Progress indicator
            if (results.statistics.translated % 50 === 0) {
                process.stdout.write('.');
            }
        } else {
            results.statistics.skipped++;
        }
    }

    console.log('\n\n📊 Translation Results');
    console.log('=====================');
    console.log(`Translated: ${results.statistics.translated}`);
    console.log(`Skipped: ${results.statistics.skipped}`);
    console.log('\nBy method:');
    Object.entries(results.statistics.byMethod).forEach(([method, count]) => {
        if (count > 0) console.log(`  ${method}: ${count}`);
    });
    console.log('\nBy confidence:');
    console.log(`  High (>0.9): ${results.statistics.byConfidence.high}`);
    console.log(`  Medium (0.7-0.9): ${results.statistics.byConfidence.medium}`);
    console.log(`  Low (<0.7): ${results.statistics.byConfidence.low}`);

    // Ensure output directory exists
    const outputDir = path.dirname(CONFIG.OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save results
    fs.writeFileSync(CONFIG.OUTPUT_FILE, JSON.stringify(results, null, 2));
    console.log(`\n✅ Translations saved to: ${CONFIG.OUTPUT_FILE}`);

    // Generate simple format for review
    const simpleFormat = {};
    Object.entries(results.translations).forEach(([key, data]) => {
        simpleFormat[key] = data.translation;
    });
    
    const simplePath = CONFIG.OUTPUT_FILE.replace('.json', '_simple.json');
    fs.writeFileSync(simplePath, JSON.stringify(simpleFormat, null, 2));
    console.log(`✅ Simple format saved to: ${simplePath}`);
}

// Run the generator
generateAITranslations();