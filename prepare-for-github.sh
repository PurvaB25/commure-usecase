#!/bin/bash

# Prepare Commure Pulse for GitHub and Replit Deployment
# This script helps you commit and push your code to GitHub

echo "🚀 Preparing Commure Pulse for GitHub..."
echo ""

# Check if git is initialized
if [ ! -d .git ]; then
    echo "❌ Git repository not initialized. Run: git init"
    exit 1
fi

# Show current status
echo "📊 Current Git Status:"
git status --short
echo ""

# Add all files
echo "📦 Adding all files to git..."
git add .

# Show what will be committed
echo ""
echo "📝 Files to be committed:"
git status --short
echo ""

# Commit with a descriptive message
echo "💾 Creating commit..."
git commit -m "Configure for Replit deployment

- Add Replit configuration files (.replit, replit.nix)
- Configure servers for 0.0.0.0 host binding
- Add workspace scripts for deployment
- Update CORS and proxy settings
- Add deployment documentation
- Add verification and helper scripts

Project ready for Replit deployment with:
- Express.js backend API (port 3001)
- React/Vite frontend (port 5173)
- SQLite database with auto-initialization
- Full documentation and deployment guides"

echo ""
echo "✅ Commit created successfully!"
echo ""

# Check if remote is configured
if git remote -v | grep -q origin; then
    echo "🔗 Remote 'origin' already configured:"
    git remote -v
    echo ""
    echo "Ready to push! Run:"
    echo "  git push -u origin main"
else
    echo "🔗 No remote configured yet."
    echo ""
    echo "Next steps:"
    echo "1. Create a new repository on GitHub"
    echo "2. Run: git remote add origin <your-github-repo-url>"
    echo "3. Run: git branch -M main"
    echo "4. Run: git push -u origin main"
fi

echo ""
echo "📚 For deployment to Replit, see: REPLIT_DEPLOYMENT.md"
echo "📋 For deployment summary, see: DEPLOYMENT_SUMMARY.md"
echo ""
