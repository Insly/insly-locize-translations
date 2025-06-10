#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

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
    API_KEY: process.env.LOCIZE_WRITE_KEY,
    FILE_PATH: options.file,
    LANGUAGE: options.language,
    VERSION: options.version || 'latest',
    NAMESPACE: options.namespace || 'translation',
    DRY_RUN: process.env.DRY_RUN === 'true' || options['dry-run'] === 'true'
};

// Validate configuration
if (!CONFIG.PROJECT_ID || !CONFIG.API_KEY) {
    console.error('❌ Missing required environment variables: LOCIZE_PROJECT_ID, LOCIZE_WRITE_KEY');
    process.exit(1);
}

if (!CONFIG.FILE_PATH || !CONFIG.LANGUAGE) {
    console.error('❌ Missing required arguments: --file, --language');
    process.exit(1);
}

/**
 * Load translations from file
 */
function loadTranslations() {
    if (!fs.existsSync(CONFIG.FILE_PATH)) {
        console.error(`❌ File not found: ${CONFIG.FILE_PATH}`);
        process.exit(1);
    }
    
    const content = fs.readFileSync(CONFIG.FILE_PATH, 'utf8');
    return JSON.parse(content);
}

/**
 * Upload translations to Locize
 */
async function uploadToLocize(translations) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(translations);
        
        const options = {
            hostname: 'api.locize.app',
            path: `/update/${CONFIG.PROJECT_ID}/${CONFIG.VERSION}/${CONFIG.LANGUAGE}/${CONFIG.NAMESPACE}`,
            method: 'POST',
            headers: {
                'Authorization': CONFIG.API_KEY,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        console.log(`📤 Uploading to: ${options.hostname}${options.path}`);

        if (CONFIG.DRY_RUN) {
            console.log('🔍 DRY RUN - Would upload:');
            console.log(`   Keys: ${Object.keys(translations).length}`);
            console.log(`   Sample:`, Object.entries(translations).slice(0, 3));
            resolve({ success: true, dryRun: true });
            return;
        }

        const req = https.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode === 200 || res.statusCode === 204) {
                    resolve({ 
                        success: true, 
                        statusCode: res.statusCode,
                        response: responseData 
                    });
                } else {
                    reject(new Error(`Upload failed: HTTP ${res.statusCode} - ${responseData}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(new Error(`Request failed: ${error.message}`));
        });

        req.write(data);
        req.end();
    });
}

/**
 * Confirm upload with user
 */
async function confirmUpload(translations) {
    const keyCount = Object.keys(translations).length;
    
    console.log('\n⚠️  Upload Confirmation Required');
    console.log('================================');
    console.log(`Project: ${CONFIG.PROJECT_ID}`);
    console.log(`Language: ${CONFIG.LANGUAGE}`);
    console.log(`Version: ${CONFIG.VERSION}`);
    console.log(`Namespace: ${CONFIG.NAMESPACE}`);
    console.log(`Total keys: ${keyCount}`);
    console.log('\nSample translations:');
    
    Object.entries(translations).slice(0, 5).forEach(([key, value]) => {
        console.log(`  "${key}": "${value}"`);
    });
    
    if (keyCount > 5) {
        console.log(`  ... and ${keyCount - 5} more`);
    }
    
    if (CONFIG.DRY_RUN) {
        console.log('\n✅ DRY RUN MODE - No actual upload will occur');
        return true;
    }
    
    // In CI environment, skip interactive confirmation
    if (process.env.CI || process.env.GITHUB_ACTIONS) {
        console.log('\n✅ CI environment detected - proceeding with upload');
        return true;
    }
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    return new Promise((resolve) => {
        rl.question('\nProceed with upload? (yes/no): ', (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
        });
    });
}

/**
 * Create audit log entry
 */
function createAuditLog(result, translations) {
    const auditEntry = {
        timestamp: new Date().toISOString(),
        action: 'upload',
        language: CONFIG.LANGUAGE,
        version: CONFIG.VERSION,
        namespace: CONFIG.NAMESPACE,
        keyCount: Object.keys(translations).length,
        success: result.success,
        dryRun: CONFIG.DRY_RUN,
        user: process.env.USER || process.env.USERNAME || 'unknown',
        githubActor: process.env.GITHUB_ACTOR || null,
        githubRunId: process.env.GITHUB_RUN_ID || null
    };
    
    const auditPath = path.join('docs', 'audit', `upload_${Date.now()}.json`);
    const auditDir = path.dirname(auditPath);
    
    if (!fs.existsSync(auditDir)) {
        fs.mkdirSync(auditDir, { recursive: true });
    }
    
    fs.writeFileSync(auditPath, JSON.stringify(auditEntry, null, 2));
    console.log(`\n📝 Audit log created: ${auditPath}`);
}

/**
 * Main function
 */
async function main() {
    console.log('🚀 Locize Upload Tool');
    console.log('====================\n');
    
    try {
        // Load translations
        const translations = loadTranslations();
        console.log(`✅ Loaded ${Object.keys(translations).length} translations from ${CONFIG.FILE_PATH}`);
        
        // Confirm upload
        const confirmed = await confirmUpload(translations);
        if (!confirmed) {
            console.log('\n❌ Upload cancelled by user');
            process.exit(0);
        }
        
        // Perform upload
        console.log('\n📤 Starting upload...');
        const result = await uploadToLocize(translations);
        
        if (result.success) {
            console.log('\n✅ Upload successful!');
            if (CONFIG.DRY_RUN) {
                console.log('   (This was a dry run - no actual changes were made)');
            }
            
            // Create audit log
            createAuditLog(result, translations);
        }
        
    } catch (error) {
        console.error('\n❌ Upload failed:', error.message);
        
        // Still create audit log for failed attempts
        createAuditLog({ success: false, error: error.message }, {});
        
        process.exit(1);
    }
}

// Run the uploader
main();