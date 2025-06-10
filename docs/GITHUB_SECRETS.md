# GitHub Secrets Configuration

## Required Secrets

To use this translation management system, you need to configure the following GitHub Secrets:

### 1. LOCIZE_PROJECT_ID
- **Description**: Your Locize project identifier
- **Example**: `4a48f53b-4f59-4179-ade9-25766306c8ed`
- **Used by**: All workflows

### 2. LOCIZE_READ_KEY
- **Description**: Read-only API key for downloading translations
- **Example**: `666354ee-8bdb-4b25-bb25-79da99fd598c`
- **Used by**: Download and analysis workflows
- **Safety**: This key can only read, cannot modify translations

### 3. LOCIZE_WRITE_KEY
- **Description**: Write API key for uploading translations
- **Example**: `09d92efe-f0c5-4213-90e7-0586d908c9cf`
- **Used by**: Manual upload workflow only
- **Safety**: Only used with explicit confirmation

## How to Add Secrets

1. Navigate to your repository on GitHub
2. Click on **Settings** (you need admin permissions)
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. For each secret:
   - Enter the **Name** exactly as shown above
   - Paste the **Value**
   - Click **Add secret**

## Security Best Practices

### Separate API Keys
- Use different API keys for read and write operations
- This prevents accidental modifications during analysis

### Key Rotation
- Rotate API keys every 90 days
- Update GitHub Secrets when keys change
- Never reuse old keys

### Access Control
- Limit repository access to trusted team members
- Use GitHub's environment protection rules for production
- Review workflow runs regularly

## Verifying Configuration

After adding secrets, verify they work:

1. Go to **Actions** tab
2. Select **Download and Analyze Translations**
3. Click **Run workflow**
4. Check the logs for successful execution

## Troubleshooting

### "Missing required environment variables"
- Ensure secret names match exactly (case-sensitive)
- Check that secrets are saved in the correct repository

### "Unauthorized" errors
- Verify API keys are correct
- Check key permissions in Locize dashboard
- Ensure keys haven't expired

### "Not found" errors
- Confirm project ID is correct
- Verify you have access to the project

## Getting API Keys from Locize

1. Log in to [Locize](https://www.locize.app)
2. Select your project
3. Go to **Project Settings** → **API Keys**
4. Create separate keys:
   - **Read Key**: Give only read permissions
   - **Write Key**: Give read + write permissions
5. Copy the keys and add to GitHub Secrets

## Important Notes

- **Never** commit API keys to your repository
- **Never** share API keys in issues or PRs
- **Always** use GitHub Secrets for sensitive data
- **Consider** using environments for additional protection

## Questions?

If you need help with configuration:
1. Check the [Locize documentation](https://docs.locize.com)
2. Contact your team's DevOps engineer
3. Review the workflow files for usage examples