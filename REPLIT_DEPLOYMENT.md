# Deploying Commure Pulse to Replit

This guide will help you deploy the Commure Pulse application to Replit.

## Prerequisites

- A Replit account (free or paid)
- OpenAI API key for AI features

## Deployment Steps

### 1. Import to Replit

#### Option A: Import from GitHub
1. Push this repository to GitHub (if not already done)
2. Go to [Replit](https://replit.com)
3. Click "Create Repl"
4. Select "Import from GitHub"
5. Enter your repository URL
6. Click "Import from GitHub"

#### Option B: Upload Files Directly
1. Go to [Replit](https://replit.com)
2. Click "Create Repl"
3. Select "Node.js" as the template
4. Upload all project files (excluding node_modules and .git)

### 2. Configure Environment Variables

In Replit, go to the "Secrets" tab (lock icon in left sidebar) and add:

**Required:**
- `VITE_OPENAI_API_KEY`: Your OpenAI API key

**Optional (Replit sets these automatically):**
- `REPL_SLUG`: Your Repl name
- `REPL_OWNER`: Your Replit username

### 3. Install Dependencies

Replit will automatically install dependencies when you run the project. If needed, manually run:

```bash
npm run install:all
```

This will install dependencies for:
- Root project
- Server (backend)
- Utilization-agent (frontend)

### 4. Initialize Database

The database will be automatically initialized on first run. To manually seed data:

```bash
npm run seed
```

### 5. Start the Application

Click the "Run" button in Replit, or execute:

```bash
npm start
```

This will:
1. Build the frontend for production
2. Start both the backend API server (port 3001) and frontend server (port 5173)

### 6. Access Your Application

- **Frontend**: The Replit webview will automatically show your frontend
- **Backend API**: Access via `https://[your-repl-name].[your-username].repl.co:3001`

## Project Structure

```
commure/
├── server/              # Express.js backend API
│   ├── server.js       # Main server file
│   ├── db.js           # Database operations
│   └── package.json
├── utilization-agent/   # React frontend
│   ├── src/
│   └── package.json
├── .replit             # Replit configuration
├── replit.nix          # Nix dependencies
├── package.json        # Root package with scripts
└── start-servers.js    # Server orchestration
```

## Environment Configuration

### Backend Environment Variables (server/.env)
```env
PORT=3001
HOST=0.0.0.0
FRONTEND_URL=https://[your-repl-url]
```

### Frontend Environment Variables (utilization-agent/.env)
```env
VITE_OPENAI_API_KEY=your_key_here
VITE_API_URL=https://[your-repl-url]:3001
```

## Troubleshooting

### Database Issues
- The SQLite database is created automatically in the `server/` directory
- To reset the database, delete `data.db` and restart

### Port Issues
- Replit automatically manages ports
- The frontend runs on port 5000 (mapped to port 80)
- The backend runs on port 3001

### Build Issues
- Ensure Node.js 18+ is being used
- Clear the build cache: `rm -rf utilization-agent/dist`
- Rebuild: `npm run build`

### CORS Issues
- Update `FRONTEND_URL` in backend .env to match your Replit URL
- Replit provides the URL in format: `https://[repl-name].[username].repl.co`

## Development Mode

For development with hot reload:

1. Stop the production server
2. Open two terminals in Replit:
   - Terminal 1: `npm run dev:server`
   - Terminal 2: `npm run dev:frontend`

## Production Deployment

The current setup is configured for Replit's deployment system:
- Frontend is built to static files
- Backend serves API requests
- Both run concurrently via `start-servers.js`

## Support

For issues specific to this deployment:
1. Check the Replit console for errors
2. Verify all environment variables are set
3. Ensure the database initialized successfully
4. Check that both servers are running

## Next Steps

After successful deployment:
1. Configure your OpenAI API key in Secrets
2. Test the health endpoint: `/health`
3. Access the application via the Replit webview
4. Customize provider and appointment data as needed
