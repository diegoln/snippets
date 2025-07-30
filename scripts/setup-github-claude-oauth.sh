#!/bin/bash

# Setup script for Claude Code OAuth token in GitHub Actions
# This script helps you generate and configure the OAuth token for your GitHub workflows

set -e

echo "🔧 Setting up Claude Code OAuth token for GitHub Actions"
echo "================================================="
echo

echo "Step 1: Generate Claude Code OAuth token"
echo "----------------------------------------"
echo "You need to run this command locally to generate an OAuth token:"
echo
echo "  claude setup-token"
echo
echo "This will:"
echo "- Open a browser to authenticate with your Claude account"
echo "- Generate an OAuth token for Claude Code CLI"
echo "- Store it in your local Claude Code configuration"
echo
echo "After running 'claude setup-token', you'll get a token that you need to add to GitHub."
echo

echo "Step 2: Add token to GitHub repository secrets"
echo "----------------------------------------------"
echo "1. Go to your GitHub repository: https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^.]*\).*/\1/')"
echo "2. Click on 'Settings' tab"
echo "3. In the left sidebar, click 'Secrets and variables' → 'Actions'"
echo "4. Click 'New repository secret'"
echo "5. Name: CLAUDE_CODE_OAUTH_TOKEN"
echo "6. Value: [paste the OAuth token from step 1]"
echo "7. Click 'Add secret'"
echo

echo "Step 3: Test the setup"
echo "----------------------"
echo "After adding the secret:"
echo "1. Create a test pull request"
echo "2. The Claude Code Review workflow should run automatically"
echo "3. Or comment '@claude' on any issue/PR to trigger Claude"
echo

echo "Note: The OAuth token uses your Claude subscription instead of API credits"
echo "This means the GitHub bot will work as long as your Claude subscription is active."
echo

echo "Run this now:"
echo "  claude setup-token"
echo