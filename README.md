# Insly Locize Translation Integration

A safe, human-in-the-loop translation management system for Insly's Locize integration with AI-powered suggestions.

## 🔒 Safety First

This system is designed with production safety in mind:
- **READ-ONLY by default** - No automatic uploads to Locize
- **Human review required** - All translations go through PR review
- **Manual upload only** - Explicit action needed to update Locize
- **AI suggestions** - Never uploaded automatically

## 🏗️ Architecture

```
Locize (Production) 
    ↓ (read-only)
GitHub Actions
    ↓
AI Translation Engine
    ↓
Pull Request (Review)
    ↓
Human Approval
    ↓ (manual trigger)
Locize (Production)
```

## 📁 Repository Structure

```
insly-locize-translations/
├── .github/workflows/      # Automated workflows
├── scripts/               # Core functionality
├── translations/          # Translation files
│   ├── current/          # From Locize (read-only)
│   ├── pending/          # AI suggestions
│   └── approved/         # Human-verified
├── config/               # Configuration files
└── docs/                 # Documentation
```

## 🚀 Quick Start

### 1. Setup GitHub Secrets

Required secrets (Settings → Secrets → Actions):
- `LOCIZE_PROJECT_ID` - Your project ID
- `LOCIZE_READ_KEY` - Read-only API key
- `LOCIZE_WRITE_KEY` - Write API key (for manual uploads only)

### 2. Configure Repository

```bash
# Clone repository
git clone https://github.com/Insly/insly-locize-translations
cd insly-locize-translations

# Install dependencies
npm install
```

### 3. Workflows

#### Daily Analysis (Safe)
- Downloads current translations
- Analyzes coverage
- Creates report
- No uploads

#### Weekly AI Suggestions (Safe)
- Identifies missing translations
- Generates AI suggestions
- Creates PR for review
- No automatic uploads

#### Manual Upload (Protected)
- Requires explicit trigger
- Uploads approved translations only
- Confirmation required

## 📊 Workflows

### 1. Download & Analyze (Automated, Safe)

```yaml
# Runs daily at 2 AM UTC
name: Download and Analyze Translations
```

**What it does:**
- Downloads latest translations from Locize
- Generates coverage report
- Identifies missing translations
- Creates PR with analysis

**Safety:** Read-only operation

### 2. AI Translation Suggestions (Automated, Safe)

```yaml
# Runs weekly on Mondays
name: Generate AI Translation Suggestions
```

**What it does:**
- Uses insurance-specific dictionaries
- Generates translation suggestions
- Includes confidence scores
- Creates PR for human review

**Safety:** Outputs to `pending/` folder only

### 3. Upload Approved Translations (Manual Only)

```yaml
# Manual trigger only
name: Upload Approved Translations
```

**What it does:**
- Uploads human-reviewed translations
- Requires confirmation
- Creates audit log
- Updates Locize production

**Safety:** Requires manual dispatch and confirmation

## 🤖 AI Translation Features

### Insurance Dictionary
- Professional insurance terminology
- Context-aware translations
- Format preservation
- Confidence scoring

### Review Process
1. AI generates suggestions with confidence scores
2. Creates PR with detailed report
3. Human reviews and edits
4. Approved translations moved to `approved/` folder
5. Manual trigger to upload

### Example Output
```json
{
  "Premium": {
    "translation": "Premio",
    "confidence": 0.95,
    "method": "dictionary"
  },
  "Deductible": {
    "translation": "Franchigia",
    "confidence": 0.92,
    "method": "dictionary"
  }
}
```

## 🛡️ Safety Guidelines

1. **Never commit API keys** - Use GitHub Secrets
2. **Review all AI suggestions** - Don't trust blindly
3. **Test before upload** - Use dry-run mode
4. **Backup before changes** - Download current state
5. **Monitor after upload** - Check Locize dashboard

## 📝 Usage Examples

### Check Coverage
```bash
npm run coverage
```

### Generate AI Suggestions
```bash
npm run ai:translate -- --language=it
```

### Review Suggestions
1. Check Pull Requests tab
2. Review AI suggestions
3. Edit as needed
4. Approve PR

### Upload Approved Translations
```bash
# Dry run first
npm run upload:dry-run -- --language=it

# Actual upload (requires confirmation)
npm run upload:approved -- --language=it --confirm
```

## 🔄 Development Workflow

1. **Automated Analysis** → Daily coverage reports
2. **AI Suggestions** → Weekly translation suggestions
3. **Human Review** → PR-based review process
4. **Manual Upload** → Explicit upload action
5. **Verification** → Check Locize dashboard

## 🚨 Emergency Procedures

### Rollback Translations
```bash
# Download previous version
npm run download:version -- --version=previous

# Upload to restore
npm run upload:emergency -- --confirm
```

### Disable Automation
1. Go to Actions tab
2. Disable workflows
3. Investigate issue

## 📞 Support

- **Issues**: Create GitHub issue
- **Urgent**: Contact DevOps team
- **Questions**: Check docs/ folder

## 📄 License

Proprietary - Insly Internal Use Only

---

⚠️ **Remember**: This system has access to production translations. Always review changes carefully before uploading. 
# Transferred to InslyAI organization
