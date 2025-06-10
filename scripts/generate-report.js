#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const argMap = {};
args.forEach(arg => {
  const [key, value] = arg.split('=');
  if (key && value) {
    argMap[key.replace(/^--/, '')] = value;
  }
});

const coverageFile = argMap.coverage || 'coverage-report.json';
const missingFile = argMap.missing || 'missing-translations.json';
const outputFile = argMap.output || `docs/reports/daily-report-${new Date().toISOString().split('T')[0]}.md`;

// Ensure output directory exists
const outputDir = path.dirname(outputFile);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Read input files
let coverage, missing;
try {
  coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
  missing = JSON.parse(fs.readFileSync(missingFile, 'utf8'));
} catch (error) {
  console.error('Error reading input files:', error.message);
  process.exit(1);
}

// Generate markdown report
const report = [];
const date = new Date().toISOString().split('T')[0];

report.push(`# Translation Coverage Report - ${date}`);
report.push('');
report.push('## Summary');
report.push(`- **Total Keys**: ${coverage.summary.totalKeys.toLocaleString()}`);
report.push(`- **Languages**: ${coverage.summary.targetLanguages}`);
report.push(`- **Average Coverage**: ${coverage.summary.averageCoverage}%`);
report.push(`- **Last Updated**: ${new Date(coverage.summary.lastUpdated).toLocaleString()}`);
report.push('');

// Language coverage table
report.push('## Language Coverage');
report.push('');
report.push('| Language | Coverage | Translated | Missing |');
report.push('|----------|----------|------------|---------|');

coverage.languages.forEach(lang => {
  const flag = getFlag(lang.code);
  report.push(`| ${flag} ${lang.name} (${lang.code}) | ${lang.coverage}% | ${lang.translated.toLocaleString()} | ${lang.missing.toLocaleString()} |`);
});

report.push('');

// Low coverage alerts
if (coverage.alerts && coverage.alerts.lowCoverage && coverage.alerts.lowCoverage.length > 0) {
  report.push('## ⚠️ Low Coverage Alerts');
  report.push('');
  report.push('Languages below 50% coverage:');
  coverage.alerts.lowCoverage.forEach(lang => {
    report.push(`- **${lang.code}**: ${lang.coverage}% (${lang.missing.toLocaleString()} missing)`);
  });
  report.push('');
}

// Missing translations sample
report.push('## Missing Translations Sample');
report.push('');
report.push('Here are some examples of missing translations:');
report.push('');

// Get sample of missing keys for each language
Object.entries(missing).forEach(([lang, translations]) => {
  const keys = Object.keys(translations).slice(0, 5);
  if (keys.length > 0) {
    report.push(`### ${lang}`);
    report.push('```json');
    const sample = {};
    keys.forEach(key => {
      sample[key] = translations[key];
    });
    report.push(JSON.stringify(sample, null, 2));
    report.push('```');
    report.push('');
  }
});

// Add actions section
report.push('## Next Steps');
report.push('');
report.push('1. Review missing translations in `missing-translations.json`');
report.push('2. Run AI translation suggestions: `npm run translate:ai`');
report.push('3. Review and approve translations in `translations/pending/`');
report.push('4. Upload approved translations: `npm run upload:approved`');

// Write report
fs.writeFileSync(outputFile, report.join('\n'));
console.log(`✅ Report generated: ${outputFile}`);

// Helper function to get flag emoji
function getFlag(code) {
  const flags = {
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
  return flags[code] || '🌐';
}