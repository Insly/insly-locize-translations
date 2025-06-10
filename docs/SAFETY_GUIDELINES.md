# Safety Guidelines for Locize Translation Management

## 🔒 Core Principles

1. **Production is Sacred** - Never make automated changes to production translations
2. **Human Review Required** - All translations must be reviewed before upload
3. **Read-Only by Default** - Workflows only download unless explicitly authorized
4. **Audit Everything** - All uploads are logged and tracked

## 🚨 Critical Rules

### 1. API Key Management

- **NEVER** commit API keys to the repository
- Use separate READ and WRITE keys
- Store keys only in GitHub Secrets
- Rotate keys regularly
- Limit write key usage to manual workflows only

### 2. Workflow Safety

#### Safe Workflows (Automated)
- `download-analyze.yml` - Read-only analysis
- `ai-translate.yml` - Generates suggestions only

#### Protected Workflows (Manual Only)
- `upload-approved.yml` - Requires explicit confirmation
- Must type "CONFIRM" to proceed
- Creates audit trail

### 3. Translation Review Process

```
1. AI generates suggestions → pending/
2. Human reviews in PR
3. Approved translations → approved/
4. Manual upload with confirmation
5. Verify in Locize dashboard
```

## 🛡️ Safety Checks

### Before Upload

- [ ] Translations have been reviewed by a human
- [ ] Format validation passed
- [ ] Backup of current translations exists
- [ ] Dry run completed successfully
- [ ] Reason for upload documented

### After Upload

- [ ] Verify in Locize dashboard
- [ ] Check application for issues
- [ ] Monitor error logs
- [ ] Update audit log

## 🚫 Never Do This

1. **Auto-upload AI translations** - Always require human review
2. **Skip confirmation** - Always require explicit confirmation
3. **Upload without backup** - Always backup current state first
4. **Ignore validation errors** - Fix issues before upload
5. **Use write key in automated workflows** - Manual triggers only

## 🔄 Emergency Procedures

### Accidental Upload

1. **Stop** - Disable GitHub Actions immediately
2. **Backup** - Download current state from Locize
3. **Rollback** - Use backup to restore previous state
4. **Investigate** - Review audit logs
5. **Fix** - Address root cause
6. **Document** - Update procedures

### Rollback Process

```bash
# 1. Download backup
node scripts/download-translations.js --output=emergency-backup

# 2. Restore from backup
node scripts/upload-to-locize.js \
  --file=backups/[timestamp]/[language].json \
  --language=[language] \
  --confirm

# 3. Verify restoration
node scripts/verify-upload.js --language=[language]
```

## 📋 Checklist for New Team Members

- [ ] Read all safety documentation
- [ ] Understand the workflow
- [ ] Know how to rollback
- [ ] Have access to Locize dashboard
- [ ] Understand API key separation
- [ ] Practice with dry-run mode

## 🔐 Security Best Practices

1. **Least Privilege** - Only give write access when needed
2. **Separation of Concerns** - Read and write keys separate
3. **Audit Trail** - Every action is logged
4. **Review Required** - No direct automation to production
5. **Backup First** - Always backup before changes

## 📞 Escalation

If something goes wrong:

1. **Immediate**: Disable workflows
2. **Within 5 min**: Notify team lead
3. **Within 15 min**: Begin rollback if needed
4. **Within 1 hour**: Complete incident report

## 🎯 Golden Rule

> **When in doubt, don't upload. Ask for help.**

Remember: It's better to delay a translation update than to break production.