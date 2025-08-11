# Gemini Code Assist Configuration

This directory contains configuration files for Gemini Code Assist GitHub integration.

## Setup Instructions

### 1. Install Gemini Code Assist GitHub App

1. Visit [Gemini Code Assist on GitHub](https://github.com/apps/gemini-code-assist)
2. Click "Install"
3. Select your GitHub account or organization
4. Choose this repository (`advanceweekly`) from the list
5. Click "Install"

### 2. Configuration

The `code-review.yaml` file contains our custom configuration for code reviews:

- **Auto Review**: Enabled for all PRs
- **Focus Areas**: Code quality, bugs, performance, security, test coverage
- **Custom Prompt**: Tailored for our Next.js/TypeScript stack
- **File Patterns**: Reviews all JS/TS files, excludes tests and build artifacts

### 3. Usage

Once installed, Gemini Code Assist will:

#### Automatic Reviews
- Automatically review new pull requests
- Re-review when changes are pushed
- Add comments with severity levels (Critical, High, Medium, Low)

#### Manual Commands
You can also manually trigger reviews by commenting on a PR:
- `/gemini review` - Perform a code review
- `/gemini summary` - Generate a PR summary
- `/gemini help` - Show all available commands

### 4. Customization

To modify review behavior, edit `code-review.yaml` and push changes.

### 5. Comparison with Previous Setup

| Feature | Claude Bot | Gemini Code Assist |
|---------|-----------|-------------------|
| Trigger | Automatic on PR | Automatic + Manual commands |
| Configuration | GitHub workflow | `.gemini/` directory |
| Customization | Workflow YAML | Configuration files |
| Cost | OAuth token required | Free (during beta) |
| Review Style | Single comment | Inline + summary |

### 6. Migration Notes

- Removed `.github/workflows/claude-code-review.yml`
- Removed `.github/workflows/claude.yml`
- No secrets needed (unlike Claude's `CLAUDE_CODE_OAUTH_TOKEN`)
- Configuration now lives in `.gemini/` instead of workflows

### 7. Troubleshooting

If reviews aren't appearing:
1. Check that Gemini Code Assist is installed for this repository
2. Verify the repository is selected in the app settings
3. Try manually triggering with `/gemini review`
4. Check GitHub App permissions

### 8. Documentation

- [Official Gemini Code Assist Docs](https://developers.google.com/gemini-code-assist/docs/review-github-code)
- [GitHub App Page](https://github.com/apps/gemini-code-assist)