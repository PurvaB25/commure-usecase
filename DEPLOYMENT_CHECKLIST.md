# Replit Deployment Checklist

Use this checklist to ensure a smooth deployment to Replit.

## ✅ Pre-Deployment Checklist

### Local Setup
- [x] Git repository initialized
- [x] All Replit configuration files created
- [x] Server configured for 0.0.0.0 host
- [x] Frontend Vite config updated
- [x] Environment variable templates created
- [x] Documentation completed

### Verification
- [ ] Run `node verify-setup.js` - All checks should pass
- [ ] Review `.gitignore` to ensure sensitive files are excluded
- [ ] Verify `package.json` scripts are correct
- [ ] Check that `.env` files are not committed (only `.env.example`)

## 📤 GitHub Deployment Checklist

### Repository Setup
- [ ] Create new GitHub repository
- [ ] Copy repository URL

### Local Git Operations
- [ ] Run verification: `node verify-setup.js`
- [ ] Run setup script: `./prepare-for-github.sh`
  - OR manually:
    - [ ] `git add .`
    - [ ] `git commit -m "Configure for Replit deployment"`
    - [ ] `git remote add origin <your-repo-url>`
    - [ ] `git branch -M main`
    - [ ] `git push -u origin main`

### Verify on GitHub
- [ ] Confirm all files are pushed to GitHub
- [ ] Check that `.gitignore` is working (no node_modules, .env, or .db files)
- [ ] README.md displays correctly

## 🚀 Replit Deployment Checklist

### Import to Replit
- [ ] Go to https://replit.com
- [ ] Click "Create Repl"
- [ ] Select "Import from GitHub"
- [ ] Enter repository URL: `https://github.com/<username>/<repo>`
- [ ] Click "Import from GitHub"
- [ ] Wait for import to complete

### Configure Environment
- [ ] Open Replit Secrets (lock icon in sidebar)
- [ ] Add required secret:
  - [ ] `VITE_OPENAI_API_KEY` = [your OpenAI API key]
- [ ] Optional secrets (if needed):
  - [ ] `FRONTEND_URL` = [your Replit URL]
  - [ ] `PORT` = 3001 (usually auto-configured)

### Initial Setup
- [ ] Replit automatically runs `npm install`
- [ ] Wait for all dependencies to install
- [ ] Check console for any installation errors

### First Run
- [ ] Click the "Run" button
- [ ] OR type in shell: `npm start`
- [ ] Wait for build process to complete
- [ ] Monitor console for:
  - [ ] "Frontend build completed" message
  - [ ] "Backend server running" message
  - [ ] "Frontend server running" message

### Verify Deployment
- [ ] Frontend loads in Replit webview
- [ ] No console errors in browser
- [ ] Test backend health endpoint: `<replit-url>:3001/health`
- [ ] Verify API calls work from frontend
- [ ] Check that data loads correctly

## 🧪 Testing Checklist

### Frontend Tests
- [ ] Home page loads
- [ ] Provider selection works
- [ ] Appointments display correctly
- [ ] KPIs show accurate data
- [ ] Risk assessment features work
- [ ] Waitlist functionality works
- [ ] AI agent responses work (requires OpenAI key)

### Backend Tests
- [ ] `/health` endpoint returns 200
- [ ] `/api/providers` returns provider list
- [ ] `/api/appointments` returns appointments
- [ ] `/api/kpis` returns metrics
- [ ] Database queries execute successfully
- [ ] CORS headers allow frontend requests

### Database Tests
- [ ] SQLite database created in server directory
- [ ] Schema initialized correctly
- [ ] Seed data loaded (if applicable)
- [ ] Queries return expected data

## 🔧 Troubleshooting Checklist

### If Build Fails
- [ ] Check Node.js version (should be 18+)
- [ ] Verify `package.json` exists in all directories
- [ ] Check for syntax errors in code
- [ ] Review build logs for specific errors
- [ ] Try: Delete `node_modules` and reinstall

### If Servers Don't Start
- [ ] Check port availability
- [ ] Verify environment variables are set
- [ ] Check server logs for errors
- [ ] Ensure `start-servers.js` has correct paths
- [ ] Try running servers individually:
  - [ ] `cd server && npm start`
  - [ ] `cd utilization-agent && npm run preview`

### If CORS Errors Occur
- [ ] Verify `FRONTEND_URL` is set in backend
- [ ] Check CORS configuration in `server/server.js`
- [ ] Ensure proxy is configured in `vite.config.ts`
- [ ] Verify Replit URL format is correct

### If Database Issues
- [ ] Check if `data.db` exists in server directory
- [ ] Verify SQLite is installed in Replit environment
- [ ] Try deleting and recreating database
- [ ] Check schema initialization logs

### If API Calls Fail
- [ ] Verify API URL in frontend code
- [ ] Check network tab for request URLs
- [ ] Ensure proxy configuration is correct
- [ ] Test API endpoints directly (curl/Postman)
- [ ] Check for authentication/CORS issues

## 📊 Post-Deployment Checklist

### Monitoring
- [ ] Set up Replit monitoring (if available)
- [ ] Test application with real users
- [ ] Monitor error logs
- [ ] Check performance metrics

### Documentation
- [ ] Share Replit URL with team
- [ ] Document any deployment-specific configurations
- [ ] Update README with live demo link
- [ ] Note any environment-specific quirks

### Optimization
- [ ] Review and optimize bundle size
- [ ] Configure caching if needed
- [ ] Set up custom domain (optional)
- [ ] Configure analytics (optional)

## 🎯 Success Criteria

Your deployment is successful when:
- ✅ Application loads without errors
- ✅ All features work as expected
- ✅ API calls complete successfully
- ✅ Database queries execute correctly
- ✅ AI features work (with API key)
- ✅ No console errors
- ✅ Performance is acceptable

## 📚 Resources

- **Full Deployment Guide**: `REPLIT_DEPLOYMENT.md`
- **Deployment Summary**: `DEPLOYMENT_SUMMARY.md`
- **Project README**: `README.md`
- **Verification Script**: Run `node verify-setup.js`
- **GitHub Setup Script**: Run `./prepare-for-github.sh`

## 🆘 Getting Help

If you encounter issues:
1. Check the troubleshooting section above
2. Review Replit console logs
3. Check GitHub Issues for similar problems
4. Review Replit documentation
5. Check browser console for frontend errors

---

**Quick Start Command:**
```bash
# Verify setup is complete
node verify-setup.js

# Prepare for GitHub
./prepare-for-github.sh

# Then import to Replit and click Run!
```
