# RowGram Railway Deployment Guide

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **Railway CLI**: Install the Railway CLI
   ```bash
   npm install -g @railway/cli
   railway login
   ```

## Deployment Steps

### 1. Initialize Railway Project

```bash
# Initialize Railway project in your repo
railway init

# Link to existing project (if you have one)
# railway link [project-id]
```

### 2. Add PostgreSQL Database

```bash
# Add PostgreSQL service to your Railway project
railway add postgresql
```

### 3. Set Environment Variables

Railway will automatically provide these environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `RAILWAY_STATIC_URL` - Your app's URL
- `PORT` - Port number (defaults to 3000)

### 4. Deploy

```bash
# Deploy your application
railway up

# Or connect to GitHub for automatic deployments
# railway domain
```

## Configuration Files

### Dockerfile
- Multi-stage build for optimized image size
- Includes all necessary dependencies for Puppeteer and Sharp
- Runs Prisma migrations on startup
- Health check configured

### railway.toml
- Dockerfile-based build
- Automatic restart disabled (Railway handles this)
- Health check configured
- Environment variables documented

### package.json
- Build script includes Prisma generation
- Start script points to built server
- All dependencies properly specified

## Environment Variables (Production)

Set these in Railway dashboard or via CLI:

```bash
# Required - Railway provides automatically
DATABASE_URL=postgresql://...
PORT=3000
NODE_ENV=production

# Optional - for enhanced functionality
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-app.railway.app
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Database Migrations

The Dockerfile automatically runs `prisma migrate deploy` on startup to apply any pending migrations.

## Verification

After deployment:
1. Check Railway logs: `railway logs`
2. Verify health check: Visit your app URL
3. Test API endpoints
4. Verify database connectivity

## Troubleshooting

### Common Issues

1. **Build fails**: Check that all dependencies are in `dependencies` (not `devDependencies`)
2. **Database connection fails**: Verify `DATABASE_URL` is set correctly
3. **Static files not served**: Ensure `.output` directory is copied in Dockerfile
4. **Puppeteer fails**: Alpine dependencies are included in Dockerfile

### Railway Commands

```bash
# View logs
railway logs

# Connect to database
railway connect postgresql

# Set environment variable
railway variables set VARIABLE_NAME=value

# Open app in browser
railway open

# Deploy specific branch
railway up --detach
```

## Performance Optimization

- Multi-stage Docker build reduces image size
- Production dependencies only in runtime
- Health checks for reliability
- Proper process management

## Security

- Non-root user in container
- Environment variables for sensitive data
- No secrets in code or Dockerfile
- Secure defaults in railway.toml